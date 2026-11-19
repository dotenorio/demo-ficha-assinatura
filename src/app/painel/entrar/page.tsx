import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { configuracao } from "@/config/documentos";
import { LOGIN_DEMO, modoDemo } from "@/lib/ambiente";
import { sessaoAtual } from "@/lib/painel";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = { title: "Entrar no painel" };

export default async function Entrar() {
  if (await sessaoAtual()) redirect("/painel");
  const loginDemoAtivo = modoDemo && !process.env.PAINEL_EMAIL;

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <p className="text-sm font-semibold uppercase tracking-wider text-marca">{configuracao.negocio.nome}</p>
      <h1 className="mt-2 mb-6 text-2xl font-bold">Área do estúdio</h1>

      {loginDemoAtivo && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Login de demonstração</p>
          <p className="mt-1">
            E-mail: <code className="font-mono">{LOGIN_DEMO.email}</code>
            <br />
            Senha: <code className="font-mono">{LOGIN_DEMO.senha}</code>
          </p>
        </div>
      )}

      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <FormLogin emailInicial={loginDemoAtivo ? LOGIN_DEMO.email : undefined} />
      </div>
      <p className="mt-6 text-sm text-stone-500">
        As fichas têm dados de saúde (dados sensíveis pela LGPD). Por isso só são vistas com login.
      </p>
      <Link href="/" className="mt-4 inline-block text-sm text-marca underline underline-offset-4">
        ← Voltar
      </Link>
    </main>
  );
}
