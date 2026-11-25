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
 * Statement Response DTO - API response
 *
 * This is the DTO returned by the API endpoint.
 * Contains data enriched with exchange rates and tax summaries.
 *
 * Uses domain models that are independent of the data source (IBKR, another broker, etc.)
 *
 * **Data structure:**
 * - Operations are returned in separate arrays grouped by type (trades, dividends, interests, borrows, deposits)
 * - The frontend should merge and sort this data locally according to UI needs
 * - Each operation type has its own date field:
 *   - Trade: `dateTime` (format: "YYYY-MM-DD, HH:MM:SS")
 *   - Dividend: `date` (format: "YYYY-MM-DD")
 *   - Interest: `date` (format: "YYYY-MM-DD")
 *   - Borrow: `valueDate` (format: "YYYY-MM-DD")
 *   - Deposit: `settleDate` (format: "YYYY-MM-DD")
 *
 * **Usage example on the FE:**
 * ```typescript
 * const allOperations = [...trades, ...dividends, ...interests, ...borrows, ...deposits]
 *   .sort((a, b) => {
 *     const dateA = getOperationDate(a); // helper function
 *     const dateB = getOperationDate(b);
 *     return dateB.getTime() - dateA.getTime(); // sort descending
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
