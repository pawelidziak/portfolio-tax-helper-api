import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handleError, createResponse } from '@utils';
import { ErrorMessages } from '@core/config';

/**
 * Lambda handler for IBKR CSV parser
 * Accepts CSV file via multipart/form-data
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    switch (event.httpMethod) {
      case 'POST': {
        // TODO parse CSV file
        return createResponse(200, { message: 'CSV parsed successfully' });
      }

      default:
        return createResponse(405, { error: ErrorMessages.METHOD_NOT_ALLOWED });
    }
  } catch (error) {
    return handleError(error);
  }
};
