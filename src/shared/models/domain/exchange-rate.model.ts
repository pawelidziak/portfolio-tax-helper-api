/**
 * Exchange rate for a transaction
 */
export interface ExchangeRate {
  /**
   * NBP Date - NBP rate date for the transaction
   * NBP rate date from the DAY BEFORE the transaction date.
   */
  date?: string;

  /**
   * NBP Exchange Rate - NBP rate from the previous day
   * NBP rate from the day before the transaction date.
   * Used to convert revenue and cost to PLN.
   */
  rate?: number;
}
