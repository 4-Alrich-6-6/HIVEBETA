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
const submissionFilterButtons = Array.from(document.querySelectorAll("[data-submission-filter]"));
const submissionsList = document.querySelector("#submissionsList");
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
const pageTaskName = document.querySelector("#pageTaskName");
const pageTaskAssigner = document.querySelector("#pageTaskAssigner");
const pageTaskAssignedDate = document.querySelector("#pageTaskAssignedDate");
const taskDetailMoreBtn = document.querySelector("#taskDetailMoreBtn");
const pageTaskDueDate = document.querySelector("#pageTaskDueDate");
const pageTaskAssignees = document.querySelector("#pageTaskAssignees");
const pageTaskAssigneeCount = document.querySelector("#pageTaskAssigneeCount");
const pageTaskAssigneeAvatars = document.querySelector("#pageTaskAssigneeAvatars");
const pageTaskAssigneeInfo = document.querySelector("#pageTaskAssigneeInfo");
const pageTaskAssigneePopover = document.querySelector("#pageTaskAssigneePopover");
const pageTaskAssigneeList = document.querySelector("#pageTaskAssigneeList");
const pageTaskIntensity = document.querySelector("#pageTaskIntensity");
const pageTaskPriority = document.querySelector("#pageTaskPriority");
const pageTaskDescription = document.querySelector("#pageTaskDescription");
const pageTaskResources = document.querySelector("#pageTaskResources");
const copyTaskResourceBtn = document.querySelector("#copyTaskResourceBtn");
const pageTaskStatus = document.querySelector("#pageTaskStatus");
const pageTaskActiveTime = document.querySelector("#pageTaskActiveTime");
const pageTaskStart = document.querySelector("#pageTaskStart");
const pageTaskSubmit = document.querySelector("#pageTaskSubmit");
const taskDetailBack = document.querySelector("#taskDetailBack");

let activeTaskIndex = null;
let currentUserId = null;

const STAT_ID = { inactive:1, active:2, pause:3, verifying:4, finished:5, missing:6 };
const STAT_SLUG = { 1:"inactive", 2:"active", 3:"pause", 4:"verifying", 5:"finished", 6:"missing", 7:"inactive" };
const STATUS_TEXT = { inactive:"Not Active", active:"Active", pause:"On Break", verifying:"Verifying", finished:"Finished", missing:"Missing" };

