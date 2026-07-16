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
  let pollingInterval = null;
  let reconnectInterval = null;
  let expandedModelKey = null; // Key of the currently expanded model

  async function fetchStatus() {
    try {
      let port = 3901;
      if (window.electronAPI) {
        port = await window.electronAPI.getSidecarPort();
      }
      const hostname = window.location.hostname || 'localhost';
      const res = await fetch(`http://${hostname}:${port}/engines/models/status`);
      if (res.ok) {
        const data = await res.json();
        modelStatus = data;
        currentModelsDir = data.current_models_dir || '';
        
        // Sync local isDownloading with backend downloading list
        isDownloading = {};
        if (data.downloading) {
          data.downloading.forEach(key => {
            isDownloading[key] = true;
          });
        }
        
        // Check if there are download errors to display
        if (data.errors && Object.keys(data.errors).length > 0) {
          const firstErrKey = Object.keys(data.errors)[0];
          errorMessage = `Download failed for ${firstErrKey.replace(':', ' ')}: ${data.errors[firstErrKey]}`;
        } else {
          errorMessage = '';
        }
        
        stopOfflineReconnectPolling();
      } else {
        errorMessage = 'Failed to fetch model status from sidecar backend.';
        startOfflineReconnectPolling();
      }
    } catch (e) {
      errorMessage = 'Sidecar backend offline or unreachable.';
      startOfflineReconnectPolling();
    }
  }

  function startPolling() {
    if (!pollingInterval) {
      pollingInterval = setInterval(async () => {
        if (!document.body.contains(container)) {
          stopPolling();
          return;
        }
        await fetchStatus();
        render();
        if (!modelStatus.downloading || modelStatus.downloading.length === 0) {
          stopPolling();
        }
      }, 2000);
    }
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  function startOfflineReconnectPolling() {
    if (!reconnectInterval) {
      reconnectInterval = setInterval(async () => {
        if (!document.body.contains(container)) {
          stopOfflineReconnectPolling();
          return;
        }
        try {
          let port = 3901;
          if (window.electronAPI) {
            port = await window.electronAPI.getSidecarPort();
          }
          const hostname = window.location.hostname || 'localhost';
          const res = await fetch(`http://${hostname}:${port}/health`);
          if (res.ok) {
            stopOfflineReconnectPolling();
            await fetchStatus();
            render();
          }
        } catch (e) {
          // Still offline
        }
      }, 3000);
    }
  }

  function stopOfflineReconnectPolling() {
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
  }

  async function triggerDownload(modelType, modelName) {
    if (localStorage.getItem('internetAccessAllowed') === 'false') {
      errorMessage = "Internet access is disabled in Settings. Please enable it to download models.";
      render();
      return;
    }

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
      const hostname = window.location.hostname || 'localhost';
      const res = await fetch(`http://${hostname}:${port}/engines/models/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_type: modelType, model_name: modelName })
      });
      if (res.ok) {
        startPolling();
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

  function formatBytes(bytes) {
    if (!bytes) return '0.0 MB';
    const m = bytes / (1024 * 1024);
    if (m >= 1000) {
      return (m / 1024).toFixed(1) + ' GB';
    }
    return m.toFixed(1) + ' MB';
  }

  async function init() {
    await fetchStatus();
    render();
    if (modelStatus.downloading && modelStatus.downloading.length > 0) {
      startPolling();
    }
  }

  function render() {
    const asrModels = [
      { name: 'Whisper Base', key: 'base', size: '281.1 MB', cpu: 'Light', desc: 'Default pre-installed model. Fast and fits most normal transcription tasks.' },
      { name: 'Whisper Small', key: 'small', size: '922.2 MB', cpu: 'Medium', desc: 'Balanced accuracy and resource usage. Requires download.' },
      { name: 'Whisper Medium', key: 'medium', size: '1.51 GB', cpu: 'Heavy', desc: 'High accuracy for complex audio or multiple accents. Requires download.' },
      { name: 'Whisper Large', key: 'large', size: '3.0 GB', cpu: 'Very Heavy', desc: 'Maximum accuracy model. Slow on low-end CPUs. Requires download.' },
      { name: 'Whisper Turbo', key: 'turbo', size: '1.6 GB', cpu: 'Heavy', desc: 'Optimized large model. High accuracy with faster runtime. Requires download.' }
    ];

    const ttsModels = [
      { name: 'Kokoro 82M', key: 'kokoro', size: '82.0 MB', cpu: 'Light', desc: 'Ultra lightweight, high-fidelity local speech synthesis. Pre-installed model.' },
      { name: 'Qwen TTS 1.7B', key: 'qwen_1_7b', size: '3.4 GB', cpu: 'Very Heavy', desc: 'High-fidelity speech synthesis based on Qwen-Audio. Requires download.' },
      { name: 'Qwen TTS 0.6B', key: 'qwen_0_6b', size: '1.2 GB', cpu: 'Heavy', desc: 'Balanced quality and performance version of Qwen TTS. Requires download.' },
      { name: 'Qwen CustomVoice 1.7B', key: 'qwen_custom_1_7b', size: '3.4 GB', cpu: 'Very Heavy', desc: 'Personalized voice cloning model based on Qwen. Requires download.' },
      { name: 'Qwen CustomVoice 0.6B', key: 'qwen_custom_0_6b', size: '1.2 GB', cpu: 'Heavy', desc: 'Lightweight personal voice cloning model. Requires download.' },
      { name: 'LuxTTS (Fast, CPU-friendly)', key: 'luxtts', size: '45.0 MB', cpu: 'Light', desc: 'Extremely fast and lightweight voice generation optimized for low-end CPUs. Requires download.' },
      { name: 'Chatterbox TTS (Multilingual)', key: 'chatterbox_tts', size: '350.0 MB', cpu: 'Medium', desc: 'Natural sounding voice synthesis across multiple languages. Requires download.' },
      { name: 'Chatterbox Turbo (English, Tags)', key: 'chatterbox_turbo', size: '180.0 MB', cpu: 'Light', desc: 'High speed English generation with support for emotional state tags. Requires download.' },
      { name: 'TADA 1B (English)', key: 'tada_1b', size: '2.0 GB', cpu: 'Heavy', desc: 'Advanced text-to-speech model optimized for expressive English speech. Requires download.' },
      { name: 'TADA 3B Multilingual', key: 'tada_3b', size: '6.0 GB', cpu: 'Very Heavy', desc: 'Large scale multilingual speech synthesis with high vocal detail. Requires download.' }
    ];

    container.innerHTML = `
      <style>
        .models-container {
          animation: fade-in-models 350ms cubic-bezier(0.16, 1, 0.3, 1) both;
          max-width: 1000px;
          margin: 0 auto;
        }
        @keyframes fade-in-models {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .section-title {
          font-family: var(--ff-display);
          font-size: 11px;
          font-weight: 700;
          color: var(--clr-text-faint);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: var(--sp-3);
          margin-top: var(--sp-6);
        }
        .models-list {
          border: 1px solid var(--clr-border);
          border-radius: var(--radius-lg);
          background: var(--clr-bg-subtle);
          overflow: hidden;
          margin-bottom: var(--sp-6);
        }
        .model-row {
          border-bottom: 1px solid var(--clr-border);
          transition: background var(--dur-fast) ease;
        }
        .model-row:last-child {
          border-bottom: none;
        }
        .model-row:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .model-row-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          cursor: pointer;
          user-select: none;
        }
        .model-row-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .model-status-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
        }
        .model-row-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--clr-text);
        }
        .model-row-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .model-row-size {
          font-size: 12px;
          color: var(--clr-text-muted);
        }
        .model-row-arrow {
          display: flex;
          align-items: center;
          color: var(--clr-text-faint);
          transition: transform var(--dur-fast) ease;
        }
        .model-row.expanded .model-row-arrow {
          transform: rotate(90deg);
        }
        .model-row-details {
          padding: 0 20px 20px 52px;
          animation: slide-down-details var(--dur-fast) ease both;
          overflow: hidden;
        }
        @keyframes slide-down-details {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 250px; }
        }
        .model-details-desc {
          font-size: 12px;
          color: var(--clr-text-muted);
          line-height: 1.5;
          margin: 0 0 10px 0;
        }
        .model-details-meta {
          font-size: 11px;
          color: var(--clr-text-faint);
          margin-bottom: 12px;
        }
        .model-details-meta strong {
          color: var(--clr-text-muted);
        }
        
        /* Themed Download Progress Track matching user specification */
        .download-progress-box {
          margin-top: 8px;
        }
        .download-progress-track {
          width: 100%;
          height: 4px;
          background: var(--clr-border-med);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        .download-progress-bar {
          height: 100%;
          background: var(--clr-primary);
          border-radius: var(--radius-full);
          transition: width 300ms ease;
        }
        .download-progress-text {
          font-size: 11px;
          color: var(--clr-primary);
          margin-top: 6px;
          font-weight: 500;
        }

        .spinner-models-ring {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(212, 163, 89, 0.2);
          border-top-color: var(--clr-primary);
          border-radius: 50%;
          animation: spin-models 1s linear infinite;
        }
        @keyframes spin-models {
          to { transform: rotate(360deg); }
        }
      </style>
      <div class="page-container page-sections models-container">
        <div class="page-header" style="margin-bottom: var(--sp-4);">
          <h1 class="page-title">Model <span class="page-title-sub">Management</span></h1>
          <p class="page-subtitle">Configure offline AI models for transcription and text-to-speech</p>
        </div>

        ${errorMessage ? `
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: var(--radius-lg); padding: var(--sp-4); color: #ef4444; font-size: var(--fs-sm); display: flex; gap: var(--sp-2); align-items: center; margin-bottom: var(--sp-4);">
            <span>${Utils.icons.info}</span>
            <span>${errorMessage}</span>
          </div>
        ` : ''}

        ${currentModelsDir ? `
          <div style="padding: var(--sp-3) var(--sp-4); display: flex; align-items: center; justify-content: space-between; border: 1px solid var(--clr-border); border-radius: var(--radius-lg); background: var(--clr-bg-subtle); margin-bottom: var(--sp-3);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="display: flex; color: var(--clr-text-faint);">${Utils.icons.folder || `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
              `}</span>
              <span style="font-size: 11px; font-family: var(--ff-mono); color: var(--clr-text-faint);">${currentModelsDir}</span>
            </div>
          </div>
        ` : ''}

        <div>
          <h2 class="section-title">Transcription Models (ASR)</h2>
          <div class="models-list">
            ${asrModels.map(model => renderModelRow('asr', model)).join('')}
          </div>
        </div>

        <div>
          <h2 class="section-title">Speech Synthesis Models (TTS)</h2>
          <div class="models-list">
            ${ttsModels.map(model => renderModelRow('tts', model)).join('')}
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function renderModelRow(type, model) {
    const key = `${type}:${model.key}`;
    const installed = type === 'asr' ? modelStatus.asr[model.key] : modelStatus.tts[model.key];
    const downloading = isDownloading[key];
    const expanded = expandedModelKey === key;

    // Status Icon selection
    let statusIcon = '';
    if (installed) {
      statusIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      `;
    } else if (downloading) {
      statusIcon = `<div class="spinner-models-ring"></div>`;
    } else {
      statusIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--clr-text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" x2="12" y1="15" y2="3"/>
        </svg>
      `;
    }

    const chevronIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m9 18 6-6-6-6"/>
      </svg>
    `;

    // Action / Progress segment inside expanded zone
    let actionHtml = '';
    if (installed) {
      actionHtml = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <span style="font-size: 12px; color: #10b981; font-weight: 500;">✓ Model installed and ready to run.</span>
          <button class="btn btn-secondary btn-sm btn-delete-model" data-type="${type}" data-name="${model.key}" style="border-radius: var(--radius-full); padding: 5px 12px; font-size: 11px; color: #ef4444; border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.05); font-weight: 600;">
            Remove Model
          </button>
        </div>
      `;
    } else if (downloading) {
      const prog = (modelStatus.progress && modelStatus.progress[key]) || { percentage: 5, downloaded: 0, total: 0 };
      const downloadedStr = formatBytes(prog.downloaded);
      const totalStr = formatBytes(prog.total);
      
      actionHtml = `
        <div class="download-progress-box">
          <div class="download-progress-track">
            <div class="download-progress-bar" style="width: ${prog.percentage}%"></div>
          </div>
          <div class="download-progress-text">
            ${downloadedStr} / ${totalStr} (${prog.percentage}%)
          </div>
        </div>
      `;
    } else {
      actionHtml = `
        <button class="btn btn-primary btn-sm btn-dl" data-type="${type}" data-name="${model.key}" style="background: white; color: black; font-weight: bold; border-radius: var(--radius-full); padding: 6px 14px; font-size: 11px;">
          Download
        </button>
      `;
    }

    return `
      <div class="model-row ${expanded ? 'expanded' : ''}" data-model-key="${key}">
        <div class="model-row-header">
          <div class="model-row-left">
            <span class="model-status-icon">${statusIcon}</span>
            <span class="model-row-name">${model.name}</span>
          </div>
          <div class="model-row-right">
            <span class="model-row-size">${model.size}</span>
            <span class="model-row-arrow">${chevronIcon}</span>
          </div>
        </div>
        ${expanded ? `
          <div class="model-row-details">
            <p class="model-details-desc">${model.desc}</p>
            <div class="model-details-meta">CPU Requirement: <strong>${model.cpu}</strong></div>
            <div class="model-details-action">
              ${actionHtml}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function bindEvents() {
    // Accordion toggle expand on row header click
    container.querySelectorAll('.model-row-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('.btn-dl') || e.target.closest('.btn-delete-model')) return;
        const row = header.closest('.model-row');
        const key = row.getAttribute('data-model-key');
        
        // Single expand accordion logic
        if (expandedModelKey === key) {
          expandedModelKey = null;
        } else {
          expandedModelKey = key;
        }
        render();
      });
    });

    // Trigger download
    container.querySelectorAll('.btn-dl').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.getAttribute('data-type');
        const name = btn.getAttribute('data-name');
        triggerDownload(type, name);
      });
    });

    // Trigger delete
    container.querySelectorAll('.btn-delete-model').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const type = btn.getAttribute('data-type');
        const name = btn.getAttribute('data-name');
        if (confirm(`Are you sure you want to remove the ${name} model from local disk?`)) {
          try {
            let port = 3901;
            if (window.electronAPI) {
              port = await window.electronAPI.getSidecarPort();
            }
            const hostname = window.location.hostname || 'localhost';
            const res = await fetch(`http://${hostname}:${port}/engines/models/delete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ model_type: type, model_name: name })
            });
            if (res.ok) {
              await fetchStatus();
              render();
            } else {
              const err = await res.json();
              throw new Error(err.detail || 'Deletion failed');
            }
          } catch (e) {
            errorMessage = `Failed to delete model: ${e.message}`;
            render();
          }
        }
      });
    });
  }

  init();
}

Router.register('dashboard/models', renderModelsPage);
