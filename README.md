# Portfolio API

Serverless backend for a Polish capital-gains tax helper for Interactive Brokers (IBKR) users. It parses an IBKR Activity Statement (CSV), converts every operation to PLN with the NBP rate from the business day before the transaction, and runs a FIFO tax engine for stocks and options. The frontend lives in the companion `portfolio-turbo` repository.

> Educational project. Results are auxiliary and are not tax advice - verify them before filing a tax return.

## What it does

- Parses the IBKR CSV sections: trades, open positions, dividends, withholding tax, interest, borrow fees, deposits, net asset value, account information.
- Fetches NBP table A rates once per currency (in chunks, because NBP rejects ranges over 367 days) and walks back to the previous business day when a rate is missing.
- Computes revenue, cost and income per operation: FIFO lots, long and short positions, options with the x100 multiplier, expirations, commissions carried from the opening trade.
- Aggregates the period: income, 19% tax, minus foreign withholding tax already paid on dividends (credit capped at 19% of each dividend).
- Exposes the contract as OpenAPI (`GET /api-models`), which the frontend uses to generate its types.

The exact rules are documented in [src/ibkr/calculations/README.md](src/ibkr/calculations/README.md); a plain-language summary of the Polish rules is in [docs/tax-rules.md](docs/tax-rules.md).

## API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/ibkr-csv-parser` | API key | `multipart/form-data` with the CSV file; returns `StatementResponseDto` |
| `GET` | `/api-models` | none | OpenAPI models for client code generation |

## Architecture

```
bin/app.ts                  CDK entry point (environment from --context env=dev|test|prod)
src/stack.ts                One stack: API Gateway + every Lambda from the config
src/core/
  config/lambda.config.ts   Declarative list of Lambda functions and their endpoints
  factories/                API Gateway (CORS, API key, usage plan), Lambda, router
src/lambdas/                Thin handlers: validate input -> call domain code -> respond
src/ibkr/
  parsers/                  CSV -> raw DTOs, one parser per statement section
  mappers.service.ts        DTOs -> domain models enriched with NBP rates
  calculations/             Pure tax functions (FIFO engine, dividends, interest, borrow, aggregation)
  build-statement.ts        Parsed statement + rates -> API response (pure, used by the handler and tests)
src/shared/                 Domain models, NBP client, multipart parser, utils
```

Design choices:

- Adding a Lambda means adding one entry to `LAMBDA_FUNCTIONS`.
- Everything between the CSV and the response is pure: exchange rates are injected, so the engine runs offline in tests and scripts.
- Input is validated at the boundary with Zod; API Gateway enforces an API key, throttling (10 rps) and a daily quota.

## Getting started

Requirements: Node.js 20+.

```bash
npm install
npm test            # unit tests, no network and no AWS account needed
npm run type-check
```

Tests run on a fully synthetic statement ([test/fixtures/demo-statement.csv](test/fixtures/demo-statement.csv)) and a frozen snapshot of public NBP rates. They cover FIFO lots, shorts, options, expirations, dividends with withholding tax, interest, borrow fees, the Monday rule for NBP rates and the period tax summary.

### Demo fixture for the frontend

```bash
npm run build:demo-fixture ../portfolio-turbo/apps/web/public/demo/demo-statement.json
```

This re-parses the synthetic CSV (one request to the public NBP API), refreshes `test/fixtures/` and writes the API response that the frontend loads in demo mode.

### Local run on your own statement

```bash
npm run parse:local:ibkr path/to/statement.csv
```

Keep real statements outside the repository; `example_data/` is git-ignored for that purpose.

## Deploy

```bash
cp .env.example .env                         # optional overrides
aws configure --profile portfolio-api
cdk bootstrap --profile portfolio-api        # once per account and region
ALLOWED_ORIGINS=https://my-app.vercel.app npm run deploy
```

`ALLOWED_ORIGINS` restricts CORS to the frontend origin; leave it unset only for local development. After deploy, the stack outputs `ApiUrl` and the API key id; the key value is in AWS Console -> API Gateway -> API Keys. The `stack:pause` / `stack:resume` scripts are described in [docs/PAUSE.md](docs/PAUSE.md).

## Known limitations

- Supported instruments: stocks and options. Forex conversions are parsed but not taxed; other asset classes (futures, bonds, crypto) are ignored.
- Only the IBKR Activity Statement CSV format is supported.

## License

MIT - see [LICENSE](LICENSE).
