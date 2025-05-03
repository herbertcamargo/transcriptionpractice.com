import os
import re
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from flask import current_app
import requests
import youtube_transcript_api._api
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
import json

# Configuração do proxy Decodo
proxy_host = 'gate.decodo.com:10001'
proxy_user = 'spxue5efd5'
proxy_pass = 'zaPhlkz9_d9Z4P4xoH'

proxies = {
    'http': f'http://{proxy_user}:{proxy_pass}@{proxy_host}',
    'https': f'http://{proxy_user}:{proxy_pass}@{proxy_host}',
}

# Monkey patch para forçar o uso do proxy em todas as requisições do requests
original_request = requests.Session.request

def proxied_request(self, method, url, *args, **kwargs):
    kwargs['proxies'] = proxies
    return original_request(self, method, url, *args, **kwargs)

requests.Session.request = proxied_request

def get_youtube_client():
    api_key = current_app.config['YOUTUBE_API_KEY']
    return build('youtube', 'v3', developerKey=api_key)

def search_videos(query, max_results=10):
    youtube = get_youtube_client()
    
    try:
        search_response = youtube.search().list(
            q=query,
            part='snippet',
            maxResults=max_results,
            type='video'
        ).execute()
        
        videos = []
        for item in search_response.get('items', []):
            video_data = {
                'id': item['id']['videoId'],
                'title': item['snippet']['title'],
                'thumbnail': item['snippet']['thumbnails']['medium']['url'],
                'channel': item['snippet']['channelTitle'],
                'published_at': item['snippet']['publishedAt']
            }
            videos.append(video_data)
            
        return videos
    except HttpError as e:
        current_app.logger.error(f"YouTube API error: {str(e)}")
        raise Exception("Failed to search for videos")

def get_video_details(video_id):
    cache_dir = 'video_details_cache'
    os.makedirs(cache_dir, exist_ok=True)
    cache_file = os.path.join(cache_dir, f"{video_id}.json")

    # Tenta carregar do cache primeiro
    if os.path.exists(cache_file):
        with open(cache_file, 'r', encoding='utf-8') as f:
            cached_data = json.load(f)
            return cached_data

    youtube = get_youtube_client()

    try:
        video_response = youtube.videos().list(
            part='snippet,contentDetails',
            id=video_id
        ).execute()

        if not video_response.get('items'):
            raise Exception("Video not found")

        video = video_response['items'][0]

        video_data = {
            'video_id': video_id,
            'title': video['snippet']['title'],
            'channel': video['snippet']['channelTitle'],
            'description': video['snippet']['description'],
            'embed_url': f"https://www.youtube.com/embed/{video_id}",
            'duration': video['contentDetails']['duration']
        }

        # Salva no cache
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(video_data, f)

        return video_data

    except HttpError as e:
        current_app.logger.error(f"YouTube API error: {str(e)}")
        raise Exception("Failed to get video details")

