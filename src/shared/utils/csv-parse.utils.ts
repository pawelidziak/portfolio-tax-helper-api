/**
 * Helper functions for working with CSV
 */

/**
 * Parses a CSV line, handling quoted values
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
 * Parses a numeric value from CSV, handling comma-formatted and empty values
 */
export const parseNumber = (value: string): undefined | number => {
  if (!value || value.trim() === '' || value === '--') {
    return undefined;
  }
  const cleaned = value.replace(/^"|"$/g, '').replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? undefined : parsed;
};

/**
 * Removes quotes from the start and end of the text
 */
export const removeQuotes = (value: string): string => {
  return value.replace(/^"|"$/g, '');
};

/**
 * Parses a date and time from the "YYYY-MM-DD, HH:MM:SS" format
 * (removes quotes only, returns the whole string)
 */
export const parseDateTime = (dateTimeStr: string): undefined | string => {
  if (!dateTimeStr || dateTimeStr.trim() === '') {
    return undefined;
  }
  return removeQuotes(dateTimeStr.trim());
};

/**
 * Creates a column -> value map
 */
export const createDataMap = (headers: string[], rowData: string[]): Map<string, string> => {
  const map = new Map<string, string>();
  for (let i = 0; i < headers.length; i++) {
    map.set(headers[i], rowData[i] || '');
  }
  return map;
};

/**
 * Gets a value from the map (supports alternative column names)
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
