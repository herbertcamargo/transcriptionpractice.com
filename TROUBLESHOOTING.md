# Transcription API Troubleshooting Guide

This guide will help you diagnose and fix issues with the transcription service.

## Common Problems and Solutions

### 1. 404 Errors When Trying to Submit Transcriptions

If you're seeing 404 errors when submitting transcriptions, it usually means the API server is not running or not accessible.

#### Check if the server is running:
1. Open a command prompt and run the improved server script:
   ```
   run-server-improved.cmd
   ```
2. Look for any error messages in the console.
3. Make sure you see "Server is running on http://localhost:8080" message.

#### Use the diagnostic tool:
1. With the server running, visit http://localhost:8080/diagnostics in your browser
2. Run the tests to see which endpoints are working and which are failing

### 2. "Unexpected token '<', "<!doctype "... is not valid JSON" Error

This error typically happens when:
- The API server is returning HTML instead of JSON
- There's a proxy or web server configuration issue
- CORS issues are preventing the correct response

#### Solutions:
1. Check if you're using absolute URLs in your code (like http://localhost:8080/api/transcript)
2. Replace absolute URLs with relative ones (/api/transcript)
3. Make sure your server CORS settings are correct in server-direct.js
4. Try accessing the API endpoint directly in the browser to see the raw response

### 3. Server Startup Issues

If the server won't start:

#### Check Node.js installation:
1. Open a command prompt and run `node -v`
2. Make sure the version is compatible (v14 or higher)
3. If not installed or not in PATH, update the server scripts with the correct path

#### Check dependencies:
1. Run `npm install` to make sure all dependencies are installed
2. Check the console for any error messages during npm install
3. Make sure you have internet access to download packages

### 4. Browser Console Errors

Always check the browser console (F12) for detailed error messages. Look for:
- Network request failures (red entries)
- JavaScript errors
- CORS errors (look for messages about "Access-Control-Allow-Origin")

## Testing and Validation

### Test the API Endpoints Directly:

1. Test the Flask-compatible endpoint:
   ```
   http://localhost:8080/transcript?video_id=Ks-_Mh1QhMc
   ```

2. Test the Node.js endpoint:
   ```
   http://localhost:8080/api/transcript?video_id=Ks-_Mh1QhMc
   ```

3. Test the diagnostic endpoint:
   ```
   http://localhost:8080/diagnostic
   ```

### Using curl for API testing:

```bash
curl -X GET "http://localhost:8080/api/transcript?video_id=Ks-_Mh1QhMc"
```

```bash
curl -X GET "http://localhost:8080/network-test"
```

## Common Error Codes

- **404 (Not Found)**: The endpoint doesn't exist or the server isn't running
- **500 (Internal Server Error)**: Server code crashed or encountered an error
- **400 (Bad Request)**: Missing required parameters (like video_id)
- **403 (Forbidden)**: CORS or permissions issue
- **429 (Too Many Requests)**: Rate limiting is active

## Server Logs

Check the server console for detailed logs of what's happening on the server side. Look for:
- Incoming requests being logged
- Error messages 
- Warnings about missing dependencies

## Network Issues

1. Make sure no firewall is blocking port 8080
2. If behind a corporate network, check if API calls are allowed
3. Try using a different port if 8080 is blocked (edit PORT in server-direct.js)

## Getting Help

If you've tried everything in this guide and still have issues:

1. Take screenshots of the error messages
2. Note down the steps you've already tried
3. Gather server logs and browser console output
4. Contact the development team with all this information 