/**
 * Fichas FICTÍCIAS para o modo demonstração (painel não começa vazio).
 * Nomes inventados, CPFs gerados por algoritmo (válidos no formato, não pertencem a ninguém
 * conhecido) e assinaturas desenhadas por fórmula.
 */
import type { Repositorio } from "./armazenamento/tipos";
import { registrarFicha } from "./fichas";
import type { Assinatura, ConfiguracaoDocumentos, Respostas } from "./tipos";

/** Gerador pseudoaleatório com semente (o seed sempre gera os mesmos dados). */
function aleatorio(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export function cpfFicticio(rand: () => number): string {
  const base = Array.from({ length: 9 }, () => Math.floor(rand() * 10));
  if (base.every((d) => d === base[0])) base[0] = (base[0] + 1) % 10;
  const dig = (nums: number[]) => {
    const soma = nums.reduce((s, n, i) => s + n * (nums.length + 1 - i), 0);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = dig(base);
  const d2 = dig([...base, d1]);
  return [...base, d1, d2].join("");
}

/** Uma "assinatura" cursiva feita de ondas: 2 ou 3 traços e um sublinhado. */
export function assinaturaFicticia(rand: () => number): Assinatura {
  const largura = 600;
  const altura = 200;
  const tracos: [number, number][][] = [];
  let x0 = 60 + rand() * 40;
  const partes = 2 + Math.floor(rand() * 2);
  for (let p = 0; p < partes; p++) {
    const comprimento = 120 + rand() * 90;
    const freq = 0.05 + rand() * 0.05;
    const amp = 25 + rand() * 25;
    const traco: [number, number][] = [];
    for (let i = 0; i <= 70; i++) {
      const t = i / 70;
      const x = x0 + t * comprimento + Math.sin(t * Math.PI * 6) * 12;
      const y = 100 + Math.sin(x * freq) * amp * (1 - t * 0.4) + Math.cos(t * Math.PI * 9) * 10;
      traco.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
    }
    tracos.push(traco);
    x0 += comprimento + 10;
  }
  const yLinha = 150 + rand() * 10;
  tracos.push([
    [60, yLinha],
    [Math.min(x0, 560), yLinha - 6],
  ]);
  return { largura, altura, tracos };
}

const PESSOAS = [
  "Ana Beatriz Fictícia",
  "Bruno Exemplo Santos",
  "Camila Demonstração Rocha",
  "Diego Teste Almeida",
  "Elisa Modelo Carvalho",
  "Felipe Amostra Lima",
  "Giovana Simulada Pereira",
  "Henrique Ilustrativo Costa",
];

const LOCAIS = ["Antebraço esquerdo", "Panturrilha direita", "Costas (escápula)", "Tornozelo", "Costela", "Pulso direito"];
const DESENHOS = [
  "Rosa fineline com folhas, 12 cm",
  "Lettering “coragem” em script",
  "Lobo geométrico em blackwork",
  "Ondas no estilo japonês, sem cor",
  "Constelação de Escorpião, pontilhismo",
  "Gato minimalista com traço único",
];

function respostasAnamnese(nome: string, rand: () => number, i: number): Respostas {
  const simNao = (chance: number) => (rand() < chance ? "sim" : "nao");
  const r: Respostas = {
    nome,
    nascimento: `${1975 + Math.floor(rand() * 25)}-0${1 + Math.floor(rand() * 9)}-1${Math.floor(rand() * 9)}`,
    cpf: cpfFicticio(rand),
    telefone: `11 9${String(10000000 + Math.floor(rand() * 89999999))}`,
    email: `${nome.split(" ")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}@exemplo.com`,
    diabetes: simNao(0.1),
    pressao: simNao(0.15),
    alergia: simNao(0.3),
    cicatrizacao: simNao(0.1),
    anticoagulante: simNao(0.15),
    gestante: "nao",
    pele: "nao",
    ultimas24h: rand() < 0.4 ? ["Dormiu menos de 6 horas"] : [],
    observacoes: rand() < 0.5 ? "Primeira tatuagem, um pouco de ansiedade com a dor." : "",
    local: LOCAIS[i % LOCAIS.length],
    descricao: DESENHOS[i % DESENHOS.length],
    veracidade: true,
    lgpd: true,
  };
  if (r.alergia === "sim") r.alergia_detalhe = "Dipirona";
  if (r.anticoagulante === "sim") r.anticoagulante_detalhe = "Losartana (pressão)";
  return r;
}

function respostasImagem(nome: string, cpf: string, rand: () => number): Respostas {
  const uso = ["com-rosto", "sem-rosto", "sem-rosto", "nao-autorizo"][Math.floor(rand() * 4)];
  return {
    nome,
    cpf,
    uso,
    canais: uso === "nao-autorizo" ? [] : ["Instagram e TikTok do estúdio", "Site do estúdio"],
    marcar_perfil: uso === "nao-autorizo" ? "nao" : "sim",
    perfil: uso === "nao-autorizo" ? "" : `@${nome.split(" ")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}.exemplo`,
    ciente: true,
  };
}

/** Cria as fichas de exemplo (anamnese + termo de imagem para cada pessoa), espalhadas nos últimos 30 dias. */
export async function criarFichasExemplo(config: ConfiguracaoDocumentos, repo: Repositorio, agora = new Date()) {
  const rand = aleatorio(2026);
  let criadas = 0;
  for (const [i, nome] of PESSOAS.entries()) {
    const quando = new Date(agora.getTime() - (PESSOAS.length - i) * 3.4 * 24 * 3600 * 1000 - rand() * 6 * 3600 * 1000);
    const anamnese = respostasAnamnese(nome, rand, i);
    const comum = {
      ip: `203.0.113.${10 + i}`, // faixa reservada para documentação (RFC 5737)
      navegador: "Mozilla/5.0 (Linux; Android 14) Exemplo/1.0 Mobile",
      exemplo: true,
    };
    const docs: [string, Respostas][] = [
      ["anamnese", anamnese],
      ["autorizacao-imagem", respostasImagem(nome, String(anamnese.cpf), rand)],
    ];
    for (const [j, [documentoId, respostas]] of docs.entries()) {
      if (!config.documentos.some((d) => d.id === documentoId)) continue;
      const r = await registrarFicha(config, repo, {
        ...comum,
        documentoId,
        respostas,
        assinatura: assinaturaFicticia(rand),
        agora: new Date(quando.getTime() + j * 4 * 60 * 1000),
      });
      if (!r.ok) throw new Error(`Exemplo inválido (${documentoId}): ${JSON.stringify(r.erros)}`);
      criadas++;
    }
  }
  return criadas;
}
