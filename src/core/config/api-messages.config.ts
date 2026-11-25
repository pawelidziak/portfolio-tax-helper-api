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
  FILE_CONTENT_EMPTY: 'File content cannot be empty',
  FILE_SIZE_EXCEEDS_LIMIT: 'File size exceeds.',
  FILE_MUST_HAVE_CSV_EXTENSION: 'File must have .csv extension',
  FILE_MUST_BE_CSV: 'File must be a CSV file (text/csv, application/csv, or text/plain)',
  ENCODING_REQUIRED: 'Encoding is required',
  CONTENT_TYPE_MUST_BE_MULTIPART: 'Content-Type must be multipart/form-data',
  MISSING_BOUNDARY_IN_CONTENT_TYPE: 'Missing boundary in Content-Type header',
  NO_FILE_FOUND_IN_MULTIPART: 'No file found in multipart/form-data',
  FILE_DATA_NOT_PARSED_CORRECTLY: 'File data not parsed correctly',
  MULTIPLE_FILES_NOT_ALLOWED: 'Only one file is allowed. Multiple files detected.',

  // Resource specific
  ENTITY_ALREADY_EXISTS: 'Entity already exists',
  RESOURCE_NOT_FOUND: 'Resource not found',

  // IBKR CSV Parser errors
  MISSING_DATE_RANGE_IN_METADATA:
    'Missing date range in the CSV metadata. Values in PLN cannot be calculated without NBP rates.',
  MISSING_CURRENCIES_IN_METADATA:
    'Missing currencies in the CSV metadata. Values in PLN cannot be calculated without NBP rates.',
};

export const SuccessMessages: Record<string, string> = {
  ITEM_DELETED_SUCCESSFULLY: 'Item deleted successfully',
};
