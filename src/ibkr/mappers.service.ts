/**
 * IBKR Mappers Service
 *
 * Maps IBKR DTOs to domain models with NBP rates and tax summaries.
 *
 * Structure:
 * - Section 1: Simple 1:1 mappings (AccountInformation, NetAssetValue, Deposit, StatementMetadata)
 * - Section 2: Mappings with tax calculations (Trade, Dividend, Interest, Borrow)
 *
 * All mappers share a common NBP rates cache passed from the lambda handler.
 */

// ============================================================================
// IMPORTS
// ============================================================================

import {
  OperationCategoryEnum,
  AccountInformation,
  NetAssetValueItem,
  StatementMetadata,
  NetAssetValue,
  OpenPosition,
  TaxSummary,
  Dividend,
  Interest,
  Deposit,
  Borrow,
  Trade,
} from '@shared/models';
import { ExchangeRatesCache, findNBPRate } from '@shared/api';
import { getPreviousDay } from '@utils';

import {
  IBKRAccountInformationDto,
  IBKRNetAssetValueItemDto,
  IBKRStatementMetadata,
  IBKRNetAssetValueDto,
  IBKROpenPositionDto,
  IBKRDividendDto,
  IBKRInterestDto,
  IBKRDepositDto,
  IBKRBorrowDto,
  IBKRTradeDto,
} from './models/dto';
import {
  calculateDividendResult,
  calculateInterestResult,
  calculateBorrowResult,
  TradeTaxEngine,
} from './calculations';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Mapping of IBKR trade categories to OperationCategoryEnum
 *
 * ⚠️ PREPARING FOR THE FUTURE:
 * - Each broker will have its own category mapper
 * - Another broker may use different category names (e.g. "Equity" instead of "Stocks")
 * - Another broker may have categories that do not fit OperationCategoryEnum
 *   → then use OperationCategoryEnum.UNKNOWN and handle it in broker-specific logic
 *
 * !!!!IMPORTANT!!!! If IBKR changes category names, this must be updated here!
 *
 * Example for a future broker:
 * ```typescript
 * export const OTHER_BROKER_TRADE_CATEGORY_MAP: Record<string, OperationCategoryEnum> = {
 *   'Equity': OperationCategoryEnum.STOCKS,
 *   'Options': OperationCategoryEnum.OPTIONS,
 *   'Currency': OperationCategoryEnum.FOREX,
 *   'Futures': OperationCategoryEnum.UNKNOWN, // if not supported yet
 * };
 * ```
 */
export const IBKR_TRADE_CATEGORY_MAP: Record<string, OperationCategoryEnum> = {
  Stocks: OperationCategoryEnum.STOCKS,
  'Equity and Index Options': OperationCategoryEnum.OPTIONS,
  Forex: OperationCategoryEnum.FOREX,
};

/**
 * Empty TaxSummary used when the NBP rate is missing
 */
const EMPTY_SUMMARY: TaxSummary = { revenue: 0, cost: 0, income: 0 };

// ============================================================================
// SECTION 1: SIMPLE 1:1 MAPPINGS
// ============================================================================
// Mappings for models that need no additional tax calculations

/**
 * Maps IBKRAccountInformationDto to AccountInformation
 */
export const mapIBKRAccountInformation = (dto: IBKRAccountInformationDto): AccountInformation => {
  return {
    name: dto.name,
    account: dto.account,
    accountType: dto.accountType,
    customerType: dto.customerType,
    accountCapabilities: dto.accountCapabilities,
    baseCurrency: dto.baseCurrency,
  };
};

/**
 * Maps IBKRNetAssetValueItemDto to NetAssetValueItem
 */
const mapIBKRNetAssetValueItem = (dto: IBKRNetAssetValueItemDto): NetAssetValueItem => {
  return {
    assetClass: dto.assetClass,
    priorTotal: dto.priorTotal,
    currentLong: dto.currentLong,
    currentShort: dto.currentShort,
    currentTotal: dto.currentTotal,
    change: dto.change,
  };
};

/**
 * Maps IBKRNetAssetValueDto to NetAssetValue
 */
export const mapIBKRNetAssetValue = (dto: IBKRNetAssetValueDto): NetAssetValue => {
  return {
    items: dto.items.map(mapIBKRNetAssetValueItem),
    timeWeightedRateOfReturn: dto.timeWeightedRateOfReturn,
  };
};

/**
 * Maps IBKRDepositDto[] to Deposit[]
 */
export const mapIBKRDeposits = (dtos: IBKRDepositDto[]): Deposit[] => {
  return dtos.map(dto => ({
    category: OperationCategoryEnum.DEPOSIT,
    currency: dto.currency,
    settleDate: dto.settleDate,
    description: dto.description,
    amount: dto.amount,
  }));
};

/**
 * Maps IBKRStatementMetadata to StatementMetadata
 */
export const mapIBKRStatementMetadata = (dto: IBKRStatementMetadata): StatementMetadata => {
  return {
    minDate: dto.minDate,
    maxDate: dto.maxDate,
    currencies: dto.currencies,
  };
};

