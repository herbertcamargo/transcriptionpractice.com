// Global variables
let currentVideoId = null;
let typingTimer = null;
let youtubePlayer = null;
let wasManuallyPaused = false;
let playerReady = false;
let pauseDelayActive = false;  // New flag to track if pause delay is active
let wavesurfer = null;
let currentLanguage = localStorage.getItem('preferredLanguage') || 'en'; // Default language is English
const TYPING_TIMEOUT = 2000; // 2 seconds
let lastTranscription = ''; // Store the last submitted transcription

// API Configuration - use relative paths to prevent domain issues
const API_PATHS = {
    transcript: '/api/transcript',
    flaskTranscript: '/transcript',
    diagnostic: '/diagnostic'
};

// Check if we need to use a different base URL for API calls
const BASE_API_URL = (window.location.hostname === 'transcriptionpractice.com') 
    ? 'http://localhost:8080' // If on production domain, connect to local server
    : ''; // Empty string for relative URLs when using localhost

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

// Remove all player overlay functions and make them do nothing
function createPlayerOverlay() { return null; }
function showPlayerOverlay() { return; }
function hidePlayerOverlay() { return; }

// Fix for div.canvases appearing over the player
function fixPlayerCanvases() {
    // Apply fixes to any existing canvases
    const canvases = document.querySelector('div.canvases');
    if (canvases) {
        canvases.style.position = 'relative';
        canvases.style.zIndex = '-1';
        canvases.style.pointerEvents = 'none';
        console.log('Fixed div.canvases layer');
    }
    
    // Set a mutation observer to handle dynamically added canvases
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node.classList && node.classList.contains('canvases')) {
                        node.style.position = 'relative';
                        node.style.zIndex = '-1';
                        node.style.pointerEvents = 'none';
                        console.log('Fixed dynamically added canvases');
                    }
                });
            }
        });
    });
    
    // Start observing the document with the configured parameters
    observer.observe(document.body, { childList: true, subtree: true });
}

// Run the fix when the page loads
document.addEventListener('DOMContentLoaded', fixPlayerCanvases);

// Also run the fix when a video is loaded
function ensurePlayerInteractivity() {
    // Ensure the player is fully interactive
    const playerElement = document.getElementById('video-player');
    if (playerElement && playerElement.querySelector('iframe')) {
        const iframe = playerElement.querySelector('iframe');
        iframe.style.pointerEvents = 'auto';
        iframe.style.zIndex = '10';
    }
    
    // Fix any canvases
    fixPlayerCanvases();
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

// Additional fix for YouTube iframe accessibility - ensure no elements block interaction
function makeYouTubeIframeAccessible() {
    // Find all YouTube iframes
    const iframes = document.querySelectorAll('iframe[src*="youtube.com"]');
    iframes.forEach(iframe => {
        // Make sure the iframe has high z-index and proper interaction
        iframe.style.position = 'relative';
        iframe.style.zIndex = '100';
        iframe.style.pointerEvents = 'auto';
        
        // Check for parent elements that might interfere and fix them
        let parent = iframe.parentElement;
        while (parent && parent !== document.body) {
            // Make sure parent doesn't block interaction
            const computedStyle = window.getComputedStyle(parent);
            if (computedStyle.pointerEvents === 'none') {
                parent.style.pointerEvents = 'auto';
            }
            
            // If div.canvases is among the parent elements, make sure it's behind
            if (parent.classList && parent.classList.contains('canvases')) {
                parent.style.zIndex = '-1';
                parent.style.pointerEvents = 'none';
            }
            
            parent = parent.parentElement;
        }
    });
}

// Add this fix to window load event
window.addEventListener('load', makeYouTubeIframeAccessible);

// YouTube API ready callback
window.onYouTubeIframeAPIReady = function() {
    console.log('YouTube API Ready');
    // Call our fix when YouTube API is ready
    setTimeout(makeYouTubeIframeAccessible, 1000); // Slight delay to ensure elements are loaded
};

// Event Listeners
if (searchButton) searchButton.addEventListener('click', searchVideos);
if (submitButton) submitButton.addEventListener('click', submitTranscription);
if (rewindButton) rewindButton.addEventListener('click', handleRewind);
if (playStopButton) playStopButton.addEventListener('click', handlePlayStop);
if (transcriptionInput) {
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
                console.log('Activating pause delay - pausing video.');
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
                    console.log('Resuming video.');
                    
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
}
if (searchInput) {
    searchInput.addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            searchVideos();
        }
    });
}