const isTerminal = (s) => s === "finished" || s === "missing";
const isPastDue  = (t) => !(!t.dueDate || !t.dueTime) && Date.now() > new Date(`${t.dueDate}T${t.dueTime}`).getTime();
const supa       = () => window.hiveSupabase;
const getProjId  = () => sessionStorage.getItem("hive_selected_project");
const getGrpId   = () => sessionStorage.getItem("hive_grpId");
const getTaskId  = () => new URLSearchParams(window.location.search).get("taskId");
const resolveAvatarUrl = (avatarPath) => {
    if (!avatarPath) return "../../assets/profile-placeholder.svg";
    return avatarPath.startsWith("http")
        ? avatarPath
        : supa().storage.from("profilePicture").getPublicUrl(avatarPath).data?.publicUrl || "../../assets/profile-placeholder.svg";
};

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
    const { data } = await supa().from("PROJECT").select("projName, projDueD").eq("projId", Number(pid)).maybeSingle();
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
        .select("subId, taskId, grpmemId, proofLink, submittedAt, status, leaderNote, TASK!inner(taskName, statId, projId, TASKASSIGNMENT(GROUPMEMBER(USER(userDisplayName)))), GROUPMEMBER(USER(userDisplayName))")
        .eq("TASK.projId", Number(projId))
        .order("submittedAt", { ascending: false });

    if (error) {
        console.error("Failed to load submissions:", error);
        submissionsList.innerHTML = `<div class="submissions-empty empty-state"><h3>Unable to load submissions</h3><p>${error.message}</p></div>`;
        return;
    }

    const submissions = (data || []).filter((submission) => {
        const status = String(submission.status || "").toLowerCase();
        const taskStatus = Number(submission.TASK?.statId);
        const isFinished = taskStatus === STAT_ID.finished;
        const isForEvaluation = taskStatus === STAT_ID.verifying;
        return filter === "finished" ? isFinished : isForEvaluation;
    });

    if (!submissions.length) {
        submissionsList.innerHTML = `<div class="submissions-empty empty-state"><img class="empty-state-icon" src="../assets/bee-flight.svg" alt=""><h3>No ${filter === "finished" ? "Finished" : "Submissions For Evaluation"}</h3><p>There are no submissions in this list.</p></div>`;
        return;
    }

    submissionsList.innerHTML = "";
    submissions.forEach((submission) => {
        const card = document.createElement("article");
        card.className = "submission-card";
        const submittedAt = submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : "Date unavailable";
        const status = String(submission.status || "For evaluation");
        card.innerHTML = `
            <div class="submission-card-main">
                <h3></h3>
                <p class="submission-contributor"></p>
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
        card.querySelector(".submission-contributor").textContent = `Assigned to: ${assignedNames.join(", ") || fallbackName}`;
        card.querySelector(".submission-date").textContent = submittedAt;
        card.querySelector(".submission-status").textContent = status;
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
    const params = new URLSearchParams(window.location.search);
    const projId = params.get("projId") || getProjId();
    if (params.get("projId")) sessionStorage.setItem("hive_selected_project", params.get("projId"));
    if (!projId) return [];
    const { data, error } = await supa()
        .from("TASK")
        .select("taskId, taskName, taskDesc, taskDueD, taskIntensity, taskPrio, taskResource, taskSpan, taskAcmD, statId, wasRevising, teacherApproved, STATUS(statName), PROJECT(grpId), TASKASSIGNMENT(grpmemId, assignedAt, GROUPMEMBER(userId, USER(userDisplayName, avatarPath)))")
        .eq("projId", Number(projId));
    if (error || !data) return [];
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
        projectGroupId: t.PROJECT?.grpId || null,
        assignees: (t.TASKASSIGNMENT || []).map(a => ({
            grpmemId: a.grpmemId,
            assignedAt: a.assignedAt || null,
            userId: a.GROUPMEMBER?.userId,
            name: a.GROUPMEMBER?.USER?.userDisplayName || "Member",
            avatarPath: a.GROUPMEMBER?.USER?.avatarPath || null
        }))
    }));
    const statusOrder = { active: 0, pause: 1, revising: 2, verifying: 3, inactive: 4, missing: 5, finished: 6 };
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

const loadTaskAssigner = async (task) => {
    if (!task?.projectGroupId || !supa()) return "Project Leader";
    const { data: leaders } = await supa()
        .from("GROUPMEMBER")
        .select("ROLE(roleName), USER(userDisplayName)")
        .eq("grpId", task.projectGroupId);
    const leader = (leaders || []).find((member) => String(member.ROLE?.roleName || "").toLowerCase() === "leader");
    if (leader?.USER?.userDisplayName) return leader.USER.userDisplayName;

    const { data: group } = await supa().from("GROUP").select("teacherId").eq("grpId", task.projectGroupId).maybeSingle();
    if (!group?.teacherId) return "Project Leader";
    const { data: teacher } = await supa().from("USER").select("userDisplayName").eq("userId", group.teacherId).maybeSingle();
    return teacher?.userDisplayName || "Project Leader";
};

const formatAssignedDate = (assignedAt) => {
    if (!assignedAt) return "--/--/----";
    const date = new Date(assignedAt);
    return Number.isNaN(date.getTime()) ? "--/--/----" : date.toLocaleDateString("en-US");
};

const notifyCooldownKey = (taskId) => `hive_task_notify_${currentUserId}_${taskId}`;

const isCurrentUserProjectManager = async (groupId) => {
    if (!groupId || !currentUserId || !supa()) return false;
    const [{ data: group }, { data: membership }] = await Promise.all([
        supa().from("GROUP").select("parentGrpId").eq("grpId", Number(groupId)).maybeSingle(),
        supa().from("GROUPMEMBER").select("ROLE(roleName)").eq("grpId", Number(groupId)).eq("userId", currentUserId).maybeSingle()
    ]);
    return Boolean(group?.parentGrpId && String(membership?.ROLE?.roleName || "").trim().toLowerCase() === "project manager");
};

const updateNotifyCooldownLabel = (button, taskId) => {
    const cooldownUntil = Number(localStorage.getItem(notifyCooldownKey(taskId)) || 0);
    const remainingMs = cooldownUntil - Date.now();
    if (remainingMs <= 0) {
        localStorage.removeItem(notifyCooldownKey(taskId));
        button.textContent = "Notify Assignee(s)";
        button.disabled = false;
        return false;
    }
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    button.textContent = `Notify Assignee(s) (${remainingMinutes}m)`;
    button.disabled = true;
    return true;
};

const configureUnassignedTaskActions = (task, projectManagerView = false) => {
    if (!pageTaskStart || !pageTaskSubmit) return;
    pageTaskStart.textContent = "Notify Assignee(s)";
    pageTaskSubmit.textContent = "Volunteer";
    pageTaskSubmit.hidden = projectManagerView;
    if (taskDetailMoreBtn) taskDetailMoreBtn.hidden = projectManagerView;
    pageTaskStart.disabled = task.assignees.length === 0 || updateNotifyCooldownLabel(pageTaskStart, task.taskId);
    pageTaskSubmit.disabled = isTerminal(task.status) || task.status === "verifying";
    pageTaskStart.onclick = async () => {
        if (updateNotifyCooldownLabel(pageTaskStart, task.taskId)) return;
        const now = new Date().toISOString();
        const notificationRows = task.assignees
            .filter((assignee) => assignee.userId && assignee.userId !== currentUserId)
            .map((assignee) => ({
                notiTitle: "Task Work Requested",
                notiBody: `You have been notified to work on task "${task.name}".`,
                "notiDate&Time": now,
                notiIsRead: false,
                grpmemId: assignee.grpmemId,
                userId: assignee.userId,
                grpId: task.projectGroupId
            }));
        if (!notificationRows.length) return;
        const { error } = await supa().from("NOTIFICATION").insert(notificationRows);
        if (error) {
            showAlert(`Failed to notify assignees: ${error.message}`, { title: "Error" });
            return;
        }
        localStorage.setItem(notifyCooldownKey(task.taskId), String(Date.now() + 60 * 60 * 1000));
        updateNotifyCooldownLabel(pageTaskStart, task.taskId);
    };
    pageTaskSubmit.onclick = () => {
        showConfirmation(`Volunteer for the task "${task.name}"?`, async () => {
            const { data: membership } = await supa()
                .from("GROUPMEMBER")
                .select("grpmemId")
                .eq("grpId", task.projectGroupId)
                .eq("userId", currentUserId)
                .maybeSingle();
            if (!membership?.grpmemId) {
                showAlert("You must be a member of this group to volunteer.", { title: "Unable to Volunteer" });
                return;
            }
            const { error } = await supa().from("TASKASSIGNMENT").insert({
                taskId: task.taskId,
                grpmemId: membership.grpmemId,
                assignedAt: new Date().toISOString()
            });
            if (error) {
                showAlert(`Failed to volunteer: ${error.message}`, { title: "Error" });
                return;
            }
            await renderTaskDetailPage();
        }, { title: "Volunteer for Task", confirmText: "Volunteer", cancelText: "Cancel" });
    };
};

const renderTaskDetailPage = async () => {
    const taskId = Number(getTaskId());
    const tasks = await loadTasks();
    const task = tasks.find((item) => item.taskId === taskId);
    if (!task) return;
    activeTaskIndex = tasks.findIndex((item) => item.taskId === taskId);
    if (pageTaskName) pageTaskName.textContent = task.name || "Task";
    if (pageTaskAssigner) pageTaskAssigner.textContent = await loadTaskAssigner(task);
    const assignedAt = task.assignees
        .map((assignee) => assignee.assignedAt)
        .filter(Boolean)
        .sort()[0];
    if (pageTaskAssignedDate) pageTaskAssignedDate.textContent = formatAssignedDate(assignedAt);
    if (pageTaskDueDate) {
        const dueDate = task.dueDate || "--/--/----";
        const dueTime = task.dueTime ? formatTime12h(task.dueTime) : "--:--";
        pageTaskDueDate.textContent = `${dueDate} ${dueTime}`;
    }
    if (pageTaskAssigneeCount) pageTaskAssigneeCount.textContent = task.assignees.length;
    if (pageTaskAssigneeAvatars) {
        const visibleAssignees = task.assignees.length > 3 ? task.assignees.slice(0, 2) : task.assignees.slice(0, 3);
        const avatarElements = visibleAssignees.map((assignee) => {
            const avatar = document.createElement("img");
            avatar.src = resolveAvatarUrl(assignee.avatarPath);
            avatar.alt = assignee.name;
            avatar.title = assignee.name;
            avatar.className = "task-detail-assignee-avatar";
            return avatar;
        });
        if (task.assignees.length > 3) {
            const overflow = document.createElement("span");
            overflow.className = "task-detail-assignee-overflow";
            overflow.textContent = `+${task.assignees.length - 2}`;
            overflow.title = `${task.assignees.length - 2} more assignees`;
            overflow.setAttribute("aria-label", `${task.assignees.length - 2} more assignees`);
            avatarElements.push(overflow);
        }
        pageTaskAssigneeAvatars.replaceChildren(...avatarElements);
    }
    if (pageTaskAssigneeList) {
        pageTaskAssigneeList.replaceChildren(...task.assignees.map((assignee) => {
            const item = document.createElement("li");
            item.textContent = assignee.name;
            return item;
        }));
    }
    if (pageTaskAssigneeInfo) pageTaskAssigneeInfo.disabled = task.assignees.length === 0;
    if (pageTaskIntensity) pageTaskIntensity.textContent = task.intensity || "Medium";
    if (pageTaskPriority) pageTaskPriority.textContent = task.priority || "Medium";
    if (pageTaskDescription) pageTaskDescription.textContent = task.description || "No description provided.";
    if (pageTaskResources) pageTaskResources.textContent = task.resources || "";
    if (copyTaskResourceBtn) {
        copyTaskResourceBtn.disabled = !task.resources;
        copyTaskResourceBtn.textContent = "Copy Link";
    }
    if (pageTaskStatus) pageTaskStatus.textContent = `${STATUS_TEXT[task.status] || "Not Active"}${task.wasRevising ? " - Revising" : ""}`;
    if (pageTaskActiveTime) pageTaskActiveTime.textContent = formatElapsedTime(getTotalElapsedMs(task));
    window._pageTaskRef = task;
    const isStartLocked = isTerminal(task.status) || task.status === "verifying";
    const isSubmitLocked = task.status === "finished" || task.status === "verifying";
    const isAssignedToCurrentUser = task.assignees.some((assignee) => assignee.userId === currentUserId);
    const projectManagerView = await isCurrentUserProjectManager(task.projectGroupId);
    if (projectManagerView) {
        configureUnassignedTaskActions(task, true);
        return;
    }
    if (!isAssignedToCurrentUser) {
        configureUnassignedTaskActions(task, false);
        return;
    }
    if (pageTaskStart) {
        pageTaskStart.textContent = task.status === "active" ? "Take a Break" : "Start Task";
        pageTaskStart.disabled = isStartLocked;
        pageTaskStart.onclick = async () => {
            const nextStatus = task.status === "active" ? "pause" : "active";
            if (!await updateTaskStatus(task.taskId, nextStatus, task)) return;
            task.status = nextStatus;
            task.acmD = nextStatus === "active" ? new Date().toISOString() : null;
            pageTaskStatus.textContent = STATUS_TEXT[nextStatus];
            pageTaskActiveTime.textContent = formatElapsedTime(getTotalElapsedMs(task));
            pageTaskStart.textContent = nextStatus === "active" ? "Take a Break" : "Start Task";
            pageTaskSubmit.disabled = false;
        };
    }
    if (pageTaskSubmit) {
        pageTaskSubmit.disabled = isSubmitLocked;
        pageTaskSubmit.onclick = async () => {
            const submittingAssignee = task.assignees.find((assignee) => assignee.userId === currentUserId);
            if (submittingAssignee) {
                const { error } = await supa().from("SUBMISSION").insert({
                    taskId: task.taskId,
                    grpmemId: submittingAssignee.grpmemId,
                    submittedAt: new Date().toISOString(),
                    status: "pending",
                    isRevised: false
                });
                if (error) {
                    showAlert(`Failed to submit task: ${error.message}`, { title: "Submission Error" });
                    return;
                }
                const grpId = getGrpId();
                const [{ data: taskRecipients }, { data: submitter }] = await Promise.all([
                    supa().from("GROUPMEMBER").select("userId, ROLE(roleName)").eq("grpId", Number(grpId)),
                    supa().from("USER").select("userDisplayName").eq("userId", currentUserId).maybeSingle()
                ]);
                const recipientIds = (taskRecipients || [])
                    .filter((member) => ["leader", "teacher", "project manager"].includes(String(member.ROLE?.roleName || "").trim().toLowerCase()))
                    .map((member) => member.userId)
                    .filter((userId) => userId !== currentUserId);
                await hiveNotificationEvents.notifyUsers(supa(), {
                    userIds: recipientIds,
                    grpId,
                    title: "Task Submitted",
                    body: `${submitter?.userDisplayName || "An assignee"} submitted the task "${task.name}" for review.`
                });
            }
            if (!await updateTaskStatus(task.taskId, "verifying", task)) return;
            const grpId = getGrpId();
            const { data: leaderRole } = await supa().from("ROLE").select("roleId").eq("roleName", "Leader").maybeSingle();
            const { data: leaderMembership } = await supa().from("GROUPMEMBER")
                .select("grpmemId")
                .eq("grpId", Number(grpId))
                .eq("userId", currentUserId)
                .eq("roleId", leaderRole?.roleId)
                .maybeSingle();
            const breakdownPath = leaderMembership ? "leader/s.leaderprojectbreakdown.html" : "member/s.memberprojectbreakdown.html";
            window.location.href = `${breakdownPath}?grpId=${encodeURIComponent(grpId || "")}`;
        };
    }
};

taskDetailMoreBtn?.addEventListener("click", () => {
    if (activeTaskIndex !== null) openTaskSettings(activeTaskIndex);
});

const copyTaskResource = async () => {
    const resource = pageTaskResources?.textContent?.trim();
    if (!resource || !copyTaskResourceBtn) return;

    try {
        await navigator.clipboard.writeText(resource);
    } catch (error) {
        const copyArea = document.createElement("textarea");
        copyArea.value = resource;
        copyArea.style.position = "fixed";
        copyArea.style.opacity = "0";
        document.body.appendChild(copyArea);
        copyArea.select();
        document.execCommand("copy");
        copyArea.remove();
    }

    copyTaskResourceBtn.textContent = "Copied";
    window.setTimeout(() => {
        copyTaskResourceBtn.textContent = "Copy Link";
    }, 1200);
};

copyTaskResourceBtn?.addEventListener("click", copyTaskResource);

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

    if (slugStatus === "finished") updates.wasRevising = false;
    const { error: taskError } = await supa().from("TASK").update(updates).eq("taskId", taskId);
    if (taskError) {
        showAlert(`Could not update the task: ${taskError.message}`, { title: "Task Update Error" });
        return false;
    }

    // Send notification when leader finishes a task
    if (slugStatus === "finished") {
        try {
            const { data: { user } } = await supa().auth.getUser();
            const { data: membership } = await supa().from("GROUPMEMBER").select("ROLE(roleName)").eq("grpId", Number(getGrpId())).eq("userId", user?.id).maybeSingle();
            if (membership?.ROLE?.roleName?.toLowerCase() !== "leader") return true;
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
    return true;
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
    const { data: sub } = await supa()
        .from("SUBMISSION")
        .select("subId, proofLink")
        .eq("taskId", taskId)
        .order("submittedAt", { ascending: false })
        .limit(1)
        .maybeSingle();

    _verifySubmissionId = sub?.subId || null;
    const proofEl = document.querySelector("#verifyProofLink");
    const noteEl  = document.querySelector("#leaderNoteInput");
    if (proofEl) {
        if (sub?.proofLink) {
            proofEl.innerHTML = `<a href="${sub.proofLink}" target="_blank" rel="noopener">${sub.proofLink}</a>`;
        } else {
            proofEl.textContent = "No proof submitted";
        }
    }
    if (noteEl) noteEl.value = "";

    verifyChoiceCallback = { onFinish, onRevise };
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
        const note = document.querySelector("#leaderNoteInput")?.value.trim() || null;
        if (_verifySubmissionId) {
            await supa().from("SUBMISSION").update({ status: "approved", leaderNote: note }).eq("subId", _verifySubmissionId);
        }
        verifyChoiceCallback?.onFinish?.();
        closeVerifyChoice();
    });
}

if (verifyReviseBtn) {
    verifyReviseBtn.addEventListener("click", async () => {
        const note = document.querySelector("#leaderNoteInput")?.value.trim() || null;
        if (_verifySubmissionId) {
            await supa().from("SUBMISSION").update({ status: "rejected", leaderNote: note }).eq("subId", _verifySubmissionId);
        }
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
            else if (cur==="active") openLeaderActiveChoice(
                () => { task._prePauseStatus = cur; setStatus("pause"); },
                () => setStatus("finished")
            );
            else if (cur==="pause") await setStatus("active");
            else if (cur==="verifying") openVerifyChoice(task.taskId, ()=>setStatus("finished"), ()=>setStatus("active"));
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
            <p class="task-time-row">Active Timespan: ${timeHtml}</p>
        </div>
        <div class="task-due">
            <span>Due Date: ${task.dueDate || "--/--/----"}</span>
            <span>Due Time: ${task.dueTime || "--:--"}</span>
        </div>
        <div class="task-actions">
            <button class="task-status ${status}" type="button">${STATUS_TEXT[status]||status}</button>
        </div>`;
    const statusBtn=article.querySelector(".task-status");
    if(isTerminal(status)||status==="verifying") statusBtn.disabled=true;
    attachLeaderStatusBtn(statusBtn,task,isOwnTask);
    article.addEventListener("click",()=>openTaskDetails(idx));
    target.appendChild(article);
};

const renderAllTasks = async () => {
    const tasks=(await loadTasks()).filter(task => task.status !== "finished" && task.status !== "verifying");
    const yl=document.querySelector("#yourTasksList"); const ol=document.querySelector("#otherTasksList");
    if(yl) yl.innerHTML=""; if(ol) ol.innerHTML="";
    let own=0,other=0,verify=0;
    for(let i=0;i<tasks.length;i++){
        const t=tasks[i]; const mine=t.assignees.some(a=>a.userId===currentUserId);
        await renderTask(t,i,mine,yl);
        if(mine) own++; else other++;
        if(t.status==="verifying") verify++;
    }
    if(yl&&own===0) yl.innerHTML=`<div class="empty-state task-empty-placeholder"><img src="../../assets/bee-flight.svg" class="empty-state-icon" alt=""><h2>You Have No Pending Tasks Yet</h2><p>Check back later or explore your projects to find other's unfinished tasks and help them like a good team member.</p></div>`;
    if(ol&&other===0) ol.innerHTML=`<div class="empty-state task-empty-placeholder"><img src="../../assets/bee-flight.svg" class="empty-state-icon" alt=""><h2>You Have No Pending Tasks Yet</h2><p>Check back later or explore your projects to find other's unfinished tasks and help them like a good team member.</p></div>`;
    const sc=document.querySelectorAll(".summary-card h3");
    if(sc[0]) sc[0].textContent=own; if(sc[1]) sc[1].textContent=other; if(sc[2]) sc[2].textContent=verify;
};

const formatProjectDate = (value) => {
    if (!value) return "--/--/----";
    const date = new Date(`${value}T00:00:00`);
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
if (projectBackLink) projectBackLink.addEventListener("click", () => { window.location.href = "s.leadergrpviewing.html"; });

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
        if (window._pageTaskRef && window._pageTaskRef.status === "active" && pageTaskActiveTime) {
            pageTaskActiveTime.textContent = formatElapsedTime(getTotalElapsedMs(window._pageTaskRef));
        }
    }, 1000);
}

