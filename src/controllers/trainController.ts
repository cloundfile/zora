import chalk from 'chalk';
import inquirer from 'inquirer';
import { initDb, getDb } from '../models/db';
import { migrateSchema, loadVectorExtension } from '../models/schema';
import { buildAndValidateLlm } from './llmHelper';
import { pickFile } from '../services/filePicker';
import { ingestFile } from '../services/ingestion';
import { linkFoundCnpjs } from '../services/cnpjService';
import { getDocumentCount, getChunkCount } from '../models/documentModel';

export async function trainCommand(): Promise<void> {
  initDb();
  migrateSchema();
  loadVectorExtension(getDb());

  const llm = await buildAndValidateLlm();
  const filepath = await pickFile();

  if (!filepath) {
    console.log(chalk.yellow('Nenhum arquivo selecionado.'));
    return;
  }

  console.log(chalk.dim(`Treinando ${filepath}...`));
  const result = await ingestFile(llm, filepath);
  if (result.duplicate) {
    console.log(chalk.yellow(`⚠️ Documento "${result.filename}" já foi treinado anteriormente. Operação ignorada.`));
  } else {
    linkFoundCnpjs(result.documentId, result.cnpjs);
    console.log(chalk.green(`\nDocumento "${result.filename}" treinado!`));
    console.log(`  • Chunks vetorizados: ${result.chunks}`);
    console.log(`  • CNPJs encontrados: ${result.cnpjs.length ? result.cnpjs.join(', ') : 'nenhum'}`);
  }

  const { again } = await inquirer.prompt<{ again: boolean }>([
    {
      type: 'confirm',
      name: 'again',
      message: 'Adicionar mais um documento?',
      default: true,
    },
  ]);
  if (again) {
    await trainCommand();
    return;
  }

  const docs = getDocumentCount();
  const chunks = getChunkCount();
  console.log(chalk.dim(`\nBase: ${docs} documento(s), ${chunks} chunk(s).`));
}