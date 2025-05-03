from flask import Flask, request, jsonify
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
import re
from dotenv import load_dotenv

load_dotenv()

def create_app():
    app = Flask(__name__)
    CORS(app)

    @app.route("/transcript", methods=["GET"])
    def get_transcript():
        video_id = request.args.get("video_id")

        try:
            # Tenta buscar a transcrição manual
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

            try:
                transcript = transcript_list.find_manually_created()
                lang = transcript.language_code
            except:
                transcript = transcript_list.find_generated_transcript(['en'])
                lang = transcript.language_code

            # Junta todas as frases
            raw_text = " ".join([line['text'] for line in transcript.fetch()])

            # 🔹 Remove etiquetas como [Music], [Applause], [Laughter], etc
            cleaned_text = re.sub(r"\[\s*(music|applause|laughter|noise|crowd cheering|cheering|silence)\s*\]", "", raw_text, flags=re.IGNORECASE)

            return jsonify({
                "success": True,
                "transcript": cleaned_text.strip(),
                "language": lang
            })

        except Exception as e:
            return jsonify({"success": False, "error": str(e)})

    return app
