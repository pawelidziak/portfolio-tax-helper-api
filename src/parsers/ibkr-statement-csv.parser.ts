/**
 * Parser CSV dla plików IBKR
 *
 * Odpowiedzialność:
 * - Wczytanie i parsowanie pliku CSV
 * - Wyodrębnienie sekcji Trades
 * - Zwrócenie IBKRTradeDTO[] (surowe dane z CSV)
 */

import { parseTradesSection } from './ibkr-trades.parser';
import { CsvSection, IBKRStatement } from '@models';
import { parseCsvLine } from '@utils';

/**
 * Enum dla nazw sekcji CSV
 */
export enum CsvSectionEnum {
  TRADES = 'Trades',
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

  if (!tradesSection) console.error('Nie znaleziono sekcji "Trades" w CSV');

  return {
    trades: tradesSection ? parseTradesSection(tradesSection) : [],
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
