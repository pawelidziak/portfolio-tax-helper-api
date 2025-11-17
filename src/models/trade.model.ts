import { AssetCategoryEnum } from './asset-category.enum';
import { TradeSummary } from './trade-summary.model';
import { ExchangeRate } from './exchange-rate.model';
import { IBKRTradeDto } from './ibkr-trade.dto';

/**
 * Transakcja z IBKR wzbogacona o kurs wymiany i podsumowanie
 *
 * To jest IBKRTradeDTO + dodatkowe pola dodane przez mapper:
 * - category: zmapowana kategoria aktywów
 * - exchangeRate: kurs wymiany (date, rate)
 * - summary: podsumowanie transakcji (revenue, cost, income)
 */
export type Trade = IBKRTradeDto & {
  category: AssetCategoryEnum;
  exchangeRate: ExchangeRate;
  summary: TradeSummary;
};
