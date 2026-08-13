let currentLibrary = [];
let currentPlaylist = [];
let currentIndex = -1;
let currentTrackObj = null;
let isShuffle = false;

const audioPlayer = document.getElementById('audio-player');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const shuffleBtn = document.getElementById('shuffle-btn');

const seekBar = document.getElementById('seek-bar');
const volumeBar = document.getElementById('volume-bar');

const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');

const playerCover = document.getElementById('player-cover');
const playerTitle = document.getElementById('player-title');
const playerArtist = document.getElementById('player-artist');

const albumGrid = document.getElementById('album-grid');
const albumDetail = document.getElementById('album-detail');
const detailCover = document.getElementById('detail-cover');
const detailTitle = document.getElementById('detail-title');
const detailArtist = document.getElementById('detail-artist');
const albumSongsList = document.getElementById('album-songs-list');

const songsContainer = document.getElementById('songs-container');
const songsList = document.getElementById('songs-list');

const scanBtn = document.getElementById('scan-btn');
const clearBtn = document.getElementById('clear-btn');
const searchInput = document.getElementById('search-input');

const navAlbums = document.getElementById('nav-albums');
const navSongs = document.getElementById('nav-songs');
const pageTitle = document.getElementById('page-title');
const backBtn = document.getElementById('back-btn');

window.addEventListener('DOMContentLoaded', async () => {
  currentLibrary = await window.api.getLibrary();
  
  updateVolume(volumeBar.value);
  renderView();

  if (window.api && window.api.onMediaControl) {
    window.api.onMediaControl((command) => {
      if (command === 'next') playNextTrack();
      if (command === 'prev') playPrevTrack();
      if (command === 'play-pause') togglePlayPause();
    });
  }
});

navAlbums.addEventListener('click', showAlbumsGrid);

function showAlbumsGrid() {
  navAlbums.classList.add('active');
  navSongs.classList.remove('active');
  albumGrid.classList.remove('hidden');
  albumDetail.classList.add('hidden');
  songsContainer.classList.add('hidden');
  backBtn.classList.add('hidden');
  pageTitle.innerText = 'Albums';
}

navSongs.addEventListener('click', () => {
  navSongs.classList.add('active');
  navAlbums.classList.remove('active');
  albumGrid.classList.add('hidden');
  albumDetail.classList.add('hidden');
  songsContainer.classList.remove('hidden');
  backBtn.classList.add('hidden');
  pageTitle.innerText = 'Songs';
});

backBtn.addEventListener('click', showAlbumsGrid);

scanBtn.addEventListener('click', async () => {
  const result = await window.api.scanFolder();
  if (result.success) {
    currentLibrary = result.tracks;
    renderView();
  }
});

clearBtn.addEventListener('click', async () => {
  currentLibrary = await window.api.clearLibrary();
  renderView();
});

shuffleBtn.addEventListener('click', () => {
  isShuffle = !isShuffle;
  if (isShuffle) {
    shuffleBtn.classList.add('active');
  } else {
    shuffleBtn.classList.remove('active');
  }
});

