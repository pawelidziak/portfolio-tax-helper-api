/**
 * CSV parser for IBKR files
 *
 * Responsibilities:
 * - Loading and parsing the CSV file
 * - Extracting the Trades and Deposits & Withdrawals sections
 * - Returning IBKRStatement (raw CSV data)
 */

import { CsvSection } from '@shared/models';
import { parseCsvLine } from '@utils';

import {
  parseOpenPositionsSection,
  parseDividendsSection,
  parseDepositsSection,
  parseInterestSection,
  parseBorrowsSection,
  parseTradesSection,
} from './sections';
import {
  parseAccountInformationSection,
  parseNetAssetValueSection,
  parseStatementMetadata,
} from './metadata';
import { IBKRStatement } from '../models/dto';

/**
 * Enum for row types in the IBKR CSV
 * (not for section names - section names are stored as strings)
 */
export enum CsvSectionEnum {
  HEADER = 'Header',
  DATA = 'Data',
}

/**
 * Parses the IBKR CSV and returns raw data
 * @param input - CSV content (string) or Buffer
 */
export const parseIBKRCsv = async (input: string | Buffer): Promise<IBKRStatement> => {
  // Convert the Buffer to a string or use the string directly
  const fileContent = Buffer.isBuffer(input) ? input.toString('utf-8') : input;

  const sections = parseCsvSections(fileContent);
  const tradesSection = sections.get('Trades');
  const depositsSection = sections.get('Deposits & Withdrawals');
  const interestSection = sections.get('Interest');
  const dividendsSection = sections.get('Dividends');
  const withholdingTaxSection = sections.get('Withholding Tax');
  const borrowFeeDetailsSection = sections.get('Borrow Fee Details');
  const statementSection = sections.get('Statement');
  const cashReportSection = sections.get('Cash Report');
  const accountInformationSection = sections.get('Account Information');
  const netAssetValueSection = sections.get('Net Asset Value');
  const openPositionsSection = sections.get('Open Positions');

  if (!depositsSection) console.error('Nie znaleziono sekcji "Deposits & Withdrawals" w CSV');
  if (!tradesSection) console.error('Nie znaleziono sekcji "Trades" w CSV');

  const accountInformation = parseAccountInformationSection(accountInformationSection);
  // Parse metadata (date range and currencies)
  const metadata = parseStatementMetadata(statementSection, cashReportSection);
  // add the base currency to the currency set (it is in another section)
  metadata.currencies.add(accountInformation?.baseCurrency);

  return {
    deposits: depositsSection ? parseDepositsSection(depositsSection) : [],
    trades: tradesSection ? parseTradesSection(tradesSection) : [],
    interests: interestSection ? parseInterestSection(interestSection) : [],
    dividends: parseDividendsSection(dividendsSection, interestSection, withholdingTaxSection),
    borrows: borrowFeeDetailsSection ? parseBorrowsSection(borrowFeeDetailsSection) : [],
    accountInformation,
    netAssetValue: parseNetAssetValueSection(netAssetValueSection),
    openPositions: openPositionsSection ? parseOpenPositionsSection(openPositionsSection) : [],
    metadata,
  };
};

/**
 * Parses the CSV file into sections (Pure Function)
 *
 * Format IBKR CSV:
 * Section,Header,col1,col2,...
 * Section,Data,val1,val2,...
 *
 * The same section can have multiple headers (e.g. Trades for different categories)
 */
const parseCsvSections = (fileContent: string): Map<string, CsvSection> => {
  const lines = fileContent.split('\n');

  let sections = new Map<string, CsvSection>();
  let currentSection: string | null = null;
  let currentHeaders: string[] = [];
  let currentRows: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    const columns = parseCsvLine(line);
    if (columns.length < 2) continue;

    // New section?
    if (columns[1] === CsvSectionEnum.HEADER) {
      // Save the previous section
      if (currentSection && currentRows.length > 0) {
        sections = addSection(sections, currentSection, currentHeaders, currentRows);
      }

      // Start a new section
      currentSection = columns[0];
      currentHeaders = columns.slice(2);
      currentRows = [];
      continue;
    }

    // Data row?
    if (currentSection && columns[0] === currentSection && columns[1] === CsvSectionEnum.DATA) {
      currentRows.push(columns.slice(2));
    }
  }

  // Save the last section
  if (currentSection && currentRows.length > 0) {
    sections = addSection(sections, currentSection, currentHeaders, currentRows);
  }

  return sections;
};

/**
 * Adds a section to the map (merges with the previous one if it exists) (Pure Function)
 *
 * @returns New map with the added/merged section
 */
const addSection = (
  sections: Map<string, CsvSection>,
  name: string,
  headers: string[],
  rows: string[][]
): Map<string, CsvSection> => {
  const newSections = new Map(sections);
  const existing = newSections.get(name);

  if (existing) {
    // Merge rows with the existing section (immutable)
    newSections.set(name, {
      name,
      headers: existing.headers, // Using the existing headers
      rows: [...existing.rows, ...rows], // New array with the merged rows
    });
  } else {
    // Create a new section
    newSections.set(name, { name, headers, rows });
  }

  return newSections;
};
