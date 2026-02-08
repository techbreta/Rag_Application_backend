
export interface ValidationErrorItem {
  path: string;
  message: string;
}

export interface ValidationErrorShape {
  errors: Record<string, ValidationErrorItem>;
}