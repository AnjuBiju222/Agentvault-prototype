const path = require('node:path');
const net = require('node:net');
const Database = require('better-sqlite3');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
const files = [
 ['verifier.db', ['agents','nonces','spends','holds']],
 ['facilitator.db', ['settlements','accounts']],
 ['shop.db', ['intents','fulfilled']],
 ['.data/dashboard.db', ['shopping_plans','operations','profiles']],
];
async function assertStopped(port) {
 await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once('error', () => reject(new Error(`Port ${port} is still in use. Stop the demo services before clearing data.`)));
  probe.listen(port, '127.0.0.1', () => probe.close(resolve));
 });
}
async function main() {
 if (!process.argv.includes('--confirm')) throw new Error('This erases all local demo records. Stop the services, then pass --confirm to proceed.');
 for (const port of [3000,3001,4000,4001,Number(process.env.UI_PORT || 8080)]) await assertStopped(port);
 for (const [relative, tables] of files) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) continue;
  const db = new Database(file, {fileMustExist:true});
  db.transaction(() => {
   for (const table of tables) db.prepare(`DELETE FROM ${table}`).run();
   if (relative === 'verifier.db') db.prepare('UPDATE merchants SET verifications=0').run();
   if (db.prepare("SELECT 1 FROM sqlite_master WHERE name='sqlite_sequence'").get()) db.prepare('DELETE FROM sqlite_sequence').run();
  })();
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.exec('VACUUM');
  db.pragma('wal_checkpoint(TRUNCATE)');
  console.log(relative + ': ' + tables.map(table => `${table}=${db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n}`).join(', '));
  db.close();
 }
 console.log('All local demo data erased. Merchant configuration and product catalogs preserved.');
}
main().catch(error => {console.error(error.message);process.exitCode=1;});
