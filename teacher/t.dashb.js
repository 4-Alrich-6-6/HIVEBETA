const inviteId = new URLSearchParams(window.location.search).get("invite");
const storedInviteRole = String(localStorage.getItem("hive_role") || "").trim().toLowerCase();
if (inviteId && storedInviteRole === "student") {
    window.location.replace(`../student/s.dashb.html?invite=${encodeURIComponent(inviteId)}`);
}
const menuBtn = document.querySelector(".menu-btn");
const sidebar = document.querySelector("#sidebar");
const profileTrigger = document.querySelector("#profileTrigger");
const profileDropdown = document.querySelector("#profileDropdown");
const profileLogoutBtn = document.querySelector("#profileLogoutBtn");
const profileDropdownAvatar = document.querySelector("#profileDropdownAvatar");
const profileDropdownName = document.querySelector("#profileDropdownName");
const profileDropdownEmail = document.querySelector("#profileDropdownEmail");
const contributorProfileBtn = document.querySelector(".contributor-profile-btn");
const memberProfileOverlay = document.querySelector("#memberProfileOverlay");
const closeMemberProfileBtn = document.querySelector("#closeMemberProfileBtn");
const memberProfileAvatar = document.querySelector("#memberProfileAvatar");
const memberProfileRole = document.querySelector("#memberProfileRole");
const memberProfileName = document.querySelector("#memberProfileName");
const memberProfileField = document.querySelector("#memberProfileField");
const memberProfileEmail = document.querySelector("#memberProfileEmail");

if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", () => {
        sidebar.classList.toggle("open");
    });
}

// ─── DB: load groups from Supabase ───────────────────────────────────────────
let dashbData = { ownedGroups: [], joinedGroups: [], ongoingProjects: [], stats: { owned: 0, joined: 0, totalTeams: 0, createdTeams: 0, pending: 0 } };

const closeMemberProfile = () => {
    memberProfileOverlay?.classList.remove("open");
    memberProfileOverlay?.setAttribute("aria-hidden", "true");
};

const getProfileAverageScore = async (userId) => {
    const supabase = window.hiveSupabase;
    const { data: memberships, error: membershipError } = await supabase.from("GROUPMEMBER").select("grpmemId").eq("userId", userId);
    if (membershipError || !memberships?.length) return { score: null, calculation: "" };
    const memberIds = memberships.map((membership) => membership.grpmemId).filter(Boolean);
    const { data: assignments, error: assignmentError } = await supabase.from("TASKASSIGNMENT").select("taskId, grpmemId, assignedAt").in("grpmemId", memberIds);
    const taskIds = [...new Set((assignments || []).map((assignment) => assignment.taskId).filter(Boolean))];
    if (assignmentError || !taskIds.length) return { score: null, calculation: "" };
    const [{ data: tasks, error: taskError }, { data: submissions }] = await Promise.all([
        supabase.from("TASK").select("taskId, projId, taskDueD, statId").in("taskId", taskIds),
        supabase.from("SUBMISSION").select("taskId, grpmemId, submittedAt").in("taskId", taskIds)
    ]);
    if (taskError || !tasks?.length) return { score: null, calculation: "" };
    const assignmentsByTask = new Map((assignments || []).map((assignment) => [String(assignment.taskId), assignment]));
    const submissionsByTask = new Map((submissions || []).map((submission) => [`${submission.taskId}:${submission.grpmemId}`, submission]));
    const projects = new Map();
    tasks.forEach((task) => {
        const assignment = assignmentsByTask.get(String(task.taskId));
        if (!assignment || task.projId === null || task.projId === undefined) return;
        const projectTasks = projects.get(String(task.projId)) || [];
        projectTasks.push({ ...task, assignment, submission: submissionsByTask.get(`${task.taskId}:${assignment.grpmemId}`) });
        projects.set(String(task.projId), projectTasks);
    });
    const projectScores = [...projects.values()]
        .sort((first, second) => new Date(first[0].assignment.assignedAt || 0) - new Date(second[0].assignment.assignedAt || 0))
        .map((projectTasks) => {
        let score = 0;
        projectTasks.forEach((task) => {
            if (Number(task.statId) !== 5) return;
            const dueAt = Date.parse(task.taskDueD || "");
            const submittedAt = Date.parse(task.submission?.submittedAt || "");
            score += dueAt && submittedAt && submittedAt > dueAt ? 0.75 : 1;
        });
        return Math.round((score / projectTasks.length) * 100 * 10) / 10;
        });
    if (!projectScores.length) return { score: null, calculation: "" };
    const total = Math.round(projectScores.reduce((sum, score) => sum + score, 0) * 10) / 10;
    const average = Math.round((total / projectScores.length) * 10) / 10;
    const displayed = projectScores.length > 3 ? [Math.round(projectScores.slice(0, -2).reduce((sum, score) => sum + score, 0) * 10) / 10, ...projectScores.slice(-2)] : projectScores;
    return { score: average, calculation: `${displayed.map((score) => `${score}%`).join(" + ")} = ${total}% / ${projectScores.length} = ${average}%` };
};

const getProfileAverageReputation = async (userId) => {
    const supabase = window.hiveSupabase;
    const { data: history, error: historyError } = await supabase.from("TASKHISTORY").select("projId").eq("userId", userId).not("projId", "is", null);
    if (historyError || !history?.length) return { score: null, calculation: "" };
    const projectIds = [...new Set(history.map((task) => Number(task.projId)).filter(Number.isFinite))];
    const { data: memberships, error: membershipError } = await supabase.from("GROUPMEMBER").select("grpmemId").eq("userId", userId);
    if (membershipError || !memberships?.length) return { score: null, calculation: "" };
    const { data: evaluations, error: evaluationError } = await supabase.from("PEEREVAL").select("projId, evaluatedGrpmemId, evalRemarks, confirmed").in("projId", projectIds).in("evaluatedGrpmemId", memberships.map((membership) => membership.grpmemId));
    if (evaluationError || !evaluations?.length) return { score: null, calculation: "" };
    const ratingsByProject = new Map();
    evaluations.filter((evaluation) => evaluation.confirmed !== false).forEach((evaluation) => {
        const rating = Number(String(evaluation.evalRemarks || "").match(/(10|[0-9])\s*\/\s*10/)?.[1]);
        if (Number.isFinite(rating)) ratingsByProject.set(String(evaluation.projId), [...(ratingsByProject.get(String(evaluation.projId)) || []), rating]);
    });
    const projectAverages = [...ratingsByProject.values()].filter((ratings) => ratings.length).map((ratings) => ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length);
    if (!projectAverages.length) return { score: null, calculation: "" };
    const total = Math.round(projectAverages.reduce((sum, average) => sum + average, 0) * 10) / 10;
    const average = Math.round((total / projectAverages.length) * 10) / 10;
    const displayed = projectAverages.length > 3 ? [Math.round(projectAverages.slice(0, -2).reduce((sum, value) => sum + value, 0) * 10) / 10, ...projectAverages.slice(-2).map((value) => Math.round(value * 10) / 10)] : projectAverages.map((value) => Math.round(value * 10) / 10);
    return { score: average, calculation: `${displayed.map((value) => `${value}/10`).join(" + ")} = ${total}/10 / ${projectAverages.length} = ${average}/10` };
};

const getProfileScoreGrade = (score) => score >= 90 ? "S" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : score >= 50 ? "D" : "F";

const openContributorProfile = async () => {
    const supabase = window.hiveSupabase;
    const { data: { user } = {} } = await supabase?.auth.getUser() || {};
    if (!user || !memberProfileOverlay) return;
    const { data: profile } = await supabase.from("USER").select("userDisplayName, userEmail, avatarPath, PROGRAM(progName), DEPARTMENT(deptName)").eq("userId", user.id).maybeSingle();
    const member = {
        userId: user.id,
        fullName: profile?.userDisplayName || "Profile",
        email: profile?.userEmail || user.email || "",
        roleName: "Instructor",
        progName: profile?.PROGRAM?.progName || "",
        deptName: profile?.DEPARTMENT?.deptName || "",
        avatarPath: profile?.avatarPath || null
    };
    if (memberProfileRole) memberProfileRole.textContent = member.roleName;
    if (memberProfileRole) memberProfileRole.hidden = true;
    if (memberProfileName) memberProfileName.textContent = member.fullName;
    if (memberProfileField) memberProfileField.textContent = member.progName || member.deptName || "N/A";
    if (memberProfileEmail) { memberProfileEmail.textContent = member.email; memberProfileEmail.style.visibility = "hidden"; }
    const avatarUrl = member.avatarPath?.startsWith("http")
        ? member.avatarPath
        : (member.avatarPath ? supabase.storage.from("profilePicture").getPublicUrl(member.avatarPath).data?.publicUrl : "../assets/profile-placeholder.svg");
    if (memberProfileAvatar) memberProfileAvatar.innerHTML = `<img src="${avatarUrl || "../assets/profile-placeholder.svg"}" alt="${member.fullName} profile picture">`;
    memberProfileOverlay.classList.add("open");
    memberProfileOverlay.setAttribute("aria-hidden", "false");
    await window.memberProfileStats?.load(member);
    const [averageScore, averageReputation] = await Promise.all([getProfileAverageScore(user.id), getProfileAverageReputation(user.id)]);
    const scoreElement = document.querySelector("#memberProfileAverageScore");
    const reputationElement = document.querySelector("#memberProfileAverageReputation");
    const scoreCalculation = document.querySelector("#memberProfileScoreCalculation");
    const reputationCalculation = document.querySelector("#memberProfileReputationCalculation");
    if (scoreElement) scoreElement.textContent = averageScore.score === null ? "N/A" : getProfileScoreGrade(averageScore.score);
    if (reputationElement) reputationElement.textContent = averageReputation.score === null ? "N/A" : `${averageReputation.score}/10`;
    if (scoreCalculation) {
        scoreCalculation.textContent = averageScore.calculation || "Not Rated Yet";
        scoreCalculation.hidden = !averageScore.calculation;
    }
    if (reputationCalculation) {
        reputationCalculation.textContent = averageReputation.calculation || "N/A";
        reputationCalculation.hidden = !averageReputation.calculation;
    }
};

contributorProfileBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    openContributorProfile();
});
closeMemberProfileBtn?.addEventListener("click", closeMemberProfile);
memberProfileOverlay?.addEventListener("click", (event) => {
    if (event.target === memberProfileOverlay) closeMemberProfile();
});
let recentVisitsKey = "hive_recent_team_visits";

const getRecentVisits = () => {
    try {
        const visits = JSON.parse(localStorage.getItem(recentVisitsKey) || "{}");
        return visits && typeof visits === "object" ? visits : {};
    } catch {
        return {};
    }
};

const recordTeamVisit = (grpId) => {
    const visits = getRecentVisits();
    visits[String(grpId)] = Date.now();
    localStorage.setItem(recentVisitsKey, JSON.stringify(visits));
};

