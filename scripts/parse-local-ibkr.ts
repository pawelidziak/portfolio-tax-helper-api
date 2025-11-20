import { parseIBKRCsv } from '../src/parsers/ibkr-statement-csv.parser';
import * as path from 'path';
import * as fs from 'fs';

const getFileContent = (filePath: string) => {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, '..', filePath);
  return fs.readFileSync(fullPath, 'utf-8');
};

const main = async () => {
  const file = getFileContent(process.argv[2] || 'example_data/listopad.csv');

  try {
    const statement = await parseIBKRCsv(file);

    console.log(statement.deposits);
  } catch (error) {
    console.error('❌ Błąd:', error);
    process.exit(1);
  }
};

main();
