(() => {
    const injectStyles = () => {
        if (document.querySelector("#memberProfileStatsStyles")) return;
        const style = document.createElement("style");
        style.id = "memberProfileStatsStyles";
        style.textContent = `
            .member-profile-card { width: min(560px, calc(100vw - 32px)); overflow: hidden; }
            .member-profile-card .confirmation-modal-header { padding: 18px 32px; background: #ffffb8; text-align: left; }
            .member-profile-card, .member-profile-card * { font-family: 'Kodchasan', sans-serif; }
            .member-profile-card .confirmation-modal-header h2 { margin: 0; color: #000; font-size: 26px; font-family: 'Inter', sans-serif; }
            .member-profile-card .confirmation-modal-body { gap: 16px !important; padding: 16px 20px 14px !important; }
            .member-profile-card .confirmation-modal-actions { padding: 14px 26px 17px; background: #ffffb8; justify-content: flex-end; }
            .member-profile-card .confirmation-modal-actions .modal-btn { min-width: 80px; padding: 6px 18px; }
            .member-profile-card .member-profile-identity { display: flex; align-items: center; gap: 18px; width: 100%; text-align: left; }
            .member-profile-card .member-profile-identity > div:last-child { min-width: 0; }
            .member-profile-card .member-profile-identity p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .member-profile-card #memberProfileName { font-family: 'Inter', sans-serif; font-weight: 800; }
            .member-profile-card .member-profile-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; width: 100%; margin-bottom: 12px; }
            .member-profile-card .member-profile-stat { min-height: 64px; padding: 9px 10px; border: 1px solid #d0d0c8; border-radius: 6px; text-align: left; }
            .member-profile-card .member-profile-stat:nth-child(1), .member-profile-card .member-profile-stat:nth-child(2) { background: #ffffb8; }
            .member-profile-card .member-profile-stat:nth-child(3) { background: #d8ffd8; }
            .member-profile-card .member-profile-stat:nth-child(4) { background: #ffdede; }
            .member-profile-card .member-profile-stat-label { display: block; font-size: 12px; }
            .member-profile-card .member-profile-stat-value { display: block; margin-top: 3px; font-size: 30px; font-weight: 800; line-height: 1; font-family: 'Inter', sans-serif; }
            .member-profile-card .member-profile-detail { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; width: 100%; padding: 14px 12px; border: 1px solid #d0d0c8; border-radius: 6px; text-align: left; }
            .member-profile-card .member-profile-task-stats p { display: flex; justify-content: space-between; gap: 12px; margin: 0 0 8px; font-size: 13px; }
            .member-profile-card .member-profile-task-stats p:last-child { margin-bottom: 0; }
            .member-profile-card .member-profile-average { display: flex; align-items: center; justify-content: space-around; gap: 14px; text-align: center; }
            .member-profile-card .member-profile-average-label { margin: 0 0 5px; font-size: 12px; }
            .member-profile-card .member-profile-average-value { margin: 0; font-size: 50px; font-weight: 800; line-height: 1; font-family: 'Inter', sans-serif; }
            .member-profile-card .member-profile-average-value.reputation { font-size: 42px; }
            .member-profile-card .member-profile-statistics-hidden { display: flex; align-items: center; justify-content: center; width: 100%; min-height: 170px; background: #fff; color: #111; font-family: 'Inter', sans-serif; font-size: 17px; font-weight: 700; text-align: center; }
            .member-profile-card .member-profile-statistics-hidden[hidden], .member-profile-card #memberProfileStatsContent[hidden] { display: none !important; }
            @media (max-width: 520px) { .member-profile-card .member-profile-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } .member-profile-card .member-profile-detail { grid-template-columns: 1fr; } }
        `;
        document.head.appendChild(style);
    };

    const setText = (id, value) => {
        const element = document.querySelector(`#${id}`);
        if (element) element.textContent = value;
    };

    const getAverage = (values) => values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null;
    const getScoreGrade = (score) => score >= 90 ? "S" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : score >= 50 ? "D" : "F";

    const getParticipationAverage = async (supabase, memberships) => {
        const memberIds = (memberships || []).map((membership) => membership.grpmemId).filter(Boolean);
        if (!memberIds.length) return null;
        const { data: assignments, error: assignmentError } = await supabase
            .from("TASKASSIGNMENT")
            .select("taskId, grpmemId")
            .in("grpmemId", memberIds);
        const taskIds = [...new Set((assignments || []).map((assignment) => assignment.taskId).filter(Boolean))];
        if (assignmentError || !taskIds.length) return null;
        const [{ data: tasks, error: taskError }, { data: submissions }] = await Promise.all([
            supabase.from("TASK").select("taskId, projId, taskDueD, statId").in("taskId", taskIds),
            supabase.from("SUBMISSION").select("taskId, grpmemId, submittedAt").in("taskId", taskIds)
        ]);
        if (taskError || !tasks?.length) return null;

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

        const projectScores = [...projects.values()].map((projectTasks) => {
            let score = 0;
            projectTasks.forEach((task) => {
                if (Number(task.statId) !== 5) return;
                const dueAt = Date.parse(task.taskDueD || "");
                const submittedAt = Date.parse(task.submission?.submittedAt || "");
                score += dueAt && submittedAt && submittedAt > dueAt ? 0.75 : 1;
            });
            return Math.round((score / projectTasks.length) * 100 * 10) / 10;
        });
        if (!projectScores.length) return null;
        return Math.round((projectScores.reduce((sum, score) => sum + score, 0) / projectScores.length) * 10) / 10;
    };

    const loadStats = async (member) => {
        injectStyles();
        const supabase = window.hiveSupabase;
        if (!supabase || !member?.userId) return;
        ["memberProfileTotalTeams", "memberProfileCreatedTeams", "memberProfileCompletedTasks", "memberProfilePendingTasks", "memberProfileReceivedTasks", "memberProfileMissedTasks", "memberProfileAverageScore", "memberProfileAverageReputation"].forEach((id) => setText(id, "..."));
        const [{ data: profile }, { data: memberships }, { data: history }] = await Promise.all([
            supabase.from("USER").select("privateEmail, privateStats").eq("userId", member.userId).maybeSingle(),
            supabase.from("GROUPMEMBER").select("grpmemId, roleId, ROLE(roleName)").eq("userId", member.userId),
            supabase.from("TASKHISTORY").select("statId").eq("userId", member.userId)
        ]);
        const email = document.querySelector("#memberProfileEmail");
        if (email) {
            if (profile?.privateEmail) email.textContent = "Private";
            email.style.visibility = "visible";
        }
        const statsContainer = document.querySelector("#memberProfileStatsContent");
        if (statsContainer) {
            statsContainer.hidden = Boolean(profile?.privateStats);
            statsContainer.style.display = profile?.privateStats ? "none" : "";
        }
        const hiddenMessage = document.querySelector("#memberProfileStatsHidden");
        if (hiddenMessage) {
            hiddenMessage.hidden = !profile?.privateStats;
            hiddenMessage.style.display = profile?.privateStats ? "flex" : "none";
        }
        if (profile?.privateStats) return;
        const taskHistory = history || [];
        const completed = taskHistory.filter((task) => Number(task.statId) === 5).length;
        const missed = taskHistory.filter((task) => Number(task.statId) === 6).length;
        const created = (memberships || []).filter((item) => String(item.ROLE?.roleName || "").toLowerCase() === "leader").length;
        const currentMemberIds = (memberships || []).map((membership) => membership.grpmemId).filter(Boolean);
        const { data: currentAssignments } = currentMemberIds.length
            ? await supabase.from("TASKASSIGNMENT").select("taskId, grpmemId").in("grpmemId", currentMemberIds)
            : { data: [] };
        const currentTaskIds = [...new Set((currentAssignments || []).map((assignment) => assignment.taskId))];
        const { data: currentTasks } = currentTaskIds.length
            ? await supabase.from("TASK").select("projId, PROJECT(projStatus)").in("taskId", currentTaskIds)
            : { data: [] };
        const ongoingProjectCount = new Set((currentTasks || [])
            .filter((task) => String(task.PROJECT?.projStatus || "").toLowerCase() === "ongoing")
            .map((task) => String(task.projId))).size;
        setText("memberProfileTotalTeams", String((memberships || []).length).padStart(2, "0"));
        setText("memberProfileCreatedTeams", String(created).padStart(2, "0"));
        setText("memberProfileCompletedTasks", String(ongoingProjectCount).padStart(2, "0"));
        setText("memberProfilePendingTasks", String(Math.max(taskHistory.length - completed - missed, 0)).padStart(2, "0"));
        setText("memberProfileReceivedTasks", String(taskHistory.length).padStart(2, "0"));
        setText("memberProfileCompletedTaskTotal", String(completed).padStart(2, "0"));
        setText("memberProfileMissedTasks", String(missed).padStart(2, "0"));

        const memberIds = (memberships || []).map((item) => item.grpmemId).filter(Boolean);
        const { data: evaluations } = memberIds.length
            ? await supabase.from("PEEREVAL").select("evalRemarks, confirmed").in("evaluatedGrpmemId", memberIds)
            : { data: [] };
        const ratings = (evaluations || []).filter((evaluation) => evaluation.confirmed !== false).map((evaluation) => Number(String(evaluation.evalRemarks || "").match(/(10|[0-9])\s*\/\s*10/)?.[1])).filter(Number.isFinite);
        const averageReputation = getAverage(ratings);
        const averageScore = await getParticipationAverage(supabase, memberships);
        setText("memberProfileAverageScore", averageScore === null ? "N/A" : getScoreGrade(averageScore));
        setText("memberProfileAverageReputation", averageReputation === null ? "N/A" : `${averageReputation}/10`);
    };

    window.memberProfileStats = { load: loadStats };
})();
