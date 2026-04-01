@echo off
chcp 65001 >nul
cd /d "%~dp0pwa-responsaveis"
npm run dev
pause

