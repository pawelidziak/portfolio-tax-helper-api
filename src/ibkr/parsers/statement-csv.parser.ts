/**
 * Parser CSV dla plików IBKR
 *
 * Odpowiedzialność:
 * - Wczytanie i parsowanie pliku CSV
 * - Wyodrębnienie sekcji Trades i Deposits & Withdrawals
 * - Zwrócenie IBKRStatement (surowe dane z CSV)
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
 * Enum dla typów wierszy w CSV IBKR
 * (nie dla nazw sekcji - nazwy sekcji są przechowywane jako stringi)
 */
export enum CsvSectionEnum {
  HEADER = 'Header',
  DATA = 'Data',
}

/**
 * Parsuje CSV IBKR i zwraca surowe dane
 * @param input - Zawartość CSV (string) lub Buffer
 */
export const parseIBKRCsv = async (input: string | Buffer): Promise<IBKRStatement> => {
  // Konwertuj Buffer na string lub użyj stringa bezpośrednio
  const fileContent = Buffer.isBuffer(input) ? input.toString('utf-8') : input;

  const sections = parseCsvSections(fileContent);
  const tradesSection = sections.get('Trades');
  const depositsSection = sections.get('Deposits & Withdrawals');
  const interestSection = sections.get('Interest');
  const withholdingTaxSection = sections.get('Withholding Tax');
  const borrowFeeDetailsSection = sections.get('Borrow Fee Details');
  const statementSection = sections.get('Statement');
  const cashReportSection = sections.get('Cash Report');
  const accountInformationSection = sections.get('Account Information');
  const netAssetValueSection = sections.get('Net Asset Value');
  const openPositionsSection = sections.get('Open Positions');

  if (!depositsSection) console.error('Nie znaleziono sekcji "Deposits & Withdrawals" w CSV');
  if (!tradesSection) console.error('Nie znaleziono sekcji "Trades" w CSV');

  // Parsuj metadane (zakres dat i waluty)
  const metadata = parseStatementMetadata(statementSection, cashReportSection);

  return {
    deposits: depositsSection ? parseDepositsSection(depositsSection) : [],
    trades: tradesSection ? parseTradesSection(tradesSection) : [],
    interests: interestSection ? parseInterestSection(interestSection) : [],
    dividends: parseDividendsSection(interestSection, withholdingTaxSection),
    borrows: borrowFeeDetailsSection ? parseBorrowsSection(borrowFeeDetailsSection) : [],
    accountInformation: parseAccountInformationSection(accountInformationSection),
    netAssetValue: parseNetAssetValueSection(netAssetValueSection),
    openPositions: openPositionsSection ? parseOpenPositionsSection(openPositionsSection) : [],
    metadata,
  };
};

/**
 * Parsuje plik CSV na sekcje (Pure Function)
 *
 * Format IBKR CSV:
 * Section,Header,col1,col2,...
 * Section,Data,val1,val2,...
 *
 * Ta sama sekcja może mieć wiele nagłówków (np. Trades dla różnych kategorii)
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

    // Nowa sekcja?
    if (columns[1] === CsvSectionEnum.HEADER) {
      // Zapisz poprzednią sekcję
      if (currentSection && currentRows.length > 0) {
        sections = addSection(sections, currentSection, currentHeaders, currentRows);
      }

      // Rozpocznij nową sekcję
      currentSection = columns[0];
      currentHeaders = columns.slice(2);
      currentRows = [];
      continue;
    }

    // Wiersz danych?
    if (currentSection && columns[0] === currentSection && columns[1] === CsvSectionEnum.DATA) {
      currentRows.push(columns.slice(2));
    }
  }

  // Zapisz ostatnią sekcję
  if (currentSection && currentRows.length > 0) {
    sections = addSection(sections, currentSection, currentHeaders, currentRows);
  }

  return sections;
};

/**
 * Dodaje sekcję do mapy (łączy z poprzednią jeśli istnieje) (Pure Function)
 *
 * @returns Nowa mapa z dodaną/połączoną sekcją
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
    // Połącz wiersze z istniejącą sekcją (immutable)
    newSections.set(name, {
      name,
      headers: existing.headers, // Używamy istniejących nagłówków
      rows: [...existing.rows, ...rows], // Nowa tablica z połączonymi wierszami
    });
  } else {
    // Utwórz nową sekcję
    newSections.set(name, { name, headers, rows });
  }

  return newSections;
};
