/**
 * Geração do PDF com pdf-lib (JavaScript puro: roda no Node, na Vercel e nos testes,
 * sem navegador headless). A assinatura entra como vetor, então fica nítida em qualquer zoom.
 */
import { LineCapStyle, PDFDocument, PDFFont, PDFPage, StandardFonts, degrees, rgb, type RGB } from "pdf-lib";
import { caminhoSvg } from "./assinatura";
import { dataHoraBr, respostaEmTexto } from "./formato";
import type { Assinatura, Campo, Demonstracao, Documento, Negocio, Respostas } from "./tipos";
import { idDetalhe } from "./validacao";

export interface DadosPdf {
  id: string;
  negocio: Negocio;
  demonstracao?: Demonstracao;
  documento: Documento;
  respostas: Respostas;
  assinatura: Assinatura;
  assinadoEm: Date;
  nomeAssinante: string;
  hash: string;
  ip?: string;
  navegador?: string;
}

const A4 = { largura: 595.28, altura: 841.89 };
const MARGEM = 50;
const LARGURA_UTIL = A4.largura - MARGEM * 2;
const CINZA = rgb(0.4, 0.4, 0.4);
const PRETO = rgb(0.1, 0.1, 0.1);
const LINHA = rgb(0.82, 0.82, 0.82);

// Caracteres extras (além do Latin-1) que a codificação WinAnsi das fontes padrão aceita
const EXTRAS_WINANSI = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

/**
 * As fontes padrão do PDF só sabem desenhar WinAnsi (Latin-1 + alguns símbolos).
 * Acentos do português funcionam; emojis e outros símbolos viram "?" em vez de quebrar o PDF.
 */
