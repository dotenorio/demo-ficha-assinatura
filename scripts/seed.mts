/**
 * Cria fichas fictícias de exemplo (npm run seed).
 * Usa o Supabase se SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estiverem no ambiente; senão, ./.dados.
 * Para recomeçar do zero no modo local, apague a pasta .dados.
 */
import { configuracao } from "../src/config/documentos";
import { criarRepositorioLocal } from "../src/lib/armazenamento/local";
import { criarRepositorioSupabase } from "../src/lib/armazenamento/supabase";
import { criarFichasExemplo } from "../src/lib/exemplos";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DADOS_DIR } = process.env;
const repo =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? criarRepositorioSupabase(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : criarRepositorioLocal(DADOS_DIR || ".dados");

const criadas = await criarFichasExemplo(configuracao, repo);
console.log(`${criadas} fichas de exemplo criadas no armazenamento "${repo.nome}". Total agora: ${await repo.contar()}.`);
