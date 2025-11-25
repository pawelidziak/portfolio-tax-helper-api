/**
 * Model reprezentujący odsetki z sekcji Interest w raporcie IBKR
 *
 * To są CZYSTE dane z CSV, bez żadnego wzbogacenia.
 */

/**
 * Pojedynczy wpis odsetek z raportu IBKR
 * DTO = Data Transfer Object - dane bezpośrednio z parsowania CSV
 */
export interface IBKRInterestDto {
  /** Waluta odsetek: USD, PLN, etc. */
  currency: string;

  /** Data odsetek (Format: "YYYY-MM-DD") */
  date: string;

  /** Opis odsetek (np. "USD Credit Interest for Oct-2025", "USD Debit Interest") */
  description: string;

  /**
   * Kwota odsetek
   * Dodatnia dla credit interest (IBKR płaci)
   * Ujemna dla debit interest (IBKR pobiera - margin interest)
   */
  amount: number;
}