// Handle waveform click for seeking
const verticalWaveform = document.querySelector('.vertical-waveform');
if (verticalWaveform) {
    verticalWaveform.addEventListener('click', (e) => {
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
    verticalWaveform.addEventListener('mousemove', (e) => {
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
}

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
    submitButton.innerHTML = 'Submit Transcription';
    submitButton.disabled = false;
    initializeStats(); // Reset stats to default state
    // Limpa o resultado e mostra a caixa de transcrição
    document.getElementById('result-container').innerHTML = '';
    document.getElementById('result-container').style.display = 'none';
    transcriptionInput.style.display = '';
}

// Calculate text similarity percentage
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    // Normalize strings: lowercase, remove punctuation, excess spaces
    const normalize = (text) => {
        return text.toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    };
    
    const normalizedStr1 = normalize(str1);
    const normalizedStr2 = normalize(str2);
    
    // Convert to word arrays
    const words1 = normalizedStr1.split(' ');
    const words2 = normalizedStr2.split(' ');
    
    // Count matching words
    let matches = 0;
    for (const word of words1) {
        if (words2.includes(word)) {
            matches++;
            // Remove the word to prevent double counting
            const index = words2.indexOf(word);
            if (index > -1) {
                words2.splice(index, 1);
            }
        }
    }
    
    // Calculate similarity
    return matches / Math.max(words1.length, normalize(str2).split(' ').length);
}

// Calculate words per minute
function calculateWPM(text) {
    const wordCount = text.trim().split(/\s+/).length;
    const totalTimeInMinutes = (youtubePlayer && youtubePlayer.getDuration) 
        ? youtubePlayer.getDuration() / 60 
        : 1; // Default to 1 minute if duration is unknown
        
    return Math.round(wordCount / totalTimeInMinutes);
}

// Modify the loadVideo function to ensure zero interference with YouTube player
function loadVideo(videoId, title) {
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
    
    // Create new YouTube player with minimal options
    youtubePlayer = new YT.Player('video-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
            'playsinline': 1,
            'origin': window.location.origin
        },
        events: {
            'onReady': function(event) {
                youtubePlayer = event.target;
                playerReady = true;
                // Ensure the player is fully interactive after it's ready
                ensurePlayerInteractivity();
                // Set size after player is ready to ensure it's visible
                const iframe = event.target.getIframe();
                if (iframe) {
                    iframe.style.width = '100%';
                    iframe.style.height = '100%';
                    iframe.style.position = 'absolute';
                    iframe.style.top = '0';
                    iframe.style.left = '0';
                }
            },
            'onStateChange': function(event) {
                // Only update play/stop button state
                if (!playerReady) return;
                updatePlayStopButton(event.data);
                // Fix player canvases again in case they've been recreated
                fixPlayerCanvases();
            }
        }
    });
    
    // Reset transcription and button state
    transcriptionInput.value = '';
    lastTranscription = '';
    resetSubmitButton();
    
    // Show video section
    videoSection.classList.remove('d-none');
    resultsSection.classList.add('d-none');
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

// Simplify the preloadAndLoadVideo function to be synchronous
function preloadAndLoadVideo(videoId, title) {
    // Directly load the video without any async operations
    loadVideo(videoId, title);
}

// Render the results with differences highlighted
function renderResult(results) {
    const { userInput, actualTranscript, similarity } = results;
    
    // Function to escape HTML
    const escapeHtml = (text) => {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };
    
    // Get the result container
    const resultContainer = document.getElementById('result-container');
    
    // Create the HTML content
    let html = `
        <div class="result-header">
            <h5>Your transcription - ${similarity}% accuracy</h5>
        </div>
        <div class="transcription-comparison">
            <div class="user-transcription">
                <h6>Your Input:</h6>
                <p>${escapeHtml(userInput)}</p>
            </div>
            <div class="actual-transcription">
                <h6>Actual Transcript:</h6>
                <p>${escapeHtml(actualTranscript)}</p>
            </div>
        </div>
    `;
    
    // Update the result container
    resultContainer.innerHTML = html;
    
    // Change the submit button to "Try Again"
    submitButton.innerHTML = 'Try Again';
}

// Update the submitTranscription function to use relative URLs and prioritize Flask endpoint
async function submitTranscription() {
    if (!currentVideoId) {
        alert('No video selected');
        return;
    }

    const userInput = transcriptionInput.value.trim();
    if (!userInput) {
        alert('Please enter your transcription');
        return;
    }

    // Show loading state
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
    submitButton.disabled = true;

    try {
        // First, try the original Flask API endpoint which was working before
        let response = null;
        let data = null;
        let error = null;
        
        console.log("Attempting to fetch transcript from original Flask endpoint...");
        try {
            console.log(`Requesting: ${BASE_API_URL}${API_PATHS.flaskTranscript}?video_id=${currentVideoId}&language=${currentLanguage}`);
            // Use relative URL, not absolute, and include language
            response = await fetch(`${BASE_API_URL}${API_PATHS.flaskTranscript}?video_id=${currentVideoId}&language=${currentLanguage}`);
            console.log(`Flask endpoint response status: ${response.status}`);
            
            if (response.ok) {
                const contentType = response.headers.get('content-type');
                console.log(`Content-Type: ${contentType}`);
                
                if (contentType && contentType.indexOf('application/json') !== -1) {
                    data = await response.json();
                    if (data && data.transcript) {
                        console.log("Successfully retrieved transcript from Flask endpoint");
                        console.log(`Transcript language: ${data.language || 'not specified'}`);
                    } else {
                        console.warn("Flask endpoint returned JSON but no transcript data:", data);
                    }
                } else {
                    const text = await response.text();
                    console.warn("Flask endpoint returned non-JSON response:", text.substring(0, 100) + "...");
                }
            } else {
                console.warn(`Flask endpoint error: ${response.status} ${response.statusText}`);
                const text = await response.text();
                console.warn("Error response content:", text.substring(0, 100) + "...");
            }
        } catch (e) {
            console.error("Error with Flask endpoint:", e);
            error = e;
        }
        
        // If the Flask endpoint failed, try the Node.js endpoint
        if (!data || !data.transcript) {
            console.log("Flask endpoint failed, trying Node.js endpoint...");
            try {
                console.log(`Requesting: ${BASE_API_URL}${API_PATHS.transcript}?video_id=${currentVideoId}&language=${currentLanguage}`);
                // Use relative URL, not absolute, and include language
                response = await fetch(`${BASE_API_URL}${API_PATHS.transcript}?video_id=${currentVideoId}&language=${currentLanguage}`);
                console.log(`Node.js endpoint response status: ${response.status}`);
                
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    console.log(`Content-Type: ${contentType}`);
                    
                    if (contentType && contentType.indexOf('application/json') !== -1) {
                        data = await response.json();
                        if (data.success && data.transcript) {
                            console.log("Successfully retrieved transcript from Node.js endpoint");
                        } else {
                            console.warn("Node.js endpoint returned JSON but no transcript data:", data);
                        }
                    } else {
                        const text = await response.text();
                        console.warn("Node.js endpoint returned non-JSON response:", text.substring(0, 100) + "...");
                    }
                } else {
                    console.warn(`Node.js endpoint error: ${response.status} ${response.statusText}`);
                    const text = await response.text();
                    console.warn("Error response content:", text.substring(0, 100) + "...");
                }
            } catch (e) {
                console.error("Error with Node.js endpoint:", e);
                error = error || e;
            }
        }
        
        // Let's try a simple diagnostic check if both endpoints failed
        if (!data || !data.transcript) {
            console.log("Both transcript endpoints failed, checking diagnostic endpoint...");
            try {
                const diagResponse = await fetch(`${BASE_API_URL}${API_PATHS.diagnostic}`);
                if (diagResponse.ok) {
                    const diagData = await diagResponse.json();
                    console.log("Diagnostic endpoint succeeded. Server is running, but transcript endpoints are failing:", diagData);
                } else {
                    console.error("Diagnostic endpoint also failed. Server may not be running correctly.");
                }
            } catch (diagError) {
                console.error("Failed to reach diagnostic endpoint:", diagError);
                console.error("Network connectivity issue or server not running at all.");
                
                // Add a helpful message about starting the server
                if (window.location.hostname === 'transcriptionpractice.com') {
                    console.error("You're on the production site but the local server isn't running.");
                    console.error("Please run the local server with: run-server-improved.cmd");
                } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.error("You're on localhost but the server isn't responding.");
                    console.error("Please make sure the server is running on port 8080");
                    console.error("Run the server check with: check-server-status.cmd");
                }
            }
        }
        
        // Extract the transcript from whichever endpoint succeeded
        let actualTranscript = null;
        if (data) {
            // Handle both formats - Flask returns {transcript: ...}, Node returns {success: true, transcript: ...}
            actualTranscript = data.transcript;
        }
        
        // If both endpoints failed, alert the user - we don't want demo transcripts
        if (!actualTranscript) {
            console.error("Failed to retrieve transcript from either endpoint");
            
            // Create a more helpful error message
            let errorMsg = "Failed to retrieve transcript. ";
            
            if (window.location.hostname === 'transcriptionpractice.com') {
                errorMsg += "The local server needs to be running on your computer.\n\n" +
                          "Please run the server with run-server-improved.cmd and try again.";
            } else {
                errorMsg += "Please check the console for details and ensure the server is running properly.";
            }
            
            throw new Error(errorMsg);
        }
        
        // We now have an actual transcript
        lastTranscription = userInput; // Save for potential reuse
        
        // Calculate similarity
        const similarity = calculateSimilarity(userInput, actualTranscript);
        const formattedSimilarity = (similarity * 100).toFixed(2);
        
        // Update stats
        updateStats({
            wpm: calculateWPM(userInput),
            similarity: formattedSimilarity
        });
        
        // Render the result with difference highlighting
        renderResult({
            userInput: userInput,
            actualTranscript: actualTranscript,
            similarity: formattedSimilarity
        });
        
        // Show result container
        document.getElementById('result-container').style.display = 'block';
        
    } catch (finalError) {
        console.error('Fatal error in transcription processing:', finalError);
        alert(`Error: ${finalError.message}\n\nPlease check that the server is running and try again.`);
    } finally {
        // Reset button state
        resetSubmitButton();
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

function showHomeUser() {
    history.pushState({}, '', '/home-user');
    showSearchContent();
}

function showSearchContent() {
    // Exibe a área de busca e esconde cards de teste/plano
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer) {
        Array.from(searchContainer.children).forEach(child => {
            child.classList.remove('d-none');
        });
    }
    const homeTestsContainer = document.getElementById('home-tests-container');
    if (homeTestsContainer) homeTestsContainer.style.display = 'none';
    const plansBox = document.getElementById('plans-box');
    if (plansBox) plansBox.style.display = 'none';
    document.getElementById('video-and-transcription-section').style.display = 'none';
}

