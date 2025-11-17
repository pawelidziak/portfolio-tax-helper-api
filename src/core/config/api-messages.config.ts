export const ErrorMessages: Record<string, string> = {
  // General errors
  NOT_FOUND: 'Not found',
  BAD_REQUEST: 'Bad request',
  VALIDATION_ERROR: 'Validation error',
  CONFLICT: 'Conflict',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  METHOD_NOT_ALLOWED: 'Method not allowed',

  // Request validation
  REQUEST_BODY_REQUIRED: 'Request body is required',
  INVALID_JSON_FORMAT: 'Invalid JSON format',
  MISSING_ID: 'Missing ID',
  INVALID_BASE64: 'Invalid base64 encoding',
  INVALID_CSV_FORMAT: 'Invalid CSV format',
  CSV_FILE_REQUIRED: 'CSV file is required',

  // Resource specific
  ENTITY_ALREADY_EXISTS: 'Entity already exists',
  RESOURCE_NOT_FOUND: 'Resource not found',
};

export const SuccessMessages: Record<string, string> = {
  ITEM_DELETED_SUCCESSFULLY: 'Item deleted successfully',
};
