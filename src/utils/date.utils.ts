/**
 * Wyciąga datę z dateTime (format: "YYYY-MM-DD, HH:MM:SS" -> "YYYY-MM-DD")
 */
export const extractDate = (dateTime: string): string => {
  const datePart = dateTime.split(',')[0]?.trim();
  return datePart;
};

/**
 * Oblicza datę poprzednią (date - 1 dzień)
 *
 * @param date - Data
 * @returns Data poprzednia w formacie YYYY-MM-DD
 */
export const getPreviousDay = (date: string, shift: number = 1): string => {
  const dateWithBuffer = new Date(date);
  dateWithBuffer.setDate(dateWithBuffer.getDate() - shift);
  return dateWithBuffer.toISOString().split('T')[0];
};
