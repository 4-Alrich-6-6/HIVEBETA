/* ── Supabase accessor — lazy so it's never captured before supabaseClient.js runs ── */
const getSupabase = () => window.hiveSupabase;

/* ── ELEMENTS ─────────────────────────────────────────────────────────────── */
const topBackBtn          = document.querySelector("#topBackBtn");
const backBtn             = document.querySelector("#backBtn");
const projectBreakdownTab = document.querySelector("#projectBreakdownTab");
const logoutBtn           = document.querySelector(".logout");

/* ── STATE ────────────────────────────────────────────────────────────────── */
let currentMembers = [];

/* ── HELPERS ──────────────────────────────────────────────────────────────── */
const resolveAvatar = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = sb.storage.from("profilePicture").getPublicUrl(path);
  return data?.publicUrl || null;
};
const getGroupId = () => {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("grpId");
  const fromSession = sessionStorage.getItem("hive_grpId");
  const grpId = [fromUrl, fromSession].find((value) => {
    const normalized = String(value || "").trim().toLowerCase();
    return normalized && normalized !== "null" && normalized !== "undefined";
  });

  if (grpId) sessionStorage.setItem("hive_grpId", String(grpId));
  return grpId || null;
};

const normalizeText = (v) => String(v || "").trim().toLowerCase();

const truncateEmail = (email, maxLen = 25) => {
  return email && email.length > maxLen ? email.slice(0, maxLen) + "..." : email;
};

/* ── DB LOAD ──────────────────────────────────────────────────────────────── */
const loadGroupFromDB = async () => {
  const supabase = getSupabase();
  const grpId = getGroupId();

  if (!grpId || !supabase) {
    return;
  }

  // 1. Group info
  const { data: grp, error: grpErr } = await supabase
    .from("GROUP")
    .select("grpName, grpSubject")
    .eq("grpId", grpId)
    .maybeSingle();

  if (!grpErr && grp) {
    const h2 = document.querySelector(".group-label h2");
    const p  = document.querySelector(".group-label p");
    if (h2) h2.textContent = grp.grpName    || "Group Name";
    if (p)  p.textContent  = grp.grpSubject || "Subject";
  }

  // 2. Members (join USER and ROLE)
  const { data: members, error: memErr } = await supabase
    .from("GROUPMEMBER")
    .select("grpmemId, userId, roleId, ROLE(roleName), USER(userDisplayName, userEmail, avatarPath, PROGRAM(progName), DEPARTMENT(deptName))")
    .eq("grpId", grpId);

  if (memErr || !members) {
    return;
  }

  const allMembers = members.map((m) => ({
    grpmemId: m.grpmemId,
    userId:   m.userId,
    roleId:   m.roleId,
    roleName: m.ROLE?.roleName          || "Member",
    fullName: m.USER?.userDisplayName   || "Unknown",
    email:    m.USER?.userEmail         || "No email",
    avatarPath: m.USER?.avatarPath      || null,
    progName: m.USER?.PROGRAM?.progName    || null,
    deptName: m.USER?.DEPARTMENT?.deptName || null,
  }));
  currentMembers = allMembers;

  // 3. Project count
  const { count: projCount = 0 } = await supabase
    .from("PROJECT")
    .select("*", { count: "exact", head: true })
    .eq("grpId", grpId);

  // 4. Summary cards (teacher view: Members count + Projects count)
  const nonTeacher = allMembers.filter((m) => normalizeText(m.roleName) !== "teacher");
  const summaryH3s = document.querySelectorAll(".summary-card h3");
  if (summaryH3s[0]) summaryH3s[0].textContent = nonTeacher.length;
  if (summaryH3s[1]) summaryH3s[1].textContent = projCount || 0;

  // 5. Render member cards
  await renderGroupMembers(allMembers);
};

