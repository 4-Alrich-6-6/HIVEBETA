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
const swarmTabIcon             = document.querySelector("#teamsTab .tab-icon");
if (swarmTabIcon) {
  fetch("../assets/teams-tab-icon.svg?v=4")
    .then((response) => response.text())
    .then((markup) => {
      const parsed = new DOMParser().parseFromString(markup, "image/svg+xml").documentElement;
      parsed.setAttribute("class", "team-tab-icon");
      parsed.setAttribute("aria-hidden", "true");
      swarmTabIcon.replaceWith(document.importNode(parsed, true));
    })
    .catch(() => {});
}
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
const addSwarmMembersModalOverlay = document.querySelector("#addSwarmMembersModalOverlay");
const addSwarmMembersModalMessage = document.querySelector("#addSwarmMembersModalMessage");
const addSwarmMembersList      = document.querySelector("#addSwarmMembersList");
const cancelAddSwarmMembersBtn = document.querySelector("#cancelAddSwarmMembersBtn");
const confirmAddSwarmMembersBtn = document.querySelector("#confirmAddSwarmMembersBtn");
const leaveBtn                 = document.querySelector("#leaveBtn");
const selectLeaderModalOverlay = document.querySelector("#selectLeaderModalOverlay");
const discardSelectLeaderBtn   = document.querySelector("#discardSelectLeaderBtn");
const selectLeaderList         = document.querySelector("#selectLeaderList");
const leaveGroupBtn            = document.querySelector("#leaveGroupBtn");
const confirmLeaveModalOverlay = document.querySelector("#confirmLeaveModalOverlay");
const cancelLeaveBtn           = document.querySelector("#cancelLeaveBtn");
const confirmLeaveBtn          = document.querySelector("#confirmLeaveBtn");
const logoutBtn                = document.querySelector(".logout");
const createTeamModal          = document.querySelector("#createTeamModal");
const createTeamForm           = document.querySelector("#createTeamForm");
const createTeamEmptyBtn       = document.querySelector("#createTeamEmptyBtn");
const openCreateTeamModalBtn   = document.querySelector("#openCreateTeamModalBtn");
const editColonyBtn             = document.querySelector("#editColonyBtn");
const deleteColonyBtn           = document.querySelector("#deleteColonyBtn");
const discardCreateTeamBtn     = document.querySelector("#discardCreateTeam");
const teamColonyId             = document.querySelector("#teamColonyId");
const teamNameInput            = document.querySelector("#teamNameInput");
const teamSubjectInput         = document.querySelector("#teamSubjectInput");
const teamMottoInput           = document.querySelector("#teamMottoInput");
const teamDescriptionInput     = document.querySelector("#teamDescriptionInput");
const teamScheduleList         = document.querySelector("#teamScheduleList");
const addTeamScheduleBtn       = document.querySelector("#addTeamScheduleBtn");
const teamLinksList             = document.querySelector("#teamLinksList");
const addTeamLinkBtn            = document.querySelector("#addTeamLinkBtn");
let editingColony = false;

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

const formatScheduleTime = (value) => {
  if (!value) return "";
  const [hours, minutes] = value.split(":");
  const numericHour = Number(hours);
  const hour = numericHour % 12 || 12;
  return `${hour}:${minutes} ${numericHour >= 12 ? "PM" : "AM"}`;
};

const getTeamSchedule = () => {
  const schedules = [...(teamScheduleList?.querySelectorAll(".schedule-fields") || [])]
    .map((row) => {
      const day = row.querySelector('[name="teamScheduleDay"]')?.value || "";
      const from = formatScheduleTime(row.querySelector('[name="teamScheduleFrom"]')?.value);
      const to = formatScheduleTime(row.querySelector('[name="teamScheduleTo"]')?.value);
      return day && from && to ? `${day}, ${from} - ${to}` : "";
    })
    .filter(Boolean);
  return schedules.length ? schedules.join("; ") : null;
};

