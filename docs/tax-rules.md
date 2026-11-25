# Capital Gains Tax in Poland

**Rate:** 19% of income  
**Income = Revenue - Tax-deductible costs**  
**Costs:** acquisition price + commissions + transaction fees

---

## 1. STOCKS - LONG POSITIONS

### WHEN:
A taxable event occurs at the moment of **selling** the shares (closing the position). Buying shares does not generate a taxable event, but the purchase commission is remembered and added to the cost on sale.

### HOW:
```
Income = Sale revenue - Tax-deductible costs
Tax = Income × 19%
```

**Sale revenue:**
- The amount received from selling the shares (price × number of shares)

**Tax-deductible costs:**
- Share acquisition price (purchase price × number of shares) - from the oldest purchases (FIFO)
- Brokerage commission on purchase (remembered at purchase, added on sale)
- Brokerage commission on sale
- Other transaction fees

### Example:
- Purchase: 100 shares at PLN 50 = PLN 5,000 (commission: PLN 5)
  - Creates a lot: `{qty: 100, pricePerLotPLN: 50, openCommissionPerLotPLN: 0.05}`
  - **No taxable event**
- Sale: 100 shares at PLN 70 = PLN 7,000 (commission: PLN 5)

**Calculation:**
- Revenue: PLN 7,000
- Costs: 100 × (50 + 0.05) + 5 = PLN 5,010
  - Purchase price: 100 × 50 = PLN 5,000
  - Purchase commission: 100 × 0.05 = PLN 5
  - Sale commission: PLN 5
- Income: PLN 7,000 - PLN 5,010 = **PLN 1,990**
- Tax: PLN 1,990 × 19% = **PLN 378.10**

---

## 2. STOCKS - SHORT POSITIONS

### WHEN:
A taxable event occurs at the moment of **closing the position** (buying back the shares). Selling borrowed shares does not generate a taxable event, but the gross premium from opening and the commission are remembered and used at closing.

### HOW:
```
Income = Sale revenue - Buyback cost - Transaction costs - Borrow costs
Tax = Income × 19%
```

**Sale revenue:**
- Gross premium received from selling the borrowed shares (price × number of shares) - remembered at opening

**Tax-deductible costs:**
- Share buyback cost (buyback price × number of shares)
- Brokerage commission on selling the borrowed shares (remembered at opening, added at closing)
- Brokerage commission on buying back the shares
- Share borrow costs (fees for borrowing securities) - settled separately
- Other transaction fees

### Example:
- Sale of borrowed shares: 100 shares at PLN 80 = PLN 8,000 (commission: PLN 5)
  - Creates a lot: `{qty: -100, pricePerLotPLN: 80, openCommissionPerLotPLN: 0.05}`
  - **No taxable event**
- Buyback: 100 shares at PLN 60 = PLN 6,000 (commission: PLN 5)

**Calculation:**
- Revenue: 100 × 80 = PLN 8,000 (opening premium)
- Costs: 100 × (60 + 0.05) + 5 = PLN 6,010
  - Buyback price: 100 × 60 = PLN 6,000
  - Sale commission (from opening): 100 × 0.05 = PLN 5
  - Buyback commission: PLN 5
- Income: PLN 8,000 - PLN 6,010 = **PLN 1,990**
- Tax: PLN 1,990 × 19% = **PLN 378.10**

**Note:** Share borrow costs (borrow fee) are settled separately and are not part of the transaction cost.

---

## 3. SELLING THE ENTIRE POSITION

### WHEN:
At the moment of selling all shares of a given company (closing all lots using FIFO).

### HOW:
```
Income = Sale revenue - Acquisition cost of all shares - Transaction costs
```

**Sale revenue:**
- The amount received from selling all shares of the given company (price × number of shares)

**Tax-deductible costs:**
- Sum of the acquisition costs of all sold shares (from all purchases, FIFO)
- Sum of brokerage commissions on all purchases (remembered in the lots)
- Brokerage commission on sale
- Other transaction fees

### Example:
- Purchase: 200 shares at PLN 30 = PLN 6,000 (commission: PLN 10)
  - Creates a lot: `{qty: 200, pricePerLotPLN: 30, openCommissionPerLotPLN: 0.05}`
- Sale: 200 shares at PLN 40 = PLN 8,000 (commission: PLN 10)

**Calculation:**
- Revenue: PLN 8,000
- Costs: 200 × (30 + 0.05) + 10 = PLN 6,020
  - Purchase price: 200 × 30 = PLN 6,000
  - Purchase commission: 200 × 0.05 = PLN 10
  - Sale commission: PLN 10
- Income: PLN 8,000 - PLN 6,020 = **PLN 1,980**
- Tax: PLN 1,980 × 19% = **PLN 376.20**

---

## 4. SELLING PART OF THE POSITION - FIFO METHOD

