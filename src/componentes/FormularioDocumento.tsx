"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import type { Assinatura, Campo, Documento, Respostas } from "@/lib/tipos";
import { idDetalhe, todosOsCampos, validarAssinatura, validarRespostas, type Erros } from "@/lib/validacao";
import { QuadroAssinatura } from "./QuadroAssinatura";

interface Props {
  documento: Documento;
  nomeNegocio: string;
}

interface Sucesso {
  id: string;
  assinadoEmTexto: string;
  pdfBase64: string;
}

/** Máscaras simples enquanto digita (a validação de verdade fica em lib/validacao). */
function mascarar(formato: string | undefined, valor: string): string {
  const n = valor.replace(/\D/g, "");
  if (formato === "cpf") {
    const d = n.slice(0, 11);
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
  }
  if (formato === "telefone") {
    const d = n.slice(0, 11);
    if (d.length <= 2) return d ? `(${d}` : "";
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  return valor;
}

const domId = (id: string) => `campo-${id}`;

function semChave(erros: Erros, chave: string): Erros {
  const copia = { ...erros };
  delete copia[chave];
  return copia;
}

export function FormularioDocumento({ documento, nomeNegocio }: Props) {
  const [respostas, setRespostas] = useState<Respostas>({});
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string>();
  const [sucesso, setSucesso] = useState<Sucesso>();
  const ordemCampos = useMemo(() => todosOsCampos(documento).flatMap((c) => [c.id, idDetalhe(c.id)]).concat("assinatura"), [documento]);

  const mudar = (id: string, valor: Respostas[string]) => {
    setRespostas((r) => ({ ...r, [id]: valor }));
    if (erros[id]) setErros((atual) => semChave(atual, id));
  };

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErroGeral(undefined);
    const novosErros = validarRespostas(documento, respostas);
    const erroAssinatura = validarAssinatura(assinatura);
    if (erroAssinatura) novosErros.assinatura = erroAssinatura;
    setErros(novosErros);
    if (Object.keys(novosErros).length) {
      const primeiro = ordemCampos.find((id) => novosErros[id]);
      const el = primeiro ? document.getElementById(domId(primeiro)) : null;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.focus({ preventScroll: true });
      return;
    }

    setEnviando(true);
    try {
      const resp = await fetch("/api/fichas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentoId: documento.id, respostas, assinatura }),
      });
      const corpo = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        if (corpo.erros) setErros(corpo.erros);
        setErroGeral(corpo.mensagem ?? "Não foi possível enviar. Tente de novo.");
        return;
      }
      setSucesso(corpo as Sucesso);
      window.scrollTo({ top: 0 });
    } catch {
      setErroGeral("Sem conexão. Verifique a internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  if (sucesso) return <TelaSucesso sucesso={sucesso} documento={documento} nomeNegocio={nomeNegocio} />;

  return (
    <form onSubmit={enviar} method="post" noValidate className="space-y-8" /* se o JS falhar, dados não vão para a URL */>
      {documento.secoes.map((secao) => (
        <section key={secao.titulo} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-marca">{secao.titulo}</h2>
          {secao.paragrafos?.map((p) => (
            <p key={p} className="mt-3 leading-relaxed text-stone-700">
              {p}
            </p>
          ))}
          <div className="mt-4 space-y-5">
            {secao.campos?.map((campo) => (
              <CampoFormulario key={campo.id} campo={campo} respostas={respostas} erros={erros} mudar={mudar} />
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm" id={domId("assinatura")} tabIndex={-1}>
        <h2 className="text-lg font-semibold text-marca">Assinatura</h2>
        <p className="mt-2 mb-4 text-stone-700">{documento.declaracaoAssinatura}</p>
        <QuadroAssinatura
          erro={erros.assinatura}
          aoMudar={(a) => {
            setAssinatura(a);
            if (a && erros.assinatura) setErros((atual) => semChave(atual, "assinatura"));
          }}
        />
      </section>

      {erroGeral && (
        <p className="rounded-lg bg-red-50 p-3 font-medium text-red-800" role="alert">
          {erroGeral}
        </p>
      )}

      <button type="submit" className="botao w-full text-lg" disabled={enviando}>
        {enviando ? "Gerando o PDF…" : "Assinar e enviar"}
      </button>
    </form>
  );
}

function MensagemErro({ id, erro }: { id: string; erro?: string }) {
  if (!erro) return null;
  return (
    <p id={`${domId(id)}-erro`} className="mt-1 text-sm font-medium text-red-700">
      {erro}
    </p>
  );
}

function CampoFormulario({
  campo,
  respostas,
  erros,
  mudar,
}: {
  campo: Campo;
  respostas: Respostas;
  erros: Erros;
  mudar: (id: string, v: Respostas[string]) => void;
}) {
  const erro = erros[campo.id];
  const invalido = erro ? true : undefined;
  const descricao = erro ? `${domId(campo.id)}-erro` : campo.ajuda ? `${domId(campo.id)}-ajuda` : undefined;
  const rotulo = (
    <>
      {campo.rotulo}
      {campo.obrigatorio && campo.tipo !== "aceite" && <span className="text-red-700"> *</span>}
    </>
  );
  const ajuda = campo.ajuda && (
    <p id={`${domId(campo.id)}-ajuda`} className="mt-1 text-sm text-stone-500">
      {campo.ajuda}
    </p>
  );

  switch (campo.tipo) {
    case "texto": {
      const tipos = { cpf: "text", telefone: "tel", email: "email", data: "date" } as const;
      const teclado = { cpf: "numeric", telefone: "tel", email: "email", data: undefined } as const;
      const valor = (respostas[campo.id] as string) ?? "";
      return (
        <div>
          <label htmlFor={domId(campo.id)} className="mb-1 block font-medium">
            {rotulo}
          </label>
          <input
            id={domId(campo.id)}
            className="campo-entrada"
            type={campo.formato ? tipos[campo.formato] : "text"}
            inputMode={campo.formato ? teclado[campo.formato] : undefined}
            autoComplete={campo.id === "nome" ? "name" : campo.formato === "email" ? "email" : campo.formato === "telefone" ? "tel" : "off"}
            placeholder={campo.placeholder ?? (campo.formato === "cpf" ? "000.000.000-00" : campo.formato === "telefone" ? "(11) 90000-0000" : undefined)}
            value={valor}
            maxLength={200}
            onChange={(e) => mudar(campo.id, mascarar(campo.formato, e.target.value))}
            aria-invalid={invalido}
            aria-describedby={descricao}
            required={campo.obrigatorio}
          />
          {ajuda}
          <MensagemErro id={campo.id} erro={erro} />
        </div>
      );
    }
    case "textoLongo":
      return (
        <div>
          <label htmlFor={domId(campo.id)} className="mb-1 block font-medium">
            {rotulo}
          </label>
          <textarea
            id={domId(campo.id)}
            className="campo-entrada min-h-24"
            placeholder={campo.placeholder}
            value={(respostas[campo.id] as string) ?? ""}
            maxLength={2000}
            onChange={(e) => mudar(campo.id, e.target.value)}
            aria-invalid={invalido}
            aria-describedby={descricao}
          />
          {ajuda}
          <MensagemErro id={campo.id} erro={erro} />
        </div>
      );
    case "simNao":
    case "escolha": {
      const opcoes =
        campo.tipo === "simNao"
          ? [
              { valor: "sim", rotulo: "Sim" },
              { valor: "nao", rotulo: "Não" },
            ]
          : campo.opcoes;
      const detalhe = idDetalhe(campo.id);
      return (
        <fieldset id={domId(campo.id)} tabIndex={-1} aria-describedby={descricao}>
          <legend className="mb-2 font-medium">{rotulo}</legend>
          <div className={campo.tipo === "simNao" ? "flex gap-3" : "space-y-2"}>
            {opcoes.map((o) => (
              <label
                key={o.valor}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 has-checked:border-marca has-checked:bg-marca/5 ${
                  erro ? "border-red-600" : "border-stone-300"
                } ${campo.tipo === "simNao" ? "flex-1 justify-center" : ""}`}
              >
                <input
                  type="radio"
                  name={campo.id}
                  value={o.valor}
                  checked={respostas[campo.id] === o.valor}
                  onChange={() => mudar(campo.id, o.valor)}
                  className="size-4 accent-marca"
                />
                {o.rotulo}
              </label>
            ))}
          </div>
          {ajuda}
          <MensagemErro id={campo.id} erro={erro} />
          {campo.tipo === "simNao" && campo.detalharSeSim && respostas[campo.id] === "sim" && (
            <div className="mt-3">
              <label htmlFor={domId(detalhe)} className="mb-1 block text-sm font-medium">
                {campo.detalharSeSim} <span className="text-red-700">*</span>
              </label>
              <input
                id={domId(detalhe)}
                className="campo-entrada"
                value={(respostas[detalhe] as string) ?? ""}
                maxLength={200}
                onChange={(e) => mudar(detalhe, e.target.value)}
                aria-invalid={erros[detalhe] ? true : undefined}
              />
              <MensagemErro id={detalhe} erro={erros[detalhe]} />
            </div>
          )}
        </fieldset>
      );
    }
    case "marcar": {
      const marcadas = (respostas[campo.id] as string[]) ?? [];
      return (
        <fieldset id={domId(campo.id)} tabIndex={-1} aria-describedby={descricao}>
          <legend className="mb-2 font-medium">{rotulo}</legend>
          <div className="space-y-2">
            {campo.opcoes.map((o) => (
              <label
                key={o}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-stone-300 px-4 py-2.5 has-checked:border-marca has-checked:bg-marca/5"
              >
                <input
                  type="checkbox"
                  checked={marcadas.includes(o)}
                  onChange={(e) => mudar(campo.id, e.target.checked ? [...marcadas, o] : marcadas.filter((x) => x !== o))}
                  className="size-4 accent-marca"
                />
                {o}
              </label>
            ))}
          </div>
          {ajuda}
          <MensagemErro id={campo.id} erro={erro} />
        </fieldset>
      );
    }
    case "aceite":
      return (
        <div>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              id={domId(campo.id)}
              type="checkbox"
              checked={respostas[campo.id] === true}
              onChange={(e) => mudar(campo.id, e.target.checked)}
              className="mt-1 size-5 shrink-0 accent-marca"
              aria-invalid={invalido}
              aria-describedby={descricao}
            />
            <span className="leading-relaxed">{campo.rotulo}</span>
          </label>
          <MensagemErro id={campo.id} erro={erro} />
        </div>
      );
  }
}

function TelaSucesso({ sucesso, documento, nomeNegocio }: { sucesso: Sucesso; documento: Documento; nomeNegocio: string }) {
  const baixar = () => {
    const bytes = Uint8Array.from(atob(sucesso.pdfBase64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${documento.id}-${sucesso.id.slice(0, 8)}.pdf` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <div className="rounded-xl border border-green-200 bg-white p-6 text-center shadow-sm" role="status">
      <div aria-hidden className="mx-auto flex size-14 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">
        ✓
      </div>
      <h2 className="mt-4 text-2xl font-bold">Documento assinado!</h2>
      <p className="mt-2 text-stone-600">
        {documento.titulo} enviado para {nomeNegocio} em {sucesso.assinadoEmTexto}.
      </p>
      <p className="mt-1 text-sm text-stone-500">Código: {sucesso.id}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button type="button" onClick={baixar} className="botao">
          Baixar minha cópia (PDF)
        </button>
        <Link href="/" className="botao-secundario">
          Voltar aos documentos
        </Link>
      </div>
      <p className="mt-4 text-xs text-stone-500">A cópia só pode ser baixada agora. Depois, peça ao estúdio.</p>
    </div>
  );
}