const formatProjectDueDate = (value) => {
    if (!value) return "Due: --/--/----";
    const [year, month, day] = String(value).split("-");
    return year && month && day ? `Due: ${month}/${day}/${year}` : "Due: --/--/----";
};

// ─── Helper: Get pending task count for current user ───────────────────────
const getUserPendingTaskCount = async (userId) => {
    const supabase = window.hiveSupabase;
    if (!supabase) return 0;

    try {
        // Get all group memberships for this user
        const { data: memberships } = await supabase
            .from("GROUPMEMBER")
            .select("grpmemId")
            .eq("userId", userId);

        if (!memberships?.length) return 0;

        const grpmemIds = memberships.map(m => m.grpmemId);

        // Get all task assignments
        const { data: assignments } = await supabase
            .from("TASKASSIGNMENT")
            .select("taskId")
            .in("grpmemId", grpmemIds);

        if (!assignments?.length) return 0;

        const taskIds = [...new Set(assignments.map(a => a.taskId))];

        // Get all tasks and filter by status
        const { data: tasks } = await supabase
            .from("TASK")
            .select("statId")
            .in("taskId", taskIds);

        if (!tasks) return 0;

        // Count pending tasks (statId !== 5 for finished, !== 6 for missed)
        const pendingCount = tasks.filter(t => t.statId !== 5 && t.statId !== 6).length;
        return pendingCount;
    } catch (err) {
        console.error("Error fetching pending task count:", err);
        return 0;
    }
};

const getValidationProjects = async (groupIds, groupNames, groupLeaders) => {
    const supabase = window.hiveSupabase;
    if (!supabase || !groupIds.length) return [];

    const { data: projects, error: projectsError } = await supabase
        .from("PROJECT")
        .select("projId, grpId, projName, projDueD")
        .in("grpId", groupIds);

    if (projectsError) {
        console.error("Error fetching projects for validation:", projectsError);
        return [];
    }

    const projectIds = (projects || []).map((project) => project.projId);
    if (!projectIds.length) return [];

    const { data: tasks, error } = await supabase
        .from("TASK")
        .select("taskId, projId, teacherApproved")
        .in("projId", projectIds);

    if (error) {
        console.error("Error fetching tasks to validate:", error);
        return [];
    }

    const taskIds = (tasks || [])
        .filter((task) => !task.teacherApproved)
        .map((task) => task.taskId);
    const { data: approvedSubmissions, error: submissionsError } = taskIds.length
        ? await supabase
            .from("SUBMISSION")
            .select("taskId")
            .in("taskId", taskIds)
            .eq("status", "approved")
        : { data: [], error: null };

    if (submissionsError) {
        console.error("Error fetching approved submissions for validation:", submissionsError);
        return [];
    }

    const readyTaskIds = new Set((approvedSubmissions || []).map((submission) => String(submission.taskId)));
    const counts = (tasks || []).filter((task) => readyTaskIds.has(String(task.taskId))).reduce((result, task) => {
        result[task.projId] = (result[task.projId] || 0) + 1;
        return result;
    }, {});

    return (projects || [])
        .filter((project) => counts[project.projId])
        .map((project) => ({
            ...project,
            validationCount: counts[project.projId],
            groupName: groupNames[String(project.grpId)] || "Unnamed Swarm",
            leader: groupLeaders[String(project.grpId)] || { name: "Leader unavailable", avatarUrl: "../assets/profile.png" }
        }));
};

const loadDashbData = async () => {
    const supabase = window.hiveSupabase;
    if (!supabase) return;

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (!user || userErr) return;
    recentVisitsKey = `hive_recent_team_visits_${user.id}`;

    // Fetch all group memberships for this user, joining GROUP and ROLE
    let { data: memberships, error } = await supabase
        .from("GROUPMEMBER")
        .select("grpId, roleId, ROLE(roleName), GROUP(grpId, grpName, grpSubject, grpMotto, grpDescription, parentGrpId, grpType, teacherId)")
        .eq("userId", user.id);

    if (error && String(error.message || "").toLowerCase().includes("grptype")) {
        ({ data: memberships, error } = await supabase
            .from("GROUPMEMBER")
            .select("grpId, roleId, ROLE(roleName), GROUP(grpId, grpName, grpSubject, parentGrpId)")
            .eq("userId", user.id));
    }

    console.log("Student group memberships fetched:", memberships, "Error:", error);

    if (error) {
        console.error("Failed to load student teams:", error);
        applyDashbData(dashbData);
        return;
    }

    const ownedGroups = [];
    const ownedColonies = [];
    const ownedSwarms = [];
    const joinedColonies = [];
    const joinedGroups = [];
    const groupLeaders = {};
    for (const m of memberships || []) {
        const grp = Array.isArray(m.GROUP) ? m.GROUP[0] : m.GROUP;
        if (!grp) continue;

        // Count members in the group - ensure grpId is a number
        const grpId = Number(grp.grpId);
        const { count: memberCount, error: countErr } = await supabase
            .from("GROUPMEMBER")
            .select("grpmemId", { count: "exact", head: true })
            .eq("grpId", grpId);

        if (countErr) {
            console.error(`Error counting members for group ${grpId}:`, countErr);
        }

        const roleName = String(m.ROLE?.roleName || "").trim().toLowerCase();
        const isLeader = roleName === "leader";
        const isTeacher = roleName === "teacher";
        const { data: groupMembers } = await supabase
            .from("GROUPMEMBER")
            .select("ROLE(roleName), USER(userDisplayName, avatarPath)")
            .eq("grpId", grpId);
        const leader = (groupMembers || []).find(member =>
            String(member.ROLE?.roleName || "").trim().toLowerCase() === "leader"
        );
        const leaderAvatarPath = leader?.USER?.avatarPath || "";
        const leaderAvatarUrl = leaderAvatarPath
            ? (leaderAvatarPath.startsWith("http")
                ? leaderAvatarPath
                : supabase.storage.from("profilePicture").getPublicUrl(leaderAvatarPath).data?.publicUrl)
            : "../assets/profile.png";
        groupLeaders[String(grpId)] = {
            name: leader?.USER?.userDisplayName || "Leader unavailable",
            avatarUrl: leaderAvatarUrl || "../assets/profile.png"
        };

        console.log(`Group ${grpId}:`, grp.grpName, "Role:", m.ROLE?.roleName, "RoleId:", m.roleId, "Members:", memberCount);

        const normalizedType = String(grp.grpType || "COLONY").toUpperCase();
        const isColony = normalizedType === "COLONY";
        const isSwarm = normalizedType === "SWARM";
        const isNestedSwarm = grp.parentGrpId !== null && grp.parentGrpId !== undefined && grp.parentGrpId !== "";

        const groupObj = {
            grpId: grpId,
            name: grp.grpName || "Unnamed Group",
            subject: grp.grpSubject || "",
            motto: grp.grpMotto || "",
            description: grp.grpDescription || "",
            parentGrpId: grp.parentGrpId || null,
            grpType: normalizedType,
            leaderName: leader?.USER?.userDisplayName || "Leader unavailable",
            members: (memberCount !== null && memberCount !== undefined) ? memberCount : 0,
            isLeader,
            isTeacher
        };

        if (isLeader && isColony) {
            ownedGroups.push(groupObj);
            ownedColonies.push(groupObj);
        } else if (isColony) {
            joinedColonies.push(groupObj);
        } else if (isLeader && isSwarm && !isNestedSwarm) {
            ownedSwarms.push(groupObj);
        } else if (isSwarm && !isNestedSwarm) {
            joinedGroups.push(groupObj);
        }
    }

    const groupIds = [...new Set((memberships || []).map((membership) => Number(membership.grpId)).filter(Boolean))];
    const { data: activeProjects } = groupIds.length
        ? await supabase.from("PROJECT").select("projId, projStatus").in("grpId", groupIds)
        : { data: [] };
    const teacherGroupIds = [...new Set((memberships || [])
        .filter((membership) => (
            String(membership.ROLE?.roleName || "").trim().toLowerCase() === "teacher" ||
            String(membership.GROUP?.teacherId || "") === String(user.id)
        ))
        .map((membership) => Number(membership.grpId))
        .filter(Boolean))];
    const groupNames = (memberships || []).reduce((result, membership) => {
        const group = Array.isArray(membership.GROUP) ? membership.GROUP[0] : membership.GROUP;
        if (group?.grpId) result[String(group.grpId)] = group.grpName || "Unnamed Swarm";
        return result;
    }, {});
    const teacherGroupNames = new Map((memberships || []).map((membership) => {
        const group = Array.isArray(membership.GROUP) ? membership.GROUP[0] : membership.GROUP;
        return [Number(membership.grpId), group?.grpName || "Unnamed Swarm"];
    }));
    const { data: teacherProjects } = teacherGroupIds.length
        ? await supabase
            .from("PROJECT")
            .select("projId, grpId, projName, projDesc, projCreatedAt, projDueD, projStatus")
            .in("grpId", teacherGroupIds)
            .order("projCreatedAt", { ascending: false, nullsFirst: false })
            .order("projId", { ascending: false })
        : { data: [] };
    const { data: finishedStatus } = await supabase
        .from("STATUS")
        .select("statId")
        .ilike("statName", "Finished")
        .maybeSingle();
    const ongoingProjects = [];
    for (const project of teacherProjects || []) {
        const { data: tasks } = await supabase
            .from("TASK")
            .select("taskId, statId")
            .eq("projId", project.projId);
        const taskList = tasks || [];
        const completedCount = taskList.filter((task) => String(task.statId) === String(finishedStatus?.statId)).length;
        const isCompleted = taskList.length > 0 && completedCount === taskList.length;
        const status = project.projStatus || (isCompleted ? "Finished" : "Ongoing");
        if (String(status).trim().toLowerCase() !== "ongoing") continue;
        ongoingProjects.push({
            ...project,
            groupName: teacherGroupNames.get(Number(project.grpId)) || "Unnamed Swarm",
            count: taskList.length,
            completedCount,
            status
        });
    }
    const validationProjects = await getValidationProjects(teacherGroupIds, groupNames, groupLeaders);
    const allTeams = [
        ...ownedGroups,
        ...ownedSwarms,
        ...joinedColonies,
        ...joinedGroups
    ];
    const totalTeams = new Set(allTeams.map((group) => String(group.grpId))).size;
    const createdTeams = new Set(
        [...ownedGroups, ...ownedSwarms].map((group) => String(group.grpId))
    ).size;

    dashbData = {
        ownedGroups,
        ownedColonies,
        joinedColonies,
        ownedSwarms,
        joinedGroups,
        ongoingProjects,
        validationProjects,
        stats: {
            owned: ownedGroups.length,
            joined: joinedGroups.length,
            totalTeams,
            createdTeams,
            pending: await getUserPendingTaskCount(user.id),
            validation: validationProjects.reduce((total, project) => total + project.validationCount, 0),
            activeProjects: (activeProjects || []).filter((project) => String(project.projStatus || "Ongoing").toLowerCase() !== "finished").length
        }
    };

    applyDashbData(dashbData);
    await maybeAutoOpenInvitePreview();
};

