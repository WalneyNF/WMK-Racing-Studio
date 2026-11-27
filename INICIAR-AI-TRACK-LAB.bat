@echo off
setlocal
cd /d "%~dp0"
title WMK Racing Studio - AI Track Lab
if not exist "ai\server.py" (
  echo ERRO: ai\server.py nao encontrado. Coloque este BAT na raiz do projeto.
  pause
  exit /b 1
)
where python >nul 2>&1
if errorlevel 1 (
  where py >nul 2>&1
  if errorlevel 1 (
    echo ERRO: Python nao encontrado no PATH.
    pause
    exit /b 1
  )
  set "PY=py -3" 
) else (
  set "PY=python" 
)
echo Abrindo WMK AI Track Lab na porta 8768...
start "" /b powershell -NoProfile -Command "for ($i=0; $i -lt 40; $i++) { try { $r=Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:8768/ai/ -TimeoutSec 1; if ($r.StatusCode -eq 200) { Start-Process http://127.0.0.1:8768/ai/; exit } } catch {}; Start-Sleep -Milliseconds 500 }"
%PY% ai\server.py
echo Servidor encerrado.
pause
