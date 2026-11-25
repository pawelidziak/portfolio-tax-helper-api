/**
 * Metadata extracted from the IBKR CSV
 */
export interface IBKRStatementMetadata {
  minDate: string;
  maxDate: string;
  currencies: Set<string>;
}