/* ── FETCH MEMBER TASK STATS ──────────────────────────────────────────────── */
const getMemberTaskStats = async (member) => {
  const supabase = getSupabase();
  const grpId = getGroupId();
  if (!supabase || !grpId) return { total: 0, completed: 0, pending: 0, missed: 0 };

  try {
    const { data: memberships } = await supabase
      .from("GROUPMEMBER")
      .select("grpmemId")
      .eq("userId", member.userId)
      .eq("grpId", Number(grpId));

    if (!memberships?.length) return { total: 0, completed: 0, pending: 0, missed: 0 };

    const grpmemIds = memberships.map(m => m.grpmemId);

    const { data: assignments } = await supabase
      .from("TASKASSIGNMENT")
      .select("taskId")
      .in("grpmemId", grpmemIds);

    if (!assignments?.length) return { total: 0, completed: 0, pending: 0, missed: 0 };

    const taskIds = [...new Set(assignments.map(a => a.taskId))];

    const { data: tasks } = await supabase
      .from("TASK")
      .select("taskId, statId, taskDueD, taskAcmD")
      .in("taskId", taskIds);

    if (!tasks) return { total: 0, finished: 0, pending: 0, missed: 0 };

    const total = tasks.length;
    const finished = tasks.filter(t => t.statId === 5).length;
    const missed = tasks.filter(t => t.statId === 6).length;
    const pending = tasks.filter(t => t.statId !== 5 && t.statId !== 6).length;
    return { total, finished, pending, missed };
  } catch (err) {
    console.error("Error fetching member task stats:", err);
    return { total: 0, completed: 0, pending: 0, missed: 0 };
  }
};

/* ── RENDER MEMBERS ───────────────────────────────────────────────────────── */
const createMemberCard = (member, cardClass, avatarSize) => {
  const avatarUrl = resolveAvatar(member.avatarPath);
  const avatarStyle = avatarUrl
    ? `style="background-image: url('${avatarUrl}'); background-size: cover; background-position: center;"`
    : "";
  const avatarContent = !avatarUrl
    ? `<img src="../assets/profile.png" alt="${member.fullName}">`
    : "";
  
  return `
  <article class="info-card ${cardClass}" data-member-id="${member.userId}" style="cursor:pointer;">
    <div class="circle-avatar ${avatarSize}" ${avatarStyle}>
      ${avatarContent}
    </div>
    <div class="member-details">
      <div class="member-info">
        <h3>${member.fullName}</h3>
        <p>${member.roleName}</p>
        <p title="${member.email}">${truncateEmail(member.email)}</p>
      </div>
      <div class="stats">
        <p>Total Tasks: ${member.taskStats?.total || 0}</p>
        <p>Finished: ${member.taskStats?.finished || 0}</p>
        <p>Pending: ${member.taskStats?.pending || 0}</p>
        <p>Missed: ${member.taskStats?.missed || 0}</p>
      </div>
    </div>
  </article>
`;
};

const renderGroupMembers = async (members) => {
  const container = document.querySelector(".group-info-stack");
  if (!container) return;

  // Fetch task stats for each member in parallel
  const membersWithStats = await Promise.all(
    members.map(async (member) => {
      const taskStats = await getMemberTaskStats(member);
      return { ...member, taskStats };
    })
  );

  const leader        = membersWithStats.find((m) => normalizeText(m.roleName) === "leader");
  const normalMembers = membersWithStats.filter((m) => {
    const r = normalizeText(m.roleName);
    return r !== "teacher" && r !== "leader";
  });

  container.innerHTML = `
    ${leader
      ? createMemberCard(leader, "leader-card", "large")
      : `<article class="info-card leader-card"><h3>No leader found</h3></article>`
    }

    <div class="member-grid">
      ${normalMembers.map((m) => createMemberCard(m, "member-card", "medium")).join("")}
    </div>
  `;
};

/* ── EVENTS ───────────────────────────────────────────────────────────────── */
if (topBackBtn) {
  topBackBtn.addEventListener("click", () => { window.location.href = "t.dashb.html"; });
}

