/**
 * Metadane statement (model domenowy)
 *
 * Abstrakcja niezależna od źródła danych
 */
export interface StatementMetadata {
  minDate: string;
  maxDate: string;
  currencies: Set<string>;
}
