// Main application JavaScript

// Store for application data
const store = {
    currentTrack: null,
    isPlaying: false,
    currentPlaylist: null,
    playlists: [],
    recentTracks: [],
    searchResults: [],
    currentTrackToAddToPlaylist: null,
    player: null,  // replaced audioPlayer with a YouTube Player instance
    isRepeatEnabled: false,
    youtubeApiLoaded: false
};

// Initialize from localStorage
function initializeFromStorage() {
    try {
        const storedPlaylists = localStorage.getItem('playlists');
        if (storedPlaylists) {
            store.playlists = JSON.parse(storedPlaylists);
        } else {
            // Create default playlists if none exist
            store.playlists = [
                { id: 'favorites', name: 'Favoris', tracks: [] },
                { id: 'myPlaylist1', name: 'Ma Playlist', tracks: [] }
            ];
            savePlaylistsToStorage();
        }

        const storedRecentTracks = localStorage.getItem('recentTracks');
        if (storedRecentTracks) {
            store.recentTracks = JSON.parse(storedRecentTracks);
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        // Reset to defaults if error
        store.playlists = [
            { id: 'favorites', name: 'Favoris', tracks: [] },
            { id: 'myPlaylist1', name: 'Ma Playlist', tracks: [] }
        ];
        store.recentTracks = [];
        savePlaylistsToStorage();
    }
}

// Save playlists to localStorage
function savePlaylistsToStorage() {
    localStorage.setItem('playlists', JSON.stringify(store.playlists));
}

// Save recent tracks to localStorage
function saveRecentTracksToStorage() {
    localStorage.setItem('recentTracks', JSON.stringify(store.recentTracks));
}

// Add track to recent tracks
function addToRecentTracks(track) {
    // Remove if already exists
    store.recentTracks = store.recentTracks.filter(t => t.videoId !== track.videoId);

    // Add to the beginning
    store.recentTracks.unshift(track);

    // Keep only the last 10
    if (store.recentTracks.length > 10) {
        store.recentTracks = store.recentTracks.slice(0, 10);
    }

    saveRecentTracksToStorage();
    renderRecentTracks();
}

// Render recent tracks
function renderRecentTracks() {
    const container = document.getElementById('recent-tracks');
    if (!container) return;

    container.innerHTML = '';

    if (store.recentTracks.length === 0) {
        container.innerHTML = `<p class="empty-state">Pas d'Ã©coutes rÃ©centes</p>`;
        return;
    }

    store.recentTracks.forEach(track => {
        const trackElement = document.createElement('div');
        trackElement.className = 'track-card';
        trackElement.setAttribute('data-video-id', track.videoId);
        trackElement.innerHTML = `
            <div class="thumbnail">
                ${track.thumbnail ? `<img src="${track.thumbnail}" alt="${track.title}">` : '<i class="fas fa-music"></i>'}
            </div>
            <div class="track-title">${track.title}</div>
            <div class="track-artist">${track.author?.name || 'Artiste inconnu'}</div>
        `;
        trackElement.addEventListener('click', () => {
            playTrack(track);
        });
        container.appendChild(trackElement);
    });
}

// Render playlists
function renderPlaylists() {
    const container = document.getElementById('playlists-container');
    if (!container) return;

    container.innerHTML = '';

    store.playlists.forEach(playlist => {
        const playlistElement = document.createElement('div');
        playlistElement.className = 'playlist-card';
        playlistElement.innerHTML = `
            <div class="thumbnail">
                ${playlist.tracks.length > 0 && playlist.tracks[0].thumbnail
                    ? `<img src="${playlist.tracks[0].thumbnail}" alt="${playlist.name}">`
                    : '<i class="fas fa-music"></i>'}
            </div>
            <div class="playlist-name">${playlist.name}</div>
            <div class="playlist-info">${playlist.tracks.length} titres</div>
        `;
        playlistElement.addEventListener('click', () => {
            openPlaylist(playlist);
        });
        container.appendChild(playlistElement);
    });
}

// Open playlist
function openPlaylist(playlist) {
    store.currentPlaylist = playlist;

    const playlistTitle = document.getElementById('playlist-title');
    const playlistCount = document.getElementById('playlist-count');
    const tracksContainer = document.getElementById('playlist-tracks');

    if (!playlistTitle || !playlistCount || !tracksContainer) return;

    playlistTitle.textContent = playlist.name;
    playlistCount.textContent = `${playlist.tracks.length} titres`;

    tracksContainer.innerHTML = '';

    if (playlist.tracks.length === 0) {
        tracksContainer.innerHTML = `<p class="empty-state">Cette playlist est vide</p>`;
    } else {
        playlist.tracks.forEach(track => {
            const trackElement = document.createElement('div');
            trackElement.className = 'playlist-track';
            trackElement.setAttribute('data-video-id', track.videoId);
            trackElement.innerHTML = `
                <div class="thumbnail">
                    ${track.thumbnail ? `<img src="${track.thumbnail}" alt="${track.title}">` : '<i class="fas fa-music"></i>'}
                </div>
                <div class="track-info">
                    <div class="track-title">${track.title}</div>
                    <div class="track-artist">${track.author?.name || 'Artiste inconnu'}</div>
                </div>
                <div class="track-actions">
                    <button class="remove-track-btn" data-video-id="${track.videoId}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            trackElement.addEventListener('click', (e) => {
                if (!e.target.closest('.remove-track-btn')) {
                    playTrack(track);
                }
            });
            tracksContainer.appendChild(trackElement);
        });

        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-track-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const videoId = btn.getAttribute('data-video-id');
                removeTrackFromPlaylist(videoId);
            });
        });
    }

    showView('playlist-view');
}

// Remove track from playlist
function removeTrackFromPlaylist(videoId) {
    if (store.currentPlaylist) {
        store.currentPlaylist.tracks = store.currentPlaylist.tracks.filter(track => track.videoId !== videoId);

        // Update the playlist in the main playlists array
        const index = store.playlists.findIndex(p => p.id === store.currentPlaylist.id);
        if (index !== -1) {
            store.playlists[index] = store.currentPlaylist;
            savePlaylistsToStorage();
        }

        // Re-render the playlist
        openPlaylist(store.currentPlaylist);
    }
}

// Perform search
async function performSearch(query) {
    if (!query.trim()) return;

    const searchResults = document.getElementById('search-results');
    if (!searchResults) return;

    showLoadingState('search-results');

    try {
        // Using invidious API to search YouTube videos
        const invidiousInstances = [
            'https://invidious.lunar.icu',
            'https://inv.vern.cc',
            'https://invidious.flokinet.to',
            'https://invidious.kavin.rocks',
            'https://vid.puffyan.us'
        ];

        let results = null;

        // Try each instance until one works
        for (const instance of invidiousInstances) {
            try {
                const response = await fetch(`${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
                if (!response.ok) continue;

                const data = await response.json();

                if (data && data.length > 0) {
                    results = data;
                    break;
                }
            } catch (err) {
                console.warn(`Failed with instance ${instance}:`, err);
                continue; // Try next instance
            }
        }

        if (results && results.length > 0) {
            store.searchResults = results.map(item => ({
                title: item.title,
                videoId: item.videoId,
                author: {
                    name: item.author
                },
                thumbnail: item.videoThumbnails?.[0]?.url || '',
                duration: item.lengthSeconds ? formatTime(item.lengthSeconds) : ''
            }));
            renderSearchResults();
        } else {
            // Try fallback search
            await fallbackSearch(query);
        }
    } catch (error) {
        console.error('Error searching:', error);
        await fallbackSearch(query);
    }
}

// Fallback search implementation
async function fallbackSearch(query) {
    try {
        // Try using scraper proxy service
        const response = await fetch(`https://scraper.infinityprod.repl.co/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data && data.length > 0) {
            store.searchResults = data.map(item => ({
                title: item.title,
                videoId: item.url.split('v=')[1] || item.url.split('/').pop(),
                author: {
                    name: item.channel
                },
                thumbnail: item.thumbnail,
                duration: item.duration
            }));
            renderSearchResults();
        } else {
            // Try using YouTube music search via Piped API
            const pipedResponse = await fetch(`https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(query)}&filter=music_songs`);
            const pipedData = await pipedResponse.json();

            if (pipedData && pipedData.items && pipedData.items.length > 0) {
                store.searchResults = pipedData.items.map(item => ({
                    title: item.title,
                    videoId: item.url.split('v=')[1] || item.url.split('/').pop(),
                    author: {
                        name: item.uploaderName || 'Unknown Artist'
                    },
                    thumbnail: item.thumbnail || '',
                    duration: item.duration || ''
                }));
                renderSearchResults();
            } else {
                const searchResults = document.getElementById('search-results');
                if (searchResults) {
                    searchResults.innerHTML = `<p class="empty-state">Aucun rÃ©sultat trouvÃ©</p>`;
                }
            }
        }
    } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError);
        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            searchResults.innerHTML = `
                <div class="error-message">
                    <p>Erreur lors de la recherche. Veuillez rÃ©essayer.</p>
                </div>
            `;
        }
    }
}

// Make the fallback search function globally available for the main search function
window.fallbackSearch = fallbackSearch;

// Render search results
function renderSearchResults() {
    const container = document.getElementById('search-results');
    if (!container) return;

    container.innerHTML = '';

    if (store.searchResults.length === 0) {
        container.innerHTML = `<p class="empty-state">Aucun rÃ©sultat trouvÃ©</p>`;
        return;
    }

    store.searchResults.forEach(track => {
        const trackElement = document.createElement('div');
        trackElement.className = 'search-track';
        trackElement.setAttribute('data-video-id', track.videoId);
        trackElement.innerHTML = `
            <div class="thumbnail">
                ${track.thumbnail ? `<img src="${track.thumbnail}" alt="${track.title}">` : '<i class="fas fa-music"></i>'}
            </div>
            <div class="track-info">
                <div class="track-title">${track.title}</div>
                <div class="track-artist">${track.author?.name || 'Artiste inconnu'}</div>
            </div>
            <div class="track-actions">
                <button class="add-to-playlist-btn" data-video-id="${track.videoId}">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;

        trackElement.addEventListener('click', (e) => {
            if (!e.target.closest('.add-to-playlist-btn')) {
                playTrack(track);
            }
        });
        container.appendChild(trackElement);
    });

    // Add event listeners for add to playlist buttons
    document.querySelectorAll('.add-to-playlist-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const videoId = btn.getAttribute('data-video-id');
            const track = store.searchResults.find(t => t.videoId === videoId);
            if (track) {
                openAddToPlaylistModal(track);
            }
        });
    });
}

