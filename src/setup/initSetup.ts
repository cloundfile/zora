import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadConfig, saveConfig, hasConfig, type ProviderName, type ZoraConfig } from './configStore';
import { OllamaProvider } from '../llm/providers/ollamaProvider';
import { createLLM } from '../llm/llmFactory';

const OLLAMA_URL = 'http://localhost:11434';
const OLLAMA_MODELS = ['gemma', 'mistral', 'llama3'];

export async function ensureSetup(): Promise<ZoraConfig> {
  if (hasConfig()) return loadConfig();
  return runInitialSetup();
}

export async function runInitialSetup(): Promise<ZoraConfig> {
  console.log(chalk.cyan('\nBem-vindo ao Zora! Vamos configurar sua LLM.\n'));

  const ollamaActive = await OllamaProvider.isActive(OLLAMA_URL);
  if (!ollamaActive) {
    console.log(chalk.yellow('Ollama não detectado em ' + OLLAMA_URL + ' (requisito recomendado).'));
    const { install } = await inquirer.prompt<{ install: boolean }>([
      {
        type: 'confirm',
        name: 'install',
        message: 'Deseja que o Zora instale o Ollama automaticamente?',
        default: true,
      },
    ]);

    if (install) {
      await installOllama();
      return setupWithOllama();
    }

    console.log(chalk.dim('Sem o Ollama, escolha uma LLM online.'));
    return setupWithOnlineProvider();
  }

  console.log(chalk.green('Ollama detectado! 🎉'));
  return setupWithOllama();
}

async function setupWithOllama(): Promise<ZoraConfig> {
  const provider = new OllamaProvider('gemma', OLLAMA_URL);
  let available: string[] = [];
  try {
    available = await provider.listModels();
  } catch {
    available = [];
  }

  let model = 'gemma';
  if (available.length === 0) {
    console.log(chalk.yellow('Nenhum modelo de chat ativo encontrado.'));
    const { modelChoice } = await inquirer.prompt<{ modelChoice: string }>([
      {
        type: 'list',
        name: 'modelChoice',
        message: 'Escolha um modelo para baixar:',
        choices: OLLAMA_MODELS,
      },
    ]);
    await pullModel(modelChoice);
    model = modelChoice;
  } else {
    const { modelChoice } = await inquirer.prompt<{ modelChoice: string }>([
      {
        type: 'list',
        name: 'modelChoice',
        message: 'Escolha o modelo de chat:',
        choices: available,
      },
    ]);
    model = modelChoice;
  }

  const config: ZoraConfig = {
    provider: 'ollama',
    model,
    developer: '@inneobr',
    contact: 'inneobr@gmail.com',
    license: 'MIT',
  };
  saveConfig(config);
  console.log(chalk.green('Configuração salva em ~/.zorarc.'));
  return config;
}

async function setupWithOnlineProvider(): Promise<ZoraConfig> {
  const { providerName } = await inquirer.prompt<{ providerName: ProviderName }>([
    {
      type: 'list',
      name: 'providerName',
      message: 'Selecione a LLM online:',
      choices: [
        { name: 'Gemini (Google)', value: 'gemini' },
        { name: 'Claude (Anthropic)', value: 'claude' },
        { name: 'ChatGPT (OpenAI)', value: 'openai' },
      ],
    },
  ]);

  const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
    {
      type: 'password',
      name: 'apiKey',
      message: 'Informe sua chave de API (api_key):',
      validate: (v: string) => (v.trim() ? true : 'A chave é obrigatória.'),
    },
  ]);

  const provider = createLLM({ provider: providerName, apiKey: apiKey.trim() });
  try {
    await provider.testConnection();
    console.log(chalk.green('Conexão testada com sucesso!'));
  } catch (error) {
    console.error(chalk.red('Falha no teste de conexão: ' + (error as Error).message));
    return runInitialSetup();
  }

  const config: ZoraConfig = {
    provider: providerName,
    apiKey: apiKey.trim(),
    model: provider.model,
    developer: '@inneobr',
    contact: 'inneobr@gmail.com',
    license: 'MIT',
  };
  saveConfig(config);
  console.log(chalk.green('Configuração salva em ~/.zorarc.'));
  return config;
}

async function installOllama(): Promise<void> {
  console.log(chalk.dim('Instalando Ollama (curl | sh)...'));
  const { execSync } = await import('child_process');
  try {
    execSync('curl -fsSL https://ollama.com/install.sh | sh', { stdio: 'inherit', timeout: 300000 });
    console.log(chalk.green('Ollama instalado! Execute `ollama serve` se necessário.'));
  } catch (error) {
    console.error(chalk.red('Falha ao instalar Ollama: ' + (error as Error).message));
  }
}

async function pullModel(model: string): Promise<void> {
  console.log(chalk.dim(`Baixando modelo ${model}...`));
  const { execSync } = await import('child_process');
  try {
    execSync(`ollama pull ${model}`, { stdio: 'inherit', timeout: 600000 });
    console.log(chalk.green(`Modelo ${model} pronto!`));
  } catch (error) {
    console.error(chalk.red('Falha ao baixar modelo: ' + (error as Error).message));
  }
}