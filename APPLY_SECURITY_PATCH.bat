@echo off
setlocal
cd /d "%~dp0"
if not exist "server\scripts\applyAllSecurityPatchesSafe.cjs" (
  echo ERROR: server\scripts\applyAllSecurityPatchesSafe.cjs not found.
  echo Extract this ZIP into the TrustChain-Docs project root, then run this file again.
  exit /b 1
)
node server\scripts\applyAllSecurityPatchesSafe.cjs
if errorlevel 1 (
  echo.
  echo Patch installer failed. Check the error above.
  exit /b 1
)
echo.
echo Safe security patch applied. Now run:
echo   cd server
echo   npm install
echo   npm run dev
endlocal
