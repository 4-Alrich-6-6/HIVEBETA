/* ── Supabase accessor — lazy so it's never captured before supabaseClient.js runs ── */
const getSupabase = () => window.hiveSupabase;

const loadTopbarAvatar = async () => {
  const profileImage = document.querySelector(".profile-trigger img");
  const supabase = getSupabase();
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

/* ── ELEMENTS ─────────────────────────────────────────────────────────────── */
const topBackBtn               = document.querySelector("#TopBackBtn");
// NOTE: #backBtn does not exist in the HTML — TopBackBtn handles all back navigation
const projectBreakdownTab      = document.querySelector("#projectBreakdownTab");
const groupTabs                = document.querySelectorAll(".group-tab");
const openAddMembersModalBtn   = document.querySelector("#openAddMembersModalBtn");
const memberSearchInput        = document.querySelector("#memberSearchInput");
const memberSearchForm         = document.querySelector("#memberSearchForm");
const openInstructorsInviteBtn = document.querySelector("#openInstructorsInviteBtn");
const addMembersModalOverlay   = document.querySelector("#addMembersModalOverlay");
const discardAddMembersBtn     = document.querySelector("#discardAddMembersBtn");
const copyInviteLinkBtn        = document.querySelector("#copyInviteLinkBtn");
const copyGroupLinkBtn         = document.querySelector("#copyGroupLinkBtn");
const groupLinkValue           = document.querySelector("#groupLinkValue");
const openRemoveMembersModalBtn= document.querySelector("#openRemoveMembersModalBtn");
const removeMembersModalOverlay= document.querySelector("#removeMembersModalOverlay");
const removeMembersList        = document.querySelector("#removeMembersList");
const discardRemoveMembersBtn  = document.querySelector("#discardRemoveMembersBtn");
const removeMembersBtn         = document.querySelector("#removeMembersBtn");
const leaveBtn                 = document.querySelector("#leaveBtn");
const selectLeaderModalOverlay = document.querySelector("#selectLeaderModalOverlay");
const discardSelectLeaderBtn   = document.querySelector("#discardSelectLeaderBtn");
const selectLeaderList         = document.querySelector("#selectLeaderList");
const leaveGroupBtn            = document.querySelector("#leaveGroupBtn");
const confirmLeaveModalOverlay = document.querySelector("#confirmLeaveModalOverlay");
const cancelLeaveBtn           = document.querySelector("#cancelLeaveBtn");
const confirmLeaveBtn          = document.querySelector("#confirmLeaveBtn");
const logoutBtn                = document.querySelector(".logout");
const editGroupBtn             = document.querySelector("#editGroupBtn");
const deleteGroupBtn           = document.querySelector("#deleteGroupBtn");
const editGroupModalOverlay    = document.querySelector("#editGroupModalOverlay");
const editGroupForm            = document.querySelector("#editGroupForm");
const editGroupNameInput       = document.querySelector("#editGroupNameInput");
const editGroupSubjectInput    = document.querySelector("#editGroupSubjectInput");
const editGroupDescriptionInput = document.querySelector("#editGroupDescriptionInput");
const editGroupMottoInput      = document.querySelector("#editGroupMottoInput");
const editGroupScheduleList    = document.querySelector("#editGroupScheduleList");
const editGroupLinksList       = document.querySelector("#editGroupLinksList");
const addEditScheduleBtn       = document.querySelector("#addEditScheduleBtn");
const addEditLinkBtn           = document.querySelector("#addEditLinkBtn");
const discardEditGroupBtn      = document.querySelector("#discardEditGroupBtn");

const closeEditGroupModalNow = () => {
  editGroupModalOverlay?.classList.remove("open");
  editGroupModalOverlay?.setAttribute("aria-hidden", "true");
};

const requestCloseEditGroupModal = () => {
  safeShowConfirmation("Are you sure you want to close this form? Your changes will be lost.", closeEditGroupModalNow, {
    title: "Close Form",
    confirmText: "Close",
    cancelText: "Keep Editing"
  });
};

const editScheduleDays = ["", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const addEditScheduleRow = (schedule = {}) => {
  if (!editGroupScheduleList) return;
  const row = document.createElement("div");
  row.className = "schedule-fields";
  row.innerHTML = `<select name="editScheduleDay" aria-label="Meeting day"><option value="">Day</option><option>Sunday</option><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option></select><div class="schedule-time-group"><span>From</span><input name="editScheduleFrom" type="time" aria-label="Meeting start time"></div><span class="schedule-time-separator">To</span><input class="schedule-end-time" name="editScheduleTo" type="time" aria-label="Meeting end time"><button type="button" class="remove-schedule-btn" aria-label="Remove meeting schedule">×</button>`;
  row.querySelector("[name='editScheduleDay']").value = schedule.day || "";
  row.querySelector("[name='editScheduleFrom']").value = schedule.from || "";
  row.querySelector("[name='editScheduleTo']").value = schedule.to || "";
  row.querySelector(".remove-schedule-btn")?.addEventListener("click", () => {
    if (editGroupScheduleList.children.length > 1) row.remove();
    else row.querySelectorAll("input").forEach((input) => { input.value = ""; });
  });
  editGroupScheduleList.appendChild(row);
};

const parseEditScheduleTime = (value) => {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "";
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
};

const populateEditSchedule = () => {
  if (!editGroupScheduleList) return;
  editGroupScheduleList.innerHTML = "";
  const schedules = String(currentGroup.meetingSchedule || "").split(";").map((entry) => {
    const match = entry.trim().match(/^([^,]+),\s*(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))$/i);
    return match ? { day: match[1], from: parseEditScheduleTime(match[2]), to: parseEditScheduleTime(match[3]) } : null;
  }).filter(Boolean);
  addEditScheduleRow(schedules[0] || {});
  schedules.slice(1).forEach(addEditScheduleRow);
};

const formatEditScheduleTime = (value) => {
  if (!value) return "";
  const [hours, minutes] = value.split(":");
  const numericHour = Number(hours);
  return `${numericHour % 12 || 12}:${minutes} ${numericHour >= 12 ? "PM" : "AM"}`;
};

const getEditSchedule = () => [...(editGroupScheduleList?.querySelectorAll(".schedule-fields") || [])]
  .map((row) => {
    const day = row.querySelector("[name='editScheduleDay']")?.value || "";
    const from = formatEditScheduleTime(row.querySelector("[name='editScheduleFrom']")?.value);
    const to = formatEditScheduleTime(row.querySelector("[name='editScheduleTo']")?.value);
    return day && from && to ? `${day}, ${from} - ${to}` : "";
  }).filter(Boolean).join("; ") || null;

const validateEditSchedule = () => {
  const schedules = [];
  editGroupScheduleList?.querySelectorAll(".schedule-fields").forEach((row) => {
    const day = row.querySelector("[name='editScheduleDay']");
    const from = row.querySelector("[name='editScheduleFrom']");
    const to = row.querySelector("[name='editScheduleTo']");
    [day, from, to].forEach((input) => input?.setCustomValidity(""));
    if (!day?.value && !from?.value && !to?.value) return;
    if (!day?.value || !from?.value || !to?.value) {
      to?.setCustomValidity("Complete the meeting schedule or clear the row.");
      schedules.push({ invalid: true, input: to });
      return;
    }
    schedules.push({ day: day.value, start: Number(from.value.replace(":", "")), end: Number(to.value.replace(":", "")), input: to });
  });
  const invalid = schedules.find((schedule) => schedule.invalid);
  if (invalid) return invalid.input.validationMessage;
  for (const schedule of schedules) {
    if (schedule.end <= schedule.start) {
      schedule.input.setCustomValidity("The end time must be later than the start time.");
      return schedule.input.validationMessage;
    }
  }
  const grouped = schedules.reduce((groups, schedule) => {
    (groups[schedule.day] ||= []).push(schedule);
    return groups;
  }, {});
  for (const daySchedules of Object.values(grouped)) {
    const ordered = daySchedules.sort((a, b) => a.start - b.start);
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1];
      const current = ordered[index];
      if (current.start === previous.start && current.end === previous.end) current.input.setCustomValidity("Duplicate meeting schedules are not allowed.");
      else if (current.start < previous.end) current.input.setCustomValidity("Meeting schedules on the same day cannot overlap.");
      if (current.input.validationMessage) return current.input.validationMessage;
    }
  }
  return "";
};

editGroupScheduleList?.addEventListener("input", validateEditSchedule);
editGroupScheduleList?.addEventListener("change", validateEditSchedule);

