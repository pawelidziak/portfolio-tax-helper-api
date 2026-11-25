/**
 * Statement metadata (domain model)
 *
 * Abstraction independent of the data source
 */
export interface StatementMetadata {
  minDate: string;
  maxDate: string;
  currencies: Set<string>;
}
