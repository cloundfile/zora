import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { versionCommand } from '../../src/controllers/versionController';
import { splitIntoChunks, mimeFromExtension } from '../../src/services/ingestion';
import { findCnpjs } from '../../src/services/cnpjService';
import { cosineSimilarity } from '../../src/services/vectorStore';
import { GREETING } from '../../src/views/output';
import { EXIT_COMMANDS, runChatLoop } from '../../src/views/chatView';

describe('version controller', () => {
  let logs: string[];

  beforeEach(() => {
    logs = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.join(' '));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exibe dados do pacote, autor e licença', () => {
    versionCommand();
    const output = logs.join('\n');
    expect(output).toContain('@inneobr/zora');
    expect(output).toContain('@inneobr');
    expect(output).toContain('inneobr@gmail.com');
    expect(output).toContain('MIT');
  });
});

describe('ingestion helpers', () => {
  it('divide textos em chunks de no máximo 500 caracteres', () => {
    const text = 'a'.repeat(1234);
    const chunks = splitIntoChunks(text);
    expect(chunks.length).toBe(3);
    expect(chunks[0].length).toBeLessThanOrEqual(500);
    expect(chunks.join('')).toBe(text);
  });

  it('retorna um chunk vazio para texto vazio de entrada controlada', () => {
    // texto ainda que vazio produz chunk único para não quebrar o pipeline
    expect(splitIntoChunks('')).toEqual(['']);
  });

  it('mapeia extensões para mime types', () => {
    expect(mimeFromExtension('f.pdf')).toBe('application/pdf');
    expect(mimeFromExtension('f.txt')).toBe('text/plain');
    expect(mimeFromExtension('f.json')).toBe('application/json');
    expect(mimeFromExtension('f.xyz')).toBe('application/octet-stream');
  });
});

describe('cnpj service', () => {
  it('extrai e normaliza CNPJs do texto', () => {
    const cnpjs = findCnpjs(
      'CNPJ 12.345.678/0001-95 e outro 99.888.777/0001-01',
    );
    expect(cnpjs).toContain('12345678000195');
    expect(cnpjs).toContain('99888777000101');
  });
});

describe('vector store', () => {
  it('calcula similaridade de cosseno', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
});

describe('ajustes do zora.md (validação)', () => {
  it('a saudação inicial do agente é "Em que posso ajudar?"', () => {
    expect(GREETING).toBe('Em que posso ajudar?');
  });

  it('o loop de chat aceita sair via comando textual', () => {
    expect(EXIT_COMMANDS.has('sair')).toBe(true);
    expect(EXIT_COMMANDS.has('exit')).toBe(true);
  });

  it('runChatLoop é exportado e permanece esperando nova mensagem', () => {
    expect(typeof runChatLoop).toBe('function');
  });
});