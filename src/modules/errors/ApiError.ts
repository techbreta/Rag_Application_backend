class AppiError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  fieldErrors: any;

  constructor(message: string, statusCode: number, fieldErrors: Object = {}) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.fieldErrors = fieldErrors; // Store field-specific errors
    console.log('this', this);
    Error.captureStackTrace(this, this.constructor);
  }   
}
export default AppiError;
