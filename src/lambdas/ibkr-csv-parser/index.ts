import { parseMultipartFormData, parsedCsvSchema } from '@shared/parsers';
import { APIGatewayProxyResult, APIGatewayProxyEvent } from 'aws-lambda';
import { createResponse, validateFile, handleError } from '@utils';
import { buildStatementResponse, parseIBKRCsv } from '@ibkr';
import { getExchangeRates } from '@shared/api';
import { ErrorMessages } from '@core/config';

/**
 * Lambda handler for IBKR CSV parser
 * Accepts CSV file via multipart/form-data
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    switch (event.httpMethod) {
      case 'POST': {
        // 1. Lambda receives the CSV file -> parse multipart/form-data
        const parsedFile = await parseMultipartFormData(event);

        // 2. Zod validates the file
        const validatedFile = validateFile(parsedCsvSchema, parsedFile);

        // 3. IBKR parser parses the CSV content
        const ibkrStatement = await parseIBKRCsv(validatedFile.content);

        // 4. Use the CSV metadata (date range and currencies)
        const metadata = ibkrStatement.metadata;

        // Validate metadata before fetching rates - WITHOUT NBP RATES WE CANNOT CALCULATE PLN VALUES
        if (!metadata.minDate || !metadata.maxDate) {
          return createResponse(400, ErrorMessages.MISSING_DATE_RANGE_IN_METADATA);
        }

        if (metadata.currencies.size === 0) {
          return createResponse(400, ErrorMessages.MISSING_CURRENCIES_IN_METADATA);
        }

        // Fetch NBP rates - metadata is validated
        const exchangeRatesCache = await getExchangeRates(
          metadata.currencies,
          metadata.minDate,
          metadata.maxDate,
          10
        );

        const statement = buildStatementResponse(ibkrStatement, exchangeRatesCache);

        return createResponse(200, statement);
      }

      default:
        return createResponse(405, { error: ErrorMessages.METHOD_NOT_ALLOWED });
    }
  } catch (error) {
    return handleError(error);
  }
};
