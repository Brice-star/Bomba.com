const mysql = require('mysql2/promise');

(async () => {
  try {
    const host = process.env.DB_HOST || 'gondola.proxy.rlwy.net';
    const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 16820;
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || process.env.DB_PASS;
    const database = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'railway';

    console.log('Trying to connect to MySQL with: ', { host, port, user, database });

    const conn = await mysql.createConnection({ host, port, user, password, database, connectTimeout: 10000 });
    console.log('Connected to DB');

    const [tables] = await conn.query('SHOW TABLES');
    console.log('Tables:', tables);

    // optional counts
    const [rows] = await conn.query("SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = ?", [database]);
    console.log('Number of tables in schema:', rows[0].c);

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('DB test failed:', err.message || err);
    if (err && err.stack) console.error(err.stack);
    process.exit(1);
  }
})();
