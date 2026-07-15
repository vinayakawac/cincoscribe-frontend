/* ===== Merge Audio Page ===== */

function renderMergeAudioPage(container) {
  let files = [];
  let isMerging = false;
  let mergedBlob = null;

  function render() {
    container.innerHTML = `
      <div class="page-container page-sections">
        <div class="page-header">
          <h1 class="page-title">Merge <span class="page-title-sub">Audio Files</span></h1>
          <p class="page-subtitle">Combine multiple audio files into a single track — completely free</p>
        </div>

        <div class="upload-zone" id="merge-upload-zone">
          <input type="file" accept="audio/*" multiple id="merge-file-input">
          <div class="upload-zone-content">
            <div class="upload-icon-wrapper">
              ${Utils.icons.layers}
            </div>
            <p class="upload-title">Drop audio files here or click to browse</p>
            <p class="upload-subtitle">Add 2 or more audio files to merge them in order</p>
          </div>
        </div>

        ${files.length > 0 ? `
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-2);">
              <span style="font-size:var(--fs-sm); font-weight:var(--fw-medium); color:var(--clr-text);">${files.length} file${files.length !== 1 ? 's' : ''} added</span>
              <button class="btn-ghost" id="btn-clear-all">${Utils.icons.trash} Clear all</button>
            </div>
            <div class="merge-file-list">
              ${files.map((f, i) => `
                <div class="merge-file-item">
                  <span class="merge-file-item-name">${f.name}</span>
                  <span class="merge-file-item-size">${Utils.formatFileSize(f.size)}</span>
                  <button class="merge-file-remove" data-remove="${i}" title="Remove">${Utils.icons.x}</button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <button class="btn btn-primary" id="btn-merge" ${files.length < 2 || isMerging ? 'disabled' : ''} style="width:100%">
          ${isMerging ? 'Merging audio...' : `Merge ${files.length} File${files.length !== 1 ? 's' : ''}`}
        </button>

        ${mergedBlob ? `
          <div class="card">
            <div class="card-body" style="display:flex; flex-direction:column; align-items:center; gap:var(--sp-4);">
              <div style="display:flex; align-items:center; gap:var(--sp-2); color:var(--clr-text); font-size:var(--fs-sm); font-weight:var(--fw-medium);">
                ${Utils.icons.check} Merge Complete
              </div>
              <audio controls id="merged-audio" style="width:100%; max-width:400px;"></audio>
              <button class="btn btn-outline btn-sm" id="btn-download-merged">${Utils.icons.download} Download Merged Audio</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
    bindEvents();

    // Set audio src after DOM is in place
    if (mergedBlob) {
      const audio = document.getElementById('merged-audio');
      if (audio) audio.src = URL.createObjectURL(mergedBlob);
    }
  }

  function bindEvents() {
    const zone = document.getElementById('merge-upload-zone');
    const fileInput = document.getElementById('merge-file-input');

    if (zone && fileInput) {
      zone.addEventListener('click', () => fileInput.click());
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
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-remove'));
        files.splice(idx, 1);
        mergedBlob = null;
        render();
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
