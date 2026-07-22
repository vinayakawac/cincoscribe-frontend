import os
import sys
import json
import logging
import asyncio
import hashlib
import shutil
import tarfile
import subprocess
from pathlib import Path
from typing import Tuple, Dict, Any, Optional

import httpx

from config import models_dir

logger = logging.getLogger(__name__)

CUDA_LIBS_VERSION = "cu124-v1"
APP_VERSION = "0.1.0"
PROGRESS_KEY = "cuda-backend"

# Default GitHub release asset URL base (configurable via env)
GITHUB_RELEASE_BASE_URL = os.environ.get(
    "CINCOSCRIBE_RELEASE_URL",
    f"https://github.com/vinayakawac/CincoScribe/releases/download/v{APP_VERSION}"
)

def get_cuda_dir() -> Path:
    base_dir = models_dir.parent
    return base_dir / "backends" / "cuda"

def get_cuda_binary_path() -> Path:
    cuda_dir = get_cuda_dir()
    name = "cincoscribe-server.exe" if sys.platform == "win32" else "cincoscribe-server"
    return cuda_dir / name

def get_manifest_path() -> Path:
    return get_cuda_dir() / "cuda-libs.json"

# State management for live download tracking
_download_lock = asyncio.Lock()
_progress_state: Dict[str, Any] = {
    "current": 0,
    "total": 0,
    "filename": "",
    "status": "idle"
}

def is_cuda_download_supported() -> Tuple[bool, str]:
    if sys.platform == "win32":
        return True, ""
    return False, "CUDA downloadable binary is currently supported on Windows (win32) only. Linux/macOS users can build from source with GPU enabled."

def is_cuda_active() -> bool:
    return os.environ.get("CINCOSCRIBE_BACKEND_VARIANT", "").lower() == "cuda"

