import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../utils/catchAsync";
import * as indexStatusService from "./indexStatus.service";

export const getIndexingStats = catchAsync(async (_req: Request, res: Response) => {
  const result = await indexStatusService.getIndexingStats();
  res.status(httpStatus.OK).send({
    status: "success",
    data: result,
  });
});

export const getIndexingUrls = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, search, submissionStatus, verdict } = req.query;
  const result = await indexStatusService.getIndexingUrls({
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 20,
    search: search as string,
    submissionStatus: submissionStatus as string,
    verdict: verdict as string,
  });

  res.status(httpStatus.OK).send({
    status: "success",
    data: result,
  });
});