const validateTeamSchedule = () => {
  const rows = [...(teamScheduleList?.querySelectorAll(".schedule-fields") || [])];
  const schedules = [];
  rows.forEach((row) => {
    const day = row.querySelector("[name='teamScheduleDay']");
    const from = row.querySelector("[name='teamScheduleFrom']");
    const to = row.querySelector("[name='teamScheduleTo']");
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

teamScheduleList?.addEventListener("input", validateTeamSchedule);
teamScheduleList?.addEventListener("change", validateTeamSchedule);

const getTeamListElements = () => ({
  teamList: document.querySelector("#teamList"),
  emptyState: document.querySelector("#teamListEmptyState"),
  addButton: document.querySelector("#openCreateTeamModalBtn")
});

const openTeam = (team) => {
  const returnPage = "colony";
  sessionStorage.setItem("hive_grpId", String(team.grpId));
  sessionStorage.setItem("hive_grpName", team.name);
  sessionStorage.setItem("hive_group_return_page", returnPage);
  window.location.href = `t.grpviewing.html?grpId=${team.grpId}&from=${returnPage}`;
};

const renderTeamList = (teams) => {
  const { teamList, emptyState, addButton } = getTeamListElements();
  if (!teamList) return;
  emptyState?.remove();
  teamList.querySelectorAll("[data-team-id]").forEach((card) => card.remove());

  if (!teams.length) {
    if (addButton) addButton.hidden = true;
    teamList.innerHTML = `
      <div class="project-empty-state team-empty-state" id="teamListEmptyState" role="status">
        <img class="project-empty-state-illustration" src="../assets/bee-flight.svg" alt="">
        <strong>No Swarms Yet</strong>
        <p>Click the button below to create a swarm and start collaborating.</p>
        <button class="empty-create-team-btn" type="button" id="createTeamEmptyBtn" aria-label="Add swarm" hidden>Create Swarm</button>
      </div>`;
    document.querySelector("#createTeamEmptyBtn")?.addEventListener("click", openCreateTeamModal);
    return;
  }

  if (addButton) addButton.hidden = false;

  teams.forEach((team) => {
    const card = document.createElement("article");
    card.className = "group-card colony-team-card";
    card.dataset.teamId = String(team.grpId);
    card.setAttribute("role", "listitem");
    card.setAttribute("tabindex", "0");
    card.innerHTML = `
      <div class="group-info">
        <h3 class="group-name">${team.isOwned ? '<svg class="owned-team-crown" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 839.663678 779.689007" aria-label="You lead this swarm" focusable="false"><g transform="translate(-30.164795,869.832005) scale(0.100000,-0.100000)" fill="currentColor" stroke="none"><path d="M4415 8689 c-29 -7 -58 -28 -108 -77 -91 -89 -101 -109 -102 -207 0 -67 4 -90 28 -139 15 -32 27 -70 27 -84 0 -19 -34 -60 -142 -169 -79 -79 -158 -155 -177 -170 -45 -35 -102 -35 -139 -1 -34 32 -60 46 -123 64 -71 21 -80 41 -83 171 -3 131 -9 143 -108 239 -66 65 -78 72 -126 79 -60 8 -145 -1 -182 -20 -14 -7 -55 -44 -91 -82 -56 -58 -68 -76 -78 -121 -14 -66 -14 -78 0 -144 10 -45 22 -63 78 -121 81 -85 100 -95 192 -103 97 -9 114 -26 123 -120 4 -38 25 -121 46 -184 22 -63 46 -161 54 -217 12 -87 21 -114 61 -188 36 -66 60 -97 107 -134 33 -27 74 -52 90 -55 17 -3 351 -6 742 -6 563 1 719 4 748 14 66 24 133 90 183 182 40 74 49 99 65 202 10 64 32 154 49 199 17 46 37 124 45 175 18 113 27 122 126 132 91 8 110 19 191 103 59 61 68 76 79 127 13 62 7 130 -15 181 -7 17 -43 60 -82 96 -61 59 -75 68 -128 79 -60 12 -152 8 -184 -10 -39 -20 -157 -152 -168 -188 -6 -20 -12 -80 -12 -132 -1 -115 -11 -134 -84 -155 -49 -14 -69 -24 -131 -68 -37 -27 -88 -24 -128 7 -18 14 -97 90 -175 169 -161 162 -161 161 -115 255 23 48 27 70 27 137 -1 98 -11 118 -102 207 -53 53 -78 69 -113 77 -54 13 -111 12 -165 0z"/><path d="M1330 6289 c-61 -6 -103 -17 -153 -40 -37 -17 -96 -37 -130 -45 -38 -9 -77 -27 -100 -45 -20 -16 -56 -39 -80 -49 -45 -20 -100 -66 -206 -171 -136 -134 -244 -297 -270 -404 -7 -27 -25 -77 -42 -111 -63 -131 -63 -497 0 -641 16 -37 35 -90 42 -118 12 -52 27 -82 84 -175 89 -146 284 -344 395 -400 24 -12 60 -35 80 -51 21 -17 61 -34 101 -44 37 -8 95 -28 130 -45 94 -44 254 -57 488 -41 142 10 193 18 266 41 50 16 119 34 155 40 36 6 90 15 120 21 30 5 89 25 130 44 41 19 111 41 154 50 44 8 93 24 110 35 67 43 115 60 178 63 58 2 63 0 66 -20 2 -12 -13 -59 -32 -104 -48 -109 -47 -142 1 -168 31 -16 3335 -16 3366 0 48 26 48 57 1 166 -19 46 -34 93 -32 106 3 20 8 22 66 20 63 -3 111 -20 178 -63 17 -11 72 -29 122 -40 50 -10 114 -31 144 -46 68 -35 92 -41 216 -60 57 -8 135 -26 173 -40 114 -41 406 -63 592 -45 87 9 124 17 185 45 43 18 95 37 117 41 46 8 89 28 129 62 15 13 44 30 63 38 90 38 321 272 376 382 15 28 31 54 37 58 16 10 46 75 59 130 7 28 26 80 42 117 63 144 63 492 0 635 -16 37 -35 91 -42 118 -12 52 -27 82 -84 175 -89 146 -284 344 -395 400 -24 12 -60 35 -80 51 -20 17 -61 34 -98 43 -34 8 -92 28 -128 45 -55 26 -88 33 -188 42 -216 20 -494 -3 -618 -52 -27 -10 -104 -28 -171 -40 -80 -13 -145 -31 -187 -51 -36 -16 -100 -38 -142 -49 -43 -10 -108 -34 -145 -53 -38 -18 -93 -39 -123 -45 -30 -7 -84 -29 -120 -50 -36 -21 -87 -44 -115 -50 -27 -7 -79 -30 -115 -51 -36 -21 -84 -44 -108 -50 -23 -6 -57 -24 -76 -40 -36 -32 -77 -39 -98 -16 -7 8 -38 45 -68 83 -102 126 -231 241 -307 274 -23 10 -64 33 -92 53 -31 21 -74 39 -109 46 -31 7 -90 25 -130 41 -114 45 -185 54 -422 54 -232 -1 -285 -8 -405 -55 -38 -16 -96 -33 -127 -40 -34 -6 -78 -25 -105 -44 -27 -18 -69 -42 -95 -54 -81 -36 -209 -151 -326 -295 -73 -88 -94 -95 -148 -47 -19 16 -53 34 -76 40 -24 6 -69 27 -101 46 -32 20 -87 44 -122 54 -35 10 -90 34 -122 54 -32 19 -88 42 -125 50 -37 9 -91 29 -120 45 -29 17 -89 39 -133 50 -44 10 -106 31 -138 46 -31 14 -94 34 -140 42 -84 16 -167 36 -296 72 -133 37 -376 50 -581 30z"/><path d="M2729 3281 c-17 -13 -23 -29 -23 -57 1 -73 24 -229 45 -304 12 -41 31 -134 44 -207 25 -145 62 -243 107 -285 l28 -28 1570 0 1570 0 28 28 c42 39 82 141 99 246 8 50 29 156 48 236 33 143 48 239 49 314 0 28 -6 44 -23 57 -22 18 -79 19 -1771 19 -1692 0 -1749 -1 -1771 -19z"/><path d="M3226 1784 c-26 -25 -19 -57 20 -95 34 -32 59 -62 159 -193 49 -63 255 -258 310 -293 22 -14 54 -38 70 -54 17 -15 51 -37 76 -48 25 -11 63 -34 84 -51 21 -16 56 -35 79 -41 23 -6 75 -24 116 -40 119 -48 167 -59 295 -65 165 -9 272 6 393 54 53 22 114 42 134 46 21 4 57 22 82 40 24 19 65 44 92 55 27 12 63 35 79 51 17 15 44 36 61 47 83 50 245 208 347 338 34 43 86 104 115 135 57 62 67 101 33 120 -13 7 -429 10 -1275 10 -1127 0 -1256 -2 -1270 -16z"/></g></svg>' : ""}<span></span></h3>
        <p><span class="group-subject-text"></span><small>Lead by ${team.leaderName}</small></p>
      </div>
      <div class="card-right"><strong>${team.members} members</strong><span class="colony-team-arrow" aria-hidden="true">›</span></div>`;
    card.querySelector(".group-name > span:last-child").textContent = team.name;
    card.querySelector(".group-subject-text").textContent = team.subject;
    card.addEventListener("click", () => openTeam(team));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openTeam(team);
      }
    });
    teamList.appendChild(card);
  });
};

const NOTES_LABEL_THEME = {
  "Announcement / Update": { className: "note-label-red", color: "#FF6868" },
  "Question / Help Needed": { className: "note-label-green", color: "#7BF1A8" },
  "Idea / Proposal": { className: "note-label-teal", color: "#4ECDC4" },
  "Shoutout / Kudos": { className: "note-label-kudos", color: "#000000" },
  "Summary / Brief": { className: "note-label-blue", color: "#8ECAE6" },
  "Discussion / Request for Comments": { className: "note-label-pink", color: "#FF70AE" },
  "Resource / Link": { className: "note-label-peach", color: "#FFEBD9" },
  "Bug Log / Incident": { className: "note-label-bug", color: "#FF70AE" }
};

