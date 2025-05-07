# Transcription Practice - Quick Start Guide

Welcome to Transcription Practice! This tool helps you practice transcribing YouTube videos and get feedback on your accuracy.

## Setup Instructions

### 1. Starting the Server

The application requires a local Node.js server to fetch transcripts from YouTube. Follow these steps:

1. Make sure you have Node.js installed on your computer
2. Open a command prompt in the application folder
3. Run `run-server-improved.cmd` to start the server
4. Check that the server status indicator in the top right shows "Server Online"

If you're having trouble:
- Run `check-server-status.cmd` to diagnose server issues
- Make sure no firewall is blocking port 8080
- Check that all dependencies are installed

### 2. Using the Application

Once the server is running:

1. **Search for a Video**: Enter keywords or a YouTube URL in the search box
2. **Watch the Video**: The video will play in the player
3. **Type your Transcription**: Listen to the video and type what you hear
4. **Submit**: Click the "Submit Transcription" button to check your accuracy
5. **Review Results**: See how your transcription compares to the actual transcript

### 3. Useful Features

- **Pause Delay**: Set how long to pause the video when you start typing
- **Rewind Time**: Set how far to rewind when resuming playback
- **Play/Stop Button**: Control video playback
- **Rewind Button**: Quickly rewind the video by the specified amount

### 4. Server Status Indicator

The top bar includes a status indicator showing the server status:
- 🟢 **Green**: Server is online and working
- 🔴 **Red**: Server is offline or unreachable
- 🟠 **Yellow/Pulsing**: Checking server status

If the indicator shows red, you'll need to run the server to use the transcription features.

## Troubleshooting

If you're experiencing issues:

1. **404 Errors**: Make sure the server is running with `run-server-improved.cmd`
2. **Video Player Issues**: Try refreshing the page
3. **Transcription Not Working**: Check the server status indicator
4. **Language Issues**: The system will try to fetch transcripts in your selected language, but may fall back to English if not available

For more detailed troubleshooting, see `TROUBLESHOOTING.md`. 