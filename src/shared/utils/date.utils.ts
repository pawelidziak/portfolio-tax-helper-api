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
 * @param date - Data w formacie YYYY-MM-DD lub YYYY-MM-DD, HH:MM:SS
 * @param shift - Liczba dni do cofnięcia (domyślnie 1)
 * @returns Data poprzednia w formacie YYYY-MM-DD
 * @throws Error jeśli data jest nieprawidłowa
 */
export const getPreviousDay = (date: string, shift: number = 1): string => {
  if (!date || date.trim() === '') {
    throw new Error('Data nie może być pusta');
  }

  // Wyciągnij tylko część daty (YYYY-MM-DD) jeśli jest format z czasem
  const datePart = date.split(',')[0]?.trim();
  if (!datePart) {
    throw new Error(`Nieprawidłowy format daty: ${date}`);
  }

  const dateWithBuffer = new Date(datePart);
  if (isNaN(dateWithBuffer.getTime())) {
    throw new Error(`Nieprawidłowa data: ${datePart}`);
  }

  dateWithBuffer.setDate(dateWithBuffer.getDate() - shift);
  return dateWithBuffer.toISOString().split('T')[0];
};