def _needs_server_download(version: Optional[str] = None) -> bool:
    target_ver = version or APP_VERSION
    binary_path = get_cuda_binary_path()
    if not binary_path.exists():
        return True
    try:
        res = subprocess.run(
            [str(binary_path), "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        installed_ver = res.stdout.strip() or res.stderr.strip()
        if target_ver in installed_ver:
            return False
        logger.info(f"Server CUDA binary version mismatch: installed '{installed_ver}' != target '{target_ver}'")
        return True
    except Exception as e:
        logger.warning(f"Failed to execute CUDA binary version check: {e}")
        return True

def _needs_cuda_libs_download() -> bool:
    manifest_path = get_manifest_path()
    if not manifest_path.exists():
        return True
    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        recorded = data.get("version", "")
        if recorded == CUDA_LIBS_VERSION:
            return False
        logger.info(f"CUDA libs version mismatch: recorded '{recorded}' != target '{CUDA_LIBS_VERSION}'")
        return True
    except Exception as e:
        logger.warning(f"Failed to read cuda-libs manifest: {e}")
        return True

def _update_progress(current: int, total: int, filename: str, status: str):
    global _progress_state
    _progress_state = {
        "current": current,
        "total": total,
        "filename": filename,
        "status": status
    }

async def _download_and_verify_archive(
    client: httpx.AsyncClient,
    url: str,
    sha256_url: str,
    label: str,
    cuda_dir: Path
) -> Path:
    tmp_path = cuda_dir / f".download-{label}.tmp"
    filename = url.split("/")[-1]
    
    _update_progress(0, 0, filename, f"Downloading {label}...")
    
    try:
        # 1. Stream archive in 1MB chunks
        async with client.stream("GET", url) as resp:
            resp.raise_for_status()
            total_bytes = int(resp.headers.get("content-length", 0))
            downloaded = 0
            
            with open(tmp_path, "wb") as f:
                async for chunk in resp.aiter_bytes(chunk_size=1024 * 1024):
                    f.write(chunk)
                    downloaded += len(chunk)
                    _update_progress(downloaded, total_bytes, filename, f"Downloading {label}...")
        
        # 2. Fetch expected SHA-256 sidecar
        _update_progress(downloaded, total_bytes, filename, f"Verifying {label} SHA-256...")
        sha_resp = await client.get(sha256_url)
        sha_resp.raise_for_status()
        expected_sha = sha_resp.text.strip().split()[0].lower()
        
        # 3. Compute downloaded file SHA-256
        sha256_hash = hashlib.sha256()
        with open(tmp_path, "rb") as f:
            for block in iter(lambda: f.read(1024 * 1024), b""):
                sha256_hash.update(block)
        computed_sha = sha256_hash.hexdigest().lower()
        
        if computed_sha != expected_sha:
            raise ValueError(
                f"SHA-256 mismatch for {filename}! Expected: {expected_sha}, Computed: {computed_sha}"
            )
        
        # 4. Safe extraction with data_filter when available
        _update_progress(downloaded, total_bytes, filename, f"Extracting {label}...")
        with tarfile.open(tmp_path, "r:*") as tar:
            if hasattr(tarfile, "data_filter"):
                tar.extractall(path=cuda_dir, filter="data")
            else:
                tar.extractall(path=cuda_dir)
                
        return tmp_path
    finally:
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except Exception as e:
                logger.warning(f"Failed to remove temp file {tmp_path}: {e}")

async def download_and_install_cuda_backend(force: bool = False) -> Dict[str, Any]:
    supported, reason = is_cuda_download_supported()
    if not supported:
        raise RuntimeError(reason)
        
    if _download_lock.locked():
        logger.info("CUDA download process already in progress; no-op.")
        return get_cuda_status()
        
    async with _download_lock:
        cuda_dir = get_cuda_dir()
        cuda_dir.mkdir(parents=True, exist_ok=True)
        
        needs_server = force or _needs_server_download()
        needs_libs = force or _needs_cuda_libs_download()
        
        if not needs_server and not needs_libs:
            _update_progress(100, 100, "", "Up to date")
            return get_cuda_status()
            
        async with httpx.AsyncClient(follow_redirects=True, timeout=600.0) as client:
            try:
                if needs_server:
                    server_url = f"{GITHUB_RELEASE_BASE_URL}/cincoscribe-server-cuda.tar.gz"
                    server_sha_url = f"{server_url}.sha256"
                    await _download_and_verify_archive(
                        client, server_url, server_sha_url, "server-cuda", cuda_dir
                    )
                
                if needs_libs:
                    libs_url = f"{GITHUB_RELEASE_BASE_URL}/cuda-libs-{CUDA_LIBS_VERSION}.tar.gz"
                    libs_sha_url = f"{libs_url}.sha256"
                    await _download_and_verify_archive(
                        client, libs_url, libs_sha_url, "cuda-libs", cuda_dir
                    )
                    
                    # Write manifest
                    with open(get_manifest_path(), "w", encoding="utf-8") as f:
                        json.dump({"version": CUDA_LIBS_VERSION}, f, indent=2)

                _update_progress(100, 100, "", "Complete")
            except httpx.HTTPStatusError as e:
                err_msg = f"HTTP {e.response.status_code}: Asset not found on release server" if e.response.status_code == 404 else str(e)
                logger.error(f"CUDA backend download failed: {err_msg}")
                _update_progress(0, 0, "", f"Failed: {err_msg}")
            except Exception as e:
                logger.error(f"CUDA backend download/installation failed: {e}", exc_info=True)
                _update_progress(0, 0, "", f"Failed: {e}")
                
        return get_cuda_status()

def check_and_update_cuda_binary():
    # Automatic startup downloads disabled. Downloads must be explicitly triggered by the user in Settings -> GPU.
    return

def delete_cuda_binary() -> bool:
    cuda_dir = get_cuda_dir()
    if cuda_dir.exists():
        try:
            shutil.rmtree(cuda_dir)
            _update_progress(0, 0, "", "idle")
            return True
        except Exception as e:
            logger.error(f"Failed to delete CUDA backend directory {cuda_dir}: {e}")
            raise
    return False

def get_cuda_status() -> Dict[str, Any]:
    supported, reason = is_cuda_download_supported()
    binary_path = get_cuda_binary_path()
    manifest_path = get_manifest_path()
    
    libs_ver = None
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                libs_ver = json.load(f).get("version")
        except Exception:
            pass
            
    return {
        "available": binary_path.exists(),
        "active": is_cuda_active(),
        "binary_path": str(binary_path),
        "cuda_libs_version": libs_ver or CUDA_LIBS_VERSION,
        "download_supported": supported,
        "unsupported_reason": reason,
        "downloading": _download_lock.locked(),
        "download_progress": _progress_state
    }
