from typing import List, Dict
from dataclasses import dataclass
from difflib import SequenceMatcher
from app.services.transcription_equivalents import are_equivalent

@dataclass
class Word:
    text: str
    timestamp: float
    normalized: str = ""

class TranscriptionComparerV4Pro:
    def __init__(self, mistake_threshold: float = 0.75, window_size: int = 20, max_search: int = 200):
        self.mistake_threshold = mistake_threshold
        self.window_size = window_size
        self.max_search = max_search

    def compare(self, user_words: List[Word], actual_words: List[Word]) -> List[Dict[str, str]]:
        result = []
        user_idx = 0
        actual_idx = 0
        matched_once = False

        while user_idx < len(user_words) and actual_idx < len(actual_words):
            if are_equivalent(user_words[user_idx].normalized, actual_words[actual_idx].normalized):
                if not matched_once and actual_idx > 0:
                    for idx in range(actual_idx):
                        result.append({'text': actual_words[idx].text, 'type': 'missing'})
                matched_once = True
                result.append({'text': user_words[user_idx].text, 'type': 'correct'})
                user_idx += 1
                actual_idx += 1
                continue

            if self.is_mistake(user_words[user_idx].normalized, actual_words[actual_idx].normalized):
                if not matched_once and actual_idx > 0:
                    for idx in range(actual_idx):
                        result.append({'text': actual_words[idx].text, 'type': 'missing'})
                matched_once = True
                result.append({'text': user_words[user_idx].text, 'type': 'mistake'})
                user_idx += 1
                actual_idx += 1
                continue

            last_result_len = len(result)
            user_idx, actual_idx = self.realign_with_dubles(user_words, user_idx, actual_words, actual_idx, result, matched_once)

            if len(result) == last_result_len:
                result.append({'text': user_words[user_idx].text, 'type': 'wrong'})
                result.append({'text': actual_words[actual_idx].text, 'type': 'missing'})
                user_idx += 1
                actual_idx += 1

        while user_idx < len(user_words):
            result.append({'text': user_words[user_idx].text, 'type': 'wrong'})
            user_idx += 1

        while actual_idx < len(actual_words):
            result.append({'text': actual_words[actual_idx].text, 'type': 'missing'})
            actual_idx += 1

        return result

    def realign_with_dubles(self, user_words, user_start_idx, actual_words, actual_start_idx, result, matched_once):
        user_new_world = user_words[user_start_idx:]
        actual_target = actual_words[actual_start_idx:]

        user_dubles = self.generate_dubles(user_new_world)

        for user_offset, duble_user in enumerate(user_dubles):
            for window_start in range(0, min(len(actual_target), self.max_search), self.window_size):
                window_end = min(window_start + self.window_size, len(actual_target))
                window = actual_target[window_start:window_end]
                target_dubles = self.generate_dubles(window)

                for target_offset, duble_target in enumerate(target_dubles):
                    if self.are_dubles_equivalent(duble_user, duble_target):
                        full_target_start_idx = actual_start_idx + window_start + target_offset

                        if not matched_once and full_target_start_idx > 0:
                            for idx in range(actual_start_idx, full_target_start_idx):
                                result.append({'text': actual_words[idx].text, 'type': 'missing'})

                        self.fill_field_gaps(
                            user_words[user_start_idx:user_start_idx + user_offset],
                            actual_words[actual_start_idx:full_target_start_idx],
                            result
                        )

                        for w in duble_user:
                            result.append({'text': w.text, 'type': 'correct'})
                        return user_start_idx + user_offset + 2, full_target_start_idx + 2

        # fallback palavra a palavra
        user_idx, actual_idx = user_start_idx, actual_start_idx
        while user_idx < len(user_words) and actual_idx < len(actual_words):
            if are_equivalent(user_words[user_idx].normalized, actual_words[actual_idx].normalized):
                if not matched_once and actual_idx > 0:
                    for idx in range(actual_start_idx, actual_idx):
                        result.append({'text': actual_words[idx].text, 'type': 'missing'})
                result.append({'text': user_words[user_idx].text, 'type': 'correct'})
                return user_idx + 1, actual_idx + 1
            if self.is_mistake(user_words[user_idx].normalized, actual_words[actual_idx].normalized):
                if not matched_once and actual_idx > 0:
                    for idx in range(actual_start_idx, actual_idx):
                        result.append({'text': actual_words[idx].text, 'type': 'missing'})
                result.append({'text': user_words[user_idx].text, 'type': 'mistake'})
                return user_idx + 1, actual_idx + 1
            actual_idx += 1

        return user_start_idx, actual_start_idx

    def generate_dubles(self, words: List[Word]) -> List[List[Word]]:
        return [[words[i], words[i + 1]] for i in range(len(words) - 1)]

    def are_dubles_equivalent(self, duble1: List[Word], duble2: List[Word]) -> bool:
        return all(are_equivalent(w1.normalized, w2.normalized) for w1, w2 in zip(duble1, duble2))

    def fill_field_gaps(self, user_gap: List[Word], actual_gap: List[Word], result: List[Dict[str, str]]):
        user_used = [False] * len(user_gap)

        for aw in actual_gap:
            matched = False
            for i, uw in enumerate(user_gap):
                if not user_used[i] and are_equivalent(uw.normalized, aw.normalized):
                    result.append({'text': uw.text, 'type': 'correct'})
                    user_used[i] = True
                    matched = True
                    break
            if not matched:
                for i, uw in enumerate(user_gap):
                    if not user_used[i] and self.is_mistake(uw.normalized, aw.normalized):
                        result.append({'text': uw.text, 'type': 'mistake'})
                        user_used[i] = True
                        matched = True
                        break
            if not matched:
                result.append({'text': aw.text, 'type': 'missing'})

        for i, used in enumerate(user_used):
            if not used:
                result.append({'text': user_gap[i].text, 'type': 'wrong'})

    def is_mistake(self, user_norm: str, actual_norm: str) -> bool:
        return SequenceMatcher(None, user_norm, actual_norm).ratio() >= self.mistake_threshold