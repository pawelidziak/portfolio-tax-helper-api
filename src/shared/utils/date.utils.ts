/**
 * Extracts the date from dateTime (format: "YYYY-MM-DD, HH:MM:SS" -> "YYYY-MM-DD")
 */
export const extractDate = (dateTime: string): string => {
  const datePart = dateTime.split(',')[0]?.trim();
  return datePart;
};

/**
 * Calculates the previous date (date - 1 day)
 *
 * @param date - Date in YYYY-MM-DD or YYYY-MM-DD, HH:MM:SS format
 * @param shift - Number of days to go back (default 1)
 * @returns Previous date in YYYY-MM-DD format
 * @throws Error if the date is invalid
 */
export const getPreviousDay = (date: string, shift: number = 1): string => {
  if (!date || date.trim() === '') {
    throw new Error('Date must not be empty');
  }

  // Extract only the date part (YYYY-MM-DD) if the format includes time
  const datePart = date.split(',')[0]?.trim();
  if (!datePart) {
    throw new Error(`Invalid date format: ${date}`);
  }

  const dateWithBuffer = new Date(datePart);
  if (isNaN(dateWithBuffer.getTime())) {
    throw new Error(`Invalid date: ${datePart}`);
  }

  dateWithBuffer.setDate(dateWithBuffer.getDate() - shift);
  return dateWithBuffer.toISOString().split('T')[0];
};
