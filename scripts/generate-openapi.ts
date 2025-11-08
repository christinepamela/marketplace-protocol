/**
 * Generate OpenAPI Specification File
 * Outputs openapi.yaml and openapi.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { generateOpenAPISpec } from '../src/api/docs/openapi-generator';

const OUTPUT_DIR = path.join(__dirname, '../docs/api');
const YAML_PATH = path.join(OUTPUT_DIR, 'openapi.yaml');
const JSON_PATH = path.join(OUTPUT_DIR, 'openapi.json');

async function generateFiles() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📚 Generating OpenAPI Documentation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Generate OpenAPI spec
    console.log('⏳ Generating OpenAPI specification...');
    const spec = generateOpenAPISpec();

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Write YAML file
    console.log(`📝 Writing YAML file: ${YAML_PATH}`);
    const yamlContent = YAML.stringify(spec);
    fs.writeFileSync(YAML_PATH, yamlContent, 'utf-8');

    // Write JSON file
    console.log(`📝 Writing JSON file: ${JSON_PATH}`);
    const jsonContent = JSON.stringify(spec, null, 2);
    fs.writeFileSync(JSON_PATH, jsonContent, 'utf-8');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ OpenAPI Documentation Generated');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n📄 Files created:`);
    console.log(`   - ${YAML_PATH}`);
    console.log(`   - ${JSON_PATH}`);
    console.log(`\n🌐 View documentation:`);
    console.log(`   - Start server: npm run dev:api`);
    console.log(`   - Open browser: http://localhost:3000/docs`);
    console.log(`\n📦 Import to Postman:`);
    console.log(`   - Import ${JSON_PATH} into Postman`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Error generating OpenAPI documentation:', error);
    process.exit(1);
  }
}

// Run
generateFiles();