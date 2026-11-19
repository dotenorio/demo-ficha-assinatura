/**
 * Escolhe onde guardar as fichas:
 *  - Supabase, se SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estiverem definidos;
 *  - senão, disco local (./.dados), que é o jeito mais rápido de rodar a demo.
 * No modo demonstração, o armazenamento vazio recebe fichas fictícias de exemplo.
 */
import "server-only";
import { configuracao } from "@/config/documentos";
import { configSupabase, modoDemo, pastaDados } from "./ambiente";
import { criarRepositorioLocal } from "./armazenamento/local";
import { criarRepositorioSupabase } from "./armazenamento/supabase";
import type { Repositorio } from "./armazenamento/tipos";
import { criarFichasExemplo } from "./exemplos";

let repo: Repositorio | undefined;
let preparo: Promise<void> | undefined;

export async function obterRepositorio(): Promise<Repositorio> {
  if (!repo) {
    const sb = configSupabase();
    repo = sb ? criarRepositorioSupabase(sb.url, sb.chave) : criarRepositorioLocal(pastaDados);
  }
  if (modoDemo) {
    const r = repo;
    preparo ??= (async () => {
      if ((await r.contar()) === 0) await criarFichasExemplo(configuracao, r);
    })().catch((e) => {
      preparo = undefined;
      throw e;
    });
    await preparo;
  }
  return repo;
}
