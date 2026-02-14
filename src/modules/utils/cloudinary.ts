import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env["CLOUDINARY_CLOUD_NAME"] || "",
  api_key: process.env["CLOUDINARY_API_KEY"] || "",
  api_secret: process.env["CLOUDINARY_API_SECRET"] || "",
});

const img = async (path: string | Buffer): Promise<string | null> => {
  if (path) {
    try {
      let result;
      if (Buffer.isBuffer(path)) {
        // Upload from buffer using stream
        result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "rag-images",
              resource_type: "auto",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          );
          Readable.from(path).pipe(stream);
        });
      } else {
        // Upload from file path
        result = await cloudinary.uploader.upload(path, {
          folder: "rag-images",
        });
      }

      return (result as any).url;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  return null;
};

const deleteImageByUrl = async (url: string): Promise<boolean> => {
  try {
    const public_id = url.split("/").slice(-3).join("/").replace(/\..+$/, "");
    const result = await cloudinary.uploader.destroy(public_id);

    return result.result === "ok";
  } catch (error) {
    console.error(error);
    return false;
  }
};

export { img, deleteImageByUrl };
