import { Interest } from './interest.model';
import { Dividend } from './dividend.model';
import { Deposit } from './deposit.model';
import { Borrow } from './borrow.model';
import { Trade } from './trade.model';

/**
 * Union type representing all possible portfolio operations
 *
 * Used on the frontend to handle different operation types in one place.
 * Each operation has a `category: OperationCategoryEnum` field that allows
 * identifying the operation type and rendering/filtering accordingly.
 *
 * **Usage example on the FE:**
 * ```typescript
 * const operations: OperationItem[] = [...trades, ...dividends, ...interests, ...borrows, ...deposits];
 *
 * // Filtering by category
 * const tradesOnly = operations.filter(op => op.category === OperationCategoryEnum.STOCKS);
 *
 * // Type narrowing
 * if (operation.category === OperationCategoryEnum.DIVIDEND) {
 *   // TypeScript knows this is a Dividend
 *   console.log(operation.netAmount);
 * }
 * ```
 */
export type OperationItem = Dividend | Interest | Deposit | Borrow | Trade;
