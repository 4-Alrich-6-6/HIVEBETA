/* ── Supabase via global window.hiveSupabase (set in supabaseClient.js) ─────── */
const supabase = window.hiveSupabase;

/* ── ELEMENTS ─────────────────────────────────────────────────────────────── */
const topBackBtn = document.querySelector("#topBackBtn");
const groupInfoTab = document.querySelector("#groupInfoTab");
const openPostCategoryModalBtn = document.querySelector("#openPostCategoryModalBtn");
const postCategoryModalOverlay = document.querySelector("#postCategoryModalOverlay");
const discardPostCategoryBtn = document.querySelector("#discardPostCategoryBtn");
const postCategoryForm = document.querySelector("#postCategoryForm");
const categoryNameInput = document.querySelector("#categoryNameInput");
const categoryDescriptionInput = document.querySelector("#categoryDescriptionInput");
const categoryDueDateInput = document.querySelector("#categoryDueDateInput");
const postCategorySubmitBtn = postCategoryForm ? postCategoryForm.querySelector("button[type='submit']") : null;
const categoryList = document.querySelector(".category-list");
const projectOptionsOverlay = document.querySelector("#projectOptionsModalOverlay");
const editProjectNameInput = document.querySelector("#editProjectNameInput");
const editProjectDueDateInput = document.querySelector("#editProjectDueDateInput");
const saveProjectNameBtn = document.querySelector("#saveProjectNameBtn");
const deleteProjectBtn = document.querySelector("#deleteProjectBtn");
const closeProjectOptionsBtn = document.querySelector("#closeProjectOptionsBtn");
const logoutBtn = document.querySelector(".logout");

/* ── HELPERS ──────────────────────────────────────────────────────────────── */
const getGroupId = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("grpId") || sessionStorage.getItem("hive_grpId") || null;
};

const todayISO = () => new Date().toISOString().split("T")[0];

const formatDueDate = (iso) => {
  if (!iso) return "Due: --/--/----";
  const [y, m, d] = iso.split("-");
  return `Due: ${m}/${d}/${y}`;
};

/* ── STATE ────────────────────────────────────────────────────────────────── */
let activeProjectItem = null;
let allProjects = [];

/* ── DB LOAD ──────────────────────────────────────────────────────────────── */
const loadProjectsFromDB = async () => {
  const grpId = getGroupId();
  if (!grpId || !supabase) {
    renderAllProjects([]);
    return;
  }

  const { data: projects, error } = await supabase
    .from("PROJECT")
    .select("projId, projName, projDesc, projCreatedAt, projDueD")
    .eq("grpId", grpId)
    .order("projCreatedAt", { ascending: false, nullsFirst: false })
    .order("projId", { ascending: false });

  if (error || !projects) {
    console.error("Error loading projects:", error);
    renderAllProjects([]);
    return;
  }

  allProjects = projects;
  renderAllProjects(projects);
};

/* ── PROJECT OPTIONS MODAL ────────────────────────────────────────────────── */
const openProjectOptions = (categoryItem, project) => {
  activeProjectItem = categoryItem;
  if (editProjectNameInput) editProjectNameInput.value = project.projName;
  if (editProjectDueDateInput) {
    editProjectDueDateInput.min = todayISO();
    editProjectDueDateInput.value = project.projDueD || "";
  }
  if (projectOptionsOverlay) {
    projectOptionsOverlay.classList.add("open");
    projectOptionsOverlay.setAttribute("aria-hidden", "false");
  }
};

const closeProjectOptions = () => {
  if (projectOptionsOverlay) {
    projectOptionsOverlay.classList.remove("open");
    projectOptionsOverlay.setAttribute("aria-hidden", "true");
  }
  activeProjectItem = null;
};

const saveProjectName = async () => {
  if (!activeProjectItem || !activeProjectItem.dataset.projId) return;
  const projId = activeProjectItem.dataset.projId;
  const newName = editProjectNameInput ? editProjectNameInput.value.trim() : "";
  const newDueDate = editProjectDueDateInput ? editProjectDueDateInput.value : "";

  if (!newName) return;
  if (newDueDate && newDueDate < todayISO()) return;

  const { error } = await supabase
    .from("PROJECT")
    .update({ projName: newName, projDueD: newDueDate })
    .eq("projId", projId);

  if (error) {
    showAlert("Failed to update project: " + error.message, { title: "Error" });
    return;
  }

  await loadProjectsFromDB();
  closeProjectOptions();
};

const deleteProject = async () => {
  if (!activeProjectItem || !activeProjectItem.dataset.projId) return;
  const projId = activeProjectItem.dataset.projId;
  const projectName = activeProjectItem.querySelector(".category-name")?.textContent || "this project";

  if (typeof showConfirmation === "function") {
    showConfirmation(
      `Are you sure you want to remove the project "${projectName}"?`,
      async () => {
        try {
          // Get all tasks for this project
          const { data: tasks } = await supabase
            .from("TASK")
            .select("taskId")
            .eq("projId", projId);

          const taskIds = (tasks || []).map(t => t.taskId);

          // Delete in order of dependencies
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
          const { error } = await supabase
            .from("PROJECT")
            .delete()
            .eq("projId", projId);

          if (error) {
            showAlert("Failed to delete project: " + error.message, { title: "Error" });
            return;
          }

          await loadProjectsFromDB();
          closeProjectOptions();
        } catch (err) {
          showAlert("Error deleting project: " + err.message, { title: "Error" });
        }
      },
      { title: "Remove Project", confirmText: "Remove", cancelText: "Cancel" }
    );
  }
};