const maybeAutoOpenInvitePreview = async () => {
    const params = new URLSearchParams(window.location.search);
    const inviteValue = params.get("invite");
    if (!inviteValue) return;
    const grpId = parseGroupInviteId(inviteValue);
    if (!grpId) return;
    await populateInvitationPreview(grpId);
};

const applyDashbData = (data) => {
    const ownedGroupsList = document.querySelector("#ownedGroupsList");
    const colonyList = document.querySelector("#colonyList");
    const colonyAddButton = document.querySelector("#openAddGroupModal");
    const joinedGroupsList = document.querySelector("#joinedGroupsList");
    const ownedGroupsEmptyState = document.querySelector("#ownedGroupsEmptyState");
    const ownedGroupsSection = document.querySelector("#ownedGroupsSection");
    const ownedGroupsPlaceholder = document.querySelector("#ownedGroupsPlaceholder");
    const createTeamButton = document.querySelector("#openCreateTeamModal");
    const statCards = document.querySelectorAll(".stat-card h3");
    const isTeamPage = document.body.classList.contains("team-page");
    const isDashboardPage = document.body.classList.contains("dashboard-copy-page");
    const isTeamCollectionPage = isTeamPage || document.body.classList.contains("dashboard-copy-page");

    const createGroupCard = (group, isOwned) => {
        const card = document.createElement("article");
        card.className = "group-card " + (isOwned ? "open-group-view" : "open-member-group-view");
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        const leaderLabel = isOwned ? "You" : (group.leaderName || "Leader unavailable");
        const groupSubject = `<span class="group-subject-text">${group.subject}</span><small>Lead by ${leaderLabel}</small>`;
        card.innerHTML = `
            <div class="group-info">
                <h3 class="group-name">
                    ${isOwned && (isTeamPage || isDashboardPage) ? `
                        <svg class="owned-team-crown" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 839.663678 779.689007" aria-hidden="true" focusable="false">
                            <g transform="translate(-30.164795,869.832005) scale(0.100000,-0.100000)" fill="currentColor" stroke="none">
                                <path d="M4415 8689 c-29 -7 -58 -28 -108 -77 -91 -89 -101 -109 -102 -207 0 -67 4 -90 28 -139 15 -32 27 -70 27 -84 0 -19 -34 -60 -142 -169 -79 -79 -158 -155 -177 -170 -45 -35 -102 -35 -139 -1 -34 32 -60 46 -123 64 -71 21 -80 41 -83 171 -3 131 -9 143 -108 239 -66 65 -78 72 -126 79 -60 8 -145 -1 -182 -20 -14 -7 -55 -44 -91 -82 -56 -58 -68 -76 -78 -121 -14 -66 -14 -78 0 -144 10 -45 22 -63 78 -121 81 -85 100 -95 192 -103 97 -9 114 -26 123 -120 4 -38 25 -121 46 -184 22 -63 46 -161 54 -217 12 -87 21 -114 61 -188 36 -66 60 -97 107 -134 33 -27 74 -52 90 -55 17 -3 351 -6 742 -6 563 1 719 4 748 14 66 24 133 90 183 182 40 74 49 99 65 202 10 64 32 154 49 199 17 46 37 124 45 175 18 113 27 122 126 132 91 8 110 19 191 103 59 61 68 76 79 127 13 62 7 130 -15 181 -7 17 -43 60 -82 96 -61 59 -75 68 -128 79 -60 12 -152 8 -184 -10 -39 -20 -157 -152 -168 -188 -6 -20 -12 -80 -12 -132 -1 -115 -11 -134 -84 -155 -49 -14 -69 -24 -131 -68 -37 -27 -88 -24 -128 7 -18 14 -97 90 -175 169 -161 162 -161 161 -115 255 23 48 27 70 27 137 -1 98 -11 118 -102 207 -53 53 -78 69 -113 77 -54 13 -111 12 -165 0z"/>
                                <path d="M1330 6289 c-61 -6 -103 -17 -153 -40 -37 -17 -96 -37 -130 -45 -38 -9 -77 -27 -100 -45 -20 -16 -56 -39 -80 -49 -45 -20 -100 -66 -206 -171 -136 -134 -244 -297 -270 -404 -7 -27 -25 -77 -42 -111 -63 -131 -63 -497 0 -641 16 -37 35 -90 42 -118 12 -52 27 -82 84 -175 89 -146 284 -344 395 -400 24 -12 60 -35 80 -51 21 -17 61 -34 101 -44 37 -8 95 -28 130 -45 94 -44 254 -57 488 -41 142 10 193 18 266 41 50 16 119 34 155 40 36 6 90 15 120 21 30 5 89 25 130 44 41 19 111 41 154 50 44 8 93 24 110 35 67 43 115 60 178 63 58 2 63 0 66 -20 2 -12 -13 -59 -32 -104 -48 -109 -47 -142 1 -168 31 -16 3335 -16 3366 0 48 26 48 57 1 166 -19 46 -34 93 -32 106 3 20 8 22 66 20 63 -3 111 -20 178 -63 17 -11 72 -29 122 -40 50 -10 114 -31 144 -46 68 -35 92 -41 216 -60 57 -8 135 -26 173 -40 114 -41 406 -63 592 -45 87 9 124 17 185 45 43 18 95 37 117 41 46 8 89 28 129 62 15 13 44 30 63 38 90 38 321 272 376 382 15 28 31 54 37 58 16 10 46 75 59 130 7 28 26 80 42 117 63 144 63 492 0 635 -16 37 -35 91 -42 118 -12 52 -27 82 -84 175 -89 146 -284 344 -395 400 -24 12 -60 35 -80 51 -20 17 -61 34 -98 43 -34 8 -92 28 -128 45 -55 26 -88 33 -188 42 -216 20 -494 -3 -618 -52 -27 -10 -104 -28 -171 -40 -80 -13 -145 -31 -187 -51 -36 -16 -100 -38 -142 -49 -43 -10 -108 -34 -145 -53 -38 -18 -93 -39 -123 -45 -30 -7 -84 -29 -120 -50 -36 -21 -87 -44 -115 -50 -27 -7 -79 -30 -115 -51 -36 -21 -84 -44 -108 -50 -23 -6 -57 -24 -76 -40 -36 -32 -77 -39 -98 -16 -7 8 -38 45 -68 83 -102 126 -231 241 -307 274 -23 10 -64 33 -92 53 -31 21 -74 39 -109 46 -31 7 -90 25 -130 41 -114 45 -185 54 -422 54 -232 -1 -285 -8 -405 -55 -38 -16 -96 -33 -127 -40 -34 -6 -78 -25 -105 -44 -27 -18 -69 -42 -95 -54 -81 -36 -209 -151 -326 -295 -73 -88 -94 -95 -148 -47 -19 16 -53 34 -76 40 -24 6 -69 27 -101 46 -32 20 -87 44 -122 54 -35 10 -90 34 -122 54 -32 19 -88 42 -125 50 -37 9 -91 29 -120 45 -29 17 -89 39 -133 50 -44 10 -106 31 -138 46 -31 14 -94 34 -140 42 -84 16 -167 36 -296 72 -133 37 -376 50 -581 30z m360 -600 c47 -5 129 -25 182 -44 54 -19 119 -37 145 -40 91 -12 148 -28 213 -60 36 -18 94 -38 130 -44 35 -7 94 -28 130 -46 36 -18 98 -43 139 -55 41 -12 96 -37 124 -56 27 -19 55 -34 61 -34 33 0 117 -33 150 -59 21 -17 66 -39 101 -51 90 -30 110 -48 110 -100 0 -52 -20 -70 -110 -100 -35 -12 -80 -34 -101 -51 -33 -26 -117 -59 -150 -59 -6 0 -34 -15 -61 -34 -27 -19 -79 -42 -114 -52 -35 -9 -100 -34 -144 -56 -44 -21 -107 -43 -140 -49 -33 -6 -89 -25 -125 -43 -65 -33 -122 -49 -213 -61 -26 -3 -91 -22 -146 -41 -120 -41 -262 -59 -416 -51 -108 6 -111 7 -210 58 -140 72 -212 144 -285 286 l-55 106 0 148 0 147 57 110 c73 140 132 201 263 271 53 29 115 56 138 61 61 12 230 12 327 -1z m6062 -48 c123 -63 214 -146 260 -236 91 -175 83 -145 83 -305 0 -160 8 -130 -83 -305 -35 -69 -138 -174 -197 -202 -22 -10 -60 -31 -85 -45 -115 -67 -398 -64 -602 7 -54 18 -119 37 -145 40 -92 12 -148 28 -214 61 -36 18 -92 37 -125 43 -32 6 -93 27 -134 47 -41 20 -106 45 -143 55 -37 11 -91 35 -119 54 -27 19 -56 35 -62 35 -33 0 -117 33 -150 59 -21 17 -66 39 -101 51 -90 30 -110 48 -110 100 0 52 20 70 110 100 35 12 80 34 101 51 33 26 117 59 150 59 6 0 34 15 61 34 28 19 83 44 123 56 41 12 103 37 139 55 37 18 93 38 126 45 33 6 98 28 145 50 59 27 110 42 167 50 45 6 126 26 181 45 126 44 202 54 379 51 l143 -2 102 -53z"/>
                                <path d="M2729 3281 c-17 -13 -23 -29 -23 -57 1 -73 24 -229 45 -304 12 -41 31 -134 44 -207 25 -145 62 -243 107 -285 l28 -28 1570 0 1570 0 28 28 c42 39 82 141 99 246 8 50 29 156 48 236 33 143 48 239 49 314 0 28 -6 44 -23 57 -22 18 -79 19 -1771 19 -1692 0 -1749 -1 -1771 -19z"/>
                                <path d="M3226 1784 c-26 -25 -19 -57 20 -95 34 -32 59 -62 159 -193 49 -63 255 -258 310 -293 22 -14 54 -38 70 -54 17 -15 51 -37 76 -48 25 -11 63 -34 84 -51 21 -16 56 -35 79 -41 23 -6 75 -24 116 -40 119 -48 167 -59 295 -65 165 -9 272 6 393 54 53 22 114 42 134 46 21 4 57 22 82 40 24 19 65 44 92 55 27 12 63 35 79 51 17 15 44 36 61 47 83 50 245 208 347 338 34 43 86 104 115 135 57 62 67 101 33 120 -13 7 -429 10 -1275 10 -1127 0 -1256 -2 -1270 -16z"/>
                            </g>
                        </svg>
                    ` : ""}
                    <span>${group.name}</span>
                </h3>
                <p>${groupSubject}</p>
            </div>
            <div class="card-right">
                <strong>Occupied Members : ${group.members}</strong>
                ${isOwned ? '<button class="more-btn" type="button" aria-label="Edit owned group">•••</button>' : ''}
            </div>
        `;
        card.addEventListener("click", () => {
            recordTeamVisit(group.grpId);
            sessionStorage.setItem("hive_grpId", String(group.grpId));
            sessionStorage.setItem("hive_grpName", group.name);
            const returnPage = window.location.pathname.endsWith("/t.category.html")
                ? "teams"
                : "dashboard";
            sessionStorage.setItem("hive_group_return_page", returnPage);
            const isColony = String(group.grpType || "").toUpperCase() === "COLONY";
            if (isColony) {
                window.location.href = `t.colony.html?grpId=${group.grpId}&from=${returnPage}`;
            } else if (group.isTeacher) {
                window.location.href = `t.grpviewing.html?grpId=${group.grpId}&from=${returnPage}`;
            } else {
                window.location.href = `t.grpviewing.html?grpId=${group.grpId}&from=${returnPage}`;
            }
        });
        if (isOwned) {
            const moreBtn = card.querySelector(".more-btn");
            moreBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                openEditOwnedGroupModal(group);
            });
        }
        return card;
    };

    if (isTeamPage && colonyList) {
        colonyList.innerHTML = "";
        const colonies = [
            ...(data.ownedColonies || data.ownedGroups || []),
            ...(data.joinedColonies || [])
        ];
        if (colonyAddButton) colonyAddButton.hidden = !colonies.length;
        if (!colonies.length) {
            colonyList.innerHTML = `
                <div class="empty-state team-empty-placeholder">
                    <img class="empty-state-icon" src="../assets/bee-flight.svg" alt="">
                    <strong>No Colony Yet</strong>
                    <p>Click the button below to create a colony and start collaborating.</p>
                    <button type="button" class="empty-create-team-btn empty-create-colony-btn">Create Colony</button>
                </div>`;
            colonyList.querySelector(".empty-create-colony-btn")?.addEventListener("click", openAddGroupModal);
        } else {
            colonies.forEach((colony) => colonyList.appendChild(createGroupCard(colony, colony.isLeader)));
        }
    }

    if (isTeamPage && joinedGroupsList) {
        const ownedGroups = (data.ownedSwarms || []).filter(group => !group.parentGrpId);
        const joinedGroups = (data.joinedGroups || []).filter(group => !group.parentGrpId);
        const allGroups = [...ownedGroups, ...joinedGroups];
        const ownedGroupIds = new Set(
            allGroups.filter(group => group.isLeader).map(group => String(group.grpId))
        );

        if (ownedGroupsList) ownedGroupsList.innerHTML = "";
        joinedGroupsList.innerHTML = "";
        joinedGroupsList.classList.toggle("is-empty", !allGroups.length);
        if (createTeamButton) createTeamButton.hidden = !allGroups.length;

        if (!allGroups.length) {
            joinedGroupsList.innerHTML = `
                <div class="empty-state team-empty-placeholder">
                    <img class="empty-state-icon" src="../assets/bee-flight.svg" alt="">
                    <strong>No Swarm Yet</strong>
                    <p>Click the button below to create a swarm and start collaborating.</p>
                    <button type="button" class="empty-create-team-btn">Create Swarm</button>
                </div>
            `;
            joinedGroupsList.querySelector(".empty-create-team-btn")?.addEventListener("click", openCreateTeamModal);
        } else {
            allGroups
                .sort((firstGroup, secondGroup) => Number(secondGroup.isLeader) - Number(firstGroup.isLeader))
                .forEach(group => {
                joinedGroupsList.appendChild(
                    createGroupCard(group, ownedGroupIds.has(String(group.grpId)) || group.isLeader)
                );
                });
        }
    }

    if (ownedGroupsList && !isTeamPage) {
        if (!data.ownedGroups || data.ownedGroups.length === 0) {
            if (ownedGroupsEmptyState) ownedGroupsEmptyState.hidden = Boolean(ownedGroupsPlaceholder);
            if (ownedGroupsPlaceholder) ownedGroupsPlaceholder.hidden = false;
            if (ownedGroupsSection && isTeamCollectionPage) ownedGroupsSection.hidden = false;
            ownedGroupsList.innerHTML = isTeamPage || document.body.classList.contains("dashboard-copy-page")
                ? ""
                : `
                    <div class="empty-state">
                        <img src="../assets/AddGroup.png" class="empty-state-icon" alt="No groups">
                        <h3>No Owned Groups</h3>
                        <p>You haven't created any groups yet. Click "Add Groups" to get started!</p>
                    </div>
                `;
        } else {
            if (ownedGroupsEmptyState) ownedGroupsEmptyState.hidden = true;
            if (ownedGroupsPlaceholder && !document.body.classList.contains("dashboard-copy-page")) {
                ownedGroupsPlaceholder.hidden = true;
            }
            if (ownedGroupsSection && isTeamPage) ownedGroupsSection.hidden = true;
            ownedGroupsList.innerHTML = "";
            data.ownedGroups.forEach(group => {
                ownedGroupsList.appendChild(createGroupCard(group, true));
            });
        }
    }

    if (joinedGroupsList && isDashboardPage) {
        joinedGroupsList.innerHTML = "";
        const ongoingProjects = data.ongoingProjects || [];
        joinedGroupsList.classList.toggle("is-empty", !ongoingProjects.length);
        if (!ongoingProjects.length) {
            joinedGroupsList.innerHTML = `
                <div class="empty-state dashboard-empty-placeholder">
                    <img class="empty-state-icon" src="../assets/bee-flight.svg" alt="">
                    <p>You currently have no ongoing team projects.</p>
                </div>
            `;
        } else {
            ongoingProjects.forEach((project) => {
                const item = document.createElement("div");
                item.className = "category-item";
                item.setAttribute("role", "listitem");
                item.dataset.category = project.projId;
                item.innerHTML = `
                    <button class="category-main-btn" type="button">
                        <span class="category-group-name"></span>
                        <span class="category-name"></span>
                        <span class="category-due-date"></span>
                        <span class="category-footer">
                            <span class="category-count"></span>
                            <span class="category-status"></span>
                        </span>
                    </button>
                `;
                item.querySelector(".category-group-name").textContent = `Swarm: ${project.groupName}`;
                item.querySelector(".category-name").textContent = project.projName || "Unnamed Project";
                item.querySelector(".category-due-date").textContent = formatProjectDueDate(project.projDueD);
                item.querySelector(".category-count").textContent = `${project.completedCount}/${project.count} Tasks Completed`;
                const statusElement = item.querySelector(".category-status");
                statusElement.textContent = project.status || "Ongoing";
                statusElement.classList.add(String(project.status || "Ongoing").toLowerCase() === "finished" ? "completed" : "ongoing");
                item.querySelector(".category-main-btn").addEventListener("click", () => {
                    sessionStorage.setItem("hive_grpId", String(project.grpId));
                    sessionStorage.setItem("hive_selected_project", String(project.projId));
                    sessionStorage.setItem("hive_selected_project_name", project.projName || "Unnamed Project");
                    window.location.href = `t.projectbreakdown.html?grpId=${encodeURIComponent(project.grpId)}&projId=${encodeURIComponent(project.projId)}`;
                });
                joinedGroupsList.appendChild(item);
            });
        }
    }

    if (joinedGroupsList && !isTeamPage && !isDashboardPage) {
        if (!data.joinedGroups || data.joinedGroups.length === 0) {
            const hasTeamPageGroups = isTeamPage && (
                (data.ownedGroups || []).length > 0 || (data.joinedGroups || []).length > 0
            );
            if (hasTeamPageGroups) {
                joinedGroupsList.innerHTML = "";
            } else {
                joinedGroupsList.innerHTML = isTeamCollectionPage
                    ? '<div class="empty-state"><p>You currently have no Teams</p></div>'
                    : `
                        <div class="empty-state">
                            <img src="../assets/JoinGroup.png" class="empty-state-icon" alt="No groups">
                            <h3>No Joined Groups</h3>
                            <p>You currently have no Teams</p>
                        </div>
                    `;
            }
        } else {
            joinedGroupsList.innerHTML = "";
            data.joinedGroups.forEach(group => {
                joinedGroupsList.appendChild(createGroupCard(group, false));
            });
        }
    }

    const validationList = document.querySelector("#validationList");
    if (validationList) {
        const validationProjects = data.validationProjects || [];
        validationList.innerHTML = "";
        validationList.classList.toggle("is-empty", !validationProjects.length);
        if (!validationProjects.length) {
            validationList.innerHTML = `
                <div class="empty-state validation-empty-state">
                    <h3>No tasks to validate</h3>
                    <p>You're all caught up. New student submissions will appear here.</p>
                </div>`;
        } else {
            validationProjects.forEach((project) => {
                const item = document.createElement("div");
                item.className = "validation-item";
                item.setAttribute("role", "button");
                item.setAttribute("tabindex", "0");
                item.innerHTML = `
                    <div class="validation-project"><strong></strong><span></span></div>
                    <div class="validation-summary"><strong></strong><span class="validation-leader"><img alt=""><span></span></span></div>
                    <div class="validation-due"><span>Due:</span><strong></strong><span aria-hidden="true">›</span></div>
                `;
                item.querySelector(".validation-project strong").textContent = project.projName || "Unnamed Project";
                item.querySelector(".validation-project span").textContent = `Swarm: ${project.groupName}`;
                item.querySelector(".validation-summary strong").textContent = `${project.validationCount} new tasks to be validated`;
                const leaderAvatar = item.querySelector(".validation-leader img");
                leaderAvatar.src = project.leader.avatarUrl;
                leaderAvatar.alt = `${project.leader.name} profile picture`;
                item.querySelector(".validation-leader span").textContent = `Verified by ${project.leader.name}`;
                item.querySelector(".validation-due strong").textContent = project.projDueD || "--/--/----";
                const openProject = () => {
                    sessionStorage.setItem("hive_grpId", String(project.grpId));
                    sessionStorage.setItem("hive_selected_project", String(project.projId));
                    sessionStorage.setItem("hive_selected_project_name", project.projName || "Unnamed Project");
                    window.location.href = `t.projectbreakdown.html?grpId=${encodeURIComponent(project.grpId)}&projId=${encodeURIComponent(project.projId)}&tab=submissions`;
                };
                item.addEventListener("click", openProject);
                item.addEventListener("keydown", (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openProject();
                    }
                });
                validationList.appendChild(item);
            });
        }
    }

    const teamsStat = document.querySelector('[data-stat="teams"]');
    const yourTeamsStat = document.querySelector('[data-stat="your-teams"]');
    const validationsStat = document.querySelector('[data-stat="validations"]');
    const activeProjectsStat = document.querySelector('[data-stat="active-projects"]');
    const validationSummary = document.querySelector("#validationList .validation-summary strong");
    if (teamsStat) teamsStat.textContent = String(data.stats.totalTeams || 0).padStart(2, "0");
    if (yourTeamsStat) yourTeamsStat.textContent = String(data.stats.createdTeams || 0).padStart(2, "0");
    if (validationsStat) validationsStat.textContent = String(data.stats.validation || 0).padStart(2, "0");
    if (activeProjectsStat) activeProjectsStat.textContent = String(data.stats.activeProjects || 0).padStart(2, "0");
    if (validationSummary) validationSummary.textContent = `${data.stats.validation || 0} new tasks to be validated`;
};

