"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import type { Assinatura } from "@/lib/tipos";

interface Props {
  aoMudar: (assinatura: Assinatura | null) => void;
  erro?: string;
}

/** Quadro para assinar com o dedo (celular) ou com o mouse (computador). */
export function QuadroAssinatura({ aoMudar, erro }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const aoMudarRef = useRef(aoMudar);
  const [vazio, setVazio] = useState(true);

  useEffect(() => {
    aoMudarRef.current = aoMudar;
  }, [aoMudar]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const pad = new SignaturePad(canvas, { penColor: "#0b1a52", minWidth: 0.8, maxWidth: 2.6 });
    padRef.current = pad;

    const emitir = () => {
      const data = pad.toData();
      setVazio(pad.isEmpty());
      if (pad.isEmpty()) return aoMudarRef.current(null);
      aoMudarRef.current({
        largura: Math.round(canvas.offsetWidth),
        altura: Math.round(canvas.offsetHeight),
        tracos: data.map((g) => g.points.map((p) => [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10] as [number, number])),
      });
    };

    // Canvas nítido em telas de alta densidade; redesenha ao girar o celular
    const ajustar = () => {
      const dados = pad.toData();
      const razao = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * razao;
      canvas.height = canvas.offsetHeight * razao;
      canvas.getContext("2d")!.scale(razao, razao);
      pad.clear();
      pad.fromData(dados);
    };

    ajustar();
    pad.addEventListener("endStroke", emitir);
    window.addEventListener("resize", ajustar);
    return () => {
      pad.removeEventListener("endStroke", emitir);
      window.removeEventListener("resize", ajustar);
      pad.off();
    };
  }, []);

  const limpar = () => {
    padRef.current?.clear();
    setVazio(true);
    aoMudar(null);
  };

  return (
    <div>
      <div
        className={`relative overflow-hidden rounded-xl border-2 border-dashed bg-white ${erro ? "border-red-600" : "border-stone-300"}`}
      >
        <canvas
          ref={canvasRef}
          className="block h-48 w-full touch-none"
          aria-label="Quadro de assinatura. Desenhe sua assinatura com o dedo ou o mouse."
          role="img"
        />
        {vazio && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-stone-400">
            Assine aqui com o dedo
          </span>
        )}
        <span aria-hidden className="pointer-events-none absolute right-6 bottom-10 left-6 border-b border-stone-300" />
      </div>
      <div className="mt-2 flex items-center justify-between gap-4">
        <p className="text-sm text-stone-500">A data e a hora são registradas quando você envia.</p>
        <button type="button" onClick={limpar} className="botao-secundario py-1.5 text-sm" disabled={vazio}>
          Limpar
        </button>
      </div>
      {erro && (
        <p className="mt-1 text-sm font-medium text-red-700" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
