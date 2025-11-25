/**
 * Model reprezentujący opłaty za pożyczkę akcji (Borrow Fee) z sekcji Borrow Fee Details w raporcie IBKR
 *
 * To są CZYSTE dane z CSV, bez żadnego wzbogacenia.
 */

/**
 * Pojedyncza opłata za pożyczkę akcji z raportu IBKR
 * DTO = Data Transfer Object - dane bezpośrednio z parsowania CSV
 */
export interface IBKRBorrowDto {
  /** Waluta opłaty: USD, PLN, etc. */
  currency: string;

  /** Data wartości (Value Date) - Format: "YYYY-MM-DD" */
  valueDate: string;

  /** Symbol instrumentu (np. "QQQ") */
  symbol: string;

  /** Ilość pożyczonych akcji */
  quantity: number;

  /** Cena akcji */
  price: number;

  /** Wartość zabezpieczenia (collateral value) */
  value: number;

  /** Stawka opłaty w % rocznie */
  feeRate: number;

  /**
   * Opłata za pożyczkę (Borrow Fee)
   * Zawsze ujemna (koszt dla pożyczkobiorcy)
   */
  borrowFee: number;

  /** Kod transakcji (np. "Po") */
  code: string;
}