const editLinkTypeMarkup = (type) => {
  if (type === "resources") return `<svg class="resources-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21.4231 13.88785 15.33356 3.33792H8.66663l6.09 10.54993ZM8.08917 4.33835 2 14.88736l3.33356 5.77472 6.08911-10.54926Zm1.73273 10.549L6.48877 20.66208h12.17786L22 14.88736Z" fill="currentColor"></path></svg>`;
  const normalizedType = String(type || "other").toLowerCase().replace(/[\s_-]+/g, "");
  const typeAliases = { discord: "discord", teamdiscord: "discord", meet: "meet", googlemeet: "meet", resources: "resources", resource: "resources", repository: "repository", repo: "repository", other: "other" };
  const iconType = typeAliases[normalizedType] || "other";
  const icon = aboutLinkTemplates?.find((template) => template.querySelector(`.${iconType}-icon`))?.querySelector("svg") || document.querySelector(`.about-links .${iconType}-icon`);
  if (icon) return icon.outerHTML;
  if (iconType === "meet") return `<svg class="meet-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M41.05 12.6c1.63-1.3 2.85-.23 2.85 1.14v20.52c0 1.73-1.22 2.44-2.85 1.14L26.79 24ZM14 8v32M4.9 17.16h21.89v13.68H4.9m0-13.68L14 8h18.5a3.2 3.2 0 0 1 2.85 2.85v26.26A3.2 3.2 0 0 1 32.5 40H7.75a2.81 2.81 0 0 1-2.85-2.89Z" fill="none" stroke="currentColor" stroke-width="4.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
  if (iconType === "other") return `<svg class="other-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15m3.15 5.85a5 5 0 0 0-7.07-.07l-2 2a5 5 0 0 0 7.07 7.07l1.15-1.15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return "";
};

const addEditLinkRow = (link = {}) => {
  if (!editGroupLinksList) return;
  const row = document.createElement("div");
  row.className = "group-link-row";
  row.innerHTML = `<span class="group-link-icon" aria-hidden="true">${editLinkTypeMarkup(link.type || "other")}</span><select name="editLinkType" aria-label="Link type"><option value="discord">Discord</option><option value="meet">Google Meet</option><option value="resources">Resources</option><option value="repository">Repository</option><option value="other">Other</option></select><input name="editLinkUrl" type="url" aria-label="Link URL" placeholder="Paste link"><button type="button" class="remove-group-link-btn" aria-label="Remove link">×</button>`;
  const linkTypeSelect = row.querySelector("[name='editLinkType']");
  const linkIcon = row.querySelector(".group-link-icon");
  const normalizedType = String(link.type || "other").toLowerCase().replace(/[\s_-]+/g, "");
  const typeAliases = { discord: "discord", teamdiscord: "discord", meet: "meet", googlemeet: "meet", resources: "resources", resource: "resources", repository: "repository", repo: "repository", other: "other" };
  linkTypeSelect.value = typeAliases[normalizedType] || "other";
  linkTypeSelect.addEventListener("change", () => { linkIcon.innerHTML = editLinkTypeMarkup(linkTypeSelect.value); });
  row.querySelector("[name='editLinkUrl']").value = link.url || "";
  row.querySelector(".remove-group-link-btn").addEventListener("click", () => {
    row.remove();
    if (!editGroupLinksList.children.length) addEditLinkRow();
  });
  editGroupLinksList.appendChild(row);
};

const populateEditLinks = () => {
  if (!editGroupLinksList) return;
  editGroupLinksList.innerHTML = "";
  (currentGroup.links?.length ? currentGroup.links : [{}]).forEach(addEditLinkRow);
};

const getEditLinks = () => [...(editGroupLinksList?.querySelectorAll(".group-link-row") || [])]
  .map((row) => ({ type: row.querySelector("[name='editLinkType']")?.value || "other", url: row.querySelector("[name='editLinkUrl']")?.value.trim() || "" }))
  .filter((link) => link.url);

addEditScheduleBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  addEditScheduleRow();
});
addEditLinkBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  addEditLinkRow();
});

const openEditGroupModal = () => {
  if (!editGroupModalOverlay) return;
  if (editGroupNameInput) editGroupNameInput.value = currentGroup.name || "";
  if (editGroupSubjectInput) editGroupSubjectInput.value = currentGroup.subject || "";
  if (editGroupDescriptionInput) editGroupDescriptionInput.value = currentGroup.description || "";
  if (editGroupMottoInput) editGroupMottoInput.value = currentGroup.motto || "";
  populateEditSchedule();
  populateEditLinks();
  editGroupModalOverlay.classList.add("open");
  editGroupModalOverlay.setAttribute("aria-hidden", "false");
  editGroupNameInput?.focus();
};

editGroupBtn?.addEventListener("click", openEditGroupModal);
discardEditGroupBtn?.addEventListener("click", requestCloseEditGroupModal);
editGroupModalOverlay?.addEventListener("click", (event) => {
  if (event.target === editGroupModalOverlay) requestCloseEditGroupModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && editGroupModalOverlay?.classList.contains("open")) {
    event.preventDefault();
    requestCloseEditGroupModal();
  }
});

editGroupForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (validateEditSchedule()) {
    editGroupScheduleList?.querySelector("input:invalid, select:invalid")?.reportValidity();
    return;
  }
  const name = editGroupNameInput?.value.trim();
  const subject = editGroupSubjectInput?.value.trim() || null;
  const description = editGroupDescriptionInput?.value.trim() || null;
  const motto = editGroupMottoInput?.value.trim() || null;
  const meetingSchedule = getEditSchedule();
  const links = getEditLinks();
  const grpId = getGroupId();
  const supabase = getSupabase();
  if (!name || !grpId || !supabase) return;
  safeShowConfirmation(`Save changes to "${name}"?`, async () => {
    const { error } = await supabase.from("GROUP").update({
      grpName: name,
      grpSubject: subject,
      grpDescription: description,
      grpMotto: motto,
      grpMeetingSchedule: meetingSchedule,
      grpLinks: links
    }).eq("grpId", Number(grpId));
    if (error) { showAlert(`Failed to update swarm: ${error.message}`, { title: "Error" }); return; }
    currentGroup.name = name;
    currentGroup.subject = subject || "Subject";
    currentGroup.description = description || "";
    currentGroup.motto = motto || "";
    currentGroup.meetingSchedule = meetingSchedule || "";
    currentGroup.links = links;
    document.querySelector("#groupTitle")?.replaceChildren(document.createTextNode(name));
    document.querySelector("#aboutDescription")?.replaceChildren(document.createTextNode(description || `${name} is a ${currentGroup.subject} team. Keep your shared project context here.`));
    renderAboutDetails();
    closeEditGroupModalNow();
  }, { title: "Edit Swarm", confirmText: "Save", cancelText: "Cancel" });
});

deleteGroupBtn?.addEventListener("click", () => {
  const grpId = getGroupId();
  const supabase = getSupabase();
  if (!grpId || !supabase) return;
  safeShowConfirmation(`Delete "${currentGroup.name}" and all of its projects and tasks? This cannot be undone.`, async () => {
    const { error } = await supabase.rpc("delete_group_cascade", { p_grp_id: Number(grpId) });
    if (error) { showAlert(`Failed to delete swarm: ${error.message}`, { title: "Error" }); return; }
    window.location.href = "../s.team.html";
  }, { title: "Delete Swarm", confirmText: "Delete", cancelText: "Cancel" });
});

/* ── HELPERS ──────────────────────────────────────────────────────────────── */
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

const resolveAvatar = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = sb.storage.from("profilePicture").getPublicUrl(path);
  return data?.publicUrl || null;
};

const truncateEmail = (email, maxLen = 25) => {
  return email && email.length > maxLen ? email.slice(0, maxLen) + "..." : email;
};

const safeShowConfirmation = (msg, onConfirm, opts = {}) => {
  if (typeof showConfirmation === "function") showConfirmation(msg, onConfirm, opts);
  else if (confirm(msg)) onConfirm();
};

const getMemberStat = (member, keys) => {
  const key = keys.find((k) => member[k] !== undefined && member[k] !== null);
  return key ? member[key] : 0;
};

/* ── STATE (populated by loadGroupFromDB) ────────────────────────────────── */
let currentMembers = []; // full list of {grpmemId, userId, fullName, email, roleName, roleId}
let canManageMembers = false;
let currentGroup = { name: "Team", subject: "Subject", description: "", motto: "", meetingSchedule: "", links: [], createdAt: "", parentGrpId: null };

const formatGroupCreatedDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
};

const loadSwarmActivityStatus = async (grpId) => {
  const supabase = getSupabase();
  const statusBadge = document.querySelector("#swarmStatusBadge");
  if (!supabase || !statusBadge || !grpId) return;
  const [{ data: notifications }, { data: notes }] = await Promise.all([
    supabase.from("NOTIFICATION").select('"notiDate&Time"').eq("grpId", Number(grpId)).order("notiDate&Time", { ascending: false }).limit(1),
    supabase.from("GROUP_NOTE").select("createdAt").eq("grpId", Number(grpId)).order("createdAt", { ascending: false }).limit(1)
  ]);
  const latestActivity = [notifications?.[0]?.["notiDate&Time"], notes?.[0]?.createdAt]
    .map((value) => new Date(value || 0).getTime()).filter(Number.isFinite).sort((a, b) => b - a)[0] || 0;
  const isActive = Date.now() - latestActivity < 7 * 24 * 60 * 60 * 1000;
  statusBadge.textContent = isActive ? "Active" : "Inactive";
  statusBadge.classList.toggle("status-active", isActive);
  statusBadge.classList.toggle("status-inactive", !isActive);
};

