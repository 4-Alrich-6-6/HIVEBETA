const menuBtn = document.querySelector(".menu-btn");
const sidebar = document.querySelector("#sidebar");

if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", () => {
        sidebar.classList.toggle("open");
    });
}

// ─── DB: load groups from Supabase ───────────────────────────────────────────
let dashbData = {
    groups: [],
    stats: { groups: 0 }
};

const loadDashbData = async () => {
    const supabase = window.hiveSupabase;
    if (!supabase) return;

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (!user || userErr) return;

    const { data: groups, error } = await supabase
        .from("GROUP")
        .select("grpId, grpName, grpSubject")
        .eq("teacherId", user.id);

    if (error) {
        console.error("Error fetching groups:", error);
        dashbData = { groups: [], stats: { groups: 0 } };
        applyDashbData(dashbData);
        return;
    }

    const groupList = [];
    for (const grp of (groups || [])) {
        const { count: memberCount } = await supabase
            .from("GROUPMEMBER")
            .select("grpmemId", { count: "exact", head: true })
            .eq("grpId", grp.grpId);

        groupList.push({
            grpId: grp.grpId,
            name: grp.grpName || "Unnamed Group",
            subject: grp.grpSubject || "",
            members: memberCount || 0
        });
    }

    dashbData = { groups: groupList, stats: { groups: groupList.length } };
    applyDashbData(dashbData);
};

const applyDashbData = (data) => {
    const groupsList = document.querySelector("#groupsList");

    if (!groupsList) {
        return;
    }

    if (data.groups && data.groups.length > 0) {
        // Display all groups
        let groupsHTML = "";
        for (const grp of data.groups) {
            groupsHTML += `
            <article class="group-card open-member-group-view" data-grp-id="${grp.grpId}">
                <div class="group-info">
                    <h3>${grp.name}</h3>
                    <p>${grp.subject}</p>
                </div>
                <div class="card-right">
                    <strong>Occupied Members : ${grp.members}</strong>
                </div>
            </article>
        `;
        }
        
        groupsList.innerHTML = groupsHTML;
        
        // Add click listeners to all group cards
        const cards = groupsList.querySelectorAll(".open-member-group-view");
        cards.forEach(card => {
            const grpId = card.dataset.grpId;
            const grpName = card.querySelector("h3")?.textContent || "Group";
            card.addEventListener("click", () => {
                sessionStorage.setItem("hive_grpId", String(grpId));
                sessionStorage.setItem("hive_grpName", grpName);
                window.location.href = `t.grpviewing.html?grpId=${grpId}`;
            });
        });
    } else {
        groupsList.innerHTML = `
            <div class="empty-state">
                <img src="../assets/JoinGroup.png" class="empty-state-icon" alt="No groups">
                <h3>No Groups Found</h3>
                <p>You haven't joined or created any groups yet. Use "Join Groups" to get started!</p>
            </div>
        `;
    }
    
    // Update stat card
    const statCards = document.querySelectorAll(".stat-card h3");
    if (statCards[0]) {
        statCards[0].textContent = data.stats.groups;
    }
};

// Load on page start
loadDashbData();

// ─── Sidebar profile (name + department) ────────────────────────────────────
const loadTeacherSidebar = async () => {
    const supabase = window.hiveSupabase;
    if (!supabase) return;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
            .from("USER")
            .select("userDisplayName, avatarPath, deptId")
            .eq("userId", user.id)
            .maybeSingle();

        if (!userData) return;

        let deptName = "";
        if (userData.deptId) {
            const { data: dept } = await supabase
                .from("DEPARTMENT")
                .select("deptName")
                .eq("deptId", userData.deptId)
                .maybeSingle();
            deptName = dept?.deptName || "";
        }

        const h3s = document.querySelectorAll(".profile-block h3");
        if (h3s[0]) h3s[0].textContent = userData.userDisplayName || "";
        if (h3s[1]) h3s[1].textContent = deptName;

        const avatarImg = document.querySelector(".avatar-circle img");
        if (avatarImg && userData.avatarPath) {
            const { data } = supabase.storage.from("profilePicture").getPublicUrl(userData.avatarPath);
            if (data?.publicUrl) {
                avatarImg.src = data.publicUrl;
                avatarImg.style.objectFit = "cover";
            }
        }
    } catch (e) {}
};

loadTeacherSidebar();


// ─── Join Group ───────────────────────────────────────────────────────────────
const joinGroupModal = document.querySelector("#joinGroupModal");
const openJoinGroupModalBtn = document.querySelector("#openJoinGroupModal");
const discardJoinGroupBtn = document.querySelector("#discardJoinGroup");
const joinGroupBtn = document.querySelector("#joinGroupBtn");
const groupLinkInput = document.querySelector("#groupLinkInput");

const updateJoinGroupState = () => {
    if (!joinGroupBtn) return;
    joinGroupBtn.disabled = !(groupLinkInput && groupLinkInput.value.trim().length > 0);
};

const closeJoinGroupModal = () => {
    if (!joinGroupModal) return;
    joinGroupModal.classList.remove("open");
    joinGroupModal.setAttribute("aria-hidden", "true");
};

const openJoinGroupModalFn = () => {
    if (!joinGroupModal) return;
    joinGroupModal.classList.add("open");
    joinGroupModal.setAttribute("aria-hidden", "false");
    if (groupLinkInput) { groupLinkInput.value = ""; groupLinkInput.focus(); }
    updateJoinGroupState();
};

