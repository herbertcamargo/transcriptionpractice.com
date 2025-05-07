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

// Configure CORS to allow requests from transcriptionpractice.com
const corsOptions = {
  origin: ['http://localhost:8080', 'https://transcriptionpractice.com', 'http://transcriptionpractice.com'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

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

// Add a diagnostic page route
app.get('/diagnostics', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'network-test.html'));
});

// Transcript API endpoint
app.get('/api/transcript', async (req, res) => {
  const videoId = req.query.video_id;
  const language = req.query.language || 'en';
  
  if (!videoId) {
    return res.status(400).json({ success: false, error: 'Video ID is required' });
  }

  try {
    console.log(`Fetching transcript for video: ${videoId}, preferred language: ${language}`);
    
    // Get transcription using youtube-transcript package
    let transcript;
    try {
      // First try with the requested language
      transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: language });
    } catch (langError) {
      console.log(`Couldn't find transcript in ${language}, trying with default language...`);
      try {
        // If that fails, try with English
        transcript = await YoutubeTranscript.fetchTranscript(videoId);
      } catch (defaultError) {
        console.error('YouTube transcript error:', defaultError);
        throw new Error('Failed to fetch transcript from YouTube in any language');
      }
    }
    
    if (!transcript || transcript.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No transcript found for this video',
        videoId: videoId,
        requestedLanguage: language
      });
    }
    
    // Join all the text segments
    const rawText = transcript.map(item => item.text).join(' ');
    
    // Clean up the transcript (remove [Music], [Applause], etc)
    const cleanedText = rawText.replace(/\[\s*(music|applause|laughter|noise|crowd cheering|cheering|silence)\s*\]/gi, '');
    
    return res.json({
      success: true,
      transcript: cleanedText.trim(),
      language: language,
      videoId: videoId
    });
  } catch (error) {
    console.error('Transcript error:', error);
    
    // Make sure to always return a JSON response, never HTML
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch transcript',
      details: error.toString(),
      videoId: videoId,
      requestedLanguage: language
    });
  }
});

// Add original Flask-compatible transcript endpoint for backwards compatibility
app.get('/transcript', async (req, res) => {
  const videoId = req.query.video_id;
  const language = req.query.language || 'en';
  
  if (!videoId) {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  try {
    console.log(`[Flask-compatible] Fetching transcript for video: ${videoId}, preferred language: ${language}`);
    
    // Get transcription using youtube-transcript package
    let transcript;
    try {
      // First try with the requested language
      transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: language });
    } catch (langError) {
      console.log(`Couldn't find transcript in ${language}, trying with default language...`);
      try {
        // If that fails, try with English
        transcript = await YoutubeTranscript.fetchTranscript(videoId);
      } catch (defaultError) {
        console.error('[Flask-compatible] YouTube transcript error:', defaultError);
        throw new Error('Failed to fetch transcript from YouTube in any language');
      }
    }
    
    if (!transcript || transcript.length === 0) {
      return res.status(404).json({ 
        error: 'No transcript found for this video',
        videoId: videoId,
        requestedLanguage: language
      });
    }
    
    // Join all the text segments
    const rawText = transcript.map(item => item.text).join(' ');
    
    // Clean up the transcript (remove [Music], [Applause], etc)
    const cleanedText = rawText.replace(/\[\s*(music|applause|laughter|noise|crowd cheering|cheering|silence)\s*\]/gi, '');
    
    // Return in Flask-compatible format (no success field)
    return res.json({
      transcript: cleanedText.trim(),
      timestamps: transcript.map(item => item.start),
      language: language
    });
  } catch (error) {
    console.error('[Flask-compatible] Transcript error:', error);
    
    // Return in Flask-compatible format
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch transcript',
      videoId: videoId,
      requestedLanguage: language
    });
  }
});

// Add enhanced diagnostic endpoints
app.get('/diagnostic', (req, res) => {
  // Get network interfaces
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  const ipAddresses = [];
  
  // Extract IP addresses
  Object.keys(networkInterfaces).forEach((interfaceName) => {
    const interfaces = networkInterfaces[interfaceName];
    interfaces.forEach((iface) => {
      // Skip internal and non-IPv4 addresses
      if (!iface.internal && iface.family === 'IPv4') {
        ipAddresses.push({
          interface: interfaceName,
          address: iface.address
        });
      }
    });
  });
  
  // Check for required dependencies
  let missingDependencies = [];
  try {
    require('express');
  } catch (e) {
    missingDependencies.push('express');
  }
  try {
    require('youtube-transcript');
  } catch (e) {
    missingDependencies.push('youtube-transcript');
  }
  
  // Basic system health check
  const healthCheck = {
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime() + ' seconds',
    cpuUsage: process.cpuUsage(),
    freeMemory: os.freemem() / (1024 * 1024) + ' MB',
    totalMemory: os.totalmem() / (1024 * 1024) + ' MB'
  };
  
  // Return comprehensive diagnostic information
  res.json({
    status: 'OK',
    serverTime: new Date().toISOString(),
    serverType: 'Node.js',
    serverVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    cwd: process.cwd(),
    env: process.env.NODE_ENV || 'development',
    networkInterfaces: ipAddresses,
    serverPort: PORT,
    healthCheck: healthCheck,
    dependencies: {
      missing: missingDependencies,
      status: missingDependencies.length === 0 ? 'OK' : 'MISSING'
    },
    endpoints: [
      { path: '/', method: 'GET', description: 'Serves the main HTML page' },
      { path: '/api/transcript', method: 'GET', description: 'Node.js API endpoint for transcripts' },
      { path: '/transcript', method: 'GET', description: 'Flask-compatible endpoint for transcripts' },
      { path: '/diagnostic', method: 'GET', description: 'This diagnostic endpoint' },
      { path: '/test-transcript', method: 'GET', description: 'Test endpoint for transcript format' },
      { path: '/network-test', method: 'GET', description: 'Network connectivity test endpoint' }
    ],
    howToTest: {
      mainPage: `http://localhost:${PORT}/`,
      apiTranscript: `http://localhost:${PORT}/api/transcript?video_id=Ks-_Mh1QhMc`,
      flaskTranscript: `http://localhost:${PORT}/transcript?video_id=Ks-_Mh1QhMc`
    }
  });
});

// Add a simple network test endpoint
app.get('/network-test', (req, res) => {
  res.json({
    success: true,
    message: 'If you can see this, your network connection to the server is working properly.',
    headers: req.headers,
    yourIp: req.ip,
    timestamp: new Date().toISOString()
  });
});

// Add a test endpoint for the original transcript format
app.get('/test-transcript', (req, res) => {
  res.json({
    transcript: "This is a test transcript from the Node.js server. If you can see this, the endpoint is working correctly.",
    timestamps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  });
});

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - Referrer: ${req.get('Referrer') || 'none'}`);
  next();
});

// Start the server
app.listen(PORT, () => {
  console.log(`==============================================`);
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`==============================================`);
  console.log(`Test by opening this URL in your browser: http://localhost:${PORT}`);
  console.log(`To get a transcript, use: http://localhost:${PORT}/api/transcript?video_id=YOUR_VIDEO_ID`);
}); 