/* ── DB LOAD ──────────────────────────────────────────────────────────────── */
const loadGroupFromDB = async () => {
  const supabase = getSupabase(); // FIX: use lazy accessor, not the captured-at-parse-time undefined value
  const grpId = getGroupId();
  if (!grpId || !supabase) return;

  // 1. Group info
  const { data: grp, error: grpErr } = await supabase
    .from("GROUP")
    .select("grpName, grpSubject, grpDescription, grpMotto, grpMeetingSchedule, grpLinks, grpCreatedAt, teacherId, parentGrpId")
    .eq("grpId", grpId)
    .maybeSingle();

  if (!grpErr && grp) {
    currentGroup = {
      name: grp.grpName || "Team",
      subject: grp.grpSubject || "Subject",
      description: grp.grpDescription || "",
      motto: grp.grpMotto || "",
      meetingSchedule: grp.grpMeetingSchedule || "",
      links: Array.isArray(grp.grpLinks) ? grp.grpLinks : [],
      createdAt: grp.grpCreatedAt || "",
      parentGrpId: grp.parentGrpId || null
    };
    if (topBackBtn) {
      const backLabel = currentGroup.parentGrpId ? "Colony" : "Teams";
      topBackBtn.setAttribute("aria-label", `Back to ${backLabel}`);
      const label = topBackBtn.querySelector("span");
      if (label) label.textContent = backLabel;
    }
    const h2 = document.querySelector(".group-label h2");
    const p  = document.querySelector(".group-label p");
    const groupTitle = document.querySelector("#groupTitle");
    const groupMeta = document.querySelector("#groupMeta");
    if (h2) h2.textContent = grp.grpName    || "Group Name";
    if (p)  p.textContent  = grp.grpSubject || "Subject";
    if (groupTitle) groupTitle.textContent = grp.grpName || "Team";
    if (groupMeta) groupMeta.textContent = `${grp.grpSubject || "Loading..."} | ? Members | ? Instructors`;
    if (groupLinkValue) groupLinkValue.value = String(grpId);
    const aboutDescription = document.querySelector("#aboutDescription");
    if (aboutDescription) aboutDescription.textContent = currentGroup.description || `${currentGroup.name} is a ${currentGroup.subject} team. Keep your shared project context here.`;
    const createdDate = document.querySelector("#swarmCreatedDate");
    if (createdDate) createdDate.textContent = formatGroupCreatedDate(currentGroup.createdAt);
    renderAboutDetails();
    loadSwarmActivityStatus(grpId);
  }

  // 2. Members (join USER and ROLE)
  const { data: members, error: memErr } = await supabase
    .from("GROUPMEMBER")
    .select("grpmemId, userId, roleId, ROLE(roleName), USER(userDisplayName, userEmail, avatarPath, PROGRAM(progName), DEPARTMENT(deptName))")
    .eq("grpId", grpId);

  if (memErr || !members) {
    console.error("Error loading members:", memErr);
    return;
  }

  currentMembers = members.map((m) => ({
    grpmemId:  m.grpmemId,
    userId:    m.userId,
    roleId:    m.roleId,
    roleName:  m.ROLE?.roleName         || "Member",
    fullName:  m.USER?.userDisplayName  || "Unknown",
    email:     m.USER?.userEmail        || "No email",
    avatarPath: m.USER?.avatarPath      || null,
    progName:  m.USER?.PROGRAM?.progName   || null,
    deptName:  m.USER?.DEPARTMENT?.deptName || null,
  }));

  // Merge the group teacher with an existing membership instead of counting them twice.
  if (grp?.teacherId) {
    const existingTeacher = currentMembers.find((member) => member.userId === grp.teacherId);
    if (existingTeacher) existingTeacher.roleName = "Teacher";

    const { data: teacherUser } = await supabase
      .from("USER")
      .select("userDisplayName, userEmail, avatarPath, DEPARTMENT(deptName)")
      .eq("userId", grp.teacherId)
      .maybeSingle();
    if (teacherUser && !existingTeacher) {
      currentMembers.push({
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

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  canManageMembers = Boolean(currentUser && currentMembers.some((member) => String(member.userId) === String(currentUser.id) && normalizeText(member.roleName) === "leader"));

  // 3. Project count
  const { count: projCount = 0 } = await supabase
    .from("PROJECT")
    .select("*", { count: "exact", head: true })
    .eq("grpId", grpId);

  // 4. Render summary cards
  const nonTeacher = currentMembers.filter((m) => normalizeText(m.roleName) !== "teacher");
  const instructors = currentMembers.filter((m) => normalizeText(m.roleName) === "teacher");
  const groupMeta = document.querySelector("#groupMeta");
  if (groupMeta) groupMeta.textContent = `${grp?.grpSubject || "Loading..."} | ${nonTeacher.length} Members | ${instructors.length} Instructors`;
  const summaryH3s = document.querySelectorAll(".summary-card h3");
  if (summaryH3s[0]) summaryH3s[0].textContent = instructors.length;
  if (summaryH3s[1]) summaryH3s[1].textContent = nonTeacher.length;
  if (summaryH3s[2]) summaryH3s[2].textContent = projCount;
  const aboutProjectCount = document.querySelector("#aboutProjectCount");
  if (aboutProjectCount) aboutProjectCount.textContent = `${projCount} ${projCount === 1 ? "Project" : "Projects"}`;

  // 5. Render member cards
  await renderGroupMembers(currentMembers);
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

const createMemberCard = (member, cardClass, avatarSize) => {
  const avatarUrl = resolveAvatar(member.avatarPath);
  const avatarStyle = avatarUrl
    ? `style="background-image: url('${avatarUrl}'); background-size: cover; background-position: center;"`
    : "";
  const avatarContent = !avatarUrl
    ? `<img src="../../assets/profile.png" alt="${member.fullName}">`
    : "";
  const isTeacher = cardClass.includes("teacher-card");
  const isLeader = normalizeText(member.roleName) === "leader";

  return `
  <article class="info-card ${cardClass}" data-member-id="${member.userId}" style="cursor:pointer;">
    <div class="circle-avatar ${avatarSize}" ${avatarStyle}>
      ${avatarContent}
    </div>
    <div class="member-details">
      <div class="member-info">
        <h3>${member.fullName}</h3>
        <p>${member.roleName}</p>
      </div>
      ${canManageMembers && !isTeacher && !isLeader ? `
      <button class="member-more-btn" type="button" aria-label="More member options">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <g fill="#000000">
            <ellipse cx="22" cy="50" rx="8" ry="11"></ellipse>
            <ellipse cx="50" cy="50" rx="8" ry="11"></ellipse>
            <ellipse cx="78" cy="50" rx="8" ry="11"></ellipse>
          </g>
        </svg>
      </button>
      <div class="member-options-menu" role="menu">
        <button type="button" role="menuitem" data-member-action="remove">Remove from Swarm</button>
        <button type="button" role="menuitem" data-member-action="leader">Set as Leader</button>
      </div>` : ""}
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
  const memberCards = document.querySelector("#memberCards");
  const instructorCards = document.querySelector("#instructorCards");
  const adminCard = document.querySelector("#groupAdminCard");
  if (!memberCards || !instructorCards) return;

  // Fetch task stats for each member in parallel
  const membersWithStats = await Promise.all(
    members.map(async (member) => {
      const taskStats = await getMemberTaskStats(member);
      return { ...member, taskStats };
    })
  );

  const teachers      = membersWithStats.filter((m) => normalizeText(m.roleName) === "teacher");
  const leader        = membersWithStats.find((m) => normalizeText(m.roleName) === "leader");
  const normalMembers = membersWithStats.filter((m) => {
    const r = normalizeText(m.roleName);
    return r !== "teacher" && r !== "leader";
  });

  if (adminCard) {
    adminCard.innerHTML = leader
      ? `<article class="group-admin-card" data-member-id="${leader.userId}"><div class="circle-avatar medium">${resolveAvatar(leader.avatarPath) ? `<img src="${resolveAvatar(leader.avatarPath)}" alt="">` : "<img src=\"../../assets/profile-placeholder.svg\" alt=\"\">"}</div><strong>${leader.fullName}</strong></article>`
      : "<p>Administrator unavailable</p>";
  }

  memberCards.innerHTML = `
    <div class="member-grid">
      ${leader ? createMemberCard(leader, "leader-card", "large") : ""}
      ${normalMembers.map((m) => createMemberCard(m, "member-card", "medium")).join("")}
    </div>
    ${!leader && !normalMembers.length ? `<article class="info-card"><h3>No members found</h3></article>` : ""}
  `;

  instructorCards.innerHTML = teachers.length
    ? teachers.map((teacher) => createMemberCard(teacher, "teacher-card member-card", "medium")).join("")
    : `<article class="info-card teacher-card"><h3>You currently have no instructor</h3></article>`;

  filterMemberCards();
};

const filterMemberCards = () => {
  const query = normalizeText(memberSearchInput?.value);
  const memberCards = document.querySelector("#memberCards");
  const cards = memberCards ? [...memberCards.querySelectorAll("[data-member-id]")] : [];
  let visibleCount = 0;

  cards.forEach((card) => {
    const memberName = card.querySelector(".member-info h3")?.textContent || "";
    const matches = !query || normalizeText(memberName).includes(query);
    card.hidden = !matches;
    card.style.display = matches ? "" : "none";
    if (matches) visibleCount += 1;
  });

  const emptyState = memberCards?.querySelector(".member-search-empty");
  if (query && visibleCount === 0) {
    if (!emptyState && memberCards) {
      memberCards.insertAdjacentHTML("beforeend", "<p class='member-search-empty'>No contributors found</p>");
    }
  } else {
    emptyState?.remove();
  }
};

if (memberSearchInput) memberSearchInput.addEventListener("input", filterMemberCards);
if (memberSearchForm) memberSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  filterMemberCards();
});

/* ── MEMBER PROFILE MODAL ────────────────────────────────────────────────── */
const memberProfileOverlay   = document.querySelector("#memberProfileOverlay");
const memberProfileName      = document.querySelector("#memberProfileName");
const memberProfileRole      = document.querySelector("#memberProfileRole");
const memberProfileField     = document.querySelector("#memberProfileField");
const memberProfileEmail     = document.querySelector("#memberProfileEmail");
const memberProfileAvatar    = document.querySelector("#memberProfileAvatar");
const closeMemberProfileBtn  = document.querySelector("#closeMemberProfileBtn");

const noteAddModalOverlay    = document.querySelector("#noteAddModalOverlay");
const noteAddModalTitle      = document.querySelector("#noteAddModalTitle");
const noteAddForm            = document.querySelector("#noteAddForm");
const noteTitleInput         = document.querySelector("#noteTitleInput");
const noteTitleCounter       = document.querySelector("#noteTitleCounter");
const noteBodyInput          = document.querySelector("#noteBodyInput");
const noteLabelSelect        = document.querySelector("#noteLabelSelect");
const discardNoteAddBtn      = document.querySelector("#discardNoteAddBtn");
const openAddNoteModalBtn    = document.querySelector("#openAddNoteModalBtn");
const notesList              = document.querySelector("#notesList");
const noteDetailOverlay      = document.querySelector("#noteDetailOverlay");
const noteDetailTitle        = document.querySelector("#noteDetailTitle");
const noteDetailContent      = document.querySelector("#noteDetailContent");
const noteDetailImportance   = document.querySelector("#noteDetailImportance");
const noteDetailDate         = document.querySelector("#noteDetailDate");
const noteDetailAuthor       = document.querySelector("#noteDetailAuthor");
const noteCommentsList       = document.querySelector("#noteCommentsList");
const noteCommentForm        = document.querySelector("#noteCommentForm");
const noteCommentInput       = document.querySelector("#noteCommentInput");
const closeNoteDetailBtn     = document.querySelector("#closeNoteDetailBtn");
const editNoteBtn            = document.querySelector("#editNoteBtn");
const removeNoteBtn          = document.querySelector("#removeNoteBtn");
const saveNoteBtn            = document.querySelector("#saveNoteBtn");
const editCommentOverlay     = document.querySelector("#editCommentOverlay");
const editCommentForm        = document.querySelector("#editCommentForm");
const editCommentInput       = document.querySelector("#editCommentInput");
const cancelEditCommentBtn   = document.querySelector("#cancelEditCommentBtn");
let activeNote = null;
let editingNoteId = null;
let editingComment = null;

const updateNoteTitleCounter = () => {
  if (noteTitleCounter) noteTitleCounter.textContent = `${noteTitleInput?.value.length || 0}/49`;
};

const NOTES_LABEL_THEME = {
  "Announcement / Update": { className: "note-label-red", color: "#FF6868" },
  "Question / Help Needed": { className: "note-label-green", color: "#7BF1A8" },
  "Idea / Proposal": { className: "note-label-teal", color: "#4ECDC4" },
  "Shoutout / Kudos": { className: "note-label-kudos", color: "#FFFFFF" },
  "Summary / Brief": { className: "note-label-blue", color: "#8ECAE6" },
  "Discussion / Request for Comments": { className: "note-label-pink", color: "#FF70AE" },
  "Resource / Link": { className: "note-label-peach", color: "#FFEBD9" },
  "Bug Log / Incident": { className: "note-label-bug", color: "#FF70AE" }
};

const formatNoteDate = (value) => {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
};

  const loadNoteComments = async (noteId) => {
    const supabase = getSupabase();
    if (!supabase || !noteCommentsList) return;
    const { data: { user } } = await supabase.auth.getUser();
    noteCommentsList.textContent = "Loading comments...";
    const { data: comments, error } = await supabase
      .from("GROUP_NOTE_COMMENT")
      .select("commentId, userId, commentBody, createdAt, USER(userDisplayName, avatarPath)")
      .eq("noteId", Number(noteId))
      .order("createdAt", { ascending: true });

    if (error) {
      console.error("Failed to load comments:", error);
      noteCommentsList.textContent = "Unable to load comments.";
      return;
    }

    noteCommentsList.replaceChildren();
    if (!comments?.length) {
      noteCommentsList.textContent = "No comments yet.";
      return;
    }

    comments.forEach((comment) => {
      const item = document.createElement("article");
      item.className = "note-comment";
      item.setAttribute("role", "listitem");
      const avatar = document.createElement("img");
      avatar.className = "note-comment-avatar";
      avatar.src = resolveAvatar(comment.USER?.avatarPath) || "../../assets/profile-placeholder.svg";
      avatar.alt = "";
      const content = document.createElement("div");
      content.className = "note-comment-content";
      const author = document.createElement("strong");
      author.textContent = comment.USER?.userDisplayName || "Unknown user";
      const body = document.createElement("p");
      body.textContent = comment.commentBody;
      const date = document.createElement("time");
      date.textContent = formatNoteDate(comment.createdAt);
      content.append(author, body, date);
      if (user && String(comment.userId) === String(user.id)) {
        const actions = document.createElement("span");
        actions.className = "note-comment-actions";
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", async (event) => {
          event.stopPropagation();
          editingComment = { ...comment, noteId };
          editCommentInput.value = comment.commentBody || "";
          editCommentOverlay.classList.add("open");
          editCommentOverlay.setAttribute("aria-hidden", "false");
          editCommentInput.focus();
        });
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", (event) => {
          event.stopPropagation();
          safeShowConfirmation("Delete this comment? This cannot be undone.", async () => {
            const { data: deletedComments, error } = await supabase.from("GROUP_NOTE_COMMENT").delete().eq("commentId", comment.commentId).eq("userId", user.id).select("commentId");
            if (error) { showAlert(`Failed to delete comment: ${error.message}`, { title: "Error" }); return; }
            if (!deletedComments?.length) { showAlert("The comment could not be deleted. Check the comment table permissions.", { title: "Delete Failed" }); return; }
            await loadNoteComments(noteId);
          }, { title: "Delete Comment", confirmText: "Delete", cancelText: "Cancel" });
        });
        actions.append(editButton, deleteButton);
        content.append(actions);
      }
      item.append(avatar, content);
      noteCommentsList.appendChild(item);
    });
  };

const closeNoteDetail = () => {
  noteDetailOverlay?.classList.remove("open");
  noteDetailOverlay?.setAttribute("aria-hidden", "true");
};

const closeEditCommentModal = () => {
  editCommentOverlay?.classList.remove("open");
  editCommentOverlay?.setAttribute("aria-hidden", "true");
  editCommentForm?.reset();
  editingComment = null;
};

cancelEditCommentBtn?.addEventListener("click", closeEditCommentModal);
editCommentOverlay?.addEventListener("click", (event) => {
  if (event.target === editCommentOverlay) closeEditCommentModal();
});

editCommentForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const supabase = getSupabase();
  const commentBody = editCommentInput?.value.trim();
  if (!supabase || !editingComment || !commentBody) return;
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user || String(user.id) !== String(editingComment.userId)) {
    showAlert("You can only edit your own comments.", { title: "Not Allowed" });
    return;
  }
  const { data: updatedComments, error } = await supabase.from("GROUP_NOTE_COMMENT")
    .update({ commentBody })
    .eq("commentId", editingComment.commentId)
    .eq("userId", user.id)
    .select("commentId");
  if (error) { showAlert(`Failed to edit comment: ${error.message}`, { title: "Error" }); return; }
  if (!updatedComments?.length) { showAlert("The comment could not be updated. Check the comment table permissions.", { title: "Edit Failed" }); return; }
  const noteId = editingComment.noteId;
  closeEditCommentModal();
  await loadNoteComments(noteId);
});

const closeNoteAddModalNow = () => {
  noteAddModalOverlay?.classList.remove("open");
  noteAddModalOverlay?.setAttribute("aria-hidden", "true");
  noteAddForm?.reset();
  updateNoteTitleCounter();
  editingNoteId = null;
  if (noteAddModalTitle) noteAddModalTitle.textContent = "Add Swarm Note";
  if (saveNoteBtn) saveNoteBtn.textContent = "Post";
};

const requestCloseNoteAddModal = () => {
  safeShowConfirmation("Are you sure you want to close this note? Your changes will be lost.", closeNoteAddModalNow, {
    title: "Close Note",
    confirmText: "Close",
    cancelText: "Keep Editing"
  });
};

const openNoteAddModal = () => {
  if (!noteAddModalOverlay) return;
  noteAddModalOverlay.classList.add("open");
  noteAddModalOverlay.setAttribute("aria-hidden", "false");
  updateNoteTitleCounter();
  noteTitleInput?.focus();
};

noteTitleInput?.addEventListener("input", updateNoteTitleCounter);

const getNoteLabelTheme = (label) => NOTES_LABEL_THEME[label] || { className: "note-label-default", color: "#111111" };
let aboutLinkTemplates = null;

const renderScheduleCalendar = (calendar, scheduleValue) => {
  if (!calendar) return;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const parseTime = (value) => {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === "PM") hour += 12;
    return hour * 60 + Number(match[2]);
  };
  const entries = String(scheduleValue || "").split(";").map((entry) => {
    const match = entry.trim().match(/^([^,]+),\s*(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))$/i);
    if (!match) return null;
    const day = days.findIndex((name) => name.toLowerCase() === match[1].slice(0, 3).toLowerCase());
    const start = parseTime(match[2]);
    const end = parseTime(match[3]);
    return day >= 0 && start !== null && end !== null && end > start ? { day, start, end, label: `${match[2]} - ${match[3]}` } : null;
  }).filter(Boolean);
  if (!entries.length) {
    calendar.innerHTML = "<div class=\"schedule-empty-state\"><img src=\"../../assets/bee-flight.svg\" alt=\"\"><h2>No Meeting Schedule Set</h2><p>There is still no meeting schedule set yet.</p></div>";
    return;
  }
  const timeLabels = [...Array.from({ length: 8 }, (_, index) => `<span style="top:${index * 12.5}%">${String(index * 3).padStart(2, "0")}:00</span>`), '<span style="top:100%">23:59</span>'].join("");
  const dayColumns = days.map((day, index) => {
    const blocks = entries.filter((entry) => entry.day === index).map((entry) => `<div class="schedule-block" style="top:${entry.start / 1440 * 100}%;height:${(entry.end - entry.start) / 1440 * 100}%" title="${entry.label}">${entry.label}</div>`).join("");
    return `<div class="schedule-day-column">${blocks}</div>`;
  }).join("");
  calendar.innerHTML = `<div class="schedule-day-head"><span></span>${days.map((day) => `<strong>${day}</strong>`).join("")}</div><div class="schedule-grid"><div class="schedule-time-axis">${timeLabels}</div><div class="schedule-days">${dayColumns}</div></div>`;
};

const renderAboutDetails = () => {
  const schedule = document.querySelector(".about-details dl > div:nth-child(2) dd");
  const viewScheduleBtn = document.querySelector("#viewSwarmScheduleBtn");
  if (viewScheduleBtn) viewScheduleBtn.onclick = () => {
    renderScheduleCalendar(document.querySelector("#swarmScheduleCalendar"), currentGroup.meetingSchedule);
    document.querySelector("#swarmScheduleModal")?.classList.add("open");
    document.querySelector("#swarmScheduleModal")?.setAttribute("aria-hidden", "false");
  };
  if (schedule) schedule.replaceChildren(viewScheduleBtn || document.createTextNode("Not set"));
  const closeScheduleBtn = document.querySelector("#closeSwarmScheduleBtn");
  if (closeScheduleBtn) closeScheduleBtn.onclick = () => {
    document.querySelector("#swarmScheduleModal")?.classList.remove("open");
    document.querySelector("#swarmScheduleModal")?.setAttribute("aria-hidden", "true");
  };
  const motto = document.querySelector("#aboutMotto");
  if (motto) motto.textContent = String(currentGroup.motto || "").trim() || "Not Set";
  const linkLabels = { discord: "Discord", meet: "Google Meet", resources: "Resources", repository: "Repository", other: "Other" };
  let links = currentGroup.links;
  if (typeof links === "string") {
    try { links = JSON.parse(links); } catch { links = []; }
  }
  links = Array.isArray(links) ? links : (Array.isArray(links?.links) ? links.links : []);
  const linkList = document.querySelector(".about-links");
  if (!linkList) return;
  if (!aboutLinkTemplates) aboutLinkTemplates = [...linkList.querySelectorAll("button")].map((button) => button.cloneNode(true));
  const templates = aboutLinkTemplates;
  linkList.replaceChildren();
  const validLinks = links.map((link) => ({
    ...link,
    type: link?.type || link?.linkType || "other",
    url: link?.url || link?.linkUrl || ""
  })).filter((link) => link.url);
  linkList.classList.toggle("is-scrollable", validLinks.length > 4);
  const counts = {};
  if (!validLinks.length) {
    const emptyState = document.createElement("span");
    emptyState.className = "about-links-empty";
    emptyState.textContent = "Not set";
    linkList.appendChild(emptyState);
    return;
  }
  validLinks.forEach((link, index) => {
    const normalizedType = String(link.type || "other").toLowerCase().replace(/[\s_-]+/g, "");
    const typeAliases = { discord: "discord", teamdiscord: "discord", meet: "meet", googlemeet: "meet", resources: "resources", resource: "resources", repository: "repository", repo: "repository", other: "other" };
    const type = typeAliases[normalizedType] || "other";
    counts[type] = (counts[type] || 0) + 1;
    const button = (templates[index] || templates[0])?.cloneNode(false) || document.createElement("button");
    button.type = "button";
    button.disabled = false;
    button.innerHTML = "";
    const iconTemplate = templates.find((template) => template.querySelector(`.${type}-icon`));
    const icon = iconTemplate?.querySelector("svg")?.cloneNode(true);
    if (icon) {
      icon.style.display = "block";
      icon.style.width = "24px";
      icon.style.height = "24px";
      icon.style.flex = "0 0 auto";
      button.append(icon);
    }
    if (!icon) {
      const genericIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      genericIcon.classList.add("other-icon");
      genericIcon.setAttribute("viewBox", "0 0 24 24");
      genericIcon.setAttribute("aria-hidden", "true");
      genericIcon.innerHTML = "<path d=\"M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15m3.15 5.85a5 5 0 0 0-7.07-.07l-2 2a5 5 0 0 0 7.07 7.07l1.15-1.15\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>";
      genericIcon.setAttribute("aria-hidden", "true");
      button.prepend(genericIcon);
    }
    const label = `${linkLabels[type]}${counts[type] > 1 ? ` ${counts[type]}` : ""}`;
    button.append(document.createTextNode(label));
    const arrow = document.createElement("span");
    arrow.textContent = "↗";
    button.append(arrow);
    button.onclick = () => window.open(link.url, "_blank", "noopener,noreferrer");
    linkList.appendChild(button);
  });
};

const renderNotes = async () => {
  const supabase = getSupabase();
  const grpId = getGroupId();
  if (!supabase || !grpId || !notesList) return;

  const { data: notes, error } = await supabase
    .from("GROUP_NOTE")
    .select("noteId, noteTitle, noteBody, noteLabel, createdAt, userId, USER(userDisplayName, avatarPath)")
    .eq("grpId", Number(grpId))
    .order("createdAt", { ascending: false });

  if (error) {
    console.error("Failed to load notes:", error);
    notesList.innerHTML = '<p class="empty-state-note">Unable to load notes.</p>';
    return;
  }

  if (!notes || !notes.length) {
    notesList.innerHTML = '<p class="empty-state-note">No notes yet. Start the conversation.</p>';
    return;
  }

  notesList.innerHTML = notes.map((note) => {
    const labelTheme = getNoteLabelTheme(note.noteLabel);
    const displayName = note.USER?.userDisplayName || "Unknown user";
    const authorAvatar = resolveAvatar(note.USER?.avatarPath) || "../../assets/profile-placeholder.svg";
    const dateText = formatNoteDate(note.createdAt);
    return `
      <article class="note-row" role="button" tabindex="0" aria-haspopup="dialog" aria-controls="noteDetailOverlay" data-note-id="${note.noteId}">
        <div class="note-author-row">
          <img class="note-author-avatar" src="${authorAvatar}" alt="${displayName.replace(/</g, "&lt;")} profile picture">
          <span class="note-author-name">${displayName.replace(/</g, "&lt;")}</span>
        </div>
        <strong>${(note.noteTitle || "Untitled").replace(/</g, "&lt;")}</strong>
        <p class="note-body">${(note.noteBody || "").replace(/</g, "&lt;").slice(0, 120)}${(note.noteBody || "").length > 120 ? "…" : ""}</p>
        <div class="note-footer">
          <b class="${labelTheme.className}">${note.noteLabel || "Note"}</b>
          <span>${dateText}</span>
        </div>
      </article>
    `;
  }).join("");

  notesList.querySelectorAll(".note-row").forEach((noteRow) => {
    noteRow.addEventListener("click", async () => {
      const noteId = Number(noteRow.dataset.noteId);
      const note = notes.find((n) => Number(n.noteId) === noteId);
      if (!note || !noteDetailOverlay) return;
      const labelTheme = getNoteLabelTheme(note.noteLabel);
      const authorName = note.USER?.userDisplayName || "Unknown user";
      const { data: { user } } = await supabase.auth.getUser();
      const isOwner = Boolean(user && String(user.id) === String(note.userId));
      activeNote = note;
      if (editNoteBtn) editNoteBtn.hidden = !isOwner;
      if (removeNoteBtn) removeNoteBtn.hidden = !isOwner;
      noteDetailTitle.textContent = note.noteTitle || "Untitled";
      noteDetailContent.textContent = note.noteBody || "No details provided.";
      noteDetailImportance.textContent = note.noteLabel || "Note";
      noteDetailImportance.className = `note-detail-label ${labelTheme.className}`;
      noteDetailDate.textContent = formatNoteDate(note.createdAt);
      noteDetailAuthor.textContent = `Posted by: ${authorName}`;
      noteCommentInput.value = "";
      await loadNoteComments(note.noteId);
      noteDetailOverlay.classList.add("open");
      noteDetailOverlay.setAttribute("aria-hidden", "false");
      closeNoteDetailBtn?.focus();
    });
    noteRow.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        noteRow.click();
      }
    });
  });
};

noteCommentForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const supabase = getSupabase();
  const commentBody = noteCommentInput?.value.trim();
  if (!supabase || !activeNote || !commentBody) return;
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    showAlert("You must be logged in to comment.", { title: "Not Logged In" });
    return;
  }
  const { error } = await supabase.from("GROUP_NOTE_COMMENT").insert({
    noteId: activeNote.noteId,
    userId: user.id,
    commentBody
  });
  if (error) {
    console.error("Failed to post comment:", error);
    showAlert(`Failed to post comment: ${error.message}`, { title: "Error" });
    return;
  }
  noteCommentForm.reset();
  await loadNoteComments(activeNote.noteId);
});

noteAddForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const supabase = getSupabase();
  const grpId = getGroupId();
  if (!supabase || !grpId) return;

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    showAlert("You must be logged in to post notes.", { title: "Not Logged In" });
    return;
  }

  const noteTitle = noteTitleInput?.value.trim();
  const noteBody = noteBodyInput?.value.trim();
  const noteLabel = noteLabelSelect?.value || "Announcement / Update";

  if (!noteTitle || !noteBody) {
    showAlert("Please fill in both the title and note body.", { title: "Missing Details" });
    return;
  }
  if (noteTitle.length > 49) {
    showAlert("The note title must be 49 characters or fewer.", { title: "Title Too Long" });
    return;
  }

  const query = editingNoteId
    ? supabase.from("GROUP_NOTE").update({ noteTitle, noteBody, noteLabel }).eq("noteId", editingNoteId).eq("userId", user.id)
    : supabase.from("GROUP_NOTE").insert({ grpId: Number(grpId), userId: user.id, noteTitle, noteBody, noteLabel });
  const { error } = await query;

  if (error) {
    console.error("Failed to save note:", error);
    showAlert(`Failed to post note: ${error.message}`, { title: "Error" });
    return;
  }

  closeNoteAddModalNow();
  await renderNotes();
});

editNoteBtn?.addEventListener("click", () => {
  if (!activeNote) return;
  noteTitleInput.value = activeNote.noteTitle || "";
  updateNoteTitleCounter();
  noteBodyInput.value = activeNote.noteBody || "";
  noteLabelSelect.value = activeNote.noteLabel || "Announcement / Update";
  closeNoteDetail();
  editingNoteId = activeNote.noteId;
  if (noteAddModalTitle) noteAddModalTitle.textContent = "Edit Swarm Note";
  if (saveNoteBtn) saveNoteBtn.textContent = "Save";
  openNoteAddModal();
});

removeNoteBtn?.addEventListener("click", () => {
  if (!activeNote) return;
  safeShowConfirmation("Remove this note? This cannot be undone.", async () => {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("GROUP_NOTE").delete().eq("noteId", activeNote.noteId).eq("userId", user.id);
    if (error) {
      showAlert(`Failed to remove note: ${error.message}`, { title: "Error" });
      return;
    }
    closeNoteDetail();
    activeNote = null;
    await renderNotes();
  }, {
    title: "Remove Note",
    confirmText: "Remove",
    cancelText: "Cancel"
  });
});

openAddNoteModalBtn?.addEventListener("click", openNoteAddModal);
discardNoteAddBtn?.addEventListener("click", requestCloseNoteAddModal);
if (noteAddModalOverlay) noteAddModalOverlay.addEventListener("click", (event) => { if (event.target === noteAddModalOverlay) requestCloseNoteAddModal(); });
if (closeNoteDetailBtn) closeNoteDetailBtn.addEventListener("click", closeNoteDetail);
if (noteDetailOverlay) noteDetailOverlay.addEventListener("click", (event) => { if (event.target === noteDetailOverlay) closeNoteDetail(); });

renderNotes();

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

const openMemberProfile = async (member) => {
  if (!memberProfileOverlay || !memberProfileAvatar) return;
  memberProfileRole.textContent  = member.roleName || "Member";
  memberProfileName.textContent  = member.fullName;
  memberProfileEmail.textContent = member.email;
  memberProfileEmail.style.visibility = "hidden";
  const field = member.progName || member.deptName || "";
  memberProfileField.textContent = field || "N/A";
  let avatarPath = member.avatarPath;
  if (!avatarPath) {
    const supabase = getSupabase();
    const { data } = await supabase?.from("USER").select("avatarPath").eq("userId", member.userId).maybeSingle() || {};
    avatarPath = data?.avatarPath || null;
  }
  const avatarUrl = resolveAvatar(avatarPath);
  const profileImageUrl = avatarUrl || "../../assets/profile-placeholder.svg";
  memberProfileAvatar.style.backgroundImage = "none";
  memberProfileAvatar.innerHTML = `<img src="${profileImageUrl}" alt="${member.fullName} profile picture" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  const profileImage = memberProfileAvatar.querySelector("img");
  if (profileImage) profileImage.onerror = () => { profileImage.src = "../../assets/profile-placeholder.svg"; };
  if (avatarUrl) {
    memberProfileAvatar.style.cursor = "pointer";
    memberProfileAvatar.onclick = () => {
      const lb = getAvatarLightbox();
      lb.querySelector("#lightboxImg").src = avatarUrl;
      lb.style.display = "flex";
    };
  } else {
    memberProfileAvatar.style.backgroundImage = "";
    memberProfileAvatar.style.cursor = "default";
    memberProfileAvatar.onclick = null;
  }
  memberProfileOverlay.classList.add("open");
  memberProfileOverlay.setAttribute("aria-hidden", "false");
  window.memberProfileStats?.load(member);
};

const closeMemberProfile = () => {
  memberProfileOverlay?.classList.remove("open");
  memberProfileOverlay?.setAttribute("aria-hidden", "true");
};

if (closeMemberProfileBtn) closeMemberProfileBtn.addEventListener("click", closeMemberProfile);
if (memberProfileOverlay) memberProfileOverlay.addEventListener("click", (e) => { if (e.target === memberProfileOverlay) closeMemberProfile(); });

// Delegate clicks on all member and instructor cards.
document.querySelector("#groupInfoStack")?.addEventListener("click", (e) => {
  const card = e.target.closest("[data-member-id]");
  if (!card) return;
  if (e.target.closest(".member-more-btn")) {
    e.stopPropagation();
    document.querySelectorAll(".member-options-menu.open").forEach((menu) => {
      if (!e.target.closest(".member-details")?.contains(menu)) menu.classList.remove("open");
    });
    const menu = card.querySelector(".member-options-menu");
    menu?.classList.toggle("open");
    if (menu?.classList.contains("open")) {
      const buttonRect = e.target.closest(".member-more-btn").getBoundingClientRect();
      menu.style.left = `${Math.max(8, buttonRect.right - menu.offsetWidth)}px`;
      menu.style.top = `${buttonRect.bottom + menu.offsetHeight > window.innerHeight - 8 ? buttonRect.top - menu.offsetHeight - 8 : buttonRect.bottom + 8}px`;
    }
    return;
  }
  const action = e.target.closest("[data-member-action]")?.dataset.memberAction;
  if (action) {
    e.stopPropagation();
    const member = currentMembers.find((m) => String(m.userId) === card.dataset.memberId);
    card.querySelector(".member-options-menu")?.classList.remove("open");
    if (member) handleMemberAction(member, action);
    return;
  }
  const member = currentMembers.find((m) => String(m.userId) === card.dataset.memberId);
  if (member) openMemberProfile(member);
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".member-more-btn, .member-options-menu")) {
    document.querySelectorAll(".member-options-menu.open").forEach((menu) => menu.classList.remove("open"));
  }
});

document.addEventListener("click", (e) => {
  const moreButton = e.target.closest(".category-item > .more-btn");
  if (!moreButton) return;
  e.preventDefault();
  const projectCard = moreButton.closest(".category-item");
  const optionsOverlay = document.querySelector("#projectOptionsModalOverlay");
  const projectName = projectCard?.querySelector(".category-name")?.textContent || "";
  const projectId = projectCard?.dataset.category || "";
  const projectDueDate = projectCard?.dataset.dueDate || "";
  if (!optionsOverlay || !projectId) return;
  optionsOverlay.dataset.projectId = projectId;
  const nameInput = document.querySelector("#editProjectNameInput");
  const dueDateInput = document.querySelector("#editProjectDueDateInput");
  if (nameInput) nameInput.value = projectName;
  if (dueDateInput) dueDateInput.value = projectDueDate;
  optionsOverlay.classList.add("open");
  optionsOverlay.setAttribute("aria-hidden", "false");
}, true);

/* ── GROUP LINK (create shareable invitation URL) ─────────────────────────── */
const getGroupLink = () => {
  const grpId = getGroupId();
  if (!grpId) return "—";
  // Open the preview modal from the dashboard instead of navigating to a separate page.
  const baseURL = window.location.origin;
  return `${baseURL}/invite.html?invite=${grpId}`;
};

const getGroupInviteCode = () => {
  const grpId = getGroupId();
  return grpId || "—";
};

/* ── ADD MEMBERS MODAL ────────────────────────────────────────────────────── */
const closeAddMembersModal = () => {
  if (!addMembersModalOverlay) return;
  addMembersModalOverlay.classList.remove("open");
  addMembersModalOverlay.setAttribute("aria-hidden", "true");
};
const openAddMembersModal = () => {
  if (!addMembersModalOverlay) return;
  if (groupLinkValue) groupLinkValue.value = getGroupLink();
  addMembersModalOverlay.classList.add("open");
  addMembersModalOverlay.setAttribute("aria-hidden", "false");
};

/* ── SELECT LEADER MODAL ─────────────────────────────────────────────────── */
const closeSelectLeaderModal = () => {
  if (!selectLeaderModalOverlay) return;
  selectLeaderModalOverlay.classList.remove("open");
  selectLeaderModalOverlay.setAttribute("aria-hidden", "true");
};

const updateLeaveGroupBtnState = () => {
  if (!leaveGroupBtn || !selectLeaderList) return;
  leaveGroupBtn.disabled = !selectLeaderList.querySelector("input[type='radio']:checked");
};

const renderSelectLeaderList = () => {
  if (!selectLeaderList) return;
  const eligible = currentMembers.filter((m) => {
    const r = normalizeText(m.roleName);
    return r !== "leader" && r !== "teacher";
  });
  const hasTeacher = currentMembers.some((m) => normalizeText(m.roleName) === "teacher");

  if (eligible.length === 0) {
    if (hasTeacher) {
      // Teacher is still in the group — leader can just leave, no deletion needed
      selectLeaderList.innerHTML = "<p class='select-leader-empty'>No other members to transfer leadership to. You will leave the group and the teacher will remain.</p>";
    } else {
      // Leader is truly alone — leaving will delete everything
      selectLeaderList.innerHTML = "<p class='select-leader-empty'>You are the only member. Leaving will permanently delete this group and all its projects and tasks.</p>";
    }
    if (leaveGroupBtn) {
      leaveGroupBtn.textContent = hasTeacher ? "Leave Group" : "Leave & Delete Group";
      leaveGroupBtn.disabled = false;
    }
    return;
  }
  if (leaveGroupBtn) leaveGroupBtn.textContent = "Leave";
  selectLeaderList.innerHTML = eligible.map((m) => `
    <label class="select-leader-item">
      <input type="radio" name="newLeader" value="${m.userId}">
      <span>${m.fullName}</span>
    </label>
  `).join("");
  selectLeaderList.querySelectorAll("input[type='radio']").forEach((r) =>
    r.addEventListener("change", updateLeaveGroupBtnState)
  );
  updateLeaveGroupBtnState();
};

const openSelectLeaderModal = () => {
  if (!selectLeaderModalOverlay) return;
  renderSelectLeaderList();
  selectLeaderModalOverlay.classList.add("open");
  selectLeaderModalOverlay.setAttribute("aria-hidden", "false");
};

/* ── CONFIRM LEAVE MODAL ─────────────────────────────────────────────────── */
const closeConfirmLeaveModal = () => {
  if (!confirmLeaveModalOverlay) return;
  confirmLeaveModalOverlay.classList.remove("open");
  confirmLeaveModalOverlay.setAttribute("aria-hidden", "true");
};
const openConfirmLeaveModal = () => {
  if (!confirmLeaveModalOverlay) return;
  closeSelectLeaderModal();
  confirmLeaveModalOverlay.classList.add("open");
  confirmLeaveModalOverlay.setAttribute("aria-hidden", "false");
};

const leaveGroup = async () => {
  const supabase = getSupabase();
  if (!selectLeaderList || !supabase) return;
  const grpId = Number(getGroupId());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const selected = selectLeaderList.querySelector("input[type='radio']:checked");
  const hasTeacher = currentMembers.some((m) => normalizeText(m.roleName) === "teacher");

  if (!selected && hasTeacher) {
    // Only leader + teacher remain — leader just leaves, teacher stays, no deletion
    const { error } = await supabase.rpc("leave_group", {
      p_user_id: user.id,
      p_grp_id:  grpId,
    });
    if (error) { alert("Failed to leave group: " + error.message); return; }
  } else if (!selected && !hasTeacher) {
    // Leader is truly alone — delete the entire group and all its data
    const { error } = await supabase.rpc("delete_group_cascade", {
      p_grp_id: grpId,
    });
    if (error) { alert("Failed to delete group: " + error.message); return; }
  } else {
    // Transfer leadership then remove old leader
    const { error } = await supabase.rpc("transfer_leadership", {
      p_grp_id:              grpId,
      p_new_leader_user_id:  selected.value,
      p_old_leader_user_id:  user.id,
    });
    if (error) { alert("Failed to transfer leadership. Please try again."); return; }
    
    // Notify new leader
    try {
      const { data: newLeaderInfo } = await supabase.from("USER").select("userDisplayName").eq("userId", selected.value).maybeSingle();
      const { data: grpInfo } = await supabase.from("GROUP").select("grpName").eq("grpId", grpId).maybeSingle();
      const newLeaderName = newLeaderInfo?.userDisplayName || "New leader";
      const grpName = grpInfo?.grpName || "the group";
      
      await supabase.from("NOTIFICATION").insert({
        notiTitle: "Promoted to Leader",
        notiBody: `You have been promoted as a leader in "${grpName}".`,
        "notiDate&Time": new Date().toISOString(),
        notiIsRead: false,
        userId: selected.value,
        grpId: Number(grpId)
      });
    } catch (e) {}
  }

  closeConfirmLeaveModal();
  
  // Notify all members that leader left
  try {
    const [{ data: members }, { data: leaderInfo }, { data: grpInfo }] = await Promise.all([
      supabase.from("GROUPMEMBER").select("userId").eq("grpId", grpId).neq("userId", user.id),
      supabase.from("USER").select("userDisplayName").eq("userId", user.id).maybeSingle(),
      supabase.from("GROUP").select("grpName").eq("grpId", grpId).maybeSingle()
    ]);
    const recipients = (members || []).map(m => m.userId);
    const leaderName = leaderInfo?.userDisplayName || "A leader";
    const grpName = grpInfo?.grpName || "the group";
    const now = new Date().toISOString();
    await Promise.all(recipients.map(uid =>
      supabase.from("NOTIFICATION").insert({
        notiTitle: "Leader Left",
        notiBody: `${leaderName} has left "${grpName}".`,
        "notiDate&Time": now,
        notiIsRead: false,
        userId: uid,
        grpId: Number(grpId)
      })
    ));
  } catch (e) {}
  
  window.location.href = "../s.dashb.html";
};

/* ── REMOVE MEMBERS MODAL ────────────────────────────────────────────────── */
const updateRemoveMembersBtnState = () => {
  if (!removeMembersBtn || !removeMembersList) return;
  removeMembersBtn.disabled =
    removeMembersList.querySelectorAll("input[type='checkbox']:checked").length === 0;
};

const renderRemoveMembersList = () => {
  if (!removeMembersList) return;
  const removable = currentMembers.filter((m) => {
    const r = normalizeText(m.roleName);
    return r !== "leader" && r !== "teacher";
  });
  if (removable.length === 0) {
    removeMembersList.innerHTML = "<p class='remove-members-empty'>No removable members found.</p>";
    if (removeMembersBtn) removeMembersBtn.disabled = true;
    return;
  }
  removeMembersList.innerHTML = removable.map((m) => `
    <label class="remove-member-item">
      <input type="checkbox" value="${m.grpmemId}">
      <span>${m.fullName}</span>
    </label>
  `).join("");
  removeMembersList.querySelectorAll("input[type='checkbox']").forEach((cb) =>
    cb.addEventListener("change", updateRemoveMembersBtnState)
  );
  updateRemoveMembersBtnState();
};

const closeRemoveMembersModal = () => {
  if (!removeMembersModalOverlay) return;
  removeMembersModalOverlay.classList.remove("open");
  removeMembersModalOverlay.setAttribute("aria-hidden", "true");
};
const openRemoveMembersModal = () => {
  if (!removeMembersModalOverlay) return;
  renderRemoveMembersList();
  removeMembersModalOverlay.classList.add("open");
  removeMembersModalOverlay.setAttribute("aria-hidden", "false");
};

/* ── EVENTS ───────────────────────────────────────────────────────────────── */
groupTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    groupTabs.forEach((item) => {
      const selected = item === tab;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-selected", String(selected));
    });

    document.querySelectorAll(".tab-panel").forEach((panel) => {
      const selected = panel.id === tab.getAttribute("aria-controls");
      panel.classList.toggle("active", selected);
      panel.hidden = !selected;
    });
  });
});