// Play a track
function playTrack(track) {
    if (!track) return;
    store.currentTrack = track;
    addToRecentTracks(track);
    if (store.player && store.player.loadVideoById) {
         store.player.loadVideoById(track.videoId);
         store.player.playVideo();
         store.isPlaying = true;
         updateNowPlayingUI();
         updateExpandedPlayerUI();
         updateSelectedTrack();
    } else {
         console.error("YouTube Player not ready yet.");
    }
}

// Toggle play/pause
function togglePlayPause() {
    if (!store.currentTrack) return;
    if (store.isPlaying) {
         store.player.pauseVideo();
         store.isPlaying = false;
    } else {
         store.player.playVideo();
         store.isPlaying = true;
    }
    updateNowPlayingUI();
    updateExpandedPlayerUI();
}

// Open Add to Playlist Modal
function openAddToPlaylistModal(track) {
    store.currentTrackToAddToPlaylist = track;

    const modalPlaylists = document.getElementById('modal-playlists');
    if (!modalPlaylists) return;

    modalPlaylists.innerHTML = '';

    store.playlists.forEach(playlist => {
        const playlistItem = document.createElement('div');
        playlistItem.className = 'modal-playlist-item';
        playlistItem.textContent = playlist.name;

        playlistItem.addEventListener('click', () => {
            addTrackToPlaylist(playlist.id, track);
            closeModal();
        });

        modalPlaylists.appendChild(playlistItem);
    });

    const playlistModal = document.getElementById('playlist-modal');
    if (playlistModal) {
        playlistModal.style.display = 'flex';
    }
}