// Função para esconder a barra de pesquisa completamente
function hideSearchBar() {
    // Oculta diretamente o card de busca (contém a .card-header e .card-body)
    const searchCard = document.querySelector('.card.mb-4');
    if (searchCard) {
        searchCard.style.display = 'none';
    }
}

function showPlansBox() {
    let plansBox = document.getElementById('plans-box');
    if (!plansBox) {
        plansBox = document.createElement('div');
        plansBox.id = 'plans-box';
        plansBox.className = 'plans-section mt-5 mb-5'; // Margem superior e inferior
        const main = document.querySelector('main') || document.querySelector('.main-content') || document.body;
        main.appendChild(plansBox);
    }
    plansBox.innerHTML = `
        <div style="background:#8a9bac;border:5px solid #fff;border-radius:32px;margin:24px auto;max-width:900px;width:90vw;min-width:320px;padding:32px 16px 24px 16px;text-align:center;color:#fff;font-size:1.6rem;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
            <div style="font-size:2.4rem;font-weight:500;margin-bottom:12px;letter-spacing:0.04em;display:flex;align-items:center;justify-content:center;">
                <span style="flex:1;border-top:3px solid #fff;margin-right:16px;"></span>
                <span style="flex:0 0 auto;padding:0 16px;">Plans</span>
                <span style="flex:1;border-top:3px solid #fff;margin-left:16px;"></span>
            </div>
            <div style="margin-bottom:24px;">Make unlimited vídeo transcriptions with our tool for $9.99/month. <b><a href='/plans' style='color:#fff;text-decoration:underline;font-weight:600;'>Sign!</a></b></div>
            <div><b><a href='/plans' style='color:#fff;text-decoration:underline;font-weight:600;'>Cancel</a></b> the plan whenever you want!</div>
        </div>
    `;
    plansBox.style.display = '';
}

