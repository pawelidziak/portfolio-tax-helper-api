/**
 * Helper functions for mathematical calculations
 */

/**
 * Rounds a number to the given number of decimal places.
 *
 * @param value - Value to round
 * @param decimals - Number of decimal places (default 2)
 * @returns Rounded value
 *
 * @example
 * roundToDecimals(123.456789, 2) // 123.46
 * roundToDecimals(123.456789, 0) // 123
 * roundToDecimals(123.456789)    // 123.46 (4 places by default)
 */
export const roundToDecimals = (value: number, decimals: number = 6): number => {
  if (!Number.isFinite(value)) {
    return value;
  }
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
};
