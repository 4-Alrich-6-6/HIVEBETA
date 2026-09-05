const supa = () => window.hiveSupabase;
const STATUSES = { 1: "Not Active", 2: "Active", 3: "On Break", 4: "Verifying", 5: "Finished", 6: "Missing", 7: "Revising" };
const HIDDEN_TASK_STATUSES = new Set([4, 5]);

const loadAvatar = async (userId) => {
	const image = document.querySelector(".profile-trigger img");
	if (!image || !userId) return;
	const { data } = await supa().from("USER").select("avatarPath").eq("userId", userId).maybeSingle();
	if (!data?.avatarPath) return;
	const url = data.avatarPath.startsWith("http") ? data.avatarPath : supa().storage.from("profilePicture").getPublicUrl(data.avatarPath).data?.publicUrl;
	if (url) image.src = url;
};

const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-US") : "--/--/----";
const formatTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "--:--";

const loadTasks = async (userId) => {
	const { data: memberships, error: membershipError } = await supa()
		.from("GROUPMEMBER")
		.select("grpmemId, grpId, ROLE(roleName)")
		.eq("userId", userId);
	if (membershipError) throw membershipError;
	const membershipIds = (memberships || []).map(member => member.grpmemId);
	if (!membershipIds.length) return [];
	const groupIds = [...new Set((memberships || []).map(member => member.grpId))];

	const { data: groups, error: groupError } = await supa()
		.from("GROUP")
		.select("grpId, grpName")
		.in("grpId", groupIds);
	if (groupError) throw groupError;
	const groupNames = new Map((groups || []).map(group => [group.grpId, group.grpName]));

	const { data: assignments, error: assignmentError } = await supa()
		.from("TASKASSIGNMENT")
		.select("taskId, grpmemId")
		.in("grpmemId", membershipIds);
	if (assignmentError) throw assignmentError;

	const membershipGroups = new Map((memberships || []).map(member => [member.grpmemId, groupNames.get(member.grpId) || "Team Name"]));
	const membershipRoles = new Map((memberships || []).map(member => [member.grpmemId, member.ROLE?.roleName || ""]));
	const taskGroups = new Map((assignments || []).map(assignment => [assignment.taskId, membershipGroups.get(assignment.grpmemId)]));
	const taskGroupIds = new Map((assignments || []).map(assignment => [assignment.taskId, memberships.find(member => member.grpmemId === assignment.grpmemId)?.grpId]));
	const taskIsLeader = new Map((assignments || []).map(assignment => [assignment.taskId, membershipRoles.get(assignment.grpmemId)?.toLowerCase() === "leader"]));

	const { data, error } = await supa()
		.from("TASK")
		.select("taskId, taskName, taskDueD, statId, PROJECT!inner(projId, projName, grpId)")
		.in("PROJECT.grpId", groupIds);
	if (error) throw error;
	return (data || []).filter(task => !HIDDEN_TASK_STATUSES.has(task.statId)).map(task => ({
		...task,
		sourceGroupName: taskGroups.get(task.taskId) || groupNames.get(task.PROJECT?.grpId) || "Team Name",
		sourceGroupId: taskGroupIds.get(task.taskId) || task.PROJECT?.grpId,
		isLeaderAssignment: taskIsLeader.get(task.taskId) || false
	}));
};

const openTaskProject = (task) => {
	const projectId = task.PROJECT?.projId;
	const groupId = task.sourceGroupId || task.PROJECT?.grpId;
	if (!projectId || !groupId) return;
	sessionStorage.setItem("hive_selected_project", String(projectId));
	sessionStorage.setItem("hive_selected_project_name", task.PROJECT?.projName || "Project");
	sessionStorage.setItem("hive_grpId", String(groupId));
	window.location.href = `s.taskdt.html?taskId=${encodeURIComponent(task.taskId)}&grpId=${encodeURIComponent(groupId)}&projId=${encodeURIComponent(projectId)}`;
};

const renderTasks = (tasks) => {
	const list = document.querySelector("#taskList");
	if (!list) return;
	if (!tasks.length) {
		list.classList.add("is-empty");
		list.innerHTML = `
			<div class="empty-state task-empty-placeholder">
				<img class="empty-state-icon" src="../assets/bee-flight.svg" alt="">
				<h2>You Have No Pending Tasks Yet</h2>
				<p>Check back later or explore your projects to find other's unfinished tasks and help them like a good team member.</p>
			</div>
		`;
		return;
	}
	list.classList.remove("is-empty");
	list.innerHTML = tasks.map(task => {
		const due = task.taskDueD;
		const group = task.sourceGroupName || task.PROJECT?.projName || "Team Name";
		const project = task.PROJECT?.projName || "Project Name";
		return `<article class="task-row" data-task-id="${task.taskId}">
			<div class="task-info"><span class="task-name">${task.taskName || "Untitled Task"}</span><span class="task-source"><span>From: ${group}</span><span>Project: ${project}</span></span></div>
			<div class="task-due"><span>Due Date: ${formatDate(due)}</span><span>Due Time: ${formatTime(due)}</span></div>
			<span class="task-status">${STATUSES[task.statId] || "Pending"}</span><span class="task-arrow" aria-hidden="true">›</span>
		</article>`;
	}).join("");
	list.querySelectorAll(".task-row").forEach((row, index) => {
		row.addEventListener("click", () => openTaskProject(tasks[index]));
	});
};

(async () => {
	const { data: { user } } = await supa().auth.getUser();
	if (!user) return;
	await loadAvatar(user.id);
	try { renderTasks(await loadTasks(user.id)); }
	catch (error) { console.error("Failed to load pending tasks:", error); document.querySelector("#taskList").innerHTML = '<p class="empty-state">Unable to load pending tasks.</p>'; }
})();
