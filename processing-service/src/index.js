const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json({ limit: "50mb" }));

// No heavy image-processing library is installed in this service.
// The service is left as a lightweight stub that will return a clear error
// response. If you want to enable ML-based background removal, install and
// configure the desired library (e.g. @imgly/background-removal-node) and
// re-enable the implementation below.

app.post("/remove-background", async (req, res) => {
  return res.status(501).json({
    message:
      "Background removal not available: processing-service has no image library installed. Install '@imgly/background-removal-node' (or another processor) or point your backend to a different processor.",
  });
});

// healthcheck
app.get("/health", (req, res) => {
  res.json({ status: "ok", processing: false });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Processing service listening on ${port}`));
