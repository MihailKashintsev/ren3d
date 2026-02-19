# Ren3D

> 🇷🇺 [Русская версия — README.ru.md](README.ru.md)

Local offline 3D editor built on Electron + Three.js.  
Create and edit 3D models from primitives, export to STL/OBJ.

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-blue)
![Electron](https://img.shields.io/badge/Electron-29-47848F)
![Three.js](https://img.shields.io/badge/Three.js-r128-black)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- Primitives: cube, sphere, cylinder, cone, torus, plane
- Visual transform gizmo (move / rotate / scale arrows)
- Boolean operations: union, subtract, intersect
- Materials: color, metalness, roughness, opacity
- Export: STL, OBJ — Import: STL, OBJ
- Undo / Redo (50 steps)
- Dark glassmorphism UI
- Works fully offline after install

---

## Install on Linux

**One-line install (recommended):**
```bash
bash <(curl -sL https://raw.githubusercontent.com/MihailKashintsev/ren3d/master/installer/ren3d-install.sh)
```

**Or via USB flash drive:**
```bash
bash ren3d-install.sh
```

**Update to latest version:**
```bash
bash ren3d-install.sh
# choose option 1 — Update app only (downloads new version in seconds)
```

Works on: Ubuntu, Debian, Fedora, Arch, Mint, Pop!\_OS and any distro.  
No `sudo` required — installs to `~/.local/`.

---

## Install on Windows

1. Install [Node.js LTS](https://nodejs.org)
2. Download or clone this repo
3. Open `scripts/` folder, double-click **`build.bat`**
4. Choose option `1` — Windows installer
5. Run the `.exe` from `app/dist/`

---

## Keyboard shortcuts

| Action | Shortcut |
|---|---|
| Add cube / sphere / cylinder | `Shift+C` / `Shift+S` / `Shift+Y` |
| Add cone / torus / plane | `Shift+O` / `Shift+T` / `Shift+P` |
| Move / Rotate / Scale tool | `G` / `R` / `S` |
| Select tool | `Q` |
| Duplicate | `Ctrl+D` |
| Delete | `Del` |
| Undo / Redo | `Ctrl+Z` / `Ctrl+Y` |
| Select all | `Ctrl+A` |
| Focus selected | `F` |
| Frame all | `Home` |
| Toggle grid | `Z` |
| Export STL | `Ctrl+E` |
| Import | `Ctrl+I` |

---

## Dev mode

```bash
cd app
npm install
npm run dev
```

---

## Project structure

```
ren3d/
├── app/                             # Electron application
│   ├── src/
│   │   └── index.html               # Full Ren3D app (Three.js)
│   ├── main.js                      # Electron main process
│   ├── preload.js                   # Secure IPC bridge
│   ├── package.json
│   ├── electron-builder.config.js   # Build profiles Win/Linux
│   └── assets/                      # App icons
│
├── installer/
│   └── ren3d-install.sh             # Linux installer (always gets latest)
│
├── scripts/
│   ├── build.bat                    # Windows build (double-click)
│   └── build.sh                     # Linux/WSL build
│
├── .github/workflows/
│   └── build.yml                    # Auto-build on every push
│
├── README.md                        # English docs
└── README.ru.md                     # Russian docs
```

---

## GitHub Actions (auto build)

Every push to `master` that touches `app/` files automatically:
- Builds **Windows** `.exe` installer + portable
- Builds **Linux** `.AppImage` + `.deb`
- Uploads as downloadable artifacts (Actions tab)

**Create a release** by pushing a version tag:
```bash
git tag v2.1.0
git push origin v2.1.0
```
This triggers a full GitHub Release with all binaries attached.

---

## License

MIT