const closeTaskSettings=()=>{
    if (!taskSettingsOverlay) return;
    taskSettingsOverlay.hidden = true;
    taskSettingsOverlay.setAttribute("aria-hidden", "true");
};
const openTaskSettings=(i)=>{
    if (!taskSettingsOverlay || !taskDetailMoreBtn) return;
    activeTaskIndex = i;
    const buttonRect = taskDetailMoreBtn.getBoundingClientRect();
    const menuWidth = Math.min(300, window.innerWidth - 32);
    const menuHeight = 3 * 58 + 2 * 8;
    const belowTop = buttonRect.bottom + 8;
    const aboveTop = buttonRect.top - menuHeight - 8;
    const top = belowTop + menuHeight <= window.innerHeight - 16
        ? belowTop
        : Math.max(16, aboveTop);
    taskSettingsOverlay.style.top = `${top}px`;
    taskSettingsOverlay.style.left = `${Math.max(16, buttonRect.right - menuWidth)}px`;
    taskSettingsOverlay.hidden = false;
    taskSettingsOverlay.setAttribute("aria-hidden", "false");
};
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

if(topBackBtn) topBackBtn.addEventListener("click",()=>{window.location.href="s.dashb.html";});
if(groupInfoTab) groupInfoTab.addEventListener("click",()=>{window.location.href="s.leadergrpviewing.html";});

