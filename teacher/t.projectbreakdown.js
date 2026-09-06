const topBackBtn = document.querySelector("#topBackBtn");
const backToCategoriesBtn = document.querySelector("#backToCategoriesBtn");
const groupInfoTab = document.querySelector("#groupInfoTab");
const openPostTaskModalBtn = document.querySelector("#openPostTaskModalBtn");
const inlinePostTaskBtn = document.querySelector("#inlinePostTaskBtn");
const projectBackLink = document.querySelector("#projectBackLink");
const projectTabs = Array.from(document.querySelectorAll(".project-tab"));
const projectTabPanels = Array.from(document.querySelectorAll(".project-tab-panel"));
const postTaskModalOverlay = document.querySelector("#postTaskModalOverlay");
const discardPostTaskBtn = document.querySelector("#discardPostTaskBtn");
const postTaskForm = document.querySelector("#postTaskForm");
const postTaskSubmitBtn = postTaskForm ? postTaskForm.querySelector("button[type='submit']") : null;
const taskNameInput = postTaskForm ? postTaskForm.querySelector("#taskNameInput") : null;
const dueDateInput = postTaskForm ? postTaskForm.querySelector("#dueDateInput") : null;
const dueTimeInput = postTaskForm ? postTaskForm.querySelector("#dueTimeInput") : null;
const taskDescriptionInput = postTaskForm ? postTaskForm.querySelector("#taskDescriptionInput") : null;
const taskResourcesInput = postTaskForm ? postTaskForm.querySelector("#taskResourcesInput") : null;
const verifyChoiceOverlay = document.querySelector("#verifyChoiceOverlay");
const verifyFinishBtn = document.querySelector("#verifyFinishBtn");
const verifyReviseBtn = document.querySelector("#verifyReviseBtn");
const verifyCloseBtn = document.querySelector("#verifyCloseBtn");
const verifyTaskName = document.querySelector("#verifyTaskName");
const verifyAssigneeCount = document.querySelector("#verifyAssigneeCount");
const verifyAssignees = document.querySelector("#verifyAssignees");
const verifyAssigneeInfo = document.querySelector("#verifyAssigneeInfo");
const verifyActiveTime = document.querySelector("#verifyActiveTime");
const verifyResourceLink = document.querySelector("#verifyResourceLink");
const verifyCopyResourceBtn = document.querySelector("#verifyCopyResourceBtn");
const verifySubmittedAt = document.querySelector("#verifySubmittedAt");
const submissionFilterButtons = Array.from(document.querySelectorAll("[data-submission-filter]"));
const submissionsList = document.querySelector("#submissionsList");
const leaderVerificationNotice = document.querySelector("#leaderVerificationNotice");
const leaderVerificationTasks = document.querySelector("#leaderVerificationTasks");
const pauseFinishChoiceOverlay = document.querySelector("#pauseFinishChoiceOverlay");
const pauseFinishPauseBtn = document.querySelector("#pauseFinishPauseBtn");
const pauseFinishFinishBtn = document.querySelector("#pauseFinishFinishBtn");
const pauseFinishCloseBtn = document.querySelector("#pauseFinishCloseBtn");
const leaderActiveChoiceOverlay = document.querySelector("#leaderActiveChoiceOverlay");
const leaderActivePauseBtn = document.querySelector("#leaderActivePauseBtn");
const leaderActiveFinishBtn = document.querySelector("#leaderActiveFinishBtn");
const leaderActiveCloseBtn = document.querySelector("#leaderActiveCloseBtn");
const taskSettingsOverlay = document.querySelector("#taskSettingsOverlay");
const openEditTaskInfoBtn = document.querySelector("#openEditTaskInfoBtn");
const openManualStatusBtn = document.querySelector("#openManualStatusBtn");
const openRemoveTaskConfirmBtn = document.querySelector("#openRemoveTaskConfirmBtn");
const discardTaskSettingsBtn = document.querySelector("#discardTaskSettingsBtn");
const editTaskInfoOverlay = document.querySelector("#editTaskInfoOverlay");
const editTaskInfoForm = document.querySelector("#editTaskInfoForm");
const discardEditTaskInfoBtn = document.querySelector("#discardEditTaskInfoBtn");
const saveEditTaskInfoBtn = document.querySelector("#saveEditTaskInfoBtn");
const editTaskNameInput = editTaskInfoForm ? editTaskInfoForm.querySelector("#editTaskNameInput") : null;
const editTaskDescriptionInput = editTaskInfoForm ? editTaskInfoForm.querySelector("#editTaskDescriptionInput") : null;
const editTaskResourcesInput = editTaskInfoForm ? editTaskInfoForm.querySelector("#editTaskResourcesInput") : null;
const editDueDateInput = editTaskInfoForm ? editTaskInfoForm.querySelector("#editDueDateInput") : null;
const editDueTimeInput = editTaskInfoForm ? editTaskInfoForm.querySelector("#editDueTimeInput") : null;
const manualStatusOverlay = document.querySelector("#manualStatusOverlay");
const manualStatusButtons = Array.from(document.querySelectorAll("[data-manual-status]"));
const discardManualStatusBtn = document.querySelector("#discardManualStatusBtn");
const removeTaskConfirmOverlay = document.querySelector("#removeTaskConfirmOverlay");
const confirmRemoveTaskBtn = document.querySelector("#confirmRemoveTaskBtn");
const discardRemoveTaskBtn = document.querySelector("#discardRemoveTaskBtn");
const taskDetailsOverlay = document.querySelector("#taskDetailsOverlay");
const closeTaskDetailsBtn = document.querySelector("#closeTaskDetailsBtn");
const detailTaskName = document.querySelector("#detailTaskName");
const detailTaskDescription = document.querySelector("#detailTaskDescription");
const detailTaskResources = document.querySelector("#detailTaskResources");
const detailTaskAssignees = document.querySelector("#detailTaskAssignees");
const detailTaskDueDate = document.querySelector("#detailTaskDueDate");
const detailTaskDueTime = document.querySelector("#detailTaskDueTime");
const detailTaskStatus = document.querySelector("#detailTaskStatus");
const detailTaskTimeActive = document.querySelector("#detailTaskTimeActive");

let activeTaskIndex = null;
let currentUserId = null;

const participationSummaryTab = document.querySelector("#participationSummaryTab");
const reputationSummaryTab = document.querySelector("#reputationSummaryTab");
const participationSummaryPanel = document.querySelector("#participationSummaryPanel");
const reputationSummaryPanel = document.querySelector("#reputationSummaryPanel");
const participationSummaryList = document.querySelector("#participationSummaryList");
const reputationSummaryList = document.querySelector("#reputationSummaryList");

const STAT_ID = { inactive:1, active:2, pause:3, verifying:4, finished:5, missing:6 };
const STAT_SLUG = { 1:"inactive", 2:"active", 3:"pause", 4:"verifying", 5:"finished", 6:"missing", 7:"inactive" };
const STATUS_TEXT = { inactive:"Not Active", active:"Active", pause:"On Break", verifying:"Verifying", finished:"Finished", missing:"Missing" };

const isTerminal = (s) => s === "finished" || s === "missing";
const isPastDue  = (t) => !(!t.dueDate || !t.dueTime) && Date.now() > new Date(`${t.dueDate}T${t.dueTime}`).getTime();
const supa       = () => window.hiveSupabase;
const getValidNumericId = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0 ? String(numericValue) : null;
};
const getProjId  = () => getValidNumericId(new URLSearchParams(window.location.search).get("projId")) || getValidNumericId(sessionStorage.getItem("hive_selected_project"));
const getGrpId   = () => getValidNumericId(new URLSearchParams(window.location.search).get("grpId")) || getValidNumericId(sessionStorage.getItem("hive_grpId"));
const teacherSidebarRoutes = { "../s.dashb.html": "t.dashb.html", "../s.team.html": "t.team.html", "../s.tasklist.html": "t.tasklist.html", "../s.notification.html": "t.notification.html" };
document.querySelectorAll(".sidebar a[href]").forEach((link) => { const route = teacherSidebarRoutes[link.getAttribute("href")]; if (route) link.setAttribute("href", route); });
document.querySelectorAll('a[href$="s.team.html"], a[href$="../s.team.html"]').forEach((link) => { link.href = "t.team.html"; });
document.querySelectorAll('a[href$="s.notification.html"], a[href$="../s.notification.html"]').forEach((link) => { link.href = "t.notification.html"; });

const reputationLabel = (score) => {
    if (score === null) return "N/A";
    if (score >= 80) return "High Contributor";
    if (score >= 60) return "Moderate Contributor";
    if (score >= 40) return "Low Contributor";
    return "Needs Improvement";
};

const LATE_WEIGHT = 0.75;
const MISSED_WEIGHT = 0;

