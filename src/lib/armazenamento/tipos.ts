import type { Assinatura, Respostas } from "../tipos";

export interface Ficha {
  id: string;
  documentoId: string;
  documentoTitulo: string;
  nomeCliente: string;
  /** ISO 8601 (UTC) do momento em que o servidor recebeu a assinatura. */
  criadoEm: string;
  respostas: Respostas;
  assinatura: Assinatura;
  ip?: string;
  navegador?: string;
  hash: string;
  /** true para fichas criadas pelo seed (dados fictícios). */
  exemplo?: boolean;
}

/** O que o painel mostra na lista (sem respostas e sem assinatura). */
export type ResumoFicha = Pick<Ficha, "id" | "documentoId" | "documentoTitulo" | "nomeCliente" | "criadoEm" | "exemplo">;

export interface FiltroFichas {
  busca?: string;
  documentoId?: string;
  limite?: number;
}

export interface Repositorio {
  nome: "local" | "supabase";
  salvar(ficha: Ficha, pdf: Uint8Array): Promise<void>;
  listar(filtro: FiltroFichas): Promise<ResumoFicha[]>;
  buscar(id: string): Promise<Ficha | null>;
  lerPdf(id: string): Promise<Uint8Array | null>;
  contar(): Promise<number>;
}
