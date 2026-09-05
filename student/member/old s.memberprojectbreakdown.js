const topBackBtn = document.querySelector("#topBackBtn");
const backToCategoriesBtn = document.querySelector("#backToCategoriesBtn");
const groupInfoTab = document.querySelector("#groupInfoTab");
const logoutBtn = document.querySelector(".logout");

const supa = () => window.hiveSupabase;

const getGrpId = () => 
    new URLSearchParams(window.location.search).get("grpId") ||
    sessionStorage.getItem("hive_grpId");

const getProjId = () => 
    new URLSearchParams(window.location.search).get("projId") ||
    sessionStorage.getItem("hive_selected_project");

const getCurrentUserId = async () => {
    const { data: { user } } = await supa().auth.getUser();
    return user?.id || null;
};

const STAT_ID   = { inactive:1, active:2, pause:3, verifying:4, finished:5, missing:6, revising:7 };
const STAT_SLUG = { 1: "inactive", 2: "active", 3: "pause", 4: "verifying", 5: "finished", 6: "missing", 7: "revising" };
const STATUS_TEXT = { inactive: "Not Active", active: "Active", pause: "On Break", verifying: "Verifying", finished: "Finished", missing: "Missing", revising: "Revising" };

const isTerminal = (s) => s === "finished" || s === "missing";
const isPastDue = (t) => !(!t.dueDate || !t.dueTime) && Date.now() > new Date(`${t.dueDate}T${t.dueTime}`).getTime();

const formatTime12h = (t) => {
    if (!t) return "##:## AM";
    const [h, m] = t.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
};

const formatElapsedTime = (ms) => {
    const s = Math.floor((ms || 0) / 1000);
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
};

const loadTasks = async () => {
    const projId = getProjId();
    if (!projId) return [];
    const { data, error } = await supa()
        .from("TASK")
        .select("taskId, taskName, taskDesc, taskDueD, taskIntensity, taskPrio, taskResource, taskSpan, taskAcmD, statId, wasRevising, teacherApproved, STATUS(statName), TASKASSIGNMENT(grpmemId, GROUPMEMBER(userId, USER(userDisplayName)))")
        .eq("projId", Number(projId));
    if (error || !data) return [];
    return data.map(t => ({
        taskId: t.taskId,
        name: t.taskName,
        description: t.taskDesc || "",
        dueDate: t.taskDueD ? t.taskDueD.split("T")[0] : "",
        dueTime: t.taskDueD ? t.taskDueD.split("T")[1]?.slice(0, 5) : "",
        intensity: t.taskIntensity || "Light",
        priority: t.taskPrio || "Low",
        resources: t.taskResource || "",
        spanMs: intervalToMs(t.taskSpan),
        acmD: t.taskAcmD || null,
        status: STAT_SLUG[t.statId] || t.STATUS?.statName?.toLowerCase() || "inactive",
        statId: t.statId || 1,
        wasRevising: t.wasRevising || false,
        teacherApproved: t.teacherApproved || false,
        assignees: (t.TASKASSIGNMENT || []).map(a => ({
            grpmemId: a.grpmemId,
            userId: a.GROUPMEMBER?.userId,
            name: a.GROUPMEMBER?.USER?.userDisplayName || "Member"
        }))
    }));
};

const intervalToMs = (interval) => {
    if (!interval) return 0;
    const match = interval.match(/(?:(\d+) days? ?)?(\d+):(\d+):(\d+)/);
    if (match) {
        const days = parseInt(match[1] || 0);
        const h = parseInt(match[2]);
        const m = parseInt(match[3]);
        const s = parseInt(match[4]);
        return ((days * 86400) + (h * 3600) + (m * 60) + s) * 1000;
    }
    const secMatch = interval.match(/(\d+(?:\.\d+)?)\s*seconds?/);
    if (secMatch) return Math.floor(parseFloat(secMatch[1]) * 1000);
    return 0;
};

