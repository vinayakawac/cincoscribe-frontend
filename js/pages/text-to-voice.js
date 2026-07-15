/* ===== Text to Voice Page ===== */

function renderTextToVoicePage(container) {
  let text = '';
  let selectedVoice = 'Bruno';
  let speed = 1.0;
  let modelSize = 'nano'; // 'nano' | 'micro' | 'mini'
  let isGenerating = false;
  let progressPct = 0;
  let statusMessage = '';
  let generatedAudioBase64 = null;
  let generatedAudioDuration = 0;

  const voices = [
    { name: 'Bella', gender: 'Female', tag: 'Clear' },
    { name: 'Jasper', gender: 'Male', tag: 'Warm' },
    { name: 'Luna', gender: 'Female', tag: 'Soft' },
    { name: 'Bruno', gender: 'Male', tag: 'Deep' },
    { name: 'Rosie', gender: 'Female', tag: 'Expressive' },
    { name: 'Hugo', gender: 'Male', tag: 'Formal' },
    { name: 'Kiki', gender: 'Female', tag: 'Energetic' },
    { name: 'Leo', gender: 'Male', tag: 'Friendly' }
  ];

  function render() {
    container.innerHTML = `
      <div class="page-container">
        ${renderHeader()}
        <div class="split-layout">
          <div class="layout-main">
            ${renderTextInputZone()}
            ${isGenerating ? renderProgress() : ''}
            ${generatedAudioBase64 ? renderAudioPlayer() : ''}
          </div>
          <div class="layout-sidebar">
            ${renderSettingsGrid()}
            ${renderVoiceGrid()}
            ${renderActionRow()}
          </div>
        </div>
      </div>
    `;
    bindEvents();
  }

  function renderHeader() {
    return `
      <div class="page-header" style="margin-bottom: 0;">
        <h1 class="page-title">Turn Text Into <span class="page-title-sub">Natural Voice</span></h1>
        <p class="page-subtitle">Type or paste any text to generate high-quality voice output using KittenTTS</p>
      </div>
    `;
  }

  function renderTextInputZone() {
    return `
      <div class="card" style="display:flex; flex-direction:column; gap:var(--sp-3); border-color:var(--clr-border);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <label class="form-label" style="margin-bottom:0;">Input Text</label>
          ${text.trim() ? `<button class="btn-ghost" id="btn-clear-text" style="padding: 2px 8px; font-size: 11px;">Clear Text</button>` : ''}
        </div>
        <div class="textarea-wrapper">
          <textarea class="textarea" id="tts-text-input" placeholder="Type or paste your text here to convert it to speech..." maxlength="2000" style="min-height: 200px;">${escapeHtml(text)}</textarea>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:var(--fs-xs); color:var(--clr-text-faint);">
          <span>Max 2,000 characters</span>
          <span id="char-counter" class="badge badge-primary">${text.length} / 2,000</span>
        </div>
      </div>
    `;
  }

  function renderSettingsGrid() {
    return `
      <!-- Model Selection -->
      <div class="settings-section-card">
        <label class="settings-section-title">Voice Synthesis Engine</label>
        <div class="option-card-grid">
          <div class="option-card ${modelSize === 'nano' ? 'selected' : ''}" data-model-size="nano">
            <div class="option-card-info">
              <div class="option-card-title-row">
                <span class="option-card-name">
                  ${Utils.icons.bolt} KittenTTS Nano
                </span>
                <span class="option-card-badge">~25MB</span>
              </div>
              <p class="option-card-desc">15M params. Ultra-fast voice synthesis.</p>
            </div>
            <div class="mode-radio"></div>
          </div>
          
          <div class="option-card ${modelSize === 'micro' ? 'selected' : ''}" data-model-size="micro">
            <div class="option-card-info">
              <div class="option-card-title-row">
                <span class="option-card-name">
                  ${Utils.icons.target} KittenTTS Micro
                </span>
                <span class="option-card-badge">~65MB</span>
              </div>
              <p class="option-card-desc">40M params. Balanced speed and quality.</p>
            </div>
            <div class="mode-radio"></div>
          </div>

          <div class="option-card ${modelSize === 'mini' ? 'selected' : ''}" data-model-size="mini">
            <div class="option-card-info">
              <div class="option-card-title-row">
                <span class="option-card-name">
                  ${Utils.icons.sparkles} KittenTTS Mini
                </span>
                <span class="option-card-badge">~130MB</span>
              </div>
              <p class="option-card-desc">80M params. Highest speech naturalness.</p>
            </div>
            <div class="mode-radio"></div>
          </div>
        </div>
      </div>

      <!-- Speed control -->
      <div class="settings-section-card">
        <label class="settings-section-title">Speech Speed: <span id="speed-val" style="color:var(--clr-primary-text); font-family:var(--ff-display); font-weight:var(--fw-bold);">${speed.toFixed(1)}x</span></label>
        <div style="display:flex; align-items:center; gap:var(--sp-3); padding: var(--sp-2) 0;">
          <span style="font-size:var(--fs-xs); color:var(--clr-text-faint); font-family:var(--ff-display);">0.5x</span>
          <input type="range" id="speed-slider" min="0.5" max="2.0" step="0.1" value="${speed}" style="flex:1; accent-color:var(--clr-primary);">
          <span style="font-size:var(--fs-xs); color:var(--clr-text-faint); font-family:var(--ff-display);">2.0x</span>
        </div>
        <div class="info-strip" style="margin: 0; padding: 10px 12px; background: var(--clr-primary-subtle); border-color: var(--clr-border);">
          <span class="info-strip-icon">${Utils.icons.info}</span>
          <span style="font-size: 11px;">Adjusts how fast the output is spoken.</span>
        </div>
      </div>
    `;
  }

  function renderVoiceGrid() {
    return `
      <div class="settings-section-card">
        <label class="settings-section-title">Voice Profile</label>
        <div class="voice-grid" style="grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: var(--sp-2);">
          ${voices.map(voice => `
            <div class="voice-card ${selectedVoice === voice.name ? 'selected' : ''}" data-voice-name="${voice.name}" style="padding: 10px; gap: var(--sp-2); border-radius: var(--radius-lg);">
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <div class="voice-card-name" style="font-size: 13px;">${voice.name}</div>
                <div class="mode-radio" style="width: 14px; height: 14px; border-width: 1.5px;"></div>
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; font-size: 10px; color: var(--clr-text-faint);">
                <span>${voice.gender}</span>
                <span class="voice-tag" style="font-size: 8px; padding: 1px 4px; margin:0;">${voice.tag}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderActionRow() {
    const disabled = !text.trim() || isGenerating;
    return `
      <div class="settings-section-card">
        <button class="btn btn-primary" id="btn-generate-speech" ${disabled ? 'disabled' : ''} style="width:100%;">
          Generate Voice
        </button>
      </div>
    `;
  }

  function renderProgress() {
    return `
      <div class="transcript-panel">
        <div class="progress-container">
          <div class="progress-bar-wrapper">
            <div class="progress-bar-fill" id="progress-bar" style="width:${progressPct}%"></div>
          </div>
          <p class="progress-label" id="progress-status">${statusMessage || 'Preparing...'}</p>
          <p class="progress-percent" id="progress-pct">${Math.round(progressPct)}%</p>
        </div>
      </div>
    `;
  }

  function renderAudioPlayer() {
    return `
      <div class="audio-player-wrap" style="border-color: var(--clr-border);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="transcript-title" style="margin:0; font-size: var(--fs-sm);">Generated Speech Output</div>
          <div class="transcript-actions">
            <button class="btn-ghost" id="btn-download-speech">${Utils.icons.download} Download .wav</button>
          </div>
        </div>
        
        <!-- Hidden real audio element -->
        <audio id="tts-audio-player" src="data:audio/wav;base64,${generatedAudioBase64}" style="display:none;"></audio>
        
        <!-- Custom styled controls -->
        <div class="custom-audio-player">
          <button class="custom-player-btn" id="custom-play-pause-btn">
            ${Utils.icons.play}
          </button>
          <div class="custom-player-timeline">
            <span class="custom-player-time" id="player-time-current">0:00</span>
            <div class="custom-player-slider" id="player-slider">
              <div class="custom-player-progress" id="player-progress"></div>
            </div>
            <span class="custom-player-time" id="player-time-duration">0:00</span>
          </div>
        </div>

        <div class="transcript-stats" style="border:none; background:none; padding:0; margin-top:0; font-size:11px;">
          <span><span class="stat-label">Voice Profile </span><span class="stat-value">${selectedVoice}</span></span>
          <span><span class="stat-label">Speed </span><span class="stat-value">${speed.toFixed(1)}x</span></span>
        </div>
      </div>
    `;
  }

  function updateProgress(msg, pct) {
    statusMessage = msg;
    progressPct = pct;
    const bar = document.getElementById('progress-bar');
    const status = document.getElementById('progress-status');
    const pctEl = document.getElementById('progress-pct');
    if (bar) bar.style.width = progressPct + '%';
    if (status) status.textContent = statusMessage;
    if (pctEl) pctEl.textContent = Math.round(progressPct) + '%';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function bindEvents() {
    const textInput = document.getElementById('tts-text-input');
    if (textInput) {
      textInput.addEventListener('input', () => {
        text = textInput.value;
        const charCounter = document.getElementById('char-counter');
        if (charCounter) {
          charCounter.textContent = `${text.length} / 2,000`;
        }
        const generateBtn = document.getElementById('btn-generate-speech');
        if (generateBtn) {
          generateBtn.disabled = !text.trim() || isGenerating;
        }
      });
    }

    const clearTextBtn = document.getElementById('btn-clear-text');
    if (clearTextBtn) {
      clearTextBtn.addEventListener('click', () => {
        text = '';
        render();
      });
    }

    document.querySelectorAll('[data-model-size]').forEach(card => {
      card.addEventListener('click', () => {
        modelSize = card.getAttribute('data-model-size');
        render();
      });
    });

    const speedSlider = document.getElementById('speed-slider');
    if (speedSlider) {
      speedSlider.addEventListener('input', () => {
        speed = parseFloat(speedSlider.value);
        const speedVal = document.getElementById('speed-val');
        if (speedVal) speedVal.textContent = `${speed.toFixed(1)}x`;
      });
    }

    document.querySelectorAll('[data-voice-name]').forEach(card => {
      card.addEventListener('click', () => {
        selectedVoice = card.getAttribute('data-voice-name');
        render();
      });
    });

    const generateBtn = document.getElementById('btn-generate-speech');
    if (generateBtn) {
      generateBtn.addEventListener('click', startSpeechGeneration);
    }

    const downloadBtn = document.getElementById('btn-download-speech');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (!generatedAudioBase64) return;
        const raw = window.atob(generatedAudioBase64);
        const rawLength = raw.length;
        const array = new Uint8Array(new ArrayBuffer(rawLength));
        for (let i = 0; i < rawLength; i++) {
          array[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([array], { type: 'audio/wav' });
        Utils.downloadBlob(blob, `speech_${selectedVoice.toLowerCase()}_${Date.now()}.wav`);
      });
    }

    // Custom Audio Player bindings
    const realAudio = document.getElementById('tts-audio-player');
    const playPauseBtn = document.getElementById('custom-play-pause-btn');
    const timeCurrent = document.getElementById('player-time-current');
    const timeDuration = document.getElementById('player-time-duration');
    const progressFill = document.getElementById('player-progress');
    const playerSlider = document.getElementById('player-slider');

    if (realAudio && playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        if (realAudio.paused) {
          realAudio.play();
          playPauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg>`;
        } else {
          realAudio.pause();
          playPauseBtn.innerHTML = Utils.icons.play;
        }
      });

      realAudio.addEventListener('timeupdate', () => {
        const cur = realAudio.currentTime;
        const dur = realAudio.duration || 0;
        if (timeCurrent) timeCurrent.textContent = Utils.formatTimestamp(cur);
        if (timeDuration && dur) timeDuration.textContent = Utils.formatTimestamp(dur);
        if (progressFill && dur > 0) {
          progressFill.style.width = (cur / dur * 100) + '%';
        }
      });

      realAudio.addEventListener('loadedmetadata', () => {
        const dur = realAudio.duration || 0;
        if (timeDuration && dur) timeDuration.textContent = Utils.formatTimestamp(dur);
      });

      realAudio.addEventListener('ended', () => {
        playPauseBtn.innerHTML = Utils.icons.play;
        if (progressFill) progressFill.style.width = '0%';
        if (timeCurrent) timeCurrent.textContent = '0:00';
      });

      if (playerSlider) {
        playerSlider.addEventListener('click', (e) => {
          const rect = playerSlider.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const percentage = clickX / rect.width;
          const dur = realAudio.duration || 0;
          if (dur > 0) {
            realAudio.currentTime = percentage * dur;
          }
        });
      }
    }
  }

  async function startSpeechGeneration() {
    if (!text.trim() || isGenerating) return;

    isGenerating = true;
    generatedAudioBase64 = null;
    progressPct = 0;
    statusMessage = 'Initializing KittenTTS AI engine...';
    render();

    try {
      updateProgress('Loading voice model and synthesis pipeline...', 25);

      const response = await window.electronAPI.generateSpeech({
        text: text.trim(),
        voice: selectedVoice,
        speed: speed,
        modelSize: modelSize
      });

      if (response && response.success && response.audioData) {
        updateProgress('Processing synthesized audio...', 90);
        
        generatedAudioBase64 = response.audioData;
        generatedAudioDuration = response.duration || 0;

        // Add to history
        AppState.addHistory({
          name: `Voice: ${text.trim().substring(0, 30)}${text.trim().length > 30 ? '...' : ''}`,
          mode: `KittenTTS ${modelSize.charAt(0).toUpperCase() + modelSize.slice(1)}`,
          language: 'en',
          duration: generatedAudioDuration,
          wordCount: response.word_count || text.trim().split(/\s+/).length,
          segmentCount: 1,
          text: `[Speech Synthesis - Voice: ${selectedVoice}, Speed: ${speed}x]\n\n${text.trim()}`
        });

        Utils.showToast('Speech generation complete!');
      } else {
        throw new Error(response ? response.error : 'Invalid response from engine');
      }

    } catch (err) {
      console.error('Speech generation error:', err);
      Utils.showToast('Speech generation failed: ' + (err.message || 'Unknown error'));
    }

    isGenerating = false;
    progressPct = 100;
    render();
  }

  render();
}

Router.register('dashboard/text-to-voice', renderTextToVoicePage);
