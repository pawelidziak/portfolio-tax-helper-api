import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, readFileSync } from 'fs';

import { buildStatementResponse, parseIBKRCsv } from '../src/ibkr';
import { getExchangeRates } from '../src/shared/api/nbp.api';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'test', 'fixtures');
const GENERATE_DATE = '2026-01-05T09:00:00.000Z';
const RATES_BUFFER_DAYS = 10;

/**
 * Rebuilds the demo fixtures from the synthetic CSV:
 * - nbp-rates.json: public NBP rates snapshot (keeps tests offline and deterministic)
 * - demo-statement.json: the API response the frontend loads in demo mode
 *
 * Usage: npm run build:demo-fixture [path/to/frontend/demo-statement.json]
 */
const main = async (): Promise<void> => {
  const csv = readFileSync(join(FIXTURES_DIR, 'demo-statement.csv'), 'utf-8');
  const statement = await parseIBKRCsv(csv);
  const { minDate, maxDate, currencies } = statement.metadata;

  const rates = await getExchangeRates(currencies, minDate, maxDate, RATES_BUFFER_DAYS);
  const ratesJson = Object.fromEntries([...rates].map(([currency, byDate]) => [currency, Object.fromEntries(byDate)]));
  writeFileSync(join(FIXTURES_DIR, 'nbp-rates.json'), JSON.stringify(ratesJson, null, 2) + '\n');

  const response = JSON.stringify(buildStatementResponse(statement, rates, GENERATE_DATE), null, 2) + '\n';
  writeFileSync(join(FIXTURES_DIR, 'demo-statement.json'), response);

  const frontendTarget = process.argv[2];
  if (frontendTarget) writeFileSync(frontendTarget, response);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
