/**
 * Parser dla sekcji Interest
 *
 * Odpowiedzialność:
 * - Konwersja CsvSection na IBKRInterestDto[]
 * - Mapowanie kolumn
 * - Filtrowanie tylko Data (pomijamy Total z CSV)
 *
 * === OBSŁUGIWANE WPISY ===
 * - Credit Interest (odsetki od wolnej gotówki - IBKR płaci) - amount > 0
 * - Debit Interest (odsetki od marży/kredytu - IBKR pobiera) - amount < 0
 *
 * === UWAGA ===
 * "Borrow Fee" jest w osobnej sekcji "Borrow Fee Details" i wymaga osobnego parsera.
 * Borrow Fee powinien być traktowany jako koszt (ujemne odsetki).
 */

import { createDataMap, removeQuotes, parseNumber, getValue } from '@utils';
import { CsvSection } from '@shared/models';

import { IBKRInterestDto } from '../../models/dto';

/**
 * Nazwy kolumn w sekcji Interest pliku CSV IBKR
 */
enum CsvColumnNames {
  DESCRIPTION = 'Description',
  CURRENCY = 'Currency',
  AMOUNT = 'Amount',
  DATE = 'Date',
}

/**
 * Parsuje sekcję Interest na IBKRInterestDto[]
 */
export const parseInterestSection = (section: CsvSection): IBKRInterestDto[] => {
  const interests: IBKRInterestDto[] = [];

  for (const rowData of section.rows) {
    const interest = parseInterestRow(section.headers, rowData);
    if (interest) interests.push(interest);
  }

  return interests;
};

/**
 * Parsuje pojedynczy wiersz na IBKRInterestDto
 * (pomijamy Total z CSV)
 */
const parseInterestRow = (headers: string[], rowData: string[]): IBKRInterestDto | null => {
  const dataMap = createDataMap(headers, rowData);

  // Sprawdź czy to nie Total - Total może mieć "Total" w kolumnie Currency lub pustą walutę
  const currency = getValue(dataMap, CsvColumnNames.CURRENCY);
  const currencyTrimmed = currency ? currency.trim() : '';
  if (!currencyTrimmed || currencyTrimmed.toLowerCase() === 'total') {
    return null; // Pomijamy wiersze Total
  }

  const amount = parseNumber(getValue(dataMap, CsvColumnNames.AMOUNT));
  if (amount === null || amount === undefined) return null;

  // Walidacja daty - bez daty nie możemy znaleźć kursu NBP
  const date = getValue(dataMap, CsvColumnNames.DATE);
  if (!date || date.trim() === '') {
    return null; // Pomijamy wpisy bez daty
  }

  return {
    currency: removeQuotes(currencyTrimmed),
    date: date.trim(),
    description: removeQuotes(getValue(dataMap, CsvColumnNames.DESCRIPTION) || ''),
    amount,
  };
};
