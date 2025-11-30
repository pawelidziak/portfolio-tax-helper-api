/**
 * Podsumowanie podatkowe dla okresu
 *
 * Agregacja wyników podatkowych z wielu transakcji w określonym okresie
 * (może być miesiąc, kwartał, rok, lub dowolny inny okres).
 * Zawiera sumy przychodów, kosztów, dochodów oraz obliczony finalny podatek.
 */
export interface PeriodTaxSummary {
  /** Suma wszystkich przychodów w PLN */
  totalRevenue: number;
  /** Suma wszystkich kosztów w PLN */
  totalCost: number;
  /** Suma wszystkich dochodów w PLN (może być ujemny - strata) */
  totalIncome: number;
  /** Suma podatków u źródła w PLN (tylko dla dywidend) */
  totalWithholdingTaxPLN: number;
  /** Stawka podatkowa (zawsze 19% dla zysków kapitałowych w PL) */
  taxRate: number;
  /** Podatek do zapłacenia w PLN (po odliczeniu strat i podatku u źródła) */
  taxAmount: number;
  /** Dochód podlegający opodatkowaniu (max(0, totalIncome)) */
  taxableIncome: number;
}