const calculateTaskPerformance = (tasks, assignments, submissions, memberId) => {
    const memberTaskIds = new Set((assignments || []).filter((assignment) => String(assignment.grpmemId) === String(memberId)).map((assignment) => String(assignment.taskId)));
    const memberTasks = (tasks || []).filter((task) => memberTaskIds.has(String(task.taskId)));
    let onTime = 0, late = 0, missed = 0, pending = 0;
    memberTasks.forEach((task) => {
        if (Number(task.statId) === STAT_ID.missing) { missed += 1; return; }
        if (Number(task.statId) !== STAT_ID.finished) { pending += 1; return; }
        const submission = (submissions || []).filter((item) => String(item.taskId) === String(task.taskId) && String(item.grpmemId) === String(memberId)).sort((first, second) => new Date(first.submittedAt) - new Date(second.submittedAt))[0];
        const dueAt = task.taskDueD ? new Date(task.taskDueD).getTime() : null;
        const submittedAt = submission?.submittedAt ? new Date(submission.submittedAt).getTime() : null;
        if (dueAt && submittedAt && submittedAt > dueAt) late += 1; else onTime += 1;
    });
    const total = onTime + late + missed + pending;
    return { onTime, late, missed, pending, total, score: total ? Math.round(((onTime + (late * LATE_WEIGHT) + (missed * MISSED_WEIGHT)) / total) * 100) : null };
};

const renderContributorRows = (list, contributors, useReputation) => {
    if (!list) return;
    const rankedContributors = useReputation
        ? [...contributors].sort((first, second) => second.score - first.score)
        : contributors;
    list.innerHTML = contributors.length
        ? rankedContributors.map((contributor, index) => `
            <div class="contributor-summary-row${useReputation ? " reputation-leaderboard-row" : ""}">
                <span class="contributor-summary-person">
                    <img class="contributor-summary-avatar" src="${contributor.avatarUrl}" alt="">
                    <span class="contributor-summary-name">${contributor.name.replace(/</g, "&lt;")}</span>
                </span>
                <span class="contributor-summary-score">${contributor.score === null ? "N/A" : (useReputation ? `${Math.round(contributor.score / 10)}/10` : `${contributor.score}%`)}</span>
                <span class="contributor-summary-reputation">${reputationLabel(contributor.score)}</span>
            </div>
        `).join("")
        : '<p class="contributor-summary-empty">No contributors found.</p>';
};

const loadContributorSummary = async () => {
    if (!participationSummaryList || !reputationSummaryList) return;
    const projectId = getProjId();
    const groupId = getGrpId();
    if (!projectId || !groupId) return;

    const { data: members } = await supa()
        .from("GROUPMEMBER")
        .select("grpmemId, USER(userDisplayName, avatarPath), ROLE(roleName)")
        .eq("grpId", Number(groupId));
    const { data: tasks } = await supa()
        .from("TASK")
        .select("taskId, taskDueD, statId, TASKASSIGNMENT(grpmemId)")
        .eq("projId", Number(projectId));
    const taskIds = (tasks || []).map((task) => task.taskId);
    const assignments = (tasks || []).flatMap((task) => (task.TASKASSIGNMENT || []).map((assignment) => ({ ...assignment, taskId: task.taskId })));
    const { data: submissions } = taskIds.length
        ? await supa().from("SUBMISSION").select("taskId, grpmemId, submittedAt, status").in("taskId", taskIds).eq("status", "approved")
        : { data: [] };
    const contributors = (members || [])
        .filter((member) => String(member.ROLE?.roleName || "").trim().toLowerCase() !== "teacher")
        .map((member) => {
        const performance = calculateTaskPerformance(tasks, assignments, submissions, member.grpmemId);
        return {
            name: member.USER?.userDisplayName || "Member",
            avatarUrl: member.USER?.avatarPath?.startsWith("http")
                ? member.USER.avatarPath
                : (member.USER?.avatarPath
                    ? supa().storage.from("profilePicture").getPublicUrl(member.USER.avatarPath).data?.publicUrl
                    : "../../assets/profile-placeholder.svg"),
            ...performance
        };
        });
    renderContributorRows(participationSummaryList, contributors, false);
    renderContributorRows(reputationSummaryList, contributors, true);
};

const setContributorSummaryTab = (showReputation) => {
    participationSummaryTab?.classList.toggle("active", !showReputation);
    reputationSummaryTab?.classList.toggle("active", showReputation);
    participationSummaryTab?.setAttribute("aria-selected", String(!showReputation));
    reputationSummaryTab?.setAttribute("aria-selected", String(showReputation));
    if (participationSummaryPanel) participationSummaryPanel.hidden = showReputation;
    if (reputationSummaryPanel) reputationSummaryPanel.hidden = !showReputation;
};

participationSummaryTab?.addEventListener("click", () => setContributorSummaryTab(false));
reputationSummaryTab?.addEventListener("click", () => setContributorSummaryTab(true));

const todayLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const loadProjectDueDate = async () => {
    const pid = getProjId();
    if (!pid) return null;
    const { data } = await supa().from("PROJECT").select("projDueD").eq("projId", Number(pid)).maybeSingle();
    return data?.projDueD || null;
};

const loadProjectDetails = async () => {
    const pid = getProjId();
    if (!pid) return null;
    const { data } = await supa().from("PROJECT").select("projName, projDesc, projCreatedAt, projDueD, projDueT").eq("projId", Number(pid)).maybeSingle();
    return data || null;
};