// Close Modal
function closeModal() {
    const playlistModal = document.getElementById('playlist-modal');
    if (playlistModal) {
        playlistModal.style.display = 'none';
    }
    store.currentTrackToAddToPlaylist = null;
}

// Add track to playlist
function addTrackToPlaylist(playlistId, track) {
    const playlist = store.playlists.find(p => p.id === playlistId);

    if (playlist) {
        // Check if track already exists in playlist
        const trackExists = playlist.tracks.some(t => t.videoId === track.videoId);

        if (!trackExists) {
            playlist.tracks.push(track);
            savePlaylistsToStorage();

            // If this is the currently open playlist, refresh it
            if (store.currentPlaylist && store.currentPlaylist.id === playlistId) {
                openPlaylist(playlist);
            }

            // Show confirmation toast
            showToast(`AjoutÃ© Ã  ${playlist.name}`);
        } else {
            showToast('Ce titre est dÃ©jÃ  dans la playlist');
        }
    }
}

// Create New Playlist
function createNewPlaylist() {
    const nameInput = document.getElementById('new-playlist-name');
    if (!nameInput) return;

    const name = nameInput.value.trim();

    if (name) {
        const id = 'playlist_' + Date.now();
        const newPlaylist = {
            id,
            name,
            tracks: []
        };

        store.playlists.push(newPlaylist);
        savePlaylistsToStorage();
        renderPlaylists();

        // Add current track to the new playlist if there is one
        if (store.currentTrackToAddToPlaylist) {
            addTrackToPlaylist(id, store.currentTrackToAddToPlaylist);
        }

        // Clear input and close modal
        nameInput.value = '';
        closeModal();
    }
}