const getTotalElapsedMs = (task) => {
    let total = task.spanMs || 0;
    if ((task.status === "active" || task.status === "revising") && task.acmD) {
        total += Date.now() - new Date(task.acmD).getTime();
    }
    return total;
};

const updateMemberTaskStatus = async (taskId, slugStatus, task) => {
    const updates = { statId: STAT_ID[slugStatus] || 1 };
    const now = new Date().toISOString();
    if (slugStatus === "active" || slugStatus === "revising") {
        updates.taskAcmD = now;
    } else if (task?.acmD && (task?.status === "active" || task?.status === "revising")) {
        const elapsed = Date.now() - new Date(task.acmD).getTime();
        const newSpanMs = (task.spanMs || 0) + elapsed;
        const totalSec = Math.floor(newSpanMs / 1000);
        const h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), s = totalSec % 60;
        updates.taskSpan = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
        updates.taskAcmD = null;
        if (task) { task.spanMs = newSpanMs; task.acmD = null; }
    }
    await supa().from("TASK").update(updates).eq("taskId", taskId);
};

let _pauseVerifyTask = null;
let _pendingVerifyTask = null;

const closePauseVerifyChoice = () => {
    const el = document.querySelector("#pauseVerifyChoiceOverlay");
    el?.classList.remove("open"); el?.setAttribute("aria-hidden","true");
};
const openPauseVerifyChoice = () => {
    const el = document.querySelector("#pauseVerifyChoiceOverlay");
    el?.classList.add("open"); el?.setAttribute("aria-hidden","false");
};
const closeMemberVerifyOverlay = () => {
    const el = document.querySelector("#memberVerifyOverlay");
    el?.classList.remove("open"); el?.setAttribute("aria-hidden","true");
};
const openMemberVerifyOverlay = () => {
    const el = document.querySelector("#memberVerifyOverlay");
    const inp = document.querySelector("#memberProofLinkInput");
    if (inp) inp.value = "";
    el?.classList.add("open"); el?.setAttribute("aria-hidden","false");
};

document.querySelector("#pauseVerifyPauseBtn")?.addEventListener("click", async () => {
    if (!_pauseVerifyTask) return;
    const { task, btn, currentUserId } = _pauseVerifyTask;
    await updateMemberTaskStatus(task.taskId, "pause", task);
    task.status = "pause"; task.acmD = null;
    btn.textContent = STATUS_TEXT["pause"]; btn.className = `task-status pause`;
    // Clear acmD on the DOM timer element so the ticker stops counting during pause
    const pauseCard = btn.closest("article");
    const pauseTimerEl = pauseCard?.querySelector(`.task-time-active[data-task-id="${task.taskId}"]`);
    if (pauseTimerEl) {
        delete pauseTimerEl.dataset.acmD;
        pauseTimerEl.dataset.spanMs = task.spanMs || 0;
        if (task.spanMs > 0) { pauseTimerEl.textContent = formatElapsedTime(task.spanMs); }
    }
    closePauseVerifyChoice();
    _pauseVerifyTask = null;
});

// Rename "Verify" button label to "Submit Revision" when in revision context
const _updateRevisionChoiceLabels = (isRevision) => {
    const verifyBtn = document.querySelector("#pauseVerifyVerifyBtn");
    if (verifyBtn) verifyBtn.textContent = isRevision ? "Submit Revision" : "Verify";
};

document.querySelector("#pauseVerifyVerifyBtn")?.addEventListener("click", () => {
    if (!_pauseVerifyTask) return;
    _pendingVerifyTask = _pauseVerifyTask;
    closePauseVerifyChoice();
    openMemberVerifyOverlay();
});

document.querySelector("#pauseVerifyCloseBtn")?.addEventListener("click", () => {
    closePauseVerifyChoice(); _pauseVerifyTask = null;
});

document.querySelector("#memberVerifyCancelBtn")?.addEventListener("click", () => {
    closeMemberVerifyOverlay(); _pendingVerifyTask = null;
});

