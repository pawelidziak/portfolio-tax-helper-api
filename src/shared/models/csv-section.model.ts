/**
 * Model representing a section in an IBKR CSV file
 */

/**
 * Generic CSV section
 */
export interface CsvSection {
  /** Section name (e.g. "Trades", "Deposits & Withdrawals") */
  name: string;

  /** Column headers */
  headers: string[];

  /** Data rows as an array of values */
  rows: string[][];
}

/**
 * Section metadata - structure information
 */
export interface CsvSectionMetadata {
  name: string;
  startLine: number;
  endLine: number;
  headerLine: number;
  dataLinesCount: number;
}
