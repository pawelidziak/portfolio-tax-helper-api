import { CurrencyEnum } from '@shared/models';

/**
 * DTO for a single open position from the IBKR CSV
 */
export interface IBKROpenPositionDto {
  dataDiscriminator: string; // "Summary" for positions, "Total" for the totals row
  assetCategory: string; // "Stocks", "Equity and Index Options", etc.
  currency: CurrencyEnum;
  symbol: string;
  quantity: number; // Can be negative for short positions
  mult: number; // Multiplier (e.g. 100 for options)
  costPrice: number; // Average purchase price
  costBasis: number; // Total cost (quantity * costPrice * mult)
  closePrice: number; // Current closing price
  value: number; // Current position value (quantity * closePrice * mult)
  unrealizedPL: number; // Unrealized profit/loss (value - costBasis)
  code: string; // Transaction codes
}
