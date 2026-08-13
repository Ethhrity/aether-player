const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const mm = require('music-metadata');
const initSqlJs = require('sql.js');

app.setAppUserModelId('com.aether.player');

app.commandLine.appendSwitch('enable-features', 'HardwareMediaKeyHandling,MediaSessionService');

let db;
let dbFilePath;
let win;

async function initDatabase() {
  const SQL = await initSqlJs();
  dbFilePath = path.join(app.getPath('userData'), 'library.sqlite');

  if (fs.existsSync(dbFilePath)) {
    const filebuffer = fs.readFileSync(dbFilePath);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filePath TEXT UNIQUE,
      title TEXT,
      artist TEXT,
      albumArtist TEXT,
      album TEXT,
      trackNumber INTEGER,
      year INTEGER,
      duration REAL,
      coverData TEXT,
      addedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try { db.run(`ALTER TABLE tracks ADD COLUMN trackNumber INTEGER;`); } catch (e) {}
  try { db.run(`ALTER TABLE tracks ADD COLUMN albumArtist TEXT;`); } catch (e) {}
  try { db.run(`ALTER TABLE tracks ADD COLUMN year INTEGER;`); } catch (e) {}
  
  saveDatabase();
}

function saveDatabase() {
  if (db && dbFilePath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbFilePath, buffer);
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 920,
    minHeight: 620,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#121214',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(async () => {
  await initDatabase();
  createWindow();
});

app.on('before-quit', () => {
  saveDatabase();
});

function getLibraryFromDb() {
  try {
    const res = db.exec('SELECT * FROM tracks ORDER BY album ASC, trackNumber ASC, id ASC');
    if (!res || res.length === 0) return [];
    
    const columns = res[0].columns;
    const values = res[0].values;

    return values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
  } catch (e) {
    return [];
  }
}

ipcMain.handle('get-library', () => {
  return getLibraryFromDb();
});

ipcMain.handle('scan-folder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (result.canceled) return { success: false };

  const folderPath = result.filePaths[0];

  function getAudioFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getAudioFiles(filePath));
      } else if (/\.(mp3|flac|m4a|wav|ogg)$/i.test(file)) {
        results.push(filePath);
      }
    });
    return results;
  }

  const audioFiles = getAudioFiles(folderPath);

  for (const filePath of audioFiles) {
    try {
      const metadata = await mm.parseFile(filePath);

      let coverUrl = null;
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];
        const base64String = picture.data.toString('base64');
        coverUrl = `data:${picture.format};base64,${base64String}`;
      }

      const title = metadata.common.title || path.basename(filePath);
      const artist = metadata.common.artist || 'Unknown Artist';
      const albumArtist = metadata.common.albumartist || metadata.common.artist || 'Unknown Artist';
      const album = metadata.common.album || 'Unknown Album';
      const trackNo = metadata.common.track ? metadata.common.track.no : 0;
      
      let parsedYear = metadata.common.year;
      if (!parsedYear && metadata.common.date) {
        const match = metadata.common.date.match(/\b(19|20)\d{2}\b/);
        if (match) parsedYear = parseInt(match[0], 10);
      }

      const year = parsedYear || null;
      const duration = metadata.format.duration || 0;

      db.run(
        `INSERT OR REPLACE INTO tracks (filePath, title, artist, albumArtist, album, trackNumber, year, duration, coverData)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [filePath, title, artist, albumArtist, album, trackNo, year, duration, coverUrl]
      );
    } catch (e) {
      console.error(e);
    }
  }

  saveDatabase();

  return { success: true, tracks: getLibraryFromDb() };
});

ipcMain.handle('clear-library', () => {
  db.run('DELETE FROM tracks');
  saveDatabase();
  return [];
});