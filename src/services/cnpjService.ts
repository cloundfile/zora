export function limparCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

export function validarCnpj(cnpj: string): boolean {
  return /^\d{14}$/.test(limparCnpj(cnpj));
}

export function formatarCnpj(digitos: string): string {
  const d = limparCnpj(digitos);
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

interface Atividade {
  code: string;
  text: string;
}

interface Socio {
  nome: string;
  qual: string;
}

export interface DadosCnpj {
  status?: string;
  cnpj?: string;
  nome?: string;
  fantasia?: string;
  situacao?: string;
  tipo?: string;
  porte?: string;
  natureza_juridica?: string;
  abertura?: string;
  data_situacao?: string;
  atividade_principal?: Atividade[];
  atividades_secundarias?: Atividade[];
  qsa?: Socio[];
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  email?: string;
  telefone?: string;
  capital_social?: string;
  simples?: { optante?: boolean };
  simei?: { optante?: boolean };
  ultima_atualizacao?: string;
  motivo_situacao?: string;
}

export async function buscarCnpj(cnpj: string): Promise<DadosCnpj> {
  const url = `https://www.receitaws.com.br/v1/cnpj/${limparCnpj(cnpj)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Erro ${res.status} ao consultar o CNPJ.`);
  }
  return (await res.json()) as DadosCnpj;
}

export function cnpjParaTexto(d: DadosCnpj): string {
  const partes: string[] = [];
  partes.push(`CNPJ ${formatarCnpj(d.cnpj ?? "")} - ${d.nome ?? ""}`.trim());
  if (d.fantasia) partes.push(`Nome fantasia: ${d.fantasia}`);
  partes.push(`Situação: ${d.situacao ?? ""} desde ${d.data_situacao ?? ""}`);
  partes.push(`Tipo: ${d.tipo ?? ""}`);
  partes.push(`Natureza jurídica: ${d.natureza_juridica ?? ""}`);
  partes.push(`Porte: ${d.porte ?? ""}`);
  if (d.abertura) partes.push(`Data de abertura: ${d.abertura}`);
  if (d.atividade_principal?.length) {
    partes.push(
      `Atividade principal: ${d.atividade_principal.map((a) => a.text).join(", ")}`
    );
  }
  if (d.atividades_secundarias?.length) {
    const sec = d.atividades_secundarias.map((a) => a.text).join(", ");
    partes.push(`Atividades secundárias: ${sec}`);
  }
  if (d.qsa?.length) {
    partes.push(
      `Quadro societário: ${d.qsa.map((s) => `${s.nome} (${s.qual})`).join(", ")}`
    );
  }
  if (d.logradouro) {
    partes.push(
      `Endereço: ${d.logradouro}, ${d.numero ?? ""} - ${d.bairro ?? ""}, ${d.municipio ?? ""}/${d.uf ?? ""}, CEP ${d.cep ?? ""}`
    );
  }
  if (d.email) partes.push(`E-mail: ${d.email}`);
  if (d.telefone) partes.push(`Telefone: ${d.telefone}`);
  if (d.capital_social) partes.push(`Capital social: R$ ${d.capital_social}`);
  if (d.simples) {
    partes.push(`Optante do Simples Nacional: ${d.simples.optante ? "Sim" : "Não"}`);
  }
  if (d.simei) {
    partes.push(`Optante do MEI: ${d.simei.optante ? "Sim" : "Não"}`);
  }
  partes.push(`Última atualização: ${d.ultima_atualizacao ?? ""}`);
  return partes.join("\n");
}

const REGEX_CNPJ = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;

export function extrairCnpjs(texto: string): string[] {
  return [...new Set((texto.match(REGEX_CNPJ) ?? []).map(limparCnpj).filter(validarCnpj))];
}