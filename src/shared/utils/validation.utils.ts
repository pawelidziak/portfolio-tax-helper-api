import { ValidationError } from '@core/models';
import { ErrorMessages } from '@core/config';
import { z } from 'zod';

/**
 * Helper to validate request body
 */
export const validateBody = <T>(schema: z.ZodSchema<T>, body: string | null): T => {
  if (!body) throw new ValidationError(ErrorMessages.REQUEST_BODY_REQUIRED);

  try {
    const rawData = JSON.parse(body);
    return schema.parse(rawData);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ValidationError(ErrorMessages.INVALID_JSON_FORMAT);
    }
    throw error;
  }
};

/**
 * Helper to validate parsed file
 */
export const validateFile = <T>(schema: z.ZodSchema<T>, file: T): T => {
  return schema.parse(file);
};
