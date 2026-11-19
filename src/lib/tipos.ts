/**
 * Tipos do arquivo src/config/documentos.ts.
 * Para adaptar a outro cliente você só edita o arquivo de configuração, não este.
 */

interface CampoBase {
  /** Identificador único dentro do documento (vira a chave da resposta). */
  id: string;
  /** Pergunta ou rótulo mostrado ao cliente e impresso no PDF. */
  rotulo: string;
  /** Texto curto de ajuda abaixo do campo. */
  ajuda?: string;
  obrigatorio?: boolean;
}

export interface CampoTexto extends CampoBase {
  tipo: "texto";
  placeholder?: string;
  /** Validação e teclado adequados no celular. */
  formato?: "cpf" | "telefone" | "email" | "data";
  /** Só para formato "data": idade mínima em anos (ex.: 18 para tatuagem). */
  idadeMinima?: number;
}

export interface CampoTextoLongo extends CampoBase {
  tipo: "textoLongo";
  placeholder?: string;
}

/** Pergunta de sim ou não. Se `detalharSeSim` existir, pede detalhes quando a resposta é "sim". */
export interface CampoSimNao extends CampoBase {
  tipo: "simNao";
  detalharSeSim?: string;
}

/** Várias caixas de marcar (o cliente pode marcar nenhuma, uma ou várias). */
export interface CampoMarcar extends CampoBase {
  tipo: "marcar";
  opcoes: string[];
}

/** Escolha única (botões de opção). */
export interface CampoEscolha extends CampoBase {
  tipo: "escolha";
  opcoes: { valor: string; rotulo: string }[];
}

/** Uma caixa que precisa ser marcada para enviar (declarações, ciência, aceite). */
export interface CampoAceite extends CampoBase {
  tipo: "aceite";
}

export type Campo =
  | CampoTexto
  | CampoTextoLongo
  | CampoSimNao
  | CampoMarcar
  | CampoEscolha
  | CampoAceite;

export interface Secao {
  titulo: string;
  /** Parágrafos de texto corrido (cláusulas de um termo, orientações). */
  paragrafos?: string[];
  campos?: Campo[];
}

export interface Documento {
  /** Usado na URL: /assinar/<id> */
  id: string;
  titulo: string;
  /** Uma frase explicando o documento na página inicial. */
  resumo: string;
  /** Id do campo que guarda o nome do cliente (usado na busca do painel e na assinatura). */
  campoNome: string;
  secoes: Secao[];
  /** Texto exibido logo acima da assinatura. */
  declaracaoAssinatura: string;
}

export interface Negocio {
  nome: string;
  /** Linha abaixo do nome (cidade, CNPJ fictício etc.). Sai no cabeçalho do PDF. */
  subtitulo: string;
  /** Cor principal da interface (hexadecimal). */
  corPrimaria: string;
  /** Fuso usado para registrar data e hora da assinatura. */
  fusoHorario: string;
  /** Contato do encarregado de dados (LGPD) mostrado no rodapé. */
  contatoPrivacidade: string;
}

export interface Demonstracao {
  /** Texto da faixa no topo de todas as páginas. */
  texto: string;
  link?: { texto: string; url: string };
}

export interface ConfiguracaoDocumentos {
  negocio: Negocio;
  /** Remova (ou deixe undefined) num cliente real: some a faixa e o carimbo no PDF. */
  demonstracao?: Demonstracao;
  documentos: Documento[];
}

/** Respostas como chegam do formulário. */
export type ValorResposta = string | boolean | string[];
export type Respostas = Record<string, ValorResposta | undefined>;

/** Assinatura guardada como traços vetoriais (coordenadas em pixels da tela onde foi feita). */
export interface Assinatura {
  largura: number;
  altura: number;
  tracos: [number, number][][];
}
