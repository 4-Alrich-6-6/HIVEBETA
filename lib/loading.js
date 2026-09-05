(function () {
    const MIN_VISIBLE_MS = 450;
    let visibleSince = 0;
    let hideTimer = null;

    const ensureLoader = () => {
        let loader = document.getElementById("hiveLoading");

        if (loader) return loader;

        loader = document.createElement("div");
        loader.className = "hive-loading";
        loader.id = "hiveLoading";
        loader.setAttribute("aria-hidden", "true");
        loader.innerHTML = `
            <div class="hive-loading__modal" role="status" aria-live="polite">
                <div class="hive-loading__mark">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <p class="hive-loading__text">Loading...</p>
            </div>
        `;

        document.body.appendChild(loader);
        return loader;
    };

    const setText = (message) => {
        const text = ensureLoader().querySelector(".hive-loading__text");
        if (text && message) text.textContent = message;
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
        ensureLoader();
        show();
    });

    window.addEventListener("load", () => {
        hide();
    });

    window.addEventListener("beforeunload", () => {
        show();
    });

    document.addEventListener("click", (event) => {
        const link = event.target.closest("a");
        if (shouldShowForLink(link)) show();
    });

    window.HiveLoading = {
        show,
        hide,
    };
})();
