/**
 * Armazenamento no Supabase: fichas no PostgreSQL e PDFs num bucket PRIVADO do Storage.
 * Usa a chave service_role, que só existe no servidor. A tabela tem RLS ligado e nenhuma
 * policy, então ninguém lê os dados com a chave pública (ver supabase/schema.sql).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizarBusca } from "../formato";
import type { Ficha, FiltroFichas, Repositorio } from "./tipos";

const TABELA = "fichas";
const BUCKET = "fichas-pdf";
const ID_VALIDO = /^[0-9a-f-]{36}$/i;

interface Linha {
  id: string;
  documento_id: string;
  documento_titulo: string;
  nome_cliente: string;
  nome_busca: string;
  criado_em: string;
  respostas: Ficha["respostas"];
  assinatura: Ficha["assinatura"];
  ip: string | null;
  navegador: string | null;
  hash: string;
  pdf_caminho: string;
  exemplo: boolean;
}

const caminhoPdf = (f: Pick<Ficha, "id" | "criadoEm">) => `${f.criadoEm.slice(0, 7)}/${f.id}.pdf`;

function paraFicha(l: Linha): Ficha {
  return {
    id: l.id,
    documentoId: l.documento_id,
    documentoTitulo: l.documento_titulo,
    nomeCliente: l.nome_cliente,
    criadoEm: new Date(l.criado_em).toISOString(),
    respostas: l.respostas,
    assinatura: l.assinatura,
    ip: l.ip ?? undefined,
    navegador: l.navegador ?? undefined,
    hash: l.hash,
    exemplo: l.exemplo,
  };
}

/** Escapa curingas do LIKE para a busca não virar padrão. */
const escaparLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export function criarRepositorioSupabase(url: string, chaveServico: string): Repositorio {
  const db: SupabaseClient = createClient(url, chaveServico, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    nome: "supabase",

    async salvar(ficha, pdf) {
      const caminho = caminhoPdf(ficha);
      const up = await db.storage.from(BUCKET).upload(caminho, pdf, { contentType: "application/pdf", upsert: false });
      if (up.error) throw new Error(`Falha ao enviar PDF: ${up.error.message}`);

      const linha: Linha = {
        id: ficha.id,
        documento_id: ficha.documentoId,
        documento_titulo: ficha.documentoTitulo,
        nome_cliente: ficha.nomeCliente,
        nome_busca: normalizarBusca(ficha.nomeCliente),
        criado_em: ficha.criadoEm,
        respostas: ficha.respostas,
        assinatura: ficha.assinatura,
        ip: ficha.ip ?? null,
        navegador: ficha.navegador ?? null,
        hash: ficha.hash,
        pdf_caminho: caminho,
        exemplo: !!ficha.exemplo,
      };
      const ins = await db.from(TABELA).insert(linha);
      if (ins.error) {
        await db.storage.from(BUCKET).remove([caminho]); // não deixa PDF órfão
        throw new Error(`Falha ao salvar ficha: ${ins.error.message}`);
      }
    },

    async listar({ busca, documentoId, limite = 200 }: FiltroFichas) {
      let q = db
        .from(TABELA)
        .select("id, documento_id, documento_titulo, nome_cliente, criado_em, exemplo")
        .order("criado_em", { ascending: false })
        .limit(limite);
      const termo = normalizarBusca(busca ?? "");
      if (termo) q = q.ilike("nome_busca", `%${escaparLike(termo)}%`);
      if (documentoId) q = q.eq("documento_id", documentoId);
      const { data, error } = await q;
      if (error) throw new Error(`Falha ao listar fichas: ${error.message}`);
      return (data ?? []).map((l) => ({
        id: l.id,
        documentoId: l.documento_id,
        documentoTitulo: l.documento_titulo,
        nomeCliente: l.nome_cliente,
        criadoEm: new Date(l.criado_em).toISOString(),
        exemplo: l.exemplo,
      }));
    },

    async buscar(id) {
      if (!ID_VALIDO.test(id)) return null;
      const { data, error } = await db.from(TABELA).select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(`Falha ao buscar ficha: ${error.message}`);
      return data ? paraFicha(data as Linha) : null;
    },

    async lerPdf(id) {
      if (!ID_VALIDO.test(id)) return null;
      const { data: linha } = await db.from(TABELA).select("pdf_caminho").eq("id", id).maybeSingle();
      if (!linha) return null;
      const { data, error } = await db.storage.from(BUCKET).download(linha.pdf_caminho);
      if (error || !data) return null;
      return new Uint8Array(await data.arrayBuffer());
    },

    async contar() {
      const { count, error } = await db.from(TABELA).select("id", { count: "exact", head: true });
      if (error) throw new Error(`Falha ao contar fichas: ${error.message}`);
      return count ?? 0;
    },
  };
}
