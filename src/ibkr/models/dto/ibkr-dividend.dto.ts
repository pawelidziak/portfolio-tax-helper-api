/**
 * Model reprezentujący dywidendy z sekcji Interest i Withholding Tax w raporcie IBKR
 *
 * To są CZYSTE dane z CSV, bez żadnego wzbogacenia.
 */

/**
 * Pojedyncza dywidenda z raportu IBKR
 * DTO = Data Transfer Object - dane bezpośrednio z parsowania CSV
 *
 * Dywidendy mogą być w sekcji "Interest" (kwota brutto) i "Withholding Tax" (podatek u źródła).
 * Te dwa wpisy muszą być połączone w jeden rekord dywidendy.
 */
export interface IBKRDividendDto {
  /** Waluta dywidendy: USD, PLN, etc. */
  currency: string;

  /** Data dywidendy (Format: "YYYY-MM-DD") */
  date: string;

  /** Symbol instrumentu (ticker) */
  symbol: string;

  /**
   * Kwota brutto dywidendy (przed podatkiem u źródła)
   * Z sekcji "Interest" - zawsze dodatnia
   */
  grossAmount: number;

  /**
   * Podatek u źródła (withholding tax)
   * Z sekcji "Withholding Tax" - zawsze ujemna (bo to koszt)
   * Może być 0 jeśli nie ma podatku
   */
  withholdingTaxAmount: number;

  /**
   * Kwota netto dywidendy (po podatku u źródła)
   * Obliczana jako: grossAmount + withholdingTaxAmount
   * (withholdingTaxAmount jest ujemne, więc to jest odejmowanie)
   */
  netAmount: number;
}
