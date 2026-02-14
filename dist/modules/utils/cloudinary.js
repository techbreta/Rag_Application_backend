"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteImageByUrl = exports.img = void 0;
const cloudinary_1 = require("cloudinary");
const stream_1 = require("stream");
cloudinary_1.v2.config({
    cloud_name: process.env["CLOUDINARY_CLOUD_NAME"] || "",
    api_key: process.env["CLOUDINARY_API_KEY"] || "",
    api_secret: process.env["CLOUDINARY_API_SECRET"] || "",
});
const img = async (path) => {
    if (path) {
        try {
            let result;
            if (Buffer.isBuffer(path)) {
                // Upload from buffer using stream
                result = await new Promise((resolve, reject) => {
                    const stream = cloudinary_1.v2.uploader.upload_stream({
                        folder: "rag-images",
                        resource_type: "auto",
                    }, (error, result) => {
                        if (error)
                            reject(error);
                        else
                            resolve(result);
                    });
                    stream_1.Readable.from(path).pipe(stream);
                });
            }
            else {
                // Upload from file path
                result = await cloudinary_1.v2.uploader.upload(path, {
                    folder: "rag-images",
                });
            }
            return result.url;
        }
        catch (error) {
            console.error(error);
            return null;
        }
    }
    return null;
};
exports.img = img;
const deleteImageByUrl = async (url) => {
    try {
        const public_id = url.split("/").slice(-3).join("/").replace(/\..+$/, "");
        const result = await cloudinary_1.v2.uploader.destroy(public_id);
        return result.result === "ok";
    }
    catch (error) {
        console.error(error);
        return false;
    }
};
exports.deleteImageByUrl = deleteImageByUrl;
