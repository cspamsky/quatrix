
import db from './db.js';

console.log("Checking database tables...");

try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("Tables:", tables);

  for (const table of tables) {
    const tableName = (table as any).name;
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    console.log(`Columns in ${tableName}:`, columns);
  }
} catch (error) {
  console.error("Error inspecting DB:", error);
}
