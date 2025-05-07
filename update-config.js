const fs = require('fs');
const path = require('path');

// Read the current config.js
const configPath = path.join(__dirname, 'config.js');
let configContent = fs.readFileSync(configPath, 'utf8');

// Update require('dotenv').config() to use config.env
configContent = configContent.replace(
  "require('dotenv').config()",
  "require('dotenv').config({ path: './config.env' })"
);

// Write the updated content back
fs.writeFileSync(configPath, configContent);

console.log('Updated config.js to use config.env');

// Also create a direct start script
const startScript = `
// Direct start script for the Node.js server
const { spawn } = require('child_process');
const path = require('path');

// Path to node executable
const nodePath = 'C:\\\\Users\\\\herbert.camargo\\\\Downloads\\\\node-v24.0.0-win-x64\\\\node.exe';
const serverPath = path.join(__dirname, 'server.js');

// Spawn node process with server.js
const nodeProcess = spawn(nodePath, [serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: 8080,
    NODE_ENV: 'development'
  }
});

nodeProcess.on('error', (err) => {
  console.error('Failed to start node process:', err);
});

console.log('Server started on port 8080');
`;

fs.writeFileSync(path.join(__dirname, 'start.js'), startScript);
console.log('Created start.js for direct server startup'); 