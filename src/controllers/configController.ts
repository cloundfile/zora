import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  loadConfig,
  updateConfig,
  type ProviderName,
  type ZoraConfig,
} from '../setup/configStore';
import { createLLM } from '../llm/llmFactory';
import { defaultModel } from '../llm/llmFactory';

const PROVIDERS: { name: string; value: ProviderName }[] = [
  { name: 'Ollama (Local)', value: 'ollama' },
  { name: 'Gemini (Google)', value: 'gemini' },
  { name: 'Claude (Anthropic)', value: 'claude' },
  { name: 'ChatGPT (OpenAI)', value: 'openai' },
];

export async function configCommand(): Promise<void> {
  let running = true;
  while (running) {
    const config = loadConfig();
    console.log(chalk.cyan('\nConfigurações atuais:'));
    console.log(`  • Provedor: ${config.provider}`);
    console.log(`  • Modelo: ${config.model ?? defaultModel(config.provider)}`);
    console.log(`  • API Key: ${config.apiKey ? '••••••••' + config.apiKey.slice(-4) : 'não definida'}`);

    const { action } = await inquirer.prompt<{ action: string }>([
      {
        type: 'list',
        name: 'action',
        message: 'O que deseja alterar?',
        choices: [
          { name: 'Provedor (LLM Local/Cloud)', value: 'provider' },
          { name: 'Chave de API', value: 'apikey' },
          { name: 'Modelo ativo', value: 'model' },
          { name: 'Salvar e sair', value: 'done' },
        ],
        loop: false,
      },
    ]);

    switch (action) {
      case 'provider':
        await changeProvider();
        break;
      case 'apikey':
        await changeApiKey();
        break;
      case 'model':
        await changeModel();
        break;
      case 'done':
      default:
        running = false;
    }
  }
}

async function changeProvider(): Promise<void> {
  const { provider } = await inquirer.prompt<{ provider: ProviderName }>([
    {
      type: 'list',
      name: 'provider',
      message: 'Selecione o provedor:',
      choices: PROVIDERS,
    },
  ]);

  const next: Partial<ZoraConfig> = { provider };

  if (provider === 'ollama') {
    next.apiKey = undefined;
  } else if (!loadConfig().apiKey) {
    const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
      {
        type: 'password',
        name: 'apiKey',
        message: `Chave de API do ${provider}:`,
        validate: (v: string) => (v.trim() ? true : 'A chave é obrigatória para provedores cloud.'),
      },
    ]);
    next.apiKey = apiKey.trim();
  }

  try {
    const llm = createLLM({
      provider,
      apiKey: next.apiKey,
      model: next.model ?? loadConfig().model,
    });
    await llm.testConnection();
    console.log(chalk.green('Provedor validado com sucesso.'));
    next.model = llm.model;
  } catch (error) {
    console.log(chalk.yellow('Não foi possível validar a conexão agora; configuração salva mesmo assim.'));
  }

  const saved = updateConfig(next);
  console.log(chalk.green(`Provedor alterado para ${saved.provider}.`));
}

async function changeApiKey(): Promise<void> {
  const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
    {
      type: 'password',
      name: 'apiKey',
      message: 'Nova chave de API (deixe vazio para remover):',
    },
  ]);
  updateConfig({ apiKey: apiKey.trim() || undefined });
  console.log(chalk.green('Chave de API atualizada.'));
}

async function changeModel(): Promise<void> {
  const config = loadConfig();
  const { model } = await inquirer.prompt<{ model: string }>([
    {
      type: 'input',
      name: 'model',
      message: `Modelo ativo (atual: ${config.model ?? defaultModel(config.provider)}):`,
      default: config.model ?? defaultModel(config.provider),
    },
  ]);
  updateConfig({ model: model.trim() || undefined });
  console.log(chalk.green('Modelo atualizado.'));
}