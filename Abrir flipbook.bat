@echo off
rem Arranca Folio - Flipbook Studio. No cierres esta ventana mientras lo uses.
chcp 65001 >nul
cd /d "%~dp0"
title Folio Flipbook Studio - no cierres esta ventana

if not exist "node_modules\" (
  echo Instalando dependencias la primera vez. Puede tardar un par de minutos...
  call npm install
  if errorlevel 1 goto error
)

if not exist ".next\BUILD_ID" (
  echo Preparando la aplicacion. Solo pasa la primera vez...
  call npm run build
  if errorlevel 1 goto error
)

echo.
echo Folio arranca en http://localhost:3100/
echo Vuelve al panel y pulsa Abrir, o escribe esa direccion en Chrome.
echo.
call npm run start -- -p 3100
if errorlevel 1 goto error
goto :eof

:error
echo.
echo Algo ha fallado al arrancar. Haz una captura de esta ventana y pasasela a Claude.
pause
