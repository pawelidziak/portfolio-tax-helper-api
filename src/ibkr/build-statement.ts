import { StatementResponseDto } from '@shared/models';
import { ExchangeRatesCache } from '@shared/api';

import {
  mapIBKROpenPositionsToOpenPositions,
  mapIBKRInterestsToInterests,
  mapIBKRDividendsToDividends,
  mapIBKRAccountInformation,
  mapIBKRStatementMetadata,
  mapIBKRBorrowsToBorrows,
  mapIBKRTradesToTrades,
  mapIBKRNetAssetValue,
  mapIBKRDeposits,
} from './mappers.service';
import { aggregateResults } from './calculations';
import { IBKRStatement } from './models/dto';

/**
 * Maps a parsed IBKR statement to the API response.
 * Pure: exchange rates are injected, so it runs offline in tests and scripts.
 */
export const buildStatementResponse = (
  ibkrStatement: IBKRStatement,
  exchangeRatesCache: ExchangeRatesCache,
  generateDate: string = new Date().toISOString()
): StatementResponseDto => {
  const dividends = mapIBKRDividendsToDividends(ibkrStatement.dividends, exchangeRatesCache);
  const interests = mapIBKRInterestsToInterests(ibkrStatement.interests, exchangeRatesCache);
  const borrows = mapIBKRBorrowsToBorrows(ibkrStatement.borrows, exchangeRatesCache);
  const trades = mapIBKRTradesToTrades(ibkrStatement.trades, exchangeRatesCache);
  const openPositions = mapIBKROpenPositionsToOpenPositions(
    ibkrStatement.openPositions,
    exchangeRatesCache,
    ibkrStatement.metadata.maxDate
  );

  return {
    generateDate,
    metadata: mapIBKRStatementMetadata(ibkrStatement.metadata),
    accountInformation: mapIBKRAccountInformation(ibkrStatement.accountInformation),
    periodTaxSummary: aggregateResults(trades, dividends, interests, borrows),
    netAssetValue: mapIBKRNetAssetValue(ibkrStatement.netAssetValue),
    openPositions,
    deposits: mapIBKRDeposits(ibkrStatement.deposits),
    interests,
    dividends,
    borrows,
    trades,
  };
};
