#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  Ren3D — Universal Linux Installer
#  Always downloads the LATEST version from GitHub
#
#  Usage: bash ren3d-install.sh
#  Works on: Ubuntu, Debian, Fedora, Arch, Mint, Pop!_OS, etc.
#  No sudo required — installs to ~/.local/
# ═══════════════════════════════════════════════════════════════
set -e

# ── Config — change GITHUB_USER to your GitHub username ───────
GITHUB_USER="MihailKashintasev"
GITHUB_REPO="ren3d"
GITHUB_BRANCH="main"

APP_ID="ren3d"
ELECTRON_VERSION="v29.4.6"
INSTALL_DIR="$HOME/.local/share/$APP_ID"
BIN_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor"

APP_URL="https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/app/src/index.html"
ELECTRON_URL="https://github.com/electron/electron/releases/download/${ELECTRON_VERSION}/electron-${ELECTRON_VERSION}-linux-x64.zip"
THREEJS_URL="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"

# ── Colors ────────────────────────────────────────────────────
R='\033[0;31m'; G='\033[0;32m'; C='\033[0;36m'
Y='\033[1;33m'; B='\033[1m';    N='\033[0m'

# ── Download helper: wget preferred, fallback to native curl ──
download() {
    local url="$1" dest="$2"
    if command -v wget &>/dev/null; then
        wget -q --show-progress "$url" -O "$dest" && return 0
    fi
    if [ -x "/usr/bin/curl" ]; then
        /usr/bin/curl -L --progress-bar "$url" -o "$dest" && return 0
    fi
    if command -v curl &>/dev/null; then
        curl -L --progress-bar "$url" -o "$dest" && return 0
    fi
    return 1
}

download_silent() {
    local url="$1" dest="$2"
    if command -v wget &>/dev/null; then
        wget -q "$url" -O "$dest" && return 0
    fi
    if [ -x "/usr/bin/curl" ]; then
        /usr/bin/curl -sL "$url" -o "$dest" && return 0
    fi
    command -v curl &>/dev/null && curl -sL "$url" -o "$dest"
}

# ── Banner ────────────────────────────────────────────────────
echo ""
echo -e "${C}${B}  +==================================+${N}"
echo -e "${C}${B}  |   Ren3D Installer — Latest       |${N}"
echo -e "${C}${B}  +==================================+${N}"
echo ""
echo -e "  Source: ${C}github.com/${GITHUB_USER}/${GITHUB_REPO}${N}"
echo ""

# ── Check GitHub user is configured ──────────────────────────
if [ "$GITHUB_USER" = "YOUR_USERNAME" ]; then
    echo -e "${R}[ERROR]${N} GitHub username not configured."
    echo "  Edit this file and set GITHUB_USER= at the top."
    exit 1
fi

# ── Existing install? ─────────────────────────────────────────
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${Y}[INFO]${N} Already installed at: $INSTALL_DIR"
    echo ""
    echo "  What do you want to do?"
    echo "    1  Update app only   (fast, keeps Electron)"
    echo "    2  Full reinstall    (slow, redownloads Electron)"
    echo "    0  Exit"
    echo ""
    read -rp "  Choice [1/2/0]: " CHOICE
    case "$CHOICE" in
        1) goto_update=1 ;;
        2) rm -rf "$INSTALL_DIR" ; goto_update=0 ;;
        *) echo "Cancelled."; exit 0 ;;
    esac
else
    goto_update=0
fi

# ── UPDATE ONLY (fast path) ───────────────────────────────────
if [ "${goto_update:-0}" = "1" ]; then
    echo ""
    echo -e "${B}[UPDATE]${N} Downloading latest app from GitHub..."

    TMP_HTML=$(mktemp -t ren3d-html-XXXXXX)
    if download_silent "$APP_URL" "$TMP_HTML" && [ -s "$TMP_HTML" ]; then
        cp "$TMP_HTML" "$INSTALL_DIR/resources/app/src/index.html"
        rm -f "$TMP_HTML"
        echo -e "  ${G}Done! Ren3D updated to latest version.${N}"
    else
        rm -f "$TMP_HTML"
        echo -e "${R}[ERROR]${N} Could not download from GitHub."
        echo "  Check: https://github.com/${GITHUB_USER}/${GITHUB_REPO}"
        exit 1
    fi

    # Also update Three.js if missing
    THREEJS_PATH="$INSTALL_DIR/resources/app/src/three.min.js"
    if [ ! -s "$THREEJS_PATH" ]; then
        echo "  Bundling Three.js..."
        download_silent "$THREEJS_URL" "$THREEJS_PATH" || true
        [ -s "$THREEJS_PATH" ] && \
            sed -i 's|https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js|./three.min.js|g' \
                "$INSTALL_DIR/resources/app/src/index.html"
    fi

    echo ""
    echo -e "  Run: ${B}ren3d${N}"
    read -rp "  Launch now? [Y/n]: " L
    [[ "$L" =~ ^[Nn]$ ]] || exec "$INSTALL_DIR/electron" \
        --disable-gpu --no-sandbox \
        "$INSTALL_DIR/resources/app"
    exit 0
