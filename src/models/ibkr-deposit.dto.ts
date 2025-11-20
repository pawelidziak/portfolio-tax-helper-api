/**
 * Model reprezentujący depozyt/wypłatę z sekcji Deposits & Withdrawals w raporcie IBKR
 *
 * To są CZYSTE dane z CSV, bez żadnego wzbogacenia.
 */

/**
 * Pojedynczy depozyt/wypłata z raportu IBKR (surowe dane z CSV)
 * DTO = Data Transfer Object - dane bezpośrednio z parsowania CSV
 */
export type IBKRDepositDto = {
  /** Waluta depozytu/wypłaty: USD, PLN, etc. */
  currency: string;

  /** Data rozliczenia (Settle Date) w formacie YYYY-MM-DD */
  settleDate: string;

  /** Opis transakcji (np. "Electronic Fund Transfer") */
  description: string;

  /**
   * Kwota depozytu/wypłaty
   * Wartości dodatnie oznaczają depozyty, ujemne - wypłaty.
   */
  amount: number;
};

