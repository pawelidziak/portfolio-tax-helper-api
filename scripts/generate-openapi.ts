import { writeFileSync, readFileSync, rmSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

import { ModelRegistry } from '../src/core/config/models-registry';

/**
 * Generuje OpenAPI 3.0 spec bezpośrednio z TypeScript types
 *
 * ⚠️ WAŻNE: Przenosi wszystkie zagnieżdżone definitions do głównego poziomu
 * i aktualizuje referencje, aby działały poprawnie w OpenAPI 3.0
 */

// ============================================================================
// Funkcje pomocnicze
// ============================================================================

/**
 * Rekurencyjnie aktualizuje referencje z #/definitions/ na #/components/schemas/
 */
function updateReferences(obj: unknown): void {
  if (typeof obj !== 'object' || obj === null) return;

  if (Array.isArray(obj)) {
    obj.forEach(updateReferences);
    return;
  }

  const record = obj as Record<string, unknown>;

  // Aktualizuj referencje $ref
  if (record.$ref && typeof record.$ref === 'string' && record.$ref.startsWith('#/definitions/')) {
    const refName = record.$ref.replace('#/definitions/', '');
    record.$ref = `#/components/schemas/${refName}`;
  }

  // Rekurencyjnie przetwórz wszystkie właściwości
  Object.values(record).forEach(updateReferences);
}

/**
 * Wyciąga definitions z schematu i usuwa je z oryginalnego obiektu
 */
function extractDefinitions(schema: Record<string, unknown>): Map<string, unknown> {
  const definitions = new Map<string, unknown>();

  if (schema.definitions && typeof schema.definitions === 'object') {
    Object.entries(schema.definitions).forEach(([key, value]) => {
      definitions.set(key, value);
    });
    delete schema.definitions;
  }

  return definitions;
}

/**
 * Generuje schemat JSON dla pojedynczego modelu
 */
function generateSchemaForModel(
  modelName: string,
  tsConfig: string,
  tempDir: string
): Record<string, unknown> | null {
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

  try {
    execSync(cmd, { stdio: 'pipe' });
    const schema = JSON.parse(readFileSync(tempFile, 'utf-8')) as Record<string, unknown>;
    delete schema.$schema; // Usuń $schema (nie jest potrzebny w OpenAPI)
    return schema;
  } catch (error) {
    console.warn(`⚠️  [openapi] Failed to generate schema for ${modelName}:`, error);
    return null;
  }
}

// ============================================================================
// Główna logika
// ============================================================================

const modelNames = Object.keys(ModelRegistry);
const tsConfig = path.resolve('tsconfig.json');
const openApiFile = path.resolve('openapi.json');
const tempDir = path.resolve('temp-schemas');

// Utwórz tymczasowy katalog
try {
  mkdirSync(tempDir, { recursive: true });
} catch {
  // Katalog już istnieje - ignoruj
}

const schemas: Record<string, unknown> = {};
const allDefinitions = new Map<string, unknown>();

// Generuj schematy dla wszystkich modeli
console.log('🔄 [openapi] Generating schemas...\n');
for (const modelName of modelNames) {
  console.log(`  → ${modelName}`);
  const schema = generateSchemaForModel(modelName, tsConfig, tempDir);

  if (!schema) continue;

  // Wyciągnij i zapisz definitions
  const definitions = extractDefinitions(schema);
  definitions.forEach((def, key) => {
    if (!allDefinitions.has(key)) {
      allDefinitions.set(key, def);
    }
  });

  schemas[modelName] = schema;
}

// Dodaj wszystkie definitions do schemas (jeśli jeszcze nie istnieją)
allDefinitions.forEach((def, key) => {
  if (!schemas[key]) {
    schemas[key] = def;
  }
});

// Aktualizuj wszystkie referencje
Object.values(schemas).forEach(updateReferences);

// Utwórz i zapisz OpenAPI spec
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

console.log(`\n✅ [openapi] openapi.json generated with ${Object.keys(schemas).length} schemas`);
