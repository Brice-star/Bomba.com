const fs = require('fs');
const mysql = require('mysql2');

// Paramètres Railway
const connection = mysql.createConnection({
  host: 'gondola.proxy.rlwy.net',
  port: 16820,
  user: 'root',
  password: 'xvVFwZMOdEpJMPYRbFrobapgtbSYuhJT',
  database: 'railway',
  multipleStatements: true
});

const sql = fs.readFileSync('./config/init_database.sql', 'utf8');

// CLI flags
const args = process.argv.slice(2);
const FORCE = args.includes('--force') || args.includes('-f');
const DRY = args.includes('--dry-run') || args.includes('-n');
let LOG_PATH = null;
for (const a of args) {
  if (a.startsWith('--log=')) LOG_PATH = a.split('=')[1];
}

function writeLog(line) {
  const msg = `[${new Date().toISOString()}] ${line}\n`;
  if (LOG_PATH) fs.appendFileSync(LOG_PATH, msg);
}

// Extract table names from CREATE TABLE and ALTER TABLE statements
function extractTableNames(sqlText) {
  const names = new Set();
  const createRe = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+`?(\w+)`?/gi;
  const alterRe = /ALTER\s+TABLE\s+`?(\w+)`?/gi;
  let m;
  while ((m = createRe.exec(sqlText))) names.add(m[1]);
  while ((m = alterRe.exec(sqlText))) names.add(m[1]);
  return Array.from(names);
}

// split statements on semicolon followed by newline or EOF (keeps multi-line statements intact)
function splitStatements(sqlText) {
  return sqlText
    .split(/;\r?\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function runImport() {
  try {
    await connection.promise().connect();
    console.log('Connecté à Railway MySQL');

    const tables = extractTableNames(sql);

    if (DRY) {
      console.log('Dry-run mode: the following tables would be affected:', tables);
      writeLog && writeLog(`Dry-run tables: ${tables.join(', ')}`);
      const statements = splitStatements(sql);
      console.log('Statements that would run:', statements.length);
      return;
    }

    if (FORCE) {
      console.log('Force mode enabled: truncating tables before import. Disabling FK checks temporarily.');
      writeLog && writeLog('Force mode: truncating tables');
      await connection.promise().query('SET FOREIGN_KEY_CHECKS = 0;');
      for (const t of tables) {
        try {
          // TRUNCATE is faster and resets auto_increment
          await connection.promise().query(`TRUNCATE TABLE \`${t}\`;`);
          console.log(`Truncated table ${t}`);
          writeLog && writeLog(`Truncated table ${t}`);
        } catch (err) {
          // log and continue; some tables may not exist
          console.warn(`Could not truncate table ${t}:`, err.message);
          writeLog && writeLog(`Could not truncate table ${t}: ${err.message}`);
        }
      }
      await connection.promise().query('SET FOREIGN_KEY_CHECKS = 1;');
    }

    const statements = splitStatements(sql);

    for (const stmt of statements) {
      try {
        await connection.promise().query(stmt + ';');
      } catch (err) {
        if (err && err.code === 'ER_DUP_ENTRY') {
          console.warn('Ignored duplicate entry error while running a statement:', err.sqlMessage || err.message);
          writeLog && writeLog(`Ignored duplicate entry: ${err.sqlMessage || err.message}`);
        } else {
          console.error('Statement failed:', stmt.slice(0, 120).replace(/\n/g, ' '));
          writeLog && writeLog(`Statement failed: ${err.message}`);
          throw err;
        }
      }
    }

    console.log('Import terminé !');
    writeLog && writeLog('Import terminé');
  } catch (err) {
    console.error('Import échoué :', err);
    writeLog && writeLog(`Import échoué: ${err.message}`);
  } finally {
    connection.end();
  }
}

runImport();
