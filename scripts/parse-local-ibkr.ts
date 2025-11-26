import { dirname, isAbsolute, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

import {
  mapIBKROpenPositionsToOpenPositions,
  mapIBKRDividendsToDividends,
  mapIBKRInterestsToInterests,
  mapIBKRBorrowsToBorrows,
  mapIBKRTradesToTrades,
  parseIBKRCsv,
} from '../src/ibkr';
import { getExchangeRates } from '../src/shared/api/nbp.api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getFileContent = (filePath: string) => {
  const fullPath = isAbsolute(filePath) ? filePath : join(__dirname, '..', filePath);
  return readFileSync(fullPath, 'utf-8');
};

const main = async () => {
  const file = getFileContent(process.argv[2] || 'example_data/year-2025.csv');

  try {
    const ibkrStatement = await parseIBKRCsv(file);

    // Pobierz kursy NBP z metadanych
    const metadata = ibkrStatement.metadata;
    if (!metadata.minDate || !metadata.maxDate || metadata.currencies.size === 0) {
      throw new Error('Brak metadanych (zakres dat lub waluty) w CSV');
    }

    const exchangeRatesCache = await getExchangeRates(
      metadata.currencies,
      metadata.minDate,
      metadata.maxDate,
      10
    );
    console.log(exchangeRatesCache);

    const dividends = mapIBKRDividendsToDividends(ibkrStatement.dividends, exchangeRatesCache);
    const interests = mapIBKRInterestsToInterests(ibkrStatement.interests, exchangeRatesCache);
    const borrows = mapIBKRBorrowsToBorrows(ibkrStatement.borrows, exchangeRatesCache);
    const trades = mapIBKRTradesToTrades(ibkrStatement.trades, exchangeRatesCache);
    const openPositions = mapIBKROpenPositionsToOpenPositions(
      ibkrStatement.openPositions,
      exchangeRatesCache,
      metadata.maxDate || ''
    );

    console.log(openPositions);



    // const totalRevenue = x.reduce((acc, trade) => acc + (trade?.summary?.revenue ?? 0), 0);
    // const totalCost = x.reduce((acc, trade) => acc + (trade?.summary?.cost ?? 0), 0);
    // const totalIncome = x.reduce((acc, trade) => acc + (trade?.summary?.income ?? 0), 0);
    // console.log(totalRevenue, totalCost, totalIncome);

    // const totalProceeds = x.reduce((acc, trade) => acc + (trade?.proceeds ?? 0), 0);
    // const totalCommissionFee = x.reduce((acc, trade) => acc + (trade?.commissionFee ?? 0), 0);
    // const totalBasis = x.reduce((acc, trade) => acc + (trade?.basis ?? 0), 0);
    // const totalRealizedPL = x.reduce((acc, trade) => acc + (trade?.realizedPL ?? 0), 0);
    // console.log(totalProceeds, totalCommissionFee, totalBasis, totalRealizedPL);

    // console.log(x);
  } catch (error) {
    console.error('❌ Błąd:', error);
    process.exit(1);
  }
};

main();