document.querySelector("#memberVerifyConfirmBtn")?.addEventListener("click", async () => {
    if (!_pendingVerifyTask) return;
    const proofLink = document.querySelector("#memberProofLinkInput")?.value.trim();
    if (!proofLink) { showAlert("Please paste a proof link before submitting.", { title: "Missing Proof" }); return; }

    const { task, btn, currentUserId } = _pendingVerifyTask;
    const grpmemId = task.assignees.find(a => a.userId === currentUserId)?.grpmemId || null;

    await supa().from("SUBMISSION").insert({
        taskId: task.taskId,
        grpmemId,
        proofLink,
        submittedAt: new Date().toISOString(),
        status: "pending",
        isRevised: task.wasRevising || false
    });

    await updateMemberTaskStatus(task.taskId, "verifying", task);
    task.status = "verifying";
    btn.textContent = STATUS_TEXT["verifying"]; btn.className = "task-status verifying"; btn.disabled = true;

    // Notify the leader that a task is ready for review
    (async () => {
        try {
            const grpId = getGrpId();
            if (!grpId) return;
            const [{ data: leaderRole }, { data: memberProfile }] = await Promise.all([
                supa().from("ROLE").select("roleId").eq("roleName", "Leader").maybeSingle(),
                supa().from("USER").select("userDisplayName").eq("userId", currentUserId).maybeSingle()
            ]);
            const { data: leader } = await supa()
                .from("GROUPMEMBER").select("userId")
                .eq("grpId", Number(grpId)).eq("roleId", leaderRole?.roleId).maybeSingle();
            if (leader?.userId) {
                const memberName = memberProfile?.userDisplayName || "A member";
                await supa().from("NOTIFICATION").insert({
                    notiTitle: "Task Ready for Review",
                    notiBody: `${memberName} has submitted "${task.name}" for verification.`,
                    "notiDate&Time": new Date().toISOString(),
                    notiIsRead: false,
                    userId: leader.userId,
                    grpId: Number(grpId)
                });
            }
        } catch (e) {}
    })();

    closeMemberVerifyOverlay();
    _pendingVerifyTask = null;
});

document.querySelector("#pauseVerifyChoiceOverlay")?.addEventListener("click", e => {
    if (e.target === document.querySelector("#pauseVerifyChoiceOverlay")) { closePauseVerifyChoice(); _pauseVerifyTask = null; }
});
document.querySelector("#memberVerifyOverlay")?.addEventListener("click", e => {
    if (e.target === document.querySelector("#memberVerifyOverlay")) { closeMemberVerifyOverlay(); _pendingVerifyTask = null; }
});

const resumeTaskWithTimer = async (targetStatus, task, btn) => {
    await updateMemberTaskStatus(task.taskId, targetStatus, task);
    task.status = targetStatus; task.acmD = new Date().toISOString();
    btn.textContent = STATUS_TEXT[targetStatus]; btn.className = `task-status ${targetStatus}`;
    const card = btn.closest("article");
    const taskLeft = card?.querySelector(".task-left");
    if (taskLeft) {
        // Remove any existing timer spans (static or dynamic) to avoid duplicates
        card.querySelectorAll(".task-time-active").forEach(el => el.remove());
        const timerEl = document.createElement("span");
        timerEl.className = "task-time-active";
        timerEl.dataset.taskId = task.taskId;
        timerEl.dataset.acmD = task.acmD;
        timerEl.dataset.spanMs = task.spanMs || 0;
        timerEl.textContent = formatElapsedTime(getTotalElapsedMs(task));
        taskLeft.appendChild(timerEl);
    }
};

