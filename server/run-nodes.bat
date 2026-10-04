@echo off
echo ==============================================
echo KHOI DONG 3 FULL NODE BLOCKCHAIN TRONG MANG P2P
echo ==============================================

taskkill /F /IM node.exe >nul 2>&1

:: Node 1: HTTP 3001, WS share cùng port
start "Node 1 (Port 3001)" cmd /k "cd /d %~dp0 && node server.js --http=3001 --ws=6001 --name=Node-1"
timeout /t 3 >nul

:: Node 2: kết nối tới HTTP port của Node 1
start "Node 2 (Port 3002)" cmd /k "cd /d %~dp0 && node server.js --http=3002 --ws=6002 --name=Node-2 --peers=ws://localhost:3001"
timeout /t 3 >nul

:: Node 3: tương tự
start "Node 3 (Port 3003)" cmd /k "cd /d %~dp0 && node server.js --http=3003 --ws=6003 --name=Node-3 --peers=ws://localhost:3001"

echo Da bat thanh cong ca 3 Node!