fi

# ── FULL INSTALL ──────────────────────────────────────────────

# Check deps
echo -e "${B}[1/6]${N} Checking dependencies..."
MISSING=()
for DEP in curl unzip python3; do
    command -v "$DEP" &>/dev/null || MISSING+=("$DEP")
done
# wget is preferred but not required
if [ ${#MISSING[@]} -gt 0 ]; then
    echo -e "${Y}  Installing: ${MISSING[*]}${N}"
    if command -v apt-get &>/dev/null; then
        sudo apt-get install -y "${MISSING[@]}"
    elif command -v dnf &>/dev/null; then
        sudo dnf install -y "${MISSING[@]}"
    elif command -v pacman &>/dev/null; then
        sudo pacman -S --noconfirm "${MISSING[@]}"
    else
        echo -e "${R}[ERROR]${N} Install manually: ${MISSING[*]}"; exit 1
    fi
fi
echo -e "  ${G}OK${N}"

# Create dirs
echo -e "${B}[2/6]${N} Preparing directories..."
mkdir -p "$INSTALL_DIR/resources/app/src"
mkdir -p "$BIN_DIR" "$DESKTOP_DIR"
for SZ in 16 32 48 128 256 512; do
    mkdir -p "$ICON_DIR/${SZ}x${SZ}/apps"
done
echo -e "  ${G}OK${N}"

# Download Electron
echo -e "${B}[3/6]${N} Downloading Electron ${ELECTRON_VERSION}..."
TMP_DIR=$(mktemp -d -t ren3d-XXXXXX)
ELECTRON_ZIP="$TMP_DIR/electron.zip"

echo "  (~103 MB)"
if ! download "$ELECTRON_URL" "$ELECTRON_ZIP" || [ ! -s "$ELECTRON_ZIP" ]; then
    echo -e "${R}[ERROR]${N} Failed to download Electron. Check internet."
    rm -rf "$TMP_DIR"; exit 1
fi

echo "  Extracting..."
unzip -q "$ELECTRON_ZIP" -d "$TMP_DIR/e"
cp -r "$TMP_DIR/e/." "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/electron"
rm -rf "$TMP_DIR"
echo -e "  ${G}OK${N}"

# Download app from GitHub
echo -e "${B}[4/6]${N} Downloading latest Ren3D from GitHub..."
echo "  URL: $APP_URL"

TMP_HTML=$(mktemp -t ren3d-html-XXXXXX)
if ! download_silent "$APP_URL" "$TMP_HTML" || [ ! -s "$TMP_HTML" ]; then
    rm -f "$TMP_HTML"
    echo -e "${R}[ERROR]${N} Could not download app from GitHub."
    echo "  Make sure the repo is public: github.com/${GITHUB_USER}/${GITHUB_REPO}"
    echo "  And the file exists: app/src/index.html"
    exit 1
fi
cp "$TMP_HTML" "$INSTALL_DIR/resources/app/src/index.html"
rm -f "$TMP_HTML"
echo -e "  ${G}OK — got latest version${N}"

# Write static app files (main.js, preload.js, package.json)
echo -e "${B}[5/6]${N} Writing app config..."

cat > "$INSTALL_DIR/resources/app/package.json" << 'EOF'
{"name":"ren3d","version":"2.0.0","main":"main.js","author":{"name":"Ren3D","email":"build@ren3d.app"}}
EOF

cat > "$INSTALL_DIR/resources/app/preload.js" << 'EOF'
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (n, c) => ipcRenderer.invoke('save-file', { defaultName: n, content: c }),
  openFile: () => ipcRenderer.invoke('open-file'),
  platform: process.platform,
});
EOF

