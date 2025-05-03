import re
from typing import Dict, List, Tuple, Union
from app.services.transcription_correction import Word, TranscriptionComparerV4Pro

def normalize_text(text):
    text = re.sub(r'\[.*?\]', '', text)
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip().lower()
    return text

def validate_transcription(user_input: str, actual_transcript: str, timestamps: List[float] = None) -> List[Dict[str, str]]:
    """
    Validate user transcription against actual transcript with optional timestamps.
    If timestamps are not provided, words will be assumed to be evenly distributed.
    """
    if timestamps is None:
        # If no timestamps provided, create artificial ones spaced evenly
        words = actual_transcript.split()
        total_duration = len(words) / 2  # Assume average of 2 words per second
        timestamps = [i * (total_duration / len(words)) for i in range(len(words))]
    
    # Create list of Word objects for actual transcript
    actual_words = [Word(text=text, timestamp=ts, normalized=normalize_text(text)) for text, ts in zip(actual_transcript.split(), timestamps)]
    # Create list of Word objects for user input (timestamp 0.0, normalizado)
    user_words = [Word(text=w, timestamp=0.0, normalized=normalize_text(w)) for w in re.findall(r'\b\w+[\w\']*\b', user_input)]
    
    comparer = TranscriptionComparerV4Pro()
    return comparer.compare(user_words, actual_words)