// Load on page start
window.HiveLoading?.startDataLoad("Loading dashboard...");
loadDashbData().finally(() => window.HiveLoading?.finishDataLoad());

const teamPageTabs = Array.from(document.querySelectorAll(".team-page-tab"));
const teamPagePanels = Array.from(document.querySelectorAll(".team-page-tab-panel"));

teamPageTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        teamPageTabs.forEach((item) => {
            const active = item === tab;
            item.classList.toggle("active", active);
            item.setAttribute("aria-selected", String(active));
        });
        teamPagePanels.forEach((panel) => {
            const active = panel.id === tab.getAttribute("aria-controls");
            panel.classList.toggle("active", active);
            panel.hidden = !active;
        });
    });
});

// ─── Modals & Buttons ─────────────────────────────────────────────────────────
const addGroupModal = document.querySelector("#addGroupModal");
const openAddGroupModalBtn = document.querySelector("#openAddGroupModal");
const openCreateTeamModalBtn = document.querySelector("#openCreateTeamModal");
const discardAddGroupBtn = document.querySelector("#discardAddGroup");
const createAddGroupBtn = document.querySelector("#createAddGroup");
const groupNameInput = document.querySelector("#groupNameInput");
const groupSubjectInput = document.querySelector("#groupSubjectInput");
const groupMottoInput = document.querySelector("#groupMottoInput");
const groupDescriptionInput = document.querySelector("#groupDescriptionInput");
const groupScheduleList = document.querySelector("#groupScheduleList");
const addGroupScheduleBtn = document.querySelector("#addGroupScheduleBtn");
const groupLinksList = document.querySelector("#groupLinksList");
const addGroupLinkBtn = document.querySelector("#addGroupLinkBtn");
const createTeamModal = document.querySelector("#createTeamModal");
const createTeamForm = document.querySelector("#createTeamForm");
const discardCreateTeamBtn = document.querySelector("#discardCreateTeam");
const teamNameInput = document.querySelector("#teamNameInput");
const teamSubjectInput = document.querySelector("#teamSubjectInput");
const teamMottoInput = document.querySelector("#teamMottoInput");
const teamDescriptionInput = document.querySelector("#teamDescriptionInput");
const saveCreateTeamBtn = document.querySelector("#saveCreateTeam");
const teamScheduleList = document.querySelector("#teamScheduleList");
const teamLinksList = document.querySelector("#teamLinksList");
const addTeamLinkBtn = document.querySelector("#addTeamLinkBtn");
const joinGroupModal = document.querySelector("#joinGroupModal");
const invitationPreviewModal = document.querySelector("#invitationPreviewModal");
const openJoinGroupModalBtn = document.querySelector("#openJoinGroupModal");
const discardJoinGroupBtn = document.querySelector("#discardJoinGroup");
const joinGroupBtn = document.querySelector("#joinGroupBtn");
const closeInvitationPreviewBtn = document.querySelector("#closeInvitationPreviewBtn");
const joinAsInstructorBtn = document.querySelector("#joinAsInstructorBtn");
const groupLinkInput = document.querySelector("#groupLinkInput");
const openEditOwnedGroupModalBtn = document.querySelector("#openEditOwnedGroupModal");
const editOwnedGroupModal = document.querySelector("#editOwnedGroupModal");
const discardEditOwnedGroupBtn = document.querySelector("#discardEditOwnedGroup");
const saveEditOwnedGroupBtn = document.querySelector("#saveEditOwnedGroup");
const editOwnedGroupNameInput = document.querySelector("#editOwnedGroupNameInput");
const editOwnedGroupSubjectInput = document.querySelector("#editOwnedGroupSubjectInput");
const editOwnedGroupMottoInput = document.querySelector("#editOwnedGroupMottoInput");
const invitePreviewIntro = document.querySelector("#invitePreviewIntro");
const invitePreviewTitle = document.querySelector("#invitePreviewTitle");
const invitePreviewTeamName = document.querySelector("#invitePreviewTeamName");
const invitePreviewMeta = document.querySelector("#invitePreviewMeta");
const invitePreviewDescription = document.querySelector("#invitePreviewDescription");
const invitePreviewProjectCount = document.querySelector("#invitePreviewProjectCount");
const invitePreviewStatusLabel = document.querySelector("#invitePreviewStatusLabel");
const invitePreviewStatus = document.querySelector("#invitePreviewStatus");
const invitePreviewMottoLabel = document.querySelector("#invitePreviewMottoLabel");
const invitePreviewMotto = document.querySelector("#invitePreviewMotto");
const invitePreviewLeader = document.querySelector("#invitePreviewLeader");
const invitePreviewLeaderAvatar = document.querySelector("#invitePreviewLeaderAvatar");

