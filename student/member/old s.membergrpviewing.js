/* ── Supabase accessor — lazy so it's never captured before supabaseClient.js runs ── */
const getSupabase = () => window.hiveSupabase;

/* ── ELEMENTS ─────────────────────────────────────────────────────────────── */
const topBackBtn          = document.querySelector("#topBackBtn");
const projectBreakdownTab = document.querySelector("#projectBreakdownTab");
const logoutBtn           = document.querySelector(".logout");
const leaveBtn            = document.querySelector(".leave-btn");

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

let currentMembers = [];

const escapeHTML = (value) => String(value || "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[char]));

const shortenText = (value, max = 14) => {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const renderShortText = (value, max = 14) =>
  `<span title="${escapeHTML(value)}">${escapeHTML(shortenText(value, max))}</span>`;

const shortenName = (value, max = 8) => {
  const text = String(value || "");
  if (text.length <= max) return text;
  const firstWord = text.trim().split(/\s+/)[0] || text;
  return `${firstWord.slice(0, max).trim()}...`;
};

const renderShortName = (value, max = 8) =>
  `<span title="${escapeHTML(value)}">${escapeHTML(shortenName(value, max))}</span>`;

const shortenEmail = (email, max = 16) => {
  const value = String(email || "");
  return value.length > max ? `${value.slice(0, max)}...` : value;
};

const renderEmail = (email) => `<span title="${escapeHTML(email)}">${escapeHTML(shortenEmail(email))}</span>`;

const safeConfirm = (message, onConfirm, options = {}) => {
  if (typeof showConfirmation === "function") {
    showConfirmation(message, onConfirm, options);
    return;
  }
  if (confirm(message)) onConfirm();
};

const showNotice = (message, options = {}) => {
  const { title = "Notice", okText = "OK" } = options;
  let modal = document.querySelector("#memberNoticeModalOverlay");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "memberNoticeModalOverlay";
    modal.className = "modal-overlay";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="memberNoticeTitle">
        <div class="confirmation-modal-header">
          <h2 id="memberNoticeTitle"></h2>
        </div>
        <div class="confirmation-modal-body">
          <p class="confirmation-message"></p>
        </div>
        <div class="confirmation-modal-actions">
          <button type="button" class="modal-btn post-btn" id="memberNoticeOkBtn"></button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const titleEl = modal.querySelector("#memberNoticeTitle");
  const messageEl = modal.querySelector(".confirmation-message");
  const okBtn = modal.querySelector("#memberNoticeOkBtn");

  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;
  if (okBtn) okBtn.textContent = okText;

  const closeNotice = () => {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    okBtn?.removeEventListener("click", closeNotice);
  };

  okBtn?.addEventListener("click", closeNotice);
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
};

const roleRank = (roleName) => ({ teacher: 3, leader: 2, member: 1 }[normalizeText(roleName)] || 0);

const uniqueMembersByUser = (members) => {
  const byUser = new Map();
  members.forEach((member) => {
    const key = member.userId || member.grpmemId;
    const existing = byUser.get(key);
    if (!existing || roleRank(member.roleName) > roleRank(existing.roleName)) {
      byUser.set(key, member);
    }
  });
  return Array.from(byUser.values());
};

const getProjectCountForGroup = async (supabase, grpId) => {
  const { count } = await supabase
    .from("PROJECT")
    .select("*", { count: "exact", head: true })
    .eq("grpId", grpId);
  return count || 0;
};

/* ── DB LOAD ──────────────────────────────────────────────────────────────── */
const loadGroupFromDB = async () => {
  const supabase = getSupabase();
  const grpId = getGroupId();
  if (!grpId || !supabase) return;

  // 1. Group info
  const { data: grp, error: grpErr } = await supabase
    .from("GROUP")
    .select("grpName, grpSubject, teacherId")
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

  const allMemberRows = members.map((m) => ({
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

  // Teachers are stored in GROUP.teacherId, not GROUPMEMBER — inject them manually
  if (grp?.teacherId) {
    const { data: teacherUser } = await supabase
      .from("USER")
      .select("userDisplayName, userEmail, avatarPath, DEPARTMENT(deptName)")
      .eq("userId", grp.teacherId)
      .maybeSingle();
    if (teacherUser) {
      allMemberRows.push({
        grpmemId:  null,
        userId:    grp.teacherId,
        roleId:    null,
        roleName:  "Teacher",
        fullName:  teacherUser.userDisplayName || "Unknown",
        email:     teacherUser.userEmail       || "No email",
        avatarPath: teacherUser.avatarPath     || null,
        progName:  null,
        deptName:  teacherUser.DEPARTMENT?.deptName || null,
      });
    }
  }

  const allMembers = uniqueMembersByUser(allMemberRows);
  currentMembers = allMembers;

  const projCount = await getProjectCountForGroup(supabase, grpId);

  // 4. Summary cards
  const nonTeacher = allMembers.filter((m) => normalizeText(m.roleName) !== "teacher");
  const summaryH3s = document.querySelectorAll(".summary-card h3");
  if (summaryH3s[0]) summaryH3s[0].textContent = grp?.teacherId ? 1 : 0;
  if (summaryH3s[1]) summaryH3s[1].textContent = nonTeacher.length;
  if (summaryH3s[2]) summaryH3s[2].textContent = projCount;

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
  const nameLimit = (cardClass.includes("leader-card") || cardClass.includes("teacher-card")) ? 18 : 8;
  const avatarUrl = resolveAvatar(member.avatarPath);
  const avatarStyle = avatarUrl
    ? `style="background-image: url('${avatarUrl}'); background-size: cover; background-position: center;"`
    : "";
  const avatarContent = !avatarUrl
    ? `<img src="../../assets/profile.png" alt="${member.fullName}">`
    : "";
  const isTeacher = cardClass.includes("teacher-card");

  return `
  <article class="info-card ${cardClass}" data-member-id="${member.userId}" style="cursor:pointer;">
    <div class="circle-avatar ${avatarSize}" ${avatarStyle}>
      ${avatarContent}
    </div>
    <div class="member-details">
      <div class="member-info">
        <h3>${renderShortName(member.fullName, nameLimit)}</h3>
        <p>${escapeHTML(member.roleName)}</p>
        <p>${renderEmail(member.email)}</p>
      </div>
      ${!isTeacher ? `
      <div class="stats">
        <p>Total Tasks: ${member.taskStats?.total || 0}</p>
        <p>Finished: ${member.taskStats?.finished || 0}</p>
        <p>Pending: ${member.taskStats?.pending || 0}</p>
        <p>Missed: ${member.taskStats?.missed || 0}</p>
      </div>` : ""}
    </div>
  </article>
`;
};

const renderGroupMembers = async (members) => {
  const container = document.querySelector("#groupInfoStack");
  if (!container) return;

  // Fetch task stats for each member in parallel
  const membersWithStats = await Promise.all(
    members.map(async (member) => {
      const taskStats = await getMemberTaskStats(member);
      return { ...member, taskStats };
    })
  );

  const teacher       = membersWithStats.find((m) => normalizeText(m.roleName) === "teacher");
  const leader        = membersWithStats.find((m) => normalizeText(m.roleName) === "leader");
  const normalMembers = membersWithStats.filter((m) => {
    const r = normalizeText(m.roleName);
    return r !== "teacher" && r !== "leader";
  });

  container.innerHTML = `
    ${teacher
      ? createMemberCard(teacher, "teacher-card", "small")
      : `<article class="info-card teacher-card"><h3>You currently have no teacher</h3></article>`
    }

    ${leader
      ? createMemberCard(leader, "leader-card", "large")
      : `<article class="info-card leader-card"><h3>No leader found</h3></article>`
    }

    <div class="member-grid">
      ${normalMembers.map((m) => createMemberCard(m, "member-card", "medium")).join("")}
    </div>
  `;

  // Attach click handlers directly to each rendered card
  container.querySelectorAll("[data-member-id]").forEach((card) => {
    card.addEventListener("click", () => {
      const member = currentMembers.find((m) => String(m.userId) === card.dataset.memberId);
      if (member) openMemberProfile(member);
    });
  });
};

/* ── EVENTS ───────────────────────────────────────────────────────────────── */
if (topBackBtn) {
  topBackBtn.addEventListener("click", () => {
    const queryReturnPage = new URLSearchParams(window.location.search).get("from");
    const referrerReturnPage = document.referrer.includes("/s.team.html") ? "teams" : null;
    const returnPage = referrerReturnPage
      || queryReturnPage
      || sessionStorage.getItem("hive_group_return_page");
    if (returnPage === "teams") window.location.href = "../s.team.html";
    else if (returnPage === "dashboard") window.location.href = "../s.dashb.html";
    else window.history.back();
  });
}

if (projectBreakdownTab) {
  projectBreakdownTab.addEventListener("click", () => {
    const grpId = getGroupId();
    window.location.href = grpId
      ? `s.membercategory.html?grpId=${grpId}`
      : "s.membercategory.html";
  });
}

document.querySelector("#mobileBreakdownBtn")?.addEventListener("click", () => {
  const grpId = getGroupId();
  window.location.href = grpId ? `s.membercategory.html?grpId=${grpId}` : "s.membercategory.html";
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

const sendLeaveRequest = async () => {
  const supabase = getSupabase();
  const grpId = getGroupId();
  if (!grpId || !supabase) {
    showNotice("Cannot connect to the group right now.", { title: "Ask to Leave" });
    return;
  }

  if (leaveBtn) leaveBtn.disabled = true;

  try {
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (!user || userErr) {
      showNotice("You must be logged in to ask to leave.", { title: "Ask to Leave" });
      return;
    }

    const { data: profile } = await supabase
      .from("USER")
      .select("userDisplayName, userEmail")
      .eq("userId", user.id)
      .maybeSingle();

    const { data: leaderRole } = await supabase
      .from("ROLE")
      .select("roleId")
      .eq("roleName", "Leader")
      .maybeSingle();

    const { data: leaderMembership, error: leaderErr } = await supabase
      .from("GROUPMEMBER")
      .select("grpmemId, userId")
      .eq("grpId", Number(grpId))
      .eq("roleId", leaderRole?.roleId)
      .maybeSingle();

    if (leaderErr || !leaderMembership) {
      showNotice("Could not find the group leader to send the request to.", { title: "Ask to Leave" });
      return;
    }

    const displayName = profile?.userDisplayName || profile?.userEmail || user.email || "A member";
    const { error } = await supabase.from("NOTIFICATION").insert({
      notiTitle: "Leave Request",
      notiBody: `${displayName} is asking to leave the group.`,
      "notiDate&Time": new Date().toISOString(),
      notiIsRead: false,
      userId: leaderMembership.userId,
      grpmemId: leaderMembership.grpmemId,
      grpId: Number(grpId)
    });

    if (error) {
      showNotice("Failed to send leave request: " + error.message, { title: "Ask to Leave" });
      return;
    }

    showNotice("Leave request sent.", { title: "Ask to Leave" });
  } finally {
    if (leaveBtn) leaveBtn.disabled = false;
  }
};

if (leaveBtn) {
  leaveBtn.addEventListener("click", () => {
    safeConfirm(
      "Send a leave request to your group leader or teacher?",
      sendLeaveRequest,
      { title: "Ask to Leave", confirmText: "Send Request", cancelText: "Cancel" }
    );
  });
}

/* ── SIDEBAR PROFILE ─────────────────────────────────────────────────────── */
const loadSidebarProfile = async () => {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("USER")
      .select("userDisplayName, userEmail, avatarPath")
      .eq("userId", user.id)
      .maybeSingle();
    if (!data) return;
    const profileBlock = document.querySelector(".profile-block");
    if (!profileBlock) return;
    const headings = profileBlock.querySelectorAll("h3");
    if (headings[0]) headings[0].textContent = data.userDisplayName || "No Name";
    if (headings[1]) headings[1].textContent = data.userEmail || user.email || "";
    const avatarImg = profileBlock.querySelector(".avatar-circle img");
    if (avatarImg && data.avatarPath) { const url = resolveAvatar(data.avatarPath); if (url) avatarImg.src = url; }
  } catch (err) {
    console.error("Failed to load sidebar profile:", err);
  }
};

/* ── MEMBER PROFILE MODAL ────────────────────────────────────────────────── */
const getMemberProfileEl = (id) => document.querySelector(id);
const memberProfileOverlay  = () => getMemberProfileEl("#memberProfileOverlay");
const memberProfileName     = () => getMemberProfileEl("#memberProfileName");
const memberProfileRole     = () => getMemberProfileEl("#memberProfileRole");
const memberProfileField    = () => getMemberProfileEl("#memberProfileField");
const memberProfileEmail    = () => getMemberProfileEl("#memberProfileEmail");
const memberProfileAvatar   = () => getMemberProfileEl("#memberProfileAvatar");
const closeMemberProfileBtn = () => getMemberProfileEl("#closeMemberProfileBtn");

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
  const overlay = memberProfileOverlay();
  if (!overlay) return;
  const nameEl    = memberProfileName();
  const roleEl    = memberProfileRole();
  const fieldEl   = memberProfileField();
  const emailEl   = memberProfileEmail();
  const avatarEl  = memberProfileAvatar();
  if (roleEl)  roleEl.textContent  = member.roleName;
  if (nameEl)  nameEl.textContent  = member.fullName;
  if (emailEl) emailEl.textContent = member.email;
  const field = member.deptName || member.progName || "";
  if (fieldEl) fieldEl.textContent = field ? (member.deptName ? `Department: ${field}` : `Program: ${field}`) : "";
  const avatarUrl = resolveAvatar(member.avatarPath);
  if (avatarEl) {
    if (avatarUrl) {
      avatarEl.style.backgroundImage = `url('${avatarUrl}')`;
      avatarEl.style.backgroundSize  = "cover";
      avatarEl.style.backgroundPosition = "center";
      avatarEl.style.cursor = "pointer";
      avatarEl.innerHTML = "";
      avatarEl.onclick = () => {
        const lb = getAvatarLightbox();
        lb.querySelector("#lightboxImg").src = avatarUrl;
        lb.style.display = "flex";
      };
    } else {
      avatarEl.style.backgroundImage = "";
      avatarEl.style.cursor = "default";
      avatarEl.onclick = null;
      avatarEl.innerHTML = `<img src="../../assets/profile.png" alt="${member.fullName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }
  }
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
};

const closeMemberProfile = () => {
  const overlay = memberProfileOverlay();
  overlay?.classList.remove("open");
  overlay?.setAttribute("aria-hidden", "true");
};

document.addEventListener("click", (e) => {
  const btn = e.target.closest("#closeMemberProfileBtn");
  if (btn) { closeMemberProfile(); return; }
  const overlay = memberProfileOverlay();
  if (overlay && e.target === overlay) closeMemberProfile();
});

/* ── INIT ─────────────────────────────────────────────────────────────────── */
loadGroupFromDB();
loadSidebarProfile();
