# Tax calculations documentation

## General rule

**For stocks and options:** `income = revenue - cost` (we do NOT use `realizedPL`)
- **Why:** `realizedPL` contains values from different days with different fx rates
- For options: `realizedPL` shows the result of the whole position (opening + closing) on a different day
- For stocks: `realizedPL` contains the `basis` from OPENING + `proceeds`/`commissionFee` from CLOSING

**For other categories:** we use the IBKR values when available

**Values:**
- `revenue` and `cost` are always positive (absolute values) - for the tax return
- `income` can be negative (a loss)

**Method:** FIFO (First In, First Out) - mandatory for stocks in Poland

---

## STOCKS AND OPTIONS - TRADE TAX ENGINE

**Key rule:** A taxable event arises **ONLY when a position is closed** (partially or fully). Pure position openings do not generate a taxable event, but the opening commission is remembered on the fly and added to the cost on closing.

### LOT system (FIFO)

Each lot stores:
- `qty`: quantity (positive = long, negative = short)
- `pricePerLotPLN`: base price per unit in PLN (gross, excluding commission)
  - **LONG:** purchase price
  - **SHORT:** gross opening premium
- `openCommissionPerLotPLN`: opening commission per unit (added to the cost on closing)

### LONG POSITIONS

#### Opening (BUY, when there are no shorts to close)
- **No taxable event** (`revenue = 0, cost = 0, income = 0`)
- Creates a new lot with:
  - `qty = quantity of stocks/options bought`
  - `pricePerLotPLN = purchase price * fxRate * multiplier`
  - `openCommissionPerLotPLN = commission / quantity`

#### Closing (SELL, closes longs using FIFO)
- **A taxable event arises**
- `revenue = closed_quantity * sale_price * fxRate * multiplier`
- `cost = closed_quantity * (purchase_price + opening_commission) + closing_commission`
  - The purchase price and opening commission come from the lot (FIFO)
  - The closing commission is proportional to the quantity being closed
- `income = revenue - cost`

**Example:**
- Purchase: 100 shares at 50 PLN (commission: 5 PLN) → lot: `{qty: 100, pricePerLotPLN: 50, openCommissionPerLotPLN: 0.05}`
- Sale: 100 shares at 70 PLN (commission: 5 PLN)
  - `revenue = 100 * 70 = 7 000 PLN`
  - `cost = 100 * (50 + 0.05) + 5 = 5 010 PLN`
  - `income = 7 000 - 5 010 = 1 990 PLN`

### SHORT POSITIONS

#### Opening (SELL, when there are no longs to close)
- **No taxable event** (`revenue = 0, cost = 0, income = 0`)
- Creates a new lot with:
  - `qty = -quantity_of_stocks/options_sold` (negative)
  - `pricePerLotPLN = gross_opening_premium * fxRate * multiplier`
  - `openCommissionPerLotPLN = commission / quantity`

#### Closing (BUY, closes shorts using FIFO)
- **A taxable event arises**
- `revenue = closed_quantity * gross_opening_premium` (from the lot)
- `cost = closed_quantity * (buyback_price + opening_commission) + closing_commission`
  - The gross opening premium and opening commission come from the lot (FIFO)
  - The closing commission is proportional to the quantity being closed
- `income = revenue - cost`

**Example:**
- Short sale: 100 shares at 80 PLN (commission: 5 PLN) → lot: `{qty: -100, pricePerLotPLN: 80, openCommissionPerLotPLN: 0.05}`
- Buyback: 100 shares at 60 PLN (commission: 5 PLN)
  - `revenue = 100 * 80 = 8 000 PLN` (opening premium)
  - `cost = 100 * (60 + 0.05) + 5 = 6 010 PLN`
  - `income = 8 000 - 6 010 = 1 990 PLN`

### PARTIAL CLOSE

When a trade closes part of a position and opens a new one:

**Example:** We hold 100 longs and sell 150 (closes 100 longs, opens 50 shorts)
- The commission is split proportionally:
  - Part of the commission goes to the closing cost (proportional to the quantity being closed)
  - The rest of the commission goes to the new lot as `openCommissionPerLotPLN`

### FIFO METHOD

- We always close the oldest lots first
- On a partial close, the lot is updated (its quantity is reduced)
- Empty lots are removed from the front of the array

---

## OPTIONS

**Rule:** Options work the same as stocks, with one difference - the use of a price multiplier (usually 100 for options).

### Differences compared to stocks:
- `multiplier = 100` (for options) vs `multiplier = 1` (for stocks)
- `pricePLN = tradePrice * fxRate * multiplier`
- All other rules are identical:
  - A taxable event only on closing
  - FIFO for lots
  - The opening commission is remembered on the fly
  - The closing commission is added to the cost

### CALL option example:
- Purchase: 1 CALL option at 2.50 USD (commission: 1 USD)
  - `pricePerLotPLN = 2.50 * fxRate * 100 = 250 * fxRate PLN` (for 1 contract)
  - Lot: `{qty: 1, pricePerLotPLN: 250 * fxRate, openCommissionPerLotPLN: 1 * fxRate}`
- Sale: 1 CALL option at 5.00 USD (commission: 1 USD)
  - `revenue = 1 * 5.00 * fxRate * 100 = 500 * fxRate PLN`
  - `cost = 1 * (250 * fxRate + 1 * fxRate) + 1 * fxRate = 252 * fxRate PLN`
  - `income = 500 * fxRate - 252 * fxRate = 248 * fxRate PLN`

**Note:** Option expiration or assignment is handled as a position close at the appropriate price.

---

## DIVIDENDS

- `revenue = grossAmount * fxRateToPLN` (gross, before foreign tax)
- `cost = 0`
- `income = revenue`
- `withholdingTaxPLN = |withholdingTaxAmount| * fxRateToPLN` (positive, the tax actually paid abroad)
- `withholdingTaxCreditPLN = min(withholdingTaxPLN, 19% * revenue)` (the part that may be deducted; the limit from the PIT Act is calculated separately for each dividend)

**Why gross?** The gross dividend is the taxable revenue, regardless of the withholding tax

---

## INTEREST

**If `amount >= 0` (credit interest):**
- `revenue = amount * fxRateToPLN`
- `cost = 0`
- `income = revenue`

**If `amount < 0` (debit interest):**
- `revenue = 0`
- `cost = |amount| * fxRateToPLN`
- `income = revenue - cost` (negative)

---

## FOREX

- `revenue = 0, cost = 0, income = 0`

**Why?** Currency exchange does not generate taxable revenue/cost. The exchange rate difference is accounted for in the stock/option trades.

---

## STOCK BORROW (Borrow Fee)

- `revenue = 0`
- `cost = |borrowFee| * fxRateToPLN` (always negative in IBKR)
- `income = revenue - cost` (negative)

---

## AGGREGATION

### Summation
- `totalRevenue = sum of all revenue`
- `totalCost = sum of all cost`
- `totalIncome = sum of all income` (can be negative)
- `totalWithholdingTaxPLN = sum of all withholdingTaxPLN` (positive, dividends only)
- `totalWithholdingTaxCreditPLN = sum of all withholdingTaxCreditPLN` (used for the deduction)

### Tax calculation
1. `taxableIncome = max(0, totalIncome)` (a loss is not taxed)
2. `taxAmountBeforeWithholding = taxableIncome * 19%`
3. `taxAmount = max(0, taxAmountBeforeWithholding - totalWithholdingTaxCreditPLN)`

**Why 19%?** Capital gains tax in Poland is a flat 19% (no brackets)

**Why `max(0, ...)`?** A loss is not taxed, and the tax cannot be negative
