import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Folio — Flipbook Studio',
  description: 'Presenta un PDF como un libro y graba la escena. El documento se procesa en tu navegador.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