const attachMemberStatusBtn = (btn, task, currentUserId) => {
    btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const cur = task.status || "inactive";
        if (isTerminal(cur) || cur === "verifying") return;

        if (cur === "inactive") {
            await resumeTaskWithTimer("active", task, btn);
        } else if (cur === "pause") {
            // Resume to revising if this task is in a revision cycle, else active
            const resumeTo = task.wasRevising ? "revising" : "active";
            await resumeTaskWithTimer(resumeTo, task, btn);
        } else if (cur === "active") {
            _pauseVerifyTask = { task, btn, currentUserId };
            _updateRevisionChoiceLabels(false);
            openPauseVerifyChoice();
        } else if (cur === "revising") {
            _pauseVerifyTask = { task, btn, currentUserId };
            _updateRevisionChoiceLabels(true);
            openPauseVerifyChoice();
        }
    });
};

// ── Task popup ────────────────────────────────────────────────────────────
const popupOverlay   = document.querySelector("#overlay");
const closePopupBtn  = document.querySelector("#closePopupBtn");

const openTaskPopup = (task) => {
    if (!popupOverlay) return;
    const set = (sel, val) => { const el = popupOverlay.querySelector(sel); if (el) el.textContent = val; };
    set(".popup-task-name",    task.name || "");
    set(".popup-desc-text",    task.description || "None");
    set(".popup-resources-text", task.resources || "None");
    set(".popup-assignees",    task.assignees.map(a => a.name).join(", ") || "None");
    set("#popupDueDate",       task.dueDate || "N/A");
    set("#popupDueTime",       task.dueTime ? formatTime12h(task.dueTime) : "N/A");
    set("#popupIntensity",     task.intensity || "Light");
    set("#popupPriority",      task.priority || "Low");
    set("#popupTimeActive",    formatElapsedTime(getTotalElapsedMs(task)));
    const statusBtn = popupOverlay.querySelector("#popupStatusDisplay");
    if (statusBtn) {
        const s = task.status || "inactive";
        statusBtn.textContent = STATUS_TEXT[s] || s;
        statusBtn.className = `task-status ${s}`;
    }
    popupOverlay.classList.add("open");
    popupOverlay.setAttribute("aria-hidden", "false");
};

const closeTaskPopup = () => {
    popupOverlay?.classList.remove("open");
    popupOverlay?.setAttribute("aria-hidden", "true");
};