function hidePlansBox() {
    const plansBox = document.getElementById('plans-box');
    if (plansBox) {
        plansBox.style.display = 'none';
    }
}

function showHomeContent() {
    // Parar o vídeo quando navegar para a página home
    stopVideoPlayback();
    
    // Esconde a área de busca e exibe cards de teste/plano
    hideSearchBar();
    document.getElementById('video-and-transcription-section').style.display = 'none';
    
    const homeTestsContainerId = 'home-tests-container';
    let homeTestsContainer = document.getElementById(homeTestsContainerId);
    if (!homeTestsContainer) {
        homeTestsContainer = document.createElement('div');
        homeTestsContainer.id = homeTestsContainerId;
        homeTestsContainer.className = 'row justify-content-center my-4';
        const main = document.querySelector('main') || document.querySelector('.main-content') || document.body;
        main.appendChild(homeTestsContainer);
    }
    homeTestsContainer.innerHTML = '';
    const testVideos = [
        { num: 1, title: 'Test Video 1', thumb: 'https://img.youtube.com/vi/h2rR77VsF5c/hqdefault.jpg', route: '/test-1' },
        { num: 2, title: 'Test Video 2', thumb: 'https://img.youtube.com/vi/27p8Eup4KQU/hqdefault.jpg', route: '/test-2' },
        { num: 3, title: 'Test Video 3', thumb: 'https://img.youtube.com/vi/jFCFqjovH3s/hqdefault.jpg', route: '/test-3' }
    ];
    testVideos.forEach(video => {
        const col = document.createElement('div');
        col.className = 'col-md-4 mb-3';
        col.innerHTML = `
            <div class="card video-card h-100" style="cursor:pointer;">
                <img src="${video.thumb}" class="card-img-top video-thumbnail" alt="${video.title}">
                <div class="card-body text-center">
                    <h5 class="card-title">${video.title}</h5>
                </div>
            </div>
        `;
        col.addEventListener('click', () => {
            homeTestsContainer.innerHTML = '';
            homeTestsContainer.style.display = 'none';
            history.pushState({}, '', video.route);
            showTest(video.num);
        });
        homeTestsContainer.appendChild(col);
    });
    homeTestsContainer.style.display = '';
    
    // Exibe a seção de planos
    showPlansBox();
}

