(() => {
    const script = document.currentScript;
    const libBase = script?.src.replace(/profile-dropdown\.js(?:\?.*)?$/, "") || "";
    const assetsBase = libBase.replace(/\/lib\/$/, "/assets/");
    const trigger = document.querySelector(".profile-trigger");
    const row = trigger?.closest(".profile-row");
    if (!trigger || !row) return;

    if (!document.querySelector('link[data-profile-dropdown="true"]')) {
        const stylesheet = document.createElement("link");
        stylesheet.rel = "stylesheet";
        stylesheet.href = `${libBase}profile-dropdown.css`;
        stylesheet.dataset.profileDropdown = "true";
        document.head.appendChild(stylesheet);
    }

    let dropdown = row.querySelector("#profileDropdown");
    if (!dropdown) {
        dropdown = document.createElement("div");
        dropdown.className = "profile-dropdown";
        dropdown.id = "profileDropdown";
        dropdown.setAttribute("role", "menu");
        dropdown.setAttribute("aria-hidden", "true");
        dropdown.innerHTML = `
            <div class="profile-summary">
                <img id="profileDropdownAvatar" src="${assetsBase}profile-placeholder.svg" alt="">
                <div class="profile-summary-details">
                    <strong id="profileDropdownName">Profile</strong>
                    <span id="profileDropdownEmail">Email</span>
                </div>
            </div>
            <button class="profile-dropdown-item" id="profileHelpBtn" type="button" role="menuitem">Help</button>
            <button class="profile-dropdown-item" id="profileLogoutBtn" type="button" role="menuitem">Log Out</button>
        `;
        document.body.appendChild(dropdown);
    } else if (dropdown.parentElement !== document.body) {
        document.body.appendChild(dropdown);
    }

    trigger.id = trigger.id || "profileTrigger";
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", "profileDropdown");

    const avatar = dropdown.querySelector("#profileDropdownAvatar");
    const name = dropdown.querySelector("#profileDropdownName");
    const email = dropdown.querySelector("#profileDropdownEmail");
    const close = () => {
        dropdown.classList.remove("open");
        dropdown.setAttribute("aria-hidden", "true");
        trigger.setAttribute("aria-expanded", "false");
    };

    trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        const open = dropdown.classList.toggle("open");
        dropdown.setAttribute("aria-hidden", String(!open));
        trigger.setAttribute("aria-expanded", String(open));
    });
    dropdown.querySelector("#profileLogoutBtn")?.addEventListener("click", () => {
        close();
        window.doLogout?.();
    });
    dropdown.querySelector("#profileHelpBtn")?.addEventListener("click", () => {
        window.location.href = `${libBase}tutorial.html`;
    });
    document.addEventListener("click", (event) => {
        if (!event.target.closest(".profile-row")) close();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            close();
            trigger.focus();
        }
    });

    const loadProfile = async () => {
        const supabase = window.hiveSupabase;
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        if (name) name.textContent = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Profile";
        if (email) email.textContent = user.email || "Email";
        const { data } = await supabase.from("USER").select("userDisplayName, userEmail, avatarPath").eq("userId", user.id).maybeSingle();
        if (data?.userDisplayName && name) name.textContent = data.userDisplayName;
        if (data?.userEmail && email) email.textContent = data.userEmail;
        if (data?.avatarPath) {
            const url = data.avatarPath.startsWith("http") ? data.avatarPath : supabase.storage.from("profilePicture").getPublicUrl(data.avatarPath).data?.publicUrl;
            if (url && avatar) avatar.src = url;
            if (url && trigger.querySelector("img")) trigger.querySelector("img").src = url;
        }
    };
    loadProfile();
})();
