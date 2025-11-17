/**
 * Mapuje IBKRTradeDTO[] na Trade[] z kursami NBP i wartościami w PLN
 *
 * Single Responsibility:
 * - Koordynuje proces mapowania transakcji IBKR
 * - Pobiera kursy NBP dla wszystkich walut i dat
 * - Używa kalkulatorów do obliczenia wartości finansowych
 */

import { calculateOptionsSummary, calculateStocksSummary } from '@core/calculations';
import { AssetCategoryEnum, IBKRTradeDto, Trade, TradeSummary } from '@models';
import { getExchangeRates, findNBPRate } from '@services';
import { extractDate, getPreviousDay } from '@utils';

export const IBKR_ASSET_CATEGORY_MAP: Record<string, AssetCategoryEnum> = {
  Stocks: AssetCategoryEnum.STOCKS,
  'Equity and Index Options': AssetCategoryEnum.OPTIONS,
  Forex: AssetCategoryEnum.FOREX,
};

const EMPTY_SUMMARY: TradeSummary = {
  revenue: undefined,
  cost: undefined,
  income: undefined,
};

/**
 * Mapuje IBKRTradeDTO[] na Trade[] z kursami NBP i wartościami w PLN
 *
 * @param trades - Surowe transakcje z CSV (IBKRTradeDTO[])
 * @returns Trade[] z nbpDate, nbpRate, revenue, cost, income
 */
export const mapIBKRTradesToTrades = async (trades: IBKRTradeDto[]): Promise<Trade[]> => {
  console.log(`🔄 Mapowanie ${trades.length} transakcji...`);
  if (trades.length === 0) return [];

  // KROK 1: Zbierz currencies i min/max date
  const range = getDateRangeAndCurrencies(trades);
  console.log(
    `📊 Zakres: ${range.minDate} - ${range.maxDate}, waluty: ${Array.from(range.currencies).join(', ')}`
  );

  // KROK 2: Pobierz kursy NBP
  const exchangeRatesCache = await getExchangeRates(
    range.currencies,
    range.minDate,
    range.maxDate,
    10 // buffer days
  );

  // KROK 3: Mapuj IBKR → nasze dane (z wszystkimi polami)
  console.log(`🔧 Mapowanie transakcji z kursami NBP...`);
  const mappedTrades = trades.map(trade => {
    const category = IBKR_ASSET_CATEGORY_MAP[trade.assetCategory] || AssetCategoryEnum.UNKNOWN;
    const result = findNBPRate(exchangeRatesCache, trade.currency, getPreviousDay(trade.dateTime));
    const { date, rate } = result || {};
    const summary = calculateSummary(trade, category, rate);

    return {
      ...trade,
      category,
      exchangeRate: { date, rate },
      summary,
    };
  });

  console.log(`✅ Zmapowano ${mappedTrades.length} transakcji`);
  return mappedTrades;
};

/**
 * Zbiera currencies i min/max date z IBKRTradeDTO[] (Pure Function)
 */
const getDateRangeAndCurrencies = (
  trades: IBKRTradeDto[]
): { minDate: string; maxDate: string; currencies: Set<string> } => {
  const currencies = new Set<string>();
  const dates: string[] = [];

  for (const trade of trades) {
    if (trade.currency) currencies.add(trade.currency);
    if (trade.dateTime) dates.push(extractDate(trade.dateTime));
  }

  const sortedDates = dates.sort();
  return {
    minDate: sortedDates[0],
    maxDate: sortedDates[sortedDates.length - 1],
    currencies,
  };
};

/**
 * Oblicza przychód, koszt i dochód dla transakcji (Pure Function)
 *
 * Routing do właściwej logiki w zależności od kategorii aktywów:
 * - OPTIONS: skomplikowana logika księgowa (premia, assignment, closing)
 * - STOCKS: prostsza logika (tylko realized P/L przy closing)
 *
 * Wszystkie obliczenia wykonywane są NAJPIERW w walucie transakcji,
 * a DOPIERO POTEM przeliczane na PLN przez nbpRate
 */
const calculateSummary = (
  trade: IBKRTradeDto,
  category: AssetCategoryEnum,
  nbpRate: number | undefined
): TradeSummary => {
  if (!nbpRate) return EMPTY_SUMMARY;

  if (category === AssetCategoryEnum.OPTIONS) return calculateOptionsSummary(trade, nbpRate);
  if (category === AssetCategoryEnum.STOCKS) return calculateStocksSummary(trade, nbpRate);

  return EMPTY_SUMMARY;
};