if (openRemoveMembersModalBtn) openRemoveMembersModalBtn.addEventListener("click", openRemoveMembersModal);
if (discardRemoveMembersBtn)   discardRemoveMembersBtn.addEventListener("click", closeRemoveMembersModal);
if (removeMembersModalOverlay) removeMembersModalOverlay.addEventListener("click", (e) => { if (e.target === removeMembersModalOverlay) closeRemoveMembersModal(); });

if (removeMembersBtn) {
  removeMembersBtn.addEventListener("click", () => {
    const selectedIds = Array.from(
      removeMembersList.querySelectorAll("input[type='checkbox']:checked")
    ).map((cb) => Number(cb.value));
    if (selectedIds.length === 0) return;

    const names = currentMembers
      .filter((m) => selectedIds.includes(m.grpmemId))
      .map((m) => m.fullName);
    const label = names.length === 1 ? `"${names[0]}"` : `${names.length} members`;

    safeShowConfirmation(
      `Are you sure you want to remove ${label} from the group? If they have any pending tasks, those task required reassigning.`,
      async () => {
        const supabase = getSupabase();
        const grpId = getGroupId();
        
        // Get info about removed members
        const removedMembers = currentMembers.filter((m) => selectedIds.includes(m.grpmemId));
        const { data: grpInfo } = await supabase.from("GROUP").select("grpName").eq("grpId", grpId).maybeSingle();
        const grpName = grpInfo?.grpName || "the group";
        const now = new Date().toISOString();
        
        // Get current leader's ID
        const { data: { user } } = await supabase.auth.getUser();
        const leaderId = user?.id;
        
        // Get userIds of removed members for evaluator deletion
        const removedUserIds = removedMembers.map(m => m.userId).filter(Boolean);
        
        // Delete in order to avoid foreign key constraint violations
        // 1. Delete peer evaluations (both as evaluated member and as evaluator)
        if (selectedIds.length > 0) {
            await supabase
                .from("PEEREVAL")
                .delete()
                .in("evaluatedGrpmemId", selectedIds);
        }
        
        if (removedUserIds.length > 0) {
            await supabase
                .from("PEEREVAL")
                .delete()
                .in("evaluatorId", removedUserIds);
        }
        
        // 2. Delete submissions
        if (selectedIds.length > 0) {
            await supabase
                .from("SUBMISSION")
                .delete()
                .in("grpmemId", selectedIds);
        }
        
        // 3. Delete task assignments
        if (selectedIds.length > 0) {
            await supabase
                .from("TASKASSIGNMENT")
                .delete()
                .in("grpmemId", selectedIds);
        }
        
        // 3. Delete from GROUPMEMBER directly (no RPC)
        const { error } = await supabase
            .from("GROUPMEMBER")
            .delete()
            .in("grpmemId", selectedIds);
        
        if (error) { showAlert("Failed to remove members: " + error.message, { title: "Error" }); return; }
        
        // Notify removed members
        await Promise.all(removedMembers.map(m =>
          supabase.from("NOTIFICATION").insert({
            notiTitle: "Removed from Group",
            notiBody: `You have been removed from "${grpName}".`,
            "notiDate&Time": now,
            notiIsRead: false,
            userId: m.userId,
            grpId: Number(grpId)
          })
        ));
        
        closeRemoveMembersModal();
        await loadGroupFromDB();
      },
      { title: "Remove Members", confirmText: "Remove", cancelText: "Cancel" }
    );
  });
}

