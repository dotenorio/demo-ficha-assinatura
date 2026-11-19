import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioDocumento } from "@/componentes/FormularioDocumento";
import { configuracao } from "@/config/documentos";

const acharDocumento = (id: string) => configuracao.documentos.find((d) => d.id === id);

export function generateStaticParams() {
  return configuracao.documentos.map((d) => ({ documento: d.id }));
}

export async function generateMetadata({ params }: PageProps<"/assinar/[documento]">): Promise<Metadata> {
  const doc = acharDocumento((await params).documento);
  return { title: doc?.titulo ?? "Documento" };
}

export default async function PaginaAssinar({ params }: PageProps<"/assinar/[documento]">) {
  const documento = acharDocumento((await params).documento);
  if (!documento) notFound();

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <Link href="/" className="text-sm text-stone-500 hover:text-marca">
        ← {configuracao.negocio.nome}
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">{documento.titulo}</h1>
      <p className="mt-2 mb-6 text-stone-600">
        Campos com <span className="text-red-700">*</span> são obrigatórios.
      </p>
      <FormularioDocumento documento={documento} nomeNegocio={configuracao.negocio.nome} />
    </main>
  );
}
