/**
 * Model reprezentujący sekcję w pliku CSV IBKR
 */

/**
 * Generyczna sekcja CSV
 */
export interface CsvSection {
  /** Nazwa sekcji (np. "Trades", "Deposits & Withdrawals") */
  name: string;

  /** Nagłówki kolumn */
  headers: string[];

  /** Wiersze danych jako tablica wartości */
  rows: string[][];
}

/**
 * Metadane sekcji - informacje o strukturze
 */
export interface CsvSectionMetadata {
  name: string;
  startLine: number;
  endLine: number;
  headerLine: number;
  dataLinesCount: number;
}