cat > "$INSTALL_DIR/resources/app/main.js" << 'EOF'
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 600,
    title: 'Ren3D', backgroundColor: '#050508', show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url); return { action: 'deny' };
  });
}

ipcMain.handle('save-file', async (_e, { defaultName, content }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: defaultName,
    filters: [{ name: 'STL', extensions: ['stl'] }, { name: 'OBJ', extensions: ['obj'] }]
  });
  if (canceled || !filePath) return { ok: false };
  try { fs.writeFileSync(filePath, content, 'utf8'); return { ok: true, filePath }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('open-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: '3D Models', extensions: ['stl', 'obj'] }]
  });
  if (canceled || !filePaths.length) return null;
  try {
    const b = fs.readFileSync(filePaths[0]);
    return { name: path.basename(filePaths[0]), buffer: b.buffer };
  } catch { return null; }
});

app.whenReady().then(createWindow);
app.on('second-instance', () => {
  if (win) { win.isMinimized() && win.restore(); win.focus(); }
});
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
EOF

# Download Three.js locally for offline use
echo "  Bundling Three.js r128..."
THREEJS_PATH="$INSTALL_DIR/resources/app/src/three.min.js"
if download_silent "$THREEJS_URL" "$THREEJS_PATH" && [ -s "$THREEJS_PATH" ]; then
    sed -i 's|https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js|./three.min.js|g' \
        "$INSTALL_DIR/resources/app/src/index.html"
    echo "  Three.js bundled — works offline!"
else
    echo "  Warning: Three.js not bundled, internet needed on first run"
    rm -f "$THREEJS_PATH"
fi

echo -e "  ${G}OK${N}"

# Icons
python3 << 'PYEOF'
import struct, zlib, os
def make_png(size):
    w = h = size
    rows = bytearray()
    for y in range(h):
        rows.append(0)
        for x in range(w):
            cx, cy = w/2, h/2
            dist = ((x-cx)**2 + (y-cy)**2)**0.5
            if dist < w*0.42:   rows += bytes([0, 200, 230, 255])
            elif dist < w*0.48: rows += bytes([0, 130, 160, 255])
            else:               rows += bytes([5, 5, 8, 255])
    def chunk(tag, data):
        c = tag+data
        return struct.pack('>I',len(data))+c+struct.pack('>I',zlib.crc32(c)&0xFFFFFFFF)
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',ihdr)+chunk(b'IDAT',zlib.compress(bytes(rows),9))+chunk(b'IEND',b'')
base = os.path.expanduser('~/.local/share/icons/hicolor')
for sz in [16,32,48,128,256,512]:
    p = f'{base}/{sz}x{sz}/apps/ren3d.png'
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p,'wb').write(make_png(sz))
PYEOF

# Launcher + desktop entry
echo -e "${B}[6/6]${N} Creating launcher..."

cat > "$BIN_DIR/ren3d" << LAUNCHEOF
#!/usr/bin/env bash
exec "$INSTALL_DIR/electron" \\
  --disable-gpu \\
  --no-sandbox \\
  "$INSTALL_DIR/resources/app" "\$@"
LAUNCHEOF
chmod +x "$BIN_DIR/ren3d"

cat > "$DESKTOP_DIR/ren3d.desktop" << DESKEOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Ren3D
Comment=Local offline 3D editor
Exec=$INSTALL_DIR/electron --disable-gpu --no-sandbox $INSTALL_DIR/resources/app %U
Icon=ren3d
Terminal=false
Categories=Graphics;3DGraphics;
StartupWMClass=ren3d
DESKEOF
chmod +x "$DESKTOP_DIR/ren3d.desktop"
update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
gtk-update-icon-cache -f "$ICON_DIR" 2>/dev/null || true

# PATH fix
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    for RC in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile"; do
        [ -f "$RC" ] && echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$RC" && break
    done
fi

echo ""
echo -e "${C}${B}  Installation complete!${N}"
echo ""
echo -e "  Installed: ${G}$INSTALL_DIR${N}"
echo -e "  Version:   ${G}latest from github.com/${GITHUB_USER}/${GITHUB_REPO}${N}"
echo -e "  Run:       ${G}ren3d${N}  (reopen terminal if command not found)"
echo ""
read -rp "  Launch Ren3D now? [Y/n]: " L
[[ "$L" =~ ^[Nn]$ ]] || exec "$INSTALL_DIR/electron" \
    --disable-gpu --no-sandbox \
    "$INSTALL_DIR/resources/app"
