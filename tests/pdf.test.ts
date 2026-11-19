import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { afterAll, describe, expect, it } from "vitest";
import { configuracao } from "@/config/documentos";
import { criarRepositorioLocal } from "@/lib/armazenamento/local";
import { caminhoSvg } from "@/lib/assinatura";
import { assinaturaFicticia, criarFichasExemplo } from "@/lib/exemplos";
import { calcularHash, registrarFicha } from "@/lib/fichas";
import { gerarPdf, paraWinAnsi, quebrarLinhas } from "@/lib/pdf";
import type { Documento } from "@/lib/tipos";

const anamnese = configuracao.documentos.find((d) => d.id === "anamnese") as Documento;
const pastas: string[] = [];
const pastaTemp = async () => {
  const p = await mkdtemp(path.join(tmpdir(), "ficha-"));
  pastas.push(p);
  return p;
};
afterAll(async () => {
  for (const p of pastas) await rm(p, { recursive: true, force: true });
});

const assinatura = { largura: 300, altura: 150, tracos: [[[10, 50], [60, 20], [120, 80], [200, 40]] as [number, number][]] };

describe("texto no PDF", () => {
  it("mantém acentos e troca caracteres que a fonte não desenha", () => {
    expect(paraWinAnsi("Ação, coração — “ok”")).toBe("Ação, coração — “ok”");
    expect(paraWinAnsi("tatuagem 🐍 nova")).toBe("tatuagem  nova");
    expect(paraWinAnsi("日本")).toBe("??");
  });

  it("quebra linhas dentro da largura, inclusive palavras gigantes", async () => {
    const pdf = await PDFDocument.create();
    const fonte = await pdf.embedFont(StandardFonts.Helvetica);
    const linhas = quebrarLinhas("palavra ".repeat(60) + "x".repeat(300), fonte, 10, 200);
    expect(linhas.length).toBeGreaterThan(5);
    for (const l of linhas) expect(fonte.widthOfTextAtSize(l, 10)).toBeLessThanOrEqual(200);
  });
});

describe("assinatura vetorial", () => {
  it("cabe na caixa e mantém a proporção", () => {
    const { d, escala } = caminhoSvg(assinatura, 100, 50);
    expect(d.startsWith("M")).toBe(true);
    expect(escala).toBeCloseTo(100 / 190); // 190 x 60: a largura limita (100/190 < 50/60)
    const numeros = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    for (const n of numeros) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(100);
    }
  });
});

describe("gerarPdf", () => {
  const base = {
    id: "00000000-0000-4000-8000-000000000000",
    negocio: configuracao.negocio,
    demonstracao: configuracao.demonstracao,
    documento: anamnese,
    assinatura,
    assinadoEm: new Date("2026-11-19T17:30:00Z"),
    nomeAssinante: "Maria Exemplo",
    hash: "a".repeat(64),
  };

  it("gera um PDF válido com metadados do documento", async () => {
    const bytes = await gerarPdf({ ...base, respostas: { nome: "Maria Exemplo", diabetes: "nao", lgpd: true } });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const lido = await PDFDocument.load(bytes);
    expect(lido.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(lido.getTitle()).toBe("Ficha de anamnese - Maria Exemplo");
    expect(lido.getAuthor()).toBe("Tinta Viva Tattoo");
    expect(lido.getKeywords()).toContain(base.id);
  });

  it("cria páginas extras para respostas longas sem quebrar", async () => {
    const curto = await PDFDocument.load(await gerarPdf({ ...base, respostas: { nome: "Maria" } }));
    const longo = await PDFDocument.load(
      await gerarPdf({ ...base, respostas: { nome: "Maria 🎨", descricao: "Desenho detalhado. ".repeat(400), observacoes: "linha\n".repeat(80) } }),
    );
    expect(longo.getPageCount()).toBeGreaterThan(curto.getPageCount());
  });
});

describe("registrarFicha (fluxo completo com armazenamento local)", () => {
  it("valida, gera o PDF, guarda e encontra pela busca sem acento", async () => {
    const repo = criarRepositorioLocal(await pastaTemp());
    const r = await registrarFicha(configuracao, repo, {
      documentoId: "autorizacao-imagem",
      respostas: { nome: "José Ávila Exemplo", cpf: "52998224725", uso: "sem-rosto", canais: ["Site do estúdio"], ciente: true, extra: "x" },
      assinatura: assinaturaFicticia(Math.random),
      ip: "203.0.113.5",
      agora: new Date("2026-11-19T12:00:00Z"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ficha.respostas).not.toHaveProperty("extra");
    expect(r.ficha.hash).toBe(
      calcularHash({ documentoId: "autorizacao-imagem", respostas: r.ficha.respostas, assinatura: r.ficha.assinatura, criadoEm: r.ficha.criadoEm }),
    );

    const lista = await repo.listar({ busca: "jose avila" });
    expect(lista.map((f) => f.id)).toEqual([r.ficha.id]);
    const pdf = await repo.lerPdf(r.ficha.id);
    expect(pdf && Buffer.from(pdf).equals(Buffer.from(r.pdf))).toBe(true);
    expect(await repo.lerPdf("../../etc/passwd")).toBeNull();
  });

  it("recusa envio inválido sem gravar nada", async () => {
    const repo = criarRepositorioLocal(await pastaTemp());
    const r = await registrarFicha(configuracao, repo, { documentoId: "anamnese", respostas: {}, assinatura: null });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erros.assinatura).toBeDefined();
    expect(r.erros.nome).toBeDefined();
    expect(await repo.contar()).toBe(0);
    const inexistente = await registrarFicha(configuracao, repo, { documentoId: "nao-existe", respostas: {}, assinatura: null });
    expect(inexistente.ok).toBe(false);
  });

  it("as fichas de exemplo passam na validação", async () => {
    const repo = criarRepositorioLocal(await pastaTemp());
    const criadas = await criarFichasExemplo(configuracao, repo);
    expect(criadas).toBe(16);
    expect(await repo.contar()).toBe(16);
  });
});
