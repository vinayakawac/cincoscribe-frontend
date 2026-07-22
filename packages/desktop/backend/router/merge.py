import base64
import io
import soundfile as sf
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class FileItem(BaseModel):
    name: str
    data: str  # Base64 encoded string

class MergePayload(BaseModel):
    files: list[FileItem]
    silence_gap: float = 0.0

def resample_audio(data: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
    if orig_sr == target_sr or len(data) == 0:
        return data
    num_samples = int(round(len(data) * target_sr / orig_sr))
    x_old = np.linspace(0, 1, len(data), endpoint=False)
    x_new = np.linspace(0, 1, num_samples, endpoint=False)
    return np.interp(x_new, x_old, data)

@router.post("/merge-audio")
def merge_audio(payload: MergePayload):
    if len(payload.files) < 2:
        raise HTTPException(status_code=400, detail="At least 2 files are required to merge.")
    try:
        combined_data = []
        target_sr = None
        
        # Pass 1: Decode files, pick primary target sample rate, resample mismatched tracks
        for i, file_item in enumerate(payload.files):
            file_bytes = base64.b64decode(file_item.data)
            data, sr = sf.read(io.BytesIO(file_bytes))
            
            if target_sr is None:
                target_sr = sr
            
            # Ensure mono float32
            if len(data.shape) > 1 and data.shape[1] > 1:
                data = np.mean(data, axis=1)
                
            data = data.astype(np.float32)

            # Resample if sample rate differs from target_sr
            if sr != target_sr:
                data = resample_audio(data, sr, target_sr)
                
            combined_data.append(data)
            
            # Add silence gap between tracks if specified
            if payload.silence_gap > 0 and i < len(payload.files) - 1:
                gap_samples = int(round(payload.silence_gap * target_sr))
                combined_data.append(np.zeros(gap_samples, dtype=np.float32))
            
        merged = np.concatenate(combined_data, axis=0)
        
        out_buf = io.BytesIO()
        sf.write(out_buf, merged, target_sr, format="WAV")
        out_buf.seek(0)
        
        merged_base64 = base64.b64encode(out_buf.read()).decode("utf-8")
        duration = float(len(merged) / target_sr)
        
        return {
            "success": True,
            "audioData": merged_base64,
            "duration": duration
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
