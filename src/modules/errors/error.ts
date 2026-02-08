/* eslint-disable @typescript-eslint/no-unused-vars */
import { Request, Response, NextFunction } from 'express';

import { logger } from '../logger';
import ApiError from './ApiError';
import { ValidationErrorShape } from './errors.interfaces';

require('dotenv').config();

const handleCastErrorDB = (err: Record<string, string>) => {
  const message = `Invalid ${err["path"]}: ${err["value"]}.`;
  logger.error(`Cast Error: ${message}`);
  return new ApiError(message, 400);
};



const handleDuplicateFieldsDB = (err: Record<string, any>) => {
  const field:any = Object.keys(err["keyPattern"])[0];
  const message = { [field]: `${field} already exist` };
  logger.error(`Duplicate field error: ${JSON.stringify(message)}`);
  return new ApiError('Duplicate field error', 400, message);
};

const handleValidationErrorDB = (err: ValidationErrorShape) => {
  const fieldErrors: Record<string, string> = {};

  Object.values(err.errors).forEach((error) => {
    fieldErrors[error.path] = error.message;
  });

  logger.error(`Validation error: ${JSON.stringify(fieldErrors)}`);
  return new ApiError('Validation error', 400, fieldErrors);
};
// JWT error handlers
const handleJWTError = () =>
  new ApiError('Invalid token. Please log in again!', 401, {
    token: 'invalid token'
  });
const handleJWTExpiredError = () =>
  new ApiError('Your token has expired! Please log in again.', 401, {
    token: 'Token expired'
  });

// Global error handler
const sendError = (err: Record<string,  number>, error: Record<string, string>, _: Request, res: Response, _next?: NextFunction) => {
  const response: any = {
    status: 'fail',
    message: err["message"] || error["message"] || 'An error occurred'
  };

  // Include field-specific errors if present
  if (err["fieldErrors"] || error["fieldErrors"]) {
    response.errors = err["fieldErrors"] || error["fieldErrors"];
  }


  return res.status(err["statusCode"] || 400).json(response);

};

const GlobalError = (err: Record<string, any>, req: Request, _: Response, next: NextFunction) => {
  logger.error('Error:', err);


  let error = { ...err };
  error["message"] = err['message'] || 'An unexpected error occurred';

  // Customize MongoDB or JWT errors
  if (err["name"] === 'CastError') error = handleCastErrorDB(err);
  if (err["code"] === 11000) error = handleDuplicateFieldsDB(err);
  if (err["name"] === 'ValidationError') error = handleValidationErrorDB(err as ValidationErrorShape);
  if (err["name"] === 'JsonWebTokenError') error = handleJWTError();
  if (err["name"] === 'TokenExpiredError') error = handleJWTExpiredError();

  return sendError(error, error, req, _, next);
};

export default GlobalError;