const menuBtn = document.querySelector(".menu-btn");
const sidebar = document.querySelector("#sidebar");
const topBackBtn = document.querySelector("#topBackBtn");
const notifList = document.querySelector("#notifList");
const markAllReadBtn = document.querySelector("#markAllReadBtn");
const emptyNotifBtn = document.querySelector("#emptyNotifBtn");
const notifModalOverlay = document.querySelector("#notifModalOverlay");
const notifModalTitle = document.querySelector("#notifModalTitle");
const notifModalGroup = document.querySelector("#notifModalGroup");
const notifModalDate = document.querySelector("#notifModalDate");
const notifModalBody = document.querySelector("#notifModalBody");
const closeNotifModalBtn = document.querySelector("#closeNotifModalBtn");

const supa = () => window.hiveSupabase;

const loadTopbarAvatar = async () => {
    const profileImage = document.querySelector(".profile-trigger img");
    const supabase = supa();
    if (!profileImage || !supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("USER").select("avatarPath").eq("userId", user.id).maybeSingle();
    if (!data?.avatarPath) return;
    const avatarUrl = data.avatarPath.startsWith("http")
        ? data.avatarPath
        : supabase.storage.from("profilePicture").getPublicUrl(data.avatarPath).data?.publicUrl;
    if (avatarUrl) profileImage.src = avatarUrl;
};

loadTopbarAvatar();

if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", () => sidebar.classList.toggle("open"));
}

const openNotifModal = async (notif) => {
    if (!notifModalOverlay) return;
    if (notifModalTitle) notifModalTitle.textContent = notif.title;
    if (notifModalGroup) notifModalGroup.textContent = notif.group || "";
    if (notifModalDate) notifModalDate.textContent = formatNotifDate(notif.date);
    if (notifModalBody) notifModalBody.textContent = notif.body || "";
    notifModalOverlay.classList.add("open");
    notifModalOverlay.setAttribute("aria-hidden", "false");
    if (!notif.isRead) await markNotificationRead(supa(), notif.id);
};

const closeNotifModal = () => {
    if (!notifModalOverlay) return;
    notifModalOverlay.classList.remove("open");
    notifModalOverlay.setAttribute("aria-hidden", "true");
};

const renderNotifications = async () => {
    if (!notifList) return;
    notifList.innerHTML = `<div class="loading-state"><p>Loading notifications...</p></div>`;

    const notifications = await loadNotifications(supa());

    if (emptyNotifBtn) {
        emptyNotifBtn.style.display = notifications.length > 0 ? "inline-flex" : "none";
    }

    if (!notifications.length) {
        notifList.innerHTML = `
            <div class="empty-state notification-empty-placeholder">
                <img src="../assets/bee-flight.svg" class="empty-state-icon" alt="">
                <h3>No notifications</h3>
                <p>You're all caught up! No new notifications at the moment.</p>
            </div>
        `;
        return;
    }

    notifList.innerHTML = "";
    notifications.forEach((notif) => {
        const itemWrap = document.createElement("div");
        itemWrap.className = "notif-item-wrap";

        const card = document.createElement("button");
        card.type = "button";
        card.className = `notif-card${notif.isRead ? "" : " unread"}`;
        card.setAttribute("data-id", notif.id);
        card.innerHTML = `
            <div class="notif-top">
                <h3 class="notif-title"></h3>
                <span class="notif-date"></span>
            </div>
            <p class="notif-body"></p>
            ${notif.isRead ? "" : '<span class="notif-unread-dot" aria-label="Unread"></span>'}
        `;
        card.querySelector(".notif-title").textContent = notif.title;
        card.querySelector(".notif-date").textContent = formatNotifDate(notif.date);
        card.querySelector(".notif-body").textContent = truncateBody(notif.body, 120);

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "notif-delete-btn";
        deleteBtn.setAttribute("aria-label", "Delete notification");
        deleteBtn.innerHTML = `<img src="../assets/Delete.png" alt="Delete">`;

        card.addEventListener("click", () => {
            card.classList.remove("unread");
            openNotifModal(notif);
        });

        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            showConfirmation(
                "Are you sure you want to delete this notification?",
                async () => {
                    await deleteNotification(supa(), notif.id);
                    await renderNotifications();
                },
                { title: "Delete Notification", confirmText: "Delete", cancelText: "Cancel" }
            );
        });

        itemWrap.appendChild(card);
        itemWrap.appendChild(deleteBtn);
        notifList.appendChild(itemWrap);
    });
};

if (emptyNotifBtn) {
    emptyNotifBtn.addEventListener("click", () => {
        showConfirmation(
            "This action will delete all your notifications.",
            async () => {
                await deleteAllNotificationsForUser(supa());
                await renderNotifications();
            },
            { title: "Clear All Notifications", confirmText: "Clear All", cancelText: "Cancel" }
        );
    });
}

if (markAllReadBtn) {
    markAllReadBtn.addEventListener("click", async () => {
        const supabase = supa();
        if (!supabase) return;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        try {
            const { error } = await supabase
                .from("NOTIFICATION")
                .update({ notiIsRead: true })
                .eq("userId", user.id)
                .eq("notiIsRead", false);
            
            if (!error) {
                await renderNotifications();
            }
        } catch (e) {
            console.error("Error marking all as read:", e);
        }
    });
}

if (topBackBtn) topBackBtn.addEventListener("click", () => { window.location.href = "s.dashb.html"; });
if (closeNotifModalBtn) closeNotifModalBtn.addEventListener("click", closeNotifModal);
if (notifModalOverlay) notifModalOverlay.addEventListener("click", (e) => { if (e.target === notifModalOverlay) closeNotifModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeNotifModal(); });

const logoutBtn = document.querySelector(".logout");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        showConfirmation(
            "Are you sure you want to log out?",
            () => window.doLogout?.(),
            { title: "Log Out", confirmText: "Log Out", cancelText: "Cancel" }
        );
    });
}

renderNotifications();
