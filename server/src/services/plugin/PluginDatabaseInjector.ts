import fs from 'fs/promises';
import path from 'path';
import * as toml from 'smol-toml';
import type { DatabaseCredentials } from '../../types/index.js';

/**
 * PluginDatabaseInjector
 * Responsible for finding and injecting database credentials into plugin configurations.
 */
export class PluginDatabaseInjector {
  /**
   * Scans and injects credentials into config files in a directory
   */
  async injectIntoDirectory(dir: string, creds: DatabaseCredentials): Promise<void> {
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);

        if (item.isDirectory()) {
          // Recursive scan
          await this.injectIntoDirectory(fullPath, creds);
          continue;
        }

        const ext = path.extname(item.name).toLowerCase();
        const fileName = item.name.toLowerCase();

        if (ext === '.json') {
          await this.injectJson(fullPath, creds);
        } else if (ext === '.toml') {
          await this.injectToml(fullPath, creds);
        } else if (ext === '.cfg' || fileName === 'databases.cfg') {
          await this.injectCfg(fullPath, creds);
        }
      }
    } catch (err) {
      console.error(`[INJECTOR] Failed to scan directory ${dir}:`, err);
    }
  }

  private async injectJson(filePath: string, creds: DatabaseCredentials): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const json = JSON.parse(content);

      let modified = false;

      // Common patterns for plugin configs
      const searchAndReplace = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;

        // Pattern 1: SimpleAdmin format or similar
        // { "Database": { "Host": "...", "User": "...", "Password": "...", "Name": "..." } }
        const dbKeys = [
          'database',
          'Database',
          'db',
          'DB',
          'mysql',
          'MySQL',
          'Connection',
          'connection',
        ];

        for (const key of dbKeys) {
          if (obj[key] && typeof obj[key] === 'object') {
            const db = obj[key];
            const hostKeys = ['host', 'Host', 'Hostname', 'Server'];
            const userKeys = ['user', 'User', 'Username', 'username'];
            const passKeys = ['pass', 'Pass', 'password', 'Password', 'Password', 'passwd'];
            const nameKeys = ['name', 'Name', 'database', 'Database', 'dbname', 'DBName'];
            const portKeys = ['port', 'Port'];

            for (const hk of hostKeys)
              if (db[hk] !== undefined) {
                db[hk] = creds.host;
                modified = true;
              }
            for (const uk of userKeys)
              if (db[uk] !== undefined) {
                db[uk] = creds.user;
                modified = true;
              }
            for (const pk of passKeys)
              if (db[pk] !== undefined) {
                db[pk] = creds.password;
                modified = true;
              }
            for (const nk of nameKeys)
              if (db[nk] !== undefined) {
                db[nk] = creds.database;
                modified = true;
              }
            for (const prtk of portKeys)
              if (db[prtk] !== undefined) {
                db[prtk] = creds.port;
                modified = true;
              }
          }
        }

        // Recursive search
        for (const k in obj) {
          if (typeof obj[k] === 'object') searchAndReplace(obj[k]);
        }
      };

      searchAndReplace(json);

      if (modified) {
        await fs.writeFile(filePath, JSON.stringify(json, null, 2));
        console.log(`[INJECTOR] Injected credentials into JSON: ${path.basename(filePath)}`);
      }
    } catch (err) {
      // Not a valid JSON or other error, skip
    }
  }

  private async injectToml(filePath: string, creds: DatabaseCredentials): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = toml.parse(content) as any;

      let modified = false;

      const searchAndReplace = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;

        const dbKeys = ['database', 'Database', 'db', 'DB', 'mysql', 'MySQL'];
        for (const key of dbKeys) {
          if (obj[key] && typeof obj[key] === 'object') {
            const db = obj[key];
            if (db.host !== undefined || db.Host !== undefined) {
              if (db.host !== undefined) db.host = creds.host;
              if (db.Host !== undefined) db.Host = creds.host;
              if (db.user !== undefined) db.user = creds.user;
              if (db.User !== undefined) db.User = creds.user;
              if (db.password !== undefined) db.password = creds.password;
              if (db.Password !== undefined) db.Password = creds.password;
              if (db.database !== undefined) db.database = creds.database;
              if (db.Database !== undefined) db.Database = creds.database;
              if (db.port !== undefined) db.port = creds.port;
              if (db.Port !== undefined) db.Port = creds.port;
              modified = true;
            }
          }
        }

        for (const k in obj) {
          if (typeof obj[k] === 'object') searchAndReplace(obj[k]);
        }
      };

      searchAndReplace(data);

      if (modified) {
        await fs.writeFile(filePath, toml.stringify(data));
        console.log(`[INJECTOR] Injected credentials into TOML: ${path.basename(filePath)}`);
      }
    } catch (err) {
      // Skip
    }
  }

  private async injectCfg(filePath: string, creds: DatabaseCredentials): Promise<void> {
    try {
      let content = await fs.readFile(filePath, 'utf-8');
      let modified = false;

      // SourceMod databases.cfg style
      // We look for blocks and replace values
      const replacers = [
        { regex: /"host"\s+"[^"]*"/gi, replacement: `"host" "${creds.host}"` },
        { regex: /"database"\s+"[^"]*"/gi, replacement: `"database" "${creds.database}"` },
        { regex: /"user"\s+"[^"]*"/gi, replacement: `"user" "${creds.user}"` },
        { regex: /"pass"\s+"[^"]*"/gi, replacement: `"pass" "${creds.password}"` },
        { regex: /"port"\s+"[^"]*"/gi, replacement: `"port" "${creds.port}"` },
      ];

      for (const { regex, replacement } of replacers) {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          modified = true;
        }
      }

      if (modified) {
        await fs.writeFile(filePath, content);
        console.log(`[INJECTOR] Injected credentials into CFG: ${path.basename(filePath)}`);
      }
    } catch (err) {
      // Skip
    }
  }
}

export const pluginDatabaseInjector = new PluginDatabaseInjector();
