const topBackBtn = document.querySelector("#topBackBtn");
const backToCategoriesBtn = document.querySelector("#backToCategoriesBtn");
const groupInfoTab = document.querySelector("#groupInfoTab");
const taskDetailsOverlay = document.querySelector("#taskDetailsOverlay");
const closeTaskDetailsBtn = document.querySelector("#closeTaskDetailsBtn");
const detailTaskName = document.querySelector("#detailTaskName");
const detailTaskDescription = document.querySelector("#detailTaskDescription");
const detailTaskAssignees = document.querySelector("#detailTaskAssignees");
const detailTaskDueDate = document.querySelector("#detailTaskDueDate");
const detailTaskDueTime = document.querySelector("#detailTaskDueTime");
const detailTaskIntensity = document.querySelector("#detailTaskIntensity");
const detailTaskPriority = document.querySelector("#detailTaskPriority");
const detailTaskTimeActive = document.querySelector("#detailTaskTimeActive");
const detailTaskStatus = document.querySelector("#detailTaskStatus");

const STATUS_TEXT = {
    inactive:  "Not Active",
    active:    "Active",
    pause:     "On Break",
    verifying: "Verifying",
    finished:  "Finished",
    missing:   "Missing",
    revising:  "Revising"
};

const isTerminal = (status) => status === "finished" || status === "missing";

const isPastDue = (task) => {
    if (!task.dueDate || !task.dueTime) return false;
    const due = new Date(`${task.dueDate}T${task.dueTime}`);
    return Date.now() > due.getTime();
};

const STORAGE_KEY_TASKS = "hive_leader_tasks";

const supa = () => window.hiveSupabase;
const getProjId = () => sessionStorage.getItem("hive_selected_project");
const getGrpId = () => sessionStorage.getItem("hive_grpId");

const STAT_SLUG = { 1: "inactive", 2: "active", 3: "pause", 4: "verifying", 5: "finished", 6: "missing", 7: "revising" };

const loadTasks = async () => {
    const projId = getProjId();
    if (!projId) return [];
    const { data, error } = await supa()
        .from("TASK")
        .select("taskId, taskName, taskDesc, taskDueD, taskIntensity, taskPrio, taskResource, taskSpan, taskAcmD, statId, teacherApproved, STATUS(statName), TASKASSIGNMENT(grpmemId, GROUPMEMBER(userId, USER(userDisplayName)))")
        .eq("projId", Number(projId));
    if (error || !data) return [];
    return data.map(t => ({
        taskId: t.taskId,
        name: t.taskName,
        description: t.taskDesc || "",
        dueDate: t.taskDueD ? t.taskDueD.split("T")[0] : "",
        dueTime: t.taskDueD ? t.taskDueD.split("T")[1]?.slice(0,5) : "",
        intensity: t.taskIntensity || "Light",
        priority: t.taskPrio || "Low",
        resources: t.taskResource || "",
        spanMs: intervalToMs(t.taskSpan),
        acmD: t.taskAcmD || null,
        teacherApproved: t.teacherApproved || false,
        status: STAT_SLUG[t.statId] || t.STATUS?.statName?.toLowerCase() || "inactive",
        statId: t.statId || 1,
        assignees: (t.TASKASSIGNMENT || []).map(a => a.GROUPMEMBER?.USER?.userDisplayName || "Member")
    }));
};

const formatTime12h = (timeStr) => {
    if (!timeStr) return "##:## AM";
    const [h, m] = timeStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
};

const formatElapsedTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
};

const intervalToMs = (interval) => {
    if (!interval) return 0;
    const match = interval.match(/(?:(\d+) days? ?)?(\d+):(\d+):(\d+)/);
    if (match) {
        const d = parseInt(match[1] || 0);
        const h = parseInt(match[2]);
        const m = parseInt(match[3]);
        const s = parseInt(match[4]);
        return ((d * 86400) + (h * 3600) + (m * 60) + s) * 1000;
    }
    const sec = interval.match(/(\d+(?:\.\d+)?)\s*seconds?/);
    if (sec) return Math.floor(parseFloat(sec[1]) * 1000);
    return 0;
};

const getTotalElapsedMs = (task) => {
    let total = task.spanMs || 0;
    if ((task.status === "active" || task.status === "revising") && task.acmD) {
        total += Date.now() - new Date(task.acmD).getTime();
    }
    return total;
};

if (!window._globalTaskTicker) {
    window._globalTaskTicker = setInterval(() => {
        document.querySelectorAll(".task-time-active[data-task-id]").forEach(el => {
            const acmD   = el.dataset.acmD;
            const spanMs = Number(el.dataset.spanMs || 0);
            if (!acmD) return;
            el.textContent = formatElapsedTime(spanMs + (Date.now() - new Date(acmD).getTime()));
        });
    }, 1000);
}

