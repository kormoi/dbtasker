const { Client } = require('pg');




const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres', // Connect to the default db first
  password: 'your_password',
  port: 5432,
});

async function test() {
  await client.connect();
  const res = await client.query('SELECT NOW()');
  console.log("Postgres Time:", res.rows[0].now);
  await client.end();
}
/**
 * Connects to Postgres and returns the Locale and Encoding settings.
 */
async function getPostgresLocale(config) {
  const client = new Client(config);
  
  try {
    await client.connect();

    // We query three specific system settings:
    // 1. server_encoding: The character set (e.g., UTF8)
    // 2. lc_collate: The alphabetical sorting rules
    // 3. lc_ctype: The character classification (language)
    const query = `
      SELECT 
        current_setting('server_encoding') as encoding,
        current_setting('lc_collate') as collate,
        current_setting('lc_ctype') as ctype
    `;

    const res = await client.query(query);
    
    return {
      success: true,
      data: res.rows[0]
    };

  } catch (error) {
    console.error("Error fetching Postgres settings:", error.message);
    return { success: false, error: error.message };
  } finally {
    // Always close the client!
    await client.end();
  }
}