/**
 * Net Asset Value Item (model domenowy)
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
 * Net Asset Value (model domenowy)
 *
 * Abstrakcja niezależna od źródła danych
 */
export interface NetAssetValue {
  items: NetAssetValueItem[];
  timeWeightedRateOfReturn?: string;
}