function showHome() {
    history.pushState({}, '', '/home');
    showHomeContent();
}

function showWatch(videoId, title) {
    // Se o vídeo atual for diferente do novo, pare o atual
    if (currentVideoId && currentVideoId !== videoId) {
        stopVideoPlayback();
    }
    
    history.pushState({}, '', '/watch?v=' + videoId);
    document.getElementById('video-and-transcription-section').style.display = '';
    preloadAndLoadVideo(videoId, title);
}

// NOVO: Lógica para rotas /test-1 e /test-2
function showTest(testNum) {
    // Parar qualquer vídeo que esteja tocando
    stopVideoPlayback();
    
    // Esconde barra de busca
    hideSearchBar();
    document.getElementById('video-and-transcription-section').style.display = '';
    let videoId, title;
    if (testNum === 1) {
        videoId = 'h2rR77VsF5c';
        title = 'Test Video 1';
    } else if (testNum === 2) {
        videoId = '27p8Eup4KQU';
        title = 'Test Video 2';
    } else if (testNum === 3) {
        videoId = 'jFCFqjovH3s';
        title = 'Test Video 3';
    }
    preloadAndLoadVideo(videoId, title);
}

// Clique na coruja ou no título
const owlLogo = document.getElementById('owl-logo');
const owlLogoLink = document.getElementById('owl-logo-link');
if (owlLogo) owlLogo.addEventListener('click', showHome);
if (owlLogoLink) owlLogoLink.addEventListener('click', function(e) { e.preventDefault(); showHome(); });
const siteTitle = document.getElementById('site-title');
if (siteTitle) siteTitle.addEventListener('click', showHome);

