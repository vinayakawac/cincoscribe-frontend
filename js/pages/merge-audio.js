/* ===== Merge Audio Page ===== */

function renderMergeAudioPage(container) {
  let files = [];
  let isMerging = false;
  let mergedBlob = null;

  function render() {
    container.innerHTML = `
      <div class="page-container">
        <div class="page-header" style="margin-bottom: 0;">
          <h1 class="page-title">Merge <span class="page-title-sub">Audio Files</span></h1>
          <p class="page-subtitle">Combine multiple audio files into a single track — completely free</p>
        </div>

        <div class="split-layout">
          <div class="layout-main">
            <div class="upload-zone" id="merge-upload-zone" style="${files.length > 0 ? 'padding: 24px var(--sp-4);' : ''}">
              <input type="file" accept="audio/*" multiple id="merge-file-input">
              <div class="upload-zone-content">
                <div class="upload-icon-wrapper" style="${files.length > 0 ? 'width:42px; height:42px; margin-bottom:0;' : ''}">
                  ${Utils.icons.layers}
                </div>
                <p class="upload-title" style="${files.length > 0 ? 'font-size:var(--fs-sm);' : ''}">Drop audio files here or click to browse</p>
                ${files.length === 0 ? `<p class="upload-subtitle">Add 2 or more audio files to merge them in order</p>` : ''}
              </div>
            </div>

            ${files.length > 0 ? renderFileList() : ''}
            ${mergedBlob ? renderMergedResult() : ''}
          </div>

          <div class="layout-sidebar">
            ${renderSidebarStats()}
          </div>
        </div>
      </div>
    `;
    bindEvents();

    if (mergedBlob) {
      const audio = document.getElementById('merged-audio');
      if (audio) audio.src = URL.createObjectURL(mergedBlob);
    }
  }

  function renderFileList() {
    return `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-2);">
          <span class="badge badge-primary">${files.length} file${files.length !== 1 ? 's' : ''} added</span>
          <button class="btn-ghost" id="btn-clear-all" style="color: var(--clr-error);">${Utils.icons.trash} Clear all</button>
        </div>
        <div class="merge-file-list">
          ${files.map((f, i) => {
            const isFirst = i === 0;
            const isLast = i === files.length - 1;
            return `
              <div class="merge-file-item" style="padding: 10px 14px; gap: var(--sp-3);">
                <span class="badge badge-primary" style="font-family: var(--ff-display); font-size: 10px; padding: 2px 6px;">#${i + 1}</span>
                <div class="merge-file-info">
                  <div class="merge-file-name" title="${escapeHtml(f.name)}" style="font-size: 13px;">${escapeHtml(f.name)}</div>
                  <div class="merge-file-meta" style="font-size: 10px;">${Utils.formatFileSize(f.size)}</div>
                </div>
                
                <!-- Up / Down Reorder Controls -->
                <div class="merge-item-controls">
                  <button class="btn-merge-control" data-move-up="${i}" title="Move up" ${isFirst ? 'disabled' : ''}>
                    ${Utils.icons.chevronUp || `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`}
                  </button>
                  <button class="btn-merge-control" data-move-down="${i}" title="Move down" ${isLast ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                </div>

                <button class="merge-file-remove btn-icon-sm" data-remove="${i}" title="Remove file" style="color: var(--clr-error);">
                  ${Utils.icons.x}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderSidebarStats() {
    const disabled = files.length < 2 || isMerging;
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    return `
      <div class="settings-section-card">
        <label class="settings-section-title">Merge summary</label>
        <div class="transcript-stats" style="flex-direction: column; gap: var(--sp-2); border: none; background: none; padding: 0; margin: 0; font-size:11px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="stat-label">Total Files</span>
            <span class="stat-value">${files.length}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="stat-label">Combined Size</span>
            <span class="stat-value">${Utils.formatFileSize(totalSize)}</span>
          </div>
        </div>
        
        <button class="btn btn-primary" id="btn-merge" ${disabled ? 'disabled' : ''} style="width:100%; margin-top: var(--sp-2);">
          ${isMerging ? 'Merging audio...' : `Merge Files`}
        </button>
      </div>
      
      <div class="info-strip" style="background: var(--clr-primary-subtle); border-color: var(--clr-border); margin: 0;">
        <span class="info-strip-icon">${Utils.icons.info}</span>
        <span style="font-size: 11px;">Combine multiple tracks into one sequence. Order them using the arrows, then click Merge.</span>
      </div>
    `;
  }

  function renderMergedResult() {
    return `
      <div class="card" style="border-color: var(--clr-border);">
        <div style="display:flex; flex-direction:column; gap:var(--sp-4);">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:var(--sp-2); color:var(--clr-text); font-size:var(--fs-sm); font-weight:var(--fw-medium);">
              ${Utils.icons.check} Merge Complete
            </div>
            <button class="btn btn-outline btn-sm" id="btn-download-merged">${Utils.icons.download} Download</button>
          </div>
          
          <!-- Hidden real audio -->
          <audio id="merged-audio" style="display:none;"></audio>
          
          <!-- Custom player UI -->
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
    const zone = document.getElementById('merge-upload-zone');
    const fileInput = document.getElementById('merge-file-input');

    if (zone && fileInput) {
      zone.addEventListener('click', (e) => {
        if (e.target.closest('.merge-file-remove') || e.target.closest('.btn-merge-control')) return;
        fileInput.click();
      });
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
      });
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        addFiles(Array.from(e.dataTransfer.files));
      });
      fileInput.addEventListener('change', () => {
        addFiles(Array.from(fileInput.files));
        fileInput.value = '';
      });
    }

    document.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-remove'));
        files.splice(idx, 1);
        mergedBlob = null;
        render();
      });
    });

    document.querySelectorAll('[data-move-up]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-move-up'));
        if (idx > 0) {
          const temp = files[idx];
          files[idx] = files[idx - 1];
          files[idx - 1] = temp;
          mergedBlob = null;
          render();
        }
      });
    });

    document.querySelectorAll('[data-move-down]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-move-down'));
        if (idx < files.length - 1) {
          const temp = files[idx];
          files[idx] = files[idx + 1];
          files[idx + 1] = temp;
          mergedBlob = null;
          render();
        }
      });
    });

    const clearBtn = document.getElementById('btn-clear-all');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        files = [];
        mergedBlob = null;
        render();
      });
    }

    const mergeBtn = document.getElementById('btn-merge');
    if (mergeBtn) {
      mergeBtn.addEventListener('click', mergeFiles);
    }

    const dlBtn = document.getElementById('btn-download-merged');
    if (dlBtn) {
      dlBtn.addEventListener('click', () => {
        if (mergedBlob) Utils.downloadBlob(mergedBlob, 'merged_audio.wav');
      });
    }

    // Custom Player Event Listeners
    const realAudio = document.getElementById('merged-audio');
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

  function addFiles(newFiles) {
    const audioFiles = newFiles.filter(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      return f.type.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm', 'aac'].includes(ext);
    });
    if (audioFiles.length === 0) {
      Utils.showToast('Please select valid audio files.');
      return;
    }
    files = [...files, ...audioFiles];
    mergedBlob = null;
    render();
  }

  async function mergeFiles() {
    if (files.length < 2 || isMerging) return;
    isMerging = true;
    mergedBlob = null;
    render();

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buffers = [];

      for (const file of files) {
        const arrayBuf = await file.arrayBuffer();
        try {
          const audioBuf = await ctx.decodeAudioData(arrayBuf);
          buffers.push(audioBuf);
        } catch {
          Utils.showToast(`Could not decode: ${file.name}`);
        }
      }

      if (buffers.length < 2) {
        Utils.showToast('Need at least 2 decodable audio files.');
        isMerging = false;
        render();
        return;
      }

      // Calculate total length
      const sampleRate = buffers[0].sampleRate;
      const totalLength = buffers.reduce((sum, b) => sum + b.length, 0);
      const merged = ctx.createBuffer(1, totalLength, sampleRate);
      const channel = merged.getChannelData(0);

      let offset = 0;
      for (const buf of buffers) {
        // Resample if needed (simple copy for same sample rate)
        const data = buf.getChannelData(0);
        channel.set(data, offset);
        offset += buf.length;
      }

      // Encode to WAV
      mergedBlob = audioBufferToWav(merged);
      ctx.close();
      Utils.showToast('Audio merged successfully!');
    } catch (err) {
      Utils.showToast('Merge failed: ' + err.message);
    }

    isMerging = false;
    render();
  }

  function audioBufferToWav(buffer) {
    const numCh = 1;
    const sampleRate = buffer.sampleRate;
    const data = buffer.getChannelData(0);
    const length = data.length * 2 + 44;
    const out = new ArrayBuffer(length);
    const view = new DataView(out);

    function ws(o, s) { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); }
    ws(0, 'RIFF');
    view.setUint32(4, length - 8, true);
    ws(8, 'WAVE');
    ws(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numCh, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numCh * 2, true);
    view.setUint16(32, numCh * 2, true);
    view.setUint16(34, 16, true);
    ws(36, 'data');
    view.setUint32(40, data.length * 2, true);

    let off = 44;
    for (let i = 0; i < data.length; i++, off += 2) {
      const s = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([out], { type: 'audio/wav' });
  }

  render();
}

Router.register('dashboard/merge-audio', renderMergeAudioPage);
