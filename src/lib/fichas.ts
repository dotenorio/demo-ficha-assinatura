/**
 * Regra de negócio do envio: valida, carimba data/hora, calcula o hash, gera o PDF e guarda.
 * Não depende do Next.js (é usado pela rota da API, pelo seed e pelos testes).
 */
import { createHash, randomUUID } from "node:crypto";
import type { Repositorio, Ficha } from "./armazenamento/tipos";
import { gerarPdf } from "./pdf";
import type { Assinatura, ConfiguracaoDocumentos, Respostas } from "./tipos";
import { limparRespostas, validarAssinatura, validarRespostas, type Erros } from "./validacao";

export interface EntradaFicha {
  documentoId: string;
  respostas: Respostas;
  assinatura: unknown;
  ip?: string;
  navegador?: string;
  agora?: Date;
  exemplo?: boolean;
}

export type ResultadoFicha =
  | { ok: true; ficha: Ficha; pdf: Uint8Array }
  | { ok: false; status: 400 | 404; erros: Erros; mensagem: string };

/** JSON com chaves em ordem: o mesmo conteúdo sempre gera o mesmo hash. */
function jsonCanonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(jsonCanonico).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${jsonCanonico((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

export function calcularHash(dados: { documentoId: string; respostas: Respostas; assinatura: Assinatura; criadoEm: string }): string {
  return createHash("sha256").update(jsonCanonico(dados)).digest("hex");
}

export async function registrarFicha(
  config: ConfiguracaoDocumentos,
  repo: Repositorio,
  entrada: EntradaFicha,
): Promise<ResultadoFicha> {
  const documento = config.documentos.find((d) => d.id === entrada.documentoId);
  if (!documento) return { ok: false, status: 404, erros: {}, mensagem: "Documento não encontrado." };

  const erros = validarRespostas(documento, entrada.respostas, entrada.agora);
  const erroAssinatura = validarAssinatura(entrada.assinatura);
  if (erroAssinatura) erros.assinatura = erroAssinatura;
  if (Object.keys(erros).length) {
    return { ok: false, status: 400, erros, mensagem: "Confira os campos destacados." };
  }

  const respostas = limparRespostas(documento, entrada.respostas);
  const assinatura = entrada.assinatura as Assinatura;
  // Coordenadas arredondadas: menos bytes e nada de precisão falsa
  assinatura.tracos = assinatura.tracos.map((t) => t.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]));
  const agora = entrada.agora ?? new Date();
  const criadoEm = agora.toISOString();
  const nomeCliente = String(respostas[documento.campoNome] ?? "").trim();

  const ficha: Ficha = {
    id: randomUUID(),
    documentoId: documento.id,
    documentoTitulo: documento.titulo,
    nomeCliente,
    criadoEm,
    respostas,
    assinatura,
    ip: entrada.ip?.slice(0, 64),
    navegador: entrada.navegador?.slice(0, 300),
    hash: calcularHash({ documentoId: documento.id, respostas, assinatura, criadoEm }),
    exemplo: entrada.exemplo,
  };

  const pdf = await gerarPdf({
    id: ficha.id,
    negocio: config.negocio,
    demonstracao: config.demonstracao,
    documento,
    respostas,
    assinatura,
    assinadoEm: agora,
    nomeAssinante: nomeCliente,
    hash: ficha.hash,
    ip: ficha.ip,
    navegador: ficha.navegador,
  });

  await repo.salvar(ficha, pdf);
  return { ok: true, ficha, pdf };
}