// Função para parar a reprodução do vídeo
function stopVideoPlayback() {
    if (youtubePlayer && youtubePlayer.pauseVideo) {
        youtubePlayer.pauseVideo();
        console.log('Video playback stopped due to navigation');
    }
}

// Adiciona event listeners aos links na barra superior
function setupNavLinks() {
    // Link para Plans
    const plansLink = document.getElementById('plans-link');
    if (plansLink) {
        plansLink.addEventListener('click', function(e) {
            e.preventDefault();
            // Parar o vídeo
            stopVideoPlayback();
            history.pushState({}, '', '/plans');
            // Esconder elementos conforme necessário
            hideSearchBar();
            document.getElementById('video-and-transcription-section').style.display = 'none';
            const homeTestsContainer = document.getElementById('home-tests-container');
            if (homeTestsContainer) homeTestsContainer.style.display = 'none';
            hidePlansBox();
        });
    }

    // Link para Login
    const loginLink = document.getElementById('login-link');
    if (loginLink) {
        loginLink.addEventListener('click', function(e) {
            e.preventDefault();
            // Parar o vídeo
            stopVideoPlayback();
            history.pushState({}, '', '/login');
            // Esconder elementos conforme necessário
            hideSearchBar();
            document.getElementById('video-and-transcription-section').style.display = 'none';
            const homeTestsContainer = document.getElementById('home-tests-container');
            if (homeTestsContainer) homeTestsContainer.style.display = 'none';
            // Exibir a caixa de planos na página de login
            showPlansBox();
        });
    }
}

// SPA Routing logic
window.addEventListener('popstate', function() {
    // Parar o vídeo quando o usuário navega usando os botões do navegador
    stopVideoPlayback();
    
    if (location.pathname === '/' || 
        location.pathname === '/home' || 
        location.pathname === '/test-1' || 
        location.pathname === '/test-2' || 
        location.pathname === '/test-3' || 
        location.pathname === '/plans' || 
        location.pathname === '/login') {
        
        // Esconde a barra de pesquisa em todas as rotas protegidas
        hideSearchBar();
    }
    
    // Esconde a caixa de planos por padrão
    hidePlansBox();
    
    if (location.pathname === '/' || location.pathname === '/home') {
        showHomeContent();
    } else if (location.pathname === '/home-user') {
        showSearchContent();
    } else if (location.pathname === '/login') {
        // Exibe a caixa de planos na página de login
        showPlansBox();
        document.getElementById('video-and-transcription-section').style.display = 'none';
    } else if (location.pathname.startsWith('/watch')) {
        const params = new URLSearchParams(location.search);
        const videoId = params.get('v');
        if (videoId) showWatch(videoId, '');
    } else if (['/test-1', '/test-2', '/test-3', '/plans'].includes(location.pathname)) {
        hideSearchBar();
        document.getElementById('video-and-transcription-section').style.display = 'none';
        const homeTestsContainer = document.getElementById('home-tests-container');
        if (homeTestsContainer) homeTestsContainer.style.display = 'none';
        
        // Exibe o conteúdo específico se for teste
        if (location.pathname === '/test-1') showTest(1);
        if (location.pathname === '/test-2') showTest(2);
        if (location.pathname === '/test-3') showTest(3);
    }
});