if (backBtn) {
  backBtn.addEventListener("click", () => {
    const isAlone = currentMembers.length === 0;
    const message = isAlone
      ? "You are the only person in this group. Leaving will permanently delete this group and all its projects, tasks, and related data. This cannot be undone."
      : "Are you sure you want to leave this group?";
    const confirmText = isAlone ? "Leave & Delete Group" : "Leave";

    showConfirmation(
      message,
      async () => {
        const supabase = getSupabase();
        const grpId = getGroupId();
        if (!grpId || !supabase) {
          showAlert("Could not connect to the group.", { title: "Error" });
          return;
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          showAlert("You must be logged in.", { title: "Not Logged In" });
          return;
        }
        if (isAlone) {
          const { error } = await supabase.rpc("delete_group_cascade", {
            p_grp_id: Number(grpId),
          });
          if (error) {
            showAlert("Failed to delete group: " + error.message, { title: "Error" });
            return;
          }
        } else {
          const { error } = await supabase.rpc("leave_group", {
            p_user_id: user.id,
            p_grp_id:  Number(grpId),
          });
          if (error) {
            showAlert("Failed to leave group: " + error.message, { title: "Error" });
            return;
          }
          
          // Notify all members that teacher left
          try {
            const [{ data: members }, { data: teacherInfo }, { data: grpInfo }] = await Promise.all([
              supabase.from("GROUPMEMBER").select("userId").eq("grpId", grpId).neq("userId", user.id),
              supabase.from("USER").select("userDisplayName").eq("userId", user.id).maybeSingle(),
              supabase.from("GROUP").select("grpName").eq("grpId", grpId).maybeSingle()
            ]);
            const recipients = (members || []).map(m => m.userId);
            const teacherName = teacherInfo?.userDisplayName || "A teacher";
            const grpName = grpInfo?.grpName || "the group";
            const now = new Date().toISOString();
            await Promise.all(recipients.map(uid =>
              supabase.from("NOTIFICATION").insert({
                notiTitle: "Teacher Left",
                notiBody: `${teacherName} has left "${grpName}".`,
                "notiDate&Time": now,
                notiIsRead: false,
                userId: uid,
                grpId: Number(grpId)
              })
            ));
          } catch (e) {}
        }
        window.location.href = "t.dashb.html";
      },
      { title: isAlone ? "Delete Group" : "Leave Group", confirmText, cancelText: "Cancel" }
    );
  });
}

if (projectBreakdownTab) {
  projectBreakdownTab.addEventListener("click", () => {
    const grpId = getGroupId();
    window.location.href = `t.category.html${grpId ? `?grpId=${grpId}` : ""}`;
  });
}

document.querySelector("#mobileBreakdownBtn")?.addEventListener("click", () => {
  const grpId = getGroupId();
  window.location.href = `t.category.html${grpId ? `?grpId=${grpId}` : ""}`;
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    showConfirmation(
      "Are you sure you want to log out?",
      () => window.doLogout?.(),
      { title: "Log Out", confirmText: "Log Out", cancelText: "Cancel" }
    );
  });
}

/* ── INIT ─────────────────────────────────────────────────────────────────── */

// Load sidebar profile data
const loadTeacherSidebarProfile = async () => {
    const supabase = getSupabase();
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

        // Update avatar
        const avatarImg = document.querySelector(".avatar-circle img");
        if (avatarImg && userData.avatarPath) {
            const url = resolveAvatar(userData.avatarPath);
            avatarImg.src = url || userData.avatarPath;
            avatarImg.style.objectFit = "cover";
        }

        // Update name and email
        const h3s = document.querySelectorAll(".profile-block h3");
        if (h3s[0]) h3s[0].textContent = userData.userDisplayName || "Name";
        if (h3s[1]) h3s[1].textContent = userData.userEmail || "Email";
    } catch (err) {
        // silently ignore profile load errors
    }
};

