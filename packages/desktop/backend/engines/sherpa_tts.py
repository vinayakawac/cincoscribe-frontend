import os
import io
import wave
import logging
from pathlib import Path
import numpy as np
from engines.base_tts import TTSBackend, EngineError

logger = logging.getLogger(__name__)

class SherpaTTS(TTSBackend):
    def __init__(self, models_dir: str):
        self.models_dir = Path(models_dir)
        self.model_path = self.models_dir / "kokoro-en-v0_19"
        self._tts = None

    @property
    def requires_clone(self) -> bool:
        return False

    def _ensure_model(self):
        if self._tts is not None:
            return

        # Auto-download
        if not (self.model_path / "model.onnx").exists():
            logger.info(f"Downloading Kokoro ONNX model to {self.model_path}...")
            from huggingface_hub import snapshot_download
            snapshot_download(
                repo_id="csukuangfj/kokoro-en-v0_19",
                local_dir=str(self.model_path),
                allow_patterns=["*.onnx", "*.txt", "espeak-ng-data/*"]
            )

        # Check ONNX Runtime GPU support
        provider = "cpu"
        try:
            import torch
            if torch.cuda.is_available():
                provider = "cuda"
        except ImportError:
            pass

        import sherpa_onnx
        logger.info(f"Initializing SherpaTTS with provider={provider}")
        model_config = sherpa_onnx.OfflineTtsModelConfig(
            vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                model=str(self.model_path / "model.onnx"),
                lexicon=str(self.model_path / "lexicon-us-en.txt"),
                tokens=str(self.model_path / "tokens.txt"),
                data_dir=str(self.model_path / "espeak-ng-data"),
            ),
            provider=provider,
            num_threads=2,
            debug=False,
        )
        
        tts_config = sherpa_onnx.OfflineTtsConfig(
            model=model_config,
            max_num_sentences=1,
        )

        if not tts_config.validate():
            raise EngineError("Invalid sherpa-onnx TTS configuration.")

        self._tts = sherpa_onnx.OfflineTts(tts_config)

    def generate(self, text: str, voice: str) -> bytes:
        # Enforce constraints (mock ASR active for RTX 3050 fallback simulation if needed)
        device = self.gpu_preflight(asr_active=True, requested_device="cpu")
        
        self._ensure_model()
        
        # Default voice ID for kokoro is 0
        speaker_id = 0
        try:
            if voice.isdigit():
                speaker_id = int(voice)
        except Exception:
            pass

        audio = self._tts.generate(text, sid=speaker_id, speed=1.0)
        if not audio:
            raise EngineError("TTS generation failed inside sherpa-onnx.")
            
        samples = np.array(audio.samples, dtype=np.float32)
        pcm16 = (samples * 32767).clip(-32768, 32767).astype(np.int16)
        
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(audio.sample_rate)
            wf.writeframes(pcm16.tobytes())
            
        return buf.getvalue()
