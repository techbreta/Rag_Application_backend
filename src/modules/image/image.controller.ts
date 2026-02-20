import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import AppiError from "../errors/ApiError";
import { removeBackgroundBufferFromUrl, bufferToStream } from "./image.service";

export const removeBackground = catchAsync(
  async (req: Request, res: Response) => {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      throw new AppiError("imageUrl is required in request body", 400, {
        imageUrl: "imageUrl is required",
      });
    }

    const outBuffer = await removeBackgroundBufferFromUrl(imageUrl);

    // Stream result back to the client
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", "inline; filename=output.png");

    const stream = bufferToStream(outBuffer);
    stream.pipe(res);
  },
);

