// Global variables
let currentVideoId = null;
let typingTimer = null;
let youtubePlayer = null;
let wasManuallyPaused = false;
let playerReady = false;
let pauseDelayActive = false;  // New flag to track if pause delay is active
let wavesurfer = null;
const TYPING_TIMEOUT = 2000; // 2 seconds
let lastTranscription = ''; // Store the last submitted transcription

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const searchResults = document.getElementById('search-results');
const videoSection = document.getElementById('video-section');
const videoTitle = document.getElementById('video-title');
const videoPlayer = document.getElementById('video-player');
const transcriptionInput = document.getElementById('transcription-input');
const submitButton = document.getElementById('submit-button');
const resultsSection = document.getElementById('results-section');
const userTranscriptionElement = document.getElementById('user-transcription');
const actualTranscriptElement = document.getElementById('actual-transcript');
const resultContainer = document.getElementById('user-transcription');
const pauseDelaySelect = document.getElementById('pause-delay');
const rewindTimeSelect = document.getElementById('rewind-time');
const rewindButton = document.getElementById('rewind-button');
const playStopButton = document.getElementById('play-stop-button');
const statsContent = document.getElementById('stats-content');

// Set search input placeholder
searchInput.placeholder = 'Enter search keywords or paste video link';

// Create overlay for hiding YouTube controls
function createPlayerOverlay() {
    console.log('Attempting to create overlay...');
    let overlay = document.getElementById('player-overlay');
    if (overlay) {
        console.log('Overlay already exists.');
        return overlay;
    }
    
    overlay = document.createElement('div');
    overlay.id = 'player-overlay';
    overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 255, 0.1); /* TEMPORARY: Blue tint for debugging */
        z-index: 1000;
        display: none;
        pointer-events: all;
    `;
    
    // Get the immediate container of the video player element
    const playerContainer = videoPlayer.parentElement;
    
    if (playerContainer) {
        console.log('Appending overlay to player parent container.');
        // Ensure the parent container has relative positioning
        if (getComputedStyle(playerContainer).position === 'static') {
            console.log('Setting parent container position to relative.');
            playerContainer.style.position = 'relative';
        }
        playerContainer.appendChild(overlay);
    } else {
        // Fallback: Append to body or a known container if parent isn't suitable
        console.warn('Player parent container not found, appending overlay to body.');
        document.body.appendChild(overlay);
        // Adjust positioning if appended to body (might need more specific logic)
        const playerRect = videoPlayer.getBoundingClientRect();
        overlay.style.top = `${playerRect.top + window.scrollY}px`;
        overlay.style.left = `${playerRect.left + window.scrollX}px`;
        overlay.style.width = `${playerRect.width}px`;
        overlay.style.height = `${playerRect.height}px`;
        overlay.style.position = 'absolute'; // Ensure it's absolute when attached to body
    }
    
    console.log('Overlay created.');
    return overlay;
}

// Show overlay to prevent control display
function showPlayerOverlay() {
    console.log('Showing player overlay...');
    const overlay = createPlayerOverlay();
    overlay.style.display = 'block';
}

// Hide overlay to allow normal controls
function hidePlayerOverlay() {
    console.log('Hiding player overlay...');
    const overlay = document.getElementById('player-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Set default pause delay to 2 seconds
window.addEventListener('DOMContentLoaded', () => {
    pauseDelaySelect.value = "2";
});

// Initialize WaveSurfer
function initWaveSurfer() {
    wavesurfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: '#4a668c',
        progressColor: '#2ecc71',
        cursorColor: '#fff',
        barWidth: 2,
        barGap: 1,
        height: '100%',
        normalize: true,
        vertical: true,
        plugins: []
    });

    // Handle waveform click events
    wavesurfer.on('interaction', (position) => {
        if (youtubePlayer && youtubePlayer.seekTo) {
            const duration = youtubePlayer.getDuration();
            youtubePlayer.seekTo(position * duration, true);
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initWaveSurfer);

// YouTube API ready callback
window.onYouTubeIframeAPIReady = function() {
    console.log('YouTube API Ready');
};

// Event Listeners
searchButton.addEventListener('click', searchVideos);
submitButton.addEventListener('click', submitTranscription);
rewindButton.addEventListener('click', handleRewind);
playStopButton.addEventListener('click', handlePlayStop);

// Handle typing in transcription input
transcriptionInput.addEventListener('input', function() {
    console.log('Input detected in transcription box.');
    if (!playerReady || !youtubePlayer || !youtubePlayer.pauseVideo) {
        console.log('Player not ready or pauseVideo not available.');
        return;
    }

    const pauseDelay = parseInt(pauseDelaySelect.value);
    const playerState = youtubePlayer.getPlayerState();
    console.log(`Pause Delay: ${pauseDelay}, Player State: ${playerState}, Pause Delay Active: ${pauseDelayActive}`);
    
    // Only proceed if video is playing and pause delay > 0
    if (pauseDelay > 0 && (playerState === YT.PlayerState.PLAYING || pauseDelayActive)) {
        const currentRate = youtubePlayer.getPlaybackRate();
        console.log('Pause delay condition met.');
        
        if (!pauseDelayActive) {
            console.log('Activating pause delay - pausing video and showing overlay.');
            // Technique 1: CSS injection (keep trying)
            const iframe = document.querySelector('#video-player iframe');
            if (iframe) {
                const style = document.createElement('style');
                style.id = 'ytp-hide-style'; // Give it an ID for easier removal
                style.textContent = `
                    .ytp-chrome-top, .ytp-chrome-bottom, 
                    .ytp-gradient-top, .ytp-gradient-bottom, 
                    .ytp-pause-overlay, .ytp-endscreen-content {
                        display: none !important;
                    }
                `;
                try {
                    iframe.contentDocument.head.appendChild(style);
                    console.log('Injected CSS to hide controls.');
                } catch (e) {
                    console.log('Could not inject styles directly.');
                }
            }
            
            // Technique 2: Overlay div
            showPlayerOverlay();
            
            youtubePlayer.pauseVideo();
            pauseDelayActive = true;
        } else {
            console.log('Pause delay already active, restarting timer.');
        }
        
        if (typingTimer) {
            clearTimeout(typingTimer);
        }
        
        typingTimer = setTimeout(() => {
            console.log('Pause delay timer finished.');
            if (playerReady && youtubePlayer && youtubePlayer.playVideo) {
                console.log('Resuming video and hiding overlay.');
                hidePlayerOverlay();
                
                const iframe = document.querySelector('#video-player iframe');
                if (iframe) {
                    try {
                        const style = iframe.contentDocument.getElementById('ytp-hide-style');
                        if (style) {
                            style.remove();
                            console.log('Removed injected CSS.');
                        }
                    } catch (e) {
                        console.log('Could not remove styles directly.');
                    }
                }
                
                const rewindSeconds = parseFloat(rewindTimeSelect.value);
                if (rewindSeconds > 0) {
                    const currentTime = youtubePlayer.getCurrentTime();
                    const newTime = Math.max(0, currentTime - rewindSeconds);
                    youtubePlayer.seekTo(newTime, true);
                }
                
                youtubePlayer.playVideo();
                youtubePlayer.setPlaybackRate(currentRate);
                pauseDelayActive = false;
            }
        }, pauseDelay * 1000);
    }
});

// Also trigger search on Enter key in search input
searchInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        searchVideos();
    }
});

// Handle waveform click for seeking
document.querySelector('.vertical-waveform').addEventListener('click', (e) => {
    if (youtubePlayer && youtubePlayer.seekTo) {
        const container = e.currentTarget;
        const bounds = container.getBoundingClientRect();
        const relativeY = e.clientY - bounds.top;
        const percentage = 1 - (relativeY / bounds.height);
        
        // Get video duration and calculate target time
        const duration = youtubePlayer.getDuration();
        const targetTime = duration * percentage;
        
        // Seek to the target time
        youtubePlayer.seekTo(targetTime, true);
        
        // Update progress overlay immediately
        const overlay = document.querySelector('.progress-overlay');
        if (overlay) {
            overlay.style.height = `${percentage * 100}%`;
        }
    }
});

// Handle waveform hover for time display
document.querySelector('.vertical-waveform').addEventListener('mousemove', (e) => {
    if (youtubePlayer && youtubePlayer.getDuration) {
        const container = e.currentTarget;
        const bounds = container.getBoundingClientRect();
        const relativeY = e.clientY - bounds.top;
        const percentage = 1 - (relativeY / bounds.height);
        const duration = youtubePlayer.getDuration();
        const time = duration * percentage;
        
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        
        const timeline = document.querySelector('.waveform-timeline');
        if (timeline) {
            timeline.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            timeline.style.top = `${e.clientY - bounds.top - 10}px`;
        }
    }
});

// Update waveform progress
function updateWaveformProgress() {
    if (youtubePlayer && youtubePlayer.getCurrentTime && youtubePlayer.getDuration) {
        const currentTime = youtubePlayer.getCurrentTime();
        const duration = youtubePlayer.getDuration();
        if (duration > 0) {  // Make sure duration is available
            const progress = (currentTime / duration) * 100;
            
            // Update progress overlay
            const overlay = document.querySelector('.progress-overlay');
            if (overlay) {
                overlay.style.height = `${progress}%`;
            }
        }
    }
    
    // Request next frame
    requestAnimationFrame(updateWaveformProgress);
}

// Handle rewind button click
function handleRewind() {
    if (!playerReady || !youtubePlayer || !youtubePlayer.getCurrentTime) return;

    // Hide overlay to ensure controls are visible during manual rewind
    hidePlayerOverlay();

    const currentTime = youtubePlayer.getCurrentTime();
    const rewindSeconds = parseFloat(rewindTimeSelect.value);
    const newTime = Math.max(0, currentTime - rewindSeconds);
    
    // Show controls and seek
    youtubePlayer.seekTo(newTime, true);
}

// Extract video ID from YouTube URL
function extractVideoId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

// Search for videos or load direct URL
async function searchVideos() {
    const input = searchInput.value.trim();
    
    if (!input) {
        alert('Please enter search keywords or a YouTube URL');
        return;
    }
    
    // Ensure search results are visible
    searchResults.classList.remove('d-none');
    const searchContainer = searchResults.closest('.search-container') || searchResults.parentElement;
    if (searchContainer) {
        Array.from(searchContainer.children).forEach(child => {
            child.classList.remove('d-none');
        });
    }

    // Check if input is a YouTube URL
    const videoId = extractVideoId(input);
    if (videoId) {
        // It's a URL, load the video directly
        try {
            // Show loading state
            searchResults.innerHTML = '<p class="col-12 text-center">Loading video...</p>';
            
            // Create a temporary video card for the direct URL
            const videoCard = document.createElement('div');
            videoCard.className = 'col-12 text-center';
            videoCard.innerHTML = `
                <div class="card video-card">
                    <div class="card-body">
                        <h5 class="card-title">YouTube Video</h5>
                        <p class="card-text">Direct video link</p>
                    </div>
                </div>
            `;
            
            searchResults.innerHTML = '';
            searchResults.appendChild(videoCard);
            
            // Load the video directly
            loadVideo(videoId, 'YouTube Video');
            
        } catch (error) {
            console.error('Error loading video:', error);
            searchResults.innerHTML = `<p class="col-12 text-center text-danger">Error: Could not load video. Please check the URL and try again.</p>`;
        }
        return;
    }
    
    // If not a URL, proceed with search
    try {
        // Show loading state
        searchResults.innerHTML = '<p class="col-12 text-center">Searching videos...</p>';
        
        const response = await fetch('/api/search-videos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: input })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to search videos');
        }
        
        const data = await response.json();
        displaySearchResults(data.videos);
    } catch (error) {
        console.error('Error searching videos:', error);
        searchResults.innerHTML = `<p class="col-12 text-center text-danger">Error: ${error.message}</p>`;
    }
}

// Display search results
function displaySearchResults(videos) {
    searchResults.innerHTML = '';
    
    if (!videos || videos.length === 0) {
        searchResults.innerHTML = '<p class="col-12 text-center">No videos found. Try different keywords.</p>';
        return;
    }
    
    videos.forEach(video => {
        const videoCard = document.createElement('div');
        videoCard.className = 'col-md-4 mb-3';
        videoCard.innerHTML = `
            <div class="card video-card h-100">
                <img src="${video.thumbnail}" class="card-img-top video-thumbnail" alt="${video.title}">
                <div class="card-body">
                    <h5 class="card-title">${video.title}</h5>
                    <p class="card-text text-muted">${video.channel}</p>
                </div>
            </div>
        `;
        
        videoCard.addEventListener('click', () => showWatch(video.id, video.title));
        searchResults.appendChild(videoCard);
    });
}

// Initialize default stats display
function initializeStats() {
    const defaultStatsHtml = `
        <div class="stat-item">
            <span class="stat-square correct"></span>
            Correct
        </div>
        <div class="stat-item">
            <span class="stat-square wrong"></span>
            Wrong
        </div>
        <div class="stat-item">
            <span class="stat-square missing"></span>
            Missing
        </div>
    `;
    statsContent.innerHTML = defaultStatsHtml;
}

// Update stats section
function updateStats(data) {
    if (!data.results) {
        initializeStats();
        return;
    }

    const correctCount = data.results.filter(r => r.type === 'correct').length;
    const mistakeCount = data.results.filter(r => r.type === 'mistake').length;
    const wrongCount = data.results.filter(r => r.type === 'wrong').length;
    const missingCount = data.results.filter(r => r.type === 'missing').length;

    const statsHtml = `
        <div class="stat-item">
            <span class="stat-square correct"></span>
            Correct: ${correctCount}
        </div>
        <div class="stat-item">
            <span class="stat-square mistake"></span>
            Mistake: ${mistakeCount}
        </div>
        <div class="stat-item">
            <span class="stat-square wrong"></span>
            Wrong: ${wrongCount}
        </div>
        <div class="stat-item">
            <span class="stat-square missing"></span>
            Missing: ${missingCount}
        </div>
    `;

    statsContent.innerHTML = statsHtml;
}

// Reset submit button to initial state
function resetSubmitButton() {
    submitButton.textContent = 'Submit Transcription';
    submitButton.classList.remove('try-again-button');
    submitButton.classList.add('btn-primary');
    submitButton.style.backgroundColor = '';
    submitButton.style.borderColor = '';
    submitButton.style.color = '';
    initializeStats(); // Reset stats to default state
    // Limpa o resultado e mostra a caixa de transcrição
    document.getElementById('result-container').innerHTML = '';
    document.getElementById('result-container').style.display = 'none';
    transcriptionInput.style.display = '';
}

// Load a video
async function loadVideo(videoId, title) {
    currentVideoId = videoId;
    wasManuallyPaused = false;
    playerReady = false;
    pauseDelayActive = false;
    
    // Reset play/stop button
    if (playStopButton) {
        playStopButton.textContent = 'Play';
        playStopButton.classList.remove('playing');
    }
    
    // Update UI
    videoTitle.textContent = title;
    
    // Add class to indicate video is loaded
    videoSection.classList.add('has-video');
    
    // Initialize stats display
    initializeStats();
    
    // Hide search results but keep search bar
    const searchContainer = searchResults.closest('.search-container') || searchResults.parentElement;
    if (searchContainer) {
        // Keep only the search input and button visible
        const searchForm = searchContainer.querySelector('.search-form') || searchInput.closest('form') || searchInput.parentElement;
        
        // Hide other elements in the search container
        Array.from(searchContainer.children).forEach(child => {
            // If it's not the search form and not the heading, hide it
            if (child !== searchForm && !child.matches('h2, h3, h4, h5, h6')) {
                child.classList.add('d-none');
            }
        });
        
        // Make sure search results are specifically hidden
        searchResults.classList.add('d-none');
    } else {
        // Fallback: just hide search results
        searchResults.innerHTML = '';
        searchResults.classList.add('d-none');
    }
    
    // Destroy existing player if it exists
    if (youtubePlayer && youtubePlayer.destroy) {
        youtubePlayer.destroy();
    }
    
    // Create new YouTube player
    youtubePlayer = new YT.Player('video-player', {
        height: '390',
        width: '640',
        videoId: videoId,
        playerVars: {
            'playsinline': 1,
            'enablejsapi': 1,
            'origin': window.location.origin,
            'rel': 0,
            'showinfo': 0,
            'controls': 1,
            'modestbranding': 1,
            'iv_load_policy': 3,
            'fs': 1,
            'autohide': 1
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
    
    // Add CSS for hiding controls during pause delay
    const style = document.createElement('style');
    style.textContent = `
        #video-player.hide-controls iframe {
            pointer-events: none;
        }
    `;
    document.head.appendChild(style);
    
    // Reset transcription and button state
    transcriptionInput.value = '';
    lastTranscription = '';
    resetSubmitButton();
    
    // Show video section
    videoSection.classList.remove('d-none');
    resultsSection.classList.add('d-none');

    // Scroll to video section immediately
    const mainContent = document.querySelector('.video-and-transcription');
    if (mainContent) {
        mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        videoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Generate waveform data from video audio
async function generateWaveformData(videoId) {
    try {
        // For demonstration, we'll generate random waveform data
        // In a real implementation, you'd want to extract actual audio data
        const peaks = new Array(100).fill(0).map(() => Math.random());
        
        // Load the peaks into wavesurfer
        wavesurfer.load('', peaks);
    } catch (error) {
        console.error('Error generating waveform:', error);
    }
}

// YouTube player event handlers
function onPlayerReady(event) {
    youtubePlayer = event.target;
    playerReady = true;
    pauseDelayActive = false;
    
    // Add custom styles to hide suggested videos
    const iframe = document.querySelector('#video-player iframe');
    if (iframe) {
        const style = document.createElement('style');
        style.textContent = `
            .ytp-pause-overlay { display: none !important; }
            .ytp-scroll-min { display: none !important; }
        `;
        try {
            iframe.contentDocument.head.appendChild(style);
        } catch (e) {
            console.log('Could not inject styles directly - cross-origin restriction');
        }
    }
    
    // Create overlay in case we need it
    createPlayerOverlay();
}

function onPlayerStateChange(event) {
    console.log(`Player state changed to: ${event.data}`);
    if (!playerReady) return;

    const newState = event.data;
    updatePlayStopButton(newState);
    
    if (newState === YT.PlayerState.PAUSED) {
        console.log(`Paused. Pause Delay Active: ${pauseDelayActive}`);
        if (!pauseDelayActive) {
            console.log('Manual pause detected, hiding overlay.');
            hidePlayerOverlay();
            wasManuallyPaused = true;
        }
    } else if (newState === YT.PlayerState.PLAYING) {
        console.log('Playing. Hiding overlay.');
        wasManuallyPaused = false;
        pauseDelayActive = false;
        hidePlayerOverlay();
    } else if (newState === YT.PlayerState.ENDED) {
        console.log('Video ended. Hiding overlay.');
        hidePlayerOverlay();
        pauseDelayActive = false;
    }
}

// Helper to render the merged result
function renderResult(results) {
    return results.map(entry => {
        if (entry.type === 'correct') {
            return `<span class="correct-word">${entry.text}</span>`;
        } else if (entry.type === 'mistake') {
            return `<span class="mistake-word">${entry.text}</span>`;
        } else if (entry.type === 'wrong') {
            return `<span class="incorrect-word">${entry.text}</span>`;
        } else if (entry.type === 'missing') {
            return `<span class="missing-word">${entry.text}</span>`;
        }
        return entry.text;
    }).join(' ');
}

// Submit transcription
async function submitTranscription() {
    // If in "Try again" state
    if (submitButton.classList.contains('try-again-button')) {
        // Reset to last transcription
        transcriptionInput.value = lastTranscription;
        statsContent.innerHTML = '';
        resetSubmitButton();
        // Show textarea, hide result
        transcriptionInput.style.display = '';
        document.getElementById('result-container').style.display = 'none';
        return;
    }

    const userTranscription = transcriptionInput.value.trim();
    
    if (!userTranscription) {
        alert('Please enter your transcription');
        return;
    }
    
    if (!currentVideoId) {
        alert('No video selected');
        return;
    }
    
    try {
        // Show loading state
        submitButton.disabled = true;
        submitButton.textContent = 'Validating...';
        
        const response = await fetch('/api/validate-transcription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                video_id: currentVideoId,
                user_transcription: userTranscription
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to validate transcription');
        }
        
        const data = await response.json();
        
        // Store the current transcription before showing results
        lastTranscription = userTranscription;
        
        // Render merged color-coded result
        if (data.results) {
            const html = renderResult(data.results);
            document.getElementById('result-container').innerHTML = html;
            document.getElementById('result-container').style.display = '';
            transcriptionInput.style.display = 'none';
        }
        
        // Update stats
        updateStats(data);
        
        // Change button to "Try again" state
        submitButton.textContent = 'Try again';
        submitButton.classList.remove('btn-primary');
        submitButton.classList.add('try-again-button');
        submitButton.style.backgroundColor = '#fff3cd'; // light yellow
        submitButton.style.borderColor = '#ffeeba';
        submitButton.style.color = '#856404';
        
    } catch (error) {
        console.error('Error validating transcription:', error);
        alert(`Failed to validate transcription: ${error.message}`);
    } finally {
        submitButton.disabled = false;
    }
}

// Handle play/stop button click
function handlePlayStop() {
    if (!playerReady || !youtubePlayer) return;

    const playerState = youtubePlayer.getPlayerState();
    
    if (playerState === YT.PlayerState.PLAYING) {
        youtubePlayer.pauseVideo();
        playStopButton.textContent = 'Play';
        playStopButton.classList.remove('playing');
    } else {
        youtubePlayer.playVideo();
        playStopButton.textContent = 'Stop';
        playStopButton.classList.add('playing');
    }
}

// Update play/stop button state based on player state
function updatePlayStopButton(playerState) {
    if (!playStopButton) return;
    
    if (playerState === YT.PlayerState.PLAYING) {
        playStopButton.textContent = 'Stop';
        playStopButton.classList.add('playing');
    } else if (playerState === YT.PlayerState.PAUSED || playerState === YT.PlayerState.ENDED) {
        playStopButton.textContent = 'Play';
        playStopButton.classList.remove('playing');
    }
}

// Add event listener for page refresh
window.addEventListener('beforeunload', () => {
    resetSubmitButton();
});

// Nova função para pré-carregar a transcrição antes de carregar o vídeo
async function preloadAndLoadVideo(videoId, title) {
    try {
        // Chama o backend para pré-carregar a transcrição
        const response = await fetch('/api/preload-transcript', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_id: videoId })
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            alert('Failed to preload transcript: ' + (data.error || 'Unknown error'));
            return;
        }
        // Só carrega o vídeo se a transcrição foi pré-carregada
        loadVideo(videoId, title);
    } catch (err) {
        alert('Failed to preload transcript: ' + err.message);
    }
}

// SPA Routing logic
function showHome() {
    history.pushState({}, '', '/');
    document.getElementById('video-and-transcription-section').style.display = 'none';
    // Opcional: Limpar vídeo/transcrição se quiser
}

function showWatch(videoId, title) {
    history.pushState({}, '', '/watch?v=' + videoId);
    document.getElementById('video-and-transcription-section').style.display = '';
    preloadAndLoadVideo(videoId, title);
}

// Clique na coruja ou no título
const owlLogo = document.getElementById('owl-logo');
const owlLogoLink = document.getElementById('owl-logo-link');
if (owlLogo) owlLogo.addEventListener('click', showHome);
if (owlLogoLink) owlLogoLink.addEventListener('click', function(e) { e.preventDefault(); showHome(); });
const siteTitle = document.getElementById('site-title');
if (siteTitle) siteTitle.addEventListener('click', showHome);

// Suporte ao botão voltar do navegador
window.addEventListener('popstate', function() {
    if (location.pathname === '/' || location.pathname === '/home') {
        showHome();
    } else if (location.pathname.startsWith('/watch')) {
        const params = new URLSearchParams(location.search);
        const videoId = params.get('v');
        if (videoId) showWatch(videoId, '');
    }
});
