const categoryTopBackBtn       = document.querySelector("#topBackBtn");
const groupInfoTab             = document.querySelector("#groupInfoTab");
const openPostCategoryModalBtn = document.querySelector("#openPostCategoryModalBtn");
const postCategoryModalOverlay = document.querySelector("#postCategoryModalOverlay");
const discardPostCategoryBtn   = document.querySelector("#discardPostCategoryBtn");
const postCategoryForm         = document.querySelector("#postCategoryForm");
const categoryNameInput        = document.querySelector("#categoryNameInput");
const categoryDescriptionInput = document.querySelector("#categoryDescriptionInput");
const categoryDueDateInput     = document.querySelector("#categoryDueDateInput");
const categoryDueTimeInput     = document.querySelector("#categoryDueTimeInput");
const postCategorySubmitBtn    = postCategoryForm ? postCategoryForm.querySelector("button[type='submit']") : null;
const categoryList             = document.querySelector(".category-list");
const projectOptionsOverlay    = document.querySelector("#projectOptionsModalOverlay");
const editProjectNameInput     = document.querySelector("#editProjectNameInput");
const editProjectDescriptionInput = document.querySelector("#editProjectDescriptionInput");
const editProjectDueDateInput  = document.querySelector("#editProjectDueDateInput");
const editProjectDueTimeInput  = document.querySelector("#editProjectDueTimeInput");
const saveProjectNameBtn       = document.querySelector("#saveProjectNameBtn");
const deleteProjectBtn         = document.querySelector("#deleteProjectBtn");
const closeProjectOptionsBtn   = document.querySelector("#closeProjectOptionsBtn");

const supa     = () => window.hiveSupabase;
const getGrpId = () => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("grpId");
    const fromSession = sessionStorage.getItem("hive_grpId");
    const grpId = [fromUrl, fromSession].find((value) => {
        const normalized = String(value || "").trim().toLowerCase();
        return normalized && normalized !== "null" && normalized !== "undefined";
    });

    if (grpId) sessionStorage.setItem("hive_grpId", String(grpId));
    return grpId || null;
};
const todayISO = () => new Date().toISOString().split("T")[0];

const formatDueDate = (iso) => {
    if (!iso) return "Due: --/--/----";
    const [y, m, d] = iso.split("-");
    return `Due: ${m}/${d}/${y}`;
};

let activeProjectItem = null;


// ── Load projects from Supabase ───────────────────────────────────────────
const loadProjects = async () => {
    if (!supa()) return [];
    const grpId = getGrpId();
    if (!grpId) return [];

    let { data, error } = await supa()
        .from("PROJECT")
        .select("projId, projName, projDesc, projCreatedAt, projDueD, projDueT, projStatus")
        .eq("grpId", Number(grpId))
        .order("projCreatedAt", { ascending: false, nullsFirst: false })
        .order("projId", { ascending: false });
    if (error) {
        const fallback = await supa()
            .from("PROJECT")
            .select("projId, projName, projDesc, projCreatedAt, projDueD, projDueT")
            .eq("grpId", Number(grpId))
            .order("projCreatedAt", { ascending: false, nullsFirst: false })
            .order("projId", { ascending: false });
        data = fallback.data;
    }
    if (!data) return [];
    
    const { data: finishedStatus } = await supa()
        .from("STATUS")
        .select("statId")
        .ilike("statName", "Finished")
        .maybeSingle();
    const finishedStatusId = finishedStatus?.statId;

    // Fetch task count and completion status for each project
    const projectsWithCounts = await Promise.all(
        data.map(async (p) => {
            const { data: tasks } = await supa()
                .from("TASK")
                .select("taskId, statId")
                .eq("projId", p.projId);
            const taskList = tasks || [];
            const completedCount = taskList.filter((task) => String(task.statId) === String(finishedStatusId)).length;
            const isCompleted = taskList.length > 0 && completedCount === taskList.length;
            return {
                key: String(p.projId),
                name: p.projName,
                projId: p.projId,
                description: p.projDesc || "",
                dueDate: p.projDueD || null,
                dueTime: p.projDueT || null,
                count: taskList.length,
                completedCount,
                status: p.projStatus || (isCompleted ? "Finished" : "Ongoing")
            };
        })
    );
    return projectsWithCounts;
};

// ── Create category card ──────────────────────────────────────────────────
const createCategoryItem = (name, key, count, completedCount, dueDate, dueTime, status, description = "") => {
    const categoryItem = document.createElement("div");
    categoryItem.className = "category-item";
    categoryItem.setAttribute("role", "listitem");
    categoryItem.setAttribute("data-category", key);
    if (dueDate) categoryItem.setAttribute("data-due-date", dueDate);
    if (dueTime) categoryItem.setAttribute("data-due-time", dueTime);
    categoryItem.setAttribute("data-description", description);
    categoryItem.innerHTML = `
        <button class="category-main-btn" type="button" data-category="${key}">
            <span class="category-name">${name}</span>
                <span class="category-due-date">${formatDueDate(dueDate)}</span>
                <span class="category-footer">
                    <span class="category-count">${completedCount}/${count} Tasks Completed</span>
                    <span class="category-status ${String(status).toLowerCase() === "finished" ? "completed" : "ongoing"}">${status}</span>
                </span>
        </button>
    `;
    const btn = categoryItem.querySelector(".category-main-btn");
    if (btn) btn.addEventListener("click", () => {
        sessionStorage.setItem("hive_selected_project", key);
        sessionStorage.setItem("hive_selected_project_name", name);
        const grpId = getGrpId();
        window.location.href = `s.leaderprojectbreakdown.html${grpId ? "?grpId=" + grpId : ""}`;
    });
    return categoryItem;
};

