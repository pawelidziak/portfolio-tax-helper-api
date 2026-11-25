import { ExchangeRate } from './exchange-rate.model';
import { TaxSummary } from './tax-summary.model';
import { OperationCategoryEnum } from '../enums';

/**
 * Dividend (domain model)
 *
 * Abstraction independent of the data source (IBKR, another broker, etc.)
 * Contains the exchange rate and tax summary added by the mapper.
 */
export interface Dividend {
  /** Operation category */
  category: OperationCategoryEnum;

  /** Instrument symbol (ticker) */
  symbol: string;

  /** Dividend date (Format: "YYYY-MM-DD") */
  date: string;

  /** Dividend currency */
  currency: string;

  /** Gross dividend amount (before withholding tax) */
  grossAmount: number;

  /** Withholding tax (always negative or 0) */
  withholdingTaxAmount: number;

  /** Net dividend amount (after withholding tax) */
  netAmount: number;

  /** Exchange rate (added by the mapper) */
  exchangeRate: ExchangeRate;

  /** Tax summary (added by the mapper) */
  summary: TaxSummary;
}
