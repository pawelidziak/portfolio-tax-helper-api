import { ExchangeRate } from './exchange-rate.model';
import { OperationCategoryEnum } from '../enums';

/**
 * Open portfolio position (domain model)
 *
 * Represents the current portfolio position (not a transaction).
 * Abstraction independent of the data source (IBKR, another broker, etc.)
 * Contains the exchange rate added by the mapper.
 */
export interface OpenPosition {
  /** Instrument symbol */
  symbol: string;

  /**
   * Asset category
   *
   * Used to identify the position type.
   * Each broker maps its categories to OperationCategoryEnum in its own mapper.
   */
  category: OperationCategoryEnum;

  /** Position currency */
  currency: string;

  /**
   * Number of units in the position.
   * Negative values are short positions, positive values are long.
   */
  quantity: number;

  /** Multiplier (e.g. 100 for options) */
  mult: number;

  /** Average purchase price */
  costPrice: number;

  /** Total position cost (quantity * costPrice * mult) */
  costBasis: number;

  /** Current close price */
  closePrice: number;

  /** Current position value (quantity * closePrice * mult) */
  value: number;

  /** Unrealized profit/loss (value - costBasis) */
  unrealizedPL: number;

  /** Position code (optional) */
  code?: string;

  /** Exchange rate (added by the mapper) */
  exchangeRate: ExchangeRate;
}
