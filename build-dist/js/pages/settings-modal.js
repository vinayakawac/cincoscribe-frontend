/* ===== Settings Page ===== */

async function renderSettingsPage(container) {
  let key = null;
  let activatedAt = null;
  
  if (window.electronAPI && window.electronAPI.getStoredActivation) {
    const activation = await window.electronAPI.getStoredActivation();
    if (activation && activation.key) {
      key = activation.key;
      activatedAt = activation.activatedAt;
    }
  }

  container.innerHTML = `
    <div class="page-container" style="max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; animation: fade-up 280ms cubic-bezier(0.16,1,0.3,1) both;">
      
      <!-- Header -->
      <div>
        <h1 style="font-size: 24px; font-weight: 700; font-family: var(--ff-display); margin: 0; color: var(--clr-text);">Settings</h1>
        <p style="font-size: 13px; color: var(--clr-text-muted); margin: 4px 0 0 0;">Manage your license and activation status.</p>
      </div>

      <!-- Plan Card -->
      <div style="border: ${key ? '2px solid #10b981' : '1px solid var(--clr-border)'}; border-radius: var(--radius-lg); padding: 24px; display: flex; flex-direction: column; gap: 16px; background: var(--clr-bg-subtle); position: relative;">
        ${key ? `
          <span style="position: absolute; top: 12px; right: 12px; font-size: 10px; font-weight: 700; color: #10b981; background: rgba(16,185,129,0.1); padding: 2px 8px; border-radius: 10px; text-transform: uppercase;">Active</span>
        ` : `
          <span style="position: absolute; top: 12px; right: 12px; font-size: 10px; font-weight: 700; color: var(--clr-text); background: var(--clr-border); padding: 2px 8px; border-radius: 10px; text-transform: uppercase;">Trial</span>
        `}
        <div>
          <h3 style="font-size: 18px; font-weight: 700; margin: 0; color: var(--clr-text);">${key ? 'Activated License' : '24-Hour Free Trial'}</h3>
          <p style="font-size: 12px; color: var(--clr-text-muted); margin: 4px 0 0 0;">${key ? 'Your desktop application is fully activated.' : 'You are currently using the trial version.'}</p>
        </div>
        
        <ul style="padding: 0; margin: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; font-size: 13px; color: var(--clr-text-muted);">
          <li style="display: flex; align-items: center; gap: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Unlimited processing
          </li>
          <li style="display: flex; align-items: center; gap: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Whisper API (Highest Accuracy)
          </li>
          <li style="display: flex; align-items: center; gap: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Unlimited merging
          </li>
          <li style="display: flex; align-items: center; gap: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Data stays on your machine
          </li>
        </ul>
        
        ${key ? `
          <div style="margin-top: 12px; font-size: 12px; color: var(--clr-text-muted);">
            <strong>License Key:</strong> ${key.substring(0, 4)}...${key.substring(key.length - 4)}<br/>
            <strong>Activated:</strong> ${new Date(activatedAt).toLocaleDateString()}
            <div style="margin-top: 16px;">
              <button id="btn-deactivate" class="btn btn-danger" style="width: 100%; background: #ef4444; color: white; border: none; padding: 10px; border-radius: var(--radius); cursor: pointer; font-weight: 600;">
                Deactivate License on this Device
              </button>
              <div id="deactivate-error" style="color: #ef4444; font-size: 12px; margin-top: 8px; display: none;"></div>
            </div>
          </div>
        ` : `
          <div style="margin-top: 12px; font-size: 12px; color: var(--clr-text-muted);">
            If you have purchased a license, restart the app to enter your activation key.
            <div style="margin-top: 16px;">
              <a href="https://YOUR_LEMON_SQUEEZY_CHECKOUT_URL_HERE" target="_blank" style="text-decoration: none;">
                <button class="btn btn-primary" style="width: 100%; padding: 10px; cursor: pointer; font-weight: 600;">
                  Upgrade Now - Purchase a License
                </button>
              </a>
            </div>
          </div>
        `}
      </div>
    </div>
  `;

  // Bind deactivate button logic
  if (key) {
    const btnDeactivate = container.querySelector('#btn-deactivate');
    const deactivateError = container.querySelector('#deactivate-error');
    
    if (btnDeactivate) {
      btnDeactivate.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to deactivate your license? This device will be locked.')) return;
        
        btnDeactivate.textContent = 'Deactivating...';
        btnDeactivate.disabled = true;
        
        try {
          const result = await window.electronAPI.deactivate(key);
          if (result.valid) {
            await window.electronAPI.clearActivation();
            window.electronAPI.deactivationComplete();
          } else {
            deactivateError.textContent = 'Failed to deactivate: ' + (result.reason || 'Unknown error');
            deactivateError.style.display = 'block';
            btnDeactivate.textContent = 'Deactivate License on this Device';
            btnDeactivate.disabled = false;
          }
        } catch (err) {
          deactivateError.textContent = 'Error: ' + err.message;
          deactivateError.style.display = 'block';
          btnDeactivate.textContent = 'Deactivate License on this Device';
          btnDeactivate.disabled = false;
        }
      });
    }
  }
}

Router.register('dashboard/settings', renderSettingsPage);
