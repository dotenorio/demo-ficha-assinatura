import { configuracao } from "@/config/documentos";
import { registrarFicha } from "@/lib/fichas";
import { dataHoraBr } from "@/lib/formato";
import { obterRepositorio } from "@/lib/repositorio";
import { esquemaEnvio } from "@/lib/validacao";

export const runtime = "nodejs";

const LIMITE_BYTES = 400_000;

/** Recebe o formulário assinado, gera o PDF e devolve uma cópia para o cliente baixar uma única vez. */
export async function POST(req: Request) {
  const texto = await req.text();
  if (texto.length > LIMITE_BYTES) {
    return Response.json({ mensagem: "Envio grande demais. Limpe a assinatura e tente de novo." }, { status: 413 });
  }

  let corpo: unknown;
  try {
    corpo = JSON.parse(texto);
  } catch {
    return Response.json({ mensagem: "Formato inválido." }, { status: 400 });
  }
  const envio = esquemaEnvio.safeParse(corpo);
  if (!envio.success) return Response.json({ mensagem: "Formato inválido." }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || undefined;

  try {
    const repo = await obterRepositorio();
    const r = await registrarFicha(configuracao, repo, {
      documentoId: envio.data.documentoId,
      respostas: envio.data.respostas,
      assinatura: envio.data.assinatura,
      ip,
      navegador: req.headers.get("user-agent") ?? undefined,
    });
    if (!r.ok) return Response.json({ mensagem: r.mensagem, erros: r.erros }, { status: r.status });

    return Response.json(
      {
        id: r.ficha.id,
        assinadoEmTexto: dataHoraBr(r.ficha.criadoEm, configuracao.negocio.fusoHorario),
        pdfBase64: Buffer.from(r.pdf).toString("base64"),
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("Falha ao registrar ficha", e);
    return Response.json({ mensagem: "Erro ao salvar. Tente de novo em instantes." }, { status: 500 });
  }
}
