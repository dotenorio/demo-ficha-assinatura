/**
 * Validação das respostas. O mesmo código roda no navegador (mensagens na hora)
 * e no servidor (que nunca confia no que chega do navegador).
 */
import { z } from "zod";
import type { Assinatura, Campo, Documento, Respostas } from "./tipos";

export type Erros = Record<string, string>;

export function todosOsCampos(doc: Documento): Campo[] {
  return doc.secoes.flatMap((s) => s.campos ?? []);
}

/** Id do campo de detalhe de uma pergunta sim/não. */
export const idDetalhe = (id: string) => `${id}_detalhe`;

const LIMITE_TEXTO = 200;
const LIMITE_TEXTO_LONGO = 2000;

export function cpfValido(valor: string): boolean {
  const cpf = valor.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(cpf.slice(0, 9), 10) === Number(cpf[9]) && digito(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

export function telefoneValido(valor: string): boolean {
  const n = valor.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  return /^[1-9]{2}9?\d{8}$/.test(n);
}

export function emailValido(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor);
}

/** Data no formato do <input type="date">: AAAA-MM-DD. */
export function dataValida(valor: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export function idadeEm(nascimento: string, hoje: Date): number {
  const [a, m, d] = nascimento.split("-").map(Number);
  let idade = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) idade--;
  return idade;
}

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function validarCampo(campo: Campo, respostas: Respostas, hoje: Date): string | undefined {
  const valor = respostas[campo.id];

  switch (campo.tipo) {
    case "texto": {
      const t = texto(valor);
      if (!t) return campo.obrigatorio ? "Preencha este campo." : undefined;
      if (t.length > LIMITE_TEXTO) return `Use no máximo ${LIMITE_TEXTO} caracteres.`;
      if (campo.formato === "cpf" && !cpfValido(t)) return "CPF inválido.";
      if (campo.formato === "telefone" && !telefoneValido(t)) return "Informe DDD e número.";
      if (campo.formato === "email" && !emailValido(t)) return "E-mail inválido.";
      if (campo.formato === "data") {
        if (!dataValida(t)) return "Data inválida.";
        const idade = idadeEm(t, hoje);
        if (idade < 0 || idade > 120) return "Data inválida.";
        if (campo.idadeMinima && idade < campo.idadeMinima) return `É preciso ter pelo menos ${campo.idadeMinima} anos.`;
      }
      return undefined;
    }
    case "textoLongo": {
      const t = texto(valor);
      if (!t) return campo.obrigatorio ? "Preencha este campo." : undefined;
      if (t.length > LIMITE_TEXTO_LONGO) return `Use no máximo ${LIMITE_TEXTO_LONGO} caracteres.`;
      return undefined;
    }
    case "simNao":
      if (valor === undefined || valor === "") return campo.obrigatorio ? "Escolha sim ou não." : undefined;
      if (valor !== "sim" && valor !== "nao") return "Resposta inválida.";
      return undefined;
    case "escolha":
      if (valor === undefined || valor === "") return campo.obrigatorio ? "Escolha uma opção." : undefined;
      if (!campo.opcoes.some((o) => o.valor === valor)) return "Opção inválida.";
      return undefined;
    case "marcar":
      if (valor === undefined) return campo.obrigatorio ? "Marque ao menos uma opção." : undefined;
      if (!Array.isArray(valor) || valor.some((v) => !campo.opcoes.includes(v))) return "Opção inválida.";
      if (campo.obrigatorio && valor.length === 0) return "Marque ao menos uma opção.";
      return undefined;
    case "aceite":
      if (valor !== true && campo.obrigatorio) return "É preciso marcar para continuar.";
      return undefined;
  }
}

/**
 * Valida as respostas de um documento. Devolve um objeto vazio se estiver tudo certo,
 * ou { idDoCampo: "mensagem" } para cada problema.
 */
export function validarRespostas(doc: Documento, respostas: Respostas, hoje = new Date()): Erros {
  const erros: Erros = {};
  for (const campo of todosOsCampos(doc)) {
    const erro = validarCampo(campo, respostas, hoje);
    if (erro) erros[campo.id] = erro;

    if (campo.tipo === "simNao" && campo.detalharSeSim && respostas[campo.id] === "sim") {
      const detalhe = texto(respostas[idDetalhe(campo.id)]);
      if (!detalhe) erros[idDetalhe(campo.id)] = "Conte um pouco mais.";
      else if (detalhe.length > LIMITE_TEXTO) erros[idDetalhe(campo.id)] = `Use no máximo ${LIMITE_TEXTO} caracteres.`;
    }
  }
  return erros;
}

/** Mantém só as respostas de campos que existem no documento (descarta qualquer chave extra). */
export function limparRespostas(doc: Documento, respostas: Respostas): Respostas {
  const limpas: Respostas = {};
  for (const campo of todosOsCampos(doc)) {
    const v = respostas[campo.id];
    if (v !== undefined) limpas[campo.id] = typeof v === "string" ? v.trim() : v;
    if (campo.tipo === "simNao" && campo.detalharSeSim && v === "sim") {
      const d = respostas[idDetalhe(campo.id)];
      if (typeof d === "string") limpas[idDetalhe(campo.id)] = d.trim();
    }
  }
  return limpas;
}

// ---------- Assinatura ----------

const MAX_PONTOS = 6000;

export const esquemaAssinatura = z.object({
  largura: z.number().int().min(100).max(2000),
  altura: z.number().int().min(50).max(1000),
  tracos: z
    .array(z.array(z.tuple([z.number().finite(), z.number().finite()])).min(1).max(MAX_PONTOS))
    .min(1)
    .max(300),
});

/** Erro em português, ou undefined se a assinatura for aceitável. */
export function validarAssinatura(entrada: unknown): string | undefined {
  const r = esquemaAssinatura.safeParse(entrada);
  if (!r.success) return "Assine no quadro antes de enviar.";
  const a: Assinatura = r.data;
  const total = a.tracos.reduce((n, t) => n + t.length, 0);
  if (total > MAX_PONTOS) return "Assinatura muito longa. Limpe e assine de novo.";
  if (total < 10) return "Assinatura muito curta. Assine com o seu nome ou rubrica.";
  const xs = a.tracos.flat().map((p) => p[0]);
  const ys = a.tracos.flat().map((p) => p[1]);
  const larguraUsada = Math.max(...xs) - Math.min(...xs);
  const alturaUsada = Math.max(...ys) - Math.min(...ys);
  if (larguraUsada < 30 && alturaUsada < 30) return "Assinatura muito pequena. Use mais espaço do quadro.";
  return undefined;
}

// ---------- Corpo da requisição de envio ----------

export const esquemaEnvio = z.object({
  documentoId: z.string().min(1).max(60),
  respostas: z.record(z.string().max(80), z.union([z.string().max(5000), z.boolean(), z.array(z.string().max(300)).max(50)])),
  assinatura: z.unknown(),
});
