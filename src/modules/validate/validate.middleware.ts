import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../errors/ApiError';
type JoiErrorDetail = {
  message: string;
  context: {
    key: string;
    [key: string]: any;
  };
};
const validate =
  (schema: Record<string, any>) =>
    (req: Request, _res: Response, next: NextFunction): void => { 
      const validSchema = pick(schema, ['params', 'query', 'body']);
      const object = pick(req, Object.keys(validSchema));
      const { value, error } = Joi.compile(validSchema)
        .prefs({ errors: { label: 'key' } })
        .validate(object,{ abortEarly: false, convert: true, allowUnknown: true });

      if (error) {
        const errorFields = (error.details as JoiErrorDetail[]).reduce<Record<string, string>>((acc, err) => {
          acc[err.context.key] = err.message.replace(/['"]/g, '');
          return acc;
        }, {});

        return next(new ApiError("Invalid request", httpStatus.BAD_REQUEST,  errorFields ));
      }
      Object.assign(req, value);
      return next();
    };

export default validate;