/* ── MEMBER PROFILE MODAL ────────────────────────────────────────────────── */
const memberProfileOverlay  = document.querySelector("#memberProfileOverlay");
const memberProfileName     = document.querySelector("#memberProfileName");
const memberProfileRole     = document.querySelector("#memberProfileRole");
const memberProfileField    = document.querySelector("#memberProfileField");
const memberProfileEmail    = document.querySelector("#memberProfileEmail");
const memberProfileAvatar   = document.querySelector("#memberProfileAvatar");
const closeMemberProfileBtn = document.querySelector("#closeMemberProfileBtn");
const assignLeaderBtn       = document.querySelector("#assignLeaderBtn");
const removeMemberBtn       = document.querySelector("#removeMemberBtn");
let currentMemberInModal    = null; // Track member being viewed in modal

const getAvatarLightbox = () => {
    let lb = document.querySelector("#avatarLightbox");
    if (!lb) {
        lb = document.createElement("div");
        lb.id = "avatarLightbox";
        lb.style.cssText = "display:none;position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:10000;align-items:center;justify-content:center;";
        lb.innerHTML = `
          <button style="position:absolute;top:16px;right:16px;width:40px;height:40px;border:none;border-radius:50%;background:#fff;font-size:20px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;" id="closeLightboxBtn">✕</button>
          <img id="lightboxImg" src="" alt="Profile picture" style="max-width:90vw;max-height:90vh;border-radius:12px;object-fit:contain;">
        `;
        document.body.appendChild(lb);
        lb.querySelector("#closeLightboxBtn").addEventListener("click", () => { lb.style.display = "none"; });
        lb.addEventListener("click", (e) => { if (e.target === lb) lb.style.display = "none"; });
    }
    return lb;
};