async function handleMemberAction(member, action) {
  const supabase = getSupabase();
  const grpId = Number(getGroupId());
  if (!supabase || !grpId || !member?.grpmemId) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (action === "leader") {
    safeShowConfirmation(`Set ${member.fullName} as the new leader? You will lose leadership of this swarm.`, async () => {
      const { error } = await supabase.rpc("transfer_leadership", {
        p_grp_id: grpId,
        p_new_leader_user_id: member.userId,
        p_old_leader_user_id: user.id
      });
      if (error) { showAlert(`Failed to set leader: ${error.message}`, { title: "Error" }); return; }
      await loadGroupFromDB();
    }, { title: "Set as Leader", confirmText: "Set Leader", cancelText: "Cancel" });
    return;
  }

  if (action === "remove") {
    safeShowConfirmation(`Remove ${member.fullName} from this swarm?`, async () => {
      const relatedIds = [member.grpmemId];
      const { error: peerError } = await supabase.from("PEEREVAL").delete().in("evaluatedGrpmemId", relatedIds);
      if (peerError) { showAlert(`Failed to remove member: ${peerError.message}`, { title: "Error" }); return; }
      const { error: evaluatorError } = await supabase.from("PEEREVAL").delete().eq("evaluatorId", member.userId);
      if (evaluatorError) { showAlert(`Failed to remove member: ${evaluatorError.message}`, { title: "Error" }); return; }
      const { error: submissionError } = await supabase.from("SUBMISSION").delete().in("grpmemId", relatedIds);
      if (submissionError) { showAlert(`Failed to remove member: ${submissionError.message}`, { title: "Error" }); return; }
      const { error: assignmentError } = await supabase.from("TASKASSIGNMENT").delete().in("grpmemId", relatedIds);
      if (assignmentError) { showAlert(`Failed to remove member: ${assignmentError.message}`, { title: "Error" }); return; }
      const { error } = await supabase.from("GROUPMEMBER").delete().eq("grpmemId", member.grpmemId);
      if (error) { showAlert(`Failed to remove member: ${error.message}`, { title: "Error" }); return; }
      await loadGroupFromDB();
    }, { title: "Remove from Swarm", confirmText: "Remove", cancelText: "Cancel" });
  }
}

