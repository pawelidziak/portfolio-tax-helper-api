/**
 * Podsumowanie podatkowe transakcji
 *
 * Zawiera obliczone wartości: przychód, koszt, dochód
 * Kurs wymiany jest w osobnym polu Record.exchangeRate
 */
export interface TaxSummary {
  /**
   * Revenue - Przychód z transakcji w PLN
   * Dodawane przez mapper.
   * Pieniądze, które wpływają do Ciebie w wyniku transakcji
   * (sprzedaż akcji, premia z opcji, otwarcie shorta).
   * Obliczone jako: proceeds × nbpRate (gdy proceeds > 0)
   */
  revenue?: number;

  /**
   * Cost - Koszt transakcji w PLN
   * Dodawane przez mapper.
   * Pieniądze, które wypływają od Ciebie, żeby ten przychód w ogóle mógł powstać
   * (kupno akcji, odkupienie shorta, zapłacona premia, prowizje).
   * Obliczone jako: -proceeds × nbpRate (gdy proceeds < 0) + commissionFee × nbpRate
   */
  cost?: number;

  /**
   * Income - Dochód z transakcji w PLN
   * Dodawane przez mapper.
   * Twój wynik podatkowy z inwestycji.
   * Obliczone jako: revenue - cost
   */
  income?: number;
}
