/* ===== CincoScribe Hash-based SPA Router ===== */

const Router = {
  routes: {},
  currentRoute: null,

  register(hash, renderFn) {
    this.routes[hash] = renderFn;
  },

  init() {
    window.addEventListener('hashchange', () => this._resolve());
    this._resolve();
  },

  _resolve() {
    let rawHash = window.location.hash || '#dashboard/transcribe';
    let route = rawHash.replace(/^#\/?/, '');
    route = route.split('?')[0].replace(/\/+$/, '');
    if (!route) route = 'dashboard/transcribe';

    const aliases = {
      'tts': 'dashboard/text-to-voice',
      'text-to-voice': 'dashboard/text-to-voice',
      'dashboard/tts': 'dashboard/text-to-voice',
      'transcribe': 'dashboard/transcribe',
      'merge': 'dashboard/merge-audio',
      'merge-audio': 'dashboard/merge-audio',
      'history': 'dashboard/history',
      'models': 'dashboard/models',
      'settings': 'dashboard/settings'
    };

    if (aliases[route]) {
      route = aliases[route];
    }

    if (this.routes[route]) {
      this.currentRoute = route;
      const main = document.getElementById('page-content');
      
      if (main) {
        main.innerHTML = '';
        try {
          this.routes[route](main);
        } catch (err) {
          console.error(`Error rendering route '${route}':`, err);
          main.innerHTML = `
            <div style="padding: 40px; text-align: center; color: var(--clr-text, #fff);">
              <h2 style="color: #ef4444; font-size: 18px; margin-bottom: 12px;">Failed to Load Page</h2>
              <p style="color: var(--clr-text-muted, #a3a3a3); font-size: 13px; font-family: var(--ff-mono, monospace); line-height: 1.5; word-break: break-word;">${err.stack || err.message || err}</p>
            </div>
          `;
        }
      }
      Sidebar.setActive(route);

      if (window.updateTopbarTitle) {
        window.updateTopbarTitle(route);
      }
    } else {
      const main = document.getElementById('page-content');
      if (main) {
        console.error('Route not found:', route, 'Available routes:', Object.keys(this.routes));
        main.innerHTML = `
          <div style="padding: 40px; text-align: center; color: white;">
            <h2 style="color: #ef4444;">Route Not Found: ${route}</h2>
            <p>Available routes: ${Object.keys(this.routes).join(', ')}</p>
            <p>Check the developer console (Ctrl+Shift+I) for script loading errors.</p>
            <br>
            <button style="padding: 8px 16px; background: #333; color: #fff; border-radius: 4px; border: none; cursor: pointer;" onclick="window.location.hash='#dashboard/transcribe'">Go to Transcribe</button>
          </div>
        `;
      }
    }
  },

  navigate(route) {
    let r = route;
    if (r.startsWith('/')) {
      r = r.slice(1);
    }
    window.location.hash = '#/' + r;
  },
};
