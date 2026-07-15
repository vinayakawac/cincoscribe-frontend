/* ===== Transcribe Page — Real Whisper Transcription ===== */

function renderTranscribePage(container) {
  let selectedFile = null;
  let fileDuration = 0;
  let modelSize = 'base'; // 'base' | 'small' | 'medium' | 'large' | 'turbo'
  let language = 'en';
  let isTranscribing = false;
  let statusMessage = '';
  let progressPct = 0;
  let transcript = null;
  let liveTranscript = [];
  let activeTranscriptTab = 'timestamps'; // 'timestamps' | 'plain'

  function render() {
    container.innerHTML = `
      <div class="page-container">
        ${renderHeader()}
        <div class="split-layout">
          <div class="layout-main">
            ${renderUploadZone()}
            ${isTranscribing ? renderProgress() : ''}
            ${transcript ? renderTranscript() : ''}
          </div>
          <div class="layout-sidebar">
            ${renderModeCards()}
            ${renderActionRow()}
          </div>
        </div>
      </div>
    `;
    bindEvents();
    
    // Set preview source if file selected
    if (selectedFile && !isTranscribing) {
      const preview = document.getElementById('preview-audio');
      if (preview) {
        preview.src = URL.createObjectURL(selectedFile);
      }
    }
  }

  function renderHeader() {
    return `
      <div class="page-header" style="margin-bottom: 0;">
        <h1 class="page-title">Turn Audio Into <span class="page-title-sub">Accurate Text</span></h1>
        <p class="page-subtitle">Upload any audio for AI transcription powered by Whisper</p>
      </div>
    `;
  }

  function renderUploadZone() {
    if (selectedFile) {
      const isW = isTranscribing;
      return `
        <div class="uploaded-file-card">
          <div class="uploaded-file-header">
            <div class="uploaded-file-icon">
              ${Utils.icons.music}
            </div>
            <div class="uploaded-file-details">
              <p class="uploaded-file-name-text" title="${escapeHtml(selectedFile.name)}">${escapeHtml(selectedFile.name)}</p>
              <div class="uploaded-file-meta-text">
                <span>${Utils.formatFileSize(selectedFile.size)}</span>
                <span>•</span>
                <span>${fileDuration ? Utils.formatDuration(fileDuration) : 'Calculating...'}</span>
              </div>
            </div>
            <div class="uploaded-file-actions">
              <div class="waveform-simulation ${isW ? 'active' : ''}">
                <div class="waveform-bar"></div>
                <div class="waveform-bar"></div>
                <div class="waveform-bar"></div>
                <div class="waveform-bar"></div>
                <div class="waveform-bar"></div>
                <div class="waveform-bar"></div>
                <div class="waveform-bar"></div>
                <div class="waveform-bar"></div>
              </div>
              <button class="btn-icon-sm" id="btn-remove-file" title="Remove file" ${isW ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}>
                ${Utils.icons.x}
              </button>
            </div>
          </div>
          ${!isW && fileDuration ? `
            <div style="margin-top: var(--sp-2);">
              <audio id="preview-audio" controls style="width: 100%; height: 32px; border-radius: var(--radius-md); accent-color: var(--clr-primary);"></audio>
            </div>
          ` : ''}
        </div>
      `;
    }
    return `
      <div class="upload-zone" id="upload-zone">
        <input type="file" accept="audio/*,video/mp4,video/webm" id="file-input">
        <div class="upload-zone-content">
          <div class="upload-icon-wrapper">
            ${Utils.icons.upload}
          </div>
          <p class="upload-title">Drop audio here or click to browse</p>
          <p class="upload-subtitle">MP3 · WAV · M4A · OGG · FLAC · WebM · Max 100MB</p>
          <div class="upload-hint">
            <span style="display:flex; align-items:center; gap:4px;">${Utils.icons.lightbulb} Have audio in multiple parts?</span>
            <a href="#/dashboard/merge-audio">Merge them first</a>
            <span>for best results.</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderModeCards() {
    const disabled = isTranscribing;
    const models = [
      { id: 'base', name: 'Whisper Base', size: '~145MB', desc: 'Light CPU. Standard speed & accuracy. (Pre-installed)' },
      { id: 'small', name: 'Whisper Small', size: '~460MB', desc: 'Medium CPU. Better details, internet required.' },
      { id: 'medium', name: 'Whisper Medium', size: '~1.5GB', desc: 'Heavy CPU. High accuracy, internet required.' },
      { id: 'large', name: 'Whisper Large', size: '~3.0GB', desc: 'Very Heavy CPU. Highest accuracy, internet required.' },
      { id: 'turbo', name: 'Whisper Turbo', size: '~1.6GB', desc: 'Heavy CPU. Speed-optimized, internet required.' }
    ];

    return `
      <div class="settings-section-card">
        <label class="settings-section-title">Transcription Model</label>
        <div class="option-card-grid">
          ${models.map(m => `
            <div class="option-card ${modelSize === m.id ? 'selected' : ''} ${disabled ? 'disabled' : ''}" data-model-id="${m.id}" style="${disabled ? 'pointer-events: none; opacity: 0.6;' : ''}">
              <div class="option-card-info">
                <div class="option-card-title-row">
                  <span class="option-card-name">
                    ${Utils.icons.target} ${m.name}
                  </span>
                  <span class="option-card-badge">${m.size}</span>
                </div>
                <p class="option-card-desc">${m.desc}</p>
              </div>
              <div class="mode-radio"></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderActionRow() {
    const disabled = !selectedFile || isTranscribing;
    return `
      <div class="settings-section-card">
        <label class="settings-section-title">Language &amp; Action</label>
        <div style="display:flex; flex-direction:column; gap:var(--sp-3);">
          <div class="select-wrapper">
            <select id="lang-select" ${disabled ? 'disabled' : ''} style="width: 100%;">
              <option value="auto">Auto-detect Language</option>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="ar">Arabic</option>
              <option value="zh">Chinese</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="pt">Portuguese</option>
              <option value="ru">Russian</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="it">Italian</option>
              <option value="tr">Turkish</option>
              <option value="ur">Urdu</option>
              <option value="bn">Bengali</option>
              <option value="pa">Punjabi</option>
              <option value="id">Indonesian</option>
              <option value="ms">Malay</option>
              <option value="nl">Dutch</option>
              <option value="pl">Polish</option>
              <option value="sv">Swedish</option>
              <option value="fa">Persian</option>
              <option value="vi">Vietnamese</option>
              <option value="th">Thai</option>
            </select>
            <span class="select-chevron">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
          </div>
          <button class="btn btn-primary" id="btn-transcribe" ${disabled ? 'disabled' : ''} style="width: 100%;">
            Transcribe Audio
          </button>
        </div>
      </div>
    `;
  }

  function renderProgress() {
    return `
      <div class="transcript-panel">
        <div class="progress-container" id="progress-area">
          <div class="progress-bar-wrapper">
            <div class="progress-bar-fill" id="progress-bar" style="width:${progressPct}%"></div>
          </div>
          <p class="progress-label" id="progress-status">${statusMessage || 'Preparing...'}</p>
          <p class="progress-percent" id="progress-pct">${Math.round(progressPct)}%</p>
        </div>
        ${liveTranscript.length > 0 ? `
        <div class="live-transcript-box">
          <div class="live-transcript-header">
            <span style="display:flex;align-items:center;">${Utils.icons.bolt}</span>
            <span>Agent is thinking (Transcribing live)...</span>
          </div>
          <div class="live-transcript-content" id="live-transcript-content">
            ${escapeHtml(liveTranscript.map(c => c.text).join(' '))}
            <span class="live-transcript-cursor"></span>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }

  function updateProgress(msg, pct, liveChunk) {
    if (msg !== null) statusMessage = msg;
    if (pct !== null && pct !== undefined) progressPct = pct;

    if (liveChunk) {
      liveTranscript.push(liveChunk);
      const liveEl = document.getElementById('live-transcript-content');
      if (liveEl) {
        const cursor = liveEl.querySelector('.live-transcript-cursor');
        if (cursor) cursor.remove();

        liveEl.appendChild(document.createTextNode((liveTranscript.length > 1 ? ' ' : '') + liveChunk.text.trim()));

        const newCursor = document.createElement('span');
        newCursor.className = 'live-transcript-cursor';
        liveEl.appendChild(newCursor);

        liveEl.scrollTop = liveEl.scrollHeight;
      } else {
        render(); // First chunk received, re-render to show box
      }
    } else {
      const bar = document.getElementById('progress-bar');
      const status = document.getElementById('progress-status');
      const pctEl = document.getElementById('progress-pct');
      if (bar) bar.style.width = progressPct + '%';
      if (status) status.textContent = statusMessage;
      if (pctEl) pctEl.textContent = Math.round(progressPct) + '%';
    }
  }

  function renderTranscript() {
    const formatted = transcript.formatted;
    const plainText = transcript.text;
    const textToShow = activeTranscriptTab === 'timestamps' ? formatted : plainText;

    return `
      <div class="transcript-panel">
        <div class="transcript-header">
          <div class="transcript-title">
            ${Utils.icons.check}
            Transcript
          </div>
          <div class="transcript-actions">
            <button class="btn-ghost" id="btn-copy">${Utils.icons.copy} Copy</button>
            <button class="btn-ghost" id="btn-download">${Utils.icons.download} Download</button>
          </div>
        </div>

        <div class="layout-tabs" style="margin: 0; padding: 0 10px; background: var(--clr-bg-subtle); border-bottom: 1px solid var(--clr-border);">
          <div class="layout-tab ${activeTranscriptTab === 'timestamps' ? 'active' : ''}" data-tab-id="timestamps">Timestamps</div>
          <div class="layout-tab ${activeTranscriptTab === 'plain' ? 'active' : ''}" data-tab-id="plain">Plain Text</div>
        </div>

        <div class="transcript-stats">
          <span><span class="stat-label">Duration </span><span class="stat-value">${Utils.formatDuration(transcript.duration)}</span></span>
          <span><span class="stat-label">Words </span><span class="stat-value">${Utils.formatNumber(transcript.wordCount)}</span></span>
          <span><span class="stat-label">Segments </span><span class="stat-value">${Utils.formatNumber(transcript.segmentCount)}</span></span>
        </div>
        <div class="transcript-body" style="background: var(--clr-bg-code);">
          <pre style="margin: 0; white-space: pre-wrap;">${escapeHtml(textToShow)}</pre>
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function bindEvents() {
    const zone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');

    if (zone && fileInput) {
      zone.addEventListener('click', (e) => {
        if (e.target.id === 'btn-remove-file' || e.target.closest('#btn-remove-file')) return;
        fileInput.click();
      });

      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
      });
      zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
      });
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
      });

      fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) handleFile(fileInput.files[0]);
      });
    }

    const removeBtn = document.getElementById('btn-remove-file');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFile = null;
        fileDuration = 0;
        transcript = null;
        render();
      });
    }

    document.querySelectorAll('[data-model-id]').forEach(card => {
      card.addEventListener('click', () => {
        if (isTranscribing) return;
        modelSize = card.getAttribute('data-model-id');
        render();
      });
    });

    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
      langSelect.value = language;
      langSelect.addEventListener('change', () => {
        language = langSelect.value;
      });
    }

    const transcribeBtn = document.getElementById('btn-transcribe');
    if (transcribeBtn) {
      transcribeBtn.addEventListener('click', startTranscription);
    }

    document.querySelectorAll('.layout-tab[data-tab-id]').forEach(tab => {
      tab.addEventListener('click', () => {
        activeTranscriptTab = tab.getAttribute('data-tab-id');
        render();
      });
    });

    const copyBtn = document.getElementById('btn-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const textToCopy = activeTranscriptTab === 'timestamps' ? transcript.formatted : transcript.text;
        Utils.copyToClipboard(textToCopy);
      });
    }

    const downloadBtn = document.getElementById('btn-download');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const textToDownload = activeTranscriptTab === 'timestamps' ? transcript.formatted : transcript.text;
        const name = selectedFile ? selectedFile.name.replace(/\.[^.]+$/, '') : 'transcript';
        const suffix = activeTranscriptTab === 'timestamps' ? '_timestamps.txt' : '_plain.txt';
        Utils.downloadText(textToDownload, name + suffix);
      });
    }
  }

  async function handleFile(file) {
    const error = Utils.validateAudioFile(file);
    if (error) {
      Utils.showToast(error);
      return;
    }
    selectedFile = file;
    transcript = null;
    fileDuration = await Utils.getAudioDuration(file);
    render();
  }

  async function startTranscription() {
    if (!selectedFile || isTranscribing) return;

    isTranscribing = true;
    transcript = null;
    liveTranscript = [];
    progressPct = 0;
    statusMessage = 'Initializing Whisper AI...';
    render();

    try {
      const whisper = window.WhisperTranscriber;

      if (!whisper) {
        throw new Error('WhisperTranscriber not found. Please refresh the page.');
      }

      const useOpenAI = !!(typeof AppState !== 'undefined' && AppState.openAiKey);

      const mode = modelSize === 'base' ? 'accuracy' : 'accuracy';

      // Step 1: Load model if using local transcription
      if (!useOpenAI) {
        const targetModel = whisper.models[mode] || whisper.models.fast;
        const modelSizeLabel = mode === 'accuracy' ? '~74MB' : '~40MB';

        if (!whisper.isReady || whisper.currentLoadedModel !== targetModel) {
          updateProgress('Downloading Whisper AI model (' + modelSize + ')... First time only.', 0);

          let lastFileProgress = {};
          await whisper.loadModel(mode, (data) => {
            if (data.status === 'progress' && data.file) {
              lastFileProgress[data.file] = data.progress || 0;
              const values = Object.values(lastFileProgress);
              const avg = values.reduce((a, b) => a + b, 0) / values.length;
              updateProgress(
                'Downloading model: ' + data.file.split('/').pop() + '...',
                Math.min(avg * 0.5, 50)
              );
            } else if (data.status === 'ready') {
              updateProgress('Model loaded! Starting transcription...', 50);
            }
          });
        }

        // Double-check the model actually loaded
        if (!whisper.isReady) {
          throw new Error('Model failed to load. Please refresh the page and try again.');
        }
      }

      // Step 2: Transcribe
      if (!useOpenAI) {
        updateProgress('Transcribing audio with local Whisper AI (' + mode + ' mode)... This may take a minute.', 55);
      }

      const result = await whisper.transcribe(selectedFile, language, mode, (msg, pct, liveChunk) => {
        updateProgress(msg, pct, liveChunk);
      });

      updateProgress('Processing results...', 95);

      // Step 3: Parse results
      const chunks = result.chunks || [];
      const fullText = result.text || '';
      const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length;
      const duration = fileDuration || 60;

      // Format with timestamps
      let formatted;
      if (chunks.length > 0) {
        formatted = chunks.map(chunk => {
          const start = chunk.timestamp?.[0] ?? 0;
          return '[' + Utils.formatTimestamp(start) + '] ' + chunk.text.trim();
        }).join('\n');
      } else {
        formatted = '[0:00] ' + fullText;
      }

      transcript = {
        text: fullText,
        formatted: formatted,
        duration: duration,
        wordCount: wordCount,
        segmentCount: chunks.length || 1,
      };

      // Save to history
      AppState.addHistory({
        name: selectedFile.name,
        mode: modelSize,
        language: language,
        duration: duration,
        wordCount: wordCount,
        segmentCount: transcript.segmentCount,
        text: formatted,
      });

      Utils.showToast('Transcription complete!');

    } catch (err) {
      console.error('Transcription error:', err);
      Utils.showToast('Transcription failed: ' + (err.message || 'Unknown error'));
    }

    isTranscribing = false;
    progressPct = 100;
    render();
  }

  render();
}

Router.register('dashboard/transcribe', renderTranscribePage);
