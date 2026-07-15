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

@router.post("/merge-audio")
def merge_audio(payload: MergePayload):
    if len(payload.files) < 2:
        raise HTTPException(status_code=400, detail="At least 2 files are required to merge.")
    try:
        combined_data = []
        samplerate = None
        
        for file_item in payload.files:
            file_bytes = base64.b64decode(file_item.data)
            data, sr = sf.read(io.BytesIO(file_bytes))
            if samplerate is None:
                samplerate = sr
            
            # Ensure consistency: if multi-channel, convert to mono by taking mean of channels
            if len(data.shape) > 1 and data.shape[1] > 1:
                data = np.mean(data, axis=1)
                
            combined_data.append(data)
            
        merged = np.concatenate(combined_data, axis=0)
        
        out_buf = io.BytesIO()
        sf.write(out_buf, merged, samplerate, format="WAV")
        out_buf.seek(0)
        
        merged_base64 = base64.b64encode(out_buf.read()).decode("utf-8")
        duration = len(merged) / samplerate
        
        return {
            "success": True,
            "audioData": merged_base64,
            "duration": duration
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