const closeTaskDetails = () => {
    if (!taskDetailsOverlay) return;
    taskDetailsOverlay.classList.remove("open");
    taskDetailsOverlay.setAttribute("aria-hidden", "true");
};

let _teacherRemarkSubId = null;

const openTaskDetails = async (taskIndex, tasks) => {
    if (!taskDetailsOverlay) return;

    const task = tasks[taskIndex];
    if (!task) return;

    if (detailTaskName) detailTaskName.textContent = task.name || "";
    if (detailTaskDescription) detailTaskDescription.textContent = task.description || "None";
    if (detailTaskAssignees) detailTaskAssignees.textContent = (task.assignees && task.assignees.length) ? task.assignees.join(", ") : "None";
    if (detailTaskDueDate) detailTaskDueDate.textContent = task.dueDate || "N/A";
    if (detailTaskDueTime) detailTaskDueTime.textContent = task.dueTime ? formatTime12h(task.dueTime) : "N/A";
    if (detailTaskIntensity) detailTaskIntensity.textContent = task.intensity || "Light";
    if (detailTaskPriority) detailTaskPriority.textContent = task.priority || "Low";

    if (detailTaskStatus) {
        const status = task.status || "inactive";
        detailTaskStatus.textContent = STATUS_TEXT[status] || status;
        detailTaskStatus.className = `task-status ${status}`;
        detailTaskStatus.disabled = true;
    }

    if (detailTaskTimeActive) {
        detailTaskTimeActive.textContent = formatElapsedTime(getTotalElapsedMs(task));
    }

    // Load latest submission
    const proofRow      = document.querySelector("#detailProofRow");
    const proofLink     = document.querySelector("#detailProofLink");
    const leaderNoteRow = document.querySelector("#detailLeaderNoteRow");
    const leaderNote    = document.querySelector("#detailLeaderNote");
    const teacherNoteRow= document.querySelector("#detailTeacherNoteRow");
    const teacherNote   = document.querySelector("#detailTeacherNote");
    const addRemarkBtn  = document.querySelector("#openTeacherRemarkBtn");

    _teacherRemarkSubId = null;
    if (proofRow) proofRow.style.display = "none";
    if (leaderNoteRow) leaderNoteRow.style.display = "none";
    if (teacherNoteRow) teacherNoteRow.style.display = "none";
    if (addRemarkBtn) addRemarkBtn.style.display = "none";

    const { data: sub } = await supa()
        .from("SUBMISSION")
        .select("subId, proofLink, leaderNote, teacherNote")
        .eq("taskId", task.taskId)
        .order("submittedAt", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (sub) {
        _teacherRemarkSubId = sub.subId;
        if (proofRow && proofLink && sub.proofLink) {
            proofLink.href = sub.proofLink;
            proofLink.textContent = sub.proofLink;
            proofRow.style.display = "";
        }
        if (leaderNoteRow && leaderNote && sub.leaderNote) {
            leaderNote.textContent = sub.leaderNote;
            leaderNoteRow.style.display = "";
        }
        if (teacherNoteRow && teacherNote && sub.teacherNote) {
            teacherNote.textContent = sub.teacherNote;
            teacherNoteRow.style.display = "";
        }
        if (addRemarkBtn) addRemarkBtn.style.display = "";
    }

    taskDetailsOverlay.classList.add("open");
    taskDetailsOverlay.setAttribute("aria-hidden", "false");
};

// Teacher remark modal
const teacherRemarkOverlay  = document.querySelector("#teacherRemarkOverlay");
const teacherRemarkInput    = document.querySelector("#teacherRemarkInput");
const saveTeacherRemarkBtn  = document.querySelector("#saveTeacherRemarkBtn");
const cancelTeacherRemarkBtn= document.querySelector("#cancelTeacherRemarkBtn");
const openTeacherRemarkBtn  = document.querySelector("#openTeacherRemarkBtn");

const closeTeacherRemark = () => {
    teacherRemarkOverlay?.classList.remove("open");
    teacherRemarkOverlay?.setAttribute("aria-hidden","true");
};

if (openTeacherRemarkBtn) {
    openTeacherRemarkBtn.addEventListener("click", () => {
        if (teacherRemarkInput) teacherRemarkInput.value = "";
        teacherRemarkOverlay?.classList.add("open");
        teacherRemarkOverlay?.setAttribute("aria-hidden","false");
    });
}

if (cancelTeacherRemarkBtn) cancelTeacherRemarkBtn.addEventListener("click", closeTeacherRemark);
if (teacherRemarkOverlay) teacherRemarkOverlay.addEventListener("click", e => { if(e.target===teacherRemarkOverlay) closeTeacherRemark(); });

if (saveTeacherRemarkBtn) {
    saveTeacherRemarkBtn.addEventListener("click", async () => {
        const remark = teacherRemarkInput?.value.trim();
        if (!remark || !_teacherRemarkSubId) return;
        await supa().from("SUBMISSION").update({ teacherNote: remark }).eq("subId", _teacherRemarkSubId);
        const teacherNoteEl  = document.querySelector("#detailTeacherNote");
        const teacherNoteRow = document.querySelector("#detailTeacherNoteRow");
        if (teacherNoteEl) teacherNoteEl.textContent = remark;
        if (teacherNoteRow) teacherNoteRow.style.display = "";
        closeTeacherRemark();
    });
}

const renderTask = (task, taskIndex, targetSection) => {
    if (!targetSection) return;

    const assigneeList = (task.assignees && task.assignees.length) ? task.assignees.join(", ") : "None";
    const timeDisplay = formatTime12h(task.dueTime);
    const dateDisplay = task.dueDate || "##/##/####";

    let status = task.status || "inactive";
    if (!isTerminal(status) && status !== "verifying" && isPastDue(task)) {
        status = "missing";
    }

    const article = document.createElement("article");
    article.className = "task-card task-card-clickable";

    const priority = (task.priority || "Low").toLowerCase();
    if (priority === "high") {
        article.style.backgroundColor = "#FF8383";
    } else if (priority === "medium") {
        article.style.backgroundColor = "#FFC193";
    }
    if (task.teacherApproved) article.style.backgroundColor = "#B8FFB8";

    const isRunning = status === "active" || status === "revising";
    const timeHtml = isRunning
        ? `<span class="task-time-active" data-task-id="${task.taskId}" data-acm-d="${task.acmD || ""}" data-span-ms="${task.spanMs || 0}">${formatElapsedTime(getTotalElapsedMs(task))}</span>`
        : (task.spanMs > 0 ? `<span class="task-time-active">${formatElapsedTime(task.spanMs)}</span>` : "");

    article.innerHTML = `
        <div class="task-left">
            <h3>Task: ${task.name}</h3>
            <p>
                Assignee(s):
                <span class="assignee-info-wrap">
                    <img class="assignee-info-icon" src="../assets/Info.png" alt="Info icon">
                    <span class="assignee-tooltip">${assigneeList}</span>
                </span>
                &nbsp; Due Date: ${timeDisplay} -- ${dateDisplay}
            </p>
            ${timeHtml}
        </div>
        <div class="task-actions">
            <button class="task-status ${status}" type="button" disabled>${STATUS_TEXT[status] || status}</button>
        </div>
    `;

    article.addEventListener("click", () => {
        openTaskDetails(taskIndex, window.currentTasks || []);
    });

    targetSection.appendChild(article);
};

const renderAllTasks = async () => {
    const tasks = await loadTasks();
    window.currentTasks = tasks;
    const tasksList = document.querySelector("#tasksList");
    if (tasksList) tasksList.innerHTML = "";

    let pendingVerifyCount = 0;

    tasks.forEach((task, index) => {
        renderTask(task, index, tasksList);

        if ((task.status || "").toLowerCase() === "verifying") {
            pendingVerifyCount += 1;
        }
    });

    if (tasksList && tasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <img src="../assets/Plus.png" class="empty-state-icon" alt="No tasks">
                <h3>No Tasks Available</h3>
                <p>There are no tasks currently listed for this project.</p>
            </div>
        `;
    }

    const summaryCards = document.querySelectorAll(".summary-card h3");
    if (summaryCards[0]) summaryCards[0].textContent = tasks.length;
    if (summaryCards[1]) summaryCards[1].textContent = pendingVerifyCount;
};

if (closeTaskDetailsBtn) {
    closeTaskDetailsBtn.addEventListener("click", closeTaskDetails);
}

if (taskDetailsOverlay) {
    taskDetailsOverlay.addEventListener("click", (event) => {
        if (event.target === taskDetailsOverlay) closeTaskDetails();
    });
}

if (topBackBtn) {
    topBackBtn.addEventListener("click", () => {
        window.location.href = "t.dashb.html";
    });
}

if (groupInfoTab) {
    groupInfoTab.addEventListener("click", () => {
        const grpId = sessionStorage.getItem("hive_grpId");
        window.location.href = `t.grpviewing.html${grpId ? `?grpId=${grpId}` : ""}`;;
    });
}

if (backToCategoriesBtn) {
    backToCategoriesBtn.addEventListener("click", () => {
        window.location.href = "t.category.html";
    });
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeTaskDetails();
    }
});

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

const loadAndDisplayProjectName = () => {
    const projectName = sessionStorage.getItem("hive_selected_project_name");
    const projectNameDisplay = document.querySelector(".project-name-display h2");
    if (projectName && projectNameDisplay) {
        projectNameDisplay.textContent = projectName;
    }
};

loadAndDisplayProjectName();
const _validationLink = document.querySelector(".validation-link");
if (_validationLink) {
    const _pid = getProjId(), _gid = getGrpId();
    _validationLink.href = `../student/validation/contribution-validation.html?mode=teacher&projId=${_pid || ""}&grpId=${_gid || ""}`;
}
renderAllTasks();