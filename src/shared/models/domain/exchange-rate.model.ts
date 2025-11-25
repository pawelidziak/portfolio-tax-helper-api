/**
 * Kurs wymiany dla transakcji
 */
export interface ExchangeRate {
  /**
   * NBP Date - Data kursu NBP dla transakcji
   * Data kursu NBP z DNIA POPRZEDNIEGO względem daty transakcji.
   */
  date?: string;

  /**
   * NBP Exchange Rate - Kurs NBP z dnia poprzedniego
   * Kurs NBP z dnia poprzedniego względem daty transakcji.
   * Używany do przeliczenia przychodów i kosztów na PLN.
   */
  rate?: number;
}