const loadSubmissions = async (filter = "evaluation") => {
    if (!submissionsList) return;
    submissionsList.innerHTML = `<div class="submissions-empty empty-state"><p>Loading submissions...</p></div>`;
    const projId = getProjId();
    if (!projId || !supa()) return;

    if (filter === "evaluation") {
        const { data: verifyingTasks } = await supa()
            .from("TASK")
            .select("taskId, TASKASSIGNMENT(grpmemId)")
            .eq("projId", Number(projId))
            .eq("statId", STAT_ID.verifying);
        const taskIds = (verifyingTasks || []).map((task) => task.taskId);
        const { data: existingSubmissions } = taskIds.length
            ? await supa().from("SUBMISSION").select("taskId, grpmemId").in("taskId", taskIds)
            : { data: [] };
        const existingKeys = new Set((existingSubmissions || []).map((submission) => `${submission.taskId}:${submission.grpmemId}`));
        await Promise.all((verifyingTasks || []).flatMap((task) => (task.TASKASSIGNMENT || []).map((assignment) => {
            const key = `${task.taskId}:${assignment.grpmemId}`;
            if (existingKeys.has(key)) return [];
            existingKeys.add(key);
            return supa().from("SUBMISSION").insert({ taskId: task.taskId, grpmemId: assignment.grpmemId, submittedAt: new Date().toISOString(), status: "pending", isRevised: false });
        })));
    }

    const { data, error } = await supa()
        .from("SUBMISSION")
        .select("subId, taskId, grpmemId, proofLink, submittedAt, status, leaderNote, TASK!inner(taskName, statId, projId, teacherApproved, TASKASSIGNMENT(GROUPMEMBER(USER(userDisplayName, avatarPath)))), GROUPMEMBER(USER(userDisplayName, avatarPath))")
        .eq("TASK.projId", Number(projId))
        .order("submittedAt", { ascending: false });

    if (error) {
        console.error("Failed to load submissions:", error);
        submissionsList.innerHTML = `<div class="submissions-empty empty-state"><h3>Unable to load submissions</h3><p>${error.message}</p></div>`;
        return;
    }

    const leaderVerifiedTaskIds = new Set((data || [])
        .filter((submission) => String(submission.status || "").toLowerCase() === "approved")
        .map((submission) => submission.taskId));
    const leaderVerificationTaskIds = new Set((data || [])
        .filter((submission) => Number(submission.TASK?.statId) === STAT_ID.verifying && !leaderVerifiedTaskIds.has(submission.taskId))
        .map((submission) => submission.taskId));
    if (leaderVerificationNotice) leaderVerificationNotice.textContent = `There are ${leaderVerificationTaskIds.size} tasks currently being verified by the Leader`;
    if (leaderVerificationTasks) {
        const taskNames = [...new Map((data || [])
            .filter((submission) => leaderVerificationTaskIds.has(submission.taskId))
            .map((submission) => [submission.taskId, submission.TASK?.taskName || "Unnamed task"])).values()];
        leaderVerificationTasks.textContent = taskNames.length ? `Tasks:\n${taskNames.map((name) => `- ${name}`).join("\n")}` : "No tasks are currently being verified.";
    }
    const submissions = (data || []).filter((submission) => {
        const status = String(submission.status || "").toLowerCase();
        const taskStatus = Number(submission.TASK?.statId);
        const isLeaderVerified = leaderVerifiedTaskIds.has(submission.taskId);
        const isFinished = taskStatus === STAT_ID.finished;
        const isForEvaluation = isLeaderVerified && status === "approved" && !submission.TASK?.teacherApproved;
        return filter === "finished" ? isFinished && Boolean(submission.TASK?.teacherApproved) : isForEvaluation;
    });

    const submissionsByTask = new Map();
    submissions.forEach((submission) => {
        const taskSubmissions = submissionsByTask.get(submission.taskId) || [];
        taskSubmissions.push(submission);
        submissionsByTask.set(submission.taskId, taskSubmissions);
    });
    const uniqueSubmissions = [...submissionsByTask.values()].map((taskSubmissions) => {
        const submission = taskSubmissions.find((item) => item.proofLink) || taskSubmissions[0];
        return { ...submission, taskSubmissions, leaderEvaluated: taskSubmissions.some((item) => String(item.status).toLowerCase() === "approved") };
    });

    if (!uniqueSubmissions.length) {
        submissionsList.innerHTML = `<div class="submissions-empty empty-state"><img class="empty-state-icon" src="../../assets/bee-flight.svg" alt=""><h3>No ${filter === "finished" ? "Finished" : "Submissions For Evaluation"}</h3><p>There are no submissions in this list.</p></div>`;
        return;
    }

    submissionsList.innerHTML = "";
    uniqueSubmissions.forEach((submission) => {
        const card = document.createElement("article");
        card.className = "submission-card";
        const submittedAt = submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "Date unavailable";
        const status = String(submission.status || "For evaluation");
        card.innerHTML = `
            <div class="submission-card-main">
                <h3></h3>
                <div class="submission-contributor"><span>Assigned to:</span><span class="submission-assignees"></span><button class="submission-info" type="button" title="View assigned members" aria-label="View assigned members">i</button></div>
                <p class="submission-date"></p>
            </div>
            <div class="submission-card-side">
                <span class="submission-status"></span>
                <a class="submission-proof" target="_blank" rel="noopener" hidden>View Proof</a>
            </div>`;
        card.querySelector("h3").textContent = submission.TASK?.taskName || "Unnamed task";
        const assignedNames = (submission.TASK?.TASKASSIGNMENT || [])
            .map((assignment) => assignment.GROUPMEMBER?.USER?.userDisplayName)
            .filter(Boolean);
        const fallbackName = submission.GROUPMEMBER?.USER?.userDisplayName || "Unknown contributor";
        const assignees = card.querySelector(".submission-assignees");
        const assignments = submission.TASK?.TASKASSIGNMENT || [];
        const visibleAssignments = assignments.length > 3 ? assignments.slice(0, 2) : assignments.slice(0, 3);
        const avatarMarkup = visibleAssignments.map((assignment) => {
            const user = assignment.GROUPMEMBER?.USER;
            const name = user?.userDisplayName || fallbackName;
            const avatar = user?.avatarPath?.startsWith("http")
                ? user.avatarPath
                : (user?.avatarPath ? supa().storage.from("profilePicture").getPublicUrl(user.avatarPath).data?.publicUrl : null);
            return `<span class="submission-avatar" title="${name}">${avatar ? `<img src="${avatar}" alt="${name}">` : name.charAt(0).toUpperCase()}</span>`;
        });
        if (assignments.length > 3) {
            avatarMarkup.push(`<span class="submission-avatar submission-avatar-overflow" title="${assignments.length - 2} more assignees">+${assignments.length - 2}</span>`);
        }
        assignees.innerHTML = avatarMarkup.join("") || `<span class="submission-assignee-name">${fallbackName}</span>`;
        card.querySelector(".submission-info").title = assignedNames.join(", ") || fallbackName;
        card.querySelector(".submission-date").textContent = submittedAt;
        const statusElement = card.querySelector(".submission-status");
        if (filter === "evaluation") {
            const verifyButton = document.createElement("button");
            verifyButton.type = "button";
            verifyButton.className = "submission-verify";
            verifyButton.textContent = "Verify";
            verifyButton.addEventListener("click", () => openVerifyChoice(
                submission.taskId,
                () => setSubmissionFilter("finished"),
                async () => {
                    await renderAllTasks();
                    await loadSubmissions("evaluation");
                }
            ));
            statusElement.replaceWith(verifyButton);
        } else {
            statusElement.textContent = submission.TASK?.teacherApproved ? "Finished" : status;
        }
        const proof = card.querySelector(".submission-proof");
        if (submission.proofLink) {
            proof.href = submission.proofLink;
            proof.hidden = false;
        }
        submissionsList.appendChild(card);
    });
};

const setSubmissionFilter = (filter) => {
    submissionFilterButtons.forEach((button) => button.classList.toggle("active", button.dataset.submissionFilter === filter));
    loadSubmissions(filter);
};

submissionFilterButtons.forEach((button) => button.addEventListener("click", () => setSubmissionFilter(button.dataset.submissionFilter)));

const applyStatusToBtn = (btn, status) => {
    btn.textContent = STATUS_TEXT[status] || status;
    btn.className = `task-status ${status}`;
    btn.disabled = isTerminal(status) || status === "verifying";
};

const loadTasks = async () => {
    const projId = getProjId(); // now stores progId — the PK of PROJECT
    if (!projId) return [];
    let { data, error } = await supa()
        .from("TASK")
        .select("taskId, taskName, taskDesc, taskDueD, taskIntensity, taskPrio, taskResource, taskSpan, taskAcmD, statId, wasRevising, teacherApproved, STATUS(statName), TASKASSIGNMENT(grpmemId, assignedAt, GROUPMEMBER(userId, USER(userDisplayName)))")
        .eq("projId", Number(projId));
    if (error || !data?.length) {
        console.error("Failed to load teacher project tasks with assignees:", error);
        const fallback = await supa()
            .from("TASK")
            .select("*");
        data = fallback.data;
        error = fallback.error;
        if (data) data = data.filter((task) => String(task.projId) === String(projId));
    }
    if (error || !data) {
        console.error("Failed to load teacher project tasks:", error);
        return [];
    }
    const tasks = data.map((t, originalIndex) => ({
        taskId: t.taskId,
        originalIndex,
        name: t.taskName,
        description: t.taskDesc || "",
        dueDate: t.taskDueD ? t.taskDueD.split("T")[0] : "",
        dueTime: t.taskDueD ? t.taskDueD.split("T")[1]?.slice(0,5) : "",
        intensity: t.taskIntensity || "Light",
        priority: t.taskPrio || "Low",
        resources: t.taskResource || "",
        // taskSpan is stored as a Postgres interval string e.g. "01:23:45" or null
        // Convert to milliseconds for JS arithmetic
        spanMs: intervalToMs(t.taskSpan),
        acmD: t.taskAcmD || null,
        wasRevising: Boolean(t.wasRevising) || Number(t.statId) === 7,
        teacherApproved: t.teacherApproved || false,
        status: STAT_SLUG[t.statId] || t.STATUS?.statName?.toLowerCase() || "inactive",
        statId: t.statId || 1,
        assignees: (t.TASKASSIGNMENT || []).map(a => ({
            grpmemId: a.grpmemId,
            assignedAt: a.assignedAt || null,
            userId: a.GROUPMEMBER?.userId,
            name: a.GROUPMEMBER?.USER?.userDisplayName || "Member"
        }))
    }));
    const statusOrder = { active: 0, pause: 1, verifying: 2, inactive: 3, missing: 4, finished: 5 };
    return tasks.sort((first, second) => {
        const firstOwn = first.assignees.some(assignee => assignee.userId === currentUserId) ? 0 : 1;
        const secondOwn = second.assignees.some(assignee => assignee.userId === currentUserId) ? 0 : 1;
        if (firstOwn !== secondOwn) return firstOwn - secondOwn;
        const firstStatus = statusOrder[first.status] ?? 4;
        const secondStatus = statusOrder[second.status] ?? 4;
        if (firstStatus !== secondStatus) return firstStatus - secondStatus;
        return first.originalIndex - second.originalIndex;
    });
};

// Convert a Postgres interval string ("HH:MM:SS" or "X seconds" etc.) to milliseconds
const intervalToMs = (interval) => {
    if (!interval) return 0;
    // Postgres returns interval as "HH:MM:SS" or "X days HH:MM:SS"
    const match = interval.match(/(?:(\d+) days? ?)?(\d+):(\d+):(\d+)/);
    if (match) {
        const days = parseInt(match[1] || 0);
        const h = parseInt(match[2]);
        const m = parseInt(match[3]);
        const s = parseInt(match[4]);
        return ((days * 86400) + (h * 3600) + (m * 60) + s) * 1000;
    }
    // fallback: "X seconds"
    const secMatch = interval.match(/(\d+(?:\.\d+)?)\s*seconds?/);
    if (secMatch) return Math.floor(parseFloat(secMatch[1]) * 1000);
    return 0;
};

