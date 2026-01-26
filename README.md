# 📖 Flipbook Creator

Convierte tus documentos PDF en elegantes flipbooks interactivos. Todo el procesamiento se realiza en el navegador del usuario, sin enviar datos a ningún servidor.

![Flipbook Creator](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?style=flat-square&logo=tailwind-css)

## ✨ Características

- **🔒 100% Privado**: El PDF se procesa completamente en el navegador
- **📖 Efecto realista**: Animación de paso de página con física natural
- **⚡ Instantáneo**: Sin colas ni tiempos de espera del servidor
- **📱 Responsive**: Funciona en desktop, tablet y móvil
- **🖥️ Pantalla completa**: Modo inmersivo para presentaciones
- **⌨️ Navegación por teclado**: Usa las flechas para pasar páginas
- **🖼️ Miniaturas**: Vista previa de todas las páginas
- **💾 Descarga**: Guarda páginas individuales como imágenes

## 🚀 Despliegue en Vercel

### Opción 1: Despliegue con un clic

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/TU-USUARIO/flipbook-creator)

### Opción 2: Despliegue manual

1. **Sube el código a GitHub**

```bash
# Inicializa el repositorio
git init
git add .
git commit -m "Initial commit"

# Crea un repo en GitHub y conéctalo
git remote add origin https://github.com/TU-USUARIO/flipbook-creator.git
git branch -M main
git push -u origin main
```

2. **Conecta con Vercel**

   - Ve a [vercel.com](https://vercel.com)
   - Haz clic en "New Project"
   - Importa tu repositorio de GitHub
   - Vercel detectará automáticamente que es un proyecto Next.js
   - Haz clic en "Deploy"

3. **¡Listo!** Tu flipbook estará disponible en `tu-proyecto.vercel.app`

## 💻 Desarrollo local

```bash
# Instala las dependencias
npm install

# Inicia el servidor de desarrollo
npm run dev

# Abre http://localhost:3000
```

## 🛠️ Tecnologías utilizadas

- **[Next.js 14](https://nextjs.org/)** - Framework React con App Router
- **[PDF.js](https://mozilla.github.io/pdf.js/)** - Procesamiento de PDF en el navegador
- **[PageFlip](https://nodlik.github.io/StPageFlip/)** - Librería de efecto flipbook
- **[Tailwind CSS](https://tailwindcss.com/)** - Estilos utilitarios
- **[Lucide React](https://lucide.dev/)** - Iconos
- **[react-dropzone](https://react-dropzone.js.org/)** - Zona de arrastrar y soltar

## 📁 Estructura del proyecto

```
flipbook-app/
├── app/
│   ├── globals.css      # Estilos globales
│   ├── layout.tsx       # Layout principal
│   └── page.tsx         # Página de inicio
├── components/
│   └── FlipbookViewer.tsx  # Componente del flipbook
├── public/              # Archivos estáticos
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

## 🎨 Personalización

### Cambiar colores

Edita las variables en `tailwind.config.js`:

```js
colors: {
  'cream': '#F5F0E8',      // Color de fondo claro
  'parchment': '#EDE4D3',  // Color de páginas
  'ink': '#1A1A1A',        // Color de texto oscuro
  'gold': '#C9A227',       // Color de acento principal
  'burgundy': '#722F37',   // Color de acento secundario
}
```

### Cambiar fuentes

Las fuentes se cargan desde Google Fonts en `app/globals.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Source+Sans+Pro&display=swap');
```

## 📝 Notas

- El tamaño máximo del PDF depende de la memoria del navegador del usuario
- PDFs con muchas páginas pueden tardar más en procesar
- Para mejor rendimiento, se recomienda PDFs de menos de 50 páginas

## 📄 Licencia

MIT License - Siéntete libre de usar este proyecto para cualquier propósito.

---

Creado con ❤️ para transformar documentos en experiencias interactivas.