// FIX: TopBackBtn is the only back button in the HTML — #backBtn does not exist
if (topBackBtn) topBackBtn.addEventListener("click", () => {
  if (currentGroup.parentGrpId) {
    window.location.href = `../s.colony.html?grpId=${encodeURIComponent(currentGroup.parentGrpId)}`;
    return;
  }
  const queryReturnPage = new URLSearchParams(window.location.search).get("from");
  const referrerReturnPage = document.referrer.includes("/s.team.html") ? "teams" : null;
  const returnPage = referrerReturnPage
    || queryReturnPage
    || sessionStorage.getItem("hive_group_return_page");
  if (returnPage === "dashboard") window.location.href = "../s.dashb.html";
  else if (returnPage === "teams") window.location.href = "../s.team.html";
  else window.history.back();
});

if (projectBreakdownTab) projectBreakdownTab.addEventListener("click", () => {
  const grpId = getGroupId();
  window.location.href = grpId
    ? `s.leadercategory.html?grpId=${grpId}`
    : "s.leadercategory.html";
});

document.querySelector("#mobileBreakdownBtn")?.addEventListener("click", () => {
  const grpId = getGroupId();
  window.location.href = grpId
    ? `s.leadercategory.html?grpId=${grpId}`
    : "s.leadercategory.html";
});
if (openAddMembersModalBtn) openAddMembersModalBtn.addEventListener("click", openAddMembersModal);
if (openInstructorsInviteBtn) openInstructorsInviteBtn.addEventListener("click", openAddMembersModal);
if (discardAddMembersBtn)   discardAddMembersBtn.addEventListener("click", closeAddMembersModal);
if (addMembersModalOverlay) addMembersModalOverlay.addEventListener("click", (e) => { if (e.target === addMembersModalOverlay) closeAddMembersModal(); });