// ============================================================================
// SECTION 2: MAPPINGS WITH TAX CALCULATIONS
// ============================================================================
// Mappings for models that require tax calculations and exchange rates

/**
 * Maps IBKRTradeDto[] to Trade[] with NBP rates and PLN values
 *
 * @param trades - Raw trades from the CSV (IBKRTradeDto[])
 * @param exchangeRatesCache - Cache of NBP rates (fetched once for all data)
 * @returns Trade[] with exchange rates and tax summaries
 */
export const mapIBKRTradesToTrades = (
  trades: IBKRTradeDto[],
  exchangeRatesCache: ExchangeRatesCache
): Trade[] => {
  if (trades.length === 0) return [];

  // 1) First filter out junk (missing date)
  const validTrades = trades.filter(trade => {
    if (!trade.dateTime || trade.dateTime.trim() === '') {
      console.warn(`⚠️  Skipping trade with an empty date: ${JSON.stringify(trade)}`);
      return false;
    }
    return true;
  });

  // 2) SORT by date/time - this is critical for FIFO
  const sortedTrades = [...validTrades].sort((a, b) => {
    const aTime = new Date(a.dateTime.replace(',', '')).getTime();
    const bTime = new Date(b.dateTime.replace(',', '')).getTime();
    return aTime - bTime;
  });

  // 3) Create a new engine for this batch of trades
  const stockEngine = new TradeTaxEngine({ multiplier: 1 });
  const optionEngine = new TradeTaxEngine({ multiplier: 100 });
  // NOTE: fxEngine is not used - FOREX is not currently processed for tax purposes.
  // In the future Trade will have an "isSpekulative" field (or similar) to distinguish
  // currency exchange (untaxed) from FOREX speculation (taxed).

  // 4) Map and calculate tax
  const mappedTrades = sortedTrades.map(trade => {
    const category = IBKR_TRADE_CATEGORY_MAP[trade.assetCategory] || OperationCategoryEnum.UNKNOWN;

    const result = findNBPRate(exchangeRatesCache, trade.currency, getPreviousDay(trade.dateTime));
    const { date, rate } = result || {};

    let engineResult;

    if (rate) {
      if (category === OperationCategoryEnum.OPTIONS)
        engineResult = optionEngine.processTrade(trade, rate);
      if (category === OperationCategoryEnum.STOCKS)
        engineResult = stockEngine.processTrade(trade, rate);
    }

    return {
      symbol: trade.symbol,
      dateTime: trade.dateTime,
      category,
      currency: trade.currency,
      quantity: trade.quantity,
      tradePrice: trade.tradePrice,
      closingPrice: trade.closingPrice,
      proceeds: trade.proceeds,
      commissionFee: trade.commissionFee,
      basis: trade.basis,
      realizedPL: trade.realizedPL,
      mtmPL: trade.mtmPL,
      code: trade.code,
      exchangeRate: { date, rate },
      summary: engineResult?.tax || EMPTY_SUMMARY,
      actions: engineResult?.actions || [],
      quantityAfter: engineResult?.quantityAfter,
    };
  });

  return mappedTrades;
};

/**
 * Maps IBKRDividendDto[] to Dividend[] with NBP rates and PLN values
 *
 * @param dividends - Raw dividends from the CSV (IBKRDividendDto[])
 * @param exchangeRatesCache - Cache of NBP rates (fetched once for all data)
 * @returns Dividend[] with exchange rates and tax summaries
 */
export const mapIBKRDividendsToDividends = (
  dividends: IBKRDividendDto[],
  exchangeRatesCache: ExchangeRatesCache
): Dividend[] => {
  if (dividends.length === 0) return [];

  const mappedDividends = dividends
    .filter(dividend => {
      if (!dividend.date || dividend.date.trim() === '') {
        console.warn(`⚠️  Skipping dividend with an empty date: ${JSON.stringify(dividend)}`);
        return false;
      }
      return true;
    })
    .map(dividend => {
      const result = findNBPRate(
        exchangeRatesCache,
        dividend.currency,
        getPreviousDay(dividend.date)
      );
      const { date, rate } = result || {};
      const summary = calculateDividendSummary(dividend, rate);

      return {
        category: OperationCategoryEnum.DIVIDEND,
        symbol: dividend.symbol,
        date: dividend.date,
        currency: dividend.currency,
        grossAmount: dividend.grossAmount,
        withholdingTaxAmount: dividend.withholdingTaxAmount,
        netAmount: dividend.netAmount,
        exchangeRate: { date, rate },
        summary,
      };
    });

  return mappedDividends;
};

/**
 * Maps IBKRInterestDto[] to Interest[] with NBP rates and PLN values
 *
 * @param interests - Raw interest from the CSV (IBKRInterestDto[])
 * @param exchangeRatesCache - Cache of NBP rates (fetched once for all data)
 * @returns Interest[] with exchange rates and tax summaries
 */
