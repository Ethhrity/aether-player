# ✦ Aether Audio Player

A minimalist, high-performance desktop audio player built with **Electron**, **HTML5/CSS3**, and **sql.js**. Inspired by Apple Music & Spotify UI.

## 🌟 Features

- 🎨 **Minimalist Dark UI** inspired by Apple Music & Spotify.
- 📁 **Smart Folder Scanning** with automatic ID3/Metadata parsing (`music-metadata`).
- 💽 **Proper Album Grouping** using `albumartist` & `album` tags.
- 🎵 **Two-Line Tracklist View** with cover art thumbnails in Songs view.
- 🔀 **Shuffle & Controls**: Shuffle mode, logarithmic volume control.
- 🎹 **Windows Integration**: Media key support (`Play/Pause`, `Next`, `Prev`) & Native System Media Transport Controls (SMTC) overlay.
- 🗄️ **Embedded SQLite Database**: Zero native C++ compilation dependencies via `sql.js` (WebAssembly).

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)

### Installation & Run

1. Clone the repository:
   ```bash
   git clone https://github.com/Ethhrity/aether-player.git
   cd aether-player
   ```
2. Install dependencies:

```bash
npm install
```
3. Run in development mode:

```bash
npm start
```
### 🛠️ Tech Stack
- Runtime: Electron

- Frontend: HTML5, CSS3, JavaScript (ES6+)

- Database: SQLite (sql.js)

- Metadata Parser: music-metadata