const openMemberProfile = (member) => {
    if (!memberProfileOverlay) return;
    currentMemberInModal = member; // Store member being viewed
    memberProfileRole.textContent  = member.roleName;
    memberProfileName.textContent  = member.fullName;
    memberProfileEmail.textContent = member.email;
    const field = member.deptName || member.progName || "";
    memberProfileField.textContent = field ? (member.deptName ? `Department: ${field}` : `Program: ${field}`) : "";
    const avatarUrl = resolveAvatar(member.avatarPath);
    if (avatarUrl) {
        memberProfileAvatar.style.backgroundImage = `url('${avatarUrl}')`;
        memberProfileAvatar.style.backgroundSize  = "cover";
        memberProfileAvatar.style.backgroundPosition = "center";
        memberProfileAvatar.style.cursor = "pointer";
        memberProfileAvatar.innerHTML = "";
        memberProfileAvatar.onclick = () => {
            const lb = getAvatarLightbox();
            lb.querySelector("#lightboxImg").src = avatarUrl;
            lb.style.display = "flex";
        };
    } else {
        memberProfileAvatar.style.backgroundImage = "";
        memberProfileAvatar.style.cursor = "default";
        memberProfileAvatar.onclick = null;
        memberProfileAvatar.innerHTML = `<img src="../assets/profile.png" alt="${member.fullName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }
    
    // Update button text based on role
    if (assignLeaderBtn) {
        assignLeaderBtn.textContent = normalizeText(member.roleName) === "leader" ? "Remove as Leader" : "Assign as Leader";
    }
    
    memberProfileOverlay.classList.add("open");
    memberProfileOverlay.setAttribute("aria-hidden", "false");
};

const closeMemberProfile = () => {
    memberProfileOverlay?.classList.remove("open");
    memberProfileOverlay?.setAttribute("aria-hidden", "true");
};

if (closeMemberProfileBtn) closeMemberProfileBtn.addEventListener("click", closeMemberProfile);
if (memberProfileOverlay) memberProfileOverlay.addEventListener("click", (e) => { if (e.target === memberProfileOverlay) closeMemberProfile(); });

// Assign/Remove as Leader button
if (assignLeaderBtn) {
  assignLeaderBtn.addEventListener("click", async () => {
    if (!currentMemberInModal) return;
    const supabase = getSupabase();
    const grpId = getGroupId();
    if (!supabase || !grpId) return;

    try {
      // Find leader role ID and member role ID
      const { data: roles } = await supabase
        .from("ROLE")
        .select("roleId, roleName")
        .in("roleName", ["leader", "member"]);
      
      const leaderRoleId = roles?.find(r => normalizeText(r.roleName) === "leader")?.roleId;
      const memberRoleId = roles?.find(r => normalizeText(r.roleName) === "member")?.roleId;
      
      if (!leaderRoleId || !memberRoleId) return;

      const isCurrentLeader = normalizeText(currentMemberInModal.roleName) === "leader";
      const newRoleId = isCurrentLeader ? memberRoleId : leaderRoleId;
      const newRoleName = isCurrentLeader ? "Member" : "Leader";

      // Update member role
      const { error } = await supabase
        .from("GROUPMEMBER")
        .update({ roleId: newRoleId })
        .eq("grpmemId", currentMemberInModal.grpmemId);

      if (error) {
        console.error("Error updating member role:", error);
        showAlert("Failed to update member role.", { title: "Error" });
        return;
      }

      // Send notification to the member
      const now = new Date().toISOString();
      const { data: grpInfo } = await supabase
        .from("GROUP")
        .select("grpName")
        .eq("grpId", grpId)
        .maybeSingle();
      const grpName = grpInfo?.grpName || "the group";
      
      const notificationTitle = isCurrentLeader ? "Demoted" : "Promoted to Leader";
      const notificationBody = isCurrentLeader 
        ? `You have been demoted to a member in "${grpName}".`
        : `You have been promoted as a leader in "${grpName}".`;

      await supabase.from("NOTIFICATION").insert({
        notiTitle: notificationTitle,
        notiBody: notificationBody,
        "notiDate&Time": now,
        notiIsRead: false,
        userId: currentMemberInModal.userId,
        grpId: Number(grpId)
      });

      // Close modal and reload
      closeMemberProfile();
      await loadGroupFromDB();
    } catch (err) {
      console.error("Error in assign/remove leader:", err);
      showAlert("An error occurred.", { title: "Error" });
    }
  });
}

// Remove Member button
if (removeMemberBtn) {
  removeMemberBtn.addEventListener("click", async () => {
    if (!currentMemberInModal) return;
    
    showConfirmation(
      `Are you sure you want to remove ${currentMemberInModal.fullName} from this group?`,
      async () => {
        const supabase = getSupabase();
        const grpId = getGroupId();
        if (!supabase || !grpId) return;

        try {
          // Delete member from GROUPMEMBER
          const { error } = await supabase
            .from("GROUPMEMBER")
            .delete()
            .eq("grpmemId", currentMemberInModal.grpmemId);

          if (error) {
            console.error("Error removing member:", error);
            showAlert("Failed to remove member.", { title: "Error" });
            return;
          }

          // Send notification to removed member
          const now = new Date().toISOString();
          const { data: grpInfo } = await supabase
            .from("GROUP")
            .select("grpName")
            .eq("grpId", grpId)
            .maybeSingle();
          const grpName = grpInfo?.grpName || "the group";

          await supabase.from("NOTIFICATION").insert({
            notiTitle: "Removed from Group",
            notiBody: `You have been removed from "${grpName}".`,
            "notiDate&Time": now,
            notiIsRead: false,
            userId: currentMemberInModal.userId,
            grpId: Number(grpId)
          });

          // Close modal and reload
          closeMemberProfile();
          await loadGroupFromDB();
        } catch (err) {
          console.error("Error in remove member:", err);
          showAlert("An error occurred.", { title: "Error" });
        }
      },
      { title: "Remove Member", confirmText: "Remove", cancelText: "Cancel" }
    );
  });
}

document.querySelector("#groupInfoStack")?.addEventListener("click", (e) => {
    const card = e.target.closest("[data-member-id]");
    if (!card) return;
    const member = currentMembers.find((m) => String(m.userId) === card.dataset.memberId);
    if (member) openMemberProfile(member);
});

loadGroupFromDB();
loadTeacherSidebarProfile();
