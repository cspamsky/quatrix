import fs from 'fs';
import path from 'path';

export interface EggVariable {
  name: string;
  description: string;
  env_variable: string;
  default_value: string;
  user_viewable: boolean;
  user_editable: boolean;
  rules: string;
}

export interface PterodactylEgg {
  name: string;
  description: string;
  features: string[] | null;
  docker_images: Record<string, string> | string[];
  startup: string;
  config: {
    files: Record<string, unknown> | string;
    startup: Record<string, unknown> | string;
    stop: string;
    logs?: Record<string, unknown> | string;
  };
  variables: EggVariable[];
  scripts?: {
    installation: {
      script: string;
      container: string;
      entrypoint: string;
    };
  };
}

class EggRunnerService {
  private eggsDir = path.join(process.cwd(), 'data', 'eggs');

  constructor() {
    if (!fs.existsSync(this.eggsDir)) {
      fs.mkdirSync(this.eggsDir, { recursive: true });
    }
  }

  /**
   * List all available eggs in the data/eggs directory
   */
  public listAvailableEggs(): string[] {
    if (!fs.existsSync(this.eggsDir)) return [];
    return fs.readdirSync(this.eggsDir)
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
  }

  /**
   * Load and parse a specific egg by its ID (filename without extension)
   */
  public loadEgg(eggId: string): PterodactylEgg {
    const eggPath = path.join(this.eggsDir, `${eggId}.json`);
    if (!fs.existsSync(eggPath)) {
      throw new Error(`Egg ${eggId} not found at path: ${eggPath}`);
    }

    const content = fs.readFileSync(eggPath, 'utf8');
    try {
      const egg = JSON.parse(content) as PterodactylEgg;
      this.ensureParsedConfig(egg);
      return egg;
    } catch (error) {
      throw new Error(`Failed to parse egg ${eggId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Pterodactyl v2 exports often have JSON strings inside the config object.
   * This ensures they are parsed into objects if needed.
   */
  private ensureParsedConfig(egg: PterodactylEgg): void {
    if (typeof egg.config.files === 'string') {
      try { egg.config.files = JSON.parse(egg.config.files); } catch { egg.config.files = {}; }
    }
    if (typeof egg.config.startup === 'string') {
      try { egg.config.startup = JSON.parse(egg.config.startup); } catch { egg.config.startup = {}; }
    }
    if (egg.config.logs && typeof egg.config.logs === 'string') {
      try { egg.config.logs = JSON.parse(egg.config.logs); } catch { egg.config.logs = {}; }
    }
    // Also parse scripts if they are strings (Pterodactyl JSON exports)
    if (egg.scripts && typeof egg.scripts === 'string') {
      try { (egg as any).scripts = JSON.parse(egg.scripts); } catch { (egg as any).scripts = undefined; }
    }
  }

  /**
   * Resolves the startup command template with provided variables
   */
  public resolveStartupCommand(egg: PterodactylEgg, userVariables: Record<string, string>): string {
    let command = egg.startup;

    // Use all provided variables (system + user + egg defaults)
    const variablesMap: Record<string, string> = { ...userVariables };
    
    // Ensure egg defaults are present if not overridden
    egg.variables.forEach(v => {
      if (variablesMap[v.env_variable] === undefined) {
        variablesMap[v.env_variable] = v.default_value;
      }
    });

    // Replace {{VARIABLE_NAME}} in the startup string
    command = command.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const trimmedVar = varName.trim();
      return variablesMap[trimmedVar] !== undefined ? variablesMap[trimmedVar] : match;
    });

    return command;
  }

  /**
   * Maps egg variables to environment variables for the process
   */
  public getEnvironmentVariables(egg: PterodactylEgg, userVariables: Record<string, string>): Record<string, string> {
    const env: Record<string, string> = { ...userVariables };
    
    egg.variables.forEach(v => {
      if (env[v.env_variable] === undefined) {
        env[v.env_variable] = v.default_value;
      }
    });

    return env;
  }

  /**
   * Imports a new egg and saves it to the eggs directory
   * @returns The generated egg ID
   */
  public importEgg(egg: PterodactylEgg): string {
    if (!egg.name || !egg.startup) {
      throw new Error('Invalid egg data: name and startup are required');
    }

    this.ensureParsedConfig(egg);
    const eggId = egg.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const targetPath = path.join(this.eggsDir, `${eggId}.json`);

    fs.writeFileSync(targetPath, JSON.stringify(egg, null, 2));
    return eggId;
  }
}

export const eggRunnerService = new EggRunnerService();
