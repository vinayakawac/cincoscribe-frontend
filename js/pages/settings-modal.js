/* ===== Settings Page — CincoScribe (free, MIT) ===== */
/* All license, activation, and LemonSqueezy code removed.  */

async function renderSettingsPage(container) {
  let settings = { language: 'auto', whisperMode: 'base', modelsDir: '', internetAccessAllowed: true };

  if (window.electronAPI && window.electronAPI.getSettings) {
    try {
      settings = await window.electronAPI.getSettings();
    } catch (e) {
      console.warn('[Settings] Could not load settings:', e.message);
    }
  }

  let language = settings.language || 'auto';
  let whisperMode = settings.whisperMode || 'base';
  let modelsDir = settings.modelsDir || '';
  let internetAccessAllowed = settings.internetAccessAllowed !== false;

  if (AppState.internetAccessAllowed !== undefined) {
    internetAccessAllowed = AppState.internetAccessAllowed;
  }
  
  let activeTab = 'general';
  let isServerOnline = false;
  let logsInterval = null;
  let logsText = 'Loading logs...';

  // Check server health
  async function checkServerHealth() {
    try {
      let port = 3901;
      if (window.electronAPI) {
        port = await window.electronAPI.getSidecarPort();
      }
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      isServerOnline = res.ok;
    } catch (e) {
      isServerOnline = false;
    }
  }

  // Polling for server logs
  function startLogsPolling() {
    stopLogsPolling();
    fetchLogs();
    logsInterval = setInterval(fetchLogs, 1500);
  }

  function stopLogsPolling() {
    if (logsInterval) {
      clearInterval(logsInterval);
      logsInterval = null;
    }
  }

  async function fetchLogs() {
    try {
      let port = 3901;
      if (window.electronAPI) {
        port = await window.electronAPI.getSidecarPort();
      }
      const res = await fetch(`http://127.0.0.1:${port}/logs`);
      if (res.ok) {
        const data = await res.json();
        logsText = data.logs.join('\n') || 'No logs recorded.';
        const logsEl = document.getElementById('terminal-logs');
        if (logsEl) {
          const atBottom = logsEl.scrollHeight - logsEl.clientHeight - logsEl.scrollTop < 100;
          logsEl.value = logsText;
          if (atBottom) {
            logsEl.scrollTop = logsEl.scrollHeight;
          }
        }
      }
    } catch (e) {
      logsText = 'Could not fetch logs from sidecar backend.';
      const logsEl = document.getElementById('terminal-logs');
      if (logsEl) logsEl.value = logsText;
    }
  }

  async function clearLogs() {
    try {
      let port = 3901;
      if (window.electronAPI) {
        port = await window.electronAPI.getSidecarPort();
      }
      await fetch(`http://127.0.0.1:${port}/logs/clear`, { method: 'POST' });
      logsText = 'Logs cleared.';
      const logsEl = document.getElementById('terminal-logs');
      if (logsEl) logsEl.value = '';
    } catch (e) {
      console.error('Failed to clear logs:', e);
    }
  }

  async function init() {
    await checkServerHealth();
    render();
  }

  function render() {
    container.innerHTML = `
      <style>
        .settings-container {
          animation: fade-up 280ms cubic-bezier(0.16,1,0.3,1) both;
          width: 100%;
        }
        .settings-tab-btn {
          background: none;
          border: none;
          color: var(--clr-text-muted);
          font-size: 14px;
          font-weight: 500;
          padding: 8px 0;
          cursor: pointer;
          position: relative;
          transition: color 150ms ease;
        }
        .settings-tab-btn:hover {
          color: var(--clr-text);
        }
        .settings-tab-btn.active {
          color: var(--clr-text);
          font-weight: 600;
        }
        .settings-tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -9px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: var(--clr-text);
        }
        .social-card {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--sp-4);
          background: var(--clr-bg-subtle);
          border: 1px solid var(--clr-border);
          border-radius: var(--radius-lg);
          text-decoration: none;
          transition: all 200ms ease;
        }
        .social-card:hover {
          background: var(--clr-bg-muted);
          border-color: oklch(0.3 0 0);
          transform: translateY(-1px);
        }
        .setting-group {
          border-bottom: 1px solid var(--clr-border);
          padding: var(--sp-5) 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--sp-4);
        }
        .setting-group-vertical {
          border-bottom: 1px solid var(--clr-border);
          padding: var(--sp-5) 0;
          display: flex;
          flex-direction: column;
          gap: var(--sp-3);
        }
        .setting-info {
          flex-grow: 1;
          max-width: 70%;
        }
        .setting-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--clr-text);
          margin: 0;
        }
        .setting-desc {
          font-size: 12px;
          color: var(--clr-text-muted);
          margin: 4px 0 0 0;
          line-height: 1.4;
        }
      </style>

      <div class="page-container settings-container">
        <!-- Tab Header -->
        <div style="display: flex; gap: var(--sp-6); border-bottom: 1px solid var(--clr-border); padding-bottom: var(--sp-2); margin-bottom: var(--sp-6); overflow-x: auto; white-space: nowrap; -webkit-overflow-scrolling: touch;">
          <button class="settings-tab-btn ${activeTab === 'general' ? 'active' : ''}" data-tab="general">General</button>
          <button class="settings-tab-btn ${activeTab === 'generation' ? 'active' : ''}" data-tab="generation">Generation</button>
          <button class="settings-tab-btn ${activeTab === 'gpu' ? 'active' : ''}" data-tab="gpu">GPU</button>
          <button class="settings-tab-btn ${activeTab === 'logs' ? 'active' : ''}" data-tab="logs">Logs</button>
          <button class="settings-tab-btn ${activeTab === 'about' ? 'active' : ''}" data-tab="about">About</button>
        </div>

        <!-- Tab Body -->
        <div id="settings-tab-content">
          ${renderTabContent()}
        </div>
      </div>
    `;

    bindEvents();
    
    if (activeTab === 'logs') {
      startLogsPolling();
    } else {
      stopLogsPolling();
    }
  }

  function renderTabContent() {
    if (activeTab === 'general') {
      return `
        <!-- Links -->
        <div style="display: flex; gap: var(--sp-4); margin-bottom: var(--sp-6);">
          <a class="social-card" href="https://ko-fi.com/vinayaka" target="_blank">
            <div>
              <p style="font-size: 13px; font-weight: 600; color: var(--clr-text); margin: 0;">Support on Ko-fi</p>
              <p style="font-size: 11px; color: var(--clr-text-muted); margin: 2px 0 0 0;">Consider donating to support development</p>
            </div>
            <span style="color: var(--clr-text-muted); font-size: 14px;">↗</span>
          </a>
          <a class="social-card" href="https://github.com/vinayakawac/CincoScribe" target="_blank">
            <div>
              <p style="font-size: 13px; font-weight: 600; color: var(--clr-text); margin: 0;">Join the GitHub</p>
              <p style="font-size: 11px; color: var(--clr-text-muted); margin: 2px 0 0 0;">View codebase and report issues</p>
            </div>
            <span style="color: var(--clr-text-muted); font-size: 14px;">↗</span>
          </a>
        </div>

        <!-- Server URL -->
        <div class="setting-group">
          <div class="setting-info">
            <h4 class="setting-label">Server URL</h4>
            <p class="setting-desc">The address of your CincoScribe sidecar backend server.</p>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: var(--sp-2); width: 40%; min-width: 200px;">
            <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase;">
              <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: ${isServerOnline ? '#10b981' : '#ef4444'};"></span>
              <span style="color: ${isServerOnline ? '#10b981' : '#ef4444'};">${isServerOnline ? 'Online' : 'Offline'}</span>
            </div>
            <input
              id="settings-server-url"
              type="text"
              value="http://127.0.0.1:3901"
              disabled
              style="width: 100%; padding: 6px 10px; background: var(--clr-bg); border: 1px solid var(--clr-border); color: var(--clr-text-muted); border-radius: var(--radius); font-size: 12px; font-family: var(--ff-mono);"
            />
          </div>
        </div>

        <!-- Default Language -->
        <div class="setting-group">
          <div class="setting-info">
            <h4 class="setting-label">Language</h4>
            <p class="setting-desc">Choose the default transcription target language.</p>
          </div>
          <select id="settings-language" style="padding: 6px 10px; background: var(--clr-bg); border: 1px solid var(--clr-border); color: var(--clr-text); border-radius: var(--radius); font-size: 13px; min-width: 150px;">
            ${[
              ['auto', 'Auto Detect'],
              ['en', 'English'],
              ['hi', 'Hindi'],
              ['ar', 'Arabic'],
              ['zh', 'Chinese'],
              ['es', 'Spanish'],
              ['fr', 'French'],
              ['de', 'German'],
              ['pt', 'Portuguese'],
              ['ru', 'Russian'],
              ['ja', 'Japanese'],
              ['ko', 'Korean'],
            ].map(([val, label]) =>
              `<option value="${val}" ${language === val ? 'selected' : ''}>${label}</option>`
            ).join('')}
          </select>
        </div>

        <!-- Internet Access -->
        <div class="setting-group">
          <div class="setting-info">
            <h4 class="setting-label">Internet Access</h4>
            <p class="setting-desc">Permit downloading models and checking for updates online.</p>
          </div>
          <select id="settings-internet" style="padding: 6px 10px; background: var(--clr-bg); border: 1px solid var(--clr-border); color: var(--clr-text); border-radius: var(--radius); font-size: 13px; min-width: 150px;">
            <option value="true" ${internetAccessAllowed === true ? 'selected' : ''}>On</option>
            <option value="false" ${internetAccessAllowed === false ? 'selected' : ''}>Off</option>
          </select>
        </div>

        <!-- Theme Selection -->
        <div class="setting-group" style="border-bottom: none;">
          <div class="setting-info">
            <h4 class="setting-label">Theme</h4>
            <p class="setting-desc">Match your system appearance, or select dark view mode.</p>
          </div>
          <select id="settings-theme" style="padding: 6px 10px; background: var(--clr-bg); border: 1px solid var(--clr-border); color: var(--clr-text); border-radius: var(--radius); font-size: 13px; min-width: 150px;">
            <option value="dark" selected>Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        <!-- Footer Action -->
        <div style="display: flex; justify-content: flex-end; margin-top: var(--sp-6);">
          <button id="btn-save-settings" class="btn btn-primary">Save Settings</button>
          <span id="save-status" style="display: none; margin-left: 12px; align-self: center; font-size: 13px; color: #10b981;">Saved!</span>
        </div>
      `;
    } else if (activeTab === 'generation') {
      return `
        <!-- Default Model Size -->
        <div class="setting-group" style="padding-top: 0;">
          <div class="setting-info">
            <h4 class="setting-label">Default Whisper Model</h4>
            <p class="setting-desc">Select the default model size target used during new local audio transcriptions.</p>
          </div>
          <select id="settings-whisper-mode" style="padding: 6px 10px; background: var(--clr-bg); border: 1px solid var(--clr-border); color: var(--clr-text); border-radius: var(--radius); font-size: 13px; min-width: 150px;">
            <option value="base" ${whisperMode === 'base' ? 'selected' : ''}>Whisper Base</option>
            <option value="small" ${whisperMode === 'small' ? 'selected' : ''}>Whisper Small</option>
            <option value="medium" ${whisperMode === 'medium' ? 'selected' : ''}>Whisper Medium</option>
            <option value="large" ${whisperMode === 'large' ? 'selected' : ''}>Whisper Large</option>
            <option value="turbo" ${whisperMode === 'turbo' ? 'selected' : ''}>Whisper Turbo</option>
          </select>
        </div>

        <!-- Models Folder Path -->
        <div class="setting-group-vertical" style="border-bottom: none;">
          <div>
            <h4 class="setting-label">Models Storage Path</h4>
            <p class="setting-desc">Local directory where Whisper ASR and Voice TTS models are saved. Downloaded files migrate automatically when changed.</p>
          </div>
          <div style="display: flex; gap: 8px;">
            <input
              id="settings-models-dir"
              type="text"
              value="${escapeHtml(modelsDir)}"
              placeholder="Storage path..."
              style="flex: 1; padding: 8px 12px; background: var(--clr-bg); border: 1px solid var(--clr-border); color: var(--clr-text); border-radius: var(--radius); font-size: 13px; box-sizing: border-box;"
            />
            ${window.electronAPI && window.electronAPI.selectDirectory ? `
              <button id="btn-browse-models-dir" class="btn btn-secondary" style="font-size: 12px; padding: 0 12px; height: 36px;">Browse...</button>
            ` : ''}
          </div>
        </div>

        <!-- Footer Action -->
        <div style="display: flex; justify-content: flex-end; margin-top: var(--sp-6);">
          <button id="btn-save-settings" class="btn btn-primary">Save Settings</button>
          <span id="save-status" style="display: none; margin-left: 12px; align-self: center; font-size: 13px; color: #10b981;">Saved!</span>
        </div>
      `;
    } else if (activeTab === 'gpu') {
      return `
        <div style="text-align: center; padding: var(--sp-8) 0; display: flex; flex-direction: column; align-items: center; gap: var(--sp-4);">
          <div style="font-size: 48px; color: var(--clr-text-muted); margin-bottom: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
              <line x1="6" y1="6" x2="6.01" y2="6"/>
              <line x1="6" y1="18" x2="6.01" y2="18"/>
            </svg>
          </div>
          <div>
            <h3 style="font-family: var(--ff-display); font-size: 18px; font-weight: 700; color: var(--clr-text); margin: 0;">GPU Acceleration</h3>
            <p style="font-size: 13px; color: var(--clr-text-muted); margin: 6px 0 0 0;">Coming Soon</p>
          </div>
          <p style="font-size: 13px; color: var(--clr-text-faint); max-width: 420px; line-height: 1.5; margin: 0;">
            Local hardware acceleration (NVIDIA CUDA, Apple Silicon CoreML, and Windows DirectML) is currently under active development and will be released in an upcoming update for all users.
          </p>
        </div>
      `;
    } else if (activeTab === 'logs') {
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--sp-3);">
          <div>
            <h4 class="setting-label">Server Logs</h4>
            <p class="setting-desc">Live output streams from the local Python sidecar process.</p>
          </div>
          <button id="btn-clear-logs" class="btn btn-secondary btn-sm" style="padding: 4px 12px; font-size: 12px; height: 28px;">Clear</button>
        </div>
        <textarea
          id="terminal-logs"
          readonly
          style="width: 100%; height: 350px; background: #000; border: 1px solid var(--clr-border); border-radius: var(--radius-lg); font-family: var(--ff-mono); font-size: 12px; color: #10b981; padding: 16px; box-sizing: border-box; resize: vertical; line-height: 1.5; outline: none;"
        >${escapeHtml(logsText)}</textarea>
      `;
    } else if (activeTab === 'about') {
      return `
        <div style="text-align: center; padding: var(--sp-6) 0; display: flex; flex-direction: column; align-items: center; gap: var(--sp-4);">
          <div style="font-size: 48px; color: var(--clr-text-muted); margin-bottom: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
          </div>
          <div>
            <h2 style="font-family: var(--ff-display); font-size: 22px; font-weight: 700; color: var(--clr-text); margin: 0;">CincoScribe</h2>
            <p style="font-size: 12px; color: var(--clr-text-faint); margin: 4px 0 0 0;">v0.1.0</p>
          </div>
          <p style="font-size: 13px; color: var(--clr-text-muted); max-width: 480px; line-height: 1.5; margin: 0;">
            The open-source local transcription and voice synthesis studio. Transcribe audio, synthesize speech, and run voice models locally on your CPU.
          </p>
          <p style="font-size: 12px; color: var(--clr-text-faint); margin: 0;">
            Created by <span style="color: var(--clr-text-muted); font-weight: 600;">Vinayaka</span>
          </p>
          <div style="display: flex; gap: 12px; margin-top: 8px;">
            <a href="https://ko-fi.com/vinayaka" target="_blank" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none; font-size: 13px; padding: 6px 16px;">
              Support on Ko-fi
            </a>
            <a href="https://github.com/vinayakawac/CincoScribe" target="_blank" class="btn btn-secondary" style="display: inline-flex; align-items: center; gap: 6px; text-decoration: none; font-size: 13px; padding: 6px 16px;">
              GitHub Repository
            </a>
          </div>
          <p style="font-size: 11px; color: var(--clr-text-faint); margin-top: var(--sp-4);">Licensed under MIT License • 100% Offline & Private</p>
        </div>
      `;
    }
    return '';
  }

  function escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function bindEvents() {
    // Tab switching
    container.querySelectorAll('.settings-tab-btn[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-tab');
        render();
      });
    });

    // Save Settings
    document.getElementById('btn-save-settings')?.addEventListener('click', async () => {
      language = document.getElementById('settings-language')?.value || language;
      whisperMode = document.getElementById('settings-whisper-mode')?.value || whisperMode;
      modelsDir = document.getElementById('settings-models-dir')?.value || modelsDir;
      const internetVal = document.getElementById('settings-internet')?.value === 'true';
      internetAccessAllowed = internetVal;

      AppState.internetAccessAllowed = internetVal;
      localStorage.setItem('internetAccessAllowed', internetVal ? 'true' : 'false');
      AppState.save();

      if (window.electronAPI && window.electronAPI.saveSettings) {
        await window.electronAPI.saveSettings({ language, whisperMode, modelsDir, internetAccessAllowed });
      }

      const statusEl = document.getElementById('save-status');
      if (statusEl) {
        statusEl.style.display = 'inline';
        setTimeout(() => { statusEl.style.display = 'none'; }, 2000);
      }
    });

    // Browse Directory
    document.getElementById('btn-browse-models-dir')?.addEventListener('click', async () => {
      if (window.electronAPI && window.electronAPI.selectDirectory) {
        const result = await window.electronAPI.selectDirectory();
        if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
          const dirInput = document.getElementById('settings-models-dir');
          if (dirInput) dirInput.value = result.filePaths[0];
        }
      }
    });

    // Clear Logs
    document.getElementById('btn-clear-logs')?.addEventListener('click', () => {
      clearLogs();
    });
  }

  // Auto scroll terminal to bottom on tab load
  setTimeout(() => {
    const logsEl = document.getElementById('terminal-logs');
    if (logsEl) logsEl.scrollTop = logsEl.scrollHeight;
  }, 100);

  init();
}

Router.register('dashboard/settings', renderSettingsPage);
