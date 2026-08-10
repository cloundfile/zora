import { describe, it, expect, beforeEach } from 'vitest';
import type Database from 'better-sqlite3';
import { setupTestDb } from '../helpers/testDb';
import { insertDocument } from '../../src/models/documentModel';
import { upsertCompany } from '../../src/models/companyModel';
import {
  buscarDocumentos,
  buscarEmpresas,
  buscarLocal,
  buildLocalContext,
} from '../../src/services/localSearchService';

describe('localSearchService', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = setupTestDb();
  });

  function seedDocumento(filename: string, texto: string): void {
    insertDocument({
      filename,
      file_hash: filename,
      mime_type: 'application/pdf',
      full_text: texto,
      original_blob: Buffer.from(texto),
    });
  }

  it('encontra documentos por palavra-chave ignorando acentos e maiúsculas', () => {
    seedDocumento(
      '2026_4789_LEI_N_3204.pdf',
      'Declara de Utilidade Pública Municipal a Associação Tradicionalista União Gaúcha. CNPJ 59.879.501/0001-32.',
    );
    seedDocumento(
      '2010_1936_LEI_N_1974.pdf',
      'Dispõe sobre ações prioritárias da Administração Pública Municipal.',
    );

    const docs = buscarDocumentos('Associação Tradicionalista Uniao Gaucha');
    expect(docs).toHaveLength(1);
    expect(docs[0].filename).toBe('2026_4789_LEI_N_3204.pdf');
    expect(docs[0].snippet).toContain('Associação');
  });

  it('encontra documento pelo nome do arquivo', () => {
    seedDocumento('2005_1600_LEI_N_1626.pdf', 'Plano Plurianual do Município.');
    const docs = buscarDocumentos('LEI 1626');
    expect(docs).toHaveLength(1);
    expect(docs[0].filename).toBe('2005_1600_LEI_N_1626.pdf');
  });

  it('não retorna documentos quando não há correspondência', () => {
    seedDocumento('2005_1600_LEI_N_1626.pdf', 'Plano Plurianual do Município.');
    const docs = buscarDocumentos('churrasco de tamboari');
    expect(docs).toHaveLength(0);
  });

  it('encontra empresa pelo nome fantasia e pelo quadro societário', () => {
    upsertCompany('59879501000132', {
      company_name: 'ASSOCIACAO TRADICIONALISTA UNIAO GAUCHA',
      trade_name: 'CTG UNIAO GAUCHA',
      raw_data: {
        cnpj: '59.879.501/0001-32',
        nome: 'ASSOCIACAO TRADICIONALISTA UNIAO GAUCHA',
        situacao: 'ATIVA',
        qsa: [{ nome: 'LEANDRO FIDELIS', qual: '16-Presidente' }],
        logradouro: 'RUA TERTULIANO BUENO DE ANDRADE',
        municipio: 'PALMAS',
        uf: 'PR',
      },
    });

    const porNome = buscarEmpresas('União Gaúcha');
    expect(porNome).toHaveLength(1);
    expect(porNome[0].cnpj).toBe('59879501000132');

    const porSocio = buscarEmpresas('Leandro Fidelis');
    expect(porSocio).toHaveLength(1);
    expect(porSocio[0].dados?.qsa?.[0].nome).toBe('LEANDRO FIDELIS');
  });

  it('buscarLocal combina documentos e empresas no contexto', () => {
    seedDocumento(
      '2026_4789_LEI_N_3204.pdf',
      'Declara de Utilidade Pública a Associação Tradicionalista União Gaúcha.',
    );
    upsertCompany('59879501000132', {
      company_name: 'ASSOCIACAO TRADICIONALISTA UNIAO GAUCHA',
      raw_data: { cnpj: '59.879.501/0001-32', nome: 'ASSOCIACAO TRADICIONALISTA UNIAO GAUCHA' },
    });

    const resultado = buscarLocal('Associação Tradicionalista Uniao Gaucha');
    expect(resultado.docs).toHaveLength(1);
    expect(resultado.companies).toHaveLength(1);

    const contexto = buildLocalContext(resultado);
    expect(contexto).toContain('2026_4789_LEI_N_3204.pdf');
    expect(contexto).toContain('UNIAO GAUCHA');
  });
});