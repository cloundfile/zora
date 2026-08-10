import { describe, it, expect } from 'vitest';
import { SCHEMA } from '../../src/models/schema';

describe('ajuste de roles no zora.md / schema.md', () => {
  it('a coluna role aceita EXATAMENTE input | output', () => {
    expect(SCHEMA).toMatch(/role TEXT CHECK\(role IN \('input', 'output'\)\) NOT NULL/);
  });

  it('não mantém os roles antigos question/answer', () => {
    expect(SCHEMA).not.toMatch(/question/);
    expect(SCHEMA).not.toMatch(/answer/);
  });

  it('comenta o significado de input (pergunta) e output (resposta do agente)', () => {
    expect(SCHEMA).toMatch(/input.*pergunta.*output.*resposta/si);
  });
});