const getGroupLinkIcon = (type) => {
    const icons = {
        discord: `<svg viewBox="0 -28.5 256 256" aria-hidden="true"><path d="M216.856 16.597C200.285 8.843 182.566 3.208 164.042 0c-2.275 4.113-4.933 9.645-6.766 14.046-19.692-2.961-39.203-2.961-58.533 0C96.911 9.645 94.193 4.113 91.897 0 73.353 3.208 55.613 8.864 39.042 16.638 5.618 67.147-3.443 116.401 1.087 164.956c22.169 16.555 43.653 26.612 64.775 33.193 5.215-7.177 9.866-14.807 13.873-22.848-7.631-2.9-14.94-6.478-21.846-10.632 1.832-1.358 3.624-2.777 5.356-4.237 42.123 19.702 87.89 19.702 129.51 0 1.752 1.46 3.544 2.879 5.356 4.237-6.927 4.175-14.256 7.753-21.887 10.653 4.007 8.02 8.658 15.67 13.893 22.847 21.142-6.581 42.646-16.637 64.815-33.213 5.316-56.288-9.081-105.09-38.056-148.359Z" fill="currentColor"></path></svg>`,
        meet: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M41.05 12.6c1.63-1.3 2.85-.23 2.85 1.14v20.52c0 1.73-1.22 2.44-2.85 1.14L26.79 24ZM14 8v32M4.9 17.16h21.89v13.68H4.9m0-13.68L14 8h18.5a3.2 3.2 0 0 1 2.85 2.85v26.26A3.2 3.2 0 0 1 32.5 40H7.75a2.81 2.81 0 0 1-2.85-2.89Z" fill="none" stroke="currentColor" stroke-width="4.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
        resources: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.423 13.888 15.334 3.338H8.667l6.09 10.55ZM8.089 4.338 2 14.887l3.334 5.775 6.089-10.549Zm1.733 10.549-3.333 5.775h12.178L22 14.887Z" fill="currentColor"></path></svg>`,
        repository: `<svg viewBox="0 0 25 25" aria-hidden="true"><path d="M12.35 0h.04c2.24 0 4.34.61 6.14 1.68 1.87 1.09 3.39 2.61 4.45 4.42 1.04 1.77 1.65 3.9 1.65 6.17 0 5.4-3.48 10-8.33 11.66-.06.02-.13.03-.21.03-.16 0-.31-.05-.43-.14-.13-.12-.21-.28-.21-.47 0-.01 0-.01 0-.02q0-.05.01-1.23t.01-2.15c0-.79-.32-1.51-.84-2.03.62-.06 1.18-.16 1.72-.3l-.08.02c.57-.16 1.07-.37 1.54-.64.51-.28.94-.64 1.29-1.06.37-.48.66-1.04.84-1.65.21-.68.33-1.47.33-2.28v-.14c0-1.25-.48-2.38-1.27-3.23.17-.44.27-.95.27-1.48 0-.65-.15-1.26-.4-1.81-.12-.02-.25-.04-.38-.04-.33 0-.65.08-.93.22l.01-.01c-.57.21-1.05.45-1.51.73l.04-.02-.61.38c-.92-.26-1.98-.42-3.08-.42s-2.15.15-3.16.44l.08-.02q-.26-.18-.68-.43c-.37-.21-.81-.42-1.27-.6l-.07-.02c-.29-.15-.64-.24-1.01-.24-.12 0-.25.01-.36.03-.25.52-.39 1.14-.39 1.79 0 .53.1 1.04.28 1.51-.79.84-1.27 1.98-1.27 3.23v.08c0 .04 0 .08 0 .13 0 .81.12 1.59.34 2.33l-.02-.06c.19.64.48 1.2.85 1.69.35.44.78.79 1.27 1.06l.02.01c.43.25.93.47 1.46.61l.05.01c.47.13 1.02.23 1.6.28h.05c-.43.43-.72 1-.78 1.64v.01c-.21.1-.45.18-.7.24h-.02c-.26.05-.55.08-.85.08h-.07c-.39-.01-.76-.14-1.05-.35l.01.01c-.37-.26-.67-.6-.88-.99l-.01-.02c-.2-.34-.46-.61-.77-.83-.23-.17-.49-.3-.78-.38h-.02l-.32-.05h-.08c-.14 0-.27.03-.39.08l.01-.01q-.13.07-.08.18c.04.09.09.16.15.23.06.07.13.14.2.19l.12.08c.28.15.52.35.69.6l.01.01c.19.24.36.5.49.79l.01.02.16.37c.14.4.38.74.7.98l.01.01c.3.23.66.4 1.06.48h.02c.33.06.71.1 1.11.11h.01c.26 0 .52-.02.77-.06l-.03.01.37-.06q0 .61.01 1.42t.01.87v.01c0 .19-.08.35-.21.47-.12.09-.27.14-.43.14-.08 0-.15-.01-.21-.03l.01.01C3.48 22.57 0 17.98 0 12.57 0 10.3.61 8.18 1.68 6.35l-.03.06C2.74 4.54 4.26 3.03 6.07 1.97 7.81.93 9.91.32 12.15.32h.1ZM4.66 17.67q.05-.11-.11-.19-.16-.05-.21.03-.05.11.11.19.14.1.21-.03Zm.5.55q.11-.08-.03-.26-.16-.14-.26-.05-.11.08.03.26.16.16.26.05Zm.48.72q.14-.11 0-.3-.13-.21-.27-.1-.14.08 0 .29t.27.11Zm.67.67q.13-.13-.06-.3-.19-.19-.32-.05-.14.13.06.3.19.19.32.04Zm.92.4q.05-.18-.21-.26-.24-.06-.3.11t.21.24q.24.1.3-.1Zm1.01.08q0-.21-.27-.18-.26 0-.26.18 0 .21.27.18.26 0 .26-.18Zm.93-.16q-.03-.18-.29-.14-.26.05-.22.24t.29.13.22-.23Z" fill="currentColor"></path></svg>`,
        other: `<svg viewBox="0 0 486 486" aria-hidden="true"><path d="M453 40 437 25C419 9 396 0 371 0c-28 0-55 12-74 33l-47 54c-6 7-9 16-8 25 1 9 5 18 12 24l4 4c6 6 14 9 23 9l2-.1c9-.6 18-5 24-12l47-54c8-9 24-10 34-2l16 15c5 4 8 10 8 16 0 6-2 12-6 17L302 246c-7 8-19 10-29 5-15-8-34-4-44 8l-1 1c-8 9-11 20-9 31 2 11 9 21 19 26 14 7 30 11 46 11 28 0 55-12 74-33l104-117c36-41 32-103-9-139ZM229 347c-14-12-36-11-49 3l-47 53c-8 9-24 10-34 2l-17-15c-5-4-8-10-8-16 0-6 2-12 6-17l104-117c7-8 19-10 28-6 15 8 34 4 46-9 7-8 11-19 9-30-2-11-9-20-19-26-14-8-30-12-46-12-28 0-55 12-74 33L25 308c-36 41-32 103 8 139l17 14c18 16 41 25 65 25 28 0 55-12 74-33l47-53c6-7 9-16 9-25-1-9-5-18-12-24l-4-4Z" fill="currentColor"></path></svg>`
    };
    if (type === "discord") {
        return icons.discord.replace(
            "</svg>",
            "<circle cx=\"85.47\" cy=\"108.91\" r=\"23\" fill=\"#fffdf0\"></circle><circle cx=\"170.53\" cy=\"108.91\" r=\"23\" fill=\"#fffdf0\"></circle></svg>"
        );
    }
    return icons[type] || icons.other;
};

