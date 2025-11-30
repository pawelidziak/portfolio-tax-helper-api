import {
  mapIBKROpenPositionsToOpenPositions,
  mapIBKRInterestsToInterests,
  mapIBKRDividendsToDividends,
  mapIBKRAccountInformation,
  mapIBKRStatementMetadata,
  mapIBKRBorrowsToBorrows,
  mapIBKRTradesToTrades,
  mapIBKRNetAssetValue,
  aggregateResults,
  mapIBKRDeposits,
  parseIBKRCsv,
} from '@ibkr';
import { parseMultipartFormData, parsedCsvSchema } from '@shared/parsers';
import { APIGatewayProxyResult, APIGatewayProxyEvent } from 'aws-lambda';
import { createResponse, validateFile, handleError } from '@utils';
import { StatementResponseDto } from '@shared/models';
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
        // 1. Lambda dostaje plik CSV -> parsuj multipart/form-data
        const parsedFile = await parseMultipartFormData(event);

        // 2. Zod waliduje plik
        const validatedFile = validateFile(parsedCsvSchema, parsedFile);

        // 3. IBKR parser parsuje zawartość CSV
        const ibkrStatement = await parseIBKRCsv(validatedFile.content);

        // 4. Użyj metadanych z CSV (zakres dat i waluty)
        const metadata = ibkrStatement.metadata;

        // Walidacja metadanych przed pobraniem kursów - BEZ KURSÓW NBP NIE MOŻEMY OBLICZYĆ WARTOŚCI W PLN
        if (!metadata.minDate || !metadata.maxDate) {
          return createResponse(400, ErrorMessages.MISSING_DATE_RANGE_IN_METADATA);
        }

        if (metadata.currencies.size === 0) {
          return createResponse(400, ErrorMessages.MISSING_CURRENCIES_IN_METADATA);
        }

        // Pobierz kursy NBP - metadane są zwalidowane
        const exchangeRatesCache = await getExchangeRates(
          metadata.currencies,
          metadata.minDate,
          metadata.maxDate,
          10
        );

        // 6. Mapuj wszystkie dane z użyciem wspólnego cache kursów
        const dividends = mapIBKRDividendsToDividends(ibkrStatement.dividends, exchangeRatesCache);
        const interests = mapIBKRInterestsToInterests(ibkrStatement.interests, exchangeRatesCache);
        const borrows = mapIBKRBorrowsToBorrows(ibkrStatement.borrows, exchangeRatesCache);
        const trades = mapIBKRTradesToTrades(ibkrStatement.trades, exchangeRatesCache);
        const openPositions = mapIBKROpenPositionsToOpenPositions(
          ibkrStatement.openPositions,
          exchangeRatesCache
        );

        // Mapuj proste modele (bez dodatkowych obliczeń)
        const accountInformation = mapIBKRAccountInformation(ibkrStatement.accountInformation);
        const netAssetValue = mapIBKRNetAssetValue(ibkrStatement.netAssetValue);
        const deposits = mapIBKRDeposits(ibkrStatement.deposits);
        const mappedMetadata = mapIBKRStatementMetadata(metadata);

        const periodTaxSummary = aggregateResults(trades, dividends, interests, borrows);

        const statement: StatementResponseDto = {
          generateDate: new Date().toISOString(),
          metadata: mappedMetadata,
          accountInformation,
          periodTaxSummary,
          netAssetValue,
          openPositions,
          deposits,
          interests,
          dividends,
          borrows,
          trades,
        };

        return createResponse(200, statement);
      }

      default:
        return createResponse(405, { error: ErrorMessages.METHOD_NOT_ALLOWED });
    }
  } catch (error) {
    return handleError(error);
  }
};
