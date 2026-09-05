(function () {
    const MONTHS = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const pad = (n) => String(n).padStart(2, "0");

    const formatDateTime = (now) => {
        let hours = now.getHours();
        const minutes = pad(now.getMinutes());
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        const month = MONTHS[now.getMonth()];
        const day = pad(now.getDate());
        const year = now.getFullYear();
        return `${hours}:${minutes} ${ampm} ${month} ${day}, ${year}`;
    };

    const updateAll = () => {
        const elements = document.querySelectorAll(".datetime");
        const formatted = formatDateTime(new Date());
        elements.forEach((el) => {
            el.textContent = formatted;
        });
    };

    const wireNotifBells = () => {
        const bells = document.querySelectorAll("[data-notif-target]");
        bells.forEach((bell) => {
            if (bell.dataset.notifWired === "true") return;
            bell.dataset.notifWired = "true";
            bell.addEventListener("click", () => {
                window.location.href = bell.dataset.notifTarget;
            });
        });
    };

    const init = () => {
        updateAll();
        wireNotifBells();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
    setInterval(updateAll, 1000);
})();
