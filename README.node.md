# Transcription Practice - Node.js Implementation

This is an improved implementation of the Transcription Practice application using Node.js.

## Improvements Over Python Implementation

- **Performance**: Node.js provides better performance for handling concurrent requests due to its non-blocking I/O model.
- **Security**: Added Helmet.js for HTTP security headers and rate limiting to prevent abuse.
- **Performance Optimization**: Added compression middleware to reduce payload size.
- **Modern JavaScript**: ES6+ features for cleaner, more maintainable code.
- **Better Error Handling**: Structured error handling with specific HTTP status codes.
- **Scalability**: Node.js is better suited for handling many simultaneous connections.

## Getting Started

### Prerequisites

- Node.js (version 18.0.0 or later)
- npm (usually comes with Node.js)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd transcriptionpractice.com
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=8080
   NODE_ENV=development
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. For production:
   ```
   npm start
   ```

## Usage

The application will be available at http://localhost:8080 (or the port you specified in your .env file).

## API Endpoints

- `GET /api/transcript?video_id=<youtube-video-id>`: Get the transcript for a YouTube video
- `GET /api/cache/:videoId`: Retrieve a cached transcript (not implemented yet)

## Migration from Python

This Node.js implementation replaces the Python Flask backend. The frontend HTML/CSS/JS has been updated to work with the new backend API.

## Contributing

Contributions are welcome. Please make sure to update tests as appropriate.

## License

[Add your license here] 