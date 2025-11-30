/**
 * IBKR Mappers Service
 *
 * Mapuje IBKR DTOs na modele domenowe z kursami NBP i podsumowaniami podatkowymi.
 *
 * Struktura:
 * - Sekcja 1: Proste mapowania 1:1 (AccountInformation, NetAssetValue, Deposit, StatementMetadata)
 * - Sekcja 2: Mapowania z obliczeniami podatkowymi (Trade, Dividend, Interest, Borrow)
 *
 * Wszystkie mappery używają wspólnego cache kursów NBP przekazanego z lambda handlera.
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
  TradeAction,
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
 * Mapowanie kategorii transakcji z IBKR na OperationCategoryEnum
 *
 * ⚠️ PRZYGOTOWANIE NA PRZYSZŁOŚĆ:
 * - Każdy broker będzie miał swój własny mapper kategorii
 * - Inny broker może mieć inne nazwy kategorii (np. "Equity" zamiast "Stocks")
 * - Inny broker może mieć kategorie, które nie pasują do OperationCategoryEnum
 *   → wtedy użyj OperationCategoryEnum.UNKNOWN i obsłuż w logice specyficznej
 *
 * !!!!WAŻNE!!!! Jeśli IBKR zmieni nazwy kategorii, trzeba to tutaj zaktualizować!
 *
 * Przykład dla przyszłego brokera:
 * ```typescript
 * export const OTHER_BROKER_TRADE_CATEGORY_MAP: Record<string, OperationCategoryEnum> = {
 *   'Equity': OperationCategoryEnum.STOCKS,
 *   'Options': OperationCategoryEnum.OPTIONS,
 *   'Currency': OperationCategoryEnum.FOREX,
 *   'Futures': OperationCategoryEnum.UNKNOWN, // jeśli nie obsługujemy jeszcze
 * };
 * ```
 */
export const IBKR_TRADE_CATEGORY_MAP: Record<string, OperationCategoryEnum> = {
  Stocks: OperationCategoryEnum.STOCKS,
  'Equity and Index Options': OperationCategoryEnum.OPTIONS,
  Forex: OperationCategoryEnum.FOREX,
};

/**
 * Pusty TaxSummary używany gdy brak kursu NBP
 */
const EMPTY_SUMMARY: TaxSummary = { revenue: 0, cost: 0, income: 0 };

// ============================================================================
// SEKCJA 1: PROSTE MAPOWANIA 1:1
// ============================================================================
// Mapowania dla modeli, które nie wymagają dodatkowych obliczeń podatkowych

/**
 * Mapuje IBKRAccountInformationDto na AccountInformation
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
 * Mapuje IBKRNetAssetValueItemDto na NetAssetValueItem
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
 * Mapuje IBKRNetAssetValueDto na NetAssetValue
 */
export const mapIBKRNetAssetValue = (dto: IBKRNetAssetValueDto): NetAssetValue => {
  return {
    items: dto.items.map(mapIBKRNetAssetValueItem),
    timeWeightedRateOfReturn: dto.timeWeightedRateOfReturn,
  };
};

/**
 * Mapuje IBKRDepositDto[] na Deposit[]
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
 * Mapuje IBKRStatementMetadata na StatementMetadata
 */
export const mapIBKRStatementMetadata = (dto: IBKRStatementMetadata): StatementMetadata => {
  return {
    minDate: dto.minDate,
    maxDate: dto.maxDate,
    currencies: dto.currencies,
  };
};

// ============================================================================
// SEKCJA 2: MAPOWANIA Z OBLICZENIAMI PODATKOWYMI
// ============================================================================
// Mapowania dla modeli, które wymagają obliczeń podatkowych i kursów wymiany

/**
 * Mapuje IBKRTradeDto[] na Trade[] z kursami NBP i wartościami w PLN
 *
 * @param trades - Surowe transakcje z CSV (IBKRTradeDto[])
 * @param exchangeRatesCache - Cache z kursami NBP (pobrany raz dla wszystkich danych)
 * @returns Trade[] z kursami wymiany i podsumowaniami podatkowymi
 */
export const mapIBKRTradesToTrades = (
  trades: IBKRTradeDto[],
  exchangeRatesCache: ExchangeRatesCache
): Trade[] => {
  if (trades.length === 0) return [];

  // 1) Najpierw odfiltruj śmieci (brak daty)
  const validTrades = trades.filter(trade => {
    if (!trade.dateTime || trade.dateTime.trim() === '') {
      console.warn(`⚠️  Pomijam transakcję z pustą datą: ${JSON.stringify(trade)}`);
      return false;
    }
    return true;
  });

  // 2) POSORTUJ po dacie/czasie – to jest krytyczne dla FIFO
  const sortedTrades = [...validTrades].sort((a, b) => {
    const aTime = new Date(a.dateTime.replace(',', '')).getTime();
    const bTime = new Date(b.dateTime.replace(',', '')).getTime();
    return aTime - bTime;
  });

  // 3) Utwórz nowy engine dla tego batcha transakcji
  const stockEngine = new TradeTaxEngine({ multiplier: 1 });
  const optionEngine = new TradeTaxEngine({ multiplier: 100 });
  // NOTE: fxEngine nie jest używany - FOREX nie jest obecnie przetwarzany podatkowo.
  // W przyszłości Trade będzie miał pole "isSpekulative" (lub podobne) do rozróżnienia
  // wymiany waluty (nieopodatkowanej) od spekulacji na FOREX (opodatkowanej).

  // 4) Mapuj i licz podatek
  const mappedTrades = sortedTrades.map(trade => {
    const category = IBKR_TRADE_CATEGORY_MAP[trade.assetCategory] || OperationCategoryEnum.UNKNOWN;

    const result = findNBPRate(exchangeRatesCache, trade.currency, getPreviousDay(trade.dateTime));
    const { date, rate } = result || {};

    let engineResult: { actions: TradeAction[]; quantityAfter: number; tax: TaxSummary } = {
      actions: [],
      quantityAfter: 0,
      tax: EMPTY_SUMMARY,
    };

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
      quantityAfter: engineResult.quantityAfter,
      tradePrice: trade.tradePrice,
      closingPrice: trade.closingPrice,
      proceeds: trade.proceeds,
      commissionFee: trade.commissionFee,
      basis: trade.basis,
      realizedPL: trade.realizedPL,
      mtmPL: trade.mtmPL,
      code: trade.code,
      exchangeRate: { date, rate },
      summary: engineResult.tax,
      actions: engineResult.actions,
    };
  });

  return mappedTrades;
};

