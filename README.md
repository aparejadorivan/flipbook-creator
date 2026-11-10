# Folio — Flipbook Studio

Estudio local para presentar PDFs con paso de página, perspectiva y encuadres para vídeo.

## Uso

- Doble clic en `Abrir flipbook.bat` (instala y compila la primera vez) y abrir http://localhost:3100
- Para desarrollo: `npm install` y `npm run dev` en http://localhost:3000
- Importar un PDF o explorar el documento de muestra.
- Ajustar perspectiva, acercamiento, fondo y sombra.
- Elegir 16:9, 9:16, 1:1 o 4:5; activar guías si hacen falta.
- Entrar en modo limpio con H y capturar la escena con el grabador de pantalla. Esc vuelve al estudio. La aplicación no exporta vídeo.
- Flechas izquierda/derecha pasan páginas; espacio activa o pausa el autopase. También se puede hacer clic o deslizar sobre el libro.

El cambio de encuadre y tamaño conserva la página. La velocidad de animación y el intervalo de autopase se configuran por separado. El autopase se detiene al final.

## PDF y privacidad

PDF.js y su worker se sirven desde la aplicación. Los documentos se procesan en el navegador, sin subirse a un servidor. Límite de 100 MB y 150 páginas; las imágenes se limitan a 2600 píxeles en su lado mayor para contener el consumo de memoria. Los documentos de tamaños mixtos se ajustan a la proporción de su primera página sin deformar su contenido. No se admiten PDFs protegidos con contraseña.

Las imágenes temporales se liberan al cambiar de documento. Al recargar se vuelve a la muestra: los documentos no se guardan.

## Desarrollo

`npm run build` compila con Turbopack y comprueba TypeScript. La escena utiliza PageFlip para la curvatura de las hojas y transformaciones CSS para la perspectiva. Los gestos se gestionan fuera de PageFlip para evitar errores de coordenadas en el libro escalado.

Los prototipos HTML iniciales están en `prototipos/`, fuera del build.

## Cámara fija y zoom

El encuadre permanece fijo incluso al abrir o cerrar la portada. Puedes seleccionar libro completo, página izquierda o página derecha. La rueda sobre la escena y las teclas + / - ajustan el zoom entre 50 y 300 %, también en modo limpio. Mayús + arrastrar (o el botón central) desplaza la cámara sin pasar página; 0 restablece zoom, desplazamiento y foco. Las flechas siguen pasando páginas. Para obtener la nueva resolución, vuelve a importar el PDF. La nitidez de documentos escaneados depende del original.


## Papel curvo 3D

Escena 3D utiliza Three.js con hojas subdivididas y curvatura geométrica permanente, deformación animada al pasar página, reverso impreso, cantos en capas, iluminación de estudio y material satinado. Lectura conserva el motor PageFlip anterior.

El preset Revista selecciona 58 grados de inclinación y -22 de giro. Se puede ajustar la inclinación hasta 72 grados, curvatura entre 0 y 150 %, y brillo de mate a satinado. Cámara, desplazamiento y zoom permanecen independientes del cambio de página. La renderización necesita WebGL; si no está disponible se activa Lectura. Las texturas se cargan bajo demanda y se liberan al alejarse de la página actual.

## Aspecto

La interfaz sigue el lenguaje visual de Hijos del Ladrillo (GOV.UK adoptado):
Arial en todo, titulares negros, azul `#1d70b8` para acciones y enlaces, verde
`#00703c` solo para la acción principal, amarillo `#ffdd00` solo para el foco de
teclado. Cuerpo a 19 px en escritorio y 16 px en móvil. Sin degradados ni sombras
decorativas. Todo vive en `app/globals.css`, sin Tailwind ni PostCSS.

Los fondos de escena son colores planos porque son el decorado de la grabación,
no parte de la interfaz. El croma verde está para recortar después en el montaje.
