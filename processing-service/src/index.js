const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));

let bgLib;
try {
  bgLib = require('@imgly/background-removal-node');
} catch (e) {
  console.error('Failed to load @imgly/background-removal-node:', e);
  process.exit(1);
}

app.post('/remove-background', async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ message: 'imageUrl required' });

  try {
    const out = await bgLib.removeBackground(imageUrl);

    // Blob-like output
    if (out && typeof out.arrayBuffer === 'function') {
      const ab = await out.arrayBuffer();
      const buf = Buffer.from(ab);
      res.set('Content-Type', 'image/png');
      return res.send(buf);
    }

    // Buffer
    if (Buffer.isBuffer(out)) {
      res.set('Content-Type', 'image/png');
      return res.send(out);
    }

    // String (maybe base64)
    if (typeof out === 'string') {
      const m = out.match(/^data:(.+);base64,(.*)$/);
      const b = m ? Buffer.from(m[2], 'base64') : Buffer.from(out, 'base64');
      res.set('Content-Type', 'image/png');
      return res.send(b);
    }

    return res.status(500).json({ message: 'Unknown output from background removal' });
  } catch (err) {
    console.error('Processing service error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: String(err) });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Processing service listening on ${port}`));
