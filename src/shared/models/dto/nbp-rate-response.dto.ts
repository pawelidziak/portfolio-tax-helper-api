/**
 * DTO odpowiedzi z API NBP
 * Reprezentuje strukturę danych otrzymanych z zewnętrznego API NBP
 */
export interface NBPRateResponseDto {
  table: string;
  currency: string;
  code: string;
  rates: {
    effectiveDate: string;
    mid: number;
    no: string;
  }[];
}
