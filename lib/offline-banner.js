(function () {
  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #hive-offline-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.7);
      z-index: 99998;
      pointer-events: auto;
    }

    #hive-offline-banner {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      z-index: 99999;
      background: #f59e0b;
      color: #1a1a1a;
      text-align: center;
      padding: 10px 16px;
      font-family: 'Poppins', sans-serif;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
    }

    #hive-offline-banner.show {
      display: block;
    }

    #hive-offline-banner.error {
      background: #ef4444;
      color: #fff;
    }
  `;
  document.head.appendChild(style);

  // Inject banner HTML
  const overlay = document.createElement('div');
  overlay.id = 'hive-offline-overlay';
  document.body.prepend(overlay);

  const banner = document.createElement('div');
  banner.id = 'hive-offline-banner';
  banner.textContent = 'You are offline. Please check your connection and try again.';
  document.body.prepend(banner);

  // Show/hide based on connection
  function goOffline() {
    overlay.classList.add('show');
    overlay.style.display = 'block';
    banner.className = 'show';
    banner.textContent = 'You are offline. Please check your connection and try again.';
  }

  function goOnline() {
    overlay.style.display = 'none';
    overlay.classList.remove('show');
    banner.classList.remove('error');
    banner.textContent = 'Back online!';
    setTimeout(() => banner.classList.remove('show'), 2500);
  }

  window.addEventListener('offline', goOffline);
  window.addEventListener('online', goOnline);

  // Check on load
  if (!navigator.onLine) goOffline();

  // Global function your Supabase calls can trigger
  window.showDataError = function () {
    banner.classList.add('show', 'error');
    banner.textContent = 'Could not load data. Check your connection.';
  };
})();