// ── Render all projects ───────────────────────────────────────────────────
const renderAllProjects = async () => {
    if (!categoryList) return;
    categoryList.innerHTML = "";
    const projects = await loadProjects();
    const projectAddBtn = document.querySelector("#openPostCategoryModalBtn");
    
    if (projects.length === 0) {
        // Create custom empty state with "Here" button
        categoryList.innerHTML = `
            <div class="project-empty-state" role="status">
                <img class="project-empty-state-illustration" src="../../assets/bee-flight.svg" alt="">
                <strong>No Projects Yet</strong>
                <p>Click the button below to create your first project and start breaking down tasks!</p>
                <button type="button" class="empty-state-create-link" id="emptyStateCreateBtn">Create Project</button>
            </div>
        `;
        
        // Hide the (+) button when no projects
        if (projectAddBtn) projectAddBtn.style.display = "none";
        
        // Add event listener to the "Here" button
        const emptyStateBtn = document.querySelector("#emptyStateCreateBtn");
        if (emptyStateBtn) {
            emptyStateBtn.addEventListener("click", () => {
                if (openPostCategoryModalBtn) openPostCategoryModalBtn.click();
            });
        }
        return;
    }
    
    // Show the (+) button when projects exist
    if (projectAddBtn) projectAddBtn.style.display = "";
    
    projects.forEach(p => {
        categoryList.appendChild(createCategoryItem(p.name, p.key, p.count, p.completedCount, p.dueDate, p.dueTime, p.status, p.description));
    });
};

// ── Project options modal ─────────────────────────────────────────────────
const openProjectOptions = (categoryItem) => {
    activeProjectItem = categoryItem;
    const nameEl = categoryItem.querySelector(".category-name");
    if (editProjectNameInput && nameEl) editProjectNameInput.value = nameEl.textContent;
    if (editProjectDescriptionInput) editProjectDescriptionInput.value = categoryItem.dataset.description || "";
    if (editProjectDueDateInput) {
        editProjectDueDateInput.min   = todayISO();
        editProjectDueDateInput.value = categoryItem.dataset.dueDate || "";
    }
    if (editProjectDueTimeInput) editProjectDueTimeInput.value = categoryItem.dataset.dueTime || "";
    projectOptionsOverlay?.classList.add("open");
    projectOptionsOverlay?.setAttribute("aria-hidden", "false");
};

const closeProjectOptions = () => {
    projectOptionsOverlay?.classList.remove("open");
    projectOptionsOverlay?.setAttribute("aria-hidden", "true");
    activeProjectItem = null;
};

if (closeProjectOptionsBtn) closeProjectOptionsBtn.addEventListener("click", closeProjectOptions);
if (projectOptionsOverlay) projectOptionsOverlay.addEventListener("click", (e) => { if (e.target === projectOptionsOverlay) closeProjectOptions(); });

// ── Edit project ──────────────────────────────────────────────────────────
const saveProjectName = async () => {
    if (!activeProjectItem) return;
    const newName = editProjectNameInput ? editProjectNameInput.value.trim() : "";
    const newDescription = editProjectDescriptionInput ? editProjectDescriptionInput.value.trim() : "";
    const newDue  = editProjectDueDateInput ? editProjectDueDateInput.value : "";
    const newDueTime = editProjectDueTimeInput ? editProjectDueTimeInput.value : "";
    if (!newName) return;
    const projId = Number(activeProjectItem.dataset.category);
    const { error } = await supa().from("PROJECT").update({ projName: newName, projDesc: newDescription || null, projDueD: newDue || null, projDueT: newDueTime || null }).eq("projId", projId);
    if (error) { showAlert("Failed to update project: " + error.message, { title: "Error" }); return; }
    await renderAllProjects();
    closeProjectOptions();
};

if (saveProjectNameBtn) saveProjectNameBtn.addEventListener("click", saveProjectName);