if (closePopupBtn) closePopupBtn.addEventListener("click", closeTaskPopup);
if (popupOverlay)  popupOverlay.addEventListener("click", e => { if (e.target === popupOverlay) closeTaskPopup(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeTaskPopup(); });

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

const renderTask = async (task, idx, isOwnTask, target, currentUserId) => {
    if (!target) return;
    if (!isTerminal(task.status) && task.status !== "verifying" && isPastDue(task)) {
        task.status = "missing";
        await updateMemberTaskStatus(task.taskId, "missing", task);
        notifyTaskMissing(task);
    }
    const assigneeNames = task.assignees.map(a => a.name).join(", ") || "None";
    const status = task.status || "inactive";
    const btnDisabled = !isOwnTask || isTerminal(status) || status === "verifying";
    const article = document.createElement("article");
    article.className = "task-card task-card-clickable";
    const priority = (task.priority || "Low").toLowerCase();
    if (priority === "high")   article.style.backgroundColor = "#FF8383";
    else if (priority === "medium") article.style.backgroundColor = "#FFC193";
    if (task.teacherApproved) article.style.backgroundColor = "#B8FFB8";
    const isRunning = status === "active" || status === "revising";
    const timeHtml = isRunning
        ? `<span class="task-time-active" data-task-id="${task.taskId}" data-acm-d="${task.acmD || ""}" data-span-ms="${task.spanMs || 0}">${formatElapsedTime(getTotalElapsedMs(task))}</span>`
        : (task.spanMs > 0 ? `<span class="task-time-active">${formatElapsedTime(task.spanMs)}</span>` : "");
    article.innerHTML = `
        <div class="task-left">
            <h3>Task: ${task.name}</h3>
            <p>Assignee(s): <span class="assignee-info-wrap"><img class="assignee-info-icon" src="../../assets/Info.png" alt="Info"><span class="assignee-tooltip">${assigneeNames}</span></span> &nbsp; Due Date: ${formatTime12h(task.dueTime)} -- ${task.dueDate || "##/##/####"}</p>
            ${timeHtml}
        </div>
        <div class="task-actions">
            <button class="task-status ${status}" type="button" ${btnDisabled ? "disabled" : ""}>${STATUS_TEXT[status] || status}</button>
        </div>`;
    const statusBtn = article.querySelector(".task-status");
    if (isOwnTask && !btnDisabled) attachMemberStatusBtn(statusBtn, task, currentUserId);
    article.addEventListener("click", () => { sessionStorage.setItem("hive_selected_project", String(getProjId?.() || "")); window.location.href = `../s.taskdt.html?taskId=${encodeURIComponent(task.taskId)}&grpId=${encodeURIComponent(getGrpId?.() || "")}&projId=${encodeURIComponent(getProjId?.() || "")}`; });
    target.appendChild(article);
};

const renderAllTasks = async (currentUserId) => {
    const tasks = await loadTasks();
    const yl = document.querySelector("#yourTasksList");
    const ol = document.querySelector("#otherTasksList");
    if (yl) yl.innerHTML = "";
    if (ol) ol.innerHTML = "";
    let own = 0, other = 0, verify = 0;
    for (let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        const mine = t.assignees.some(a => a.userId === currentUserId);
        await renderTask(t, i, mine, mine ? yl : ol, currentUserId);
        if (mine) own++;
        else other++;
        if (t.status === "verifying") verify++;
    }
    if (yl && own === 0) yl.innerHTML = `<div class="empty-state task-empty-placeholder"><img src="../../assets/bee-flight.svg" class="empty-state-icon" alt=""><h2>You Have No Pending Tasks Yet</h2><p>Check back later or explore your projects to find other's unfinished tasks and help them like a good team member.</p></div>`;
    if (ol && other === 0) ol.innerHTML = `<div class="empty-state task-empty-placeholder"><img src="../../assets/bee-flight.svg" class="empty-state-icon" alt=""><h2>You Have No Pending Tasks Yet</h2><p>Check back later or explore your projects to find other's unfinished tasks and help them like a good team member.</p></div>`;
    const sc = document.querySelectorAll(".summary-card h3");
    if (sc[0]) sc[0].textContent = own;
    if (sc[1]) sc[1].textContent = other;
    if (sc[2]) sc[2].textContent = verify;
};

if (!window._globalTaskTicker) {
    window._globalTaskTicker = setInterval(() => {
        document.querySelectorAll(".task-time-active[data-task-id]").forEach(el => {
            const acmD = el.dataset.acmD;
            const spanMs = Number(el.dataset.spanMs || 0);
            if (!acmD) return;
            const total = spanMs + (Date.now() - new Date(acmD).getTime());
            el.textContent = formatElapsedTime(total);
        });
    }, 1000);
}

if (topBackBtn) {
    topBackBtn.addEventListener("click", () => {
        window.location.href = "../s.dashb.html";
    });
}

if (backToCategoriesBtn) {
    backToCategoriesBtn.addEventListener("click", () => {
        window.location.href = "s.membercategory.html";
    });
}

if (groupInfoTab) {
    groupInfoTab.addEventListener("click", () => {
        const grpId = getGrpId();
        window.location.href = grpId ? `s.membergrpviewing.html?grpId=${grpId}` : "s.membergrpviewing.html";
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        showConfirmation(
            "Are you sure you want to log out?",
            () => window.doLogout?.(),
            {
                title: "Log Out",
                confirmText: "Log Out",
                cancelText: "Cancel",
            }
        );
    });
}

window.addEventListener("load", async () => {
    const currentUserId = await getCurrentUserId();
    const validationLink = document.querySelector(".validation-link");
    if (validationLink) {
        const pid = getProjId(), gid = getGrpId();
        validationLink.href = `../validation/contribution-validation.html?mode=member&projId=${pid || ""}&grpId=${gid || ""}`;
    }
    await renderAllTasks(currentUserId);
});