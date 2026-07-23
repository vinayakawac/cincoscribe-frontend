"""
router/profiles.py — FastAPI endpoints for Voice Profile CRUD, sample upload, timeline cropping, auto-transcription, and TTS prompt assembly.
"""

import os
import tempfile
import sqlite3
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from database import get_db
from services import profiles as profile_service

router = APIRouter(prefix="/profiles", tags=["profiles"])


# ── Pydantic Payloads ─────────────────────────────────────────────────────────

class ProfileCreatePayload(BaseModel):
    name: str
    description: Optional[str] = None
    language: Optional[str] = "en"
    avatar_path: Optional[str] = None
    effects_chain: Optional[str] = None
    default_engine: Optional[str] = None


class ProfileUpdatePayload(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    language: Optional[str] = None
    avatar_path: Optional[str] = None
    effects_chain: Optional[str] = None
    default_engine: Optional[str] = None


class SampleUpdatePayload(BaseModel):
    reference_text: str


class VoicePromptPayload(BaseModel):
    use_cache: bool = True
    engine: str = "sherpa_tts"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
def create_profile_endpoint(payload: ProfileCreatePayload, db: sqlite3.Connection = Depends(get_db)):
    try:
        profile = profile_service.create_profile(payload.dict(), db)
        return profile
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.get("")
def list_profiles_endpoint(db: sqlite3.Connection = Depends(get_db)):
    return {"profiles": profile_service.list_profiles(db)}


@router.get("/{profile_id}")
def get_profile_endpoint(profile_id: str, db: sqlite3.Connection = Depends(get_db)):
    profile = profile_service.get_profile(profile_id, db)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Voice profile '{profile_id}' not found.")
    return profile


@router.put("/{profile_id}")
def update_profile_endpoint(
    profile_id: str,
    payload: ProfileUpdatePayload,
    db: sqlite3.Connection = Depends(get_db),
):
    try:
        profile = profile_service.update_profile(profile_id, payload.dict(exclude_unset=True), db)
        return profile
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.delete("/{profile_id}")
def delete_profile_endpoint(profile_id: str, db: sqlite3.Connection = Depends(get_db)):
    try:
        profile_service.delete_profile(profile_id, db)
        return {"status": "deleted", "id": profile_id}
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(val_err))


@router.post("/{profile_id}/samples", status_code=status.HTTP_201_CREATED)
async def upload_profile_sample_endpoint(
    profile_id: str,
    reference_text: Optional[str] = Form(None),
    start_time: float = Form(0.0),
    end_time: Optional[float] = Form(None),
    auto_transcribe: bool = Form(True),
    file: UploadFile = File(...),
    db: sqlite3.Connection = Depends(get_db),
):
    """
    Stream sample upload to temporary file (50MB limit), crop to timeline bounds [start_time, end_time] (default first 30s),
    auto-transcribe with Whisper AI if requested/missing, validate audio, normalize to WAV, and attach to profile.
    """
    profile = profile_service.get_profile(profile_id, db)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Voice profile '{profile_id}' not found.")

    ext = Path(file.filename or "audio.wav").suffix.lower()
    allowed_exts = {".wav", ".mp3", ".m4a", ".ogg", ".flac", ".aac", ".webm", ".opus"}
    if ext not in allowed_exts:
        ext = ".wav"

    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    tmp_path = Path(tmp_file.name)
    bytes_written = 0
    max_bytes = 50 * 1024 * 1024  # 50MB hard cap

    try:
        while True:
            chunk = await file.read(1024 * 1024)  # 1MB chunks
            if not chunk:
                break
            bytes_written += len(chunk)
            if bytes_written > max_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Sample audio file exceeds maximum allowed size of 50MB.",
                )
            tmp_file.write(chunk)
        tmp_file.close()

        sample = await profile_service.add_profile_sample(
            profile_id=profile_id,
            audio_path=tmp_path,
            reference_text=reference_text,
            conn=db,
            start_time=start_time,
            end_time=end_time,
            auto_transcribe=auto_transcribe,
        )
        return sample

    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))
    finally:
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except Exception:
                pass


@router.get("/{profile_id}/samples")
def list_profile_samples_endpoint(profile_id: str, db: sqlite3.Connection = Depends(get_db)):
    profile = profile_service.get_profile(profile_id, db)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Voice profile '{profile_id}' not found.")
    return {"samples": profile["samples"]}


@router.put("/samples/{sample_id}")
def update_sample_endpoint(
    sample_id: str,
    payload: SampleUpdatePayload,
    db: sqlite3.Connection = Depends(get_db),
):
    s_row = db.execute("SELECT profile_id FROM profile_samples WHERE id = ?", (sample_id,)).fetchone()
    if not s_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Sample '{sample_id}' not found.")

    text = (payload.reference_text or "").strip()
    if not text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reference text cannot be empty.")

    db.execute("UPDATE profile_samples SET reference_text = ? WHERE id = ?", (text, sample_id))
    db.commit()

    profile_service.clear_profile_cache(s_row["profile_id"])

    updated = db.execute("SELECT * FROM profile_samples WHERE id = ?", (sample_id,)).fetchone()
    return dict(updated)


@router.delete("/samples/{sample_id}")
def delete_sample_endpoint(sample_id: str, db: sqlite3.Connection = Depends(get_db)):
    try:
        profile_service.delete_profile_sample(sample_id, db)
        return {"status": "deleted", "id": sample_id}
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(val_err))


@router.post("/{profile_id}/voice-prompt")
def get_voice_prompt_endpoint(
    profile_id: str,
    payload: VoicePromptPayload = VoicePromptPayload(),
    db: sqlite3.Connection = Depends(get_db),
):
    try:
        prompt_data = profile_service.create_voice_prompt_for_profile(
            profile_id=profile_id,
            conn=db,
            use_cache=payload.use_cache,
            engine=payload.engine,
        )
        return prompt_data
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))
