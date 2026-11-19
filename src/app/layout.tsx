import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { configuracao } from "@/config/documentos";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const { negocio, demonstracao } = configuracao;

export const metadata: Metadata = {
  title: { default: `Fichas e termos · ${negocio.nome}`, template: `%s · ${negocio.nome}` },
  description: "Preencha e assine seus documentos pelo celular.",
  // Formulários com dados pessoais não devem aparecer no Google
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: negocio.corPrimaria,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`} style={{ "--marca": negocio.corPrimaria } as React.CSSProperties}>
      <body className="flex min-h-full flex-col">
        {demonstracao && (
          <div role="note" className="bg-gray-900 px-4 py-2 text-center text-sm text-white">
            {demonstracao.texto}{" "}
            {demonstracao.link && (
              <a href={demonstracao.link.url} className="font-semibold underline underline-offset-4" target="_blank" rel="noopener noreferrer">
                {demonstracao.link.texto}
              </a>
            )}
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