const formatScheduleTime = (value) => {
    if (!value) return "";
    const [hours, minutes] = value.split(":");
    const numericHour = Number(hours);
    const hour = numericHour % 12 || 12;
    return `${hour}:${minutes} ${numericHour >= 12 ? "PM" : "AM"}`;
};

const getGroupSchedule = () => {
    const schedules = [...(groupScheduleList?.querySelectorAll(".schedule-fields") || [])]
        .map((row) => {
            const day = row.querySelector('[name="groupScheduleDay"]')?.value || "";
            const from = formatScheduleTime(row.querySelector('[name="groupScheduleFrom"]')?.value);
            const to = formatScheduleTime(row.querySelector('[name="groupScheduleTo"]')?.value);
            return day && from && to ? `${day}, ${from} - ${to}` : "";
        })
        .filter(Boolean);
    return schedules.length ? schedules.join("; ") : null;
};

const validateScheduleList = (scheduleList, dayName, fromName, toName) => {
    if (!scheduleList) return "";
    const schedules = [];
    scheduleList.querySelectorAll(".schedule-fields").forEach((row) => {
        const dayInput = row.querySelector(`[name="${dayName}"]`);
        const fromInput = row.querySelector(`[name="${fromName}"]`);
        const toInput = row.querySelector(`[name="${toName}"]`);
        [dayInput, fromInput, toInput].forEach((input) => input?.setCustomValidity(""));
        const day = dayInput?.value || "";
        const from = fromInput?.value || "";
        const to = toInput?.value || "";
        if (!day && !from && !to) return;
        if (!day || !from || !to) {
            toInput?.setCustomValidity("Complete the meeting schedule or clear the row.");
            schedules.push({ invalid: true, input: toInput });
            return;
        }
        schedules.push({ day, start: Number(from.replace(":", "")), end: Number(to.replace(":", "")), input: toInput });
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

const addGroupScheduleRow = () => {
    if (!groupScheduleList) return;
    const row = groupScheduleList.querySelector(".schedule-fields")?.cloneNode(true);
    if (!row) return;
    row.querySelectorAll("input").forEach((input) => { input.value = ""; });
    row.querySelectorAll("select").forEach((select) => { select.selectedIndex = 0; });
    row.querySelector(".remove-schedule-btn")?.addEventListener("click", () => {
        if (groupScheduleList.children.length > 1) row.remove();
        else row.querySelectorAll("input").forEach((input) => { input.value = ""; });
    });
    groupScheduleList.appendChild(row);
};

groupScheduleList?.querySelector(".remove-schedule-btn")?.addEventListener("click", (event) => {
    const row = event.currentTarget.closest(".schedule-fields");
    if (!row || !groupScheduleList) return;
    if (groupScheduleList.children.length > 1) row.remove();
    else {
        row.querySelectorAll("input").forEach((input) => { input.value = ""; });
        row.querySelectorAll("select").forEach((select) => { select.selectedIndex = 0; });
    }
});

const updateAddGroupCreateState = () => {
    if (!createAddGroupBtn) return;
    const hasGroupName = groupNameInput && groupNameInput.value.trim().length > 0;
    const hasSubjectName = groupSubjectInput && groupSubjectInput.value.trim().length > 0;
    const hasDescription = groupDescriptionInput && groupDescriptionInput.value.trim().length > 0;
    createAddGroupBtn.disabled = !(hasGroupName && hasSubjectName && hasDescription);
};

const updateJoinGroupState = () => {
    if (!joinGroupBtn) return;
    const hasGroupLink = groupLinkInput && groupLinkInput.value.trim().length > 0;
    joinGroupBtn.disabled = !hasGroupLink;
};

const updateEditOwnedGroupState = () => {
    if (!saveEditOwnedGroupBtn) return;
    const hasGroupName = editOwnedGroupNameInput && editOwnedGroupNameInput.value.trim().length > 0;
    const hasSubjectName = editOwnedGroupSubjectInput && editOwnedGroupSubjectInput.value.trim().length > 0;
    saveEditOwnedGroupBtn.disabled = !(hasGroupName && hasSubjectName);
};

const closeAddGroupModal = () => {
    if (!addGroupModal) return;
    addGroupModal.classList.remove("open");
    addGroupModal.setAttribute("aria-hidden", "true");
};

const requestCloseAddGroupModal = () => {
    showConfirmation("Are you sure you want to close this form? Your changes will be lost.", closeAddGroupModal, {
        title: "Close Form",
        confirmText: "Close",
        cancelText: "Keep Editing"
    });
};

const openAddGroupModal = () => {
    if (!addGroupModal) return;
    addGroupModal.classList.add("open");
    addGroupModal.setAttribute("aria-hidden", "false");
    if (groupNameInput) { groupNameInput.value = ""; groupNameInput.focus(); }
    if (groupSubjectInput) groupSubjectInput.value = "";
    if (groupMottoInput) groupMottoInput.value = "";
    if (groupDescriptionInput) groupDescriptionInput.value = "";
    if (groupLinksList) {
        groupLinksList.innerHTML = "";
    }
    updateAddGroupCreateState();
};

const closeCreateTeamModal = () => {
    if (!createTeamModal) return;
    createTeamModal.classList.remove("open");
    createTeamModal.setAttribute("aria-hidden", "true");
};

const requestCloseCreateTeamModal = () => {
    showConfirmation("Are you sure you want to close this form? Your changes will be lost.", closeCreateTeamModal, {
        title: "Close Form",
        confirmText: "Close",
        cancelText: "Keep Editing"
    });
};

const openCreateTeamModal = () => {
    if (!createTeamModal) return;
    createTeamForm?.reset();
    if (teamScheduleList) {
        const scheduleRows = [...teamScheduleList.querySelectorAll(".schedule-fields")];
        scheduleRows.slice(1).forEach((row) => row.remove());
        scheduleRows[0]?.querySelectorAll("input").forEach((input) => { input.value = ""; });
        scheduleRows[0]?.querySelectorAll("select").forEach((select) => { select.selectedIndex = 0; });
    }
    if (teamLinksList) {
        teamLinksList.innerHTML = "";
    }
    createTeamModal.classList.add("open");
    createTeamModal.setAttribute("aria-hidden", "false");
    teamNameInput?.focus();
};

const getTeamSchedule = () => [...(teamScheduleList?.querySelectorAll(".schedule-fields") || [])]
    .map((row) => {
        const day = row.querySelector('[name="teamScheduleDay"]')?.value || "";
        const formatTime = (value) => {
            if (!value) return "";
            const [hours, minutes] = value.split(":");
            const numericHour = Number(hours);
            return `${numericHour % 12 || 12}:${minutes} ${numericHour >= 12 ? "PM" : "AM"}`;
        };
        const from = formatTime(row.querySelector('[name="teamScheduleFrom"]')?.value || "");
        const to = formatTime(row.querySelector('[name="teamScheduleTo"]')?.value || "");
        return day && from && to ? `${day}, ${from} - ${to}` : "";
    }).filter(Boolean).join("; ") || null;

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

const addTeamLinkRow = () => {
    if (!teamLinksList) return;
    const row = document.createElement("div");
    row.className = "group-link-row";
    row.innerHTML = `<span class="group-link-icon">${getGroupLinkIcon("discord")}</span><select aria-label="Link type"><option value="discord">Discord</option><option value="meet">Google Meet</option><option value="resources">Resources</option><option value="repository">Repository</option><option value="other">Other</option></select><input type="url" aria-label="Link URL" placeholder="Paste link"><button type="button" class="remove-group-link-btn" aria-label="Remove link">×</button>`;
    const select = row.querySelector("select");
    select.addEventListener("change", () => { row.querySelector(".group-link-icon").innerHTML = getGroupLinkIcon(select.value); });
    row.querySelector(".remove-group-link-btn").addEventListener("click", () => { row.remove(); });
    teamLinksList.appendChild(row);
};

const addGroupLinkRow = () => {
    if (!groupLinksList) return;
    const row = document.createElement("div");
    row.className = "group-link-row";
    row.innerHTML = `
        <span class="group-link-icon">${getGroupLinkIcon("discord")}</span>
        <select aria-label="Link type">
            <option value="discord">Discord</option>
            <option value="meet">Google Meet</option>
            <option value="resources">Resources</option>
            <option value="repository">Repository</option>
            <option value="other">Other</option>
        </select>
        <input type="url" aria-label="Link URL" placeholder="Paste link">
        <button type="button" class="remove-group-link-btn" aria-label="Remove link">×</button>
    `;
    const linkTypeSelect = row.querySelector("select");
    const linkIcon = row.querySelector(".group-link-icon");
    linkTypeSelect.addEventListener("change", () => {
        linkIcon.innerHTML = getGroupLinkIcon(linkTypeSelect.value);
    });
    row.querySelector(".remove-group-link-btn").addEventListener("click", () => {
        row.remove();
    });
    groupLinksList.appendChild(row);
};

if (openAddGroupModalBtn) openAddGroupModalBtn.addEventListener("click", openAddGroupModal);
if (openCreateTeamModalBtn) openCreateTeamModalBtn.addEventListener("click", openCreateTeamModal);
document.querySelectorAll(".empty-create-team-btn").forEach((button) => {
    button.addEventListener("click", openCreateTeamModal);
});
if (discardAddGroupBtn) discardAddGroupBtn.addEventListener("click", requestCloseAddGroupModal);
if (discardCreateTeamBtn) discardCreateTeamBtn.addEventListener("click", requestCloseCreateTeamModal);
if (createTeamForm) {
    createTeamForm.addEventListener("click", (event) => {
        const addScheduleButton = event.target.closest("#addTeamScheduleBtn");
        if (!addScheduleButton) return;
        event.preventDefault();
        event.stopPropagation();
        addTeamScheduleRow();
    });
}
if (addTeamLinkBtn) addTeamLinkBtn.addEventListener("click", addTeamLinkRow);
if (createTeamModal) createTeamModal.addEventListener("click", (event) => {
    if (event.target === createTeamModal) requestCloseCreateTeamModal();
});
if (groupNameInput) groupNameInput.addEventListener("input", updateAddGroupCreateState);
if (groupSubjectInput) groupSubjectInput.addEventListener("input", updateAddGroupCreateState);
if (groupDescriptionInput) groupDescriptionInput.addEventListener("input", updateAddGroupCreateState);
if (addGroupLinkBtn) addGroupLinkBtn.addEventListener("click", addGroupLinkRow);
if (addGroupScheduleBtn) {
    addGroupScheduleBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        addGroupScheduleRow();
    });
}
if (addGroupModal) addGroupModal.addEventListener("click", (e) => { if (e.target === addGroupModal) requestCloseAddGroupModal(); });

if (createAddGroupBtn) {
    createAddGroupBtn.addEventListener("click", () => {
        const groupName = groupNameInput ? groupNameInput.value.trim() : "";
        const subjectName = groupSubjectInput ? groupSubjectInput.value.trim() : "";
        const groupDescription = groupDescriptionInput ? groupDescriptionInput.value.trim() : "";
        if (!groupName || !subjectName || !groupDescription) return;
        if (validateScheduleList(groupScheduleList, "groupScheduleDay", "groupScheduleFrom", "groupScheduleTo")) {
            groupScheduleList.querySelector("input, select")?.reportValidity();
            return;
        }
        const creationRole = "Teacher";
        const groupLinks = groupLinksList
            ? [...groupLinksList.querySelectorAll(".group-link-row")]
                .map((row) => ({
                    type: row.querySelector("select")?.value || "other",
                    url: row.querySelector("input")?.value.trim() || ""
                }))
                .filter((link) => link.url)
            : [];
        showConfirmation(
            `Are you sure you want to create the group "${groupName}"?`,
            async () => {
                const supabase = window.hiveSupabase;
                if (!supabase) { showAlert("Cannot connect to database.", { title: "Connection Error" }); return; }

                const { data: { user }, error: userErr } = await supabase.auth.getUser();
                if (!user || userErr) { showAlert("You must be logged in to create a group.", { title: "Not Logged In" }); return; }

                const { data: newGroup, error: grpErr } = await supabase
                    .from("GROUP")
                    .insert({
                        grpName: groupName,
                        grpSubject: subjectName,
                        grpType: "COLONY",
                        ...(creationRole === "Teacher" ? { teacherId: user.id } : {}),
                        grpMotto: groupMottoInput?.value.trim() || null,
                        grpDescription: groupDescription || null,
                        grpMeetingSchedule: getGroupSchedule(),
                        grpLinks: groupLinks
                    })
                    .select("grpId").single();
                if (grpErr || !newGroup) { showAlert("Failed to create group: " + (grpErr?.message || "Unknown error"), { title: "Error" }); return; }

                const { data: creatorRole } = await supabase.from("ROLE").select("roleId").eq("roleName", creationRole).maybeSingle();
                if (!creatorRole) return;

                const { error: memErr } = await supabase
                    .from("GROUPMEMBER")
                    .insert({ userId: user.id, grpId: newGroup.grpId, roleId: creatorRole.roleId });
                if (memErr) { showAlert("Group created but failed to assign your role: " + memErr.message, { title: "Error" }); return; }

                closeAddGroupModal();
                await loadDashbData(); // refresh from DB
            },
            { title: "Create Group", confirmText: "Create", cancelText: "Cancel" }
        );
    });
}

if (createTeamForm) {
    createTeamForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (validateScheduleList(teamScheduleList, "teamScheduleDay", "teamScheduleFrom", "teamScheduleTo")) {
            teamScheduleList.querySelector("input, select")?.reportValidity();
            return;
        }
        const teamName = teamNameInput?.value.trim() || "";
        const teamSubject = teamSubjectInput?.value.trim() || "";
        const teamDescription = teamDescriptionInput?.value.trim() || "";
        if (!teamName || !teamSubject || !teamDescription) return;
        const creationRole = "Teacher";
        const teamLinks = [...(teamLinksList?.querySelectorAll(".group-link-row") || [])]
            .map((row) => ({ type: row.querySelector("select")?.value || "other", url: row.querySelector("input")?.value.trim() || "" }))
            .filter((link) => link.url);

        const supabase = window.hiveSupabase;
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const creatorRoleName = creationRole === "Teacher" ? "Teacher" : "Leader";
        const { data: creatorRole } = await supabase.from("ROLE").select("roleId").eq("roleName", creatorRoleName).maybeSingle();
        if (!creatorRole) return;

        const { data: team, error } = await supabase.from("GROUP").insert({
            grpName: teamName,
            grpSubject: teamSubject,
            grpType: "SWARM",
            ...(creationRole === "Teacher" ? { teacherId: user.id } : {}),
            parentGrpId: null,
            grpMotto: teamMottoInput?.value.trim() || null,
            grpDescription: teamDescription,
            grpMeetingSchedule: getTeamSchedule(),
            grpLinks: teamLinks
        }).select("grpId").single();
        if (error || !team) {
            showAlert("Failed to create swarm: " + (error?.message || "Unknown error"), { title: "Error" });
            return;
        }

        const { error: membershipError } = await supabase.from("GROUPMEMBER").insert({
            userId: user.id,
            grpId: team.grpId,
            roleId: creatorRole.roleId
        });
        if (membershipError) {
            await supabase.from("GROUP").delete().eq("grpId", team.grpId);
            showAlert("Swarm created but leader setup failed: " + membershipError.message, { title: "Error" });
            return;
        }

        closeCreateTeamModal();
        await loadDashbData();
    });
}

