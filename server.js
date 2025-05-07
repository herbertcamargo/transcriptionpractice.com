const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const { YoutubeTranscript } = require('youtube-transcript');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');

const app = express();
const PORT = config.port;

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'", "https://www.youtube.com", "https://unpkg.com", "https://cdn.jsdelivr.net"],
      "frame-src": ["'self'", "https://www.youtube.com"]
    }
  }
}));
app.use(compression());
app.use(cors());
app.use(express.json());

// Rate limiting to prevent abuse - use config based on environment
const apiLimiter = rateLimit({
  windowMs: config.settings.rateLimits.windowMs,
  max: config.settings.rateLimits.max,
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Serve static files
app.use('/static', express.static(path.join(__dirname, 'static')));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

// Transcript API endpoint
app.get('/api/transcript', async (req, res) => {
  const videoId = req.query.video_id;
  
  if (!videoId) {
    return res.status(400).json({ success: false, error: 'Video ID is required' });
  }

  try {
    // Check if caching is enabled and if we have a cached version
    if (config.settings.cache && config.settings.cache.enabled) {
      // Implement cache check here (for future enhancement)
    }

    // Get transcription using youtube-transcript package
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (!transcript || transcript.length === 0) {
      return res.status(404).json({ success: false, error: 'No transcript found for this video' });
    }
    
    // Join all the text segments
    const rawText = transcript.map(item => item.text).join(' ');
    
    // Clean up the transcript (remove [Music], [Applause], etc)
    const cleanedText = rawText.replace(/\[\s*(music|applause|laughter|noise|crowd cheering|cheering|silence)\s*\]/gi, '');
    
    // Store in cache if enabled (for future enhancement)
    if (config.settings.cache && config.settings.cache.enabled) {
      // Implement cache storage here
    }
    
    return res.json({
      success: true,
      transcript: cleanedText.trim(),
      language: 'en' // Note: this package might not provide language info, defaulting to 'en'
    });
  } catch (error) {
    console.error('Transcript error:', error);
    
    // Handle YouTube Transcript API errors more gracefully
    if (error.message && error.message.includes('Could not find any transcripts')) {
      return res.status(404).json({ success: false, error: 'No transcripts available for this video' });
    }
    
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch transcript' });
  }
});

// Cache API endpoint - for future implementation
app.get('/api/cache/:videoId', (req, res) => {
  // This would be implemented to store and retrieve cached transcripts
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Something went wrong!' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running in ${config.env} mode on http://localhost:${PORT}`);
}); 