const supa   = () => window.hiveSupabase;
const grpId  = () => new URLSearchParams(window.location.search).get("grpId") || sessionStorage.getItem("hive_grpId");
const projId = () => new URLSearchParams(window.location.search).get("projId") || sessionStorage.getItem("hive_selected_project");

const submissionList      = document.querySelector("#submissionList");
const leaderList          = document.querySelector("#leaderList");
const teacherList         = document.querySelector("#teacherList");
const submittedSectionTitle = document.querySelector("#submittedSectionTitle");
const pendingCount        = document.querySelector("#pendingCount");
const confirmedCount      = document.querySelector("#confirmedCount");
const approvedCount       = document.querySelector("#approvedCount");
const peerCountText       = document.querySelector("#peerCountText");
const peerToggleBtn       = document.querySelector("#peerToggleBtn");
const peerModalOverlay    = document.querySelector("#peerModalOverlay");
const peerCloseBtn        = document.querySelector("#peerCloseBtn");
const peerSaveBtn         = document.querySelector("#peerSaveBtn");
const peerChecklist       = document.querySelector("#peerChecklist");
const evalHistoryBtn      = document.querySelector("#evalHistoryBtn");
const evalHistoryOverlay  = document.querySelector("#evalHistoryOverlay");
const evalHistoryList     = document.querySelector("#evalHistoryList");
const evalHistoryCloseBtn = document.querySelector("#evalHistoryCloseBtn");
const backToProjectBtn    = document.querySelector("#backToProjectBtn");
const groupInfoLink       = document.querySelector("#groupInfoLink");
const projectBreakdownLink= document.querySelector("#projectBreakdownLink");

const mode = new URLSearchParams(window.location.search).get("mode") || "member";
document.body.dataset.mode = mode;
if (submittedSectionTitle && mode === "teacher") {
    submittedSectionTitle.textContent = "Proofs for Review";
}

const _gid = grpId();
const _grpQuery = _gid ? `?grpId=${_gid}` : "";

if (mode === "leader") {
    if (backToProjectBtn)    backToProjectBtn.href    = `../leader/s.leaderprojectbreakdown.html`;
    if (projectBreakdownLink)projectBreakdownLink.href= `../leader/s.leaderprojectbreakdown.html`;
    if (groupInfoLink)       groupInfoLink.href       = `../leader/s.leadergrpviewing.html${_grpQuery}`;
} else if (mode === "teacher") {
    if (backToProjectBtn)    backToProjectBtn.href    = `../../teacher/t.projectbreakdown.html`;
    if (projectBreakdownLink)projectBreakdownLink.href= `../../teacher/t.projectbreakdown.html`;
    if (groupInfoLink)       groupInfoLink.href       = `../../teacher/t.grpviewing.html${_grpQuery}`;
} else {
    if (backToProjectBtn)    backToProjectBtn.href    = `../member/s.memberprojectbreakdown.html`;
    if (projectBreakdownLink)projectBreakdownLink.href= `../member/s.memberprojectbreakdown.html`;
    if (groupInfoLink)       groupInfoLink.href       = `../member/s.membergrpviewing.html${_grpQuery}`;
}