const noteAddModalOverlay = document.querySelector("#noteAddModalOverlay");
const noteAddModalTitle = document.querySelector("#noteAddModalTitle");
const noteAddForm = document.querySelector("#noteAddForm");
const noteTitleInput = document.querySelector("#noteTitleInput");
const noteTitleCounter = document.querySelector("#noteTitleCounter");
const noteBodyInput = document.querySelector("#noteBodyInput");
const noteLabelSelect = document.querySelector("#noteLabelSelect");
const discardNoteAddBtn = document.querySelector("#discardNoteAddBtn");
const openAddNoteModalBtn = document.querySelector("#openAddNoteModalBtn");
const notesList = document.querySelector("#notesList");
const noteDetailOverlay = document.querySelector("#noteDetailOverlay");
const noteDetailTitle = document.querySelector("#noteDetailTitle");
const noteDetailContent = document.querySelector("#noteDetailContent");
const noteDetailImportance = document.querySelector("#noteDetailImportance");
const noteDetailDate = document.querySelector("#noteDetailDate");
const noteDetailAuthor = document.querySelector("#noteDetailAuthor");
const noteCommentsList = document.querySelector("#noteCommentsList");
const noteCommentForm = document.querySelector("#noteCommentForm");
const noteCommentInput = document.querySelector("#noteCommentInput");
const closeNoteDetailBtn = document.querySelector("#closeNoteDetailBtn");
const editNoteBtn = document.querySelector("#editNoteBtn");
const removeNoteBtn = document.querySelector("#removeNoteBtn");
const saveNoteBtn = document.querySelector("#saveNoteBtn");
const editCommentOverlay = document.querySelector("#editCommentOverlay");
const editCommentForm = document.querySelector("#editCommentForm");
const editCommentInput = document.querySelector("#editCommentInput");
const cancelEditCommentBtn = document.querySelector("#cancelEditCommentBtn");
let activeNote = null;
let editingNoteId = null;
let editingComment = null;

