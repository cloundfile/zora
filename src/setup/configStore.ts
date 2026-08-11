import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export type ProviderName = 'ollama' | 'gemini' | 'claude' | 'openai';

export interface ZoraConfig {
  provider: ProviderName;
  apiKey?: string;
  model?: string;
  embedModel?: string;
  developer: string;
  contact: string;
  license: string;
  matches: number;
  history: number;
}

const CONFIG_PATH = path.join(os.homedir(), '.zorarc');

const DEFAULT_CONFIG: ZoraConfig = {
  provider: 'ollama',
  model: 'gemma',
  embedModel: 'nomic-embed-text',
  developer: '@inneobr',
  contact: 'inneobr@gmail.com',
  license: 'MIT',
  matches: 10,
  history: 10,
};

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export function loadConfig(): ZoraConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ZoraConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: ZoraConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export function updateConfig(partial: Partial<ZoraConfig>): ZoraConfig {
  const next = { ...loadConfig(), ...partial };
  saveConfig(next);
  return next;
}

export function hasConfig(): boolean {
  return fs.existsSync(CONFIG_PATH);
}