function renderView(filteredTracks = null) {
  const tracks = filteredTracks || currentLibrary;

  albumGrid.innerHTML = '';
  const albumsMap = {};

  tracks.forEach(t => {
    const displayArtist = t.albumArtist || t.artist || 'Unknown Artist';
    const key = `${t.album}_${displayArtist}`.toLowerCase();
    
    if (!albumsMap[key]) {
      albumsMap[key] = {
        title: t.album,
        artist: displayArtist,
        cover: t.coverData,
        key: key
      };
    } else if (!albumsMap[key].cover && t.coverData) {
      albumsMap[key].cover = t.coverData;
    }
  });

  Object.values(albumsMap).forEach(album => {
    const card = document.createElement('div');
    card.className = 'album-card';
    const coverSrc = album.cover || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24"><rect width="24" height="24" fill="%23222"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="8">NO ART</text></svg>';

    card.innerHTML = `
      <div class="album-cover-wrapper">
        <img src="${coverSrc}" alt="Cover">
      </div>
      <div class="album-title">${album.title}</div>
      <div class="album-artist">${album.artist}</div>
    `;

    card.addEventListener('click', () => openAlbumDetail(album, tracks));
    albumGrid.appendChild(card);
  });

  // Songs View
  songsList.innerHTML = '';
  tracks.forEach((track, index) => {
    const tr = document.createElement('tr');
    tr.className = 'song-row';
    tr.dataset.filepath = track.filePath;
    
    const coverSrc = track.coverData || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24"><rect width="24" height="24" fill="%23222"/></svg>';

    tr.innerHTML = `
      <td style="color: var(--text-sub); vertical-align: middle;">${index + 1}</td>
      <td style="padding: 8px 10px;">
        <div class="song-title-cell">
          <div class="song-mini-cover">
            <img src="${coverSrc}" alt="Cover">
          </div>
          <div>
            <div class="song-title-text" style="font-weight: 600; font-size: 14px; color: var(--text-main);">${track.title}</div>
            <div style="font-size: 12px; color: var(--text-sub); margin-top: 3px;">${track.artist}</div>
          </div>
        </div>
      </td>
      <td style="vertical-align: middle; color: var(--text-sub);">${track.album}</td>
      <td style="text-align: right; color: var(--text-sub); vertical-align: middle;">${formatTime(track.duration)}</td>
    `;

    tr.addEventListener('click', () => {
      currentPlaylist = tracks;
      playTrackAtIndex(index);
    });
    songsList.appendChild(tr);
  });

  highlightCurrentTrack();
}

function openAlbumDetail(album, tracks) {
  let albumTracks = tracks.filter(t => {
    const displayArtist = t.albumArtist || t.artist || 'Unknown Artist';
    return `${t.album}_${displayArtist}`.toLowerCase() === album.key;
  });

  albumTracks.sort((a, b) => {
    if (a.trackNumber && b.trackNumber) {
      return a.trackNumber - b.trackNumber;
    }
    return a.filePath.localeCompare(b.filePath);
  });

  albumGrid.classList.add('hidden');
  songsContainer.classList.add('hidden');
  albumDetail.classList.remove('hidden');
  backBtn.classList.remove('hidden');
  pageTitle.innerText = '';

  const totalDurationSec = albumTracks.reduce((acc, curr) => acc + (curr.duration || 0), 0);
  const totalMin = Math.round(totalDurationSec / 60);
  const songsCount = albumTracks.length;
  
  const albumYear = albumTracks.find(t => t.year && t.year > 0)?.year;

  let metaParts = [album.artist];
  if (albumYear) metaParts.push(albumYear);
  metaParts.push(`${songsCount} ${songsCount === 1 ? 'song' : 'songs'}, ${totalMin} min`);

  detailTitle.innerText = album.title;
  detailArtist.innerText = metaParts.join(' • ');
  detailCover.src = album.cover || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24"><rect width="24" height="24" fill="%23222"/></svg>';

  albumSongsList.innerHTML = '';
  albumTracks.forEach((track, index) => {
    const tr = document.createElement('tr');
    tr.className = 'song-row';
    tr.dataset.filepath = track.filePath;
    const numDisplay = track.trackNumber ? track.trackNumber : (index + 1);
    
    tr.innerHTML = `
      <td style="color: var(--text-sub); vertical-align: middle;">${numDisplay}</td>
      <td style="padding: 8px 10px;">
        <div class="song-title-text" style="font-weight: 600; font-size: 14px; color: var(--text-main);">${track.title}</div>
        <div style="font-size: 12px; color: var(--text-sub); margin-top: 3px;">${track.artist}</div>
      </td>
      <td style="text-align: right; color: var(--text-sub); vertical-align: middle;">${formatTime(track.duration)}</td>
    `;

    tr.addEventListener('click', () => {
      currentPlaylist = albumTracks;
      playTrackAtIndex(index);
    });

    albumSongsList.appendChild(tr);
  });

  highlightCurrentTrack();
}