// Show toast notification
function showToast(message) {
    // Check if toast container exists, if not create it
    let toastContainer = document.getElementById('toast-container');

    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.bottom = '80px';
        toastContainer.style.left = '50%';
        toastContainer.style.transform = 'translateX(-50%)';
        toastContainer.style.zIndex = '1000';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.backgroundColor = 'rgba(29, 185, 84, 0.9)';
    toast.style.color = 'white';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '20px';
    toast.style.marginBottom = '10px';
    toast.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';

    toastContainer.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease';

        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 2000);
}

// Show view (home, search, playlist)
function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    const view = document.getElementById(viewId);
    if (view) {
        view.classList.add('active');
    }

    document.querySelectorAll('.nav-button').forEach(btn => {
        if (btn.getAttribute('data-view') === viewId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    if (viewId === 'library-view') {
        renderLibrary();
    }
}

// Add like/unlike functionality to track
function toggleLike(track) {
    const favoritesPlaylist = store.playlists.find(p => p.id === 'favorites');
    if (!favoritesPlaylist) return;

    const trackIndex = favoritesPlaylist.tracks.findIndex(t => t.videoId === track.videoId);

    if (trackIndex === -1) {
        // Add to favorites
        favoritesPlaylist.tracks.push(track);
        showToast('AjoutÃ© aux favoris');
    } else {
        // Remove from favorites
        favoritesPlaylist.tracks.splice(trackIndex, 1);
        showToast('RetirÃ© des favoris');
    }

    savePlaylistsToStorage();

    // Update UI if needed
    if (store.currentPlaylist && store.currentPlaylist.id === 'favorites') {
        openPlaylist(favoritesPlaylist);
    }

    updateLikeButton(track);
}

// Check if track is liked
function isTrackLiked(videoId) {
    const favoritesPlaylist = store.playlists.find(p => p.id === 'favorites');
    if (!favoritesPlaylist) return false;

    return favoritesPlaylist.tracks.some(t => t.videoId === videoId);
}

// Update the UI to reflect liked status
function updateLikeButton(track) {
    const likeBtn = document.getElementById('like-button');
    const likeBtnExpanded = document.getElementById('like-button-expanded');

    const isLiked = isTrackLiked(track.videoId);

    if (likeBtn) {
        likeBtn.innerHTML = isLiked ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
        if (isLiked) {
            likeBtn.classList.add('liked');
        } else {
            likeBtn.classList.remove('liked');
        }
    }

    if (likeBtnExpanded) {
        likeBtnExpanded.innerHTML = isLiked ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
        if (isLiked) {
            likeBtnExpanded.classList.add('liked');
        } else {
            likeBtnExpanded.classList.remove('liked');
        }
    }
}

// Show loading state
function showLoadingState(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div class="loading-indicator">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Chargement...</p>
        </div>
    `;
}

// Update progress bar
function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');

    if (!store.player || store.player.getDuration() === 0) return;

    const percent = (store.player.getCurrentTime() / store.player.getDuration()) * 100;
    progressBar.style.width = `${percent}%`;
    currentTimeEl.textContent = formatTime(store.player.getCurrentTime());
    durationEl.textContent = formatTime(store.player.getDuration());
}

// Format time in mm:ss
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Toggle repeat mode
function toggleRepeat() {
    store.isRepeatEnabled = !store.isRepeatEnabled;
    updateNowPlayingUI();
    updateExpandedPlayerUI();

    showToast(store.isRepeatEnabled ? 'RÃ©pÃ©tition activÃ©e' : 'RÃ©pÃ©tition dÃ©sactivÃ©e');
}

// Update Now Playing UI
function updateNowPlayingUI() {
    const currentTitle = document.getElementById('current-title');
    const currentArtist = document.getElementById('current-artist');
    const currentThumbnail = document.getElementById('current-thumbnail');
    const playPauseButton = document.getElementById('play-pause-button');
    const likeButton = document.getElementById('like-button');
    const repeatButton = document.getElementById('repeat-button');

    if (!currentTitle || !currentArtist || !currentThumbnail || !playPauseButton) return;

    if (store.currentTrack) {
        currentTitle.textContent = store.currentTrack.title;
        currentArtist.textContent = store.currentTrack.author?.name || 'Artiste inconnu';

        if (store.currentTrack.thumbnail) {
            currentThumbnail.innerHTML = `<img src="${store.currentTrack.thumbnail}" alt="${store.currentTrack.title}">`;
        } else {
            currentThumbnail.innerHTML = '<i class="fas fa-music"></i>';
        }

        playPauseButton.innerHTML = store.isPlaying
            ? '<i class="fas fa-pause"></i>'
            : '<i class="fas fa-play"></i>';

        // Update like button
        if (likeButton) {
            updateLikeButton(store.currentTrack);
        }

        // Update repeat button
        if (repeatButton) {
            repeatButton.className = store.isRepeatEnabled
                ? 'active'
                : '';
        }
    } else {
        currentTitle.textContent = 'Pas de titre en lecture';
        currentArtist.textContent = '-';
        currentThumbnail.innerHTML = '<i class="fas fa-music"></i>';
        playPauseButton.innerHTML = '<i class="fas fa-play"></i>';

        if (likeButton) {
            likeButton.innerHTML = '<i class="far fa-heart"></i>';
            likeButton.classList.remove('liked');
        }
    }
}

// Update expanded player UI
function updateExpandedPlayerUI() {
    const expandedTitle = document.getElementById('expanded-title');
    const expandedArtist = document.getElementById('expanded-artist');
    const expandedThumbnail = document.getElementById('expanded-thumbnail');
    const playPauseButtonExpanded = document.getElementById('play-pause-button-expanded');
    const likeButtonExpanded = document.getElementById('like-button-expanded');
    const repeatButtonExpanded = document.getElementById('repeat-button-expanded');

    if (!expandedTitle || !expandedArtist || !expandedThumbnail || !playPauseButtonExpanded) return;

    if (store.currentTrack) {
        expandedTitle.textContent = store.currentTrack.title;
        expandedArtist.textContent = store.currentTrack.author?.name || 'Artiste inconnu';

        if (store.currentTrack.thumbnail) {
            expandedThumbnail.innerHTML = `<img src="${store.currentTrack.thumbnail}" alt="${store.currentTrack.title}">`;
        } else {
            expandedThumbnail.innerHTML = '<i class="fas fa-music"></i>';
        }

        playPauseButtonExpanded.innerHTML = store.isPlaying
            ? '<i class="fas fa-pause"></i>'
            : '<i class="fas fa-play"></i>';

        // Update repeat button
        if (repeatButtonExpanded) {
            repeatButtonExpanded.className = store.isRepeatEnabled
                ? 'active'
                : '';
        }
    }

    // Update ambient background of player
    const playerBackground = document.getElementById('player-background');
    if (playerBackground && store.currentTrack && store.currentTrack.thumbnail) {
        playerBackground.style.backgroundImage = `url("${store.currentTrack.thumbnail}")`;
    } else if (playerBackground) {
        playerBackground.style.backgroundImage = '';
    }
}

// Add YouTube IFrame API callbacks
function onYouTubeIframeAPIReady() {
    store.player = new YT.Player('yt-player', {
         videoId: store.currentTrack ? store.currentTrack.videoId : '',
         playerVars: {
             autoplay: 0,
             controls: 0,
             modestbranding: 1,
             rel: 0,
             iv_load_policy: 3
         },
         events: {
             'onReady': onPlayerReady,
             'onStateChange': onPlayerStateChange
         }
    });
}

function onPlayerReady(event) {
    // Update progress bar every 500ms
    setInterval(updateProgressBar, 500);
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        store.isPlaying = true;
        updateNowPlayingUI();
        updateExpandedPlayerUI();
    } else if (event.data === YT.PlayerState.PAUSED) {
        store.isPlaying = false;
        updateNowPlayingUI();
        updateExpandedPlayerUI();
    } else if (event.data === YT.PlayerState.ENDED) {
        if (store.isRepeatEnabled) {
            store.player.playVideo();
        } else {
            if (store.currentPlaylist && store.currentTrack) {
                const currentIndex = store.currentPlaylist.tracks.findIndex(t => t.videoId === store.currentTrack.videoId);
                if (currentIndex !== -1 && currentIndex < store.currentPlaylist.tracks.length - 1) {
                    playTrack(store.currentPlaylist.tracks[currentIndex + 1]);
                } else {
                    store.isPlaying = false;
                    updateNowPlayingUI();
                    updateExpandedPlayerUI();
                }
            }
        }
    }
}

// Update the click event for the progress container
const progressContainer = document.getElementById('progress-container');
if (progressContainer) {
    progressContainer.addEventListener('click', (e) => {
        if (store.player && store.player.getDuration()) {
            const clickPercent = (e.offsetX / progressContainer.offsetWidth);
            store.player.seekTo(clickPercent * store.player.getDuration(), true);
            updateProgressBar();
        }
    });
}

// Update selected track styling across lists
function updateSelectedTrack() {
    const trackElements = document.querySelectorAll('.track-card, .search-track, .playlist-track');
    trackElements.forEach(el => {
        if (store.currentTrack && el.getAttribute('data-video-id') === store.currentTrack.videoId) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });
}

// Render dedicated Library view for playlists
function renderLibrary() {
    const container = document.getElementById('library-playlists');
    if (!container) return;
    container.innerHTML = '';
    store.playlists.forEach(playlist => {
        const playlistElement = document.createElement('div');
        playlistElement.className = 'playlist-card';
        playlistElement.setAttribute('data-playlist-id', playlist.id);
        playlistElement.innerHTML = `
            <div class="thumbnail">
                ${playlist.tracks.length > 0 && playlist.tracks[0].thumbnail
                    ? `<img src="${playlist.tracks[0].thumbnail}" alt="${playlist.name}">`
                    : '<i class="fas fa-music"></i>'}
            </div>
            <div class="playlist-name">${playlist.name}</div>
            <div class="playlist-info">${playlist.tracks.length} titres</div>
        `;
        playlistElement.addEventListener('click', () => {
            openPlaylist(playlist);
        });
        container.appendChild(playlistElement);
    });
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize data from storage
    initializeFromStorage();

    // Render initial UI
    renderRecentTracks();
    renderPlaylists();

    // Setup event listeners for search
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');

    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                if (query) {
                    performSearch(query);
                    showView('search-view');
                }
            }
        });
    }

    if (searchButton) {
        searchButton.addEventListener('click', () => {
            const query = searchInput ? searchInput.value.trim() : '';
            if (query) {
                performSearch(query);
                showView('search-view');
            }
        });
    }

    // Navigation buttons
    document.querySelectorAll('.nav-button').forEach(btn => {
        btn.addEventListener('click', () => {
            const viewId = btn.getAttribute('data-view');
            if (viewId) {
                showView(viewId);
            }
        });
    });

    // Library button
    const libraryButton = document.getElementById('library-button');
    if (libraryButton) {
        libraryButton.addEventListener('click', () => {
            showView('library-view');
        });
    }

    // Back button in playlist view
    const backButton = document.getElementById('back-to-home');
    if (backButton) {
        backButton.addEventListener('click', () => {
            showView('home-view');
        });
    }

    // Add to playlist button
    const addToPlaylistButton = document.getElementById('add-to-playlist');
    if (addToPlaylistButton) {
        addToPlaylistButton.addEventListener('click', () => {
            if (store.currentTrack) {
                openAddToPlaylistModal(store.currentTrack);
            }
        });
    }

    // Play/Pause button
    const playPauseButton = document.getElementById('play-pause-button');
    if (playPauseButton) {
        playPauseButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent expanding player
            togglePlayPause();
        });
    }

    // Like button
    const likeButton = document.getElementById('like-button');
    if (likeButton) {
        likeButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent expanding player
            if (store.currentTrack) {
                toggleLike(store.currentTrack);
            }
        });
    }

    // Expand player when clicking on now playing bar
    const nowPlayingBar = document.getElementById('now-playing-bar');
    const playerExpanded = document.getElementById('player-expanded');

    if (nowPlayingBar && playerExpanded) {
        nowPlayingBar.addEventListener('click', (e) => {
            // Don't expand if clicking on a control
            if (!e.target.closest('.player-controls') && !e.target.closest('#like-button')) {
                playerExpanded.classList.toggle('active');
            }
        });
    }

    // Close expanded player
    const closePlayer = document.getElementById('close-player');
    if (closePlayer && playerExpanded) {
        closePlayer.addEventListener('click', () => {
            playerExpanded.classList.remove('active');
        });
    }

    // Click on progress bar
    progressContainer.addEventListener('click', (e) => {
        if (store.player && store.player.getDuration()) {
            const clickPercent = (e.offsetX / progressContainer.offsetWidth);
            store.player.seekTo(clickPercent * store.player.getDuration(), true);
            updateProgressBar();
        }
    });

    // Close modal button
    const closeModal = document.getElementById('close-modal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            const playlistModal = document.getElementById('playlist-modal');
            if (playlistModal) {
                playlistModal.style.display = 'none';
            }
            store.currentTrackToAddToPlaylist = null;
        });
    }

    // Create playlist button
    const createPlaylistButton = document.getElementById('create-playlist-button');
    if (createPlaylistButton) {
        createPlaylistButton.addEventListener('click', createNewPlaylist);
    }

    // Expanded player controls
    const playPauseButtonExpanded = document.getElementById('play-pause-button-expanded');
    if (playPauseButtonExpanded) {
        playPauseButtonExpanded.addEventListener('click', togglePlayPause);
    }

    const prevButtonExpanded = document.getElementById('prev-button-expanded');
    if (prevButtonExpanded) {
        prevButtonExpanded.addEventListener('click', () => {
            if (store.player && store.player.getCurrentTime() > 3) {
                store.player.seekTo(0, true);
            }
        });
    }

    const nextButtonExpanded = document.getElementById('next-button-expanded');
    if (nextButtonExpanded) {
        nextButtonExpanded.addEventListener('click', () => {
            if (store.currentPlaylist && store.currentTrack) {
                const currentIndex = store.currentPlaylist.tracks.findIndex(t => t.videoId === store.currentTrack.videoId);
                if (currentIndex !== -1 && currentIndex < store.currentPlaylist.tracks.length - 1) {
                    playTrack(store.currentPlaylist.tracks[currentIndex + 1]);
                }
            }
        });
    }

    // Initialize expanded player like button
    const likeButtonExpanded = document.getElementById('like-button-expanded');
    if (likeButtonExpanded) {
        likeButtonExpanded.addEventListener('click', () => {
            if (store.currentTrack) {
                toggleLike(store.currentTrack);
            }
        });
    }

    // Repeat button
    const repeatButton = document.getElementById('repeat-button');
    if (repeatButton) {
        repeatButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent expanding player
            toggleRepeat();
        });
    }

    // Expanded player repeat button
    const repeatButtonExpanded = document.getElementById('repeat-button-expanded');
    if (repeatButtonExpanded) {
        repeatButtonExpanded.addEventListener('click', toggleRepeat);
    }

    // Update UI on load
    updateNowPlayingUI();

    // Load YouTube Iframe API
    const script = document.createElement('script');
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);

    window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
});