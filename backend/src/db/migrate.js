import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');

async function runMigrations() {
  try {
    console.log('Running migrations...');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`  • Running ${file}...`);
      await db.any(sql); // <-- Changed this from db.none to db.any!
      console.log(`    ✓ Done`);
    }
    
    console.log('\n✓ All migrations completed');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigrations();
