import { describe, expect, it } from "vitest";
import { configuracao } from "@/config/documentos";
import { assinaturaFicticia, cpfFicticio } from "@/lib/exemplos";
import type { Documento, Respostas } from "@/lib/tipos";
import {
  cpfValido,
  dataValida,
  emailValido,
  limparRespostas,
  telefoneValido,
  validarAssinatura,
  validarRespostas,
} from "@/lib/validacao";

const anamnese = configuracao.documentos.find((d) => d.id === "anamnese") as Documento;
const imagem = configuracao.documentos.find((d) => d.id === "autorizacao-imagem") as Documento;
const HOJE = new Date(2026, 10, 19);

const anamneseValida = (): Respostas => ({
  nome: "Maria Exemplo",
  nascimento: "1990-05-20",
  cpf: "529.982.247-25",
  telefone: "(11) 98765-4321",
  email: "maria@exemplo.com",
  diabetes: "nao",
  pressao: "nao",
  alergia: "nao",
  cicatrizacao: "nao",
  anticoagulante: "nao",
  gestante: "nao",
  pele: "nao",
  ultimas24h: [],
  local: "Braço",
  descricao: "Rosa",
  veracidade: true,
  lgpd: true,
});

describe("formatos", () => {
  it("valida CPF pelos dígitos verificadores", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("52998224725")).toBe(true);
    expect(cpfValido("529.982.247-24")).toBe(false);
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("123")).toBe(false);
  });

  it("CPFs fictícios do seed são válidos", () => {
    let s = 1;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 50; i++) expect(cpfValido(cpfFicticio(rand))).toBe(true);
  });

  it("aceita celular e fixo com DDD", () => {
    expect(telefoneValido("(11) 98765-4321")).toBe(true);
    expect(telefoneValido("+55 11 98765-4321")).toBe(true);
    expect(telefoneValido("1133334444")).toBe(true);
    expect(telefoneValido("98765-4321")).toBe(false);
  });

  it("valida e-mail e datas reais", () => {
    expect(emailValido("a@b.com")).toBe(true);
    expect(emailValido("a@b")).toBe(false);
    expect(dataValida("2024-02-29")).toBe(true);
    expect(dataValida("2023-02-29")).toBe(false);
    expect(dataValida("29/02/2024")).toBe(false);
  });
});

describe("validarRespostas", () => {
  it("não aponta erros numa ficha completa", () => {
    expect(validarRespostas(anamnese, anamneseValida(), HOJE)).toEqual({});
  });

  it("aponta campos obrigatórios vazios e aceites não marcados", () => {
    const erros = validarRespostas(anamnese, {}, HOJE);
    expect(erros.nome).toBe("Preencha este campo.");
    expect(erros.diabetes).toBe("Escolha sim ou não.");
    expect(erros.lgpd).toBe("É preciso marcar para continuar.");
    expect(erros.email).toBeUndefined(); // opcional
    expect(erros.ultimas24h).toBeUndefined(); // opcional
  });

  it("exige idade mínima de 18 anos", () => {
    const r = { ...anamneseValida(), nascimento: "2010-01-01" };
    expect(validarRespostas(anamnese, r, HOJE).nascimento).toBe("É preciso ter pelo menos 18 anos.");
    // faz 18 exatamente hoje
    expect(validarRespostas(anamnese, { ...r, nascimento: "2008-11-19" }, HOJE).nascimento).toBeUndefined();
    expect(validarRespostas(anamnese, { ...r, nascimento: "2008-11-20" }, HOJE).nascimento).toBeDefined();
  });

  it("pede detalhe quando a resposta é sim", () => {
    const r = { ...anamneseValida(), alergia: "sim" };
    expect(validarRespostas(anamnese, r, HOJE).alergia_detalhe).toBe("Conte um pouco mais.");
    expect(validarRespostas(anamnese, { ...r, alergia_detalhe: "Látex" }, HOJE)).toEqual({});
  });

  it("recusa opções que não existem na configuração", () => {
    const base: Respostas = { nome: "João", cpf: "52998224725", uso: "outra", ciente: true };
    expect(validarRespostas(imagem, base, HOJE).uso).toBe("Opção inválida.");
    expect(validarRespostas(imagem, { ...base, uso: "sem-rosto", canais: ["Outdoor"] }, HOJE).canais).toBe("Opção inválida.");
  });

  it("descarta chaves que não pertencem ao documento", () => {
    const limpas = limparRespostas(anamnese, { ...anamneseValida(), hacker: "x", alergia_detalhe: "ignorado" });
    expect(limpas).not.toHaveProperty("hacker");
    expect(limpas).not.toHaveProperty("alergia_detalhe"); // alergia = não
  });
});

describe("validarAssinatura", () => {
  it("aceita uma assinatura normal", () => {
    expect(validarAssinatura(assinaturaFicticia(Math.random))).toBeUndefined();
  });

  it("recusa quadro vazio, pontinho e formato inválido", () => {
    expect(validarAssinatura(undefined)).toBeDefined();
    expect(validarAssinatura({ largura: 300, altura: 150, tracos: [] })).toBeDefined();
    expect(validarAssinatura({ largura: 300, altura: 150, tracos: [[[10, 10]]] })).toMatch(/curta/);
    const rabisco = Array.from({ length: 20 }, (_, i) => [100 + (i % 3), 50 + (i % 2)] as [number, number]);
    expect(validarAssinatura({ largura: 300, altura: 150, tracos: [rabisco] })).toMatch(/pequena/);
    expect(validarAssinatura({ largura: 300, altura: 150, tracos: [[["a", 1]]] })).toBeDefined();
  });
});
