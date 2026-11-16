@echo off
title DBI202 Exam Master Server
echo ========================================================
echo       DBI202 EXAM MASTER - FPT UNIVERSITY
echo ========================================================
echo Dang khoi dong may chu web tai http://localhost:5050 ...
echo Vui long giu cua so nay mo trong qua trinh su dung.
echo ========================================================

start "" "http://localhost:5050"
"C:\msys64\ucrt64\bin\python.exe" server.py

pause
