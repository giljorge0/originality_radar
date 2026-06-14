import pkg from 'pg-promise';
import dotenv from 'dotenv';
dotenv.config();

const pgp = pkg();
const db = pgp({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

db.connect()
  .then(obj => { console.log('✓ Database connected'); obj.done(); })
  .catch(error => { console.error('✗ Database connection failed:', error.message); process.exit(1); });

export default db;
