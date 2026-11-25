/**
 * DTO odpowiedzi z API NBP
 * Represents the data structure received from the external NBP API
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
