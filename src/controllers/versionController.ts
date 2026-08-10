import os from 'os';
import chalk from 'chalk';

const PKG = require('../../package.json') as {
  name: string;
  version: string;
  author: string;
  license: string;
};

export function versionCommand(): void {
  console.log(chalk.magentaBright.bold(`${PKG.name} v${PKG.version}`));
  console.log(`Desenvolvedor: @inneobr`);
  console.log(`E-mail: inneobr@gmail.com`);
  console.log(`Licença: ${PKG.license}`);
  console.log('');
  console.log(`Sistema: ${os.platform()} ${os.release()} (${os.arch()})`);
  console.log(`Node.js: ${process.version}`);
  console.log(`Usuário: ${os.userInfo().username} (home: ${os.homedir()})`);
}