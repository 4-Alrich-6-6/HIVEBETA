(function () {
    const MIN_VISIBLE_MS = 450;
    const DATA_SETTLE_DELAY_MS = 180;
    let visibleSince = 0;
    let hideTimer = null;
    let settleTimer = null;
    let pendingRequests = 0;
    let dataLoadHolds = 0;
    let documentLoaded = false;
    let windowLoaded = false;

    const isAuthPage = /(^|\/)auth\//i.test(window.location.pathname);

    const ensureLoader = () => {
        let loader = document.getElementById("hiveLoading");

        if (loader) return loader;

        loader = document.createElement("div");
        loader.className = "hive-loading";
        loader.id = "hiveLoading";
        loader.setAttribute("aria-hidden", "true");
        loader.innerHTML = `
            <div class="loader-wrap" role="status" aria-live="polite" aria-label="Loading">
                <svg class="logo-mark" viewBox="0 0 748.232081 601.370337" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <g transform="translate(-0.615857,601.870337) scale(0.1,-0.1)" fill="#F9AF1E">
                        <path d="M2142 6010 c-133 -19 -277 -76 -386 -154 -133 -95 -156 -127 -910 -1286 -396 -608 -737 -1139 -757 -1180 -63 -126 -84 -222 -83 -385 1 -159 18 -242 77 -367 19 -40 279 -449 579 -908 299 -459 632 -970 739 -1135 208 -321 270 -398 382 -472 94 -63 146 -76 257 -63 128 14 200 43 271 107 65 59 88 110 116 251 132 679 565 1224 1238 1558 134 66 156 74 208 74 103 0 160 -39 159 -110 -1 -34 -15 -63 -84 -168 -157 -241 -274 -504 -314 -707 -24 -119 -21 -310 5 -410 80 -303 315 -532 639 -623 l97 -27 500 0 c488 0 502 1 580 23 169 48 333 152 437 278 32 38 340 503 686 1034 345 531 651 997 680 1035 29 39 84 133 123 210 90 181 113 280 106 465 -3 106 -9 140 -35 220 -59 180 -208 454 -373 685 -234 330 -561 813 -838 1239 -251 386 -337 510 -390 563 -119 121 -205 165 -444 228 -145 38 -182 42 -230 21 -63 -26 -77 -53 -103 -194 -81 -438 -266 -800 -568 -1111 -131 -134 -228 -214 -391 -323 -126 -84 -404 -228 -488 -253 -46 -14 -53 -13 -94 5 -35 15 -48 28 -64 65 -27 60 -21 80 50 185 121 177 202 337 237 465 22 81 30 287 14 382 -20 127 -79 273 -153 383 -78 114 -228 246 -352 307 -159 79 -266 94 -710 98 -192 2 -378 0 -413 -5z"/>
                    </g>
                </svg>
            </div>
        `;

        document.body.appendChild(loader);
        return loader;
    };

    const setText = (message) => {
        const loader = ensureLoader();
        if (message) loader.querySelector(".loader-wrap")?.setAttribute("aria-label", message);
    };

    const show = (message = "Loading...") => {
        const loader = ensureLoader();
        clearTimeout(hideTimer);
        setText(message);
        visibleSince = Date.now();
        loader.classList.add("is-visible");
        loader.setAttribute("aria-hidden", "false");
        document.body.classList.add("hive-loading-lock");
    };

    const hide = () => {
        if (isAuthPage || !documentLoaded || !windowLoaded || pendingRequests > 0 || dataLoadHolds > 0) return;
        const loader = ensureLoader();
        const elapsed = Date.now() - visibleSince;
        const delay = Math.max(MIN_VISIBLE_MS - elapsed, 0);

        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            loader.classList.remove("is-visible");
            loader.setAttribute("aria-hidden", "true");
            document.body.classList.remove("hive-loading-lock");
        }, delay);
    };

    const requestSettled = () => {
        pendingRequests = Math.max(0, pendingRequests - 1);
        clearTimeout(settleTimer);
        if (pendingRequests === 0) {
            settleTimer = setTimeout(hide, DATA_SETTLE_DELAY_MS);
        }
    };

    const startDataLoad = (message = "Loading...") => {
        if (isAuthPage) return;
        dataLoadHolds += 1;
        show(message);
    };

    const finishDataLoad = () => {
        dataLoadHolds = Math.max(0, dataLoadHolds - 1);
        if (dataLoadHolds === 0 && pendingRequests === 0) {
            clearTimeout(settleTimer);
            settleTimer = setTimeout(hide, DATA_SETTLE_DELAY_MS);
        }
    };

    if (!isAuthPage && typeof window.fetch === "function") {
        const nativeFetch = window.fetch.bind(window);
        window.fetch = (...args) => {
            pendingRequests += 1;
            return nativeFetch(...args).finally(requestSettled);
        };
    }

    const isSamePageAnchor = (link) => {
        if (!link.hash) return false;

        const current = `${window.location.origin}${window.location.pathname}${window.location.search}`;
        const target = `${link.origin}${link.pathname}${link.search}`;
        return current === target;
    };

    const shouldShowForLink = (link) => {
        if (!link || !link.href) return false;
        if (link.target && link.target !== "_self") return false;
        if (link.hasAttribute("download")) return false;
        if (link.href.startsWith("javascript:")) return false;
        if (link.hasAttribute("data-no-loading")) return false;
        return !isSamePageAnchor(link);
    };

    document.addEventListener("DOMContentLoaded", () => {
        documentLoaded = true;
        if (isAuthPage) return;
        ensureLoader();
        show();
        if (windowLoaded && pendingRequests === 0) settleTimer = setTimeout(hide, DATA_SETTLE_DELAY_MS);
    });

    window.addEventListener("load", () => {
        windowLoaded = true;
        if (!isAuthPage && pendingRequests === 0) settleTimer = setTimeout(hide, DATA_SETTLE_DELAY_MS);
    });

    window.addEventListener("beforeunload", () => {
        if (!isAuthPage) show();
    });

    document.addEventListener("click", (event) => {
        const link = event.target.closest("a");
        if (shouldShowForLink(link)) show();
    });

    window.HiveLoading = {
        show,
        hide,
        startDataLoad,
        finishDataLoad,
    };
})();
