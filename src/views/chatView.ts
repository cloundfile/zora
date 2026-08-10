import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import type { LLMProvider } from '../llm/types';
import { answerQuestion } from '../services/chatService';
import { clearProcessing, GREETING, printAgentMessage, printProcessing, printUserMessage } from './output';

export const EXIT_COMMANDS = new Set(['sair', 'exit', 'quit', '/sair', '/exit']);

export async function runChatLoop(llm: LLMProvider, sessionId: string): Promise<void> {
  const rl = readline.createInterface({ input, output });

  rl.on('SIGINT', () => {
    rl.close();
    process.exit(0);
  });

  while (true) {
    let inputText: string;
    try {
      inputText = (await rl.question('\n' + promptLabel())).trim();
    } catch {
      inputText = 'sair';
    }
    if (!inputText) continue;
    if (EXIT_COMMANDS.has(inputText.toLowerCase())) break;
    if (/\b(ajuda|help)\b/i.test(inputText)) {
      showInlineHelp();
      continue;
    }

    printUserMessage(inputText);
    printProcessing();
    const answer = await answerQuestion(llm, sessionId, inputText);
    clearProcessing();
    printAgentMessage(answer);
  }

  rl.close();
}

function promptLabel(): string {
  return `${GREETING} `;
}

function showInlineHelp(): void {
  console.log('\nComandos disponíveis no chat:');
  console.log('  sair / exit / quit — encerra o chat');
  console.log('  ajuda / help — mostra esta ajuda');
  console.log('  digite um CNPJ — busca dados da empresa\n');
}