import chalk from 'chalk';

const NPM_REGISTRY = 'https://registry.npmjs.org/-/package/@inneobr%2Fzora/dist-tags';

let checked = false;

export async function checkVersion(): Promise<void> {
  if (checked) return;
  checked = true;
  try {
    const pkg = require('../../package.json') as { version: string };
    const local = pkg.version;
    const res = await fetch(NPM_REGISTRY, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return;
    const tags = (await res.json()) as { latest?: string };
    const latest = tags.latest;
    if (!latest) return;

    const localParts = local.split('.').map(Number);
    const remoteParts = latest.split('.').map(Number);
    const isNewer = latest !== local && remoteParts.every((p, i) => p >= (localParts[i] ?? 0));
    if (isNewer) {
      console.log(chalk.bgBlue.whiteBright(
        `💡 Uma nova versão do Zora (${latest}) está disponível! Atualize executando: npm install -g @inneobr/zora`,
      ));
    }
  } catch {
    // falha silenciosa: não trava a experiência do usuário
  }
}