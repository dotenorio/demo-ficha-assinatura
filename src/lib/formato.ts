import type { Campo, Respostas } from "./tipos";

/** "2026-11-19" → "19/11/2026" */
export function dataBr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** Data e hora no fuso do negócio: "19/11/2026 às 14:32" */
export function dataHoraBr(data: Date | string, fuso: string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(d);
  return `${dia} às ${hora}`;
}

export function cpfFormatado(v: string): string {
  const n = v.replace(/\D/g, "");
  return n.length === 11 ? `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}` : v;
}

export function telefoneFormatado(v: string): string {
  const n = v.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return v;
}

/** Texto da resposta como deve aparecer no PDF e no painel. */
export function respostaEmTexto(campo: Campo, respostas: Respostas): string {
  const v = respostas[campo.id];
  switch (campo.tipo) {
    case "texto": {
      const t = typeof v === "string" ? v : "";
      if (!t) return "—";
      if (campo.formato === "data") return dataBr(t);
      if (campo.formato === "cpf") return cpfFormatado(t);
      if (campo.formato === "telefone") return telefoneFormatado(t);
      return t;
    }
    case "textoLongo":
      return typeof v === "string" && v ? v : "—";
    case "simNao":
      return v === "sim" ? "Sim" : v === "nao" ? "Não" : "—";
    case "escolha":
      return campo.opcoes.find((o) => o.valor === v)?.rotulo ?? "—";
    case "marcar":
      return Array.isArray(v) && v.length ? v.join("; ") : "Nenhuma";
    case "aceite":
      return v === true ? "Sim" : "Não";
  }
}

/** Remove acentos e caixa para a busca por nome. */
export function normalizarBusca(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
