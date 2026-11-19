import { obterRepositorio } from "@/lib/repositorio";
import { sessaoAtual } from "@/lib/painel";

export const runtime = "nodejs";

/** Download do PDF: só com login. */
export async function GET(req: Request, ctx: RouteContext<"/api/fichas/[id]/pdf">) {
  if (!(await sessaoAtual())) return new Response("Não autorizado", { status: 401 });

  const { id } = await ctx.params;
  const repo = await obterRepositorio();
  const ficha = await repo.buscar(id);
  const pdf = ficha && (await repo.lerPdf(id));
  if (!ficha || !pdf) return new Response("Não encontrado", { status: 404 });

  const nome = `${ficha.documentoId}-${ficha.nomeCliente}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
  const disposicao = new URL(req.url).searchParams.has("baixar") ? "attachment" : "inline";

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposicao}; filename="${nome}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
