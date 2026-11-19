/**
 * ESTE É O ÚNICO ARQUIVO QUE VOCÊ PRECISA TROCAR PARA OUTRO CLIENTE.
 *
 * Aqui ficam o nome do negócio e o texto de cada documento (perguntas, cláusulas, opções).
 * O formulário, a validação e o PDF são montados a partir daqui.
 *
 * Tipos de campo disponíveis (ver src/lib/tipos.ts):
 *   texto       → linha de texto (formatos: cpf, telefone, email, data)
 *   textoLongo  → caixa de várias linhas
 *   simNao      → sim / não, com detalhe opcional quando "sim"
 *   marcar      → várias caixas de marcar
 *   escolha     → uma opção entre várias
 *   aceite      → caixa obrigatória de "declaro que..."
 *
 * ATENÇÃO: o negócio abaixo é FICTÍCIO. É só uma demonstração.
 */
import type { ConfiguracaoDocumentos } from "@/lib/tipos";

export const configuracao: ConfiguracaoDocumentos = {
  negocio: {
    nome: "Tinta Viva Tattoo",
    subtitulo: "Estúdio fictício · São Paulo/SP · CNPJ 00.000.000/0000-00",
    corPrimaria: "#7c2d12",
    fusoHorario: "America/Sao_Paulo",
    contatoPrivacidade: "privacidade@tintaviva.exemplo",
  },

  demonstracao: {
    texto: "Demonstração com estúdio e dados fictícios. Não digite dados reais.",
    link: {
      texto: "Ver o código no GitHub",
      url: "https://github.com/dotenorio/demo-ficha-assinatura",
    },
  },

  documentos: [
    {
      id: "anamnese",
      titulo: "Ficha de anamnese",
      resumo: "Perguntas de saúde que o tatuador precisa saber antes da sessão.",
      campoNome: "nome",
      secoes: [
        {
          titulo: "Seus dados",
          campos: [
            { tipo: "texto", id: "nome", rotulo: "Nome completo", obrigatorio: true },
            {
              tipo: "texto",
              id: "nascimento",
              rotulo: "Data de nascimento",
              formato: "data",
              idadeMinima: 18,
              ajuda: "Só atendemos maiores de 18 anos.",
              obrigatorio: true,
            },
            { tipo: "texto", id: "cpf", rotulo: "CPF", formato: "cpf", obrigatorio: true },
            { tipo: "texto", id: "telefone", rotulo: "Celular (WhatsApp)", formato: "telefone", obrigatorio: true },
            { tipo: "texto", id: "email", rotulo: "E-mail", formato: "email" },
          ],
        },
        {
          titulo: "Saúde",
          paragrafos: [
            "Responda com sinceridade. Essas informações ajudam a evitar complicações na cicatrização e só são vistas pelo estúdio.",
          ],
          campos: [
            { tipo: "simNao", id: "diabetes", rotulo: "Tem diabetes?", obrigatorio: true },
            { tipo: "simNao", id: "pressao", rotulo: "Tem pressão alta ou baixa?", obrigatorio: true },
            {
              tipo: "simNao",
              id: "alergia",
              rotulo: "Tem alergia a algum medicamento, metal, látex ou pomada?",
              detalharSeSim: "A quê?",
              obrigatorio: true,
            },
            {
              tipo: "simNao",
              id: "cicatrizacao",
              rotulo: "Já teve queloide ou problema de cicatrização?",
              obrigatorio: true,
            },
            {
              tipo: "simNao",
              id: "anticoagulante",
              rotulo: "Usa anticoagulante ou algum remédio contínuo?",
              detalharSeSim: "Qual?",
              obrigatorio: true,
            },
            { tipo: "simNao", id: "gestante", rotulo: "Está grávida ou amamentando?", obrigatorio: true },
            {
              tipo: "simNao",
              id: "pele",
              rotulo: "Tem alguma doença de pele no local da tatuagem?",
              detalharSeSim: "Qual?",
              obrigatorio: true,
            },
            {
              tipo: "marcar",
              id: "ultimas24h",
              rotulo: "Nas últimas 24 horas você:",
              opcoes: [
                "Consumiu bebida alcoólica",
                "Tomou anti-inflamatório ou aspirina",
                "Dormiu menos de 6 horas",
                "Ficou sem se alimentar",
              ],
            },
            { tipo: "textoLongo", id: "observacoes", rotulo: "Algo mais que devemos saber?" },
          ],
        },
        {
          titulo: "Sobre a tatuagem",
          campos: [
            { tipo: "texto", id: "local", rotulo: "Local do corpo", placeholder: "Ex.: antebraço esquerdo", obrigatorio: true },
            { tipo: "textoLongo", id: "descricao", rotulo: "Descrição do desenho", obrigatorio: true },
          ],
        },
        {
          titulo: "Declaração",
          campos: [
            {
              tipo: "aceite",
              id: "veracidade",
              rotulo: "Declaro que as informações acima são verdadeiras e que fui orientado(a) sobre os cuidados após a tatuagem.",
              obrigatorio: true,
            },
            {
              tipo: "aceite",
              id: "lgpd",
              rotulo: "Autorizo o estúdio a guardar estes dados de saúde só para fins de atendimento, conforme a LGPD.",
              obrigatorio: true,
            },
          ],
        },
      ],
      declaracaoAssinatura: "Ao assinar, confirmo as respostas desta ficha.",
    },

    {
      id: "autorizacao-imagem",
      titulo: "Termo de autorização de uso de imagem",
      resumo: "Você escolhe se o estúdio pode postar fotos da sua tatuagem, e onde.",
      campoNome: "nome",
      secoes: [
        {
          titulo: "Identificação",
          campos: [
            { tipo: "texto", id: "nome", rotulo: "Nome completo", obrigatorio: true },
            { tipo: "texto", id: "cpf", rotulo: "CPF", formato: "cpf", obrigatorio: true },
          ],
        },
        {
          titulo: "Termo",
          paragrafos: [
            "Pelo presente termo, autorizo o estúdio Tinta Viva Tattoo a fotografar e filmar a tatuagem realizada em mim, nos limites das opções que marquei abaixo.",
            "As imagens poderão ser usadas para divulgação do trabalho do estúdio, sem fins comerciais diretos e sem qualquer pagamento a mim.",
            "Posso revogar esta autorização a qualquer momento, por escrito, e o estúdio deixará de fazer novas publicações. Publicações já feitas serão removidas em até 30 dias.",
          ],
          campos: [
            {
              tipo: "escolha",
              id: "uso",
              rotulo: "O que pode aparecer nas fotos e vídeos?",
              obrigatorio: true,
              opcoes: [
                { valor: "com-rosto", rotulo: "A tatuagem e o meu rosto" },
                { valor: "sem-rosto", rotulo: "Só a tatuagem, sem mostrar o rosto" },
                { valor: "nao-autorizo", rotulo: "Não autorizo fotos nem vídeos" },
              ],
            },
            {
              tipo: "marcar",
              id: "canais",
              rotulo: "Onde as imagens podem ser publicadas?",
              ajuda: "Ignore se escolheu “não autorizo”.",
              opcoes: ["Instagram e TikTok do estúdio", "Site do estúdio", "Portfólio impresso", "Concursos e convenções"],
            },
            { tipo: "simNao", id: "marcar_perfil", rotulo: "Quer ser marcado(a) nas publicações?" },
            { tipo: "texto", id: "perfil", rotulo: "Seu @ no Instagram (opcional)", placeholder: "@seuperfil" },
            {
              tipo: "aceite",
              id: "ciente",
              rotulo: "Li o termo acima e concordo com as opções que marquei.",
              obrigatorio: true,
            },
          ],
        },
      ],
      declaracaoAssinatura: "Ao assinar, concordo com este termo nas opções que escolhi.",
    },
  ],
};