const copyCurrentGroupLink = async (buttonEl, inputEl) => {
  if (!buttonEl) return;
  const link = (inputEl?.value || getGroupLink() || "").trim();
  if (!link || link === "—") {
    buttonEl.textContent = "No Link";
    setTimeout(() => { buttonEl.textContent = "COPY"; }, 1200);
    return;
  }

  try {
    await navigator.clipboard.writeText(link);
  } catch {
    if (inputEl) {
      inputEl.focus();
      inputEl.select();
      document.execCommand("copy");
    } else {
      const temp = document.createElement("textarea");
      temp.value = link;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      temp.remove();
    }
  }

  buttonEl.textContent = "COPIED!";
  setTimeout(() => { buttonEl.textContent = "COPY"; }, 1200);
};

if (copyInviteLinkBtn) {
  copyInviteLinkBtn.addEventListener("click", async () => {
    if (groupLinkValue) groupLinkValue.value = getGroupLink();
    await copyCurrentGroupLink(copyInviteLinkBtn, groupLinkValue);
  });
}

if (copyGroupLinkBtn) {
  copyGroupLinkBtn.addEventListener("click", async () => {
    if (groupLinkValue) groupLinkValue.value = getGroupLink();
    await copyCurrentGroupLink(copyGroupLinkBtn, groupLinkValue);
  });
}

