import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flipbook Creator - Convierte PDFs en libros interactivos',
  description: 'Transforma tus documentos PDF en elegantes flipbooks interactivos. Fácil, rápido y sin necesidad de servidor.',
  keywords: 'flipbook, pdf, converter, interactive, book, presentation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
