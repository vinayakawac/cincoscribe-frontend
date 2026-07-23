"""
backends/__init__.py — Engine registry and backend provider functions.
"""

from backends.cincoscribe_tts_backend import CincoScribeTTSBackend

_BACKEND_REGISTRY = {
    "chatterbox": CincoScribeTTSBackend(),
}


def get_tts_backend_for_engine(engine_name: str = "chatterbox") -> CincoScribeTTSBackend:
    """Retrieve singleton TTS backend instance by engine name."""
    key = str(engine_name or "chatterbox").strip().lower()
    return _BACKEND_REGISTRY.get(key, _BACKEND_REGISTRY["chatterbox"])


__all__ = [
    "CincoScribeTTSBackend",
    "get_tts_backend_for_engine",
]
