# YouTube Transcription Practice Application

A web application that helps users practice language skills by transcribing YouTube videos and receiving immediate feedback on their transcription accuracy.

## Features

- Search for YouTube videos by keywords
- Watch videos within the embedded player
- Transcribe video content in a dedicated textbox
- Submit transcriptions for validation
- Receive feedback with highlighted correct/incorrect words
- Compare user transcription with actual transcript

## Tech Stack

- **Backend**: Python/Flask
- **Frontend**: HTML, CSS, JavaScript
- **APIs**: YouTube Data API
- **Testing**: Pytest

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd youtube-transcription-practice
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```
   cp .env.example .env
   ```
   Edit the `.env` file and add your YouTube API key.

## Usage

1. Start the application:
   ```
   python app.py
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

3. Use the search box to find videos
4. Select a video to watch
5. Transcribe the audio content in the textbox
6. Submit your transcription for feedback

## API Endpoints

- `POST /api/search-videos`: Search for YouTube videos
  - Request: `{ "query": "search terms" }`
  - Response: `{ "videos": [{ "id": "...", "title": "...", "thumbnail": "..." }] }`

- `GET /api/video-details/{video_id}`: Get details for a specific video
  - Response: `{ "video_id": "...", "title": "...", "embed_url": "..." }`

- `GET /api/transcript/{video_id}`: Get transcript for a video
  - Response: `{ "transcript": "..." }`

- `POST /api/validate-transcription`: Validate user's transcription
  - Request: `{ "video_id": "...", "user_transcription": "..." }`
  - Response: `{ "user_transcription": "...", "actual_transcript": "...", "results": [{ "word": "...", "correct": true/false }] }`

## Development

### Running Tests

```
pytest
```

### Environment Configuration

- `YOUTUBE_API_KEY`: Your YouTube Data API key (required)
- `SECRET_KEY`: Flask secret key for session security
- `FLASK_ENV`: Application environment (development, testing, production)

## License

[MIT License](LICENSE)

## Notes

This application requires a valid YouTube API key with access to the YouTube Data API v3. You can obtain one from the [Google Cloud Console](https://console.cloud.google.com/). 