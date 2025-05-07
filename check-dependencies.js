// Check dependencies and install missing ones
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Path to npm executable
const npmPath = 'C:\\Users\\herbert.camargo\\Downloads\\node-v24.0.0-win-x64\\npm.cmd';

// Required dependencies
const requiredDeps = [
  'express',
  'cors',
  'dotenv',
  'youtube-transcript',
  'compression',
  'helmet',
  'express-rate-limit'
];

// Check package.json
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.log('Creating package.json...');
  execSync(`"${npmPath}" init -y`, { stdio: 'inherit' });
}

// Install required dependencies
console.log('Checking and installing dependencies...');
for (const dep of requiredDeps) {
  try {
    require.resolve(dep);
    console.log(`✓ ${dep} is already installed`);
  } catch (e) {
    console.log(`Installing ${dep}...`);
    execSync(`"${npmPath}" install ${dep}`, { stdio: 'inherit' });
  }
}

console.log('All dependencies installed!');
console.log('Ready to run the server. Use "run-server.cmd" to start.'); 