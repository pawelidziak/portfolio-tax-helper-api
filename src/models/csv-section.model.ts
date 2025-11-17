/**
 * Model reprezentujący sekcję w pliku CSV IBKR
 */

/**
 * Generyczna sekcja CSV
 */
export type CsvSection = {
  /** Nazwa sekcji (np. "Trades", "Deposits & Withdrawals") */
  name: string;

  /** Nagłówki kolumn */
  headers: string[];

  /** Wiersze danych jako tablica wartości */
  rows: string[][];
};

/**
 * Metadane sekcji - informacje o strukturze
 */
export type CsvSectionMetadata = {
  name: string;
  startLine: number;
  endLine: number;
  headerLine: number;
  dataLinesCount: number;
};
