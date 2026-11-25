import { ExchangeRate } from './exchange-rate.model';
import { TradeAction } from './trade-action.model';
import { TaxSummary } from './tax-summary.model';
import { OperationCategoryEnum } from '../enums';

/**
 * Trade (domain model)
 *
 * Abstraction independent of the data source (IBKR, another broker, etc.)
 * Contains the exchange rate and tax summary added by the mapper.
 *
 * ⚠️ FUTURE-PROOFING:
 * - The model is shared by all brokers, but each broker may have
 *   its own specific fields in the data source (DTO)
 * - If you later need category-specific fields
 *   (e.g. strike, expiry for options), consider:
 *   1. Adding optional fields here (e.g. strike?: number)
 *   2. Or using the metadata field for broker/category-specific data
 * - The category is used to select the appropriate calculation logic
 *   in calculateTradeSummary() - each broker has its own mapper with its own mapping
 */
export interface Trade {
  /** Instrument symbol */
  symbol: string;

  /** Trade execution date and time (Format: "YYYY-MM-DD, HH:MM:SS") */
  dateTime: string;

  /**
   * Trade category
   *
   * Used to select the appropriate tax calculation logic.
   * Each broker maps its categories to OperationCategoryEnum in its own mapper.
   */
  category: OperationCategoryEnum;

  /** Trade currency */
  currency: string;

  /**
   * Number of units in the trade.
   * Negative values are sales, positive values are purchases.
   */
  quantity: number;

  /**
   * Net position (signed) after this trade executes for the given symbol.
   * Positive value = long, negative = short, zero = no position, undefined = invalid trade or calculations are skipped.
   */
  quantityAfter?: number;

  /** Trade price */
  tradePrice: number;

  /** Instrument close price */
  closingPrice: number;

  /** Trade proceeds (negative for purchases, positive for sales) */
  proceeds: number;

  /** Commission and fees */
  commissionFee: number;

  /** Cost basis */
  basis: number;

  /** Realized profit/loss */
  realizedPL: number;

  /** Mark-to-Market profit/loss */
  mtmPL: number;

  /**
   * Transaction code (e.g. "O", "C", "A;O")
   *
   * The format and meaning of the codes may differ between brokers.
   * Each broker has its own parser that interprets these codes.
   */
  code?: string;

  /**
   * Additional metadata specific to the broker/category
   *
   * Used to store data that does not fit the standard fields,
   * but may be needed in the future (e.g. strike, expiry for options).
   *
   * Usage example:
   * - For options: { strike: 615, expiry: "2025-11-04", optionType: "PUT" }
   * - For other brokers: { brokerSpecificField: "value" }
   */
  metadata?: Record<string, unknown>;

  /** Exchange rate (added by the mapper) */
  exchangeRate: ExchangeRate;

  /** Tax summary (added by the mapper) */
  summary: TaxSummary;

  /** Position actions (added by the mapper) */
  actions: TradeAction[];
}
