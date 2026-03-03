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
    files: Record<string, unknown>;
    startup: Record<string, unknown>;
    stop: string;
  };
  variables: EggVariable[];
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
      return JSON.parse(content) as PterodactylEgg;
    } catch (error) {
      throw new Error(`Failed to parse egg ${eggId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Resolves the startup command template with provided variables
   */
  public resolveStartupCommand(egg: PterodactylEgg, userVariables: Record<string, string>): string {
    let command = egg.startup;

    // First, map all variables to their env names
    const variablesMap: Record<string, string> = {};
    egg.variables.forEach(v => {
      // Use user provided value, or default value
      const val = userVariables[v.env_variable] ?? v.default_value;
      variablesMap[v.env_variable] = val;
    });

    // Replace {{VARIABLE_NAME}} in the startup string
    // Pterodactyl usually uses {{ENV_VARIABLE}} or sometimes just the variable name
    // We'll support the standard {{VAR}} pattern
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
    const env: Record<string, string> = {};
    
    egg.variables.forEach(v => {
      const val = userVariables[v.env_variable] ?? v.default_value;
      env[v.env_variable] = val;
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

    const eggId = egg.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const targetPath = path.join(this.eggsDir, `${eggId}.json`);

    fs.writeFileSync(targetPath, JSON.stringify(egg, null, 2));
    return eggId;
  }
}

export const eggRunnerService = new EggRunnerService();
