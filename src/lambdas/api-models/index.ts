import { APIGatewayProxyResult, APIGatewayProxyEvent } from 'aws-lambda';
import { createResponse, handleError } from '@utils';
import { ErrorMessages } from '@core/config';

// Import the generated openapi.json
// esbuild automatically includes JSON in the bundle as a module
import openApi from '../../../openapi.json';

/**
 * Lambda handler for the OpenAPI models endpoint
 *
 * Serves the generated openapi.json containing the model schemas.
 * The file is included in the bundle by esbuild.
 *
 * The frontend uses this to generate TypeScript types:
 * swagger-typescript-api -p https://API_URL/api-models -o ./src --no-client -n models.ts --extract-enums
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    switch (event.httpMethod) {
      case 'GET':
        return createResponse(200, openApi);

      default:
        return createResponse(405, { error: ErrorMessages.METHOD_NOT_ALLOWED });
    }
  } catch (error) {
    return handleError(error);
  }
};
