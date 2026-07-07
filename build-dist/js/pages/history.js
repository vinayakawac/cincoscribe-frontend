/* ===== History Page ===== */

function renderHistoryPage(container) {

  function render() {
    const items = AppState.history;

    container.innerHTML = `
      <div class="page-container page-sections">
        <div class="page-header">
          <h1 class="page-title">Transcription <span class="page-title-sub">History</span></h1>
          <p class="page-subtitle">View and download your past transcriptions</p>
        </div>

        ${items.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon" style="display:flex; justify-content:center; align-items:center;">${Utils.icons.clipboard}</div>
            <p class="empty-title">No transcriptions yet</p>
            <p class="empty-desc">Your transcription history will appear here after you transcribe your first audio file.</p>
            <button class="btn btn-primary btn-sm" style="margin-top:var(--sp-4);" onclick="Router.navigate('dashboard/transcribe')">Start Transcribing</button>
          </div>
        ` : `
          <div class="history-list">
            ${items.map((item, idx) => `
              <div class="history-item">
                <div class="history-info">
                  <p class="history-name">${escapeHtml(item.name)}</p>
                  <div class="history-item-meta">
                    <span>${Utils.formatDate(item.date)}</span>
                    <span>${Utils.formatDuration(item.duration)}</span>
                    <span>${Utils.formatNumber(item.wordCount)} words</span>
                    <span style="display:flex; align-items:center; gap:4px;">${item.mode === 'accuracy' ? Utils.icons.target + ' Accuracy' : Utils.icons.bolt + ' Fast'}</span>
                  </div>
                </div>
                <div class="history-item-actions">
                  <button class="btn-ghost" data-view="${idx}" title="View transcript">${Utils.icons.eye}</button>
                  <button class="btn-ghost" data-dl="${idx}" title="Download">${Utils.icons.download}</button>
                  <button class="btn-ghost" data-del="${idx}" title="Delete">${Utils.icons.trash}</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- Modal -->
      <div id="history-modal" style="display:none; position:fixed; inset:0; z-index:100; background:var(--clr-overlay); backdrop-filter:blur(4px); display:none; align-items:center; justify-content:center; padding:24px;">
        <div style="background:var(--clr-card); color:var(--clr-text); border:1px solid var(--clr-border-med); border-radius:var(--radius-2xl); max-width:640px; width:100%; max-height:80vh; display:flex; flex-direction:column; box-shadow:var(--shadow-lg);">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid var(--clr-border);">
            <span id="modal-title" style="font-size:var(--fs-sm); font-weight:var(--fw-semibold); color:var(--clr-text);"></span>
            <button id="modal-close" style="color:var(--clr-text-muted); cursor:pointer; display:flex; align-items:center; justify-content:center;">${Utils.icons.x}</button>
          </div>
          <pre id="modal-body" style="padding:16px 20px; overflow-y:auto; flex:1; font-size:var(--fs-sm); font-family:var(--ff-mono); line-height:1.75rem; white-space:pre-wrap; word-break:break-word; background:var(--clr-bg-code); color:var(--clr-text);"></pre>
          <div style="display:flex; gap:8px; padding:12px 20px; border-top:1px solid var(--clr-border); justify-content:flex-end;">
            <button class="btn-ghost" id="modal-copy">${Utils.icons.copy} Copy</button>
            <button class="btn-ghost" id="modal-dl">${Utils.icons.download} Download</button>
          </div>
        </div>
      </div>
    `;
    bindEvents();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  let currentViewIdx = null;

  function bindEvents() {
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-view'));
        showModal(idx);
      });
    });

    document.querySelectorAll('[data-dl]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-dl'));
        const item = AppState.history[idx];
        if (item) {
          const name = item.name.replace(/\.[^.]+$/, '');
          Utils.downloadText(item.text, name + '_transcript.txt');
        }
      });
    });

    document.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-del'));
        AppState.history.splice(idx, 1);
        AppState.save();
        render();
        Utils.showToast('Deleted');
      });
    });
  }

  function showModal(idx) {
    const item = AppState.history[idx];
    if (!item) return;
    currentViewIdx = idx;

    const modal = document.getElementById('history-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const closeBtn = document.getElementById('modal-close');
    const copyBtn = document.getElementById('modal-copy');
    const dlBtn = document.getElementById('modal-dl');

    title.textContent = item.name;
    body.textContent = item.text;
    modal.style.display = 'flex';

    closeBtn.onclick = () => { modal.style.display = 'none'; };
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    copyBtn.onclick = () => Utils.copyToClipboard(item.text);
    dlBtn.onclick = () => {
      const name = item.name.replace(/\.[^.]+$/, '');
      Utils.downloadText(item.text, name + '_transcript.txt');
    };
  }

  render();
}

Router.register('dashboard/history', renderHistoryPage);
