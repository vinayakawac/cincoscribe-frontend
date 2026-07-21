from fastapi import APIRouter, BackgroundTasks, HTTPException
import logging
from services.cuda_backend import (
    get_cuda_status,
    download_and_install_cuda_backend,
    delete_cuda_binary,
    is_cuda_active
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/system", tags=["system"])

@router.get("/backend")
def get_backend_info():
    active_variant = "cuda" if is_cuda_active() else "cpu"
    gpu_name = None
    import importlib
    if importlib.util.find_spec("torch") is not None:
        try:
            torch = importlib.import_module("torch")
            if getattr(torch.cuda, "is_available", lambda: False)():
                gpu_name = torch.cuda.get_device_name(0)
        except Exception:
            pass
        
    return {
        "active_variant": active_variant,
        "gpu_name": gpu_name,
        "is_cuda": active_variant == "cuda"
    }

@router.get("/cuda-status")
def get_cuda_status_endpoint():
    return get_cuda_status()

@router.post("/cuda/download")
async def trigger_cuda_download(background_tasks: BackgroundTasks):
    status = get_cuda_status()
    if not status["download_supported"]:
        raise HTTPException(status_code=400, detail=status["unsupported_reason"])
        
    if status["downloading"]:
        return {"status": "already_downloading", "progress": status["download_progress"]}
        
    background_tasks.add_task(download_and_install_cuda_backend, True)
    return {"status": "download_started", "message": "CUDA backend download started in background"}

@router.post("/cuda/delete")
def delete_cuda_endpoint():
    try:
        deleted = delete_cuda_binary()
        return {"status": "success", "deleted": deleted}
    except Exception as e:
        logger.error(f"Failed to delete CUDA backend: {e}")
        raise HTTPException(status_code=500, detail=str(e))
