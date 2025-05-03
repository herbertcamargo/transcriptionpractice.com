from flask import jsonify, request
from app.api import youtube_bp
from app.services.youtube_service import search_videos, get_video_details, get_video_transcript
from app.services.transcription_service import validate_transcription
from collections import OrderedDict

# Cache LRU em memória para as últimas 1000 transcrições
CACHE_LIMIT = 1000
TRANSCRIPT_CACHE = OrderedDict()

def get_from_cache(video_id):
    if video_id in TRANSCRIPT_CACHE:
        TRANSCRIPT_CACHE.move_to_end(video_id)
        return TRANSCRIPT_CACHE[video_id]
    return None

def save_to_cache(video_id, transcript, timestamps):
    TRANSCRIPT_CACHE[video_id] = (transcript, timestamps)
    TRANSCRIPT_CACHE.move_to_end(video_id)
    if len(TRANSCRIPT_CACHE) > CACHE_LIMIT:
        TRANSCRIPT_CACHE.popitem(last=False)

@youtube_bp.route('/search-videos', methods=['POST'])
def search_videos_route():
    data = request.get_json()
    query = data.get('query')
    
    if not query:
        return jsonify({'error': 'Search query is required'}), 400
    
    try:
        videos = search_videos(query)
        return jsonify({'videos': videos})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@youtube_bp.route('/video-details/<video_id>', methods=['GET'])
def video_details_route(video_id):
    try:
        details = get_video_details(video_id)
        return jsonify(details)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@youtube_bp.route('/transcript/<video_id>', methods=['GET'])
def transcript_route(video_id):
    try:
        # Obter o idioma preferido do parâmetro da requisição, padrão é 'en'
        language_preference = request.args.get('language', 'en')
        transcript, timestamps = get_video_transcript(video_id, language_preference)
        return jsonify({
            'transcript': transcript,
            'timestamps': timestamps
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@youtube_bp.route('/preload-transcript', methods=['POST'])
def preload_transcript_route():
    data = request.get_json()
    video_id = data.get('video_id')
    language_preference = data.get('language', 'en')
    if not video_id:
        return jsonify({'error': 'Video ID is required'}), 400
    try:
        cached = get_from_cache(video_id)
        if cached:
            transcript, timestamps = cached
        else:
            transcript, timestamps = get_video_transcript(video_id, language_preference)
            save_to_cache(video_id, transcript, timestamps)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@youtube_bp.route('/validate-transcription', methods=['POST'])
def validate_transcription_route():
    data = request.get_json()
    video_id = data.get('video_id')
    user_transcription = data.get('user_transcription')
    language_preference = data.get('language', 'en')
    if not video_id or not user_transcription:
        return jsonify({'error': 'Video ID and user transcription are required'}), 400
    try:
        cached = get_from_cache(video_id)
        if cached:
            actual_transcript, timestamps = cached
        else:
            actual_transcript, timestamps = get_video_transcript(video_id, language_preference)
            save_to_cache(video_id, actual_transcript, timestamps)
        if isinstance(actual_transcript, str) and not timestamps:
            return jsonify({'error': actual_transcript}), 400
        results = validate_transcription(user_transcription, actual_transcript, timestamps)
        return jsonify({
            'user_transcription': user_transcription,
            'actual_transcript': actual_transcript,
            'results': results,
            'wpm_stats': {
                'total_words': len(actual_transcript.split()),
                'duration_minutes': timestamps[-1] / 60 if timestamps else 0
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500 