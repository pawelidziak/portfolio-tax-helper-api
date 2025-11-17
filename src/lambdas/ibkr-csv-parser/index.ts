import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { parseMultipartFormData, parsedCsvSchema } from '@parsers';
import { handleError, createResponse, validateFile } from '@utils';
import { mapIBKRTradesToTrades } from '@services';
import { ErrorMessages } from '@core/config';
import { parseIBKRCsv } from '@parsers';

/**
 * Lambda handler for IBKR CSV parser
 * Accepts CSV file via multipart/form-data
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    switch (event.httpMethod) {
      case 'POST': {
        // 1. Lambda dostaje plik CSV -> parsuj multipart/form-data
        const parsedFile = await parseMultipartFormData(event);

        // 2. Zod waliduje plik
        const validatedFile = validateFile(parsedCsvSchema, parsedFile);

        // 3. IBKR parser parsuje zawartość CSV
        const ibkrStatement = await parseIBKRCsv(validatedFile.content);

        // 4. Mapuj IBKRTradeDTO[] na Trade[] z kursami NBP i wartościami w PLN
        const trades = await mapIBKRTradesToTrades(ibkrStatement.trades);

        return createResponse(200, { message: 'CSV parsed successfully', data: trades });
      }

      default:
        return createResponse(405, { error: ErrorMessages.METHOD_NOT_ALLOWED });
    }
  } catch (error) {
    return handleError(error);
  }
};
