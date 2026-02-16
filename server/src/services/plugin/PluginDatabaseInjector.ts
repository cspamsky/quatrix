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
      // Check if directory exists first
      try {
        await fs.access(dir);
      } catch {
        // Directory doesn't exist, which is fine - just skip it
        return;
      }

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

      const hostKeys = ['host', 'Host', 'Hostname', 'Server', 'DatabaseHost', 'db_host'];
      const userKeys = ['user', 'User', 'Username', 'username', 'DatabaseUser', 'db_user'];
      const passKeys = [
        'pass',
        'Pass',
        'password',
        'Password',
        'passwd',
        'DatabasePassword',
        'db_pass',
      ];
      const nameKeys = [
        'name',
        'Name',
        'database',
        'Database',
        'dbname',
        'DBName',
        'DatabaseName',
        'db_name',
      ];
      const portKeys = ['port', 'Port', 'DatabasePort', 'db_port'];
      const typeKeys = ['DatabaseType', 'DbType', 'Type', 'type', 'db_type'];

      // Common patterns for plugin configs
      const searchAndReplace = (obj: Record<string, unknown>) => {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;

        // Count how many database-like keys exist in this object
        // Also count empty strings as potential injection targets
        let matchCount = 0;
        if (
          hostKeys.some(
            (k) => obj[k] !== undefined && (typeof obj[k] === 'string' || obj[k] === '')
          )
        )
          matchCount++;
        if (
          userKeys.some(
            (k) => obj[k] !== undefined && (typeof obj[k] === 'string' || obj[k] === '')
          )
        )
          matchCount++;
        if (
          passKeys.some(
            (k) => obj[k] !== undefined && (typeof obj[k] === 'string' || obj[k] === null)
          )
        )
          matchCount++;
        if (
          nameKeys.some(
            (k) => obj[k] !== undefined && (typeof obj[k] === 'string' || obj[k] === '')
          )
        )
          matchCount++;

        // If it looks like a database config (at least 2 matching keys), inject!
        if (matchCount >= 2) {
          for (const hk of hostKeys)
            if (obj[hk] !== undefined) {
              // Handle combined host:port format (e.g., "127.0.0.1:3306")
              const currentValue = obj[hk] as string;
              if (currentValue && currentValue.includes(':')) {
                // Keep the port from the original value if it exists
                obj[hk] = `${creds.host}:${creds.port}`;
              } else {
                obj[hk] = creds.host;
              }
              modified = true;
            }
          for (const uk of userKeys)
            if (obj[uk] !== undefined) {
              obj[uk] = creds.user;
              modified = true;
            }
          for (const pk of passKeys)
            if (obj[pk] !== undefined) {
              obj[pk] = creds.password;
              modified = true;
            }
          for (const nk of nameKeys)
            if (obj[nk] !== undefined) {
              obj[nk] = creds.database;
              modified = true;
            }
          for (const prtk of portKeys)
            if (obj[prtk] !== undefined) {
              const p = parseInt(creds.port.toString());
              obj[prtk] = typeof obj[prtk] === 'string' ? p.toString() : p;
              modified = true;
            }
          // Auto-switch DatabaseType from SQLite to MySQL when injecting credentials
          for (const tk of typeKeys)
            if (obj[tk] !== undefined) {
              const currentType = (obj[tk] as string)?.toLowerCase();
              if (currentType === 'sqlite' || currentType === 'mysql') {
                obj[tk] = 'MySQL';
                modified = true;
              }
            }
        }

        // Recursive search
        for (const k in obj) {
          if (obj[k] && typeof obj[k] === 'object') {
            searchAndReplace(obj[k] as Record<string, unknown>);
          }
        }
      };

      searchAndReplace(json);

      if (modified) {
        await fs.writeFile(filePath, JSON.stringify(json, null, 2));
        console.log(`[INJECTOR] Injected credentials into JSON: ${path.basename(filePath)}`);
      }
    } catch {
      // Not a valid JSON or other error, skip
    }
  }

  private async injectToml(filePath: string, creds: DatabaseCredentials): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = toml.parse(content) as Record<string, unknown>;

      let modified = false;

      const hostKeys = ['host', 'Host', 'DatabaseHost'];
      const userKeys = ['user', 'User', 'DatabaseUser'];
      const passKeys = ['password', 'Password', 'DatabasePassword'];
      const nameKeys = ['database', 'Database', 'DatabaseName'];
      const portKeys = ['port', 'Port', 'DatabasePort'];

      const searchAndReplace = (obj: Record<string, unknown>) => {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;

        let matchCount = 0;
        if (hostKeys.some((k) => obj[k] !== undefined)) matchCount++;
        if (userKeys.some((k) => obj[k] !== undefined)) matchCount++;
        if (passKeys.some((k) => obj[k] !== undefined)) matchCount++;

        if (matchCount >= 2) {
          for (const k of hostKeys)
            if (obj[k] !== undefined) {
              obj[k] = creds.host;
              modified = true;
            }
          for (const k of userKeys)
            if (obj[k] !== undefined) {
              obj[k] = creds.user;
              modified = true;
            }
          for (const k of passKeys)
            if (obj[k] !== undefined) {
              obj[k] = creds.password;
              modified = true;
            }
          for (const k of nameKeys)
            if (obj[k] !== undefined) {
              obj[k] = creds.database;
              modified = true;
            }
          for (const k of portKeys)
            if (obj[k] !== undefined) {
              const p = parseInt(creds.port.toString());
              obj[k] = typeof obj[k] === 'string' ? p.toString() : p;
              modified = true;
            }
        }

        for (const k in obj) {
          if (obj[k] && typeof obj[k] === 'object') {
            searchAndReplace(obj[k] as Record<string, unknown>);
          }
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

      // SourceMod databases.cfg style and flat prefixes
      const replacers = [
        {
          regex: /"(host|Host|DatabaseHost)"\s+"[^"]*"/gi,
          replacement: (m: string, p1: string) => `"${p1}" "${creds.host}"`,
        },
        {
          regex: /"(database|Database|DatabaseName|DatabaseName)"\s+"[^"]*"/gi,
          replacement: (m: string, p1: string) => `"${p1}" "${creds.database}"`,
        },
        {
          regex: /"(user|User|DatabaseUser)"\s+"[^"]*"/gi,
          replacement: (m: string, p1: string) => `"${p1}" "${creds.user}"`,
        },
        {
          regex: /"(pass|Pass|password|Password|DatabasePassword)"\s+"[^"]*"/gi,
          replacement: (m: string, p1: string) => `"${p1}" "${creds.password}"`,
        },
        {
          regex: /"(port|Port|DatabasePort)"\s+"[^"]*"/gi,
          replacement: (m: string, p1: string) => `"${p1}" "${creds.port}"`,
        },
      ];

      for (const { regex, replacement } of replacers) {
        if (regex.test(content)) {
          content = content.replace(
            regex,
            replacement as (substring: string, ...args: any[]) => string
          );
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