const closeJoinGroupModal = () => {
    if (!joinGroupModal) return;
    joinGroupModal.classList.remove("open");
    joinGroupModal.setAttribute("aria-hidden", "true");
};

const closeInvitationPreviewModal = () => {
    if (!invitationPreviewModal) return;
    invitationPreviewModal.classList.remove("open");
    invitationPreviewModal.setAttribute("aria-hidden", "true");
};

const parseGroupInviteId = (groupLink) => {
    if (!groupLink) return null;
    const trimmed = groupLink.trim();
    if (!trimmed) return null;
    if (trimmed.includes("?invite=")) {
        try {
            const url = new URL(trimmed);
            return Number(url.searchParams.get("invite"));
        } catch {
            const match = trimmed.match(/invite=(\d+)/);
            return match ? Number(match[1]) : null;
        }
    }
    if (trimmed.includes("invite=")) {
        const match = trimmed.match(/invite=(\d+)/);
        return match ? Number(match[1]) : null;
    }
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const populateInvitationPreview = async (grpId) => {
    const supabase = window.hiveSupabase;
    if (!supabase || !grpId) return;

    const { data: group, error: groupError } = await supabase
        .from("GROUP")
        .select("grpId, grpName, grpSubject, grpType, parentGrpId, grpDescription, grpMotto, grpMeetingSchedule, grpLinks, teacherId")
        .eq("grpId", grpId)
        .maybeSingle();

    if (groupError || !group) {
        showAlert("Group not found. Check the invite link and try again.", { title: "Not Found" });
        closeInvitationPreviewModal();
        return;
    }

    const memberCountResult = await supabase
        .from("GROUPMEMBER")
        .select("grpmemId", { count: "exact", head: true })
        .eq("grpId", grpId);

    const { data: groupMembers } = await supabase
        .from("GROUPMEMBER")
        .select("userId, ROLE(roleName), USER(userDisplayName, avatarPath)")
        .eq("grpId", grpId);

    const leader = (groupMembers || []).find((member) => String(member.ROLE?.roleName || "").trim().toLowerCase() === "leader");
    const teacher = (groupMembers || []).find((member) => String(member.ROLE?.roleName || "").trim().toLowerCase() === "teacher");
    const instructorIds = new Set((groupMembers || [])
        .filter((member) => String(member.ROLE?.roleName || "").trim().toLowerCase() === "teacher")
        .map((member) => String(member.userId)));
    if (group.teacherId) instructorIds.add(String(group.teacherId));
    const instructorCount = instructorIds.size;
    const normalizedType = String(group.grpType || "COLONY").toUpperCase();
    const isSwarm = normalizedType === "SWARM";
    const memberCount = Math.max(0, (memberCountResult?.count ?? 0) - instructorIds.size);
    const { count: projectCount = 0 } = await supabase
        .from("PROJECT")
        .select("projId", { count: "exact", head: true })
        .eq("grpId", grpId);
    const [{ data: latestNotification }, { data: latestNote }] = await Promise.all([
        supabase.from("NOTIFICATION").select('"notiDate&Time"').eq("grpId", grpId).order("notiDate&Time", { ascending: false }).limit(1),
        supabase.from("GROUP_NOTE").select("createdAt").eq("grpId", grpId).order("createdAt", { ascending: false }).limit(1)
    ]);
    const leaderName = leader?.USER?.userDisplayName || teacher?.USER?.userDisplayName || "Leader unavailable";
    
    let leaderAvatar = "../assets/profile.png";
    const leaderAvatarPath = leader?.USER?.avatarPath || teacher?.USER?.avatarPath;
    if (leaderAvatarPath) {
        leaderAvatar = leaderAvatarPath.startsWith("http")
            ? leaderAvatarPath
            : supabase.storage.from("profilePicture").getPublicUrl(leaderAvatarPath).data?.publicUrl || "../assets/profile.png";
    }

    const detailName = String(group.grpName || "Unnamed Group");
    const detailSubject = String(group.grpSubject || "");
    const descriptionText = group.grpDescription || `${detailName} is a ${detailSubject} ${isSwarm ? "swarm" : "colony"}. Keep your shared project context here.`;
    const mottoText = String(group.grpMotto || "").trim() || "Not Set";
    const entityLabel = isSwarm ? "Swarm" : "Colony";

    if (invitePreviewIntro) invitePreviewIntro.textContent = `We are inviting you to our ${entityLabel}`;
    if (invitePreviewTeamName) invitePreviewTeamName.textContent = detailName;
    if (invitePreviewMeta) invitePreviewMeta.textContent = `${detailSubject || "Subject"} | ${memberCount} members | ${instructorCount} ${instructorCount === 1 ? "instructor" : "instructors"}`;
    if (invitePreviewDescription) invitePreviewDescription.textContent = descriptionText;
    if (invitePreviewProjectCount) invitePreviewProjectCount.textContent = `${projectCount} ${projectCount === 1 ? "Project" : "Projects"}`;
    if (invitePreviewMotto) invitePreviewMotto.textContent = mottoText;
    if (invitePreviewLeader) invitePreviewLeader.textContent = leaderName;
    if (invitePreviewLeaderAvatar) invitePreviewLeaderAvatar.src = leaderAvatar;
    if (invitePreviewStatusLabel) invitePreviewStatusLabel.textContent = `${entityLabel} Status`;
    if (invitePreviewMottoLabel) invitePreviewMottoLabel.textContent = `${entityLabel} Motto`;
    const latestActivity = [latestNotification?.[0]?.["notiDate&Time"], latestNote?.[0]?.createdAt]
        .map((value) => new Date(value || 0).getTime())
        .filter(Number.isFinite)
        .sort((a, b) => b - a)[0] || 0;
    const isActive = Date.now() - latestActivity < 7 * 24 * 60 * 60 * 1000;
    if (invitePreviewStatus) {
        invitePreviewStatus.textContent = isActive ? "Active" : "Inactive";
        invitePreviewStatus.classList.toggle("status-active", isActive);
        invitePreviewStatus.classList.toggle("status-inactive", !isActive);
    }

    if (invitationPreviewModal) {
        invitationPreviewModal.classList.add("open");
        invitationPreviewModal.setAttribute("aria-hidden", "false");
    }

    const pendingJoin = async (roleName) => {
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (!user || userErr) { showAlert("You must be logged in.", { title: "Not Logged In" }); closeInvitationPreviewModal(); return; }

        const { data: existing } = await supabase
            .from("GROUPMEMBER")
            .select("grpmemId")
            .eq("userId", user.id)
            .eq("grpId", grpId)
            .maybeSingle();
        if (existing) { showAlert("You are already a member of this group.", { title: "Already Joined" }); closeInvitationPreviewModal(); return; }

        const { data: memberRole } = await supabase
            .from("ROLE")
            .select("roleId")
            .eq("roleName", roleName)
            .maybeSingle();

        const { error: memErr } = await supabase
            .from("GROUPMEMBER")
            .insert({ userId: user.id, grpId: grpId, roleId: memberRole?.roleId || null });
        if (memErr) { showAlert("Failed to join group: " + memErr.message, { title: "Error" }); return; }

        (async () => {
            try {
                const [{ data: existingMembers }, { data: groupInfo }, { data: joinerProfile }] = await Promise.all([
                    supabase.from("GROUPMEMBER").select("userId").eq("grpId", grpId).neq("userId", user.id),
                    supabase.from("GROUP").select("grpName, teacherId").eq("grpId", grpId).maybeSingle(),
                    supabase.from("USER").select("userDisplayName").eq("userId", user.id).maybeSingle()
                ]);
                const recipients = new Set((existingMembers || []).map(m => m.userId));
                if (groupInfo?.teacherId && groupInfo.teacherId !== user.id) recipients.add(groupInfo.teacherId);
                const joinerName = joinerProfile?.userDisplayName || "A new member";
                const grpName = groupInfo?.grpName || "the group";
                const now = new Date().toISOString();
                await Promise.all([...recipients].map(uid =>
                    supabase.from("NOTIFICATION").insert({
                        notiTitle: "New Member Joined",
                        notiBody: `${joinerName} has joined "${grpName}".`,
                        "notiDate&Time": now,
                        notiIsRead: false,
                        userId: uid,
                        grpId: Number(grpId)
                    })
                ));
            } catch (e) {}
        })();

        closeInvitationPreviewModal();
        closeJoinGroupModal();

        // Teachers use the teacher group view for both Colonies and Swarms.
        window.location.href = `t.grpviewing.html?grpId=${grpId}&from=dashboard`;
    };

    if (joinAsInstructorBtn) joinAsInstructorBtn.onclick = () => pendingJoin("Teacher");
};

const openJoinGroupModal = () => {
    if (!joinGroupModal) return;
    joinGroupModal.classList.add("open");
    joinGroupModal.setAttribute("aria-hidden", "false");
    if (groupLinkInput) { groupLinkInput.value = ""; groupLinkInput.focus(); }
    updateJoinGroupState();
};

if (openJoinGroupModalBtn) openJoinGroupModalBtn.addEventListener("click", openJoinGroupModal);
if (discardJoinGroupBtn) discardJoinGroupBtn.addEventListener("click", closeJoinGroupModal);
if (groupLinkInput) groupLinkInput.addEventListener("input", updateJoinGroupState);
if (joinGroupModal) joinGroupModal.addEventListener("click", (e) => { if (e.target === joinGroupModal) closeJoinGroupModal(); });
if (closeInvitationPreviewBtn) closeInvitationPreviewBtn.addEventListener("click", closeInvitationPreviewModal);
if (invitationPreviewModal) invitationPreviewModal.addEventListener("click", (e) => { if (e.target === invitationPreviewModal) closeInvitationPreviewModal(); });

if (joinGroupBtn) {
    joinGroupBtn.addEventListener("click", () => {
        const groupLink = groupLinkInput ? groupLinkInput.value.trim() : "";
        if (!groupLink) return;

        const grpId = parseGroupInviteId(groupLink);
        if (!grpId || isNaN(grpId)) {
            showAlert("Invalid group link. Please enter a valid invite link or numeric group ID.", { title: "Invalid Link" });
            return;
        }

        populateInvitationPreview(grpId);
    });
}

const closeEditOwnedGroupModal = () => {
    if (!editOwnedGroupModal) return;
    editOwnedGroupModal.classList.remove("open");
    editOwnedGroupModal.setAttribute("aria-hidden", "true");
};

const requestCloseEditOwnedGroupModal = () => {
    showConfirmation("Are you sure you want to close this form? Your changes will be lost.", closeEditOwnedGroupModal, {
        title: "Close Form",
        confirmText: "Close",
        cancelText: "Keep Editing"
    });
};

const openEditOwnedGroupModal = (group) => {
    if (!editOwnedGroupModal) return;
    if (editOwnedGroupNameInput) editOwnedGroupNameInput.value = group.name;
    if (editOwnedGroupSubjectInput) editOwnedGroupSubjectInput.value = group.subject;
    if (editOwnedGroupMottoInput) editOwnedGroupMottoInput.value = group.motto || "";
    editOwnedGroupModal.dataset.editingGrpId = group.grpId;
    updateEditOwnedGroupState();
    editOwnedGroupModal.classList.add("open");
    editOwnedGroupModal.setAttribute("aria-hidden", "false");
};

if (openEditOwnedGroupModalBtn) {
    openEditOwnedGroupModalBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (dashbData.ownedGroups && dashbData.ownedGroups.length > 0) {
            openEditOwnedGroupModal(dashbData.ownedGroups[0]);
        }
    });
}

