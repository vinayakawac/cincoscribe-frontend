/* ===== Models Page ===== */

function renderModelsPage(container) {
  let modelStatus = {
    asr: { base: true, small: false, medium: false, large: false, turbo: false },
    tts: {
      qwen_1_7b: false,
      qwen_0_6b: false,
      qwen_custom_1_7b: false,
      qwen_custom_0_6b: false,
      luxtts: false,
      chatterbox_tts: false,
      chatterbox_turbo: false,
      tada_1b: false,
      tada_3b: false,
      kokoro: false
    }
  };
  let currentModelsDir = '';
  let isDownloading = {};
  let errorMessage = '';

  async function fetchStatus() {
    try {
      let port = 3901;
      if (window.electronAPI) {
        port = await window.electronAPI.getSidecarPort();
      }
      const res = await fetch(`http://127.0.0.1:${port}/engines/models/status`);
      if (res.ok) {
        const data = await res.json();
        modelStatus = data;
        currentModelsDir = data.current_models_dir || '';
        errorMessage = '';
      } else {
        errorMessage = 'Failed to fetch model status from sidecar backend.';
      }
    } catch (e) {
      errorMessage = 'Sidecar backend offline or unreachable.';
    }
  }

  async function triggerDownload(modelType, modelName) {
    const key = `${modelType}:${modelName}`;
    if (isDownloading[key]) return;
    
    isDownloading[key] = true;
    errorMessage = '';
    render();

    try {
      let port = 3901;
      if (window.electronAPI) {
        port = await window.electronAPI.getSidecarPort();
      }
      const res = await fetch(`http://127.0.0.1:${port}/engines/models/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_type: modelType, model_name: modelName })
      });
      if (res.ok) {
        isDownloading[key] = false;
        await fetchStatus();
      } else {
        const err = await res.json();
        throw new Error(err.detail || 'Download failed');
      }
    } catch (e) {
      isDownloading[key] = false;
      errorMessage = `Download failed: ${e.message}`;
    }
    render();
  }

  async function init() {
    await fetchStatus();
    render();
  }

  function render() {
    const asrModels = [
      { name: 'Whisper Base', key: 'base', size: '145 MB', cpu: 'Light', desc: 'Default pre-installed model. Fast and fits most normal transcription tasks.' },
      { name: 'Whisper Small', key: 'small', size: '460 MB', cpu: 'Medium', desc: 'Balanced accuracy and resource usage. Requires download.' },
      { name: 'Whisper Medium', key: 'medium', size: '1.5 GB', cpu: 'Heavy', desc: 'High accuracy for complex audio or multiple accents. Requires download.' },
      { name: 'Whisper Large', key: 'large', size: '3.0 GB', cpu: 'Very Heavy', desc: 'Maximum accuracy model. Slow on low-end CPUs. Requires download.' },
      { name: 'Whisper Turbo', key: 'turbo', size: '1.6 GB', cpu: 'Heavy', desc: 'Optimized large model. High accuracy with faster runtime. Requires download.' }
    ];

    const ttsModels = [
      { name: 'Kokoro 82M', key: 'kokoro', size: '82 MB', cpu: 'Light', desc: 'Ultra lightweight, high-fidelity local speech synthesis. Pre-installed model.' },
      { name: 'Qwen TTS 1.7B', key: 'qwen_1_7b', size: '3.4 GB', cpu: 'Very Heavy', desc: 'High-fidelity speech synthesis based on Qwen-Audio. Requires download.' },
      { name: 'Qwen TTS 0.6B', key: 'qwen_0_6b', size: '1.2 GB', cpu: 'Heavy', desc: 'Balanced quality and performance version of Qwen TTS. Requires download.' },
      { name: 'Qwen CustomVoice 1.7B', key: 'qwen_custom_1_7b', size: '3.4 GB', cpu: 'Very Heavy', desc: 'Personalized voice cloning model based on Qwen. Requires download.' },
      { name: 'Qwen CustomVoice 0.6B', key: 'qwen_custom_0_6b', size: '1.2 GB', cpu: 'Heavy', desc: 'Lightweight personal voice cloning model. Requires download.' },
      { name: 'LuxTTS (Fast, CPU-friendly)', key: 'luxtts', size: '45 MB', cpu: 'Light', desc: 'Extremely fast and lightweight voice generation optimized for low-end CPUs. Requires download.' },
      { name: 'Chatterbox TTS (Multilingual)', key: 'chatterbox_tts', size: '350 MB', cpu: 'Medium', desc: 'Natural sounding voice synthesis across multiple languages. Requires download.' },
      { name: 'Chatterbox Turbo (English, Tags)', key: 'chatterbox_turbo', size: '180 MB', cpu: 'Light', desc: 'High speed English generation with support for emotional state tags. Requires download.' },
      { name: 'TADA 1B (English)', key: 'tada_1b', size: '2.0 GB', cpu: 'Heavy', desc: 'Advanced text-to-speech model optimized for expressive English speech. Requires download.' },
      { name: 'TADA 3B Multilingual', key: 'tada_3b', size: '6.0 GB', cpu: 'Very Heavy', desc: 'Large scale multilingual speech synthesis with high vocal detail. Requires download.' }
    ];

    container.innerHTML = `
      <style>
        .models-container {
          animation: fade-in-models 350ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes fade-in-models {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .section-title {
          font-family: var(--ff-display);
          font-size: var(--fs-md);
          font-weight: 700;
          color: var(--clr-text);
          margin-bottom: var(--sp-4);
          display: flex;
          align-items: center;
          gap: var(--sp-2);
        }
        .models-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: var(--sp-4);
          margin-bottom: var(--sp-8);
        }
        .model-card {
          background: oklch(0.165 0 0);
          border: 1px solid oklch(0.22 0 0);
          border-radius: var(--radius-xl);
          padding: var(--sp-5);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 200px;
          transition: all 250ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .model-card:hover {
          transform: translateY(-2px);
          border-color: oklch(0.3 0 0);
          box-shadow: 0 10px 20px oklch(0 0 0 / 0.25);
          background: oklch(0.18 0 0);
        }
        .model-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--sp-2);
        }
        .model-title {
          font-family: var(--ff-display);
          font-size: var(--fs-sm);
          font-weight: 600;
          color: var(--clr-text);
          margin: 0;
        }
        .model-specs {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          margin-top: var(--sp-2);
          font-size: var(--fs-xs);
          color: var(--clr-text-faint);
        }
        .spec-dot {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background-color: var(--clr-text-faint);
          opacity: 0.5;
        }
        .model-desc {
          font-size: var(--fs-xs);
          color: var(--clr-text-muted);
          line-height: 1.5;
          margin-top: var(--sp-3);
          margin-bottom: var(--sp-4);
          flex-grow: 1;
        }
        .model-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          border-top: 1px solid oklch(0.2 0 0);
          padding-top: var(--sp-3);
        }
        
        .badge-status {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .badge-installed {
          background: oklch(0.2 0.08 145);
          color: oklch(0.78 0.14 145);
          border: 1px solid oklch(0.3 0.1 145 / 0.3);
        }
        .badge-downloaded {
          background: oklch(0.18 0 0);
          color: var(--clr-text-muted);
          border: 1px solid oklch(0.24 0 0);
        }
        .badge-downloading {
          background: oklch(0.2 0.08 45);
          color: oklch(0.78 0.14 45);
          border: 1px solid oklch(0.3 0.1 45 / 0.3);
        }
        
        .spinner-models {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin-models-anim 1s linear infinite;
          display: inline-block;
        }
        @keyframes spin-models-anim {
          to { transform: rotate(360deg); }
        }
      </style>
      <div class="page-container page-sections models-container">
        <div class="page-header">
          <h1 class="page-title">Model <span class="page-title-sub">Management</span></h1>
          <p class="page-subtitle">View, download, and configure your local transcription and voice synthesis models</p>
        </div>

        ${errorMessage ? `
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: var(--radius-lg); padding: var(--sp-4); color: #ef4444; font-size: var(--fs-sm); display: flex; gap: var(--sp-2); align-items: center;">
            <span>${Utils.icons.info}</span>
            <span>${errorMessage}</span>
          </div>
        ` : ''}

        ${currentModelsDir ? `
          <div class="card" style="padding: var(--sp-4); display: flex; align-items: center; justify-content: space-between; border-color: var(--clr-border);">
            <div style="display: flex; align-items: center; gap: var(--sp-3);">
              <div style="font-size: 20px; display: flex; color: var(--clr-text-muted);">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                  <path d="M3.3 7 12 12l8.7-5"/>
                  <path d="M12 22V12"/>
                </svg>
              </div>
              <div>
                <p style="font-size: var(--fs-xs); color: var(--clr-text-faint); margin: 0; text-transform: uppercase; font-weight: var(--fw-bold);">Active Storage Path</p>
                <p style="font-size: var(--fs-sm); font-family: var(--ff-mono); color: var(--clr-text-muted); margin: 0; margin-top: 2px; word-break: break-all;">${currentModelsDir}</p>
              </div>
            </div>
          </div>
        ` : ''}

        <div>
          <h2 class="section-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
            </svg>
            Transcription Models (ASR)
          </h2>
          <div class="models-grid">
            ${asrModels.map(model => {
              const installed = modelStatus.asr[model.key];
              const dlKey = `asr:${model.key}`;
              const downloading = isDownloading[dlKey];
              return renderModelCard('asr', model, installed, downloading);
            }).join('')}
          </div>
        </div>

        <div>
          <h2 class="section-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 10v3"/>
              <path d="M6 6v11"/>
              <path d="M10 3v18"/>
              <path d="M14 8v7"/>
              <path d="M18 5v13"/>
              <path d="M22 10v3"/>
            </svg>
            Speech Synthesis Models (TTS)
          </h2>
          <div class="models-grid">
            ${ttsModels.map(model => {
              const installed = modelStatus.tts[model.key];
              const dlKey = `tts:${model.key}`;
              const downloading = isDownloading[dlKey];
              return renderModelCard('tts', model, installed, downloading);
            }).join('')}
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function renderModelCard(type, model, installed, downloading) {
    let buttonHtml = '';
    let statusBadge = '';

    if (installed) {
      statusBadge = `<span class="badge-status badge-installed">Installed</span>`;
      buttonHtml = `<button class="btn btn-secondary btn-sm" disabled style="opacity: 0.4; cursor: not-allowed; border-color: transparent;">Ready</button>`;
    } else if (downloading) {
      statusBadge = `<span class="badge-status badge-downloading">Downloading</span>`;
      buttonHtml = `<button class="btn btn-secondary btn-sm" disabled style="display: flex; align-items: center; gap: 6px;"><div class="spinner-models"></div> Fetching</button>`;
    } else {
      statusBadge = `<span class="badge-status badge-downloaded">Download Required</span>`;
      buttonHtml = `<button class="btn btn-primary btn-sm btn-dl" data-type="${type}" data-name="${model.key}">Download</button>`;
    }

    return `
      <div class="model-card">
        <div>
          <div class="model-card-header">
            <h3 class="model-title">${model.name}</h3>
            ${statusBadge}
          </div>
          <div class="model-specs">
            <span>Size: <strong>${model.size}</strong></span>
            <div class="spec-dot"></div>
            <span>CPU: <strong>${model.cpu}</strong></span>
          </div>
          <p class="model-desc">${model.desc}</p>
        </div>
        <div class="model-footer">
          ${buttonHtml}
        </div>
      </div>
    `;
  }

  function bindEvents() {
    container.querySelectorAll('.btn-dl').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        const name = btn.getAttribute('data-name');
        triggerDownload(type, name);
      });
    });
  }

  init();
}

Router.register('dashboard/models', renderModelsPage);