// Convert milliseconds to a Postgres interval string "HH:MM:SS"
const msToInterval = (ms) => {
    const totalSec = Math.floor((ms || 0) / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
};

// Get the current total elapsed ms for a task (accumulated + live segment if active)
const getTotalElapsedMs = (task) => {
    let total = task.spanMs || 0;
    if ((task.status === "active") && task.acmD) {
        total += Date.now() - new Date(task.acmD).getTime();
    }
    return total;
};

const updateTaskStatus = async (taskId, slugStatus, task) => {
    const updates = { statId: STAT_ID[slugStatus] || 1 };
    const now = new Date().toISOString();

    if (slugStatus === "active") {
        // Starting/resuming — record activation timestamp; don't touch accumulated span
        updates.taskAcmD = now;
    } else if (task && task.acmD && task.status === "active") {
        // Stopping from active — accumulate elapsed time into taskSpan, clear activation time
        const elapsed = Date.now() - new Date(task.acmD).getTime();
        const newSpanMs = (task.spanMs || 0) + elapsed;
        updates.taskSpan = msToInterval(newSpanMs);
        updates.taskAcmD = null;
        // Update in-memory task so UI reflects it immediately
        task.spanMs = newSpanMs;
        task.acmD = null;
    }

    await supa().from("TASK").update(updates).eq("taskId", taskId);

    // Send notification when leader finishes a task
    if (slugStatus === "finished") {
        try {
            const { data: { user } } = await supa().auth.getUser();
            const { data: leaderInfo } = await supa().from("USER").select("userDisplayName").eq("userId", user.id).maybeSingle();
            const grpId = getGrpId();
            const projectName = sessionStorage.getItem("hive_selected_project_name") || "a project";
            
            const { data: members } = await supa()
              .from("GROUPMEMBER")
              .select("userId")
              .eq("grpId", grpId);
            
            const recipients = (members || []).map(m => m.userId).filter(uid => uid !== user.id);
            const leaderName = leaderInfo?.userDisplayName || "A leader";
            
            await Promise.all(recipients.map(uid =>
              supa().from("NOTIFICATION").insert({
                notiTitle: "Leader Finished Task",
                notiBody: `${leaderName} has finished "${task?.name || 'a task'}" in "${projectName}".`,
                "notiDate&Time": now,
                notiIsRead: false,
                userId: uid,
                grpId: Number(grpId)
              })
            ));
        } catch (e) {}
    }
};

const loadGroupMembers = async () => {
    const grpId = getGrpId();
    if (!grpId) return [];
    const { data, error } = await supa()
        .from("GROUPMEMBER")
        .select("grpmemId, userId, ROLE(roleName), USER(userDisplayName)")
        .eq("grpId", grpId);
    if (error || !data) return [];
    const seen = {};
    return data
        .filter(m => m.ROLE?.roleName?.toLowerCase() !== "teacher")
        .reduce((acc, m) => {
            if (!seen[m.userId]) {
                seen[m.userId] = true;
                acc.push({ grpmemId: m.grpmemId, userId: m.userId, name: m.USER?.userDisplayName || "Member" });
            }
            return acc;
        }, []);
};

const populateAssigneeCheckboxes = async (containerSelector, inputName, onChange) => {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const members = await loadGroupMembers();
    container.innerHTML = "";
    members.forEach(m => {
        const label = document.createElement("label");
        label.className = "assignee-option";
        label.innerHTML = `<input type="checkbox" name="${inputName}" value="${m.grpmemId}"><span>${m.name}</span>`;
        if (onChange) label.querySelector("input").addEventListener("change", onChange);
        container.appendChild(label);
    });
};

let verifyChoiceCallback = null;
let pauseFinishCallback  = null;

// ── Leader Proof Submission (when leader finishes their own task) ──────────
const leaderProofSubmitOverlay = document.querySelector("#leaderProofSubmitOverlay");
const leaderProofLinkInput     = document.querySelector("#leaderProofLinkInput");
const submitLeaderProofBtn      = document.querySelector("#submitLeaderProofBtn");
const cancelLeaderProofBtn      = document.querySelector("#cancelLeaderProofBtn");
let _leaderProofTaskId = null;

const openLeaderProofSubmit = (taskId) => {
    _leaderProofTaskId = taskId;
    if (leaderProofLinkInput) leaderProofLinkInput.value = "";
    leaderProofSubmitOverlay?.classList.add("open");
    leaderProofSubmitOverlay?.setAttribute("aria-hidden", "false");
};

const closeLeaderProofSubmit = () => {
    leaderProofSubmitOverlay?.classList.remove("open");
    leaderProofSubmitOverlay?.setAttribute("aria-hidden", "true");
    _leaderProofTaskId = null;
};

if (submitLeaderProofBtn) {
    submitLeaderProofBtn.addEventListener("click", async () => {
        const proofLink = leaderProofLinkInput?.value.trim();
        if (!proofLink) {
            showAlert("Please paste a proof link before submitting.", { title: "Missing Proof" });
            return;
        }
        if (!_leaderProofTaskId || !currentUserId) return;

        // Get the leader's grpmemId
        const grpId = getGrpId();
        const { data: membership } = await supa()
            .from("GROUPMEMBER")
            .select("grpmemId")
            .eq("userId", currentUserId)
            .eq("grpId", Number(grpId))
            .maybeSingle();

        if (!membership) {
            showAlert("Could not find your group membership.", { title: "Error" });
            return;
        }

        // Create or update submission with proof
        const now = new Date().toISOString();
        const { error: subErr } = await supa().from("SUBMISSION").insert({
            taskId: _leaderProofTaskId,
            grpmemId: membership.grpmemId,
            proofLink: proofLink,
            submittedAt: now,
            status: "approved"
        }).select().single();

        if (subErr) {
            console.error("Submission error:", subErr);
            showAlert("Failed to submit proof: " + subErr.message, { title: "Error" });
            return;
        }

        closeLeaderProofSubmit();
        showAlert("Proof submitted successfully!", { title: "Success" });
    });
}

if (cancelLeaderProofBtn) {
    cancelLeaderProofBtn.addEventListener("click", closeLeaderProofSubmit);
}

if (leaderProofSubmitOverlay) {
    leaderProofSubmitOverlay.addEventListener("click", e => {
        if (e.target === leaderProofSubmitOverlay) closeLeaderProofSubmit();
    });
}

// ── Participation rating state ──────────────────────────────────────────────
const participationRatingOverlay = document.querySelector("#participationRatingOverlay");
const participationRatingList    = document.querySelector("#participationRatingList");
const skipRatingBtn              = document.querySelector("#skipRatingBtn");
const saveRatingBtn              = document.querySelector("#saveRatingBtn");
let _ratingTaskId = null;
let _ratingAssignees = [];

const openParticipationRating = (taskId, assignees) => {
    _ratingTaskId = taskId;
    // Filter out the current leader from the list of assignees to avoid self-rating
    _ratingAssignees = assignees.filter(a => a.userId !== currentUserId);
    
    // If no other members to rate, just skip
    if (_ratingAssignees.length === 0) {
        closeParticipationRating();
        return;
    }
    
    if (!participationRatingList) return;
    participationRatingList.innerHTML = _ratingAssignees.map((a, i) => `
        <div class="rating-member-row">
            <label class="rating-member-label" for="partScore_${i}">${a.name}</label>
            <div class="rating-inputs">
                <input type="number" min="1" max="10" value="10"
                    id="partScore_${i}"
                    class="rating-score-input"
                    inputmode="numeric">
                <input type="text"
                    placeholder="Remarks (optional)"
                    id="partRemarks_${i}"
                    class="rating-remarks-input">
            </div>
        </div>
    `).join("");

    // Clamp score inputs to 1–10 on change and on blur
    participationRatingList.querySelectorAll(".rating-score-input").forEach(input => {
        const clamp = () => {
            let v = parseInt(input.value);
            if (isNaN(v) || v < 1) v = 1;
            if (v > 10) v = 10;
            input.value = v;
        };
        input.addEventListener("change", clamp);
        input.addEventListener("blur", clamp);
        input.addEventListener("keyup", () => {
            // Block non-numeric characters live
            input.value = input.value.replace(/[^0-9]/g, "");
        });
    });

    participationRatingOverlay?.classList.add("open");
    participationRatingOverlay?.setAttribute("aria-hidden", "false");
};

const closeParticipationRating = () => {
    participationRatingOverlay?.classList.remove("open");
    participationRatingOverlay?.setAttribute("aria-hidden","true");
    _ratingTaskId = null; _ratingAssignees = [];
};

if (participationRatingOverlay) participationRatingOverlay.addEventListener("click", e => { if(e.target===participationRatingOverlay) closeParticipationRating(); });

const ensureSubmissionsForFinishedTask = async (taskId, assignees) => {
    const now = new Date().toISOString();
    await Promise.all(assignees.map(async (a) => {
        const { data: existing } = await supa()
            .from("SUBMISSION")
            .select("subId")
            .eq("taskId", taskId)
            .eq("grpmemId", a.grpmemId)
            .limit(1)
            .maybeSingle();
        if (!existing) {
            await supa().from("SUBMISSION").insert({
                taskId,
                grpmemId: a.grpmemId,
                status: "approved",
                submittedAt: now,
                isRevised: false,
            });
        }
    }));
};

if (skipRatingBtn) skipRatingBtn.addEventListener("click", async () => {
    if (_ratingTaskId && _ratingAssignees.length) {
        await ensureSubmissionsForFinishedTask(_ratingTaskId, _ratingAssignees);
    }
    closeParticipationRating();
});

if (saveRatingBtn) {
    saveRatingBtn.addEventListener("click", async () => {
        if (!_ratingTaskId || !_ratingAssignees.length) return;
        const { data: { user } } = await supa().auth.getUser();

        // Create submission records for assignees that don't have one yet
        await ensureSubmissionsForFinishedTask(_ratingTaskId, _ratingAssignees);

        await Promise.all(_ratingAssignees.map(async (a, i) => {
            const score = Number(document.querySelector(`#partScore_${i}`)?.value) || null;
            const remarks = document.querySelector(`#partRemarks_${i}`)?.value.trim() || null;
            await supa().from("PARTICIPATION").delete().eq("grpmemId", a.grpmemId).eq("taskId", _ratingTaskId);
            await supa().from("PARTICIPATION").insert({
                grpmemId: a.grpmemId,
                taskId: _ratingTaskId,
                partScore: score,
                partRemarks: remarks,
                ratedBy: user?.id || null,
                ratedAt: new Date().toISOString()
            });
        }));
        closeParticipationRating();
    });
}

// ── Verify choice (with submission load) ───────────────────────────────────
let _verifySubmissionId = null;

const openVerifyChoice = async (taskId, onFinish, onRevise) => {
    // Load latest submission for this task
    const { data: submissionRows } = await supa()
        .from("SUBMISSION")
        .select("subId, proofLink, submittedAt, status")
        .eq("taskId", taskId)
        .order("submittedAt", { ascending: false })
        .limit(20);
    const approvedRows = (submissionRows || []).filter((submission) => String(submission.status || "").toLowerCase() === "approved");
    const sub = approvedRows.find((submission) => submission.proofLink) || approvedRows[0] || submissionRows?.[0] || null;

    _verifySubmissionId = sub?.subId || null;
    const { data: task } = await supa().from("TASK")
        .select("taskName, taskResource, taskSpan, taskAcmD, TASKASSIGNMENT(GROUPMEMBER(userId, USER(userDisplayName, avatarPath)))")
        .eq("taskId", taskId)
        .maybeSingle();
    const assignments = task?.TASKASSIGNMENT || [];
    if (verifyTaskName) verifyTaskName.textContent = task?.taskName || "Task Verification";
    if (verifyAssigneeCount) verifyAssigneeCount.textContent = String(assignments.length);
    if (verifyAssignees) verifyAssignees.innerHTML = assignments.slice(0, 3).map((assignment) => {
        const user = assignment.GROUPMEMBER?.USER;
        const name = user?.userDisplayName || "Member";
        const avatar = user?.avatarPath?.startsWith("http") ? user.avatarPath : (user?.avatarPath ? supa().storage.from("profilePicture").getPublicUrl(user.avatarPath).data?.publicUrl : null);
        return `<span class="verify-avatar" title="${name}">${avatar ? `<img src="${avatar}" alt="${name}">` : name.charAt(0).toUpperCase()}</span>`;
    }).join("");
    if (verifyAssigneeInfo) verifyAssigneeInfo.title = assignments.map((assignment) => assignment.GROUPMEMBER?.USER?.userDisplayName).filter(Boolean).join(", ") || "No assignees";
    if (verifyActiveTime) verifyActiveTime.textContent = formatElapsedTime(intervalToMs(task?.taskSpan) + (task?.taskAcmD ? Date.now() - new Date(task.taskAcmD).getTime() : 0));
    if (verifyResourceLink) verifyResourceLink.value = task?.taskResource || "";
    if (verifyCopyResourceBtn) verifyCopyResourceBtn.disabled = !task?.taskResource;
    if (verifyCopyResourceBtn) verifyCopyResourceBtn.onclick = async () => {
        if (!verifyResourceLink?.value) return;
        await navigator.clipboard?.writeText(verifyResourceLink.value);
        verifyCopyResourceBtn.textContent = "Copied";
        setTimeout(() => { verifyCopyResourceBtn.textContent = "Copy"; }, 1200);
    };
    if (verifySubmittedAt) verifySubmittedAt.textContent = sub?.submittedAt ? new Date(sub.submittedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "--/--/---- --:-- --";
    verifyChoiceCallback = { taskId, onFinish, onRevise };
    verifyChoiceOverlay?.classList.add("open");
    verifyChoiceOverlay?.setAttribute("aria-hidden","false");
};

const closeVerifyChoice = () => {
    verifyChoiceOverlay?.classList.remove("open");
    verifyChoiceOverlay?.setAttribute("aria-hidden","true");
    verifyChoiceCallback = null; _verifySubmissionId = null;
};

if (verifyFinishBtn) {
    verifyFinishBtn.addEventListener("click", async () => {
        if (_verifySubmissionId) {
            await supa().from("SUBMISSION").update({ status: "approved" }).eq("subId", _verifySubmissionId);
        }
        const taskId = verifyChoiceCallback?.taskId;
        if (taskId) await supa().from("TASK").update({ statId: STAT_ID.finished, teacherApproved: true, taskAcmD: null }).eq("taskId", taskId);
        verifyChoiceCallback?.onFinish?.();
        closeVerifyChoice();
    });
}

if (verifyReviseBtn) {
    verifyReviseBtn.addEventListener("click", async () => {
        if (_verifySubmissionId) {
            await supa().from("SUBMISSION").update({ status: "rejected" }).eq("subId", _verifySubmissionId);
        }
        const taskId = verifyChoiceCallback?.taskId;
        if (taskId) await supa().from("TASK").update({ statId: STAT_ID.inactive, wasRevising: true, teacherApproved: false, taskAcmD: null }).eq("taskId", taskId);
        verifyChoiceCallback?.onRevise?.();
        closeVerifyChoice();
    });
}

if (verifyCloseBtn)      verifyCloseBtn.addEventListener("click", closeVerifyChoice);
if (verifyChoiceOverlay) verifyChoiceOverlay.addEventListener("click", e => { if(e.target===verifyChoiceOverlay) closeVerifyChoice(); });

const openPauseFinishChoice= (a,b) => { pauseFinishCallback={onPause:a,onFinish:b}; pauseFinishChoiceOverlay?.classList.add("open"); pauseFinishChoiceOverlay?.setAttribute("aria-hidden","false"); };
const closePauseFinishChoice=()    => { pauseFinishChoiceOverlay?.classList.remove("open"); pauseFinishChoiceOverlay?.setAttribute("aria-hidden","true"); pauseFinishCallback=null; };

if (pauseFinishPauseBtn)   pauseFinishPauseBtn.addEventListener("click",   () => { pauseFinishCallback?.onPause?.(); closePauseFinishChoice(); });
if (pauseFinishFinishBtn)  pauseFinishFinishBtn.addEventListener("click",  () => { pauseFinishCallback?.onFinish?.(); closePauseFinishChoice(); });
if (pauseFinishCloseBtn)   pauseFinishCloseBtn.addEventListener("click",   closePauseFinishChoice);
if (pauseFinishChoiceOverlay) pauseFinishChoiceOverlay.addEventListener("click", e => { if(e.target===pauseFinishChoiceOverlay) closePauseFinishChoice(); });

let leaderActiveCallback = null;
const openLeaderActiveChoice = (onPause, onFinish) => { leaderActiveCallback={onPause,onFinish}; leaderActiveChoiceOverlay?.classList.add("open"); leaderActiveChoiceOverlay?.setAttribute("aria-hidden","false"); };
const closeLeaderActiveChoice = () => { leaderActiveChoiceOverlay?.classList.remove("open"); leaderActiveChoiceOverlay?.setAttribute("aria-hidden","true"); leaderActiveCallback=null; };

if (leaderActivePauseBtn)   leaderActivePauseBtn.addEventListener("click",   () => { leaderActiveCallback?.onPause?.();   closeLeaderActiveChoice(); });
if (leaderActiveFinishBtn)  leaderActiveFinishBtn.addEventListener("click",  () => { leaderActiveCallback?.onFinish?.();  closeLeaderActiveChoice(); });
if (leaderActiveCloseBtn)   leaderActiveCloseBtn.addEventListener("click",   closeLeaderActiveChoice);
if (leaderActiveChoiceOverlay) leaderActiveChoiceOverlay.addEventListener("click", e => { if(e.target===leaderActiveChoiceOverlay) closeLeaderActiveChoice(); });

const attachLeaderStatusBtn = (btn, task, isOwnTask) => {
    const setStatus = async (s) => {
        await updateTaskStatus(task.taskId, s, task);
        task.status = s;
        if (s === "active") { task.acmD = new Date().toISOString(); }
        else { task.acmD = null; }
        applyStatusToBtn(btn, s);

        const card = btn.closest("article");
        const taskLeft = card?.querySelector(".task-left");
        if (!taskLeft) return;
        if (s === "active") {
            // Remove any existing timer spans (static or dynamic) to avoid duplicates
            card.querySelectorAll(".task-time-active").forEach(el => el.remove());
            const timerEl = document.createElement("span");
            timerEl.className = "task-time-active";
            timerEl.dataset.taskId = task.taskId;
            timerEl.dataset.acmD = task.acmD;
            timerEl.dataset.spanMs = task.spanMs || 0;
            timerEl.textContent = formatElapsedTime(getTotalElapsedMs(task));
            taskLeft.appendChild(timerEl);
        } else {
            const timerEl = card.querySelector(`.task-time-active[data-task-id="${task.taskId}"]`)
                         || card.querySelector(".task-time-active");
            if (timerEl) {
                delete timerEl.dataset.acmD;
                timerEl.dataset.spanMs = task.spanMs || 0;
                if (task.spanMs > 0) { timerEl.textContent = formatElapsedTime(task.spanMs); }
                else { timerEl.remove(); }
            }
        }

        // After finishing: check if leader is assigned to this task
        if (s === "finished") {
            // Check if current user is in the assignees
            const isLeaderAssigned = task.assignees.some(a => a.userId === currentUserId);
            if (isLeaderAssigned && task.assignees.length > 0) {
                openLeaderProofSubmit(task.taskId);
            } else {
                openParticipationRating(task.taskId, task.assignees);
            }
        }
    };
    btn.addEventListener("click", async e => {
        e.stopPropagation();
        const cur = task.status || "inactive";
        if (isTerminal(cur)) return;
        if (isOwnTask) {
            if (cur==="inactive") await setStatus("active");
            else if (cur==="active") openPauseFinishChoice(()=>setStatus("pause"),()=>setStatus("finished"));
            else if (cur==="pause") await setStatus("active");
        } else {
            if (cur==="inactive") await setStatus("active");
            else if (cur==="active" || cur==="revising") openLeaderActiveChoice(
                () => { task._prePauseStatus = cur; setStatus("pause"); },
                () => setStatus("finished")
            );
            else if (cur==="pause") await setStatus(task._prePauseStatus === "revising" ? "revising" : "active");
            else if (cur==="verifying") openVerifyChoice(task.taskId, ()=>setStatus("finished"), ()=>setStatus("inactive"));
        }
    });
};

const formatTime12h = (t) => {
    if (!t) return "##:## AM";
    const [h,m]=t.split(":").map(Number); const ap=h>=12?"PM":"AM"; const h12=h%12||12;
    return `${String(h12).padStart(2,"0")}:${String(m).padStart(2,"0")} ${ap}`;
};
const formatElapsedTime = (ms) => { const s=Math.floor((ms||0)/1000); return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s`; };

const notifyTaskMissing = async (task) => {
    const grpId = getGrpId();
    if (!grpId) return;
    try {
        const [{ data: assignments }, { data: leaderRole }] = await Promise.all([
            supa().from("TASKASSIGNMENT").select("GROUPMEMBER(userId)").eq("taskId", task.taskId),
            supa().from("ROLE").select("roleId").eq("roleName", "Leader").maybeSingle()
        ]);
        const { data: leader } = await supa()
            .from("GROUPMEMBER").select("userId")
            .eq("grpId", Number(grpId)).eq("roleId", leaderRole?.roleId).maybeSingle();
        const recipients = new Set();
        (assignments || []).forEach(a => { if (a.GROUPMEMBER?.userId) recipients.add(a.GROUPMEMBER.userId); });
        if (leader?.userId) recipients.add(leader.userId);
        const now = new Date().toISOString();
        await Promise.all([...recipients].map(userId =>
            supa().from("NOTIFICATION").insert({
                notiTitle: "Task Missing",
                notiBody: `Task "${task.name}" has passed its due date and is now marked as missing.`,
                "notiDate&Time": now,
                notiIsRead: false,
                userId,
                grpId: Number(grpId)
            })
        ));
    } catch (e) {}
};

const renderTask = async (task, idx, isOwnTask, target) => {
    if (!target) return;
    if (!isTerminal(task.status) && task.status!=="verifying" && isPastDue(task)) {
        task.status="missing";
        await updateTaskStatus(task.taskId,"missing",task);
        notifyTaskMissing(task);
    }
    const assigneeCount = task.assignees.length;
    const status = task.status||"inactive";
    const priority=(task.priority||"Low").toLowerCase();
    const article = document.createElement("article");
    article.className="task-card task-card-clickable"; article.setAttribute("data-dynamic","true");
    if (priority==="high") article.style.backgroundColor="#FF8383";
    else if (priority==="medium") article.style.backgroundColor="#FFC193";
    if (task.teacherApproved) article.style.backgroundColor="#B8FFB8";
    const timeHtml = status==="active"
        ? `<span class="task-time-active" data-task-id="${task.taskId}" data-acm-d="${task.acmD||""}" data-span-ms="${task.spanMs||0}">${formatElapsedTime(getTotalElapsedMs(task))}</span>`
        : `<span class="task-time-active">${formatElapsedTime(task.spanMs)}</span>`;
    article.innerHTML=`
        <div class="task-left">
            <h3>${isOwnTask ? `<svg class="assigned-task-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true"><path d="M 72.44 16.13 L 90.56 47.50 A 5 5 0 0 1 90.56 52.50 L 72.44 83.87 A 5 5 0 0 1 68.11 86.37 L 31.89 86.37 A 5 5 0 0 1 27.56 83.87 L 9.44 52.50 A 5 5 0 0 1 9.44 47.50 L 27.56 16.13 A 5 5 0 0 1 31.89 13.63 L 68.11 13.63 A 5 5 0 0 1 72.44 16.13 Z" fill="#FFCC00"></path></svg>` : ""}${task.name}</h3>
            <p>${assigneeCount} Assigned Contributor${assigneeCount === 1 ? "" : "s"}</p>
            <p class="task-time-row">Active Timespan: ${timeHtml}${task.wasRevising ? " <span>Revising</span>" : ""}</p>
        </div>
        <div class="task-due">
            <span>Due Date: ${task.dueDate || "--/--/----"}</span>
            <span>Due Time: ${task.dueTime || "--:--"}</span>
        </div>
        <div class="task-actions">
            <button class="task-status ${status}" type="button">${STATUS_TEXT[status]||status}</button>
        </div>`;
    const statusBtn=article.querySelector(".task-status");
    if(statusBtn) statusBtn.disabled = true;
    article.addEventListener("click",()=>{ const taskId = task.taskId; if (taskId) window.location.href = `t.taskdt.html?taskId=${encodeURIComponent(taskId)}&grpId=${encodeURIComponent(getGrpId?.() || "")}&projId=${encodeURIComponent(getProjId?.() || "")}`; });
    target.appendChild(article);
};

const renderAllTasks = async () => {
    const tasks=(await loadTasks()).filter(task => task.status !== "finished" && task.status !== "verifying");
    const yl=document.querySelector("#yourTasksList"); const ol=document.querySelector("#otherTasksList");
    const isTeacherProjectPage = document.body.classList.contains("leader-project-page");
    if (yl) yl.hidden = false;
    if (ol) ol.hidden = !isTeacherProjectPage;
    if(yl) yl.innerHTML=""; if(ol) ol.innerHTML="";
    let own=0,other=0,verify=0;
    for(let i=0;i<tasks.length;i++){
        const t=tasks[i]; const mine=t.assignees.some(a=>a.userId===currentUserId);
        await renderTask(t,i,mine,isTeacherProjectPage ? yl : (mine ? yl : ol));
        if(mine) own++; else other++;
        if(t.status==="verifying") verify++;
    }
    if (yl && (isTeacherProjectPage ? tasks.length === 0 : own === 0)) {
        yl.innerHTML=`<div class="empty-state task-empty-placeholder"><img src="../../assets/bee-flight.svg" class="empty-state-icon" alt=""><h2>You Have No Pending Tasks Yet</h2><p>No pending tasks require your attention right now. Check your projects to review student progress.</p></div>`;
    }
    if(ol&&other===0) ol.innerHTML=`<div class="empty-state task-empty-placeholder"><img src="../../assets/bee-flight.svg" class="empty-state-icon" alt=""><h2>You Have No Pending Tasks Yet</h2><p>No pending tasks require your attention right now. Check your projects to review student progress.</p></div>`;
    const sc=document.querySelectorAll(".summary-card h3");
    if(sc[0]) sc[0].textContent=own; if(sc[1]) sc[1].textContent=other; if(sc[2]) sc[2].textContent=verify;
};

const formatProjectDate = (value) => {
    if (!value) return "--/--/----";
    const date = new Date(String(value).includes("T") ? value : `${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US");
};

const loadProfileAvatar = async (userId) => {
    const profileImage = document.querySelector(".profile-trigger img");
    if (!profileImage || !userId) return;
    const { data } = await supa().from("USER").select("avatarPath").eq("userId", userId).maybeSingle();
    const avatarPath = data?.avatarPath;
    if (!avatarPath) return;
    const avatarUrl = avatarPath.startsWith("http")
        ? avatarPath
        : supa().storage.from("profilePicture").getPublicUrl(avatarPath).data?.publicUrl;
    if (avatarUrl) profileImage.src = avatarUrl;
};

projectTabs.forEach(tab => tab.addEventListener("click", () => {
    projectTabs.forEach(item => {
        const active = item === tab;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", String(active));
    });
    projectTabPanels.forEach(panel => {
        panel.hidden = panel.id !== tab.getAttribute("aria-controls");
    });
    if (tab.id === "submissionsTab") loadSubmissions("evaluation");
}));

const requestedProjectTab = new URLSearchParams(window.location.search).get("tab");
if (requestedProjectTab === "submissions") {
    document.querySelector("#submissionsTab")?.click();
}

const openPostTaskModal = async () => {
    const projDue = await loadProjectDueDate();
    if (dueDateInput) {
        dueDateInput.min = todayLocal();
        if (projDue) dueDateInput.max = projDue; else dueDateInput.removeAttribute("max");
    }
    postTaskModalOverlay?.classList.add("open");
    postTaskModalOverlay?.setAttribute("aria-hidden", "false");
    await populateAssigneeCheckboxes(".post-assignee-options", "assignees", updatePostTaskSubmitState);
    updatePostTaskSubmitState();
};

if (inlinePostTaskBtn) inlinePostTaskBtn.addEventListener("click", openPostTaskModal);
if (projectBackLink) projectBackLink.addEventListener("click", () => { window.location.href = "t.grpviewing.html"; });

// Global ticker — updates all active task cards + the open details modal every second
// Stored on window so it is never started more than once
if (!window._globalTaskTicker) {
    window._globalTaskTicker = setInterval(() => {
        // Tick every [data-task-id] span on active cards
        document.querySelectorAll(".task-time-active[data-task-id]").forEach(el => {
            const taskId = Number(el.dataset.taskId);
            // Find the acmD from the element's stored snapshot (set below)
            const acmD = el.dataset.acmD;            const spanMs = Number(el.dataset.spanMs || 0);
            if (!acmD) return;
            const total = spanMs + (Date.now() - new Date(acmD).getTime());
            el.textContent = formatElapsedTime(total);
        });
        // Also tick the details modal if it's open on an active task
        if (window._detailTaskRef && window._detailTaskRef.status === "active" && detailTaskTimeActive) {
            detailTaskTimeActive.textContent = formatElapsedTime(getTotalElapsedMs(window._detailTaskRef));
        }
    }, 1000);
}

const closeTaskSettings=()=>{taskSettingsOverlay?.classList.remove("open");taskSettingsOverlay?.setAttribute("aria-hidden","true");};
const openTaskSettings=(i)=>{activeTaskIndex=i;taskSettingsOverlay?.classList.add("open");taskSettingsOverlay?.setAttribute("aria-hidden","false");};
const closeEditTaskInfo=()=>{editTaskInfoOverlay?.classList.remove("open");editTaskInfoOverlay?.setAttribute("aria-hidden","true");};
const closeManualStatus=()=>{manualStatusOverlay?.classList.remove("open");manualStatusOverlay?.setAttribute("aria-hidden","true");};
const openManualStatus=()=>{if(!manualStatusOverlay||activeTaskIndex===null)return;manualStatusOverlay.classList.add("open");manualStatusOverlay.setAttribute("aria-hidden","false");};
const closeRemoveTaskConfirm=()=>{removeTaskConfirmOverlay?.classList.remove("open");removeTaskConfirmOverlay?.setAttribute("aria-hidden","true");};
const openRemoveTaskConfirm=()=>{if(!removeTaskConfirmOverlay||activeTaskIndex===null)return;removeTaskConfirmOverlay.classList.add("open");removeTaskConfirmOverlay.setAttribute("aria-hidden","false");};
const closeTaskDetails=()=>{
    taskDetailsOverlay?.classList.remove("open");
    taskDetailsOverlay?.setAttribute("aria-hidden","true");
    window._detailTaskRef = null;
};

const updateEditTaskSubmitState=()=>{
    if(!saveEditTaskInfoBtn)return;
    const ok=editTaskNameInput?.value.trim().length>0&&editDueDateInput?.value.length>0&&editDueTimeInput?.value.length>0&&document.querySelectorAll("input[name='editAssignees']:checked").length>0;
    saveEditTaskInfoBtn.disabled=!ok;
};

const openEditTaskInfo=async()=>{
    if(!editTaskInfoOverlay||activeTaskIndex===null)return;
    const tasks=await loadTasks(); const task=tasks[activeTaskIndex]; if(!task)return;
    if(editTaskNameInput) editTaskNameInput.value=task.name||"";
    if(editTaskDescriptionInput) editTaskDescriptionInput.value=task.description||"";
    if(editTaskResourcesInput) editTaskResourcesInput.value=task.resources||"";
    if(editDueDateInput){
        const projDue = await loadProjectDueDate();
        editDueDateInput.min = todayLocal();
        if(projDue) editDueDateInput.max = projDue; else editDueDateInput.removeAttribute("max");
        editDueDateInput.value = task.dueDate || "";
    }
    if(editDueTimeInput) editDueTimeInput.value=task.dueTime||"";
    const ei=document.getElementById("editIntensityInput"); if(ei) ei.value=task.intensity||"Light";
    const ep=document.getElementById("editPriorityInput"); if(ep) ep.value=task.priority||"Low";
    await populateAssigneeCheckboxes(".edit-assignee-options","editAssignees",updateEditTaskSubmitState);
    const ids=task.assignees.map(a=>String(a.grpmemId));
    document.querySelectorAll("input[name='editAssignees']").forEach(cb=>{cb.checked=ids.includes(cb.value);});
    updateEditTaskSubmitState();
    editTaskInfoOverlay.classList.add("open");editTaskInfoOverlay.setAttribute("aria-hidden","false");
};

const openTaskDetails=async(idx)=>{
    if(!taskDetailsOverlay)return;
    const tasks=await loadTasks(); const task=tasks[idx]; if(!task)return;
    if(detailTaskName) detailTaskName.textContent=task.name||"";
    if(detailTaskDescription) detailTaskDescription.textContent=task.description||"None";
    if(detailTaskResources) detailTaskResources.textContent=task.resources||"None";
    if(detailTaskAssignees) detailTaskAssignees.textContent=task.assignees.map(a=>a.name).join(", ")||"None";
    if(detailTaskDueDate) detailTaskDueDate.textContent=task.dueDate||"N/A";
    if(detailTaskDueTime) detailTaskDueTime.textContent=task.dueTime?formatTime12h(task.dueTime):"N/A";
    const di=document.getElementById("detailTaskIntensity"); if(di) di.textContent=task.intensity||"Light";
    const dp=document.getElementById("detailTaskPriority"); if(dp) dp.textContent=task.priority||"Low";
    if(detailTaskStatus){const s=task.status||"inactive";detailTaskStatus.textContent=STATUS_TEXT[s]||s;detailTaskStatus.className=`task-status ${s}`;detailTaskStatus.disabled=true;}

    // Store task ref so the global ticker can update the modal while it's open
    window._detailTaskRef = task;
    if(detailTaskTimeActive){
        detailTaskTimeActive.textContent=formatElapsedTime(getTotalElapsedMs(task));
    }
    taskDetailsOverlay.classList.add("open");taskDetailsOverlay.setAttribute("aria-hidden","false");
};

if(topBackBtn) topBackBtn.addEventListener("click",()=>{window.location.href="../t.dashb.html";});
if(groupInfoTab) groupInfoTab.addEventListener("click",()=>{window.location.href="t.grpviewing.html";});

if(backToCategoriesBtn) backToCategoriesBtn.addEventListener("click",()=>{window.location.href="t.category.html";});
if(discardTaskSettingsBtn) discardTaskSettingsBtn.addEventListener("click",closeTaskSettings);
if(taskSettingsOverlay) taskSettingsOverlay.addEventListener("click",e=>{if(e.target===taskSettingsOverlay)closeTaskSettings();});
if(openEditTaskInfoBtn) openEditTaskInfoBtn.addEventListener("click",()=>{closeTaskSettings();openEditTaskInfo();});
if(discardEditTaskInfoBtn) discardEditTaskInfoBtn.addEventListener("click",closeEditTaskInfo);
if(editTaskInfoOverlay) editTaskInfoOverlay.addEventListener("click",e=>{if(e.target===editTaskInfoOverlay)closeEditTaskInfo();});
if(openManualStatusBtn) openManualStatusBtn.addEventListener("click",()=>{closeTaskSettings();openManualStatus();});
if(discardManualStatusBtn) discardManualStatusBtn.addEventListener("click",closeManualStatus);
if(manualStatusOverlay) manualStatusOverlay.addEventListener("click",e=>{if(e.target===manualStatusOverlay)closeManualStatus();});
if(openRemoveTaskConfirmBtn) openRemoveTaskConfirmBtn.addEventListener("click",()=>{closeTaskSettings();openRemoveTaskConfirm();});
if(discardRemoveTaskBtn) discardRemoveTaskBtn.addEventListener("click",closeRemoveTaskConfirm);
if(removeTaskConfirmOverlay) removeTaskConfirmOverlay.addEventListener("click",e=>{if(e.target===removeTaskConfirmOverlay)closeRemoveTaskConfirm();});
if(closeTaskDetailsBtn) closeTaskDetailsBtn.addEventListener("click",closeTaskDetails);
if(taskDetailsOverlay) taskDetailsOverlay.addEventListener("click",e=>{if(e.target===taskDetailsOverlay)closeTaskDetails();});

if(confirmRemoveTaskBtn){
    confirmRemoveTaskBtn.addEventListener("click",async()=>{
        if(activeTaskIndex===null)return;
        const tasks=await loadTasks(); const taskId=tasks[activeTaskIndex]?.taskId;
        if(taskId){
            await supa().rpc("delete_task", { p_task_id: taskId });
        }
        activeTaskIndex=null; closeRemoveTaskConfirm(); await renderAllTasks();
    });
}

manualStatusButtons.forEach(btn=>{
    btn.addEventListener("click",async()=>{
        if(activeTaskIndex===null)return;
        const tasks=await loadTasks(); const task=tasks[activeTaskIndex]; if(!task)return;
        const targetStatus=btn.dataset.manualStatus;
        const wasFinished=task.status==="finished";
        await updateTaskStatus(task.taskId,targetStatus,task);
        if(targetStatus==="finished"){
            if(!wasFinished) await ensureSubmissionsForFinishedTask(task.taskId,task.assignees);
            closeManualStatus(); await renderAllTasks();
            openParticipationRating(task.taskId,task.assignees);
        } else {
            closeManualStatus(); await renderAllTasks();
        }
    });
});

const closePostTaskModal=()=>{postTaskModalOverlay?.classList.remove("open");postTaskModalOverlay?.setAttribute("aria-hidden","true");};
const updatePostTaskSubmitState=()=>{
    if(!postTaskSubmitBtn)return;
    const ok=taskNameInput?.value.trim().length>0&&dueDateInput?.value.length>0&&dueTimeInput?.value.length>0&&document.querySelectorAll("input[name='assignees']:checked").length>0;
    postTaskSubmitBtn.disabled=!ok;
};

if(openPostTaskModalBtn&&postTaskModalOverlay){
    openPostTaskModalBtn.addEventListener("click", openPostTaskModal);
}
if(discardPostTaskBtn) discardPostTaskBtn.addEventListener("click",()=>{postTaskForm?.reset();updatePostTaskSubmitState();closePostTaskModal();});
if(taskNameInput) taskNameInput.addEventListener("input",updatePostTaskSubmitState);
if(dueDateInput)  dueDateInput.addEventListener("input",updatePostTaskSubmitState);
if(dueTimeInput)  dueTimeInput.addEventListener("input",updatePostTaskSubmitState);
if(postTaskModalOverlay) postTaskModalOverlay.addEventListener("click",e=>{if(e.target===postTaskModalOverlay)closePostTaskModal();});

if(postTaskForm){
    postTaskForm.addEventListener("submit",e=>{
        e.preventDefault();
        const checked=Array.from(postTaskForm.querySelectorAll("input[name='assignees']:checked"));
        if(!taskNameInput?.value.trim()||checked.length===0||!dueDateInput?.value||!dueTimeInput?.value)return;
        const name=taskNameInput.value.trim();
        showConfirmation(`Are you sure you want to post the task "${name}"?`,async()=>{
            const projId=getProjId();
            const dueISO=`${dueDateInput.value}T${dueTimeInput.value}:00`;
            const {data:newTask,error}=await supa().from("TASK").insert({
                taskName:name,
                taskDesc:taskDescriptionInput?.value.trim()||"",
                taskDueD:dueISO,
                taskResource:taskResourcesInput?.value.trim()||null,
                taskIntensity:document.getElementById("intensityInput")?.value||"Light",
                taskPrio:document.getElementById("priorityInput")?.value||"Low",
                statId:STAT_ID.inactive,
                projId:projId?Number(projId):null  // TASK.projId FK → PROJECT.progId
            }).select("taskId").single();
            if(error){showAlert("Failed to create task: "+error.message,{title:"Error"});return;}
            const grpId=getGrpId();
            const projectName=sessionStorage.getItem("hive_selected_project_name") || "a project";
            await Promise.all(checked.map(async cb => {
                const grpmemId = Number(cb.value);
                await supa().from("TASKASSIGNMENT").insert({ taskId: newTask.taskId, grpmemId, assignedAt: new Date().toISOString() });
                // Notify the assigned member
                const { data: member } = await supa()
                    .from("GROUPMEMBER").select("userId").eq("grpmemId", grpmemId).maybeSingle();
                if (member?.userId && member.userId !== currentUserId) {
                    await supa().from("NOTIFICATION").insert({
                        notiTitle: "New Task Assigned",
                        notiBody: `You have been assigned to "${name}" in project "${projectName}"`,
                        "notiDate&Time": new Date().toISOString(),
                        notiIsRead: false,
                        userId: member.userId,
                        grpId: grpId ? Number(grpId) : null
                    });
                }
            }));
            await renderAllTasks(); closePostTaskModal(); postTaskForm.reset(); updatePostTaskSubmitState();
        },{title:"Post Task",confirmText:"Post",cancelText:"Cancel"});
    });
}

if(editTaskInfoForm){
    editTaskInfoForm.addEventListener("submit",e=>{
        e.preventDefault();
        if(activeTaskIndex===null)return;
        const checked=Array.from(document.querySelectorAll("input[name='editAssignees']:checked"));
        if(!editTaskNameInput?.value.trim()||checked.length===0||!editDueDateInput?.value||!editDueTimeInput?.value)return;
        const name=editTaskNameInput.value.trim();
        showConfirmation(`Are you sure you want to save changes to task "${name}"?`,async()=>{
            const tasks=await loadTasks(); const task=tasks[activeTaskIndex]; if(!task)return;
            const dueISO=`${editDueDateInput.value}T${editDueTimeInput.value}:00`;
            const {error}=await supa().from("TASK").update({
                taskName:name,
                taskDesc:editTaskDescriptionInput?.value.trim()||"",
                taskDueD:dueISO,
                taskResource:editTaskResourcesInput?.value.trim()||null,
                taskIntensity:document.getElementById("editIntensityInput")?.value||"Light",
                taskPrio:document.getElementById("editPriorityInput")?.value||"Low"
            }).eq("taskId",task.taskId);
            if(error){showAlert("Failed to update task: "+error.message,{title:"Error"});return;}
            await supa().from("TASKASSIGNMENT").delete().eq("taskId", task.taskId);
            await Promise.all(checked.map(async cb => {
                const grpmemId = Number(cb.value);
                await supa().from("TASKASSIGNMENT").insert({ taskId: task.taskId, grpmemId, assignedAt: new Date().toISOString() });
            }));
            closeEditTaskInfo(); await renderAllTasks();
        },{title:"Save Changes",confirmText:"Save",cancelText:"Cancel"});
    });
}

if(editTaskNameInput) editTaskNameInput.addEventListener("input",updateEditTaskSubmitState);
if(editDueDateInput)  editDueDateInput.addEventListener("input",updateEditTaskSubmitState);
if(editDueTimeInput)  editDueTimeInput.addEventListener("input",updateEditTaskSubmitState);

document.addEventListener("keydown",e=>{
    if(e.key==="Escape"){closePostTaskModal();closeTaskSettings();closeEditTaskInfo();closeManualStatus();closeRemoveTaskConfirm();closeTaskDetails();}
});

const logoutBtn=document.querySelector(".logout");
if(logoutBtn) logoutBtn.addEventListener("click",()=>{showConfirmation("Are you sure you want to log out?",()=>window.doLogout?.(),{title:"Log Out",confirmText:"Log Out",cancelText:"Cancel"});});

(async()=>{
    const {data:{user}}=await supa().auth.getUser();
    currentUserId=user?.id||null;
    await loadProfileAvatar(currentUserId);
    const projectName=sessionStorage.getItem("hive_selected_project_name");
    const el=document.querySelector(".project-name-display h2");
    if(projectName&&el) el.textContent=projectName;
    const project = await loadProjectDetails();
    const detailName = document.querySelector(".project-detail-name");
    if (detailName) detailName.textContent = project?.projName || projectName || "Project";
    const startDate = document.querySelector("#projectStartDate");
    const dueDate = document.querySelector("#projectDueDate");
    const dueTime = document.querySelector("#projectDueTime");
    if (startDate) startDate.textContent = formatProjectDate(project?.projCreatedAt);
    if (dueDate) dueDate.textContent = formatProjectDate(project?.projDueD);
    if (dueTime) dueTime.textContent = project?.projDueT || "--:--";
    const description = document.querySelector("#projectDescription");
    if (description) description.textContent = project?.projDesc || "No project description provided.";
    const validationLink=document.querySelector(".validation-link");
    if(validationLink){
        const pid=getProjId(), gid=getGrpId();
        validationLink.href=`../validation/contribution-validation.html?mode=leader&projId=${pid||""}&grpId=${gid||""}`;
    }
    await loadContributorSummary();
    await renderAllTasks();
})();