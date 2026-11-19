/** Helpers de autenticação do painel (servidor). */
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { segredoSessao } from "./ambiente";
import { COOKIE_SESSAO, lerToken } from "./sessao";

export async function sessaoAtual() {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  return lerToken(token, segredoSessao());
}

/** Use no topo de toda página do painel: sem login, volta para a tela de entrada. */
export async function exigirSessao() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/painel/entrar");
  return sessao;
}
