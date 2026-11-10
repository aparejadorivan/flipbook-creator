/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfjs-dist solo se usa en el cliente; que Next no intente empaquetarlo en el servidor.
  serverExternalPackages: ['pdfjs-dist'],
};

module.exports = nextConfig;
