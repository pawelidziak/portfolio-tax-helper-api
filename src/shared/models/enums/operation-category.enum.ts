/**
 * Trade categories (domain model)
 *
 * Used to determine the operation type regardless of the broker.
 * Each broker may have its own category names in the data source,
 * but we map them to this shared enum.
 *
 * ⚠️ EXTENDING:
 * - When adding a new broker with new categories, consider adding them here
 * - If a category is specific to a single broker, use UNKNOWN
 *   and handle it in logic specific to that broker
 * - Examples of future categories: FUTURES, BONDS, CRYPTO, etc.
 */
export enum OperationCategoryEnum {
  DIVIDEND = 'DIVIDEND',
  INTEREST = 'INTEREST',
  DEPOSIT = 'DEPOSIT',
  UNKNOWN = 'UNKNOWN',
  OPTIONS = 'OPTIONS',
  BORROW = 'BORROW',
  STOCKS = 'STOCKS',
  FOREX = 'FOREX',
}