### WHEN:
At the moment of selling part of the held shares. The system automatically closes the oldest lots first (FIFO).

### HOW:
**MANDATORY METHOD: FIFO (First In, First Out)**
- Shares acquired **earliest** are sold first
- Costs are assigned according to the order of acquisition
- Purchase commissions are remembered in the lots and added proportionally

**Sale revenue:**
- The amount received from selling part of the shares (price × number of shares sold)

**Tax-deductible costs:**
- Acquisition cost of the shares sold under FIFO (purchase price × number of shares sold from each lot)
- Proportional part of the brokerage commissions on purchases (remembered in the lots)
- Brokerage commission on sale
- Other transaction fees

### Example 1:
- Purchase 1: 100 shares at PLN 50 = PLN 5,000 (commission: PLN 5)
  - Lot 1: `{qty: 100, pricePerLotPLN: 50, openCommissionPerLotPLN: 0.05}`
- Purchase 2: 100 shares at PLN 60 = PLN 6,000 (commission: PLN 5)
  - Lot 2: `{qty: 100, pricePerLotPLN: 60, openCommissionPerLotPLN: 0.05}`
- Sale: 120 shares at PLN 70 = PLN 8,400 (commission: PLN 6)

**Calculation (FIFO):**
- Sold 120 shares:
  - 100 shares from lot 1: cost = 100 × (50 + 0.05) = PLN 5,005
  - 20 shares from lot 2: cost = 20 × (60 + 0.05) = PLN 1,201

- Revenue: PLN 8,400
- Costs: PLN 5,005 + PLN 1,201 + PLN 6 = PLN 6,212
- Income: PLN 8,400 - PLN 6,212 = **PLN 2,188**
- Tax: PLN 2,188 × 19% = **PLN 415.72**

**Remaining:** Lot 2 updated: `{qty: 80, pricePerLotPLN: 60, openCommissionPerLotPLN: 0.05}`

### Example 2:
- Purchase 1: 50 shares at PLN 40 = PLN 2,000 (commission: PLN 2.5)
  - Lot 1: `{qty: 50, pricePerLotPLN: 40, openCommissionPerLotPLN: 0.05}`
- Purchase 2: 50 shares at PLN 45 = PLN 2,250 (commission: PLN 2.5)
  - Lot 2: `{qty: 50, pricePerLotPLN: 45, openCommissionPerLotPLN: 0.05}`
- Purchase 3: 50 shares at PLN 55 = PLN 2,750 (commission: PLN 2.5)
  - Lot 3: `{qty: 50, pricePerLotPLN: 55, openCommissionPerLotPLN: 0.05}`
- Sale: 100 shares at PLN 60 = PLN 6,000 (commission: PLN 5)

**Calculation (FIFO):**
- Sold 100 shares:
  - 50 shares from lot 1: cost = 50 × (40 + 0.05) = PLN 2,002.5
  - 50 shares from lot 2: cost = 50 × (45 + 0.05) = PLN 2,252.5

- Revenue: PLN 6,000
- Costs: PLN 2,002.5 + PLN 2,252.5 + PLN 5 = PLN 4,260
- Income: PLN 6,000 - PLN 4,260 = **PLN 1,740**
- Tax: PLN 1,740 × 19% = **PLN 330.60**

**Remaining:** Only lot 3: `{qty: 50, pricePerLotPLN: 55, openCommissionPerLotPLN: 0.05}`

---

## 5. OFFSETTING GAINS AND LOSSES

### Within the same year:
Gains and losses offset each other. Tax is levied on the **total income**.

**Total income:**
- Sum of all incomes (gains) from all transactions in a given year
- Reduced by the sum of all losses from all transactions in a given year

### Example:
- Transaction 1: Gain PLN 5,000
- Transaction 2: Loss PLN 2,000

**Calculation:**
- Total income: PLN 5,000 - PLN 2,000 = **PLN 3,000**
- Tax: PLN 3,000 × 19% = **PLN 570**

### Losses from previous years:
- Can be deducted over the **next 5 years**
- In a single year, at most **50% of the loss** from a given year

### Example:
- Year 2023: Loss PLN 10,000
- Year 2024: Gain PLN 8,000

**Calculation:**
- To deduct: 50% × PLN 10,000 = PLN 5,000
- Income: PLN 8,000 - PLN 5,000 = **PLN 3,000**
- Tax: PLN 3,000 × 19% = **PLN 570**
- Remaining loss: PLN 5,000 (to be used in 2025-2028)

---

## 6. FILING

- **Form:** PIT-38 (annual personal income tax return for capital gains)
- **Deadline:** by April 30 of the following year
- **Document:** PIT-8C from the brokerage firm (annual statement of income and costs from securities)

---

**NOTE:** If in doubt, consult a tax advisor or check the current regulations on the Ministry of Finance website.
