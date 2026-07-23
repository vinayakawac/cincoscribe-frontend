"""
utils/audio.py — Audio validation, loading, timeline cropping, and WAV normalization utilities.
"""

import logging
from pathlib import Path
from typing import Optional, Tuple
import numpy as np
import soundfile as sf

logger = logging.getLogger(__name__)


def validate_and_load_reference_audio(
    path: str | Path,
    start_time: float = 0.0,
    end_time: Optional[float] = None,
) -> Tuple[bool, str, Optional[np.ndarray], Optional[int]]:
    """
    Validate, crop to timeline range [start_time, end_time], and load reference audio file.

    Checks:
      1. File readable by soundfile/librosa
      2. Slices timeline range (defaults to first 30.0s if end_time not provided)
      3. Non-empty
      4. Duration bounds [1.0s, 60.0s]
      5. Volume / RMS check (reject silent audio)
      6. Peak check (reject clipping audio > 0.999)

    Returns:
      (is_valid, error_msg, audio_ndarray, sample_rate)
    """
    path_obj = Path(path)
    if not path_obj.exists() or path_obj.stat().st_size == 0:
        return False, "Audio file does not exist or is empty.", None, None

    try:
        data, sr = sf.read(str(path_obj), dtype="float32")
    except Exception as sf_err:
        try:
            import librosa  # type: ignore
            data, sr = librosa.load(str(path_obj), sr=None, mono=True)
        except Exception as lib_err:
            logger.warning("[audio_utils] Failed to decode audio %s: %s / %s", path_obj, sf_err, lib_err)
            return False, f"Unsupported or corrupt audio file format: {sf_err}", None, None

    if data is None or len(data) == 0:
        return False, "Audio file contains no audio data.", None, None

    # Convert to mono by averaging channels if multi-channel
    if len(data.shape) > 1 and data.shape[1] > 1:
        data = np.mean(data, axis=1)

    total_duration = len(data) / float(sr)

    # Calculate timeline slicing bounds
    st = max(0.0, float(start_time or 0.0))
    if end_time is not None and float(end_time) > st:
        et = min(total_duration, float(end_time))
    else:
        et = min(total_duration, st + 30.0)

    start_sample = int(round(st * sr))
    end_sample = int(round(et * sr))

    sliced_data = data[start_sample:end_sample]

    sliced_duration = len(sliced_data) / float(sr)
    if sliced_duration < 1.0:
        return False, f"Audio slice ({sliced_duration:.1f}s) is too short. Minimum required length is 1.0 second.", None, None

    if sliced_duration > 60.0:
        return False, f"Audio slice ({sliced_duration:.1f}s) is too long. Maximum allowed length is 60.0 seconds.", None, None

    # Check for clipping (peak > 0.999)
    peak = float(np.max(np.abs(sliced_data)))
    if peak > 0.999:
        return False, "Audio is clipping — re-record or normalize at lower gain.", None, None

    # Calculate Root Mean Square (RMS) volume level
    rms = float(np.sqrt(np.mean(sliced_data**2)))
    if rms < 0.001:
        return False, "Audio appears silent or volume level is too low.", None, None

    return True, "", sliced_data, sr


def save_audio(audio_ndarray: np.ndarray, dest_path: str | Path, sample_rate: int) -> None:
    """
    Write 16-bit PCM WAV via soundfile.write(dest_path, audio, sample_rate, subtype="PCM_16").
    Create parent dirs if missing.
    """
    dest = Path(dest_path)
    dest.parent.mkdir(parents=True, exist_ok=True)

    audio_data = np.asarray(audio_ndarray, dtype=np.float32)
    if len(audio_data.shape) > 1 and audio_data.shape[1] > 1:
        audio_data = np.mean(audio_data, axis=1)

    audio_data = np.clip(audio_data, -1.0, 1.0)
    sf.write(str(dest), audio_data, sample_rate, format="WAV", subtype="PCM_16")
