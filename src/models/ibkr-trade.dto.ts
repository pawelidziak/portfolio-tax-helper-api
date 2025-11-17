/**
 * Model reprezentujący transakcję z sekcji Trades w raporcie IBKR
 *
 * Dokumentacja: https://www.ibkrguides.com/reportingreference/reportguide/trades_default.htm
 *
 * To są CZYSTE dane z CSV, bez żadnego wzbogacenia.
 */

/**
 * Pojedyncza transakcja z raportu IBKR (surowe dane z CSV)
 * DTO = Data Transfer Object - dane bezpośrednio z parsowania CSV
 */
export type IBKRTradeDto = {
  /** Typ rekordu: Order (transakcja), SubTotal (podsumowanie), Total (suma) */
  dataDiscriminator: string;

  /** Kategoria aktywów (surowa wartość z IBKR: "Stocks", "Equity and Index Options", "Forex") */
  assetCategory: string;

  /** Waluta transakcji: USD, PLN, etc. */
  currency: string;

  /** Symbol instrumentu, który został przedmiotem transakcji */
  symbol: string;

  /** Data i czas wykonania transakcji (Format: "YYYY-MM-DD, HH:MM:SS") */
  dateTime: string;

  /**
   * Liczba jednostek w transakcji.
   * Wartości ujemne oznaczają sprzedaż, dodatnie - zakup.
   */
  quantity: number;

  /**
   * T. Price - Cena transakcji (transaction price)
   * Cena po której została wykonana transakcja.
   */
  tradePrice: number;

  /**
   * C. Price - Cena zamknięcia instrumentu (closing price)
   * Cena zamknięcia instrumentu w dniu transakcji.
   */
  closingPrice: number;

  /**
   * Proceeds - Przychód z transakcji
   * Obliczany jako ilość * cena transakcji.
   * Wartość ujemna dla zakupów, dodatnia dla sprzedaży.
   */
  proceeds: number;

  /**
   * Comm/Fee - Prowizja i opłaty
   * Całkowita kwota prowizji i opłat za transakcję.
   * Dla celów podstawy kosztowej i zrealizowanego zysku/straty, prowizje są netto.
   */
  commissionFee: number;

  /**
   * Basis - Podstawa kosztowa
   * Dla transakcji otwierającej: odwrotność proceeds + prowizja + kwota podatku.
   * Dla transakcji zamykającej: podstawa kosztowa z transakcji otwierającej.
   */
  basis: number;

  /**
   * Realized P/L - Zrealizowany zysk/strata
   * Obliczany jako: proceeds transakcji zamykającej + prowizje + basis.
   *
   * Uwaga: Gdy pozycja opcji jest przypisana lub wykonana, zrealizowany P/L
   * nie jest obliczany dla samej pozycji opcji. Zamiast tego, premia otrzymana/zapłacona
   * przy pierwotnej sprzedaży/zakupie opcji jest uwzględniana w P/L zrealizowanym,
   * gdy pozycja akcji wynikająca z przypisania/wykonania opcji jest zamykana.
   */
  realizedPL: number;

  /**
   * MTM P/L - Mark-to-Market zysk/strata
   * Różnica między ceną transakcji a ceną zamknięcia pomnożona przez ilość.
   * Dla MTM P/L prowizje nie są netto i są uwzględniane jako osobna linia
   * w podsumowaniu wydajności MTM powyżej.
   */
  mtmPL: number;

  /**
   * Code - Kod skrótu transakcji
   * Kody opisujące typ transakcji (np. "A;O" - Assignment/Opening,
   * "C" - Closing, "C;P" - Closing/Partial, "O" - Opening, "C;Ep" - Closing/Expired)
   * Pełna lista kodów znajduje się w sekcji Codes raportu.
   */
  code?: string;
};
