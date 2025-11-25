import {
  ConditionalCheckFailedException,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import { ValidationError, ConflictError, NotFoundError, HttpError } from '@core/models';
import { APIGatewayProxyResult } from 'aws-lambda';
import { ErrorMessages } from '@core/config';
import { z } from 'zod';

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

/**
 * Helper to convert HttpError to HTTP response
 */
const httpErrorToResponse = (error: HttpError): APIGatewayProxyResult => ({
  statusCode: error.statusCode,
  headers,
  body: JSON.stringify({
    error: error.message,
    ...(error.details ? { details: error.details } : {}),
  }),
});

/**
 * Generic function to handle all errors in lambda
 * Converts known errors (like DynamoDB and Zod errors) to custom error classes, and then to HTTP responses
 */
export const handleError = (error: unknown): APIGatewayProxyResult => {
  // Handle custom error classes (from repository or lambda)
  if (error instanceof HttpError) {
    return httpErrorToResponse(error);
  }

  // Convert DynamoDB errors to custom error classes
  if (error instanceof ConditionalCheckFailedException) {
    return httpErrorToResponse(new ConflictError(ErrorMessages.ENTITY_ALREADY_EXISTS));
  }

  if (error instanceof ResourceNotFoundException) {
    return httpErrorToResponse(new NotFoundError(ErrorMessages.RESOURCE_NOT_FOUND));
  }

  // Convert Zod validation errors to custom error classes
  if (error instanceof z.ZodError) {
    return httpErrorToResponse(
      new ValidationError(ErrorMessages.VALIDATION_ERROR, {
        issues: error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      })
    );
  }

  // All other errors
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({
      error: ErrorMessages.INTERNAL_SERVER_ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    }),
  };
};
