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
 * Wczytuje zawartość pliku (obsługuje ścieżki względne i bezwzględne)
 */
const getFileContent = (filePath: string) => {
  const fullPath = isAbsolute(filePath) ? filePath : join(__dirname, '..', filePath);
  return readFileSync(fullPath, 'utf-8');
};

/**
 * Konwertuje datę z formatu IBKR ("YYYY-MM-DD, HH:MM:SS") na format Myfund ("YYYY-MM-DD HH:MM:SS")
 */
const formatDate = (dateTime: string) => dateTime.replace(',', '');

/**
 * Mapuje kategorię aktywów IBKR na kategorię wewnętrzną
 */
const getCategory = (assetCategory: string) => {
  if (assetCategory === 'Stocks') return 'STOCKS';
  if (assetCategory === 'Equity and Index Options') return 'OPTIONS';
  if (assetCategory === 'Forex') return 'FOREX';
  return 'UNKNOWN';
};

/**
 * Określa typ transakcji na podstawie quantity i code
 * Dla STOCKS rozpoznaje pozycje krótkie (Krótka Sprzedaż, Krótka Kupno)
 */
const getTradeType = (trade: IBKRTradeDto): string => {
  const category = getCategory(trade.assetCategory);
  const isBuy = trade.quantity > 0;

  const beforeQty = lots.get(trade.symbol) || 0;
  const afterQty = beforeQty + trade.quantity;
  lots.set(trade.symbol, afterQty);
  
  if (category === 'STOCKS') {
    // domkcięcie shorta
    if (beforeQty < 0 && afterQty === 0) {
      return 'Krótka kupno';
    }
    // domkcięcie longa
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
 * Formatuje cenę transakcji z walutą
 * Dla opcji mnoży cenę przez 100 (premia w USD na kontrakt)
 */
const getPrice = (trade: IBKRTradeDto) => {
  // const price = getCategory(trade.assetCategory) === 'OPTIONS' 
  //   ? trade.tradePrice * 100 
  //   : trade.tradePrice;
  const price = trade.tradePrice;
  return `${price} [${trade.currency}]`;
};

/** Mapowanie nazw miesięcy na numery (format IBKR) */
const monthMap: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

/**
 * Konwertuje symbol opcji z formatu IBKR na format Myfund
 * Format wejściowy: "QQQ 04NOV25 618 P" -> Format wyjściowy: "QQQ251104P00618000"
 * Struktura: {SYMBOL}{RRMMDD}{P/C}{8-cyfrowy strike}
 */
const convertOptionSymbol = (symbol: string): string => {
  const clean = symbol.trim().replace(/\s+/g, '');
  const match = clean.match(/^([A-Z]+)(\d{2})([A-Z]{3})(\d{2})([\d.]+)([PC])$/i);
  
  if (!match) {
    console.warn(`⚠️  Nie można sparsować symbolu opcji: ${symbol}`);
    return clean;
  }
  
  const [, base, day, month, year, strike, putCall] = match;
  const monthNum = monthMap[month.toUpperCase()];
  
  if (!monthNum) {
    console.warn(`⚠️  Nieznany miesiąc w symbolu: ${symbol}`);
    return clean;
  }
  
  const dateStr = `${year}${monthNum}${day}`;
  const strikeStr = Math.round(parseFloat(strike) * 1000).toString().padStart(8, '0');
  
  return `${base}${dateStr}${putCall.toUpperCase()}${strikeStr}`;
};

/**
 * Zamienia rok w symbolu opcji z formatu 2-cyfrowego (yy) na 4-cyfrowy (YYYY)
 * Format wejściowy: "QQQ 04NOV25 618 P" -> Format wyjściowy: "QQQ 04NOV2025 618 P"
 * Format wejściowy: "04NOV25" -> Format wyjściowy: "04NOV2025"
 */
const expandYearInSymbol = (symbol: string): string => {
  // Wzorzec: DDMMMYY (dzień 2 cyfry, miesiąc 3 litery, rok 2 cyfry)
  return symbol.replace(/(\d{2})([A-Z]{3})(\d{2})/gi, (match, day, month, year) => {
    const yearNum = parseInt(year, 10);
    // Zakładamy, że rok <= 50 to 2000+, a > 50 to 1900+
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
 * Mapuje transakcję IBKR na format Myfund CSV
 * Format: Data;symbol;typ;k ilość;cena [waluta];prowizja;kurs [waluta]
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
 * Główna funkcja skryptu
 * Przetwarza plik CSV IBKR i eksportuje transakcje opcji do formatu Myfund
 */
const main = async () => {
  const inputFile = process.argv[2] || 'example_data/year-2025.csv';
  const outputFile = process.argv[3] || 'example_data/myfund.csv';

  try {
    // Wczytaj i sparsuj CSV
    const file = getFileContent(inputFile);
    const statement = await parseIBKRCsv(file);
    const { metadata } = statement;

    if (!metadata.minDate || !metadata.maxDate || metadata.currencies.size === 0) {
      throw new Error('Brak metadanych (zakres dat lub waluty) w CSV');
    }

    // Pobierz kursy NBP dla wszystkich dat w zakresie
    console.log('📊 Pobieranie kursów NBP...');
    const rates = await getExchangeRates(metadata.currencies, metadata.minDate, metadata.maxDate, 10);

    // Filtruj tylko transakcje opcji
    console.log('🔄 Mapowanie transakcji...');
    const sortedTrades = statement.trades.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    const options = sortedTrades.filter(t => getCategory(t.assetCategory) === 'STOCKS');

    // Wygeneruj unikalne symbole opcji w formacie Myfund
    const uniqueSymbols = new Set(
      options.map(t => convertOptionSymbol(t.symbol.trim()))
    );

    // Zapisz symbole do pliku tekstowego
    const symbolsFile = outputFile.replace('.csv', '-symbols.txt');
    const symbolsPath = isAbsolute(symbolsFile) ? symbolsFile : join(__dirname, '..', symbolsFile);
    writeFileSync(symbolsPath, Array.from(uniqueSymbols).sort().join('\n'), 'utf-8');
    console.log(`✅ Zapisano ${uniqueSymbols.size} unikalnych symboli opcji do pliku: ${symbolsPath}`);

    // Mapuj transakcje na format Myfund i zapisz do CSV
    const csvContent = options.map(t => mapTradeToMyfund(t, rates)).join('\n');
    const outputPath = isAbsolute(outputFile) ? outputFile : join(__dirname, '..', outputFile);
    writeFileSync(outputPath, csvContent, 'utf-8');

    console.log(`✅ Zapisano ${options.length} transakcji do pliku: ${outputPath}`);
  } catch (error) {
    console.error('❌ Błąd:', error);
    process.exit(1);
  }
};

main();