/**
 * Mapuje IBKRDividendDto[] na Dividend[] z kursami NBP i wartościami w PLN
 *
 * @param dividends - Surowe dywidendy z CSV (IBKRDividendDto[])
 * @param exchangeRatesCache - Cache z kursami NBP (pobrany raz dla wszystkich danych)
 * @returns Dividend[] z kursami wymiany i podsumowaniami podatkowymi
 */
export const mapIBKRDividendsToDividends = (
  dividends: IBKRDividendDto[],
  exchangeRatesCache: ExchangeRatesCache
): Dividend[] => {
  if (dividends.length === 0) return [];

  const mappedDividends = dividends
    .filter(dividend => {
      if (!dividend.date || dividend.date.trim() === '') {
        console.warn(`⚠️  Pomijam dywidendę z pustą datą: ${JSON.stringify(dividend)}`);
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
 * Mapuje IBKRInterestDto[] na Interest[] z kursami NBP i wartościami w PLN
 *
 * @param interests - Surowe odsetki z CSV (IBKRInterestDto[])
 * @param exchangeRatesCache - Cache z kursami NBP (pobrany raz dla wszystkich danych)
 * @returns Interest[] z kursami wymiany i podsumowaniami podatkowymi
 */
export const mapIBKRInterestsToInterests = (
  interests: IBKRInterestDto[],
  exchangeRatesCache: ExchangeRatesCache
): Interest[] => {
  if (interests.length === 0) return [];

  const mappedInterests = interests
    .filter(interest => {
      if (!interest.date || interest.date.trim() === '') {
        console.warn(`⚠️  Pomijam odsetki z pustą datą: ${JSON.stringify(interest)}`);
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
 * Mapuje IBKRBorrowDto[] na Borrow[] z kursami NBP i wartościami w PLN
 *
 * @param borrows - Surowe opłaty za pożyczkę z CSV (IBKRBorrowDto[])
 * @param exchangeRatesCache - Cache z kursami NBP (pobrany raz dla wszystkich danych)
 * @returns Borrow[] z kursami wymiany i podsumowaniami podatkowymi
 */
export const mapIBKRBorrowsToBorrows = (
  borrows: IBKRBorrowDto[],
  exchangeRatesCache: ExchangeRatesCache
): Borrow[] => {
  if (borrows.length === 0) return [];

  const mappedBorrows = borrows
    .filter(borrow => {
      if (!borrow.valueDate || borrow.valueDate.trim() === '') {
        console.warn(`⚠️  Pomijam opłatę za pożyczkę z pustą datą: ${JSON.stringify(borrow)}`);
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
// SEKCJA 3: FUNKCJE POMOCNICZE - OBLICZANIE PODSUMOWAŃ PODATKOWYCH
// ============================================================================

/**
 * Oblicza przychód, koszt i dochód dla dywidendy (Pure Function)
 */
const calculateDividendSummary = (
  dividend: IBKRDividendDto,
  nbpRate: undefined | number
): TaxSummary => {
  if (!nbpRate) return EMPTY_SUMMARY;

  return calculateDividendResult(dividend, nbpRate);
};

/**
 * Oblicza przychód, koszt i dochód dla odsetek (Pure Function)
 */
const calculateInterestSummary = (
  interest: IBKRInterestDto,
  nbpRate: undefined | number
): TaxSummary => {
  if (!nbpRate) return EMPTY_SUMMARY;

  return calculateInterestResult(interest, nbpRate);
};

/**
 * Oblicza przychód, koszt i dochód dla opłaty za pożyczkę (Pure Function)
 */
const calculateBorrowSummary = (borrow: IBKRBorrowDto, nbpRate: undefined | number): TaxSummary => {
  if (!nbpRate) return EMPTY_SUMMARY;

  return calculateBorrowResult(borrow, nbpRate);
};

/**
 * Mapuje IBKROpenPositionDto[] na OpenPosition[] z kursami NBP
 *
 * @param positions - Surowe pozycje z CSV (IBKROpenPositionDto[])
 * @param exchangeRatesCache - Cache z kursami NBP (pobrany raz dla wszystkich danych)
 * @param reportEndDate - Data końca okresu raportu (używana do pobrania kursu wymiany)
 * @returns OpenPosition[] z kursami wymiany
 */
export const mapIBKROpenPositionsToOpenPositions = (
  positions: IBKROpenPositionDto[],
  exchangeRatesCache: ExchangeRatesCache
): OpenPosition[] => {
  if (positions.length === 0) return [];

  // Użyj dzisiejszej daty minus 1 dzień
  const today: string = new Date().toISOString().split('T')[0];
  const previousDay: string = getPreviousDay(today);

  return positions.map(position => {
    // Mapuj kategorię z IBKR na OperationCategoryEnum
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
