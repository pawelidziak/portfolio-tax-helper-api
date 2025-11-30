import { Interest } from './interest.model';
import { Dividend } from './dividend.model';
import { Deposit } from './deposit.model';
import { Borrow } from './borrow.model';
import { Trade } from './trade.model';

/**
 * Union type reprezentujący wszystkie możliwe operacje portfelowe
 *
 * Używany na frontendzie do obsługi różnych typów operacji w jednym miejscu.
 * Każda operacja ma pole `category: OperationCategoryEnum`, które pozwala
 * na identyfikację typu operacji i odpowiednie renderowanie/filtrowanie.
 *
 * **Przykład użycia na FE:**
 * ```typescript
 * const operations: OperationItem[] = [...trades, ...dividends, ...interests, ...borrows, ...deposits];
 *
 * // Filtrowanie po kategorii
 * const tradesOnly = operations.filter(op => op.category === OperationCategoryEnum.STOCKS);
 *
 * // Type narrowing
 * if (operation.category === OperationCategoryEnum.DIVIDEND) {
 *   // TypeScript wie, że to Dividend
 *   console.log(operation.netAmount);
 * }
 * ```
 */
export type OperationItem = Dividend | Interest | Deposit | Borrow | Trade;
