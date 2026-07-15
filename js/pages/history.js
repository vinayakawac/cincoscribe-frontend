/* ===== History Page ===== */

function renderHistoryPage(container) {
  let selectedIdx = AppState.history.length > 0 ? 0 : null;

  function render() {
    const items = AppState.history;

    // Safety bounds check
    if (items.length > 0) {
      if (selectedIdx === null || selectedIdx >= items.length) {
        selectedIdx = 0;
      }
    } else {
      selectedIdx = null;
    }

    container.innerHTML = `
      <div class="page-container">
        <div class="page-header" style="margin-bottom: 0;">
          <h1 class="page-title">Transcription <span class="page-title-sub">History</span></h1>
          <p class="page-subtitle">View, copy, and download your past audio transcriptions</p>
        </div>

        ${items.length === 0 ? `
          <div class="empty-state" style="margin-top: var(--sp-8);">
            <div class="empty-icon" style="display:flex; justify-content:center; align-items:center;">${Utils.icons.clipboard}</div>
            <p class="empty-title">No transcriptions yet</p>
            <p class="empty-desc">Your transcription history will appear here after you transcribe your first audio file.</p>
            <button class="btn btn-primary btn-sm" style="margin-top:var(--sp-4);" onclick="Router.navigate('dashboard/transcribe')">Start Transcribing</button>
          </div>
        ` : `
          <div class="split-layout" style="grid-template-columns: 1fr 1.3fr;">
            <div class="layout-main" style="display:flex; flex-direction:column; gap:var(--sp-3);">
              <div class="history-list">
                ${items.map((item, idx) => `
                  <div class="history-item ${selectedIdx === idx ? 'selected' : ''}" data-select-history="${idx}">
                    <div class="history-info">
                      <p class="history-name" style="font-size:14px; font-weight:var(--fw-medium); margin-bottom:4px; line-height:1.4;" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</p>
                      <div class="history-item-meta" style="font-size:11px;">
                        <span>${Utils.formatDate(item.date)}</span>
                        <span>${Utils.formatDuration(item.duration)}</span>
                        <span>${Utils.formatNumber(item.wordCount)} words</span>
                        <span style="display:inline-flex; align-items:center; gap:4px;">
                          ${item.mode === 'accuracy' ? Utils.icons.target : Utils.icons.bolt}
                          ${item.mode === 'accuracy' ? 'Accuracy' : 'Fast'}
                        </span>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="layout-sidebar">
              ${renderDetailsPane(items[selectedIdx])}
            </div>
          </div>
        `}
      </div>
    `;
    bindEvents();
  }

  function renderDetailsPane(activeItem) {
    if (!activeItem) return '';
    return `
      <div class="card" style="display:flex; flex-direction:column; gap:var(--sp-4); border-color:var(--clr-border);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:var(--sp-4);">
          <div style="min-width:0;">
            <h3 class="transcript-title" style="margin:0; font-size:var(--fs-sm); font-weight:var(--fw-semibold); color:var(--clr-text); word-break:break-all;" title="${escapeHtml(activeItem.name)}">${escapeHtml(activeItem.name)}</h3>
            <p style="font-size:11px; color:var(--clr-text-faint); margin:4px 0 0 0;">Transcribed on ${Utils.formatDate(activeItem.date)}</p>
          </div>
          <div style="display:flex; gap:var(--sp-2); flex-shrink:0;">
            <button class="btn-ghost btn-sm" id="btn-copy-history" title="Copy transcript">${Utils.icons.copy} Copy</button>
            <button class="btn-ghost btn-sm" id="btn-download-history" title="Download transcript">${Utils.icons.download} Download</button>
            <button class="btn-ghost btn-sm" id="btn-delete-history" style="color:var(--clr-error);" title="Delete entry">${Utils.icons.trash} Delete</button>
          </div>
        </div>

        <div class="transcript-stats" style="border:1px solid var(--clr-border); background:var(--clr-bg-subtle); padding:10px 14px; border-radius:var(--radius-lg); margin:0; font-size:11px;">
          <span><span class="stat-label">Duration </span><span class="stat-value">${Utils.formatDuration(activeItem.duration)}</span></span>
          <span><span class="stat-label">Words </span><span class="stat-value">${Utils.formatNumber(activeItem.wordCount)}</span></span>
          <span><span class="stat-label">Language </span><span class="stat-value" style="text-transform: capitalize;">${activeItem.language || 'auto'}</span></span>
        </div>

        <!-- Scrollable text content block -->
        <div class="textarea-wrapper" style="flex:1; display:flex; flex-direction:column; min-height:360px; max-height:calc(100vh - 280px);">
          <pre style="margin:0; padding:var(--sp-4); overflow-y:auto; flex:1; font-size:var(--fs-sm); font-family:var(--ff-mono); line-height:1.6; white-space:pre-wrap; word-break:break-word; background:var(--clr-bg-code); color:var(--clr-text); border-radius:var(--radius-lg); border:1px solid var(--clr-border-med);">${escapeHtml(activeItem.text)}</pre>
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
    // Select history item
    document.querySelectorAll('[data-select-history]').forEach(item => {
      item.addEventListener('click', () => {
        selectedIdx = parseInt(item.getAttribute('data-select-history'));
        render();
      });
    });

    const copyBtn = document.getElementById('btn-copy-history');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const item = AppState.history[selectedIdx];
        if (item) {
          Utils.copyToClipboard(item.text);
          Utils.showToast('Copied to clipboard');
        }
      });
    }

    const dlBtn = document.getElementById('btn-download-history');
    if (dlBtn) {
      dlBtn.addEventListener('click', () => {
        const item = AppState.history[selectedIdx];
        if (item) {
          const name = item.name.replace(/\.[^.]+$/, '');
          Utils.downloadText(item.text, name + '_transcript.txt');
        }
      });
    }

    const delBtn = document.getElementById('btn-delete-history');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        const item = AppState.history[selectedIdx];
        if (item) {
          AppState.history.splice(selectedIdx, 1);
          AppState.save();
          if (AppState.history.length === 0) {
            selectedIdx = null;
          } else if (selectedIdx >= AppState.history.length) {
            selectedIdx = AppState.history.length - 1;
          }
          render();
          Utils.showToast('Deleted');
        }
      });
    }
  }

  render();
}

Router.register('dashboard/history', renderHistoryPage);
