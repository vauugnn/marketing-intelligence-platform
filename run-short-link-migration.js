const { Client } = require('pg');
require('dotenv').config({ path: './packages/backend/.env' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
}

const client = new Client({
    connectionString: connectionString,
});

async function runMigration() {
    try {
        await client.connect();
        console.log('Connected to database');

        const sql = `
      CREATE TABLE IF NOT EXISTS short_links (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        code VARCHAR(10) NOT NULL UNIQUE,
        original_url TEXT NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        clicks INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_short_links_code ON short_links(code);
    `;

        await client.query(sql);
        console.log('Migration applied successfully');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