const escapeHTML = (value) => String(value || "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

const STATUS_LABELS = {
    PENDING: "PENDING",
    LEADER_CONFIRMED: "LEADER CONFIRMED",
    APPROVED: "APPROVED",
    NEEDS_REVISION: "NEEDS REVISION",
    REJECTED: "REJECTED",
};

const DB_TO_DISPLAY_STATUS = {
    pending:          "PENDING",
    approved:         "LEADER_CONFIRMED",
    teacher_approved: "APPROVED",
    needs_revision:   "NEEDS_REVISION",
    rejected:         "REJECTED",
};

const DISPLAY_TO_DB_STATUS = Object.fromEntries(
    Object.entries(DB_TO_DISPLAY_STATUS).map(([k,v]) => [v,k])
);

const getStatusClass = (status) => `status-${String(status||"PENDING").toLowerCase().replaceAll("_","-")}`;

const intervalToMs = (interval) => {
    if (!interval) return 0;
    const match = interval.match(/(?:(\d+) days? ?)?(\d+):(\d+):(\d+)/);
    if (match) {
        const d = parseInt(match[1] || 0), h = parseInt(match[2]), m = parseInt(match[3]), s = parseInt(match[4]);
        return ((d * 86400) + (h * 3600) + (m * 60) + s) * 1000;
    }
    const sec = interval.match(/(\d+(?:\.\d+)?)\s*seconds?/);
    if (sec) return Math.floor(parseFloat(sec[1]) * 1000);
    return 0;
};

const formatTimeSpan = (interval) => {
    const ms = intervalToMs(interval);
    if (!ms) return "0h 0m 0s";
    const totalSec = Math.floor(ms / 1000);
    return `${Math.floor(totalSec / 3600)}h ${Math.floor((totalSec % 3600) / 60)}m ${totalSec % 60}s`;
};

const calculateContribution = (item) => {
    const completionRate  = item.totalTasks > 0 ? (item.completedTasks / item.totalTasks) * 100 : 0;
    const leaderValidation= item.leaderConfirmed ? 100 : 0;
    const proofAttachment = item.proofLink ? 100 : 0;
    const teacherValid    = item.status === "APPROVED" ? 100 : 0;
    const score = (completionRate*0.50)+(leaderValidation*0.25)+(proofAttachment*0.15)+(teacherValid*0.10);
    let classification = "Low Contributor";
    if (score >= 80) classification = "Active Contributor";
    else if (score >= 50) classification = "Moderate Contributor";
    return { score: Math.round(score), classification };
};

// ── Load contributions from DB ────────────────────────────────────────────
let contributions = [];
let currentUserId = null;

const loadContributions = async () => {
    const supabase = supa();
    if (!supabase) return;

    const gid = grpId();
    if (!gid) return;

    const { data: { user } } = await supabase.auth.getUser();
    currentUserId = user?.id || null;

    const { data: memberships } = await supabase
        .from("GROUPMEMBER")
        .select("grpmemId, userId, USER(userDisplayName)")
        .eq("grpId", Number(gid));

    if (!memberships?.length) { contributions = []; return; }

    const grpmemIds = memberships.map(m => m.grpmemId);
    const memberNameMap = Object.fromEntries(memberships.map(m => [m.grpmemId, m.USER?.userDisplayName || "Unknown"]));
    const memberGrpmemMap = Object.fromEntries(memberships.map(m => [m.userId, m.grpmemId]));

    // Filter submissions to only tasks belonging to the current project
    const pid = projId();
    let subsQuery = supabase
        .from("SUBMISSION")
        .select("subId, taskId, grpmemId, proofLink, submittedAt, status, leaderNote, teacherNote, isRevised, TASK(taskName, taskDesc, projId, taskSpan, statId)")
        .in("grpmemId", grpmemIds)
        .order("submittedAt", { ascending: false });

    const { data: subs } = await subsQuery;

    // Only show submissions for tasks that are verifying (4) or finished (5)
    const SHOW_STAT_IDS = new Set([4, 5]);

    const allSubs = (subs || []).filter(s => {
        if (pid && String(s.TASK?.projId) !== String(pid)) return false;
        if (!SHOW_STAT_IDS.has(s.TASK?.statId)) return false;
        return true;
    });

    // Keep only the latest submission per (taskId, grpmemId) — revisions create new rows
    const seen = new Set();
    const filteredSubs = allSubs.filter(sub => {
        const key = `${sub.taskId}-${sub.grpmemId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Count assigned and completed tasks per grpmemId
    const taskCounts = {};
    await Promise.all(grpmemIds.map(async (gm) => {
        const { count: total } = await supabase
            .from("TASKASSIGNMENT").select("*",{count:"exact",head:true}).eq("grpmemId", gm);
        const { data: assigned } = await supabase
            .from("TASKASSIGNMENT").select("taskId").eq("grpmemId", gm);
        let completed = 0;
        if (assigned?.length) {
            const ids = assigned.map(a => a.taskId);
            const { count } = await supabase
                .from("TASK").select("*",{count:"exact",head:true}).in("taskId", ids).eq("statId", 5);
            completed = count || 0;
        }
        taskCounts[gm] = { total: total || 0, completed };
    }));

    // Count peer confirmations per grpmemId scoped to this project
    const peerEvalQuery = supabase
        .from("PEEREVAL")
        .select("evaluatedGrpmemId")
        .in("evaluatedGrpmemId", grpmemIds)
        .eq("confirmed", true);

    const { data: peerEvals } = pid
        ? await peerEvalQuery.eq("projId", Number(pid))
        : await peerEvalQuery.is("taskId", null);

    const peerYesMap = {};
    (peerEvals || []).forEach(pe => {
        peerYesMap[pe.evaluatedGrpmemId] = (peerYesMap[pe.evaluatedGrpmemId] || 0) + 1;
    });

    contributions = filteredSubs.map(sub => ({
        id:             sub.subId,
        _subId:         sub.subId,
        _grpmemId:      sub.grpmemId,
        _taskId:        sub.taskId,
        memberName:     memberNameMap[sub.grpmemId] || "Unknown",
        taskTitle:      (sub.TASK?.taskName || "Unknown Task") + (sub.isRevised ? " (Revised)" : ""),
        taskSpan:       sub.TASK?.taskSpan || null,
        taskDescription:sub.TASK?.taskDesc || "",
        proofLink:      sub.proofLink || "",
        memberRemarks:  "",
        leaderRemarks:  sub.leaderNote || "",
        teacherRemarks: sub.teacherNote || "",
        completedTasks: taskCounts[sub.grpmemId]?.completed || 0,
        totalTasks:     taskCounts[sub.grpmemId]?.total || 0,
        leaderConfirmed:sub.status === "approved" || sub.status === "teacher_approved",
        status:         DB_TO_DISPLAY_STATUS[sub.status] || "PENDING",
        peerYes:        peerYesMap[sub.grpmemId] || 0,
        peerTotal:      Math.max(memberships.length - 1, 0),
    }));

};

// ── Render ────────────────────────────────────────────────────────────────
const renderContributionCard = (item, options = {}) => {
    const score = calculateContribution(item);
    const remarksControls = options.controls ? `
        <div class="form-group">
            <label for="${options.type}Remarks${item.id}">${options.label}</label>
            <textarea id="${options.type}Remarks${item.id}" rows="3" data-remarks="${options.type}" data-id="${item.id}" placeholder="${options.placeholder}">${escapeHTML(options.value||"")}</textarea>
        </div>
        <div class="card-actions">${options.buttons||""}</div>
    ` : "";

    return `
        <article class="validation-card" data-id="${item.id}">
            <div class="card-topline">
                <div>
                    <h3>${escapeHTML(item.taskTitle)}</h3>
                    <p class="muted">${escapeHTML(item.memberName)}</p>
                </div>
                <span class="status-pill ${getStatusClass(item.status)}">${STATUS_LABELS[item.status]||item.status}</span>
            </div>
            <p>${escapeHTML(item.taskDescription)}</p>
            <p><strong>Proof:</strong> <a class="proof-link" href="${escapeHTML(item.proofLink)}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.proofLink||"None")}</a></p>
            <div class="meta-grid">
                <p><strong>Leader remarks:</strong> ${escapeHTML(item.leaderRemarks||"No remarks yet")}</p>
                <p><strong>Teacher remarks:</strong> ${escapeHTML(item.teacherRemarks||"No remarks yet")}</p>
                <p><strong>Completed tasks:</strong> ${item.completedTasks} / ${item.totalTasks}</p>
                <p><strong>Peer evidence:</strong> ${item.peerYes} of ${item.peerTotal} peers confirmed</p>
                <p><strong>Time spent:</strong> ${formatTimeSpan(item.taskSpan)}</p>
            </div>
            <div class="score-panel">
                <div class="score-box"><span>Contribution Score</span><strong>${score.score}%</strong></div>
                <div class="score-box"><span>Status</span><strong>${score.classification}</strong></div>
            </div>
            ${remarksControls}
        </article>
    `;
};

const renderSummary = () => {
    if (pendingCount)   pendingCount.textContent   = contributions.filter(i => i.status === "PENDING").length;
    if (confirmedCount) confirmedCount.textContent = contributions.filter(i => i.status === "LEADER_CONFIRMED").length;
    if (approvedCount)  approvedCount.textContent  = contributions.filter(i => i.status === "APPROVED").length;
};

const renderSubmissions = () => {
    if (!submissionList) return;
    // Teacher sees all (including already-approved) in Proofs for Review
    // Leader/member see all their submissions
    submissionList.innerHTML = contributions.length
        ? contributions.map(i => renderContributionCard(i)).join("")
        : `<p class="muted">No submissions yet.</p>`;
};

const renderLeaderValidation = () => {
    if (!leaderList) return;
    if (mode !== "leader") { leaderList.innerHTML = ""; return; }
    // Only show submissions the leader hasn't acted on yet
    const pending = contributions.filter(i => i.status === "PENDING");
    leaderList.innerHTML = pending.map(i => renderContributionCard(i, {
        controls: true, type: "leader", label: "Leader remarks",
        placeholder: "Add leader validation notes", value: i.leaderRemarks,
        buttons: `
            <button class="modal-btn post-btn" type="button" data-action="leader-confirm" data-id="${i.id}">Confirm Contribution</button>
            <button class="modal-btn danger-btn" type="button" data-action="leader-reject" data-id="${i.id}">Reject</button>
        `,
    })).join("") || `<p class="muted">No pending submissions to validate.</p>`;
};

const renderTeacherReview = () => {
    if (!teacherList) return;
    if (mode !== "teacher") { teacherList.innerHTML = ""; return; }
    // Swarm validation requires leader confirmation before supervisor review.
    const toReview = contributions.filter(i => i.status === "LEADER_CONFIRMED");
    teacherList.innerHTML = toReview.map(i => renderContributionCard(i, {
        controls: true, type: "teacher", label: "Teacher remarks",
        placeholder: "Add teacher review notes", value: i.teacherRemarks,
        buttons: `
            <button class="modal-btn post-btn" type="button" data-action="teacher-approve" data-id="${i.id}">Approve</button>
            <button class="modal-btn danger-btn" type="button" data-action="teacher-reject" data-id="${i.id}">Reject</button>
        `,
    })).join("") || `<p class="muted">No submissions to review.</p>`;
};

const renderAll = () => {
    renderSummary();
    renderSubmissions();
    renderLeaderValidation();
    renderTeacherReview();
};

const findContribution = (id) => contributions.find(i => i.id === Number(id));

const syncRemarksBeforeAction = (container) => {
    container.querySelectorAll("textarea[data-remarks]").forEach(ta => {
        const item = findContribution(ta.dataset.id);
        if (!item) return;
        if (ta.dataset.remarks === "leader")  item.leaderRemarks  = ta.value.trim();
        if (ta.dataset.remarks === "teacher") item.teacherRemarks = ta.value.trim();
    });
};


// ── Leader / Teacher action buttons ──────────────────────────────────────
document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const item = findContribution(button.dataset.id);
    if (!item) return;

    syncRemarksBeforeAction(document);
    const supabase = supa();
    if (!supabase) return;

    if (button.dataset.action === "leader-confirm") {
        await supabase.from("SUBMISSION").update({
            status: "approved",
            leaderNote: item.leaderRemarks || null
        }).eq("subId", item._subId);
        if (item._taskId) {
            await supabase.from("TASK").update({
                statId: 5,
                taskAcmD: null
            }).eq("taskId", item._taskId);
        }
        if (item._grpmemId) {
            const { data: member } = await supabase.from("GROUPMEMBER").select("userId").eq("grpmemId", item._grpmemId).maybeSingle();
            if (member?.userId) {
                await supabase.from("NOTIFICATION").insert({
                    notiTitle: "Leader Validation Complete",
                    notiBody: `Your task "${item.taskTitle}" was verified by the Swarm Leader and marked finished.`,
                    "notiDate&Time": new Date().toISOString(),
                    notiIsRead: false,
                    userId: member.userId,
                    grpId: item.grpId || null
                });
            }
        }
        await loadContributions(); renderAll();

    } else if (button.dataset.action === "leader-reject") {
        // Open rejection options modal instead of immediate reject
        _rejectItem = item;
        await openRejectOptions();

    } else if (button.dataset.action === "teacher-approve") {
        await supabase.from("SUBMISSION").update({
            status: "teacher_approved",
            teacherNote: item.teacherRemarks || null
        }).eq("subId", item._subId);
        if (item._taskId) {
            await supabase.from("TASK").update({
                statId: 5,
                taskAcmD: null,
                teacherApproved: true
            }).eq("taskId", item._taskId);
        }
        if (item._grpmemId) {
            const { data: member } = await supabase.from("GROUPMEMBER").select("userId").eq("grpmemId", item._grpmemId).maybeSingle();
            if (member?.userId) {
                await supabase.from("NOTIFICATION").insert({
                    notiTitle: "Contribution Approved by Teacher",
                    notiBody: `Your task "${item.taskTitle}" has been approved by the teacher.`,
                    "notiDate&Time": new Date().toISOString(),
                    notiIsRead: false,
                    userId: member.userId,
                    grpId: item.grpId || null
                });
            }
        }
        await loadContributions(); renderAll();

    } else if (button.dataset.action === "teacher-reject") {
        _rejectItem = item;
        await openRejectOptions();
    }
});

// ── Reject options modal ─────────────────────────────────────────────────
let _rejectItem = null;

const rejectOptionsOverlay  = document.querySelector("#rejectOptionsOverlay");
const rejectMarkMissingBtn  = document.querySelector("#rejectMarkMissingBtn");
const rejectRevisionBtn     = document.querySelector("#rejectRevisionBtn");
const revisionDateGroup     = document.querySelector("#revisionDateGroup");
const revisionDateInput     = document.querySelector("#revisionDateInput");
const revisionTimeInput     = document.querySelector("#revisionTimeInput");
const confirmRevisionBtn    = document.querySelector("#confirmRevisionBtn");
const cancelRejectOptionsBtn= document.querySelector("#cancelRejectOptionsBtn");

const openRejectOptions = async () => {
    if (!rejectOptionsOverlay) return;
    // Always reset state so previous interactions don't carry over
    if (revisionDateGroup)  revisionDateGroup.style.display = "none";
    if (rejectRevisionBtn)  rejectRevisionBtn.style.display = "";
    if (rejectMarkMissingBtn) rejectMarkMissingBtn.style.display = "";
    if (revisionDateInput) {
        revisionDateInput.value = "";
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        revisionDateInput.min = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,"0")}-${String(tomorrow.getDate()).padStart(2,"0")}`;
        // Cap at project due date
        const pid = projId();
        if (pid) {
            const { data } = await supa().from("PROJECT").select("projDueD").eq("projId", Number(pid)).maybeSingle();
            if (data?.projDueD) revisionDateInput.max = data.projDueD;
            else revisionDateInput.removeAttribute("max");
        } else {
            revisionDateInput.removeAttribute("max");
        }
    }
    if (revisionTimeInput) revisionTimeInput.value = "";
    rejectOptionsOverlay.classList.add("open");
    rejectOptionsOverlay.setAttribute("aria-hidden", "false");
};

const closeRejectOptions = () => {
    rejectOptionsOverlay?.classList.remove("open");
    rejectOptionsOverlay?.setAttribute("aria-hidden", "true");
    _rejectItem = null;
};

if (cancelRejectOptionsBtn) cancelRejectOptionsBtn.addEventListener("click", closeRejectOptions);
if (rejectOptionsOverlay)   rejectOptionsOverlay.addEventListener("click", e => { if (e.target === rejectOptionsOverlay) closeRejectOptions(); });

if (rejectMarkMissingBtn) {
    rejectMarkMissingBtn.addEventListener("click", async () => {
        if (!_rejectItem) return;
        const item = _rejectItem;
        closeRejectOptions();
        const supabase = supa();
        const _rmNoteField = mode === "teacher" ? "teacherNote" : "leaderNote";
        const _rmNoteValue = mode === "teacher" ? (item.teacherRemarks || null) : (item.leaderRemarks || null);
        await supabase.from("SUBMISSION").update({
            status: "rejected",
            [_rmNoteField]: _rmNoteValue
        }).eq("subId", item._subId);
        // Mark task as missing (statId 6)
        if (item._taskId) {
            await supabase.from("TASK").update({ statId: 6 }).eq("taskId", item._taskId);
        }
        // Notify member
        if (item._grpmemId) {
            const { data: member } = await supabase.from("GROUPMEMBER").select("userId").eq("grpmemId", item._grpmemId).maybeSingle();
            if (member?.userId) {
                await supabase.from("NOTIFICATION").insert({
                    notiTitle: mode === "teacher" ? "Contribution Rejected by Teacher" : "Contribution Rejected",
                    notiBody: `Your task "${item.taskTitle}" was rejected and marked as Missing.`,
                    "notiDate&Time": new Date().toISOString(),
                    notiIsRead: false,
                    userId: member.userId,
                    grpId: item.grpId || null
                });
            }
        }
        await loadContributions(); renderAll();
    });
}

if (rejectRevisionBtn) {
    rejectRevisionBtn.addEventListener("click", () => {
        if (revisionDateGroup) revisionDateGroup.style.display = "block";
        rejectRevisionBtn.style.display = "none";
        rejectMarkMissingBtn.style.display = "none";
    });
}

if (confirmRevisionBtn) {
    confirmRevisionBtn.addEventListener("click", async () => {
        if (!_rejectItem) return;
        const newDueDate = revisionDateInput?.value;
        const newDueTime = revisionTimeInput?.value || "23:59";
        if (!newDueDate) { showAlert("Please select a due date.", { title: "Missing Date" }); return; }
        if (!revisionTimeInput?.value) { showAlert("Please select a due time.", { title: "Missing Time" }); return; }

        const item = _rejectItem;
        closeRejectOptions();
        const supabase = supa();

        const _rvNoteField = mode === "teacher" ? "teacherNote" : "leaderNote";
        const _rvNoteValue = mode === "teacher" ? (item.teacherRemarks || null) : (item.leaderRemarks || null);
        await supabase.from("SUBMISSION").update({
            status: "needs_revision",
            [_rvNoteField]: _rvNoteValue
        }).eq("subId", item._subId);

        // Return the task to pending work and preserve the revision label separately.
        if (item._taskId) {
            const { error: taskErr } = await supabase.from("TASK").update({
            statId: 1,
                taskDueD: `${newDueDate}T${newDueTime}:00`,
            taskAcmD: null,
                wasRevising: true
            }).eq("taskId", item._taskId);
            if (taskErr) {
                showAlert("Failed to update task status: " + taskErr.message, { title: "Error" });
                return;
            }
        }

        // Notify member with new due date
        if (item._grpmemId) {
            const { data: member } = await supabase.from("GROUPMEMBER").select("userId").eq("grpmemId", item._grpmemId).maybeSingle();
            if (member?.userId) {
                const formatted = new Date(`${newDueDate}T${newDueTime}:00`).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
                await supabase.from("NOTIFICATION").insert({
                    notiTitle: "Task Needs Revision",
                    notiBody: `Your task "${item.taskTitle}" needs revision. New due date: ${formatted}.`,
                    "notiDate&Time": new Date().toISOString(),
                    notiIsRead: false,
                    userId: member.userId,
                    grpId: item.grpId || null
                });
            }
        }
        await loadContributions(); renderAll();
    });
}

// Show Evaluation History button for leader and teacher
if (evalHistoryBtn) {
    if (mode === "leader" || mode === "teacher") {
        evalHistoryBtn.style.display = "block";
    }
}

// ── Evaluation History Modal ──────────────────────────────────────────────
const closeEvalHistory = () => {
    evalHistoryOverlay?.classList.remove("open");
    evalHistoryOverlay?.setAttribute("aria-hidden", "true");
};

const openEvalHistory = async () => {
    if (!evalHistoryOverlay) return;
    const supabase = supa();
    const gid = grpId();
    const pid = projId();
    if (!supabase || !gid || !pid) return;

    // Load all group members for evaluated member name lookup
    const { data: members } = await supabase
        .from("GROUPMEMBER")
        .select("grpmemId, userId, USER(userDisplayName)")
        .eq("grpId", Number(gid));

    const memberNames = Object.fromEntries(
        (members || []).map(m => [m.grpmemId, m.USER?.userDisplayName || "Unknown"])
    );
    
    const userNames = Object.fromEntries(
        (members || []).map(m => [m.userId, m.USER?.userDisplayName || "Unknown"])
    );

    // Load all peer evaluations for this project
    const { data: evals } = await supabase
        .from("PEEREVAL")
        .select("evaluatedGrpmemId, evaluatorId, evalAt, evalRemarks")
        .eq("projId", Number(pid))
        .eq("confirmed", true)
        .order("evalAt", { ascending: false });

    if (evalHistoryList) {
        if (!evals || evals.length === 0) {
            evalHistoryList.innerHTML = "<p class='muted'>No peer evaluations yet.</p>";
        } else {
            // Group by evaluated member
            const grouped = {};
            evals.forEach(e => {
                if (!grouped[e.evaluatedGrpmemId]) {
                    grouped[e.evaluatedGrpmemId] = [];
                }
                grouped[e.evaluatedGrpmemId].push(e);
            });

            // Build HTML
            evalHistoryList.innerHTML = Object.entries(grouped).map(([grpmemId, evaluations]) => `
                <div style="margin-bottom: 20px;">
                    <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 900;">${escapeHTML(memberNames[grpmemId] || "Unknown")}</h3>
                    ${evaluations.map(e => `
                        <div style="margin-left: 12px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #eee;">
                            <p style="margin: 0 0 4px 0; font-weight: 700; font-size: 14px;">
                                ${escapeHTML(userNames[e.evaluatorId] || "Unknown Evaluator")} 
                                <span style="font-weight: 400; color: #666;">- ${new Date(e.evalAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                            </p>
                            ${e.evalRemarks ? `<p style="margin: 0; font-size: 14px; font-style: italic; color: #333;">"${escapeHTML(e.evalRemarks)}"</p>` : "<p style='margin: 0; font-size: 14px; color: #999;'>No remarks</p>"}
                        </div>
                    `).join("")}
                </div>
            `).join("");
        }
    }

    evalHistoryOverlay?.classList.add("open");
    evalHistoryOverlay?.setAttribute("aria-hidden", "false");
};

if (evalHistoryBtn) evalHistoryBtn.addEventListener("click", openEvalHistory);
if (evalHistoryCloseBtn) evalHistoryCloseBtn.addEventListener("click", closeEvalHistory);
if (evalHistoryOverlay) evalHistoryOverlay.addEventListener("click", e => { if (e.target === evalHistoryOverlay) closeEvalHistory(); });

// ── Peer modal ────────────────────────────────────────────────────────────
const updatePeerVotesFromChecklist = () => {
    if (!peerChecklist) return;
    const checked = peerChecklist.querySelectorAll("input[type='checkbox']:checked").length;
    const total   = peerChecklist.querySelectorAll("input[type='checkbox']").length;
    if (peerCountText) peerCountText.textContent = `${checked} out of ${total} members confirmed`;
};

const closePeerModal = () => {
    peerModalOverlay?.classList.remove("open");
    peerModalOverlay?.setAttribute("aria-hidden", "true");
};

const openPeerModal = async () => {
    if (!peerModalOverlay) return;
    const supabase = supa();
    const gid = grpId();
    if (!supabase || !gid || !currentUserId) return;

    // Load group members excluding self (only roleId 1 and 2: members/leaders, not teachers)
    const { data: members } = await supabase
        .from("GROUPMEMBER")
        .select("grpmemId, userId, USER(userDisplayName)")
        .eq("grpId", Number(gid))
        .in("roleId", [1, 2]);

    const others = (members || []).filter(m => m.userId !== currentUserId);

    // Load current user's existing peer evals for this project
    const pid = projId();
    const existingEvalsQuery = supabase
        .from("PEEREVAL")
        .select("evaluatedGrpmemId, confirmed")
        .eq("evaluatorId", currentUserId);

    const { data: existingEvals } = pid
        ? await existingEvalsQuery.eq("projId", Number(pid))
        : await existingEvalsQuery.is("taskId", null);

    // Get members they've ALREADY confirmed (can't evaluate them again)
    const previouslyConfirmedSet = new Set(
        (existingEvals || []).filter(e => e.confirmed).map(e => e.evaluatedGrpmemId)
    );

    if (peerChecklist) {
        peerChecklist.innerHTML = others.length
            ? others.map(m => {
                const isDisabled = previouslyConfirmedSet.has(m.grpmemId);
                return `
                <label class="peer-check-item" ${isDisabled ? 'style="opacity:0.5;cursor:not-allowed;"' : ''}>
                    <input type="checkbox" name="peerContributor"
                        value="${m.grpmemId}"
                        ${isDisabled ? "disabled" : ""}>
                    <span>${escapeHTML(m.USER?.userDisplayName || "Member")}${isDisabled ? " (Already evaluated)" : ""}</span>
                </label>`}).join("")
            : "<p class='muted'>No other members in this group.</p>";

        if (peerChecklist.querySelectorAll("input:not(:disabled)").length > 0) {
            peerChecklist.querySelectorAll("input:not(:disabled)").forEach(cb =>
                cb.addEventListener("change", updatePeerVotesFromChecklist)
            );
        }
    }

    if (peerSaveBtn) {
        peerSaveBtn.disabled = false;
        peerSaveBtn.title = "";
    }

    if (peerCountText) {
        updatePeerVotesFromChecklist();
    }

    peerModalOverlay.classList.add("open");
    peerModalOverlay.setAttribute("aria-hidden", "false");
};

if (peerToggleBtn)    peerToggleBtn.addEventListener("click", openPeerModal);
if (peerCloseBtn)     peerCloseBtn.addEventListener("click", closePeerModal);
if (peerModalOverlay) peerModalOverlay.addEventListener("click", e => { if (e.target === peerModalOverlay) closePeerModal(); });

if (peerSaveBtn) {
    peerSaveBtn.addEventListener("click", async () => {
        const supabase = supa();
        if (!supabase || !currentUserId) return;

        const checkboxes = Array.from(peerChecklist?.querySelectorAll("input[type='checkbox']") || []);
        const peerCommentInput = document.querySelector("#peerCommentInput");
        const anyChecked = checkboxes.some(cb => cb.checked);
        const remarksText = (peerCommentInput?.value || "").trim();

        if (!anyChecked) {
            showAlert("Please select at least one member/leader.", { title: "No Members Selected" });
            return;
        }

        if (!remarksText) {
            showAlert("Please add remarks for your peer evaluation.", { title: "No Remarks" });
            return;
        }

        // Prevent double-submit
        peerSaveBtn.disabled = true;
        try {
            const pid = projId();

            // Only save evaluations for currently selected members
            const selectedGrpmemIds = checkboxes
                .filter(cb => cb.checked)
                .map(cb => Number(cb.value));

            // Build rows: confirmed for selected, not-confirmed for unselected enabled ones
            const rowsToInsert = checkboxes.map(cb => ({
                taskId:             null,
                projId:             pid ? Number(pid) : null,
                evaluatedGrpmemId:  Number(cb.value),
                evaluatorId:        currentUserId,
                confirmed:          cb.checked,
                evalAt:             new Date().toISOString(),
                evalRemarks:        cb.checked ? remarksText : null
            }));

            // Delete previous evaluations for this project to avoid duplicates
            const deleteQuery = supabase
                .from("PEEREVAL")
                .delete()
                .eq("evaluatorId", currentUserId);

            await (pid ? deleteQuery.eq("projId", Number(pid)) : deleteQuery.is("projId", null));

            // Insert new evaluations
            await supabase.from("PEEREVAL").insert(rowsToInsert);
        } finally {
            peerSaveBtn.disabled = false;
        }

        closePeerModal();
        // Clear remarks for next evaluation
        if (peerCommentInput) peerCommentInput.value = "";
        await loadContributions();
        renderAll();
    });
}

// ── Init ──────────────────────────────────────────────────────────────────
(async () => {
    await loadContributions();
    renderAll();
})();
