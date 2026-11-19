/**
 * Variáveis de ambiente (ver .env.example). Só para o servidor.
 */
import "server-only";

const producao = process.env.NODE_ENV === "production";

/** Modo demonstração: login de demo exibido na tela e fichas fictícias de exemplo. */
export const modoDemo = (process.env.MODO_DEMO ?? "true") !== "false";

export const LOGIN_DEMO = { email: "dono@tintaviva.exemplo", senha: "demo1234" };

export function credenciaisPainel(): { email: string; senha: string } {
  const email = process.env.PAINEL_EMAIL;
  const senha = process.env.PAINEL_SENHA;
  if (email && senha) return { email, senha };
  if (modoDemo) return LOGIN_DEMO;
  throw new Error("Defina PAINEL_EMAIL e PAINEL_SENHA (ou MODO_DEMO=true).");
}

export function segredoSessao(): string {
  const s = process.env.SESSAO_SEGREDO;
  if (s && s.length >= 32) return s;
  if (producao) throw new Error("Defina SESSAO_SEGREDO com pelo menos 32 caracteres.");
  return "segredo-de-desenvolvimento-nao-use-em-producao!!";
}

export function configSupabase(): { url: string; chave: string } | null {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && chave ? { url, chave } : null;
}

export const pastaDados = process.env.DADOS_DIR || ".dados";
