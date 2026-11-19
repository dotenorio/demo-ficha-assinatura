import type { Metadata } from "next";
import Link from "next/link";
import { configuracao } from "@/config/documentos";
import { dataHoraBr } from "@/lib/formato";
import { exigirSessao } from "@/lib/painel";
import { obterRepositorio } from "@/lib/repositorio";
import { sair } from "./acoes";

export const metadata: Metadata = { title: "Painel" };

const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v.slice(0, 100) : "");

export default async function Painel({ searchParams }: PageProps<"/painel">) {
  const sessao = await exigirSessao();
  const params = await searchParams;
  const busca = texto(params.q);
  const documentoId = configuracao.documentos.some((d) => d.id === params.doc) ? texto(params.doc) : "";

  const repo = await obterRepositorio();
  const fichas = await repo.listar({ busca, documentoId: documentoId || undefined });
  const fuso = configuracao.negocio.fusoHorario;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-marca">{configuracao.negocio.nome}</p>
          <h1 className="mt-1 text-2xl font-bold">Fichas assinadas</h1>
        </div>
        <form action={sair} className="flex items-center gap-3 text-sm text-stone-600">
          <span className="hidden sm:inline">{sessao.email}</span>
          <button type="submit" className="botao-secundario py-1.5 text-sm">
            Sair
          </button>
        </form>
      </header>

      <form role="search" className="mt-6 flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row">
        <label htmlFor="q" className="sr-only">
          Buscar pelo nome do cliente
        </label>
        <input id="q" name="q" type="search" defaultValue={busca} placeholder="Buscar pelo nome do cliente" className="campo-entrada flex-1" />
        <label htmlFor="doc" className="sr-only">
          Tipo de documento
        </label>
        <select id="doc" name="doc" defaultValue={documentoId} className="campo-entrada sm:w-60">
          <option value="">Todos os documentos</option>
          {configuracao.documentos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.titulo}
            </option>
          ))}
        </select>
        <button type="submit" className="botao py-2.5">
          Buscar
        </button>
      </form>

      <p className="mt-6 mb-3 text-sm text-stone-600" aria-live="polite">
        {fichas.length === 0
          ? "Nenhuma ficha encontrada."
          : `${fichas.length} ${fichas.length === 1 ? "ficha" : "fichas"}${busca ? ` para “${busca}”` : ""}`}
        {(busca || documentoId) && (
          <>
            {" · "}
            <Link href="/painel" className="text-marca underline underline-offset-4">
              limpar filtros
            </Link>
          </>
        )}
      </p>

      <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {fichas.map((f) => (
          <li key={f.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {f.nomeCliente}
                {f.exemplo && (
                  <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 align-middle text-xs font-medium text-stone-500">exemplo</span>
                )}
              </p>
              <p className="text-sm text-stone-600">
                {f.documentoTitulo} · {dataHoraBr(f.criadoEm, fuso)}
              </p>
            </div>
            <div className="flex gap-2">
              <a href={`/api/fichas/${f.id}/pdf`} target="_blank" rel="noopener" className="botao-secundario py-1.5 text-sm">
                Ver PDF
              </a>
              <a href={`/api/fichas/${f.id}/pdf?baixar`} className="botao py-1.5 text-sm">
                Baixar
              </a>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-stone-500">
        Dados pessoais e de saúde (sensíveis pela LGPD). Não compartilhe os PDFs fora do atendimento. Armazenamento: {repo.nome}.
      </p>
    </main>
  );
}
