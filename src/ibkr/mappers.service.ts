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
  AccountInformation,
  NetAssetValueItem,
  StatementMetadata,
  TradeCategoryEnum,
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
  calculateOptionResult,
  calculateStocksResult,
  calculateBorrowResult,
  calculateForexResult,
} from './calculations';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Mapowanie kategorii transakcji z IBKR na TradeCategoryEnum
 *
 * ⚠️ PRZYGOTOWANIE NA PRZYSZŁOŚĆ:
 * - Każdy broker będzie miał swój własny mapper kategorii
 * - Inny broker może mieć inne nazwy kategorii (np. "Equity" zamiast "Stocks")
 * - Inny broker może mieć kategorie, które nie pasują do TradeCategoryEnum
 *   → wtedy użyj TradeCategoryEnum.UNKNOWN i obsłuż w logice specyficznej
 *
 * Przykład dla przyszłego brokera:
 * ```typescript
 * export const OTHER_BROKER_TRADE_CATEGORY_MAP: Record<string, TradeCategoryEnum> = {
 *   'Equity': TradeCategoryEnum.STOCKS,
 *   'Options': TradeCategoryEnum.OPTIONS,
 *   'Currency': TradeCategoryEnum.FOREX,
 *   'Futures': TradeCategoryEnum.UNKNOWN, // jeśli nie obsługujemy jeszcze
 * };
 * ```
 */
export const IBKR_TRADE_CATEGORY_MAP: Record<string, TradeCategoryEnum> = {
  Stocks: TradeCategoryEnum.STOCKS,
  'Equity and Index Options': TradeCategoryEnum.OPTIONS,
  Forex: TradeCategoryEnum.FOREX,
};

/**
 * Pusty TaxSummary używany gdy brak kursu NBP
 */
const EMPTY_SUMMARY: TaxSummary = {
  revenue: undefined,
  cost: undefined,
  income: undefined,
};

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

  const mappedTrades = trades
    .filter(trade => {
      if (!trade.dateTime || trade.dateTime.trim() === '') {
        console.warn(`⚠️  Pomijam transakcję z pustą datą: ${JSON.stringify(trade)}`);
        return false;
      }
      return true;
    })
    .map(trade => {
      const category = IBKR_TRADE_CATEGORY_MAP[trade.assetCategory] || TradeCategoryEnum.UNKNOWN;
      const result = findNBPRate(
        exchangeRatesCache,
        trade.currency,
        getPreviousDay(trade.dateTime)
      );
      const { date, rate } = result || {};
      const summary = calculateTradeSummary(trade, category, rate);

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
        summary,
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
 * Oblicza przychód, koszt i dochód dla transakcji (Pure Function)
 *
 * Routing do właściwej logiki w zależności od kategorii aktywów:
 * - OPTIONS: skomplikowana logika księgowa (premia, assignment, closing)
 * - STOCKS: prostsza logika (tylko realized P/L przy closing)
 * - FOREX: wymiana walut nie generuje przychodu/kosztu podatkowego
 *
 * ⚠️ PRZYGOTOWANIE NA PRZYSZŁOŚĆ:
 * - Ta funkcja jest specyficzna dla IBKR (używa IBKRTradeDto)
 * - Inny broker będzie miał swoją własną implementację calculateTradeSummary
 * - Logika obliczeniowa może różnić się między brokerami nawet dla tej samej kategorii
 *   (np. inny broker może inaczej liczyć realized P/L dla opcji)
 * - Struktura folderów: src/{broker}/calculations/ zawiera logikę specyficzną dla brokera
 */
const calculateTradeSummary = (
  trade: IBKRTradeDto,
  category: TradeCategoryEnum,
  nbpRate: undefined | number
): TaxSummary => {
  if (!nbpRate) return EMPTY_SUMMARY;

  if (category === TradeCategoryEnum.OPTIONS) return calculateOptionResult(trade, nbpRate);
  if (category === TradeCategoryEnum.STOCKS) return calculateStocksResult(trade, nbpRate);
  if (category === TradeCategoryEnum.FOREX) return calculateForexResult(trade, nbpRate);
  return EMPTY_SUMMARY;
};

/**
 * Oblicza przychód, koszt i dochód dla dywidendy (Pure Function)
 */
const calculateDividendSummary = (
  dividend: IBKRDividendDto,
  nbpRate: undefined | number
): TaxSummary => {
  if (!nbpRate) return EMPTY_SUMMARY;

  return calculateDividendResult({
    ticker: dividend.symbol,
    grossAmount: dividend.grossAmount,
    withholdingTaxAmount: dividend.withholdingTaxAmount,
    currency: dividend.currency,
    fxRateToPLN: nbpRate,
  });
};

/**
 * Oblicza przychód, koszt i dochód dla odsetek (Pure Function)
 */
const calculateInterestSummary = (
  interest: IBKRInterestDto,
  nbpRate: undefined | number
): TaxSummary => {
  if (!nbpRate) return EMPTY_SUMMARY;

  const kind = interest.amount >= 0 ? 'POSITIVE' : 'NEGATIVE';
  const amount = Math.abs(interest.amount);

  return calculateInterestResult({
    kind,
    amount,
    currency: interest.currency,
    fxRateToPLN: nbpRate,
  });
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
    // Mapuj kategorię z IBKR na TradeCategoryEnum
    const category = IBKR_TRADE_CATEGORY_MAP[position.assetCategory] || TradeCategoryEnum.UNKNOWN;

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
