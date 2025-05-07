/**
 * Test script to check if the server is running correctly
 * Run with: node test-server.js
 */

const http = require('http');

// Test the diagnostic endpoint
function testDiagnostic() {
  console.log('Testing /diagnostic endpoint...');
  
  const options = {
    hostname: 'localhost',
    port: 8080,
    path: '/diagnostic',
    method: 'GET',
  };

  const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('Diagnostic endpoint is working! Server is running correctly.');
        console.log('Response:', JSON.parse(data));
      } else {
        console.log('Diagnostic endpoint failed!');
      }
      
      // Test the transcript endpoint next
      testTranscript();
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with diagnostic request: ${e.message}`);
    console.log('The server might not be running. Please start the server first.');
  });

  req.end();
}

// Test the transcript endpoints
function testTranscript() {
  console.log('\nTesting transcript endpoints...');
  
  // Test video ID - use a known video with transcripts
  const videoId = 'Ks-_Mh1QhMc'; // TED Talk with reliable transcripts
  
  // Test both endpoints
  testEndpoint('/transcript', videoId);
  testEndpoint('/api/transcript', videoId);
}

function testEndpoint(path, videoId) {
  const options = {
    hostname: 'localhost',
    port: 8080,
    path: `${path}?video_id=${videoId}`,
    method: 'GET',
  };

  console.log(`Testing ${path} endpoint...`);
  
  const req = http.request(options, (res) => {
    console.log(`STATUS for ${path}: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        const response = JSON.parse(data);
        console.log(`${path} endpoint is working!`);
        console.log('Transcript available:', !!response.transcript);
        console.log('Transcript length:', response.transcript ? response.transcript.length : 'N/A');
      } else {
        console.log(`${path} endpoint failed with status ${res.statusCode}`);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with ${path} request: ${e.message}`);
  });

  req.end();
}

// Start the tests
testDiagnostic(); 