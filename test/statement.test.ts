import { describe, before, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { OperationCategoryEnum, StatementResponseDto, Trade } from '../src/shared/models';
import { buildStatementResponse, parseIBKRCsv } from '../src/ibkr';
import { ExchangeRatesCache } from '../src/shared/api/nbp.api';

const FIXTURES_DIR = join(process.cwd(), 'test', 'fixtures');
const TOLERANCE = 0.005;

const rawRates: Record<string, Record<string, number>> = JSON.parse(
  readFileSync(join(FIXTURES_DIR, 'nbp-rates.json'), 'utf-8')
);
const ratesCache: ExchangeRatesCache = new Map(
  Object.entries(rawRates).map(([currency, byDate]) => [currency, new Map(Object.entries(byDate))])
);

/** NBP rate published on `date` (the engine must pick the last business day before the trade). */
const nbp = (currency: 'USD' | 'EUR', date: string): number => rawRates[currency][date];

const assertClose = (actual: undefined | number, expected: number): void => {
  assert.ok(actual !== undefined, 'value is missing');
  assert.ok(Math.abs(actual - expected) < TOLERANCE, `expected ${expected}, got ${actual}`);
};

const incomeOf = (item: { summary: { income?: number } }): number => item.summary.income ?? 0;

describe('IBKR statement -> API response (synthetic demo statement)', () => {
  let statement: StatementResponseDto;

  const tradeOf = (symbol: string, date: string): Trade => {
    const trade = statement.trades.find(t => t.symbol === symbol && t.dateTime.startsWith(date));
    assert.ok(trade, `trade ${symbol} ${date} not found`);
    return trade;
  };

  before(async () => {
    const csv = readFileSync(join(FIXTURES_DIR, 'demo-statement.csv'), 'utf-8');
    statement = buildStatementResponse(await parseIBKRCsv(csv), ratesCache);
  });

  describe('parsing', () => {
    it('reads orders only and skips SubTotal/Total rows', () => {
      assert.equal(statement.trades.length, 21);
    });

    it('reads account, period and open positions', () => {
      assert.equal(statement.accountInformation.baseCurrency, 'USD');
      assert.equal(statement.metadata.minDate, '2025-01-01');
      assert.equal(statement.metadata.maxDate, '2025-12-31');
      assert.deepEqual(statement.openPositions.map(p => p.symbol).sort(), ['AMZN', 'TSLA']);
    });

    it('values open positions with the rate from the day before the period end', () => {
      for (const position of statement.openPositions) {
        assert.equal(position.exchangeRate.date, '2025-12-30');
        assert.equal(position.exchangeRate.rate, nbp('USD', '2025-12-30'));
      }
    });
  });

  describe('NBP rate matching', () => {
    it('uses the previous business day for a Monday trade', () => {
      const monday = tradeOf('AAPL', '2025-02-10');
      assert.equal(monday.exchangeRate.date, '2025-02-07');
      assert.equal(monday.exchangeRate.rate, nbp('USD', '2025-02-07'));
    });

    it('uses the EUR table for EUR instruments', () => {
      assert.equal(tradeOf('SAP', '2025-10-14').exchangeRate.rate, nbp('EUR', '2025-10-13'));
    });
  });

  describe('stocks', () => {
    it('opening a long position is not a tax event', () => {
      assert.deepEqual(tradeOf('AAPL', '2025-02-10').summary, { revenue: 0, cost: 0, income: 0 });
    });

    it('long closed at a gain: revenue, cost (with both commissions) and income in PLN', () => {
      const { summary } = tradeOf('AAPL', '2025-04-15');
      const buy = nbp('USD', '2025-02-07');
      const sell = nbp('USD', '2025-04-14');
      assertClose(summary.revenue, 23000 * sell);
      assertClose(summary.cost, 20000 * buy + 1 * buy + 1 * sell);
      assertClose(summary.income, (summary.revenue ?? 0) - (summary.cost ?? 0));
      assert.ok((summary.income ?? 0) > 0);
    });

    it('FIFO: a partial sale consumes the oldest lot first and leaves the rest open', () => {
      const sale = tradeOf('TSLA', '2025-06-17');
      const lot1 = nbp('USD', '2025-03-03');
      const lot2 = nbp('USD', '2025-05-05');
      const sell = nbp('USD', '2025-06-16');

      // 50 shares from lot 1 (250) + 10 shares from lot 2 (300), proportional open commissions
      const expectedCost =
        50 * 250 * lot1 + 1 * lot1 + 10 * 300 * lot2 + (10 / 50) * 1 * lot2 + 1.2 * sell;
      assertClose(sale.summary.revenue, 19200 * sell);
      assertClose(sale.summary.cost, expectedCost);
      assert.equal(sale.quantityAfter, 40);
    });

    it('long closed at a loss: negative income', () => {
      const { summary } = tradeOf('KO', '2025-09-09');
      assert.ok((summary.income ?? 0) < 0);
      assertClose(summary.income, (summary.revenue ?? 0) - (summary.cost ?? 0));
    });

    it('short: opening is not a tax event, covering realises the premium', () => {
      assert.deepEqual(tradeOf('AMD', '2025-07-08').summary, { revenue: 0, cost: 0, income: 0 });

      const { summary } = tradeOf('AMD', '2025-08-12');
      const open = nbp('USD', '2025-07-07');
      const close = nbp('USD', '2025-08-11');
      assertClose(summary.revenue, 15000 * open);
      assertClose(summary.cost, 12000 * close + 1 * close + 1 * open);
    });

    it('a position still open at period end produces no tax event', () => {
      assert.deepEqual(tradeOf('AMZN', '2025-11-04').summary, { revenue: 0, cost: 0, income: 0 });
    });

    it('EUR instruments are converted with the EUR rate', () => {
      const { summary } = tradeOf('SAP', '2025-10-14');
      const buy = nbp('EUR', '2025-03-17');
      const sell = nbp('EUR', '2025-10-13');
      assertClose(summary.revenue, 5600 * sell);
      assertClose(summary.cost, 5000 * buy + 4 * buy + 4 * sell);
    });
  });

  describe('options (multiplier 100)', () => {
    it('short call bought back: premium at open rate is revenue', () => {
      const { summary } = tradeOf('AAPL 21MAR25 220 C', '2025-03-10');
      const open = nbp('USD', '2025-02-19');
      const close = nbp('USD', '2025-03-07');
      assertClose(summary.revenue, 300 * open);
      assertClose(summary.cost, 100 * close + 1 * close + 1 * open);
    });

    it('long call sold: proceeds are revenue, premium paid is cost', () => {
      const { summary } = tradeOf('TSLA 19SEP25 350 C', '2025-08-26');
      const open = nbp('USD', '2025-07-21');
      const close = nbp('USD', '2025-08-25');
      assertClose(summary.revenue, 900 * close);
      assertClose(summary.cost, 500 * open + 1 * open + 1 * close);
    });

    it('short put expiring worthless: premium is income minus the opening commission', () => {
      const { summary } = tradeOf('AMD 28NOV25 100 P', '2025-11-28');
      const open = nbp('USD', '2025-10-27');
      assertClose(summary.revenue, 200 * open);
      assertClose(summary.cost, 1 * open);
    });
  });

  describe('dividends, interest, borrow, deposits', () => {
    it('joins each dividend with its withholding tax and converts to PLN', () => {
      assert.equal(statement.dividends.length, 4);

      const sap = statement.dividends.find(d => d.symbol === 'SAP');
      assert.ok(sap);
      assert.equal(sap.currency, 'EUR');
      assertClose(sap.summary.revenue, 44 * nbp('EUR', '2025-05-15'));
      assertClose(sap.summary.withholdingTaxPLN, 11.6 * nbp('EUR', '2025-05-15'));
    });

    it('credits withholding tax in full when it is below the 19% Polish tax on the dividend', () => {
      const ko = statement.dividends.find(d => d.symbol === 'KO');
      assert.ok(ko);
      assertClose(ko.summary.withholdingTaxCreditPLN, 15.3 * nbp('USD', '2025-03-13'));
    });

    it('caps the credit at 19% of the dividend when foreign tax is higher (German 26.4%)', () => {
      const sap = statement.dividends.find(d => d.symbol === 'SAP');
      assert.ok(sap);
      const rate = nbp('EUR', '2025-05-15');
      assertClose(sap.summary.withholdingTaxPLN, 11.6 * rate);
      assertClose(sap.summary.withholdingTaxCreditPLN, 44 * rate * 0.19);
    });

    it('keeps credit interest positive and debit interest negative', () => {
      const incomes = statement.interests.map(incomeOf);
      assert.equal(statement.interests.length, 3);
      assert.equal(incomes.filter(income => income > 0).length, 2);
      assert.equal(incomes.filter(income => income < 0).length, 1);
    });

    it('charges borrow fees as costs', () => {
      assert.equal(statement.borrows.length, 4);
      assert.ok(statement.borrows.every(b => incomeOf(b) < 0));
    });

    it('reads deposits and withdrawals without the Total row', () => {
      assert.equal(statement.deposits.length, 4);
      assert.equal(
        statement.deposits.reduce((sum, d) => sum + d.amount, 0),
        105000
      );
    });

    it('does not tax forex conversions', () => {
      const forex = statement.trades.filter(t => t.category === OperationCategoryEnum.FOREX);
      assert.equal(forex.length, 3);
      assert.ok(forex.every(t => incomeOf(t) === 0));
    });
  });

  describe('period summary', () => {
    it('sums all income and taxes it at 19% minus the creditable withholding tax', () => {
      const summary = statement.periodTaxSummary;
      const allIncome = [
        ...statement.trades,
        ...statement.dividends,
        ...statement.interests,
        ...statement.borrows,
      ].reduce((sum, item) => sum + incomeOf(item), 0);
      const paid = statement.dividends.reduce(
        (sum, d) => sum + (d.summary.withholdingTaxPLN ?? 0),
        0
      );
      const credit = statement.dividends.reduce(
        (sum, d) => sum + (d.summary.withholdingTaxCreditPLN ?? 0),
        0
      );

      assert.ok(credit < paid, 'the SAP credit is capped, so credit is lower than tax paid');
      assertClose(summary.totalIncome, allIncome);
      assertClose(summary.taxableIncome, allIncome);
      assertClose(summary.totalWithholdingTaxPLN, paid);
      assertClose(summary.taxAmount, allIncome * 0.19 - credit);
    });
  });
});
