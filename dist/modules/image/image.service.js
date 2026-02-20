"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bufferToStream = exports.removeBackgroundBufferFromUrl = void 0;
const stream_1 = require("stream");
const url_1 = require("url");
const http = require("http");
const https = require("https");
async function fetchImageBuffer(imageUrl) {
    return new Promise((resolve, reject) => {
        try {
            const urlObj = new url_1.URL(imageUrl);
            const lib = urlObj.protocol === "https:" ? https : http;
            lib
                .get(imageUrl, (resp) => {
                if (resp.statusCode && resp.statusCode >= 400) {
                    return reject(new Error(`Failed to fetch image, status ${resp.statusCode}`));
                }
                const chunks = [];
                const headers = resp.headers || {};
                const contentType = headers["content-type"] ||
                    headers["Content-Type"];
                resp.on("data", (c) => chunks.push(c));
                resp.on("end", () => {
                    const buf = Buffer.concat(chunks);
                    if (typeof contentType === "string") {
                        resolve({ buffer: buf, contentType });
                    }
                    else {
                        resolve({ buffer: buf });
                    }
                });
            })
                .on("error", (err) => reject(err));
        }
        catch (err) {
            reject(err);
        }
    });
}
async function removeBackgroundBufferFromUrl(imageUrl) {
    const { buffer: inputBuffer, contentType } = await fetchImageBuffer(imageUrl);
    // create a Blob with the correct mime type so the library can detect the format
    const inferredType = contentType ||
        (() => {
            try {
                const ext = imageUrl?.split("?")[0]?.split(".").pop()?.toLowerCase();
                switch (ext) {
                    case "jpg":
                    case "jpeg":
                        return "image/jpeg";
                    case "png":
                        return "image/png";
                    case "webp":
                        return "image/webp";
                    default:
                        return "image/png";
                }
            }
            catch (e) {
                return "image/png";
            }
        })();
    // Convert Node Buffer to Uint8Array for Blob constructor compatibility
    const uint8 = new Uint8Array(inputBuffer.buffer, inputBuffer.byteOffset, inputBuffer.byteLength);
    const BlobCtor = typeof Blob !== "undefined" ? Blob : globalThis.Blob;
    const imageBlob = new BlobCtor([uint8], { type: inferredType });
    // Dynamically require the package so the codebase compiles even before npm install
    // Use `any` because the package types may not be present in this project.
    const bgLib = require("@imgly/background-removal-node");
    // Helper to normalize various possible outputs into a Buffer
    const normalizeOutputToBuffer = (out) => {
        if (!out && out !== 0) {
            throw new Error("Background removal returned no output (undefined/null)");
        }
        // Already a Buffer
        if (Buffer.isBuffer(out))
            return out;
        // Uint8Array / ArrayBuffer
        if (out instanceof Uint8Array)
            return Buffer.from(out);
        if (out && out.buffer && out.buffer instanceof ArrayBuffer)
            return Buffer.from(out);
        // If library returned an object with common properties
        if (out && typeof out === "object") {
            if (Buffer.isBuffer(out.data))
                return out.data;
            if (Buffer.isBuffer(out.image))
                return out.image;
            if (typeof out.data === "string") {
                // maybe base64
                const s = out.data;
                const m = s.match(/^data:(.+);base64,(.*)$/);
                if (m && typeof m[2] === "string")
                    return Buffer.from(m[2], "base64");
                return Buffer.from(s, "base64");
            }
            if (typeof out.image === "string") {
                const s = out.image;
                const m = s.match(/^data:(.+);base64,(.*)$/);
                if (m && typeof m[2] === "string")
                    return Buffer.from(m[2], "base64");
                return Buffer.from(s, "base64");
            }
        }
        // If it's a string, try base64 or raw
        if (typeof out === "string") {
            const m = out.match(/^data:(.+);base64,(.*)$/);
            if (m && typeof m[2] === "string")
                return Buffer.from(m[2], "base64");
            // try plain base64
            try {
                return Buffer.from(out, "base64");
            }
            catch (e) {
                // fallback to utf-8
                return Buffer.from(out, "utf8");
            }
        }
        throw new Error("Unable to normalize background removal output to Buffer");
    };
    // Different versions may expose different APIs; attempt a few common call patterns.
    try {
        // 1) If library exposes a `removeBackground` function that accepts an image
        if (typeof bgLib.removeBackground === "function") {
            const out = await bgLib.removeBackground(imageBlob);
            // handle Blob-like outputs
            if (out && typeof out.arrayBuffer === "function") {
                const ab = await out.arrayBuffer();
                return Buffer.from(ab);
            }
            return normalizeOutputToBuffer(out);
        }
        // 2) Default export callable
        if (typeof bgLib === "function") {
            const out = await bgLib(imageBlob);
            if (out && typeof out.arrayBuffer === "function") {
                const ab = await out.arrayBuffer();
                return Buffer.from(ab);
            }
            return normalizeOutputToBuffer(out);
        }
        // 3) If library exposes `process` or `run` helpers
        if (typeof bgLib.process === "function") {
            const out = await bgLib.process(imageBlob);
            if (out && typeof out.arrayBuffer === "function") {
                const ab = await out.arrayBuffer();
                return Buffer.from(ab);
            }
            return normalizeOutputToBuffer(out);
        }
    }
    catch (err) {
        console.error("Error while calling background-removal library:", err && err.stack ? err.stack : err);
        throw err;
    }
    throw new Error("@imgly/background-removal-node API not recognized. Please check the package docs.");
}
exports.removeBackgroundBufferFromUrl = removeBackgroundBufferFromUrl;
function bufferToStream(buffer) {
    if (!buffer)
        throw new Error("No buffer provided to bufferToStream");
    if (!Buffer.isBuffer(buffer))
        buffer = Buffer.from(buffer);
    return stream_1.Readable.from(buffer);
}
exports.bufferToStream = bufferToStream;