const updateNoteTitleCounter = () => {
  if (noteTitleCounter) noteTitleCounter.textContent = `${noteTitleInput?.value.length || 0}/49`;
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
      avatar.src = resolveAvatar(comment.USER?.avatarPath) || "../assets/profile-placeholder.svg";
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

const closeNoteAddModalNow = () => {
  noteAddModalOverlay?.classList.remove("open");
  noteAddModalOverlay?.setAttribute("aria-hidden", "true");
  noteAddForm?.reset();
  updateNoteTitleCounter();
  editingNoteId = null;
  if (noteAddModalTitle) noteAddModalTitle.textContent = "Add Colony Note";
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

const getNoteLabelTheme = (label) => NOTES_LABEL_THEME[label] || { className: "note-label-default", color: "#111111" };
let aboutLinkTemplates = null;

const loadColonyActivityStatus = async (grpId) => {
  const supabase = getSupabase();
  const statusBadge = document.querySelector("#colonyStatusBadge");
  if (!supabase || !statusBadge || !grpId) return;
  const { data: swarms } = await supabase.from("GROUP").select("grpId").eq("parentGrpId", Number(grpId));
  const groupIds = [Number(grpId), ...(swarms || []).map((group) => Number(group.grpId))];
  const [{ data: notifications }, { data: notes }] = await Promise.all([
    supabase.from("NOTIFICATION").select('"notiDate&Time"').in("grpId", groupIds).order("notiDate&Time", { ascending: false }).limit(1),
    supabase.from("GROUP_NOTE").select("createdAt").in("grpId", groupIds).order("createdAt", { ascending: false }).limit(1)
  ]);
  const latestActivity = [notifications?.[0]?.["notiDate&Time"], notes?.[0]?.createdAt]
    .map((value) => new Date(value || 0).getTime()).filter(Number.isFinite).sort((a, b) => b - a)[0] || 0;
  const isActive = Date.now() - latestActivity < 7 * 24 * 60 * 60 * 1000;
  statusBadge.textContent = isActive ? "Active" : "Inactive";
  statusBadge.classList.toggle("status-active", isActive);
  statusBadge.classList.toggle("status-inactive", !isActive);
};

const formatGroupCreatedDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
};

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
    calendar.innerHTML = "<div class=\"schedule-empty-state\"><img src=\"../assets/bee-flight.svg\" alt=\"\"><h2>No Meeting Schedule Set</h2><p>There is still no meeting schedule set yet.</p></div>";
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
  const viewScheduleBtn = document.querySelector("#viewColonyScheduleBtn");
  if (viewScheduleBtn) viewScheduleBtn.onclick = () => {
    renderScheduleCalendar(document.querySelector("#colonyScheduleCalendar"), currentGroup.meetingSchedule);
    document.querySelector("#colonyScheduleModal")?.classList.add("open");
    document.querySelector("#colonyScheduleModal")?.setAttribute("aria-hidden", "false");
  };
  if (schedule) schedule.replaceChildren(viewScheduleBtn || document.createTextNode("Not set"));
  const closeScheduleBtn = document.querySelector("#closeColonyScheduleBtn");
  if (closeScheduleBtn) closeScheduleBtn.onclick = () => {
    document.querySelector("#colonyScheduleModal")?.classList.remove("open");
    document.querySelector("#colonyScheduleModal")?.setAttribute("aria-hidden", "true");
  };
  const createdDate = document.querySelector("#colonyCreatedDate");
  if (createdDate) createdDate.textContent = formatGroupCreatedDate(currentGroup.createdAt);
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
    const authorAvatar = resolveAvatar(note.USER?.avatarPath) || "../assets/profile-placeholder.svg";
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
      const displayName = note.USER?.userDisplayName || "Unknown user";
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
      noteDetailAuthor.textContent = `Posted by: ${displayName}`;
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
  if (activeNote.userId && activeNote.userId !== user.id) {
    const { data: commenter } = await supabase.from("USER").select("userDisplayName").eq("userId", user.id).maybeSingle();
    await supabase.from("NOTIFICATION").insert({
      notiTitle: "Comment on Your Note",
      notiBody: `${commenter?.userDisplayName || "Someone"} commented on your note "${activeNote.noteTitle || "Untitled"}".`,
      "notiDate&Time": new Date().toISOString(),
      notiIsRead: false,
      userId: activeNote.userId,
      grpId: Number(getGroupId())
    });
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
  await hiveNotificationEvents.notifyGroup(supabase, {
    grpId,
    title: "New Note Posted",
    body: `${(await supabase.from("USER").select("userDisplayName").eq("userId", user.id).maybeSingle()).data?.userDisplayName || "Someone"} posted a note in "${currentGroup.name}".`,
    excludeUserId: user.id
  });

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
  if (noteAddModalTitle) noteAddModalTitle.textContent = "Edit Colony Note";
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

const loadColonyTeams = async () => {
  const supabase = getSupabase();
  const colonyId = getGroupId();
  if (!supabase || !colonyId) return;

  const { data: teams, error } = await supabase
    .from("GROUP")
    .select("grpId, grpName, grpSubject, teacherId")
    .eq("parentGrpId", Number(colonyId))
    .order("grpId", { ascending: true });

  if (error) {
    console.error("Failed to load colony teams:", error);
    if (String(error.message || "").toLowerCase().includes("parentgrpid")) {
      showAlert("Colony teams need the parentGrpId database column. Run supabase/colony-teams.sql in Supabase first.", { title: "Database Setup Required" });
    }
    return;
  }

  const teamRows = await Promise.all((teams || []).map(async (team) => {
    const { count } = await supabase
      .from("GROUPMEMBER")
      .select("grpmemId", { count: "exact", head: true })
      .eq("grpId", team.grpId);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: membership } = user
      ? await supabase
        .from("GROUPMEMBER")
        .select("ROLE(roleName)")
        .eq("grpId", team.grpId)
        .eq("userId", user.id)
        .maybeSingle()
      : { data: null };
    const { data: leaderMembership } = await supabase
      .from("GROUPMEMBER")
      .select("USER(userDisplayName), ROLE(roleName)")
      .eq("grpId", team.grpId)
      .eq("ROLE.roleName", "Leader")
      .maybeSingle();
    return {
      grpId: team.grpId,
      name: team.grpName || "Unnamed Team",
      subject: team.grpSubject || "",
      members: count || 0,
      isOwned: String(membership?.ROLE?.roleName || "").trim().toLowerCase() === "leader",
      leaderName: leaderMembership?.USER?.userDisplayName || "Leader unavailable"
    };
  }));
  renderTeamList(teamRows);
};

const closeCreateTeamModalNow = () => {
  if (!createTeamModal) return;
  editingColony = false;
  document.querySelector("#createTeamTitle")?.replaceChildren(document.createTextNode("Create Team"));
  createTeamModal.classList.remove("open");
  createTeamModal.setAttribute("aria-hidden", "true");
};

const loadColonySwarms = async () => {
  const supabase = getSupabase();
  const colonyId = Number(getGroupId());
  if (!supabase || !colonyId) return [];
  const { data, error } = await supabase
    .from("GROUP")
    .select("grpId, grpName")
    .eq("parentGrpId", colonyId)
    .order("grpName", { ascending: true });
  if (error) {
    console.error("Failed to load colony swarms:", error);
    return [];
  }
  return data || [];
};

const closeAddSwarmMembersModal = () => {
  addSwarmMembersModalOverlay?.classList.remove("open");
  addSwarmMembersModalOverlay?.setAttribute("aria-hidden", "true");
  swarmToAddMembers = null;
};

const openAddSwarmMembersModal = async (swarm) => {
  if (!isColonyInstructor) {
    showAlert("Only the colony instructor can add members to a swarm.", { title: "Not Allowed" });
    return;
  }
  const supabase = getSupabase();
  if (!supabase || !addSwarmMembersModalOverlay || !addSwarmMembersList) return;
  const { data: existing } = await supabase.from("GROUPMEMBER").select("userId").eq("grpId", swarm.grpId);
  const existingIds = new Set((existing || []).map((member) => String(member.userId)));
  const available = currentMembers.filter((member) => !existingIds.has(String(member.userId)));
  swarmToAddMembers = swarm;
  if (addSwarmMembersModalMessage) addSwarmMembersModalMessage.textContent = `Choose colony members to add to ${swarm.name}.`;
  addSwarmMembersList.innerHTML = available.length
    ? available.map((member) => `<label class="swarm-member-option"><input type="checkbox" value="${member.userId}"><span>${member.fullName}</span></label>`).join("")
    : "<p>All colony members are already in this swarm.</p>";
  if (confirmAddSwarmMembersBtn) confirmAddSwarmMembersBtn.disabled = !available.length;
  addSwarmMembersModalOverlay.classList.add("open");
  addSwarmMembersModalOverlay.setAttribute("aria-hidden", "false");
};

const addMembersToSwarm = async () => {
  const supabase = getSupabase();
  if (!supabase || !swarmToAddMembers || !addSwarmMembersList) return;
  const userIds = [...addSwarmMembersList.querySelectorAll("input[type='checkbox']:checked")].map((input) => input.value);
  if (!userIds.length) return;
  const { data: roles } = await supabase.from("ROLE").select("roleId, roleName").in("roleName", ["Member", "Leader", "Teacher"]);
  const memberRoleId = roles?.find((role) => normalizeText(role.roleName) === "member")?.roleId || null;
  const rows = userIds.map((userId) => ({ userId, grpId: swarmToAddMembers.grpId, roleId: memberRoleId }));
  const { error } = await supabase.from("GROUPMEMBER").insert(rows);
  if (error) {
    showAlert(`Failed to add members: ${error.message}`, { title: "Add Members" });
    return;
  }
  closeAddSwarmMembersModal();
  await loadColonyTeams();
};

const requestCloseCreateTeamModal = () => {
  safeShowConfirmation("Are you sure you want to close this form? Your changes will be lost.", closeCreateTeamModalNow, {
    title: "Close Form",
    confirmText: "Close",
    cancelText: "Keep Editing"
  });
};

const openCreateTeamModal = () => {
  if (!createTeamModal) return;
  if (!canManageMembers) {
    showAlert("Only the colony leader can create a swarm.", { title: "Not Allowed" });
    return;
  }
  editingColony = false;
  const colonyId = getGroupId();
  if (teamColonyId) teamColonyId.value = colonyId || "";
  createTeamForm?.setAttribute("data-colony-id", colonyId || "");
  createTeamForm?.reset();
  if (teamColonyId) teamColonyId.value = colonyId || "";
  if (teamLinksList) {
    teamLinksList.innerHTML = "";
  }
  resetTeamScheduleList();
  createTeamModal.classList.add("open");
  createTeamModal.setAttribute("aria-hidden", "false");
  teamNameInput?.focus();
};

const swarmNameKey = (name) => String(name || "").trim().replace(/\s+/g, " ").toLowerCase();

const swarmNameExistsInColony = async (supabase, colonyId, name) => {
  const { data: swarms, error } = await supabase
    .from("GROUP")
    .select("grpName")
    .eq("parentGrpId", Number(colonyId));
  if (error) throw new Error(`Unable to validate the swarm name: ${error.message}`);
  const requestedName = swarmNameKey(name);
  return (swarms || []).some((swarm) => swarmNameKey(swarm.grpName) === requestedName);
};

const openEditColonyModal = () => {
  if (!createTeamModal) return;
  editingColony = true;
  document.querySelector("#createTeamTitle")?.replaceChildren(document.createTextNode("Edit Colony"));
  if (teamNameInput) teamNameInput.value = currentGroup.name || "";
  if (teamSubjectInput) teamSubjectInput.value = currentGroup.subject || "";
  if (teamMottoInput) teamMottoInput.value = currentGroup.motto || "";
  if (teamDescriptionInput) teamDescriptionInput.value = currentGroup.description || "";
  populateColonyEditSchedule();
  populateColonyEditLinks();
  createTeamModal.classList.add("open");
  createTeamModal.setAttribute("aria-hidden", "false");
  teamNameInput?.focus();
};

const teamLinkIcons = {
  discord: `<svg class="discord-icon" viewBox="0 -28.5 256 256" aria-hidden="true"><path d="M216.856 16.597A164.3 164.3 0 0 0 164.042 0c-2.275 4.113-4.933 9.645-6.766 14.046-19.692-2.961-39.203-2.961-58.533 0C96.911 9.645 94.193 4.113 91.897 0A161.6 161.6 0 0 0 39.042 16.638C5.618 67.147-3.443 116.401 1.087 164.956c22.169 16.555 43.653 26.612 64.775 33.193 5.215-7.177 9.866-14.807 13.873-22.848a135.3 135.3 0 0 1-21.846-10.632c1.832-1.358 3.624-2.777 5.356-4.237 42.123 19.702 87.89 19.702 129.51 0 1.752 1.46 3.544 2.879 5.356 4.237a136.2 136.2 0 0 1-21.887 10.653c4.007 8.02 8.658 15.67 13.893 22.847 21.142-6.581 42.646-16.637 64.815-33.213 5.316-56.288-9.081-105.09-38.056-148.359ZM85.474 135.095c-12.645 0-23.015-11.805-23.015-26.18 0-14.375 10.148-26.2 23.015-26.2 12.867 0 23.236 11.804 23.015 26.2.02 14.375-10.148 26.18-23.015 26.18Zm85.051 0c-12.645 0-23.015-11.805-23.015-26.18 0-14.375 10.148-26.2 23.015-26.2 12.866 0 23.236 11.804 23.015 26.2 0 14.375-10.148 26.18-23.015 26.18Z" fill="currentColor"></path></svg>`,
  meet: `<svg class="meet-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M41.05 12.6c1.63-1.3 2.85-.23 2.85 1.14v20.52c0 1.73-1.22 2.44-2.85 1.14L26.79 24ZM14 8v32M4.9 17.16h21.89v13.68H4.9m0-13.68L14 8h18.5a3.2 3.2 0 0 1 2.85 2.85v26.26A3.2 3.2 0 0 1 32.5 40H7.75a2.81 2.81 0 0 1-2.85-2.89Z" fill="none" stroke="currentColor" stroke-width="4.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
  resources: `<svg class="resources-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21.4231 13.88785 15.33356 3.33792H8.66663l6.09 10.54993ZM8.08917 4.33835 2 14.88736l3.33356 5.77472 6.08911-10.54926Zm1.73273 10.549L6.48877 20.66208h12.17786L22 14.88736Z" fill="currentColor"></path></svg>`,
  repository: `<svg class="repository-icon" viewBox="0 -0.5 25 25" aria-hidden="true"><path fill="currentColor" d="M12.3 0h.1c2.24 0 4.34.61 6.14 1.68a12.7 12.7 0 0 1 4.48 4.48A12.2 12.2 0 0 1 24.67 12.3c0 5.4-3.48 10-8.33 11.66-.06.02-.14.03-.21.03-.16 0-.31-.05-.43-.14-.13-.12-.21-.28-.21-.47v-3.38c-.52-.52-.84-1.23-.84-2.03.62-.06 1.18-.16 1.72-.3.57-.16 1.07-.37 1.54-.64.51-.28.94-.64 1.29-1.06.37-.48.66-1.04.84-1.65.21-.68.33-1.47.33-2.28v-.14c0-1.25-.48-2.38-1.27-3.23.17-.44.27-.95.27-1.48 0-.65-.15-1.26-.4-1.81-.12-.02-.25-.04-.38-.04-.33 0-.65.08-.93.22-.57.21-1.05.45-1.51.73l-.61.38c-.92-.26-1.98-.42-3.08-.42s-2.15.15-3.16.44l-.68-.43c-.37-.21-.81-.42-1.27-.6-.29-.15-.64-.24-1.01-.24-.12 0-.25.01-.36.03-.25.52-.39 1.14-.39 1.79 0 .53.1 1.04.28 1.51-.79.84-1.27 1.98-1.27 3.23v.08c0 .85.12 1.67.34 2.39.19.64.48 1.2.85 1.69.35.44.78.79 1.27 1.06.43.25.93.47 1.46.61.47.13 1.02.23 1.6.28-.43.43-.72 1-.78 1.64-.21.1-.45.18-.7.24-.26.05-.55.08-.85.08h-.07c-.39-.01-.76-.14-1.05-.35-.37-.26-.67-.6-.88-.99-.2-.34-.46-.61-.77-.83-.23-.17-.49-.3-.78-.38l-.32-.05c-.14 0-.27.03-.39.08q-.13.07-.08.18c.04.09.09.16.15.23.06.07.13.14.2.19l.12.08c.28.15.52.35.69.6.19.24.36.5.49.79l.16.37c.14.4.38.74.7.98.3.23.66.4 1.06.48.33.06.71.1 1.11.11.26 0 .52-.02.77-.06l.37-.06v2.29c0 .19-.08.35-.21.47-.12.09-.27.14-.43.14-.08 0-.15-.01-.21-.03C3.48 22.57 0 17.98 0 12.57 0 10.3.61 8.18 1.68 6.35A12.7 12.7 0 0 1 6.07 1.97C7.81.93 9.91.32 12.15.32h.1Z"></path></svg>`,
  other: `<svg class="other-icon" fill="currentColor" viewBox="0 0 486.465 486.465" aria-hidden="true"><path d="M453.323 39.655 436.759 25C418.729 9.021 395.521.22 371.405.22c-28.223 0-55.118 12.079-73.791 33.143L250.207 86.86c-6.105 6.876-9.164 15.722-8.608 24.901.557 9.166 4.642 17.576 11.518 23.673l4.438 3.94c6.299 5.594 14.416 8.673 22.842 8.673l2.054-.059c9.166-.551 17.582-4.637 23.699-11.523l47.418-53.503c8.342-9.416 24.169-10.362 33.601-2.026l16.558 14.688c4.748 4.203 7.57 10.021 7.955 16.384.386 6.358-1.722 12.465-5.937 17.208L302.042 246.198c-6.982 7.887-19.377 10.164-28.734 5.342-14.577-7.519-33.58-3.93-44.392 8.256l-.813.926c-7.573 8.518-10.727 19.838-8.674 31.104 2.074 11.198 9.047 20.801 19.153 26.09 13.986 7.311 29.763 11.33 45.621 11.33h.012c28.21 0 55.117-12.238 73.8-33.308l103.691-117.046c36.04-40.666 32.298-103.161-8.383-139.237ZM228.873 347.458c-13.669-12.103-36.426-10.743-48.574 2.938l-47.396 53.487c-8.342 9.412-24.159 10.387-33.58 2.043l-16.576-14.705c-4.747-4.207-7.57-10.025-7.955-16.383-.387-6.348 1.722-12.453 5.935-17.196l103.692-116.974c6.876-7.765 19.047-10.111 28.297-5.566 15.121 7.448 34.359 3.818 46.05-9.416 7.433-8.374 10.555-19.496 8.586-30.463-1.956-11.031-8.747-20.389-18.618-25.666-14.201-7.604-30.274-11.624-46.466-11.624-28.223 0-55.118 12.084-73.791 33.151L24.772 308.038c-36.062 40.666-32.308 103.082 8.361 139.143l16.564 14.482c18.021 15.979 41.229 24.582 65.345 24.582h.011c28.223 0 55.129-11.889 73.812-32.957l47.388-53.379c6.116-6.887 9.176-15.691 8.618-24.819-.533-9.068-4.736-17.694-11.538-23.706l-4.46-3.926Z"/></svg>`
};

const parseColonyScheduleTime = (value) => {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "";
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
};

const populateColonyEditSchedule = () => {
  if (!teamScheduleList) return;
  const firstRow = teamScheduleList.querySelector(".schedule-fields");
  if (!firstRow) return;
  [...teamScheduleList.querySelectorAll(".schedule-fields")].slice(1).forEach((row) => row.remove());
  firstRow.querySelectorAll("input").forEach((input) => { input.value = ""; });
  firstRow.querySelectorAll("select").forEach((select) => { select.selectedIndex = 0; });
  const schedules = String(currentGroup.meetingSchedule || "").split(";").map((entry) => {
    const match = entry.trim().match(/^([^,]+),\s*(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))$/i);
    return match ? { day: match[1], from: parseColonyScheduleTime(match[2]), to: parseColonyScheduleTime(match[3]) } : null;
  }).filter(Boolean);
  const rows = [...teamScheduleList.querySelectorAll(".schedule-fields")];
  schedules.forEach((schedule, index) => {
    const row = rows[index] || (addTeamScheduleRow(), teamScheduleList.lastElementChild);
    row.querySelector("[name='teamScheduleDay']").value = schedule.day;
    row.querySelector("[name='teamScheduleFrom']").value = schedule.from;
    row.querySelector("[name='teamScheduleTo']").value = schedule.to;
  });
};

const populateColonyEditLinks = () => {
  if (!teamLinksList) return;
  teamLinksList.innerHTML = "";
  (currentGroup.links || []).forEach(addTeamLinkRow);
};

const addTeamLinkRow = (link = {}) => {
  if (!teamLinksList) return;
  const row = document.createElement("div");
  row.className = "group-link-row";
  row.innerHTML = `
    <span class="group-link-icon" aria-hidden="true">${teamLinkIcons.discord}</span>
    <select name="teamLinkType" aria-label="Link type">
      <option value="discord">Discord</option>
      <option value="meet">Google Meet</option>
      <option value="resources">Resources</option>
      <option value="repository">Repository</option>
      <option value="other">Other</option>
    </select>
    <input name="teamLinkUrl" type="url" aria-label="Link URL" placeholder="Paste link">
    <button type="button" class="remove-group-link-btn" aria-label="Remove link">×</button>
  `;
  const linkTypeSelect = row.querySelector("select");
  const linkUrlInput = row.querySelector("input");
  const linkIcon = row.querySelector(".group-link-icon");
  linkTypeSelect.value = link.type || "discord";
  linkUrlInput.value = link.url || "";
  linkIcon.innerHTML = teamLinkIcons[linkTypeSelect.value] || teamLinkIcons.other;
  linkTypeSelect.addEventListener("change", () => {
    linkIcon.innerHTML = teamLinkIcons[linkTypeSelect.value] || teamLinkIcons.other;
  });
  row.querySelector(".remove-group-link-btn").addEventListener("click", () => {
    row.remove();
  });
  teamLinksList.appendChild(row);
};

const addTeamScheduleRow = () => {
  if (!teamScheduleList) return;
  const row = teamScheduleList.querySelector(".schedule-fields")?.cloneNode(true);
  if (!row) return;
  row.querySelectorAll("input").forEach((input) => { input.value = ""; });
  row.querySelectorAll("select").forEach((select) => { select.selectedIndex = 0; });
  row.querySelector(".remove-schedule-btn")?.addEventListener("click", () => {
    if (teamScheduleList.children.length > 1) row.remove();
    else row.querySelectorAll("input").forEach((input) => { input.value = ""; });
  });
  teamScheduleList.appendChild(row);
};

const resetTeamScheduleList = () => {
  if (!teamScheduleList) return;
  const scheduleRows = [...teamScheduleList.querySelectorAll(".schedule-fields")];
  scheduleRows.slice(1).forEach((row) => row.remove());
  scheduleRows[0]?.querySelectorAll("input").forEach((input) => { input.value = ""; });
  scheduleRows[0]?.querySelectorAll("select").forEach((select) => { select.selectedIndex = 0; });
};

teamScheduleList?.querySelector(".remove-schedule-btn")?.addEventListener("click", (event) => {
  const row = event.currentTarget.closest(".schedule-fields");
  if (!row || !teamScheduleList) return;
  if (teamScheduleList.children.length > 1) row.remove();
  else {
    row.querySelectorAll("input").forEach((input) => { input.value = ""; });
    row.querySelectorAll("select").forEach((select) => { select.selectedIndex = 0; });
  }
});

if (createTeamEmptyBtn) createTeamEmptyBtn.addEventListener("click", openCreateTeamModal);
if (openCreateTeamModalBtn) openCreateTeamModalBtn.addEventListener("click", openCreateTeamModal);
editColonyBtn?.addEventListener("click", openEditColonyModal);
deleteColonyBtn?.addEventListener("click", () => {
  const grpId = getGroupId();
  const supabase = getSupabase();
  if (!grpId || !supabase) return;
  safeShowConfirmation(`Delete "${currentGroup.name}" and all of its swarms, projects, and tasks? This cannot be undone.`, async () => {
    const { error } = await supabase.rpc("delete_group_cascade", { p_grp_id: Number(grpId) });
    if (error) {
      showAlert(`Failed to delete colony: ${error.message}`, { title: "Error" });
      return;
    }
    window.location.href = "t.team.html";
  }, { title: "Delete Colony", confirmText: "Delete", cancelText: "Cancel" });
});
if (discardCreateTeamBtn) discardCreateTeamBtn.addEventListener("click", requestCloseCreateTeamModal);
if (addTeamLinkBtn) addTeamLinkBtn.addEventListener("click", addTeamLinkRow);
if (addTeamScheduleBtn) {
  addTeamScheduleBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    addTeamScheduleRow();
  });
}
if (createTeamModal) {
  createTeamModal.addEventListener("click", (event) => {
    if (event.target === createTeamModal) requestCloseCreateTeamModal();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && createTeamModal?.classList.contains("open")) {
    event.preventDefault();
    requestCloseCreateTeamModal();
  }
});

if (createTeamForm) {
  createTeamForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (validateTeamSchedule()) {
      teamScheduleList?.querySelector("input:invalid, select:invalid")?.reportValidity();
      return;
    }
    const teamName = teamNameInput?.value.trim() || "";
    const teamSubject = teamSubjectInput?.value.trim() || "";
    const teamMotto = teamMottoInput?.value.trim() || null;
    const teamDescription = teamDescriptionInput?.value.trim() || null;
    const teamSchedule = getTeamSchedule();
    const teamLinks = teamLinksList
      ? [...teamLinksList.querySelectorAll(".group-link-row")]
        .map((row) => ({
          type: row.querySelector("select")?.value || "other",
          url: row.querySelector("input")?.value.trim() || ""
        }))
        .filter((link) => link.url)
      : [];
    if (!teamName || !teamSubject || !teamDescription) return;

    const supabase = getSupabase();
    if (!supabase) {
      showAlert("Cannot connect to database.", { title: "Connection Error" });
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) {
      showAlert("You must be logged in to create a team.", { title: "Not Logged In" });
      return;
    }

    const saveButton = document.querySelector("#saveCreateTeam");
    if (saveButton) saveButton.disabled = true;
    try {
      const groupPayload = {
          grpName: teamName,
          grpSubject: teamSubject,
          grpMotto: teamMotto,
          grpDescription: teamDescription,
          grpMeetingSchedule: teamSchedule,
          grpLinks: teamLinks
      };
      if (!editingColony) {
        const colonyId = Number(teamColonyId?.value || getGroupId());
        if (await swarmNameExistsInColony(supabase, colonyId, teamName)) {
          showAlert("A swarm with this name already exists in this colony. Choose a different name.", { title: "Duplicate Swarm Name" });
          return;
        }
      }
      const groupRequest = editingColony
        ? supabase.from("GROUP").update(groupPayload).eq("grpId", Number(getGroupId()))
        : supabase.from("GROUP").insert({ ...groupPayload, grpType: "SWARM", parentGrpId: Number(teamColonyId?.value || getGroupId()) }).select("grpId").single();
      const { data: newTeam, error: teamError } = await groupRequest;
      if (editingColony) {
        if (teamError) throw new Error(teamError.message);
        currentGroup = { ...currentGroup, name: teamName, subject: teamSubject || "Subject", motto: teamMotto || "", description: teamDescription || "", meetingSchedule: teamSchedule || "", links: teamLinks };
        document.querySelector("#groupTitle")?.replaceChildren(document.createTextNode(teamName));
        document.querySelector("#aboutDescription")?.replaceChildren(document.createTextNode(teamDescription || ""));
        renderAboutDetails();
        closeCreateTeamModalNow();
        return;
      }
      if (teamError || !newTeam) {
        if (String(teamError?.message || "").toLowerCase().includes("parentgrpid")) {
          throw new Error("The parentGrpId database column is missing. Run supabase/colony-teams.sql in Supabase first.");
        }
        throw new Error(teamError?.message || "Team creation failed.");
      }

      const [{ data: leaderRole }, { data: teacherRole }, { data: colony }] = await Promise.all([
        supabase.from("ROLE").select("roleId").eq("roleName", "Leader").maybeSingle(),
        supabase.from("ROLE").select("roleId").eq("roleName", "Teacher").maybeSingle(),
        supabase.from("GROUP").select("teacherId").eq("grpId", Number(teamColonyId?.value || getGroupId())).maybeSingle()
      ]);
      if (!leaderRole) throw new Error("Leader role could not be found.");

      const colonyInstructors = currentMembers.filter((member) => normalizeText(member.roleName) === "teacher");
      if (colony?.teacherId && !colonyInstructors.some((member) => String(member.userId) === String(colony.teacherId))) {
        colonyInstructors.push({ userId: colony.teacherId });
      }
      if (!teacherRole && String(user.id) !== String(colony?.teacherId)) throw new Error("Teacher role could not be found.");
      const creatorIsProjectManager = String(user.id) === String(colony?.teacherId);
      const newSwarmMembers = [{
        userId: user.id,
        grpId: newTeam.grpId,
        roleId: creatorIsProjectManager ? leaderRole.roleId : teacherRole.roleId
      }];
      colonyInstructors.forEach((instructor) => {
        if (String(instructor.userId) !== String(user.id) && teacherRole?.roleId) {
          newSwarmMembers.push({ userId: instructor.userId, grpId: newTeam.grpId, roleId: teacherRole.roleId });
        }
      });
      const { error: memberError } = await supabase.from("GROUPMEMBER").insert(newSwarmMembers);
      if (memberError) {
        await supabase.from("GROUP").delete().eq("grpId", newTeam.grpId);
        throw new Error(memberError.message);
      }

      renderCreatedTeam({ grpId: newTeam.grpId, name: teamName, subject: teamSubject });
      closeCreateTeamModalNow();
      createTeamForm.reset();
    } catch (error) {
      showAlert(`Failed to create team: ${error.message}`, { title: "Error" });
    } finally {
      if (saveButton) saveButton.disabled = false;
    }
  });
}

const renderCreatedTeam = (team) => {
  loadColonyTeams();
};

/* ── STATE (populated by loadGroupFromDB) ────────────────────────────────── */
let currentMembers = []; // full list of {grpmemId, userId, fullName, email, roleName, roleId}
let isColonyLeader = false;
let isColonyInstructor = false;
let swarmToAddMembers = null;
let canManageMembers = false;
let currentGroup = { name: "Team", subject: "Subject", description: "", motto: "", meetingSchedule: "", links: [] };

/* ── DB LOAD ──────────────────────────────────────────────────────────────── */
const loadGroupFromDB = async () => {
  const supabase = getSupabase(); // FIX: use lazy accessor, not the captured-at-parse-time undefined value
  const grpId = getGroupId();
  if (!grpId || !supabase) return;

  // 1. Group info
  const { data: grp, error: grpErr } = await supabase
    .from("GROUP")
    .select("grpName, grpSubject, grpDescription, grpMotto, grpMeetingSchedule, grpLinks, grpCreatedAt, teacherId")
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
      teacherId: grp.teacherId || null
    };
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
    renderAboutDetails();
    loadColonyActivityStatus(grpId);
  }

  await loadColonyTeams();
  await renderNotes();

  // 2. Members (join USER and ROLE)
  const { data: members, error: memErr } = await supabase
    .from("GROUPMEMBER")
    .select("grpmemId, userId, grpId, roleId, ROLE(roleName), USER(userDisplayName, userEmail, avatarPath, PROGRAM(progName), DEPARTMENT(deptName))")
    .eq("grpId", grpId);

  if (memErr || !members) {
    console.error("Error loading members:", memErr);
    return;
  }

  currentMembers = members.map((m) => ({
    grpmemId:  m.grpmemId,
    userId:    m.userId,
    grpId:     m.grpId,
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
    if (existingTeacher && normalizeText(existingTeacher.roleName) === "leader") {
      existingTeacher.roleName = "Teacher";
    } else if (existingTeacher) {
      existingTeacher.roleName = "Teacher";
    }

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
  currentUserId = currentUser?.id || null;
  isColonyLeader = Boolean(currentUserId && currentMembers.some((member) =>
    String(member.userId) === String(currentUserId) && normalizeText(member.roleName) === "leader"
  ));
  isColonyInstructor = Boolean(currentUserId && currentMembers.some((member) =>
    String(member.userId) === String(currentUserId) && normalizeText(member.roleName) === "teacher"
  ));
  canManageMembers = Boolean(currentUser && currentMembers.some((member) =>
    String(member.userId) === String(currentUser.id)
    && ["leader", "admin", "teacher"].includes(normalizeText(member.roleName))
  ));
  const editColonyButton = document.querySelector("#editColonyBtn");
  const deleteColonyButton = document.querySelector("#deleteColonyBtn");
  if (editColonyButton) editColonyButton.hidden = !canManageMembers;
  if (deleteColonyButton) deleteColonyButton.hidden = !canManageMembers;
  document.querySelectorAll("#openCreateTeamModalBtn, #createTeamEmptyBtn").forEach((button) => {
    button.hidden = !canManageMembers;
  });

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
  await loadColonyTeams();
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
  const displayRole = isLeader ? "Project Manager" : member.roleName;
  const canEditMember = canManageMembers && (isColonyLeader || isColonyInstructor) && !isTeacher && !isLeader;

  return `
  <article class="info-card ${cardClass}" data-member-id="${member.userId}" style="cursor:pointer;">
    <div class="circle-avatar ${avatarSize}" ${avatarStyle}>
      ${avatarContent}
    </div>
    <div class="member-details">
      <div class="member-info">
        <h3>${member.fullName}</h3>
        <p>${displayRole}</p>
      </div>
      ${canEditMember ? `
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
        <button type="button" role="menuitem" data-member-action="remove">Remove from Colony</button>
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

  const teacher       = membersWithStats.find((m) => normalizeText(m.roleName) === "teacher");
  const normalMembers = membersWithStats.filter((m) => {
    const r = normalizeText(m.roleName);
    return r !== "teacher";
  });

  if (adminCard) {
    adminCard.innerHTML = "";
  }

  memberCards.innerHTML = `
    <div class="member-grid">
      ${normalMembers.map((m) => createMemberCard(m, "member-card", "medium")).join("")}
    </div>
    ${!normalMembers.length ? `<article class="info-card"><h3>No members found</h3></article>` : ""}
  `;

  instructorCards.innerHTML = teacher
    ? createMemberCard(teacher, "teacher-card member-card", "medium")
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
  memberProfileRole.textContent  = normalizeText(member.roleName) === "leader" ? "Project Manager" : (member.roleName || "Member");
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
  const profileImageUrl = avatarUrl || "../assets/profile-placeholder.svg";
  memberProfileAvatar.style.backgroundImage = "none";
  memberProfileAvatar.innerHTML = `<img src="${profileImageUrl}" alt="${member.fullName} profile picture" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  const profileImage = memberProfileAvatar.querySelector("img");
  if (profileImage) profileImage.onerror = () => { profileImage.src = "../assets/profile-placeholder.svg"; };
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
  
  window.location.href = "t.dashb.html";
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

cancelAddSwarmMembersBtn?.addEventListener("click", closeAddSwarmMembersModal);
confirmAddSwarmMembersBtn?.addEventListener("click", addMembersToSwarm);
addSwarmMembersList?.addEventListener("change", () => {
  if (confirmAddSwarmMembersBtn) confirmAddSwarmMembersBtn.disabled = !addSwarmMembersList.querySelector("input[type='checkbox']:checked");
});
addSwarmMembersModalOverlay?.addEventListener("click", (event) => {
  if (event.target === addSwarmMembersModalOverlay) closeAddSwarmMembersModal();
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

const memberLeadsColonySwarm = async (supabase, memberId, colonyId) => {
  const { data: swarms } = await supabase.from("GROUP").select("grpId").eq("parentGrpId", Number(colonyId));
  const swarmIds = (swarms || []).map((swarm) => swarm.grpId);
  if (!swarmIds.length) return false;
  const { data: memberships } = await supabase.from("GROUPMEMBER")
    .select("ROLE(roleName)")
    .eq("userId", memberId)
    .in("grpId", swarmIds);
  return (memberships || []).some((membership) => normalizeText(membership.ROLE?.roleName) === "leader");
};

const replaceColonyLeaderInSwarms = async (supabase, colonyId, oldLeaderId, newLeaderId, projectManagerRoleId, memberRoleId) => {
  const { data: swarms, error: swarmsError } = await supabase.from("GROUP").select("grpId, grpName").eq("parentGrpId", Number(colonyId));
  if (swarmsError) throw new Error(`Failed to find colony swarms: ${swarmsError.message}`);
  for (const swarm of swarms || []) {
    const { data: memberships, error: membershipsError } = await supabase.from("GROUPMEMBER")
      .select("grpmemId, userId, roleId")
      .eq("grpId", swarm.grpId)
      .in("userId", [oldLeaderId, newLeaderId]);
    if (membershipsError) throw new Error(`Failed to read swarm members: ${membershipsError.message}`);
    const oldMembership = memberships?.find((membership) => String(membership.userId) === String(oldLeaderId) && String(membership.roleId) === String(projectManagerRoleId));
    if (!oldMembership) continue;
    const newMembership = memberships?.find((membership) => String(membership.userId) === String(newLeaderId));
    if (newMembership) {
      const { error: promoteError } = await supabase.from("GROUPMEMBER").update({ roleId: projectManagerRoleId }).eq("grpmemId", newMembership.grpmemId).eq("grpId", swarm.grpId);
      if (promoteError) throw new Error(`Failed to assign the new Project Manager: ${promoteError.message}`);
      const { error: demoteError } = await supabase.from("GROUPMEMBER").update({ roleId: memberRoleId }).eq("grpmemId", oldMembership.grpmemId).eq("grpId", swarm.grpId);
      if (demoteError) throw new Error(`Failed to demote the previous Project Manager: ${demoteError.message}`);
    } else {
      const { error: replaceError } = await supabase.from("GROUPMEMBER").update({ userId: newLeaderId }).eq("grpmemId", oldMembership.grpmemId).eq("grpId", swarm.grpId);
      if (replaceError) throw new Error(`Failed to replace the swarm Project Manager: ${replaceError.message}`);
    }
    await hiveNotificationEvents.notifyUsers(supabase, {
      userIds: [newLeaderId, oldLeaderId],
      grpId: swarm.grpId,
      title: "Project Manager Updated",
      body: `Project Manager changed for "${swarm.grpName || "the swarm"}".`
    });
  }
};

async function handleMemberAction(member, action) {
  const supabase = getSupabase();
  const grpId = Number(getGroupId());
  if (!supabase || !grpId || !member?.grpmemId) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (action === "leader") {
    if (await memberLeadsColonySwarm(supabase, member.userId, grpId)) {
      showAlert(`${member.fullName} already leads a swarm in this colony and cannot become the colony Leader.`, { title: "Cannot Set Leader" });
      return;
    }
    safeShowConfirmation(`Set ${member.fullName} as the new leader? The current leader will become a member.`, async () => {
      const [{ data: leaderRole }, { data: projectManagerRole }, { data: memberRole }] = await Promise.all([
        supabase.from("ROLE").select("roleId").eq("roleName", "Leader").maybeSingle(),
        supabase.from("ROLE").select("roleId").eq("roleName", "Project Manager").maybeSingle(),
        supabase.from("ROLE").select("roleId").eq("roleName", "Member").maybeSingle()
      ]);
      if (!leaderRole || !projectManagerRole || !memberRole) {
        showAlert("Leader, Project Manager, and Member roles must be configured.", { title: "Role Setup Required" });
        return;
      }
      const currentLeader = currentMembers.find((candidate) => normalizeText(candidate.roleName) === "leader");
      if (currentLeader?.grpmemId) {
        const { error } = await supabase.from("GROUPMEMBER").update({ roleId: memberRole.roleId }).eq("grpmemId", currentLeader.grpmemId).eq("grpId", grpId);
        if (error) { showAlert(`Failed to demote the current leader: ${error.message}`, { title: "Error" }); return; }
      }
      const { error } = await supabase.from("GROUPMEMBER").update({ roleId: leaderRole.roleId }).eq("grpmemId", member.grpmemId).eq("grpId", grpId);
      if (error) { showAlert(`Failed to set leader: ${error.message}`, { title: "Error" }); return; }
      try {
        await replaceColonyLeaderInSwarms(supabase, grpId, currentLeader?.userId || user.id, member.userId, projectManagerRole.roleId, memberRole.roleId);
      } catch (swarmError) {
        showAlert(swarmError.message, { title: "Swarm Update Incomplete" });
        return;
      }
      await loadGroupFromDB();
    }, { title: "Set as Leader", confirmText: "Set Leader", cancelText: "Cancel" });
    return;
  }

  if (action === "remove") {
    safeShowConfirmation(`Remove ${member.fullName} from this colony?`, async () => {
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
    }, { title: "Remove from Colony", confirmText: "Remove", cancelText: "Cancel" });
  }
}

// FIX: TopBackBtn is the only back button in the HTML — #backBtn does not exist
if (topBackBtn) topBackBtn.addEventListener("click", () => {
  const queryReturnPage = new URLSearchParams(window.location.search).get("from");
  const referrerReturnPage = document.referrer.includes("/t.team.html") ? "teams" : null;
  const returnPage = referrerReturnPage
    || queryReturnPage
    || sessionStorage.getItem("hive_group_return_page")
    || "teams";
  if (returnPage === "dashboard") window.location.href = "t.dashb.html";
  else if (returnPage === "teams") window.location.href = "t.team.html";
  else window.history.back();
});

if (projectBreakdownTab) projectBreakdownTab.addEventListener("click", () => {
  const grpId = getGroupId();
  window.location.href = grpId
    ? `t.category.html?grpId=${grpId}`
    : "t.category.html";
});

document.querySelector("#mobileBreakdownBtn")?.addEventListener("click", () => {
  const grpId = getGroupId();
  window.location.href = grpId
    ? `t.category.html?grpId=${grpId}`
    : "t.category.html";
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
window.HiveLoading?.startDataLoad("Loading colony...");
loadGroupFromDB().finally(() => window.HiveLoading?.finishDataLoad());
loadSidebarProfile();
