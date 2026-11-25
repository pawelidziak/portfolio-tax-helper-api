import { ExchangeRate } from './exchange-rate.model';
import { TaxSummary } from './tax-summary.model';
import { OperationCategoryEnum } from '../enums';

/**
 * Stock borrow fee (domain model)
 *
 * Abstraction independent of the data source (IBKR, another broker, etc.)
 * Contains the exchange rate and tax summary added by the mapper.
 */
export interface Borrow {
  /** Operation category */
  category: OperationCategoryEnum;

  /** Instrument symbol */
  symbol: string;

  /** Value Date - Format: "YYYY-MM-DD" */
  valueDate: string;

  /** Fee currency */
  currency: string;

  /** Quantity of borrowed shares */
  quantity: number;

  /** Share price */
  price: number;

  /** Collateral value */
  value: number;

  /** Fee rate in % per year */
  feeRate: number;

  /** Borrow fee (always negative) */
  borrowFee: number;

  /** Transaction code */
  code: string;

  /** Exchange rate (added by the mapper) */
  exchangeRate: ExchangeRate;

  /** Tax summary (added by the mapper) */
  summary: TaxSummary;
}
