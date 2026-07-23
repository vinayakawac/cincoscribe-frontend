"""
services/profiles.py — Backwards compatibility wrapper forwarding voice profile calls to services/voices.py.
"""

import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional
import services.voices as voices_service


def clear_profile_cache(profile_id: str) -> None:
    return voices_service.clear_voice_cache(voice_id=profile_id)


def create_profile(data: Dict[str, Any], conn: sqlite3.Connection) -> Dict[str, Any]:
    return voices_service.create_voice(data=data, conn=conn)


async def add_profile_sample(
    profile_id: str,
    audio_path: str | Path,
    reference_text: Optional[str],
    conn: sqlite3.Connection,
    start_time: float = 0.0,
    end_time: Optional[float] = None,
    auto_transcribe: bool = True,
) -> Dict[str, Any]:
    return await voices_service.add_voice_sample(
        voice_id=profile_id,
        audio_path=audio_path,
        reference_text=reference_text,
        conn=conn,
        start_time=start_time,
        end_time=end_time,
        auto_transcribe=auto_transcribe,
    )


def get_profile(profile_id: str, conn: sqlite3.Connection) -> Optional[Dict[str, Any]]:
    return voices_service.get_voice(voice_id=profile_id, conn=conn)


def list_profiles(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    return voices_service.list_voices(conn=conn)


def update_profile(profile_id: str, data: Dict[str, Any], conn: sqlite3.Connection) -> Dict[str, Any]:
    return voices_service.update_voice(voice_id=profile_id, data=data, conn=conn)


def delete_profile(profile_id: str, conn: sqlite3.Connection) -> bool:
    return voices_service.delete_voice(voice_id=profile_id, conn=conn)


def delete_profile_sample(sample_id: str, conn: sqlite3.Connection) -> bool:
    return voices_service.delete_voice_sample(sample_id=sample_id, conn=conn)


def create_voice_prompt_for_profile(
    profile_id: str,
    conn: sqlite3.Connection,
    use_cache: bool = True,
    engine: str = "sherpa_tts",
) -> Dict[str, str]:
    return voices_service.create_voice_prompt_for_voice(
        voice_id=profile_id,
        conn=conn,
        use_cache=use_cache,
    )
