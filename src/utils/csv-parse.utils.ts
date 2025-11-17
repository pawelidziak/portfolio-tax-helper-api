/**
 * Pomocnicze funkcje do pracy z CSV
 */

/**
 * Parsuje linię CSV, obsługując wartości w cudzysłowach
 */
export const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
};

/**
 * Parsuje wartość liczbową z CSV, obsługując formaty z przecinkami i pustymi wartościami
 */
export const parseNumber = (value: string): number | undefined => {
  if (!value || value.trim() === '' || value === '--') {
    return undefined;
  }
  const cleaned = value.replace(/^"|"$/g, '').replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? undefined : parsed;
};

/**
 * Usuwa cudzysłowy z początku i końca tekstu
 */
export const removeQuotes = (value: string): string => {
  return value.replace(/^"|"$/g, '');
};

/**
 * Parsuje datę i czas z formatu "YYYY-MM-DD, HH:MM:SS"
 * (usuwa tylko cudzysłowy, zwraca cały string)
 */
export const parseDateTime = (dateTimeStr: string): string | undefined => {
  if (!dateTimeStr || dateTimeStr.trim() === '') {
    return undefined;
  }
  return removeQuotes(dateTimeStr.trim());
};

/**
 * Tworzy mapę kolumna -> wartość
 */
export const createDataMap = (headers: string[], rowData: string[]): Map<string, string> => {
  const map = new Map<string, string>();
  for (let i = 0; i < headers.length; i++) {
    map.set(headers[i], rowData[i] || '');
  }
  return map;
};

/**
 * Pobiera wartość z mapy (obsługuje alternatywne nazwy kolumn)
 */
export const getValue = (
  map: Map<string, string>,
  primary: string,
  alternative?: string
): string => {
  const value = map.get(primary);
  if (value !== undefined) return value;
  if (alternative) return map.get(alternative) || '';
  return '';
};