def get_video_transcript(video_id, language_preference='en', debug_mode=True):
    """
    Get video transcript using the YouTube Transcript API.
    Returns a tuple of (text, timestamps) where timestamps is a list of start times for each word.
    
    Args:
        video_id (str): YouTube video ID
        language_preference (str): Preferred language for the transcript ('en', 'es', etc.)
        debug_mode (bool): If True, logs detailed debug information
    """
    import re
    import sys
    import os
    import json
    import traceback
    from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
    
    debug_info = []
    
    def log_debug(message):
        if debug_mode:
            print(message)
            debug_info.append(message)
    
    def process_transcript(transcript_data):
        transcript_text = ""
        timestamps = []
        
        for entry in transcript_data:
            line = entry['text']
            start_time = entry['start']
            
            # Filtrar linhas que são apenas indicações sonoras
            if re.match(r'^\[\s*(music|applause|laughter|noise|silence|crowd cheering|cheering)\s*\]$', line, re.IGNORECASE):
                transcript_text += "\n"
            else:
                words = line.split()
                for word in words:
                    transcript_text += word + " "
                    timestamps.append(start_time)
        
        return transcript_text.strip(), timestamps
    
    log_debug(f">>> INICIANDO BUSCA DE TRANSCRIÇÃO PARA VÍDEO {video_id} (Idioma preferido: {language_preference}) <<<")
    
    # VERIFICAÇÃO DE TRANSCRIÇÃO ARMAZENADA EM CACHE
    # Isso permite criar um sistema de cache de transcrições para desenvolvedores
    try:
        cache_dir = 'transcript_cache'
        os.makedirs(cache_dir, exist_ok=True)
        cache_file = os.path.join(cache_dir, f"{video_id}_{language_preference}.json")
        
        if os.path.exists(cache_file):
            log_debug(f"Cache encontrado para {video_id} no idioma {language_preference}")
            with open(cache_file, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
                return cache_data['transcript'], cache_data['timestamps']
        else:
            # Tenta cache genérico se não encontrar específico do idioma
            generic_cache_file = os.path.join(cache_dir, f"{video_id}.json")
            if os.path.exists(generic_cache_file):
                log_debug(f"Cache genérico encontrado para {video_id}")
                with open(generic_cache_file, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                    return cache_data['transcript'], cache_data['timestamps']
    except Exception as e:
        log_debug(f"Erro ao verificar cache: {str(e)}")
    
    # MÉTODO TEMPORÁRIO: SOLUCÃO DE COMPATIBILIDADE PARA PRODUÇÃO
    # Este método permite uso temporário mesmo quando não é possível obter transcrições
    # Em produção, se tudo falhar, gera uma transcrição fictícia para testes
    # IMPORTANTE: Remover após resolver os problemas de compatibilidade
    IS_PRODUCTION = os.environ.get('FLASK_ENV') == 'production'
    DEMO_MODE = os.environ.get('DEMO_MODE', 'false').lower() == 'true'
    
    if (IS_PRODUCTION or DEMO_MODE) and DEMO_MODE:
        log_debug("DEMO_MODE ativado: Usando transcrição de demonstração")
        
        # Transcrição fictícia para demonstração/testes
        dummy_transcript = "This is a dummy transcript for demonstration purposes. This allows users to practice transcription while technical issues are resolved. You can type this sentence to test the system functionality. Hopefully the real transcript functionality will be restored soon."
        dummy_timestamps = [i * 2 for i in range(len(dummy_transcript.split()))]
        
        return dummy_transcript, dummy_timestamps
    
    # MÉTODO 0: YouTube Data API direta sem depender de bibliotecas externas
    try:
        log_debug("Método 0: Tentando API direta do YouTube")
        youtube = get_youtube_client()
        
        # Solicitar as legendas através da API V3 do YouTube
        captions_response = youtube.captions().list(
            part="snippet",
            videoId=video_id
        ).execute()
        
        # Se encontrou legendas, sabemos que elas existem
        if 'items' in captions_response and captions_response['items']:
            log_debug(f"Método 0: {len(captions_response['items'])} legendas encontradas via API")
            has_captions = True
            # Mas não continuamos aqui, prosseguimos para outros métodos
        else:
            log_debug("Método 0: Nenhuma legenda encontrada via API")
            has_captions = False
    except Exception as e:
        log_debug(f"Método 0 falhou: {str(e)}")
        has_captions = None  # Não sabemos
    
    # MÉTODO SIMPLIFICADO PARA PRODUÇÃO
    # Este é um método mais simplificado que tenta apenas o essencial
    # Pode ter melhor compatibilidade com ambientes restritos
    try:
        log_debug("Método simplificado para produção")
        
        # Define a ordem de preferência de idiomas baseada na escolha do usuário
        if language_preference == 'en':
            languages_to_try = ['en', 'en-US', 'en-GB', 'en-CA', 'en-AU', '', 'en-IN', 'en-IE']
        elif language_preference == 'es':
            languages_to_try = ['es', 'es-ES', 'es-MX', 'es-AR', 'es-CO', '', 'es-US', 'es-CL']
        else:
            # Caso outros idiomas sejam adicionados no futuro, formato padrão
            languages_to_try = [language_preference, f"{language_preference}-*", '']
        
        log_debug(f"Ordem de preferência de idiomas: {languages_to_try}")
        
        transcript_results = {}
        found_preferred_language = False
        
        # Primeiro tenta obter todas as transcrições disponíveis
        try:
            available_transcripts = YouTubeTranscriptApi.list_transcripts(video_id)
            log_debug(f"Transcrições disponíveis: {[t.language_code for t in available_transcripts]}")
            
            # Procura por uma transcrição no idioma preferido ou próximo
            for lang_code in languages_to_try:
                if not lang_code:  # Pula string vazia
                    continue
                    
                has_wildcard = '*' in lang_code
                for transcript in available_transcripts:
                    current_lang = transcript.language_code
                    
                    # Verifica se é o idioma exato ou se corresponde a um padrão com wildcard
                    if current_lang == lang_code or (has_wildcard and current_lang.startswith(lang_code.replace('*', ''))):
                        log_debug(f"Encontrada transcrição no idioma preferido: {current_lang}")
                        transcript_data = transcript.fetch()
                        transcript_text, timestamps = process_transcript(transcript_data)
                        
                        # Armazena em cache para uso futuro
                        try:
                            cache_data = {
                                'transcript': transcript_text,
                                'timestamps': timestamps,
                                'language': current_lang
                            }
                            with open(cache_file, 'w', encoding='utf-8') as f:
                                json.dump(cache_data, f)
                            log_debug(f"Transcrição armazenada em cache (idioma: {current_lang})")
                        except Exception as cache_err:
                            log_debug(f"Não foi possível armazenar em cache: {str(cache_err)}")
                        
                        return transcript_text, timestamps
            
            # Se nenhum idioma preferido foi encontrado, prossiga com o método antigo
            log_debug("Nenhuma transcrição no idioma preferido encontrada")
            
        except Exception as e:
            log_debug(f"Falha ao listar transcrições disponíveis: {str(e)}")
        
        # Tenta o método antigo como fallback
        for lang in languages_to_try:
            try:
                if not lang:  # String vazia será tratada como padrão automático
                    lang_param = None
                    log_debug("Tentando idioma: padrão automático")
                else:
                    lang_param = [lang]
                    log_debug(f"Tentando idioma: {lang}")
                
                transcript_data = YouTubeTranscriptApi.get_transcript(
                    video_id, 
                    languages=lang_param
                )
                
                transcript_text, timestamps = process_transcript(transcript_data)
                log_debug(f"Sucesso com idioma {lang if lang else 'default'}")
                
                # Armazena em cache para uso futuro em desenvolvimento
                try:
                    cache_data = {
                        'transcript': transcript_text,
                        'timestamps': timestamps,
                        'language': lang if lang else 'default'
                    }
                    with open(cache_file, 'w', encoding='utf-8') as f:
                        json.dump(cache_data, f)
                    log_debug("Transcrição armazenada em cache")
                except Exception as cache_err:
                    log_debug(f"Não foi possível armazenar em cache: {str(cache_err)}")
                
                return transcript_text, timestamps
            except Exception as e:
                log_debug(f"Falha com idioma {lang if lang else 'default'}: {str(e)}")
    except Exception as e:
        log_debug(f"Método simplificado falhou: {str(e)}")
    
    # Se chegamos aqui e sabemos que há legendas (via API), informamos isso
    if has_captions:
        log_debug("Legendas existem, mas não conseguimos extrair")
        # Tenta criar uma transcrição fictícia baseada no título do vídeo
        try:
            youtube = get_youtube_client()
            video_response = youtube.videos().list(
                part='snippet',
                id=video_id
            ).execute()
            
            if 'items' in video_response and video_response['items']:
                title = video_response['items'][0]['snippet']['title']
                log_debug(f"Título do vídeo: {title}")
                return f"This video has captions, but they could not be retrieved. Video title: {title}", []
        except:
            pass
        
        return "This video has captions available, but they could not be retrieved. Please try a different video or access it directly on YouTube.", []
    
    # Informações de depuração para o ambiente de produção
    if debug_mode:
        try:
            from flask import current_app
            current_app.logger.error(f"FALHA DE TRANSCRIÇÃO PARA {video_id}: {' | '.join(debug_info)}")
        except:
            print("FALHA DE TRANSCRIÇÃO - Logs de depuração:")
            for line in debug_info:
                print(f"  > {line}")
    
    # Se tudo falhar, retorne uma mensagem clara
    log_debug("TODOS OS MÉTODOS FALHARAM")
    return "No transcript is available for this video. Please try a different video with captions.", []
