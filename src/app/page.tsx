import Link from "next/link";
import { configuracao } from "@/config/documentos";

export default function Inicio() {
  const { negocio, documentos } = configuracao;
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-wider text-marca">{negocio.nome}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Seus documentos antes da sessão</h1>
      <p className="mt-3 text-stone-600">
        Preencha pelo celular e assine com o dedo. Leva uns 3 minutos e o estúdio recebe tudo em PDF.
      </p>

      <ul className="mt-8 space-y-4">
        {documentos.map((doc, i) => (
          <li key={doc.id}>
            <Link
              href={`/assinar/${doc.id}`}
              className="group flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-marca"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-marca/10 font-bold text-marca">
                {i + 1}
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{doc.titulo}</span>
                <span className="mt-1 block text-sm text-stone-600">{doc.resumo}</span>
              </span>
              <span aria-hidden className="text-xl text-stone-400 transition group-hover:translate-x-1 group-hover:text-marca">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm text-stone-500">
        Seus dados ficam guardados só para o estúdio e só são acessados com login. Dúvidas sobre privacidade:{" "}
        {negocio.contatoPrivacidade}.
      </p>
      <p className="mt-6 text-sm">
        <Link href="/painel" className="font-medium text-marca underline underline-offset-4">
          Área do estúdio →
        </Link>
      </p>
    </main>
  );
}
