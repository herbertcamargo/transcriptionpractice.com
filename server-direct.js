/**
 * Direct server implementation that doesn't require configuration files
 * Run with: C:\Users\herbert.camargo\Downloads\node-v24.0.0-win-x64\node.exe server-direct.js
 */

// Core modules
const express = require('express');
const cors = require('cors');
const path = require('path');
const { YoutubeTranscript } = require('youtube-transcript');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Create the express app
const app = express();
const PORT = 8080;

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

// Rate limiting to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
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
    console.log(`Fetching transcript for video: ${videoId}`);
    
    // Get transcription using youtube-transcript package
    const transcript = await YoutubeTranscript.fetchTranscript(videoId)
      .catch(error => {
        console.error('YouTube transcript error:', error);
        throw new Error('Failed to fetch transcript from YouTube');
      });
    
    if (!transcript || transcript.length === 0) {
      return res.status(404).json({ success: false, error: 'No transcript found for this video' });
    }
    
    // Join all the text segments
    const rawText = transcript.map(item => item.text).join(' ');
    
    // Clean up the transcript (remove [Music], [Applause], etc)
    const cleanedText = rawText.replace(/\[\s*(music|applause|laughter|noise|crowd cheering|cheering|silence)\s*\]/gi, '');
    
    return res.json({
      success: true,
      transcript: cleanedText.trim(),
      language: 'en'
    });
  } catch (error) {
    console.error('Transcript error:', error);
    
    // Make sure to always return a JSON response, never HTML
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch transcript',
      details: error.toString()
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`==============================================`);
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`==============================================`);
  console.log(`Test by opening this URL in your browser: http://localhost:${PORT}`);
  console.log(`To get a transcript, use: http://localhost:${PORT}/api/transcript?video_id=YOUR_VIDEO_ID`);
}); 