if (discardEditOwnedGroupBtn) discardEditOwnedGroupBtn.addEventListener("click", requestCloseEditOwnedGroupModal);
if (editOwnedGroupNameInput) editOwnedGroupNameInput.addEventListener("input", updateEditOwnedGroupState);
if (editOwnedGroupSubjectInput) editOwnedGroupSubjectInput.addEventListener("input", updateEditOwnedGroupState);
if (editOwnedGroupModal) editOwnedGroupModal.addEventListener("click", (e) => { if (e.target === editOwnedGroupModal) requestCloseEditOwnedGroupModal(); });

document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (addGroupModal?.classList.contains("open")) {
        event.preventDefault();
        requestCloseAddGroupModal();
    } else if (createTeamModal?.classList.contains("open")) {
        event.preventDefault();
        requestCloseCreateTeamModal();
    } else if (editOwnedGroupModal?.classList.contains("open")) {
        event.preventDefault();
        requestCloseEditOwnedGroupModal();
    }
});

if (saveEditOwnedGroupBtn) {
    saveEditOwnedGroupBtn.addEventListener("click", () => {
        const newName = editOwnedGroupNameInput ? editOwnedGroupNameInput.value.trim() : "";
        const newSubject = editOwnedGroupSubjectInput ? editOwnedGroupSubjectInput.value.trim() : "";
        const newMotto = editOwnedGroupMottoInput ? editOwnedGroupMottoInput.value.trim() : "";
        const grpId = editOwnedGroupModal.dataset.editingGrpId;
        if (!newName || !newSubject || !grpId) return;
        showConfirmation(
            `Are you sure you want to save changes to "${newName}"?`,
            async () => {
                const supabase = window.hiveSupabase;
                const { error } = await supabase
                    .from("GROUP")
                    .update({ grpName: newName, grpSubject: newSubject, grpMotto: newMotto || null })
                    .eq("grpId", Number(grpId));
                if (error) { showAlert("Failed to save: " + error.message, { title: "Error" }); return; }
                closeEditOwnedGroupModal();
                await loadDashbData();
            },
            { title: "Save Changes", confirmText: "Save", cancelText: "Cancel" }
        );
    });
}

updateAddGroupCreateState();
updateJoinGroupState();
updateEditOwnedGroupState();

const loadTopbarAvatar = async () => {
    const profileImage = document.querySelector(".profile-trigger img");
    const supabase = window.hiveSupabase;
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (profileDropdownName) {
        profileDropdownName.textContent = user.user_metadata?.full_name
            || user.user_metadata?.name
            || user.email?.split("@")[0]
            || "Profile";
    }
    if (profileDropdownEmail) profileDropdownEmail.textContent = user.email || "Email";

    const { data, error } = await supabase
        .from("USER")
        .select("userDisplayName, userEmail, avatarPath")
        .eq("userId", user.id)
        .maybeSingle();
    if (error) console.warn("Could not load profile details:", error.message);
    if (profileDropdownName && data?.userDisplayName) profileDropdownName.textContent = data.userDisplayName;
    if (profileDropdownEmail && data?.userEmail) profileDropdownEmail.textContent = data.userEmail;
    if (!data?.avatarPath) return;
    const avatarUrl = data.avatarPath.startsWith("http")
        ? data.avatarPath
        : supabase.storage.from("profilePicture").getPublicUrl(data.avatarPath).data?.publicUrl;
    if (avatarUrl && profileImage) {
        profileImage.src = avatarUrl;
    }
    if (avatarUrl && profileDropdownAvatar) {
        profileDropdownAvatar.src = avatarUrl;
    }
};

loadTopbarAvatar();

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
