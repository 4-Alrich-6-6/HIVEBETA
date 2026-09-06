const tutorialContent = document.querySelector("#tutorialContent");

if (tutorialContent) {
    const tutorials = {
        student: [
            { eyebrow: "Create your Team", title: "Create your own Colony", text: "Create a colony to organize your different swarms in a single organization. Invite members, assign roles, and manage your group's projects and activities.", tabs: ["Colony", "Swarm"], swarmTitle: "Create a swarm", swarmText: "Create a swarm for a specific project or activity. Add team members, collaborate on tasks, and track your progress together." },
            { eyebrow: "Join a Team", title: "Join your team", text: "Use an invite link to join a colony or swarm. Your teams will appear on your dashboard." },
            { eyebrow: "Explore Your Project", title: "View your projects", text: "Open a team project to see its description, members, deadline, and current progress." },
            { eyebrow: "Manage Your Tasks", title: "Track your tasks", text: "View the tasks assigned to you, update their status, and submit your work before the deadline." },
            { eyebrow: "Track Your Participation", title: "Monitor your contributions", text: "Review your completed tasks and participation records to see your contribution to the team." },
            { eyebrow: "Stay Updated", title: "Check your notifications", text: "Notifications keep you informed about team invites, task updates, project changes, and announcements." },
            { eyebrow: "", title: "You're ready to collaborate", text: "Start by joining a team or checking your assigned tasks." },
        ],
        teacher: [
            { eyebrow: "Create your Team", title: "Create your own colony", text: "Create a colony to organize your different swarms in a single organization. Invite members, assign roles, and manage your group's projects and activities in one place.", tabs: ["Colony", "Swarm"], swarmTitle: "Create a swarm", swarmText: "Create a swarm for a specific project or activity. Add team members, collaborate on tasks, and track your progress together." },
            { eyebrow: "Create Projects", title: "Set up a project", text: "Add a project name, description, deadline, and team to organize your students' work." },
            { eyebrow: "Assign Tasks", title: "Create and assign tasks", text: "Add task instructions, assign tasks to students, and monitor their progress." },
            { eyebrow: "Validate Submissions", title: "Review student submissions", text: "Open 'Tasks to be Validated' to review completed work and validate student submissions." },
            { eyebrow: "Monitor Team Progress", title: "Track project progress", text: "Check completed tasks, active projects, deadlines, and student participation from your dashboard." },
            { eyebrow: "", title: "You're ready to manage your teams", text: "Start by creating a team or reviewing your active projects." },
        ],
    };

    const storedRole = String(localStorage.getItem("hive_role") || "").trim().toLowerCase();
    const requestedRole = String(new URLSearchParams(window.location.search).get("role") || "").trim().toLowerCase();
    const fallbackRole = requestedRole === "teacher" || requestedRole === "professor" || storedRole === "teacher" || storedRole === "professor"
        ? "teacher"
        : "student";
    let activeRole = fallbackRole;
    let activeStep = 0;
    let activeTeamType = "Colony";

    const resolveUserRole = async () => {
        const supabase = window.hiveSupabase;
        if (!supabase) return fallbackRole;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return fallbackRole;

        const { data: profile } = await supabase
            .from("USER")
            .select("posId, progId, deptId")
            .eq("userId", user.id)
            .maybeSingle();
        if (!profile) return fallbackRole;

        let role = "";
        if (profile.posId) {
            const { data: position } = await supabase
                .from("POSITION")
                .select("posName")
                .eq("posId", profile.posId)
                .maybeSingle();
            role = String(position?.posName || "").trim().toLowerCase();
        }

        const resolvedRole = role === "teacher" || role === "professor" || profile.deptId
            ? "teacher"
            : "student";
        localStorage.setItem("hive_role", resolvedRole);
        return resolvedRole;
    };

    const hexagonSvg = (index, filled) => `
        <button class="progress-hexagon-button" type="button" data-step="${index}" aria-label="Go to page ${index + 1}">
            <svg class="progress-hexagon${filled ? " is-filled" : ""}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M20.9485 11.0195C21.2909 11.6283 21.2909 12.3717 20.9485 12.9805L17.5735 18.9805C17.2192 19.6103 16.5529 20 15.8303 20H8.16969C7.44715 20 6.78078 19.6103 6.42654 18.9805L3.05154 12.9805C2.70908 12.3717 2.70908 11.6283 3.05154 11.0195L6.42654 5.01948C6.78078 4.38972 7.44715 4 8.16969 4H15.8303C16.5529 4 17.2192 4.38972 17.5735 5.01948L20.9485 11.0195Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>`;

    const render = () => {
        const steps = tutorials[activeRole];
        const step = steps[activeStep];
        const title = step.tabs && activeTeamType === "Swarm" ? step.swarmTitle : step.title;
        const text = step.tabs && activeTeamType === "Swarm" ? step.swarmText : step.text;
        const isFinalPage = activeStep === steps.length - 1;
        const progress = steps.map((_, index) => hexagonSvg(index, index <= activeStep)).join("");
        const tabs = step.tabs
            ? `<div class="tutorial-tabs" role="tablist" aria-label="Team type"><button class="tutorial-tab${activeTeamType === step.tabs[0] ? " active" : ""}" type="button" data-team-type="${step.tabs[0]}" role="tab" aria-selected="${activeTeamType === step.tabs[0]}">${step.tabs[0]}</button><button class="tutorial-tab${activeTeamType === step.tabs[1] ? " active" : ""}" type="button" data-team-type="${step.tabs[1]}" role="tab" aria-selected="${activeTeamType === step.tabs[1]}">${step.tabs[1]}</button></div>`
            : "";

        tutorialContent.innerHTML = `
            ${isFinalPage ? "" : '<button class="tutorial-skip" type="button" data-action="skip">Skip <span aria-hidden="true">››</span></button>'}
            <div class="tutorial-eyebrow">${step.eyebrow}</div>
            ${tabs}
            <article class="tutorial-step"><h2>${title}</h2><p>${text}</p></article>
            <div class="tutorial-navigation">
                <button class="tutorial-arrow" type="button" data-action="back" aria-label="Previous page"${activeStep === 0 ? " disabled" : ""}>‹</button>
                <div class="tutorial-progress" aria-label="Tutorial progress">${progress}</div>
                <button class="tutorial-arrow" type="button" data-action="next" aria-label="Next page"${isFinalPage ? " disabled" : ""}>›</button>
            </div>
            ${isFinalPage ? '<button class="tutorial-dashboard-button" type="button" data-action="dashboard">Go to your Dashboard</button>' : ""}`;

        tutorialContent.querySelector("[data-action='skip']")?.addEventListener("click", () => {
            activeStep = tutorials[activeRole].length - 1;
            render();
        });
        tutorialContent.querySelectorAll("[data-team-type]").forEach((button) => {
            button.addEventListener("click", () => {
                activeTeamType = button.dataset.teamType;
                render();
            });
        });
        tutorialContent.querySelector("[data-action='back']")?.addEventListener("click", () => { activeStep = Math.max(0, activeStep - 1); render(); });
        tutorialContent.querySelectorAll("[data-step]").forEach((button) => {
            button.addEventListener("click", () => {
                activeStep = Number(button.dataset.step);
                render();
            });
        });
        tutorialContent.querySelector("[data-action='next']")?.addEventListener("click", () => {
            if (activeStep === steps.length - 1) {
                window.location.href = activeRole === "teacher" ? "../teacher/t.dashb.html" : "../student/s.dashb.html";
                return;
            }
            activeStep += 1;
            render();
        });
        tutorialContent.querySelector("[data-action='dashboard']")?.addEventListener("click", () => {
            window.location.href = activeRole === "teacher" ? "../teacher/t.dashb.html" : "../student/s.dashb.html";
        });
    };

    resolveUserRole()
        .then((role) => {
            activeRole = role;
            render();
        })
        .catch((error) => {
            console.error("Unable to resolve tutorial role:", error);
            render();
        });
}
