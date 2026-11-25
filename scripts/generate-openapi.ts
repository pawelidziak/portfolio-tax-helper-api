import { writeFileSync, readFileSync, rmSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';

import { ModelRegistry } from '../src/core/config/models-registry';

/**
 * Generates the OpenAPI 3.0 spec directly from TypeScript types
 *
 * ⚠️ IMPORTANT: Moves all nested definitions to the top level
 * and updates references so they work correctly in OpenAPI 3.0
 */

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Recursively updates references from #/definitions/ to #/components/schemas/
 */
function updateReferences(obj: unknown): void {
  if (typeof obj !== 'object' || obj === null) return;

  if (Array.isArray(obj)) {
    obj.forEach(updateReferences);
    return;
  }

  const record = obj as Record<string, unknown>;

  // Update $ref references
  if (record.$ref && typeof record.$ref === 'string' && record.$ref.startsWith('#/definitions/')) {
    const refName = record.$ref.replace('#/definitions/', '');
    record.$ref = `#/components/schemas/${refName}`;
  }

  // Recursively process all properties
  Object.values(record).forEach(updateReferences);
}

/**
 * Extracts definitions from the schema and removes them from the original object
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
 * Generates a JSON schema for a single model
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
    delete schema.$schema; // Remove $schema (not needed in OpenAPI)
    return schema;
  } catch (error) {
    console.warn(`⚠️  [openapi] Failed to generate schema for ${modelName}:`, error);
    return null;
  }
}

// ============================================================================
// Main logic
// ============================================================================

const modelNames = Object.keys(ModelRegistry);
const tsConfig = path.resolve('tsconfig.json');
const openApiFile = path.resolve('openapi.json');
const tempDir = path.resolve('temp-schemas');

// Create a temporary directory
try {
  mkdirSync(tempDir, { recursive: true });
} catch {
  // Directory already exists - ignore
}

const schemas: Record<string, unknown> = {};
const allDefinitions = new Map<string, unknown>();

// Generate schemas for all models
console.log('🔄 [openapi] Generating schemas...\n');
for (const modelName of modelNames) {
  console.log(`  → ${modelName}`);
  const schema = generateSchemaForModel(modelName, tsConfig, tempDir);

  if (!schema) continue;

  // Extract and save definitions
  const definitions = extractDefinitions(schema);
  definitions.forEach((def, key) => {
    if (!allDefinitions.has(key)) {
      allDefinitions.set(key, def);
    }
  });

  schemas[modelName] = schema;
}

// Add all definitions to schemas (if they do not exist yet)
allDefinitions.forEach((def, key) => {
  if (!schemas[key]) {
    schemas[key] = def;
  }
});

// Update all references
Object.values(schemas).forEach(updateReferences);

// Create and save the OpenAPI spec
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

// Remove the temporary directory
try {
  rmSync(tempDir, { recursive: true, force: true });
} catch {
  // Ignore removal errors
}

console.log(`\n✅ [openapi] openapi.json generated with ${Object.keys(schemas).length} schemas`);