if(backToCategoriesBtn) backToCategoriesBtn.addEventListener("click",()=>{window.location.href="s.leadercategory.html";});
if(openEditTaskInfoBtn) openEditTaskInfoBtn.addEventListener("click",()=>{closeTaskSettings();openEditTaskInfo();});
if(discardEditTaskInfoBtn) discardEditTaskInfoBtn.addEventListener("click",closeEditTaskInfo);
if(editTaskInfoOverlay) editTaskInfoOverlay.addEventListener("click",e=>{if(e.target===editTaskInfoOverlay)closeEditTaskInfo();});
if(openManualStatusBtn) openManualStatusBtn.addEventListener("click",()=>{closeTaskSettings();openManualStatus();});
if(discardManualStatusBtn) discardManualStatusBtn.addEventListener("click",closeManualStatus);
if(manualStatusOverlay) manualStatusOverlay.addEventListener("click",e=>{if(e.target===manualStatusOverlay)closeManualStatus();});
if(openRemoveTaskConfirmBtn) openRemoveTaskConfirmBtn.addEventListener("click",()=>{closeTaskSettings();openRemoveTaskConfirm();});
document.addEventListener("click", (event) => {
    if (!taskSettingsOverlay?.hidden && !event.target.closest("#taskSettingsOverlay, #taskDetailMoreBtn")) closeTaskSettings();
});
if(discardRemoveTaskBtn) discardRemoveTaskBtn.addEventListener("click",closeRemoveTaskConfirm);
if(removeTaskConfirmOverlay) removeTaskConfirmOverlay.addEventListener("click",e=>{if(e.target===removeTaskConfirmOverlay)closeRemoveTaskConfirm();});
if(closeTaskDetailsBtn) closeTaskDetailsBtn.addEventListener("click",closeTaskDetails);
if(taskDetailsOverlay) taskDetailsOverlay.addEventListener("click",e=>{if(e.target===taskDetailsOverlay)closeTaskDetails();});
if(taskDetailBack) taskDetailBack.addEventListener("click", () => { window.history.back(); });

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
                await supa().from("TASKASSIGNMENT").insert({ taskId: newTask.taskId, grpmemId });
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
                await supa().from("TASKASSIGNMENT").insert({ taskId: task.taskId, grpmemId });
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
    if (startDate) startDate.textContent = formatProjectDate(project?.projStartD);
    if (dueDate) dueDate.textContent = formatProjectDate(project?.projDueD);
    const description = document.querySelector("#projectDescription");
    if (description) description.textContent = project?.projDesc || "No project description provided.";
    const validationLink=document.querySelector(".validation-link");
    if(validationLink){
        const pid=getProjId(), gid=getGrpId();
        validationLink.href=`../validation/contribution-validation.html?mode=leader&projId=${pid||""}&grpId=${gid||""}`;
    }
    await renderAllTasks();
    await renderTaskDetailPage();
})();