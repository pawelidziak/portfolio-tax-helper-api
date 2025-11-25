/**
 * Metadane wyciągnięte z CSV IBKR
 */
export interface IBKRStatementMetadata {
  minDate: string;
  maxDate: string;
  currencies: Set<string>;
}
