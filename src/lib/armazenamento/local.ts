/**
 * Armazenamento em disco, para rodar a demo sem nenhuma conta externa.
 * Fichas num JSON e PDFs numa pasta (por padrão ./.dados, fora do Git).
 * Não use em produção: na Vercel o disco é somente leitura e não persiste.
 */
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { normalizarBusca } from "../formato";
import type { Ficha, FiltroFichas, Repositorio, ResumoFicha } from "./tipos";

const ID_VALIDO = /^[0-9a-f-]{36}$/i;

export function criarRepositorioLocal(pasta: string): Repositorio {
  const arquivo = path.join(pasta, "fichas.json");
  const pastaPdfs = path.join(pasta, "pdfs");
  let fila: Promise<unknown> = Promise.resolve();

  async function ler(): Promise<Ficha[]> {
    try {
      return JSON.parse(await readFile(arquivo, "utf8")) as Ficha[];
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw e;
    }
  }

  /** Grava em arquivo temporário e renomeia, para não corromper o JSON no meio da escrita. */
  async function gravar(fichas: Ficha[]) {
    await mkdir(pasta, { recursive: true });
    const tmp = `${arquivo}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(fichas, null, 2));
    await rename(tmp, arquivo);
  }

  return {
    nome: "local",

    salvar(ficha, pdf) {
      // Serializa as escritas: dois envios simultâneos não se sobrescrevem
      const tarefa = fila.then(async () => {
        await mkdir(pastaPdfs, { recursive: true });
        await writeFile(path.join(pastaPdfs, `${ficha.id}.pdf`), pdf);
        const fichas = await ler();
        fichas.push(ficha);
        await gravar(fichas);
      });
      fila = tarefa.catch(() => undefined);
      return tarefa;
    },

    async listar({ busca, documentoId, limite = 200 }: FiltroFichas): Promise<ResumoFicha[]> {
      const termo = normalizarBusca(busca ?? "");
      return (await ler())
        .filter((f) => !documentoId || f.documentoId === documentoId)
        .filter((f) => !termo || normalizarBusca(f.nomeCliente).includes(termo))
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
        .slice(0, limite)
        .map(({ id, documentoId, documentoTitulo, nomeCliente, criadoEm, exemplo }) => ({
          id,
          documentoId,
          documentoTitulo,
          nomeCliente,
          criadoEm,
          exemplo,
        }));
    },

    async buscar(id) {
      if (!ID_VALIDO.test(id)) return null;
      return (await ler()).find((f) => f.id === id) ?? null;
    },

    async lerPdf(id) {
      if (!ID_VALIDO.test(id)) return null; // impede "../" no caminho
      try {
        return new Uint8Array(await readFile(path.join(pastaPdfs, `${id}.pdf`)));
      } catch {
        return null;
      }
    },

    async contar() {
      return (await ler()).length;
    },
  };
}
