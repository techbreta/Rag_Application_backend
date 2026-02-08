import Joi from "joi"; 
type JoiErrorDetail = {
  message: string;
  context: {
    key: string;
    [key: string]: any;
  };
};


const JoiError = (error: Joi.ValidationError) => {
  const errorFields = (error.details as JoiErrorDetail[]).reduce<Record<string, string>>((acc, err) => {
    acc[err.context.key] = err.message.replace(/['"]/g, '');
    return acc;
  }, {});
return errorFields;
};
export default JoiError;