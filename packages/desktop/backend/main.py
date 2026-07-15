import os
import logging
import collections
from fastapi import FastAPI
from router import health, tts, asr, models

# Thread-safe log buffer containing the last 2000 lines
log_buffer = collections.deque(maxlen=2000)

class MemoryLogHandler(logging.Handler):
    def emit(self, record):
        try:
            msg = self.format(record)
            log_buffer.append(msg)
        except Exception:
            self.handleError(record)

# Initialize standard logging config
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

# Attach MemoryLogHandler to the root logger to capture all system logs
memory_handler = MemoryLogHandler()
memory_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))
logging.getLogger().addHandler(memory_handler)

app = FastAPI(title="CincoScribe Sidecar", version="2.0.0", docs_url=None, redoc_url=None)

app.include_router(health.router)
app.include_router(tts.router)
app.include_router(asr.router)
app.include_router(models.router)

@app.get("/logs")
def get_logs():
    return {"logs": list(log_buffer)}

@app.post("/logs/clear")
def clear_logs():
    log_buffer.clear()
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("SIDECAR_PORT", "3901"))
    logging.info(f"CincoScribe sidecar starting on 127.0.0.1:{port}")
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        log_level="info",
        access_log=True,  # Set access logs to True to show request logging in Settings Logs!
    )
