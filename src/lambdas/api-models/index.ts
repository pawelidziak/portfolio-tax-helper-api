import { APIGatewayProxyResult, APIGatewayProxyEvent } from 'aws-lambda';
import { createResponse, handleError } from '@utils';
import { ErrorMessages } from '@core/config';

// Import wygenerowanego openapi.json
// esbuild automatycznie włączy JSON do bundla jako moduł
import openApi from '../../../openapi.json';

/**
 * Lambda handler dla endpointu z modelami OpenAPI
 *
 * Serwuje wygenerowany openapi.json zawierający schematy modeli.
 * Plik jest włączony do bundla przez esbuild.
 *
 * Frontend używa tego do generowania typów TypeScript:
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