export const mapIBKRInterestsToInterests = (
  interests: IBKRInterestDto[],
  exchangeRatesCache: ExchangeRatesCache
): Interest[] => {
  if (interests.length === 0) return [];

  const mappedInterests = interests
    .filter(interest => {
      if (!interest.date || interest.date.trim() === '') {
        console.warn(`⚠️  Skipping interest with an empty date: ${JSON.stringify(interest)}`);
        return false;
      }
      return true;
    })
    .map(interest => {
      const result = findNBPRate(
        exchangeRatesCache,
        interest.currency,
        getPreviousDay(interest.date)
      );
      const { date, rate } = result || {};
      const summary = calculateInterestSummary(interest, rate);

      return {
        category: OperationCategoryEnum.INTEREST,
        date: interest.date,
        currency: interest.currency,
        description: interest.description,
        amount: interest.amount,
        exchangeRate: { date, rate },
        summary,
      };
    });

  return mappedInterests;
};

/**
 * Maps IBKRBorrowDto[] to Borrow[] with NBP rates and PLN values
 *
 * @param borrows - Raw borrow fees from the CSV (IBKRBorrowDto[])
 * @param exchangeRatesCache - Cache of NBP rates (fetched once for all data)
 * @returns Borrow[] with exchange rates and tax summaries
 */
export const mapIBKRBorrowsToBorrows = (
  borrows: IBKRBorrowDto[],
  exchangeRatesCache: ExchangeRatesCache
): Borrow[] => {
  if (borrows.length === 0) return [];

  const mappedBorrows = borrows
    .filter(borrow => {
      if (!borrow.valueDate || borrow.valueDate.trim() === '') {
        console.warn(`⚠️  Skipping borrow fee with an empty date: ${JSON.stringify(borrow)}`);
        return false;
      }
      return true;
    })
    .map(borrow => {
      const result = findNBPRate(
        exchangeRatesCache,
        borrow.currency,
        getPreviousDay(borrow.valueDate)
      );
      const { date, rate } = result || {};
      const summary = calculateBorrowSummary(borrow, rate);

      return {
        category: OperationCategoryEnum.BORROW,
        symbol: borrow.symbol,
        valueDate: borrow.valueDate,
        currency: borrow.currency,
        quantity: borrow.quantity,
        price: borrow.price,
        value: borrow.value,
        feeRate: borrow.feeRate,
        borrowFee: borrow.borrowFee,
        code: borrow.code,
        exchangeRate: { date, rate },
        summary,
      };
    });

  return mappedBorrows;
};

// ============================================================================
// SECTION 3: HELPER FUNCTIONS - CALCULATING TAX SUMMARIES
// ============================================================================

/**
 * Calculates revenue, cost and income for a dividend (Pure Function)
 */
const calculateDividendSummary = (
  dividend: IBKRDividendDto,
  nbpRate: undefined | number
): TaxSummary => {
  if (!nbpRate) return EMPTY_SUMMARY;

  return calculateDividendResult(dividend, nbpRate);
};

/**
 * Calculates revenue, cost and income for interest (Pure Function)
 */
const calculateInterestSummary = (
  interest: IBKRInterestDto,
  nbpRate: undefined | number
): TaxSummary => {
  if (!nbpRate) return EMPTY_SUMMARY;

  return calculateInterestResult(interest, nbpRate);
};

/**
 * Calculates revenue, cost and income for a borrow fee (Pure Function)
 */
const calculateBorrowSummary = (borrow: IBKRBorrowDto, nbpRate: undefined | number): TaxSummary => {
  if (!nbpRate) return EMPTY_SUMMARY;

  return calculateBorrowResult(borrow, nbpRate);
};

/**
 * Maps IBKROpenPositionDto[] to OpenPosition[] with NBP rates
 *
 * @param positions - Raw positions from the CSV (IBKROpenPositionDto[])
 * @param exchangeRatesCache - Cache of NBP rates (fetched once for all data)
 * @param reportEndDate - Report period end date (YYYY-MM-DD), defaults to today
 * @returns OpenPosition[] with exchange rates
 */
export const mapIBKROpenPositionsToOpenPositions = (
  positions: IBKROpenPositionDto[],
  exchangeRatesCache: ExchangeRatesCache,
  reportEndDate: string = new Date().toISOString().split('T')[0]
): OpenPosition[] => {
  if (positions.length === 0) return [];

  // Rate from the day preceding the period end (default: today)
  const previousDay: string = getPreviousDay(reportEndDate);

  return positions.map(position => {
    // Map the IBKR category to OperationCategoryEnum
    const category =
      IBKR_TRADE_CATEGORY_MAP[position.assetCategory] || OperationCategoryEnum.UNKNOWN;

    const result = findNBPRate(exchangeRatesCache, position.currency, previousDay);
    const { date, rate } = result || {};

    return {
      symbol: position.symbol,
      category,
      currency: position.currency,
      quantity: position.quantity,
      mult: position.mult,
      costPrice: position.costPrice,
      costBasis: position.costBasis,
      closePrice: position.closePrice,
      value: position.value,
      unrealizedPL: position.unrealizedPL,
      code: position.code || undefined,
      exchangeRate: { date, rate },
    };
  });
};