if (leaveBtn)               leaveBtn.addEventListener("click", openSelectLeaderModal);
if (discardSelectLeaderBtn) discardSelectLeaderBtn.addEventListener("click", closeSelectLeaderModal);
if (selectLeaderModalOverlay) selectLeaderModalOverlay.addEventListener("click", (e) => { if (e.target === selectLeaderModalOverlay) closeSelectLeaderModal(); });
if (leaveGroupBtn)          leaveGroupBtn.addEventListener("click", openConfirmLeaveModal);
if (cancelLeaveBtn)         cancelLeaveBtn.addEventListener("click", closeConfirmLeaveModal);
if (confirmLeaveBtn)        confirmLeaveBtn.addEventListener("click", leaveGroup);
if (confirmLeaveModalOverlay) confirmLeaveModalOverlay.addEventListener("click", (e) => { if (e.target === confirmLeaveModalOverlay) closeConfirmLeaveModal(); });

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    safeShowConfirmation(
      "Are you sure you want to log out?",
      () => window.doLogout?.(),
      { title: "Log Out", confirmText: "Log Out", cancelText: "Cancel" }
    );
  });
}

/* ── SIDEBAR PROFILE ─────────────────────────────────────────────────────── */
const loadSidebarProfile = async () => {
  const supabase = getSupabase(); // FIX: use lazy accessor
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

/* ── INIT ─────────────────────────────────────────────────────────────────── */
loadGroupFromDB();
loadSidebarProfile();
