@echo off
echo ===================================================
echo KHOI DONG 3 FULL NODE BLOCKCHAIN TRONG MANG P2P
echo ===================================================

:: Khoi dong Node 1: HTTP 3001, WS 6001
start "Node 1 (Port 3001 / 6001)" cmd /k "cd /d %~dp0 && node server.js --http=3001 --ws=6001 --name=Node-1"
timeout /t 2 >nul

:: Khoi dong Node 2: HTTP 3002, WS 6002 (Ket noi vao Node 1)
start "Node 2 (Port 3002 / 6002)" cmd /k "cd /d %~dp0 && node server.js --http=3002 --ws=6002 --name=Node-2 --peers=ws://localhost:6001"
timeout /t 2 >nul

:: Khoi dong Node 3: HTTP 3003, WS 6003 (Ket noi vao Node 1)
start "Node 3 (Port 3003 / 6003)" cmd /k "cd /d %~dp0 && node server.js --http=3003 --ws=6003 --name=Node-3 --peers=ws://localhost:6001"

echo Da bat thanh cong ca 3 Node!