export function paraWinAnsi(texto: string): string {
  let saida = "";
  for (const ch of texto.normalize("NFC").replace(/\r\n?/g, "\n").replace(/\t/g, " ")) {
    const c = ch.codePointAt(0)!;
    if (ch === "\n" || (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || EXTRAS_WINANSI.has(ch)) saida += ch;
    else if (c > 0xffff || (c >= 0x2600 && c <= 0x27bf) || c === 0xfe0f || c === 0x200d) continue; // emojis
    else saida += "?";
  }
  return saida;
}

/** Quebra o texto em linhas que cabem em `largura` (respeita \n e quebra palavras gigantes). */
export function quebrarLinhas(texto: string, fonte: PDFFont, tamanho: number, largura: number): string[] {
  const linhas: string[] = [];
  for (const paragrafo of paraWinAnsi(texto).split("\n")) {
    let atual = "";
    for (const palavraOriginal of paragrafo.split(/ +/)) {
      let palavra = palavraOriginal;
      // Palavra maior que a linha inteira (ex.: link): corta em pedaços
      while (fonte.widthOfTextAtSize(palavra, tamanho) > largura) {
        let i = palavra.length;
        while (i > 1 && fonte.widthOfTextAtSize(palavra.slice(0, i), tamanho) > largura) i--;
        if (atual) {
          linhas.push(atual);
          atual = "";
        }
        linhas.push(palavra.slice(0, i));
        palavra = palavra.slice(i);
      }
      const tentativa = atual ? `${atual} ${palavra}` : palavra;
      if (fonte.widthOfTextAtSize(tentativa, tamanho) <= largura) atual = tentativa;
      else {
        linhas.push(atual);
        atual = palavra;
      }
    }
    linhas.push(atual);
  }
  return linhas;
}

function hexParaRgb(hex: string): RGB {
  const n = parseInt(hex.replace("#", ""), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Controla a posição de escrita e cria páginas novas quando o espaço acaba. */
class Escritor {
  pagina!: PDFPage;
  y = 0;

  constructor(
    private pdf: PDFDocument,
    private aoCriarPagina: (p: PDFPage) => number,
  ) {
    this.novaPagina();
  }

  novaPagina() {
    this.pagina = this.pdf.addPage([A4.largura, A4.altura]);
    this.y = this.aoCriarPagina(this.pagina);
  }

  /** Garante `altura` pontos livres antes do rodapé. */
  reservar(altura: number) {
    if (this.y - altura < MARGEM + 30) this.novaPagina();
  }

  texto(conteudo: string, opcoes: { fonte: PDFFont; tamanho: number; cor?: RGB; recuo?: number; espacamento?: number }) {
    const { fonte, tamanho, cor = PRETO, recuo = 0, espacamento = 1.35 } = opcoes;
    const altura = tamanho * espacamento;
    for (const linha of quebrarLinhas(conteudo, fonte, tamanho, LARGURA_UTIL - recuo)) {
      this.reservar(altura);
      this.y -= altura;
      if (linha) this.pagina.drawText(linha, { x: MARGEM + recuo, y: this.y, size: tamanho, font: fonte, color: cor });
    }
  }

  caixaMarcar(marcada: boolean, rotulo: string, fonte: PDFFont, recuo = 0) {
    const tamanho = 10;
    const linhas = quebrarLinhas(rotulo, fonte, tamanho, LARGURA_UTIL - recuo - 18);
    this.reservar(tamanho * 1.4 * linhas.length + 2);
    const topo = this.y;
    const lado = 9;
    this.pagina.drawRectangle({
      x: MARGEM + recuo,
      y: topo - tamanho * 1.4 + 0,
      width: lado,
      height: lado,
      borderColor: PRETO,
      borderWidth: 0.8,
    });
    if (marcada) {
      const x0 = MARGEM + recuo;
      const y0 = topo - tamanho * 1.4;
      this.pagina.drawLine({ start: { x: x0 + 2, y: y0 + 4.5 }, end: { x: x0 + 4, y: y0 + 2 }, thickness: 1.4, color: PRETO });
      this.pagina.drawLine({ start: { x: x0 + 4, y: y0 + 2 }, end: { x: x0 + 7.5, y: y0 + 7.5 }, thickness: 1.4, color: PRETO });
    }
    for (const linha of linhas) {
      this.y -= tamanho * 1.4;
      this.pagina.drawText(linha, { x: MARGEM + recuo + 15, y: this.y + 1, size: tamanho, font: fonte, color: PRETO });
    }
    this.y -= 2;
  }

  espaco(n: number) {
    this.y -= n;
  }
}

export async function gerarPdf(d: DadosPdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const corMarca = hexParaRgb(d.negocio.corPrimaria);
  const assinadoEmTexto = dataHoraBr(d.assinadoEm, d.negocio.fusoHorario);
  const rotuloFuso = d.negocio.fusoHorario === "America/Sao_Paulo" ? "horário de Brasília" : d.negocio.fusoHorario;

  pdf.setTitle(paraWinAnsi(`${d.documento.titulo} - ${d.nomeAssinante}`));
  pdf.setAuthor(paraWinAnsi(d.negocio.nome));
  pdf.setSubject(paraWinAnsi(d.documento.titulo));
  pdf.setKeywords([d.documento.id, d.id]);
  pdf.setCreator("demo-ficha-assinatura");
  pdf.setProducer("pdf-lib");
  pdf.setCreationDate(d.assinadoEm);
  pdf.setModificationDate(d.assinadoEm);

  const cabecalho = (p: PDFPage): number => {
    if (d.demonstracao) {
      // Marca d'água diagonal centralizada na página
      const marca = "DEMONSTRAÇÃO";
      const tamanho = 64;
      const angulo = (40 * Math.PI) / 180;
      const largura = negrito.widthOfTextAtSize(marca, tamanho);
      p.drawText(marca, {
        x: A4.largura / 2 - (Math.cos(angulo) * largura) / 2 + (Math.sin(angulo) * tamanho) / 3,
        y: A4.altura / 2 - (Math.sin(angulo) * largura) / 2 - (Math.cos(angulo) * tamanho) / 3,
        size: tamanho,
        font: negrito,
        color: rgb(0.85, 0.15, 0.15),
        opacity: 0.07,
        rotate: degrees(40),
      });
    }
    const topo = A4.altura - MARGEM;
    p.drawText(paraWinAnsi(d.negocio.nome), { x: MARGEM, y: topo - 14, size: 15, font: negrito, color: corMarca });
    p.drawText(paraWinAnsi(d.negocio.subtitulo), { x: MARGEM, y: topo - 28, size: 8.5, font: normal, color: CINZA });
    let y = topo - 38;
    if (d.demonstracao) {
      const aviso = "DEMONSTRAÇÃO · documento com dados fictícios, sem valor legal";
      p.drawRectangle({ x: MARGEM, y: y - 16, width: LARGURA_UTIL, height: 14, color: rgb(0.99, 0.93, 0.93) });
      p.drawText(paraWinAnsi(aviso), { x: MARGEM + 6, y: y - 12, size: 8, font: negrito, color: rgb(0.7, 0.1, 0.1) });
      y -= 20;
    }
    p.drawLine({ start: { x: MARGEM, y: y - 4 }, end: { x: A4.largura - MARGEM, y: y - 4 }, thickness: 1, color: corMarca });
    return y - 12;
  };

  const e = new Escritor(pdf, cabecalho);

  e.texto(d.documento.titulo, { fonte: negrito, tamanho: 16 });
  e.espaco(4);

  for (const secao of d.documento.secoes) {
    // Título de seção nunca fica sozinho no pé da página: reserva espaço para ele + o primeiro campo
    e.reservar(80);
    e.espaco(10);
    e.texto(secao.titulo.toUpperCase(), { fonte: negrito, tamanho: 10, cor: corMarca });
    e.espaco(2);
    for (const p of secao.paragrafos ?? []) {
      e.texto(p, { fonte: normal, tamanho: 10, espacamento: 1.45 });
      e.espaco(4);
    }
    for (const campo of secao.campos ?? []) escreverCampo(e, campo, d.respostas, normal, negrito);
  }

  // ---- Bloco de assinatura (não pode ser dividido entre páginas) ----
  e.reservar(240);
  e.espaco(18);
  e.texto(d.documento.declaracaoAssinatura, { fonte: normal, tamanho: 10 });
  e.espaco(6);

  const caixa = { largura: 240, altura: 80 };
  const { d: caminho } = caminhoSvg(d.assinatura, caixa.largura - 16, caixa.altura - 16);
  const topoCaixa = e.y;
  e.pagina.drawSvgPath(caminho, {
    x: MARGEM + 8,
    y: topoCaixa - 8,
    borderColor: rgb(0.05, 0.1, 0.35),
    borderWidth: 1.6,
    borderLineCap: LineCapStyle.Round,
  });
  e.y = topoCaixa - caixa.altura;
  e.pagina.drawLine({ start: { x: MARGEM, y: e.y }, end: { x: MARGEM + caixa.largura, y: e.y }, thickness: 0.8, color: PRETO });
  e.espaco(2);
  e.texto(d.nomeAssinante, { fonte: negrito, tamanho: 10 });
  e.texto(`Assinado eletronicamente em ${assinadoEmTexto} (${rotuloFuso})`, { fonte: normal, tamanho: 9 });

  e.espaco(10);
  e.pagina.drawRectangle({ x: MARGEM, y: e.y - 62, width: LARGURA_UTIL, height: 60, color: rgb(0.96, 0.96, 0.96) });
  e.espaco(2);
  const meta = { fonte: normal, tamanho: 7.5, cor: CINZA, recuo: 6, espacamento: 1.4 };
  e.texto("REGISTRO DA ASSINATURA", { ...meta, fonte: negrito });
  e.texto(`Código do documento: ${d.id}`, meta);
  e.texto(`Endereço IP: ${d.ip || "não informado"}`, meta);
  e.texto(`Navegador: ${(d.navegador || "não informado").slice(0, 140)}`, meta);
  e.texto(`Código de verificação (SHA-256 dos dados e da assinatura): ${d.hash}`, meta);

  // ---- Rodapé com numeração ----
  const paginas = pdf.getPages();
  paginas.forEach((p, i) => {
    const rodape = paraWinAnsi(
      `${d.negocio.nome} · ${d.documento.titulo} · Página ${i + 1} de ${paginas.length} · Dados protegidos pela LGPD: ${d.negocio.contatoPrivacidade}`,
    );
    p.drawLine({ start: { x: MARGEM, y: MARGEM + 6 }, end: { x: A4.largura - MARGEM, y: MARGEM + 6 }, thickness: 0.5, color: LINHA });
    p.drawText(rodape, { x: MARGEM, y: MARGEM - 6, size: 7, font: normal, color: CINZA });
  });

  return pdf.save();
}

function escreverCampo(e: Escritor, campo: Campo, respostas: Respostas, normal: PDFFont, negrito: PDFFont) {
  e.espaco(5);
  switch (campo.tipo) {
    case "aceite":
      e.caixaMarcar(respostas[campo.id] === true, campo.rotulo, normal);
      return;
    case "marcar": {
      e.reservar(30);
      e.texto(campo.rotulo, { fonte: negrito, tamanho: 9, cor: CINZA });
      const marcadas = Array.isArray(respostas[campo.id]) ? (respostas[campo.id] as string[]) : [];
      for (const opcao of campo.opcoes) e.caixaMarcar(marcadas.includes(opcao), opcao, normal, 4);
      return;
    }
    default: {
      e.reservar(28);
      e.texto(campo.rotulo, { fonte: negrito, tamanho: 9, cor: CINZA });
      let valor = respostaEmTexto(campo, respostas);
      if (campo.tipo === "simNao" && campo.detalharSeSim && respostas[campo.id] === "sim") {
        valor += ` · ${campo.detalharSeSim} ${respostas[idDetalhe(campo.id)] ?? ""}`;
      }
      e.texto(valor, { fonte: normal, tamanho: 10.5 });
    }
  }
}