window.addEventListener('DOMContentLoaded', function() {
    // Configurar o seletor de idiomas
    setupLanguageSelector();
    
    // Configurar links de navegação na barra superior
    setupNavLinks();
    
    // Esconde a barra de pesquisa em todas as rotas protegidas
    if (location.pathname === '/' || 
        location.pathname === '/home' || 
        location.pathname === '/test-1' || 
        location.pathname === '/test-2' || 
        location.pathname === '/test-3' || 
        location.pathname === '/plans' || 
        location.pathname === '/login') {
        
        hideSearchBar();
    }
    
    // Esconde a caixa de planos por padrão
    hidePlansBox();
    
    if (location.pathname === '/' || location.pathname === '/home') {
        showHomeContent();
    } else if (location.pathname === '/home-user') {
        showSearchContent();
    } else if (location.pathname === '/login') {
        // Exibe a caixa de planos na página de login
        showPlansBox();
        document.getElementById('video-and-transcription-section').style.display = 'none';
    } else if (['/test-1', '/test-2', '/test-3', '/plans'].includes(location.pathname)) {
        hideSearchBar();
        document.getElementById('video-and-transcription-section').style.display = 'none';
        const homeTestsContainer = document.getElementById('home-tests-container');
        if (homeTestsContainer) homeTestsContainer.style.display = 'none';
        
        // Exibe o conteúdo específico se for teste
        if (location.pathname === '/test-1') showTest(1);
        if (location.pathname === '/test-2') showTest(2);
        if (location.pathname === '/test-3') showTest(3);
    }
});

// Adicionar função para gerenciar idiomas
function setupLanguageSelector() {
    // Definir o idioma armazenado como inicial
    const dropdownToggle = document.querySelector('#languageDropdown');
    if (dropdownToggle) {
        dropdownToggle.textContent = currentLanguage.toUpperCase();
    }
    
    // Adicionar event listeners para os itens do dropdown
    const languageItems = document.querySelectorAll('.dropdown-item[data-lang]');
    languageItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Atualizar idioma atual
            const newLang = this.getAttribute('data-lang');
            currentLanguage = newLang;
            
            // Salvar preferência no localStorage
            localStorage.setItem('preferredLanguage', newLang);
            
            // Atualizar texto do dropdown
            if (dropdownToggle) {
                dropdownToggle.textContent = newLang.toUpperCase();
            }
            
            // Atualizar classes active
            languageItems.forEach(langItem => {
                if (langItem.getAttribute('data-lang') === newLang) {
                    langItem.classList.add('active');
                } else {
                    langItem.classList.remove('active');
                }
            });
            
            // Aqui podemos adicionar tradução de textos da interface
            // updateUILanguage(newLang);
        });
    });
}

// Server status indicator
function checkServerStatus() {
    const indicator = document.getElementById('server-status-indicator');
    const statusText = document.getElementById('server-status-text');
    
    if (!indicator || !statusText) return;
    
    // Set to checking state
    indicator.className = 'server-status-dot checking';
    statusText.textContent = 'Checking server...';
    
    fetch(`${BASE_API_URL}${API_PATHS.diagnostic}`)
        .then(response => {
            if (response.ok) {
                indicator.className = 'server-status-dot online';
                statusText.textContent = 'Server Online';
            } else {
                indicator.className = 'server-status-dot offline';
                statusText.textContent = 'Server Error';
            }
        })
        .catch(error => {
            indicator.className = 'server-status-dot offline';
            statusText.textContent = 'Server Offline';
            console.warn('Server status check failed:', error);
        });
}

// Check server status on page load and every 30 seconds
document.addEventListener('DOMContentLoaded', () => {
    checkServerStatus();
    setInterval(checkServerStatus, 30000);
});