/* ── CREATE CATEGORY ITEM ─────────────────────────────────────────────────── */
const createCategoryItem = (project) => {
  const categoryItem = document.createElement("div");
  categoryItem.className = "category-item";
  categoryItem.setAttribute("role", "listitem");
  categoryItem.setAttribute("data-proj-id", project.projId);
  categoryItem.setAttribute("data-description", project.projDesc || "");
  if (project.projDueD) categoryItem.setAttribute("data-due-date", project.projDueD);
  
  categoryItem.innerHTML = `
    <button class="category-main-btn" type="button" data-proj-id="${project.projId}">
      <span class="category-name">${project.projName}</span>
      <span class="category-due-date">${formatDueDate(project.projDueD)}</span>
    </button>
    <button class="more-btn" type="button" aria-label="More project options">
      <img src="../../assets/More.png" alt="More options">
    </button>
  `;

  const btn = categoryItem.querySelector(".category-main-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      sessionStorage.setItem("hive_selected_project", project.projId);
      sessionStorage.setItem("hive_selected_project_name", project.projName);
      window.location.href = "s.leaderprojectbreakdown.html";
    });
  }

  const moreBtn = categoryItem.querySelector(".more-btn");
  if (moreBtn) {
    moreBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openProjectOptions(categoryItem, project);
    });
  }

  return categoryItem;
};

/* ── RENDER ALL PROJECTS ──────────────────────────────────────────────────── */
const renderAllProjects = (projects) => {
  if (!categoryList) return;
  categoryList.innerHTML = "";

  if (!projects || projects.length === 0) {
    categoryList.innerHTML = `
      <div class="empty-state">
        <h3>No Projects Yet</h3>
        <p>Click "Post Project" to create your first project and start breaking down tasks!</p>
      </div>
    `;
    return;
  }

  projects.forEach(p => {
    categoryList.appendChild(createCategoryItem(p));
  });
};

/* ── POST CATEGORY MODAL ──────────────────────────────────────────────────── */
const closePostCategoryModal = () => {
  if (!postCategoryModalOverlay) return;
  postCategoryModalOverlay.classList.remove("open");
  postCategoryModalOverlay.setAttribute("aria-hidden", "true");
};

const updatePostCategorySubmitState = () => {
  if (!postCategorySubmitBtn) return;
  const hasProjectName = categoryNameInput && categoryNameInput.value.trim().length > 0;
  const hasDueDate = categoryDueDateInput && categoryDueDateInput.value.length > 0;
  postCategorySubmitBtn.disabled = !(hasProjectName && hasDueDate);
};

const postProject = async (e) => {
  e.preventDefault();
  const name = categoryNameInput.value.trim();
  const due = categoryDueDateInput.value;

  if (!name || !due || due < todayISO()) return;

  const grpId = getGroupId();
  if (!grpId) return;

  if (typeof showConfirmation === "function") {
    showConfirmation(
      `Are you sure you want to post the project "${name}"?`,
      async () => {
        const { error } = await supabase
          .from("PROJECT")
          .insert([{ projName: name, projDesc: categoryDescriptionInput?.value.trim() || null, projDueD: due, projCreatedAt: new Date().toISOString(), grpId: grpId }]);

        if (error) {
          showAlert("Failed to post project: " + error.message, { title: "Error" });
          return;
        }

        await loadProjectsFromDB();
        if (postCategoryForm) postCategoryForm.reset();
        updatePostCategorySubmitState();
        closePostCategoryModal();
      },
      { title: "Post Project", confirmText: "Post", cancelText: "Cancel" }
    );
  }
};

/* ── EVENTS ───────────────────────────────────────────────────────────────── */
if (closeProjectOptionsBtn) {
  closeProjectOptionsBtn.addEventListener("click", closeProjectOptions);
}

if (projectOptionsOverlay) {
  projectOptionsOverlay.addEventListener("click", (e) => {
    if (e.target === projectOptionsOverlay) closeProjectOptions();
  });
}

if (saveProjectNameBtn) {
  saveProjectNameBtn.addEventListener("click", saveProjectName);
}

if (deleteProjectBtn) {
  deleteProjectBtn.addEventListener("click", deleteProject);
}

if (topBackBtn) {
  topBackBtn.addEventListener("click", () => {
    window.location.href = "../s.dashb.html";
  });
}

if (groupInfoTab) {
  groupInfoTab.addEventListener("click", () => {
    window.location.href = "s.leadergrpviewing.html?grpId=" + getGroupId();
  });
}

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
    if (postCategoryForm) postCategoryForm.reset();
    updatePostCategorySubmitState();
    closePostCategoryModal();
  });
}

if (categoryNameInput) {
  categoryNameInput.addEventListener("input", updatePostCategorySubmitState);
}

if (categoryDueDateInput) {
  categoryDueDateInput.addEventListener("input", updatePostCategorySubmitState);
}

if (postCategoryModalOverlay) {
  postCategoryModalOverlay.addEventListener("click", (e) => {
    if (e.target === postCategoryModalOverlay) closePostCategoryModal();
  });
}

if (postCategoryForm) {
  postCategoryForm.addEventListener("submit", postProject);
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    if (typeof showConfirmation === "function") {
      showConfirmation(
        "Are you sure you want to log out?",
        () => window.doLogout?.(),
        { title: "Log Out", confirmText: "Log Out", cancelText: "Cancel" }
      );
    } else {
      if (confirm("Are you sure you want to log out?")) {
        window.location.href = "../../auth/log-sign.html";
      }
    }
  });
}

/* ── INIT ─────────────────────────────────────────────────────────────────── */
loadProjectsFromDB();