if (openJoinGroupModalBtn) openJoinGroupModalBtn.addEventListener("click", openJoinGroupModalFn);
if (discardJoinGroupBtn) discardJoinGroupBtn.addEventListener("click", closeJoinGroupModal);
if (groupLinkInput) groupLinkInput.addEventListener("input", updateJoinGroupState);
if (joinGroupModal) joinGroupModal.addEventListener("click", (e) => { if (e.target === joinGroupModal) closeJoinGroupModal(); });

if (joinGroupBtn) {
    joinGroupBtn.addEventListener("click", () => {
        const groupLink = groupLinkInput ? groupLinkInput.value.trim() : "";
        if (!groupLink) return;
        showConfirmation(
            "Are you sure you want to join this group?",
            async () => {
                const supabase = window.hiveSupabase;
                if (!supabase) { showAlert("Cannot connect to database.", { title: "Connection Error" }); return; }

                let grpId;
                if (groupLink.includes("?invite=")) {
                    const url = new URL(groupLink);
                    grpId = Number(url.searchParams.get("invite"));
                } else if (groupLink.includes("invite=")) {
                    const match = groupLink.match(/invite=(\d+)/);
                    grpId = match ? Number(match[1]) : Number(groupLink);
                } else {
                    grpId = Number(groupLink);
                }

                if (!grpId || isNaN(grpId)) { showAlert("Invalid group link.", { title: "Invalid Link" }); return; }

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { showAlert("You must be logged in.", { title: "Not Logged In" }); return; }

                const { data: grp, error: grpErr } = await supabase
                    .from("GROUP").select("grpId, grpName, teacherId").eq("grpId", grpId).maybeSingle();
                if (grpErr || !grp) { showAlert("Group not found.", { title: "Not Found" }); return; }

                if (grp.teacherId) { showAlert("This group already has a teacher assigned.", { title: "Already Taken" }); closeJoinGroupModal(); return; }

                const { error: updateErr } = await supabase
                    .from("GROUP")
                    .update({ teacherId: user.id })
                    .eq("grpId", grpId);

                if (updateErr) { showAlert("Failed to join group: " + updateErr.message, { title: "Error" }); return; }

                // Add teacher to GROUPMEMBER table
                const { data: teacherRole, error: roleErr } = await supabase
                    .from("ROLE")
                    .select("roleId")
                    .ilike("roleName", "teacher")
                    .maybeSingle();

                if (teacherRole) {
                    const { error: memberErr } = await supabase
                        .from("GROUPMEMBER")
                        .insert({
                            userId: user.id,
                            grpId: Number(grpId),
                            roleId: teacherRole.roleId
                        });

                    if (memberErr) { 
                        console.error("Failed to add teacher to GROUPMEMBER:", memberErr); 
                    }
                }

                // Wait a moment for database to sync before refreshing list
                await new Promise(resolve => setTimeout(resolve, 500));

                // Notify all existing members that a teacher joined
                (async () => {
                    try {
                        const [{ data: groupMembers }, { data: groupInfo }, { data: teacherProfile }] = await Promise.all([
                            supabase.from("GROUPMEMBER").select("userId").eq("grpId", grpId),
                            supabase.from("GROUP").select("grpName").eq("grpId", grpId).maybeSingle(),
                            supabase.from("USER").select("userDisplayName").eq("userId", user.id).maybeSingle()
                        ]);
                        const recipients = (groupMembers || []).map(m => m.userId);
                        const teacherName = teacherProfile?.userDisplayName || "A teacher";
                        const grpName = groupInfo?.grpName || "the group";
                        const now = new Date().toISOString();
                        await Promise.all(recipients.map(uid =>
                            supabase.from("NOTIFICATION").insert({
                                notiTitle: "Teacher Joined",
                                notiBody: `${teacherName} has joined "${grpName}" as your teacher.`,
                                "notiDate&Time": now,
                                notiIsRead: false,
                                userId: uid,
                                grpId: Number(grpId)
                            })
                        ));
                    } catch (e) {}
                })();

                closeJoinGroupModal();
                await loadDashbData();
            },
            { title: "Join Group", confirmText: "Join", cancelText: "Cancel" }
        );
    });
}

updateJoinGroupState();

// Navigate to group view, passing grpId
const memberGroupCardLink = document.querySelector(".open-member-group-view");
if (memberGroupCardLink) {
    memberGroupCardLink.addEventListener("click", () => {
        const grpId = memberGroupCardLink.dataset.grpId
            || (dashbData.groups[0] ? dashbData.groups[0].grpId : null);
        if (grpId) sessionStorage.setItem("hive_grpId", String(grpId));
        window.location.href = `t.grpviewing.html${grpId ? `?grpId=${grpId}` : ""}`;
    });
    memberGroupCardLink.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); memberGroupCardLink.click(); }
    });
}

const notifBtns = document.querySelectorAll(".notif-btn, .notif-btn-mobile");
notifBtns.forEach((btn) => {
    btn.addEventListener("click", () => { window.location.href = "t.notification.html"; });
});

const checkUnreadNotifications = async () => {
    const supabase = window.hiveSupabase;
    if (!supabase) return;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { count } = await supabase
            .from("NOTIFICATION")
            .select("notiId", { count: "exact", head: true })
            .eq("userId", user.id)
            .eq("notiIsRead", false);
        const hasUnread = (count || 0) > 0;
        document.querySelectorAll(".notif-badge").forEach(b => b.classList.toggle("has-unread", hasUnread));
    } catch (e) {}
};

checkUnreadNotifications();

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