// ── Delete project ────────────────────────────────────────────────────────
if (deleteProjectBtn) {
    deleteProjectBtn.addEventListener("click", () => {
        if (!activeProjectItem) return;
        const projId = Number(activeProjectItem.dataset.category);
        const nameEl = activeProjectItem.querySelector(".category-name");
        const projectName = nameEl ? nameEl.textContent : "this project";
        showConfirmation(`Are you sure you want to remove the project "${projectName}"? Dislaimer: If the selected member(s) have tasks assigned, they will be reassigned to the group leader.`, async () => {
            try {
                const supabase = supa();
                if (!supabase) return;

                // Get all tasks for this project
                const { data: tasks } = await supabase
                    .from("TASK")
                    .select("taskId")
                    .eq("projId", projId);

                const taskIds = (tasks || []).map(t => t.taskId);

                // Delete in order of dependencies
                await supabase.from("PEEREVAL").delete().eq("projId", projId);
                if (taskIds.length > 0) {
                    // 1. Delete PEEREVAL entries
                    await supabase.from("PEEREVAL").delete().in("taskId", taskIds);

                    // 2. Delete SUBMISSION entries
                    await supabase.from("SUBMISSION").delete().in("taskId", taskIds);

                    // 3. Delete PARTICIPATION entries
                    await supabase.from("PARTICIPATION").delete().in("taskId", taskIds);

                    // 4. Delete TASKASSIGNMENT entries
                    await supabase.from("TASKASSIGNMENT").delete().in("taskId", taskIds);
                }

                // 5. Delete TASK entries
                await supabase.from("TASK").delete().eq("projId", projId);

                // 6. Delete PROJECT
                const { error } = await supabase.from("PROJECT").delete().eq("projId", projId);
                if (error) { 
                    showAlert("Failed to delete project: " + error.message, { title: "Error" }); 
                    return; 
                }
                
                await renderAllProjects();
                closeProjectOptions();
            } catch (err) {
                showAlert("Error deleting project: " + err.message, { title: "Error" });
            }
        }, { title: "Remove Project", confirmText: "Remove", cancelText: "Cancel" });
    });
}

// ── Post project ──────────────────────────────────────────────────────────
const closePostCategoryModal = () => {
    postCategoryModalOverlay?.classList.remove("open");
    postCategoryModalOverlay?.setAttribute("aria-hidden", "true");
};

const updatePostCategorySubmitState = () => {
    if (!postCategorySubmitBtn) return;
    const hasName = categoryNameInput && categoryNameInput.value.trim().length > 0;
    const hasDate = categoryDueDateInput && categoryDueDateInput.value.length > 0;
    const hasTime = categoryDueTimeInput && categoryDueTimeInput.value.length > 0;
    postCategorySubmitBtn.disabled = !(hasName && hasDate && hasTime);
};

if (openPostCategoryModalBtn && postCategoryModalOverlay) {
    openPostCategoryModalBtn.addEventListener("click", () => {
        if (categoryDueDateInput) categoryDueDateInput.min = todayISO();
        postCategoryModalOverlay.classList.add("open");
        postCategoryModalOverlay.setAttribute("aria-hidden", "false");
        updatePostCategorySubmitState();
    });
}

if (discardPostCategoryBtn) {
    discardPostCategoryBtn.addEventListener("click", () => {
        postCategoryForm?.reset();
        updatePostCategorySubmitState();
        closePostCategoryModal();
    });
}

if (categoryNameInput)    categoryNameInput.addEventListener("input", updatePostCategorySubmitState);
if (categoryDueDateInput) categoryDueDateInput.addEventListener("input", updatePostCategorySubmitState);
if (categoryDueTimeInput) categoryDueTimeInput.addEventListener("input", updatePostCategorySubmitState);
if (postCategoryModalOverlay) postCategoryModalOverlay.addEventListener("click", (e) => { if (e.target === postCategoryModalOverlay) closePostCategoryModal(); });

if (postCategoryForm) {
    postCategoryForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = categoryNameInput.value.trim();
        const due  = categoryDueDateInput.value;
            const dueTime = categoryDueTimeInput?.value || "";
            if (!name || !due || !dueTime || due < todayISO()) return;
        showConfirmation(`Are you sure you want to post the project "${name}"?`, async () => {
            const { error } = await supa()
                .from("PROJECT")
                .insert({ projName: name, projDesc: categoryDescriptionInput?.value.trim() || null, projDueD: due, projDueT: dueTime, projCreatedAt: new Date().toISOString(), grpId: Number(getGrpId()) });
            if (error) { showAlert("Failed to create project: " + error.message, { title: "Error" }); return; }
            await renderAllProjects();
            postCategoryForm.reset();
            updatePostCategorySubmitState();
            closePostCategoryModal();
        }, { title: "Post Project", confirmText: "Post", cancelText: "Cancel" });
    });
}

if (categoryTopBackBtn) categoryTopBackBtn.addEventListener("click", () => { window.location.href = "../s.dashb.html"; });
if (groupInfoTab)  groupInfoTab.addEventListener("click",  () => {
    const grpId = getGrpId();
    window.location.href = `s.leadergrpviewing.html${grpId ? "?grpId=" + grpId : ""}`;
});

document.querySelector("#mobileGroupInfoBtn")?.addEventListener("click", () => {
    const grpId = getGrpId();
    window.location.href = `s.leadergrpviewing.html${grpId ? "?grpId=" + grpId : ""}`;
});

const categoryLogoutBtn = document.querySelector(".logout");
if (categoryLogoutBtn) categoryLogoutBtn.addEventListener("click", () => {
    showConfirmation("Are you sure you want to log out?", () => window.doLogout?.(), { title: "Log Out", confirmText: "Log Out", cancelText: "Cancel" });
});

// ── Init ──────────────────────────────────────────────────────────────────
renderAllProjects();
