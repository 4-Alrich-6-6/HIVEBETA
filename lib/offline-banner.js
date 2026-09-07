(function () {
  const style = document.createElement('style');
  style.textContent = `
    #hive-offline-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(255, 255, 245, 0.62);
      backdrop-filter: blur(7px);
      -webkit-backdrop-filter: blur(7px);
      z-index: 99998;
    }

    #hive-offline-overlay.show {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    #hive-offline-banner {
      display: none;
      position: relative;
      width: min(100%, 470px);
      box-sizing: border-box;
      z-index: 99999;
      text-align: center;
      padding: 28px 42px 38px;
      border: 1px solid #d7d7d0;
      border-radius: 7px;
      background: #fff;
      color: #111;
      font-family: Arial, sans-serif;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
    }

    #hive-offline-banner.show {
      display: block;
    }

    #hive-offline-banner .hive-offline-icon {
      width: 116px;
      height: 116px;
      margin: 0 auto 18px;
      object-fit: contain;
    }

    #hive-offline-banner h2 {
      margin: 0 0 18px;
      font-family: Inter, Arial, sans-serif;
      font-size: 27px;
      font-weight: 800;
      line-height: 1.15;
    }

    #hive-offline-banner p {
      margin: 0 auto 13px;
      max-width: 250px;
      font-family: Kodchasan, sans-serif;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.35;
    }

    #hive-offline-banner .hive-offline-retry {
      width: 100%;
      border: 0;
      border-radius: 5px;
      padding: 11px 16px;
      background: #ffcc00;
      color: #111;
      font-family: Inter, Arial, sans-serif;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
    }

    #hive-offline-banner .hive-offline-support {
      margin-top: 58px;
      margin-bottom: 0;
      max-width: none;
      font-size: 12px;
    }

    #hive-offline-banner .hive-offline-email {
      color: #111;
      font-family: Inter, Arial, sans-serif;
      font-size: 14px;
      font-weight: 700;
      text-decoration: underline;
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'hive-offline-overlay';
  document.body.prepend(overlay);

  const banner = document.createElement('div');
  banner.id = 'hive-offline-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-modal', 'true');
  banner.setAttribute('aria-labelledby', 'hive-offline-title');
  banner.innerHTML = `
    <img class="hive-offline-icon" src="/assets/bee-flight.svg" alt="">
    <h2 id="hive-offline-title">You got cut off from the HIVE...</h2>
    <p class="hive-offline-message">We can't reach you right now. Please check your internet connection and try again.</p>
    <button class="hive-offline-retry" type="button">Reconnect to HIVE</button>
    <p class="hive-offline-support">If the problem persists, please report it to us-</p>
    <a class="hive-offline-email" href="https://mail.google.com/mail/?view=cm&fs=1&to=partihive.system@gmail.com" target="_blank" rel="noopener noreferrer">partihive.system@gmail.com</a>
  `;
  document.body.prepend(banner);
  overlay.appendChild(banner);

  const retryButton = banner.querySelector('.hive-offline-retry');
  const message = banner.querySelector('.hive-offline-message');

  retryButton.addEventListener('click', () => window.location.reload());

  function goOffline() {
    overlay.classList.add('show');
    banner.className = 'show';
    if (message) message.textContent = "We can't reach you right now. Please check your internet connection and try again.";
  }

  function goOnline() {
    overlay.classList.remove('show');
    banner.classList.remove('show');
    window.setTimeout(() => window.location.reload(), 100);
  }

  window.addEventListener('offline', goOffline);
  window.addEventListener('online', goOnline);

  if (!navigator.onLine) goOffline();

  window.showDataError = function () {
    overlay.classList.add('show');
    banner.classList.add('show');
    if (message) message.textContent = 'We could not load the latest data. Please check your connection and try again.';
  };
})();