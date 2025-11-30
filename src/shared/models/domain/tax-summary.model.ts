/**
 * Podsumowanie podatkowe transakcji
 *
 * Zawiera obliczone wartości: przychód, koszt, dochód oraz informacje o podatku
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
   * Twój wynik podatkowy z inwestycji (może być dodatni - zysk, lub ujemny - strata).
   * Obliczone jako: revenue - cost
   *
   * Uwaga: Strata (ujemny income) może być odliczona od zysków kapitałowych.
   * Podatek obliczamy dopiero po agregacji wszystkich transakcji.
   */
  income?: number;

  /**
   * Withholding Tax PLN - Podatek u źródła zapłacony za granicą (w PLN)
   * Tylko dla dywidend z podatkiem u źródła (np. US 15%)
   * Wartość ujemna (spójność z IBKR, gdzie withholdingTaxAmount jest ujemny)
   * Może być odliczony od polskiego podatku zgodnie z umową o unikaniu podwójnego opodatkowania
   * W agregacji: dodajemy ujemną wartość do podatku, co jest równoważne odjęciu dodatniej
   */
  withholdingTaxPLN?: number;
}
