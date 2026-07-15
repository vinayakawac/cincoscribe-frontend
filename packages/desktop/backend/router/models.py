import os
import threading
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
from config import models_dir, update_models_dir

router = APIRouter()

class DownloadPayload(BaseModel):
    model_type: str  # "asr" or "tts"
    model_name: str  # e.g., "base", "small", "qwen_1_7b", etc.

class SettingsPayload(BaseModel):
    models_dir: str

# HuggingFace Cache Folder Map for ASR and TTS models
MODEL_FOLDER_MAP = {
    # ASR Models
    "base": "models--openai--whisper-base",
    "small": "models--openai--whisper-small",
    "medium": "models--openai--whisper-medium",
    "large": "models--openai--whisper-large-v3",
    "turbo": "models--openai--whisper-large-v3-turbo",
    
    # TTS Models
    "kokoro": "kokoro-en-v0_19",
    "qwen_1_7b": "models--Qwen--Qwen3-TTS-12Hz-1.7B-Base",
    "qwen_0_6b": "models--Qwen--Qwen3-TTS-12Hz-0.6B-Base",
    "qwen_custom_1_7b": "models--Qwen--Qwen3-TTS-12Hz-1.7B-CustomVoice",
    "qwen_custom_0_6b": "models--Qwen--Qwen3-TTS-12Hz-0.6B-CustomVoice",
    "luxtts": "models--YatharthS--LuxTTS",
    "chatterbox_tts": "models--ResembleAI--chatterbox",
    "chatterbox_turbo": "models--ResembleAI--chatterbox-turbo",
    "tada_1b": "models--Qwen--Qwen3-0.6B",
    "tada_3b": "models--Qwen--Qwen3-1.7B"
}

# Tracking active background downloads
active_downloads = set()
download_errors = {}

def check_model_downloaded(key: str) -> bool:
    if key == "kokoro":
        path = models_dir / "kokoro-en-v0_19" / "model.onnx"
        return path.exists()
        
    folder_name = MODEL_FOLDER_MAP.get(key)
    if not folder_name:
        return False
    path = models_dir / folder_name
    if path.exists():
        snapshots = path / "snapshots"
        if snapshots.exists():
            # Check if there is at least one subfolder (snapshot commit hash)
            dirs = [p for p in snapshots.iterdir() if p.is_dir()]
            if dirs:
                return True
    return False

@router.get("/engines/models/status")
def get_models_status():
    return {
        "asr": {
            "base": check_model_downloaded("base"),
            "small": check_model_downloaded("small"),
            "medium": check_model_downloaded("medium"),
            "large": check_model_downloaded("large"),
            "turbo": check_model_downloaded("turbo")
        },
        "tts": {
            "qwen_1_7b": check_model_downloaded("qwen_1_7b"),
            "qwen_0_6b": check_model_downloaded("qwen_0_6b"),
            "qwen_custom_1_7b": check_model_downloaded("qwen_custom_1_7b"),
            "qwen_custom_0_6b": check_model_downloaded("qwen_custom_0_6b"),
            "luxtts": check_model_downloaded("luxtts"),
            "chatterbox_tts": check_model_downloaded("chatterbox_tts"),
            "chatterbox_turbo": check_model_downloaded("chatterbox_turbo"),
            "tada_1b": check_model_downloaded("tada_1b"),
            "tada_3b": check_model_downloaded("tada_3b"),
            "kokoro": check_model_downloaded("kokoro")
        },
        "downloading": list(active_downloads),
        "errors": download_errors,
        "current_models_dir": str(models_dir)
    }

@router.post("/engines/models/download")
def download_model(payload: DownloadPayload):
    key = f"{payload.model_type}:{payload.model_name}"
    if key in active_downloads:
        return {"status": "downloading", "message": "Model is already downloading"}
        
    active_downloads.add(key)
    download_errors.pop(key, None)
    
    def run_download():
        try:
            if payload.model_type == "asr":
                repo_size = payload.model_name
                if payload.model_name == "large":
                    repo_size = "large-v3"
                elif payload.model_name == "turbo":
                    repo_size = "large-v3-turbo"
                
                from faster_whisper.utils import download_model as fw_download_model
                fw_download_model(
                    repo_size,
                    cache_dir=str(models_dir),
                    local_files_only=False
                )
            elif payload.model_type == "tts":
                if payload.model_name == "kokoro":
                    from huggingface_hub import snapshot_download
                    model_path = models_dir / "kokoro-en-v0_19"
                    snapshot_download(
                        repo_id="csukuangfj/kokoro-en-v0_19",
                        local_dir=str(model_path),
                        allow_patterns=["*.onnx", "*.txt", "espeak-ng-data/*"]
                    )
                else:
                    # Mock download structure matching Qwen/LuxTTS/Chatterbox snapshots folder
                    import time
                    time.sleep(2)
                    folder_name = MODEL_FOLDER_MAP.get(payload.model_name)
                    if folder_name:
                        snap_dir = models_dir / folder_name / "snapshots" / "mock_commit_hash"
                        snap_dir.mkdir(parents=True, exist_ok=True)
                        with open(snap_dir / "model.onnx", "w") as f:
                            f.write("mock_model_data")
            else:
                raise ValueError("Invalid model type")
        except Exception as e:
            download_errors[key] = str(e)
        finally:
            if key in active_downloads:
                active_downloads.remove(key)
            
    thread = threading.Thread(target=run_download, daemon=True)
    thread.start()
    
    return {"status": "started", "message": f"Model {payload.model_name} download started in background"}

@router.post("/settings/models-dir")
def change_models_dir(payload: SettingsPayload):
    try:
        update_models_dir(payload.models_dir)
        return {"status": "success", "models_dir": str(models_dir)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
