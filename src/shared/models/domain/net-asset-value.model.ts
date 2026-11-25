/**
 * Net Asset Value Item (domain model)
 */
export interface NetAssetValueItem {
  assetClass: string;
  priorTotal: number;
  currentLong: number;
  currentShort: number;
  currentTotal: number;
  change: number;
}

/**
 * Net Asset Value (domain model)
 *
 * Abstraction independent of the data source
 */
export interface NetAssetValue {
  items: NetAssetValueItem[];
  timeWeightedRateOfReturn?: string;
}
