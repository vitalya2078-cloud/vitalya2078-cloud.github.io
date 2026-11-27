#!/bin/sh
# Сборка «Генератор ключей.exe» (32 бита, Windows 7–11, без установки) на Linux: нужен mingw-w64 (g++-mingw-w64-i686-posix).
# Проверка ядра на Linux: clang++ keygen-core.cpp keygen-test.cpp + tweetnacl.c, ключи сверяются с HTML-генератором (keys-html.mjs).
set -e
cd "$(dirname "$0")"
T=$(mktemp -d)
# открытый ключ, вшитый в программу: генератор показывает, подходит ли к нему открытый файл секретного ключа
PK=$(tr -d ' \r\n' < ../../lw3-desktop/license-pubkey.txt)
echo "$PK" | grep -Eq '^[0-9a-fA-F]{64}$' || { echo "нет lw3-desktop/license-pubkey.txt"; exit 1; }
i686-w64-mingw32-windres -c 65001 keygen.rc -O coff -o "$T/res.o"
i686-w64-mingw32-gcc -c -O2 ../../lw3-desktop/win/tweetnacl.c -o "$T/tn.o"
i686-w64-mingw32-g++-posix -std=c++17 -O2 -municode -mwindows -DUNICODE -D_UNICODE -DWINVER=0x0601 -D_WIN32_WINNT=0x0601 -DFZ_EXPECTED_PK="\"$PK\"" \
  keygen-win.cpp keygen-core.cpp "$T/tn.o" "$T/res.o" -lcomctl32 -lcomdlg32 -lshell32 -static -s -o "../Генератор ключей.exe"
rm -rf "$T"; ls -la "../Генератор ключей.exe"
