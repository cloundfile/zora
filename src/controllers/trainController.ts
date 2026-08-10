import chalk from 'chalk';
import inquirer from 'inquirer';
import { initDb, getDb } from '../models/db';
import { migrateSchema, loadVectorExtension } from '../models/schema';
import { buildAndValidateLlm } from './llmHelper';
import { pickFiles } from '../services/filePicker';
import { ingestFile } from '../services/ingestion';
import { extrairCnpjs } from '../services/cnpjService';
import { getDocumentCount, getChunkCount } from '../models/documentModel';
import type { LLMProvider } from '../llm/types';
import { ZoraError } from '../errors/zoraErrors';

export async function trainCommand(): Promise<void> {
  initDb();
  migrateSchema();
  loadVectorExtension(getDb());

  const llm = await buildAndValidateLlm();

  let continueLoop = true;
  while (continueLoop) {
    const files = await pickFiles();
    if (files.length === 0) {
      console.log(chalk.yellow('Nenhum arquivo selecionado.'));
    } else {
      await trainFiles(llm, files);
    }

    const { again } = await inquirer.prompt<{ again: boolean }>([
      {
        type: 'confirm',
        name: 'again',
        message: 'Treinar mais documentos?',
        default: true,
      },
    ]);
    continueLoop = again;
  }

  const docs = getDocumentCount();
  const chunks = getChunkCount();
  console.log(chalk.dim(`\nBase: ${docs} documento(s), ${chunks} chunk(s).`));
}

async function trainFiles(llm: LLMProvider, files: string[]): Promise<void> {
  let trained = 0;
  let skipped = 0;
  let failed = 0;

  for (const filepath of files) {
    console.log(chalk.dim(`Treinando ${filepath}...`));
    try {
      const result = await ingestFile(llm, filepath);
      if (result.duplicate) {
        skipped++;
        console.log(chalk.yellow(`  ⚠️ Documento "${result.filename}" já foi treinado anteriormente. Operação ignorada.`));
        continue;
      }
      const cnpjs = extrairCnpjs(result.fullText);
      trained++;
      console.log(chalk.green(`  ✓ Documento "${result.filename}" treinado! Chunks: ${result.chunks}`));
      if (cnpjs.length) {
        console.log(chalk.dim(`    CNPJs: ${cnpjs.join(', ')}`));
      }
    } catch (error) {
      if (error instanceof ZoraError && error.fatal) {
        throw error;
      }
      failed++;
      console.log(chalk.yellow(`  ⚠ ${(error as Error).message}`));
    }
  }

  console.log(
    chalk.dim(`\nResumo: ${trained} treinado(s), ${skipped} ignorado(s) (duplicado), ${failed} com erro.`),
  );
}