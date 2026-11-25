import { dirname, isAbsolute, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from 'fs';

import { parseIBKRCsv } from '../src/ibkr';
import { IBKRTradeDto } from '../src/ibkr/models/dto';
import { getExchangeRates, findNBPRate, ExchangeRatesCache } from '../src/shared/api/nbp.api';
import { getPreviousDay, extractDate } from '../src/shared/utils/date.utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const lots = new Map<string, number>();
/**
 * Reads the file content (supports relative and absolute paths)
 */
const getFileContent = (filePath: string) => {
  const fullPath = isAbsolute(filePath) ? filePath : join(__dirname, '..', filePath);
  return readFileSync(fullPath, 'utf-8');
};

/**
 * Converts a date from the IBKR format ("YYYY-MM-DD, HH:MM:SS") to the Myfund format ("YYYY-MM-DD HH:MM:SS")
 */
const formatDate = (dateTime: string) => dateTime.replace(',', '');

/**
 * Maps an IBKR asset category to an internal category
 */
const getCategory = (assetCategory: string) => {
  if (assetCategory === 'Stocks') return 'STOCKS';
  if (assetCategory === 'Equity and Index Options') return 'OPTIONS';
  if (assetCategory === 'Forex') return 'FOREX';
  return 'UNKNOWN';
};

/**
 * Determines the trade type based on quantity and code
 * For STOCKS it recognizes short positions (Krótka Sprzedaż, Krótka Kupno)
 */
const getTradeType = (trade: IBKRTradeDto): string => {
  const category = getCategory(trade.assetCategory);
  const isBuy = trade.quantity > 0;

  const beforeQty = lots.get(trade.symbol) || 0;
  const afterQty = beforeQty + trade.quantity;
  lots.set(trade.symbol, afterQty);
  
  if (category === 'STOCKS') {
    // closing a short
    if (beforeQty < 0 && afterQty === 0) {
      return 'Krótka kupno';
    }
    // closing a long
    if (beforeQty > 0 && afterQty === 0) {
      return 'Sprzedaż';
    }

    // short
    const isShort = afterQty < 0;
    if (isShort) {
      return isBuy ? 'Krótka kupno' : 'Krótka sprzedaż';
    }
    // long
    return isBuy ? 'Kupno' : 'Sprzedaż';
  }
  
  if (category === 'OPTIONS') {
    return isBuy ? 'Kupno Opcji' : 'Sprzedaż Opcji';
  }
  
  return isBuy ? 'Kupno' : 'Sprzedaż';
};

/**
 * Formats the trade price with its currency
 * For options multiplies the price by 100 (premium in USD per contract)
 */
const getPrice = (trade: IBKRTradeDto) => {
  // const price = getCategory(trade.assetCategory) === 'OPTIONS' 
  //   ? trade.tradePrice * 100 
  //   : trade.tradePrice;
  const price = trade.tradePrice;
  return `${price} [${trade.currency}]`;
};

/** Mapping of month names to numbers (IBKR format) */
const monthMap: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

/**
 * Converts an option symbol from the IBKR format to the Myfund format
 * Input format: "QQQ 04NOV25 618 P" -> Output format: "QQQ251104P00618000"
 * Structure: {SYMBOL}{YYMMDD}{P/C}{8-digit strike}
 */
const convertOptionSymbol = (symbol: string): string => {
  const clean = symbol.trim().replace(/\s+/g, '');
  const match = clean.match(/^([A-Z]+)(\d{2})([A-Z]{3})(\d{2})([\d.]+)([PC])$/i);
  
  if (!match) {
    console.warn(`⚠️  Cannot parse option symbol: ${symbol}`);
    return clean;
  }
  
  const [, base, day, month, year, strike, putCall] = match;
  const monthNum = monthMap[month.toUpperCase()];
  
  if (!monthNum) {
    console.warn(`⚠️  Unknown month in symbol: ${symbol}`);
    return clean;
  }
  
  const dateStr = `${year}${monthNum}${day}`;
  const strikeStr = Math.round(parseFloat(strike) * 1000).toString().padStart(8, '0');
  
  return `${base}${dateStr}${putCall.toUpperCase()}${strikeStr}`;
};

/**
 * Converts the year in an option symbol from 2-digit (yy) to 4-digit (YYYY) format
 * Input format: "QQQ 04NOV25 618 P" -> Output format: "QQQ 04NOV2025 618 P"
 * Input format: "04NOV25" -> Output format: "04NOV2025"
 */
const expandYearInSymbol = (symbol: string): string => {
  // Pattern: DDMMMYY (day 2 digits, month 3 letters, year 2 digits)
  return symbol.replace(/(\d{2})([A-Z]{3})(\d{2})/gi, (match, day, month, year) => {
    const yearNum = parseInt(year, 10);
    // Assume year <= 50 means 2000+, and > 50 means 1900+
    const fullYear = yearNum <= 50 ? 2000 + yearNum : 1900 + yearNum;
    return `${day}${month}${fullYear}`;
  });
};

const getTradeSymbol = (trade: IBKRTradeDto) => {
  const category = getCategory(trade.assetCategory);
  const symbolFormatted = convertOptionSymbol(trade.symbol.trim());
  const code = trade.code || '';
  const isBuy = trade.quantity > 0;
  
  if (category === 'STOCKS') {
   // TODO
  }
  
  if (category === 'OPTIONS') {
    return isBuy ? `OPR_${symbolFormatted}` : symbolFormatted;
  }
  
  return symbolFormatted;
};

/**
 * Maps an IBKR trade to the Myfund CSV format
 * Format: Date;symbol;type;k quantity;price [currency];commission;rate [currency]
 */
const mapTradeToMyfund = (trade: IBKRTradeDto, rates: ExchangeRatesCache): string => {
  const date = formatDate(trade.dateTime);
  const symbol = getTradeSymbol(trade);
  const action = getTradeType(trade);
  const quantity = Math.abs(trade.quantity);
  const price = getPrice(trade);
  const commission = Math.abs(trade.commissionFee); //`${Math.abs(trade.commissionFee).toFixed(2)}`;
  
  const tradeDate = extractDate(trade.dateTime);
  const nbpRate = findNBPRate(rates, trade.currency, getPreviousDay(tradeDate));
  const exchangeRate = ''; // nbpRate?.rate ? `${nbpRate.rate} [PLN]` : '';
  
  return `${date};${symbol};${action};${quantity};${price};${commission};${exchangeRate}`;
};

/**
 * Main script function
 * Processes an IBKR CSV file and exports option trades to the Myfund format
 */
const main = async () => {
  const inputFile = process.argv[2] || 'example_data/year-2025.csv';
  const outputFile = process.argv[3] || 'example_data/myfund.csv';

  try {
    // Load and parse the CSV
    const file = getFileContent(inputFile);
    const statement = await parseIBKRCsv(file);
    const { metadata } = statement;

    if (!metadata.minDate || !metadata.maxDate || metadata.currencies.size === 0) {
      throw new Error('Brak metadanych (zakres dat lub waluty) w CSV');
    }

    // Fetch NBP rates for all dates in the range
    console.log('📊 Fetching NBP rates...');
    const rates = await getExchangeRates(metadata.currencies, metadata.minDate, metadata.maxDate, 10);

    // Filter option trades only
    console.log('🔄 Mapping trades...');
    const sortedTrades = statement.trades.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    const options = sortedTrades.filter(t => getCategory(t.assetCategory) === 'STOCKS');

    // Generate unique option symbols in the Myfund format
    const uniqueSymbols = new Set(
      options.map(t => convertOptionSymbol(t.symbol.trim()))
    );

    // Save symbols to a text file
    const symbolsFile = outputFile.replace('.csv', '-symbols.txt');
    const symbolsPath = isAbsolute(symbolsFile) ? symbolsFile : join(__dirname, '..', symbolsFile);
    writeFileSync(symbolsPath, Array.from(uniqueSymbols).sort().join('\n'), 'utf-8');
    console.log(`✅ Saved ${uniqueSymbols.size} unique option symbols to file: ${symbolsPath}`);

    // Map trades to the Myfund format and save to CSV
    const csvContent = options.map(t => mapTradeToMyfund(t, rates)).join('\n');
    const outputPath = isAbsolute(outputFile) ? outputFile : join(__dirname, '..', outputFile);
    writeFileSync(outputPath, csvContent, 'utf-8');

    console.log(`✅ Saved ${options.length} trades to file: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

main();

