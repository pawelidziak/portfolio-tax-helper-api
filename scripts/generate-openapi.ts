import { writeFileSync, readFileSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

import { ModelRegistry } from '../src/core/config/models-registry';

/**
 * Generuje OpenAPI 3.0 spec bezpośrednio z TypeScript types
 *
 * Automatycznie pobiera nazwy typów z ModelRegistry
 * Generuje każdy typ osobno, potem łączy w OpenAPI spec
 */
const modelNames = Object.keys(ModelRegistry); // ← automatycznie z registry
const tsConfig = path.resolve('tsconfig.json');
const openApiFile = path.resolve('openapi.json');
const tempDir = path.resolve('temp-schemas');

// Utwórz tymczasowy katalog
try {
  execSync(`mkdir -p ${tempDir}`, { stdio: 'pipe' });
} catch {
  // Katalog już istnieje
}

const schemas: Record<string, unknown> = {};

// Generuj schemat dla każdego typu osobno
for (const modelName of modelNames) {
  const tempFile = path.join(tempDir, `${modelName}.json`);
  const cmd = [
    'npx typescript-json-schema',
    tsConfig,
    modelName,
    '--out',
    tempFile,
    '--required',
    '--noExtraProps',
  ].join(' ');

  console.log('🔄', `[openapi] Generating ${modelName}...`);
  try {
    execSync(cmd, { stdio: 'pipe' });
    const schema = JSON.parse(readFileSync(tempFile, 'utf-8'));
    // Usuń $schema z każdego schematu (nie jest potrzebny w OpenAPI)
    delete schema.$schema;
    schemas[modelName] = schema;
  } catch (error) {
    console.warn(`[openapi] Warning: Failed to generate schema for ${modelName}:`, error);
  }
}

// Utwórz OpenAPI spec
const openapi = {
  openapi: '3.0.0',
  info: {
    title: 'Portfolio API Models',
    version: '1.0.0',
    description: 'Modele danych dla Portfolio API - wygenerowane automatycznie z TypeScript types',
  },
  paths: {},
  components: {
    schemas,
  },
};

writeFileSync(openApiFile, JSON.stringify(openapi, null, 2));

// Usuń tymczasowy katalog
try {
  rmSync(tempDir, { recursive: true, force: true });
} catch {
  // Ignoruj błędy usuwania
}

console.log('[openapi] openapi.json generated with', Object.keys(schemas).length, 'schemas');
