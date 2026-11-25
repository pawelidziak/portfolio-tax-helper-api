import { ExchangeRate } from './exchange-rate.model';
import { TaxSummary } from './tax-summary.model';
import { OperationCategoryEnum } from '../enums';

/**
 * Interest (domain model)
 *
 * Abstraction independent of the data source (IBKR, another broker, etc.)
 * Contains the exchange rate and tax summary added by the mapper.
 */
export interface Interest {
  /** Operation category */
  category: OperationCategoryEnum;

  /** Interest date (Format: "YYYY-MM-DD") */
  date: string;

  /** Interest currency */
  currency: string;

  /** Interest description */
  description: string;

  /**
   * Interest amount
   * Positive for credit interest (broker pays)
   * Negative for debit interest (broker charges - margin interest)
   */
  amount: number;

  /** Exchange rate (added by the mapper) */
  exchangeRate: ExchangeRate;

  /** Tax summary (added by the mapper) */
  summary: TaxSummary;
}
