const menuBtn = document.querySelector(".menu-btn");
const sidebar = document.querySelector("#sidebar");
const topBackBtn = document.querySelector("#topBackBtn");
const notifList = document.querySelector("#notifList");
const notifEmpty = document.querySelector("#notifEmpty");
const markAllReadBtn = document.querySelector("#markAllReadBtn");
const clearNotificationsBtn = document.querySelector("#clearNotificationsBtn");
const notifModalOverlay = document.querySelector("#notifModalOverlay");
const notifModalTitle = document.querySelector("#notifModalTitle");
const notifModalGroup = document.querySelector("#notifModalGroup");
const notifModalDate = document.querySelector("#notifModalDate");
const notifModalBody = document.querySelector("#notifModalBody");
const closeNotifModalBtn = document.querySelector("#closeNotifModalBtn");

const supa = () => window.hiveSupabase;

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

    if (!notifications.length) {
        if (notifEmpty) notifEmpty.hidden = false;
        notifList.innerHTML = `
            <div class="empty-state">
                <img src="../assets/Notification.png" class="empty-state-icon" alt="No notifications">
                <h3>No Notifications</h3>
                <p>You're all caught up! No new notifications at the moment.</p>
            </div>
        `;
        return;
    }

    if (notifEmpty) notifEmpty.hidden = true;
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

if (topBackBtn) topBackBtn.addEventListener("click", () => { window.location.href = "t.dashb.html"; });
if (closeNotifModalBtn) closeNotifModalBtn.addEventListener("click", closeNotifModal);
if (notifModalOverlay) notifModalOverlay.addEventListener("click", (e) => { if (e.target === notifModalOverlay) closeNotifModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeNotifModal(); });

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

if (clearNotificationsBtn) {
    clearNotificationsBtn.addEventListener("click", () => {
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

const loadTeacherSidebarProfile = async () => {
    const supabase = supa();
    if (!supabase) return;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: userData, error } = await supabase
            .from("USER")
            .select("userDisplayName, userEmail, avatarPath")
            .eq("userId", user.id)
            .maybeSingle();
        if (error || !userData) return;
        const avatarImg = document.querySelector(".avatar-circle img");
        if (avatarImg && userData.avatarPath) {
            const { data } = supabase.storage.from("profilePicture").getPublicUrl(userData.avatarPath);
            if (data?.publicUrl) {
                avatarImg.src = data.publicUrl;
                avatarImg.style.objectFit = "cover";
            }
        }
        const h3s = document.querySelectorAll(".profile-block h3");
        if (h3s[0]) h3s[0].textContent = userData.userDisplayName || "Name";
        if (h3s[1]) h3s[1].textContent = userData.userEmail || "Email";
    } catch (err) {
        console.error("Error loading teacher profile:", err);
    }
};

renderNotifications();
loadTeacherSidebarProfile();
