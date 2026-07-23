"""
router/voices.py — FastAPI APIRouter endpoints for Voice management and audio sample operations.
"""

import os
import tempfile
import sqlite3
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from database import get_db
import services.voices as voices_service

router = APIRouter(prefix="/voices", tags=["Voices"])

ALLOWED_AUDIO_EXTENSIONS = {".wav", ".mp3", ".m4a", ".ogg", ".flac", ".aac", ".webm", ".opus"}
SAMPLE_MAX_BYTES = 50 * 1024 * 1024  # 50MB
CHUNK = 1024 * 1024  # 1MB


class VoiceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    language: Optional[str] = "en"


class VoiceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    language: Optional[str] = None


class VoiceSampleUpdate(BaseModel):
    reference_text: str = Field(..., min_length=1)


class VoiceSampleResponse(BaseModel):
    id: str
    voice_id: str
    audio_path: str
    full_audio_path: Optional[str] = None
    reference_text: str
    duration_sec: Optional[float] = None
    sample_rate: Optional[int] = None
    created_at: str


class VoiceResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    language: str = "en"
    created_at: str
    updated_at: str
    sample_count: int = 0
    samples: Optional[List[VoiceSampleResponse]] = None


class VoicePromptRequest(BaseModel):
    use_cache: bool = True


@router.post("", response_model=VoiceResponse, status_code=status.HTTP_201_CREATED)
def create_voice(payload: VoiceCreate, db: sqlite3.Connection = Depends(get_db)):
    try:
        data = payload.model_dump()
        return voices_service.create_voice(data, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create voice: {exc}")


@router.get("", response_model=Dict[str, List[VoiceResponse]])
def list_voices(db: sqlite3.Connection = Depends(get_db)):
    try:
        voices = voices_service.list_voices(db)
        return {"voices": voices}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to list voices: {exc}")


@router.get("/{voice_id}", response_model=VoiceResponse)
def get_voice(voice_id: str, db: sqlite3.Connection = Depends(get_db)):
    voice = voices_service.get_voice(voice_id, db)
    if not voice:
        raise HTTPException(status_code=404, detail=f"Voice '{voice_id}' not found.")
    return voice


@router.put("/{voice_id}", response_model=VoiceResponse)
def update_voice(voice_id: str, payload: VoiceUpdate, db: sqlite3.Connection = Depends(get_db)):
    try:
        data = payload.model_dump(exclude_unset=True)
        return voices_service.update_voice(voice_id, data, db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update voice: {exc}")


@router.delete("/{voice_id}", status_code=status.HTTP_200_OK)
def delete_voice(voice_id: str, db: sqlite3.Connection = Depends(get_db)):
    try:
        voices_service.delete_voice(voice_id, db)
        return {"message": f"Voice '{voice_id}' deleted successfully."}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete voice: {exc}")


@router.post("/{voice_id}/samples", response_model=VoiceSampleResponse, status_code=status.HTTP_201_CREATED)
async def upload_voice_sample(
    voice_id: str,
    file: UploadFile = File(...),
    reference_text: Optional[str] = Form(None),
    start_time: float = Form(0.0),
    end_time: Optional[float] = Form(None),
    auto_transcribe: bool = Form(True),
    db: sqlite3.Connection = Depends(get_db),
):

    orig_ext = os.path.splitext(file.filename or "")[1].lower()
    suffix = orig_ext if orig_ext in ALLOWED_AUDIO_EXTENSIONS else ".wav"

    tmp_file = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    tmp_path = tmp_file.name
    total_bytes = 0

    try:
        while chunk := await file.read(CHUNK):
            total_bytes += len(chunk)
            if total_bytes > SAMPLE_MAX_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Audio file exceeds maximum allowed size of {SAMPLE_MAX_BYTES / (1024*1024):.0f}MB.",
                )
            tmp_file.write(chunk)
        tmp_file.close()

        sample_res = await voices_service.add_voice_sample(
            voice_id=voice_id,
            audio_path=tmp_path,
            reference_text=reference_text,
            conn=db,
            start_time=start_time,
            end_time=end_time,
            auto_transcribe=auto_transcribe,
        )
        return sample_res

    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to upload voice sample: {exc}")
    finally:
        if not tmp_file.closed:
            tmp_file.close()
        if os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


@router.get("/{voice_id}/samples", response_model=Dict[str, List[VoiceSampleResponse]])
def get_voice_samples(voice_id: str, db: sqlite3.Connection = Depends(get_db)):
    voice = voices_service.get_voice(voice_id, db)
    if not voice:
        raise HTTPException(status_code=404, detail=f"Voice '{voice_id}' not found.")
    return {"samples": voice.get("samples") or []}


@router.put("/samples/{sample_id}", response_model=VoiceSampleResponse)
def update_voice_sample(
    sample_id: str, payload: VoiceSampleUpdate, db: sqlite3.Connection = Depends(get_db)
):
    row = db.execute("SELECT * FROM voice_samples WHERE id = ?", (sample_id,)).fetchone()
    if not row:
        row = db.execute("SELECT * FROM profile_samples WHERE id = ?", (sample_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Sample '{sample_id}' not found.")

    db.execute(
        "UPDATE voice_samples SET reference_text = ? WHERE id = ?",
        (payload.reference_text.strip(), sample_id),
    )
    db.execute(
        "UPDATE profile_samples SET reference_text = ? WHERE id = ?",
        (payload.reference_text.strip(), sample_id),
    )
    db.commit()

    updated = db.execute("SELECT * FROM voice_samples WHERE id = ?", (sample_id,)).fetchone()
    if not updated:
        updated = db.execute("SELECT * FROM profile_samples WHERE id = ?", (sample_id,)).fetchone()
    v_id = updated["voice_id"] if "voice_id" in updated.keys() else updated["profile_id"]
    voices_service.clear_voice_cache(v_id)

    return {
        "id": updated["id"],
        "voice_id": v_id,
        "audio_path": updated["audio_path"],
        "full_audio_path": str(config.resolve_storage_path(updated["audio_path"])),
        "reference_text": updated["reference_text"],
        "duration_sec": updated["duration_sec"] if "duration_sec" in updated.keys() else None,
        "sample_rate": updated["sample_rate"] if "sample_rate" in updated.keys() else None,
        "created_at": updated["created_at"],
    }


@router.delete("/samples/{sample_id}", status_code=status.HTTP_200_OK)
def delete_voice_sample(sample_id: str, db: sqlite3.Connection = Depends(get_db)):
    try:
        voices_service.delete_voice_sample(sample_id, db)
        return {"message": f"Sample '{sample_id}' deleted successfully."}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete sample: {exc}")


@router.post("/{voice_id}/voice-prompt", response_model=Dict[str, str])
def assemble_voice_prompt(
    voice_id: str,
    payload: Optional[VoicePromptRequest] = None,
    db: sqlite3.Connection = Depends(get_db),
):
    use_cache = payload.use_cache if payload else True
    try:
        return voices_service.create_voice_prompt_for_voice(voice_id, db, use_cache=use_cache)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to assemble voice prompt: {exc}")
