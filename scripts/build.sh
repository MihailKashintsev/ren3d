#!/usr/bin/env bash
# Ren3D build script — Linux / WSL / macOS
set -e

GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'; BOLD='\033[1m'

echo ""
echo -e "${CYAN}${BOLD} +--------------------------------------+${NC}"
echo -e "${CYAN}${BOLD} |        Ren3D -- Build Tool           |${NC}"
echo -e "${CYAN}${BOLD} +--------------------------------------+${NC}"
echo ""

command -v node &>/dev/null || { echo -e "${RED}[ERROR] Node.js not found.${NC}"; exit 1; }
echo -e "  Node.js: ${GREEN}$(node -v)${NC}"
echo ""

[ ! -d node_modules ] && { echo "[INFO] Installing dependencies..."; npm install; echo ""; }

echo -e "${BOLD}  What do you want to build?${NC}"
echo ""
echo "    1  -  Linux .deb + AppImage  (both)"
echo "    2  -  Linux .deb only"
echo "    3  -  Linux AppImage only"
echo "    4  -  Windows .exe  (NSIS + portable)"
echo "    5  -  Dev mode (run Electron)"
echo "    0  -  Exit"
echo ""
read -rp "  Enter number [0-5]: " C

run() { echo ""; echo -e "${CYAN}[BUILD]${NC} $1"; shift; npm run "$@"; echo ""; echo -e "${GREEN}[OK]${NC} Files in dist/"; ls -lh dist/ 2>/dev/null || true; }

case "$C" in
  1) run "Linux deb + AppImage"  build:linux ;;
  2) run "Linux .deb"            build:linux:deb ;;
  3) run "Linux AppImage"        build:linux:img ;;
  4) run "Windows .exe"          build:win ;;
  5) echo ""; echo "[DEV] Starting Electron..."; npm run dev ;;
  0) exit 0 ;;
  *) echo -e "${RED}[ERROR] Invalid: $C${NC}"; exit 1 ;;
esac
