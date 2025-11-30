import {
  AccountInformation,
  StatementMetadata,
  PeriodTaxSummary,
  NetAssetValue,
  OpenPosition,
  Interest,
  Dividend,
  Deposit,
  Borrow,
  Trade,
} from '../domain';

/**
 * Statement Response DTO - odpowiedź API
 *
 * To jest DTO zwracane przez endpoint API.
 * Zawiera dane wzbogacone o kursy wymiany i podsumowania podatkowe.
 *
 * Używa modeli domenowych, które są niezależne od źródła danych (IBKR, inny broker, etc.)
 *
 * **Struktura danych:**
 * - Operacje są zwracane w osobnych tablicach pogrupowanych per typ (trades, dividends, interests, borrows, deposits)
 * - Frontend powinien łączyć i sortować te dane lokalnie według potrzeb UI
 * - Każdy typ operacji ma swoje pole daty:
 *   - Trade: `dateTime` (format: "YYYY-MM-DD, HH:MM:SS")
 *   - Dividend: `date` (format: "YYYY-MM-DD")
 *   - Interest: `date` (format: "YYYY-MM-DD")
 *   - Borrow: `valueDate` (format: "YYYY-MM-DD")
 *   - Deposit: `settleDate` (format: "YYYY-MM-DD")
 *
 * **Przykład użycia na FE:**
 * ```typescript
 * const allOperations = [...trades, ...dividends, ...interests, ...borrows, ...deposits]
 *   .sort((a, b) => {
 *     const dateA = getOperationDate(a); // helper function
 *     const dateB = getOperationDate(b);
 *     return dateB.getTime() - dateA.getTime(); // sortowanie malejąco
 *   });
 * ```
 */
export interface StatementResponseDto {
  accountInformation: AccountInformation;
  periodTaxSummary: PeriodTaxSummary;
  openPositions: OpenPosition[];
  netAssetValue: NetAssetValue;
  metadata: StatementMetadata;
  interests: Interest[];
  dividends: Dividend[];
  generateDate: string;
  deposits: Deposit[];
  borrows: Borrow[];
  trades: Trade[];
}
