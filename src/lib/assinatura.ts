import type { Assinatura } from "./tipos";

export interface Caixa {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

/** Retângulo que contém todos os pontos da assinatura. */
export function limites(a: Assinatura): Caixa {
  const pontos = a.tracos.flat();
  const xs = pontos.map((p) => p[0]);
  const ys = pontos.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, largura: Math.max(...xs) - x, altura: Math.max(...ys) - y };
}

/**
 * Converte os traços num "path" SVG, recortado e reescalado para caber em `largura` x `altura`
 * mantendo a proporção. Usado tanto no PDF quanto na pré-visualização do painel.
 */
export function caminhoSvg(a: Assinatura, largura: number, altura: number): { d: string; escala: number } {
  const c = limites(a);
  const escala = Math.min(largura / Math.max(c.largura, 1), altura / Math.max(c.altura, 1));
  const dx = (largura - c.largura * escala) / 2;
  const dy = (altura - c.altura * escala) / 2;
  const fmt = (n: number) => (Math.round(n * 100) / 100).toString();

  const partes = a.tracos.map((traco) => {
    const pts = traco.map(([x, y]) => [(x - c.x) * escala + dx, (y - c.y) * escala + dy]);
    // Um toque sem arrastar vira um pontinho
    if (pts.length === 1) pts.push([pts[0][0] + 0.5, pts[0][1] + 0.5]);
    return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${fmt(x)} ${fmt(y)}`).join(" ");
  });
  return { d: partes.join(" "), escala };
}
