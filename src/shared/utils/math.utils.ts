/**
 * Funkcje pomocnicze do obliczeń matematycznych
 */

/**
 * Zaokrągla liczbę do określonej liczby miejsc po przecinku.
 *
 * @param value - Wartość do zaokrąglenia
 * @param decimals - Liczba miejsc po przecinku (domyślnie 2)
 * @returns Zaokrąglona wartość
 *
 * @example
 * roundToDecimals(123.456789, 2) // 123.46
 * roundToDecimals(123.456789, 0) // 123
 * roundToDecimals(123.456789)    // 123.46 (domyślnie 4 miejsca)
 */
export const roundToDecimals = (value: number, decimals: number = 6): number => {
  if (!Number.isFinite(value)) {
    return value;
  }
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
};