function playTrackAtIndex(index) {
  if (index < 0 || index >= currentPlaylist.length) return;
  
  currentIndex = index;
  currentTrackObj = currentPlaylist[currentIndex];

  audioPlayer.src = `file://${currentTrackObj.filePath}`;
  audioPlayer.play();

  playerTitle.innerText = currentTrackObj.title;
  playerArtist.innerText = currentTrackObj.artist;
  playerCover.src = currentTrackObj.coverData || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24"><rect width="24" height="24" fill="%23222"/></svg>';

  updatePlayButtonUI(true);
  highlightCurrentTrack();

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrackObj.title,
      artist: currentTrackObj.artist,
      album: currentTrackObj.album,
      artwork: currentTrackObj.coverData ? [{ src: currentTrackObj.coverData, sizes: '512x512', type: 'image/png' }] : []
    });

    navigator.mediaSession.playbackState = 'playing';

    navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
    navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrevTrack());
    navigator.mediaSession.setActionHandler('nexttrack', () => playNextTrack());
  }
}

function updatePlayButtonUI(isPlaying) {
  if (isPlaying) {
    playBtn.innerHTML = `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
  } else {
    playBtn.innerHTML = `<svg class="play-icon" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>`;
  }
}

function highlightCurrentTrack() {
  document.querySelectorAll('.song-row').forEach(tr => {
    if (currentTrackObj && tr.dataset.filepath === currentTrackObj.filePath) {
      tr.classList.add('playing-row');
    } else {
      tr.classList.remove('playing-row');
    }
  });
}

function togglePlayPause() {
  if (!audioPlayer.src) return;
  if (audioPlayer.paused) {
    audioPlayer.play();
    updatePlayButtonUI(true);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  } else {
    audioPlayer.pause();
    updatePlayButtonUI(false);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  }
}

function playNextTrack() {
  if (currentPlaylist.length === 0) return;

  if (isShuffle) {
    let nextIdx = Math.floor(Math.random() * currentPlaylist.length);
    if (currentPlaylist.length > 1 && nextIdx === currentIndex) {
      nextIdx = (nextIdx + 1) % currentPlaylist.length;
    }
    playTrackAtIndex(nextIdx);
  } else {
    if (currentIndex < currentPlaylist.length - 1) {
      playTrackAtIndex(currentIndex + 1);
    }
  }
}

function playPrevTrack() {
  if (currentPlaylist.length === 0) return;

  if (isShuffle) {
    let prevIdx = Math.floor(Math.random() * currentPlaylist.length);
    playTrackAtIndex(prevIdx);
  } else {
    if (currentIndex > 0) {
      playTrackAtIndex(currentIndex - 1);
    }
  }
}

playBtn.addEventListener('click', togglePlayPause);
prevBtn.addEventListener('click', playPrevTrack);
nextBtn.addEventListener('click', playNextTrack);

audioPlayer.addEventListener('ended', playNextTrack);

audioPlayer.addEventListener('timeupdate', () => {
  if (audioPlayer.duration) {
    const pct = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    seekBar.value = pct;
    currentTimeEl.innerText = formatTime(audioPlayer.currentTime);
    totalTimeEl.innerText = formatTime(audioPlayer.duration);
  }
});

seekBar.addEventListener('input', () => {
  if (audioPlayer.duration) {
    audioPlayer.currentTime = (seekBar.value / 100) * audioPlayer.duration;
  }
});

function updateVolume(val) {
  const linear = val / 100;
  audioPlayer.volume = Math.pow(linear, 2);
}

volumeBar.addEventListener('input', () => {
  updateVolume(volumeBar.value);
});

searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = currentLibrary.filter(t => 
    t.title.toLowerCase().includes(query) ||
    t.artist.toLowerCase().includes(query) ||
    (t.albumArtist && t.albumArtist.toLowerCase().includes(query)) ||
    t.album.toLowerCase().includes(query)
  );
  renderView(filtered);
});

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}