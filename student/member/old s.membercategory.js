const topBackBtn = document.querySelector("#topBackBtn");
const groupInfoTab = document.querySelector("#groupInfoTab");
const categoryList = document.querySelector(".category-list");
const logoutBtn = document.querySelector(".logout");

const supa = () => window.hiveSupabase;
const getGrpId = () => new URLSearchParams(window.location.search).get("grpId") || sessionStorage.getItem("hive_grpId");

const formatDueDate = (iso) => {
    if (!iso) return "Due: --/--/----";
    const [y, m, d] = String(iso).split("-");
    return y && m && d ? `Due: ${m}/${d}/${y}` : "Due: --/--/----";
};

const renderMessage = (title, body) => {
    if (!categoryList) return;
    categoryList.innerHTML = `
        <div class="empty-state">
            <img src="../../assets/Plus.png" class="empty-state-icon" alt="No projects">
            <h3>${title}</h3>
            <p>${body}</p>
        </div>
    `;
};

const loadProjectsFromDB = async () => {
    if (!categoryList) return;
    categoryList.innerHTML = "";

    if (!supa()) {
        renderMessage("Database Not Ready", "Please refresh the page and try again.");
        return;
    }

    const grpId = getGrpId();
    if (!grpId) {
        renderMessage("No Group Selected", "Go back to your dashboard and open a group first.");
        return;
    }

    const { data, error } = await supa()
        .from("PROJECT")
        .select("projId, projName, projDueD")
        .eq("grpId", Number(grpId));

    if (error) {
        renderMessage("Could Not Load Projects", error.message || "Please try again later.");
        return;
    }

    if (!data || data.length === 0) {
        renderAllProjects([]);
        return;
    }

    const projectsWithCounts = await Promise.all(
        data.map(async (project) => {
            const { count } = await supa()
                .from("TASK")
                .select("taskId", { count: "exact", head: true })
                .eq("projId", project.projId);
            return { ...project, projectId: project.projId, taskCount: count || 0 };
        })
    );

    renderAllProjects(projectsWithCounts);
};

const createCategoryItem = (projId, projName, taskCount, dueDate) => {
    const categoryItem = document.createElement("div");
    categoryItem.className = "category-item";
    categoryItem.innerHTML = `
        <button class="category-main-btn" type="button" data-category="${projId}">
            <span class="category-name"></span>
            <span class="category-due-date">${formatDueDate(dueDate)}</span>
            <span class="category-count">${taskCount} Task${taskCount !== 1 ? "s" : ""}</span>
        </button>
    `;

    const btn = categoryItem.querySelector(".category-main-btn");
    const nameEl = categoryItem.querySelector(".category-name");
    if (nameEl) nameEl.textContent = projName || `Project ${projId}`;

    btn.addEventListener("click", () => {
        sessionStorage.setItem("hive_grpId", String(getGrpId()));
        sessionStorage.setItem("hive_selected_project", String(projId));
        sessionStorage.setItem("hive_selected_project_name", projName || `Project ${projId}`);
        window.location.href = `s.memberprojectbreakdown.html?grpId=${getGrpId()}`;
    });

    return categoryItem;
};

const renderAllProjects = (projects) => {
    if (!categoryList) return;
    categoryList.innerHTML = "";

    if (!projects || projects.length === 0) {
        renderMessage("No Projects Available", "There are no projects currently active for this group.");
        return;
    }

    projects.forEach((project) => {
        categoryList.appendChild(createCategoryItem(
            project.projectId,
            project.projName,
            project.taskCount || 0,
            project.projDueD
        ));
    });
};

if (topBackBtn) {
    topBackBtn.addEventListener("click", () => {
        const grpId = getGrpId();
        window.location.href = grpId ? `s.membergrpviewing.html?grpId=${grpId}` : "../s.dashb.html";
    });
}

if (groupInfoTab) {
    groupInfoTab.addEventListener("click", () => {
        const grpId = getGrpId();
        window.location.href = grpId ? `s.membergrpviewing.html?grpId=${grpId}` : "s.membergrpviewing.html";
    });
}

document.querySelector("#mobileGroupInfoBtn")?.addEventListener("click", () => {
    const grpId = getGrpId();
    window.location.href = grpId ? `s.membergrpviewing.html?grpId=${grpId}` : "s.membergrpviewing.html";
});

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        showConfirmation(
            "Are you sure you want to log out?",
            () => window.doLogout?.(),
            { title: "Log Out", confirmText: "Log Out", cancelText: "Cancel" }
        );
    });
}

window.addEventListener("load", loadProjectsFromDB);
