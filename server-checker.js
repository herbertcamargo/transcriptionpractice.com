/**
 * Server check script to diagnose transcript API issues
 * Run with: node server-checker.js
 */

const http = require('http');
const https = require('https');

// Configuration
const PORT = 8080;
const TEST_VIDEO_ID = 'Ks-_Mh1QhMc'; // TED Talk with reliable captions
const LANGUAGES = ['en', 'es']; // Languages to test

// Print header
console.log('=======================================');
console.log(' Transcription Server Status Checker');
console.log('=======================================');
console.log('\nChecking server status...');

// Test connection to local server
testLocalServer();

// Test connection to YouTube API (to ensure internet connectivity)
testYouTubeConnection();

// Function to test the local transcript server
function testLocalServer() {
  const options = {
    hostname: 'localhost',
    port: PORT,
    path: '/diagnostic',
    method: 'GET',
    timeout: 3000
  };

  const req = http.request(options, (res) => {
    console.log(`\n✅ Local server is running! Status code: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const diagnostic = JSON.parse(data);
        console.log(`Server type: ${diagnostic.serverType} ${diagnostic.serverVersion}`);
        console.log(`Server uptime: ${diagnostic.healthCheck?.uptime || 'unknown'}`);
        console.log('\nTesting transcript endpoints...');
        
        // Test both API endpoints with different languages
        LANGUAGES.forEach(lang => {
          testTranscriptEndpoint('/transcript', TEST_VIDEO_ID, lang);
          testTranscriptEndpoint('/api/transcript', TEST_VIDEO_ID, lang);
        });
      } catch (e) {
        console.log('Error parsing diagnostic data:', e.message);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`\n❌ ERROR: Server connection failed: ${e.message}`);
    console.log('\nPossible causes:');
    console.log('1. The server is not running. Start it with run-server-improved.cmd');
    console.log('2. The server is running on a different port (default is 8080)');
    console.log('3. There is a firewall blocking the connection');
    console.log('\nTo fix this:');
    console.log('1. Open a command prompt and run: run-server-improved.cmd');
    console.log('2. Check the console for any error messages');
    console.log('3. Verify the server starts successfully');
  });
  
  req.on('timeout', () => {
    req.destroy();
    console.error('\n❌ ERROR: Server connection timed out');
    console.log('The server might be running but responding very slowly');
  });

  req.end();
}

// Function to test individual transcript endpoints
function testTranscriptEndpoint(endpoint, videoId, language) {
  const options = {
    hostname: 'localhost',
    port: PORT,
    path: `${endpoint}?video_id=${videoId}&language=${language}`,
    method: 'GET',
    timeout: 10000 // 10 seconds timeout
  };

  console.log(`\nTesting ${endpoint} with language=${language}...`);
  
  const req = http.request(options, (res) => {
    console.log(`Status code: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (res.statusCode === 200 && (response.transcript || response.success)) {
          console.log(`✅ SUCCESS! Transcript received in ${response.language || 'unknown'} language`);
          console.log(`Transcript length: ${response.transcript.length} characters`);
          console.log(`First 50 characters: "${response.transcript.substring(0, 50)}..."`);
        } else {
          console.log(`❌ ERROR: ${response.error || 'Unknown error'}`);
          console.log('Full response:', response);
        }
      } catch (e) {
        console.log(`❌ ERROR: Invalid JSON response: ${e.message}`);
        console.log('Raw response:', data.substring(0, 200) + '...');
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ ERROR with ${endpoint}: ${e.message}`);
  });
  
  req.on('timeout', () => {
    req.destroy();
    console.error(`❌ ERROR: Request to ${endpoint} timed out`);
  });

  req.end();
}

// Test connection to YouTube API to check internet connectivity
function testYouTubeConnection() {
  console.log('\nTesting connection to YouTube API...');
  
  const options = {
    hostname: 'www.youtube.com',
    path: '/oembed?url=https://www.youtube.com/watch?v=' + TEST_VIDEO_ID + '&format=json',
    method: 'GET',
    timeout: 5000
  };

  const req = https.request(options, (res) => {
    console.log(`Status code: ${res.statusCode}`);
    
    if (res.statusCode === 200) {
      console.log('✅ YouTube API is accessible');
    } else {
      console.log('⚠️ YouTube API returned status code ' + res.statusCode);
    }
    
    // No need to read the body
    res.resume();
  });

  req.on('error', (e) => {
    console.error(`❌ ERROR connecting to YouTube API: ${e.message}`);
    console.log('This might indicate internet connectivity issues');
  });
  
  req.on('timeout', () => {
    req.destroy();
    console.error('❌ ERROR: YouTube API connection timed out');
  });

  req.end();
}

console.log('\nDone! Check the results above to diagnose any issues with your transcript API.');
console.log('If the server is not running, start it with run-server-improved.cmd'); 