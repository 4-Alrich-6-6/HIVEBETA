const topBackBtn   = document.querySelector("#topBackBtn");
const groupInfoTab = document.querySelector("#groupInfoTab");
const categoryList = document.querySelector(".category-list");

const supa     = () => window.hiveSupabase;
const getGrpId = () => {
  const params = new URLSearchParams(window.location.search);
  const grpId = params.get("grpId") || sessionStorage.getItem("hive_grpId");
  if (grpId) sessionStorage.setItem("hive_grpId", grpId);
  return grpId;
};

const formatDueDate = (iso) => {
    if (!iso) return "Due: --/--/----";
    const [y, m, d] = iso.split("-");
    return `Due: ${m}/${d}/${y}`;
};

// ── Load projects from Supabase ───────────────────────────────────────────
const loadProjects = async () => {
    const grpId = getGrpId();
    if (!grpId) return [];
    const { data, error } = await supa()
        .from("PROJECT")
        .select("projId, projName, projDueD")
        .eq("grpId", Number(grpId));
    if (error || !data) return [];
    
    // Fetch task count for each project
    const projectsWithCounts = await Promise.all(
        data.map(async (p) => {
            const { count } = await supa()
                .from("TASK")
                .select("taskId", { count: "exact", head: true })
                .eq("projId", p.projId);
            return {
                key: String(p.projId),
                name: p.projName,
                dueDate: p.projDueD || null,
                count: count || 0
            };
        })
    );
    return projectsWithCounts;
};

const createCategoryItem = (project) => {
    const categoryItem = document.createElement("div");
    categoryItem.className = "category-item";
    categoryItem.innerHTML = `
        <button class="category-main-btn" type="button" data-category="${project.key}">
            <span class="category-name">${project.name}</span>
            <span class="category-due-date">${formatDueDate(project.dueDate)}</span>
            <span class="category-count">${project.count} Task${project.count !== 1 ? "s" : ""}</span>
        </button>
    `;
    const btn = categoryItem.querySelector(".category-main-btn");
    btn.addEventListener("click", () => {
        sessionStorage.setItem("hive_selected_project", project.key);
        sessionStorage.setItem("hive_selected_project_name", project.name);
        const grpId = getGrpId();
        window.location.href = `t.projectbreakdown.html${grpId ? `?grpId=${grpId}` : ""}`;
    });
    return categoryItem;
};

const renderAllProjects = async () => {
    if (!categoryList) {
        return;
    }
    categoryList.innerHTML = "";
    const projects = await loadProjects();
    if (projects.length === 0) {
        categoryList.innerHTML = `
            <div class="empty-state">
                <img src="../assets/Plus.png" class="empty-state-icon" alt="No projects">
                <h3>No Projects Yet</h3>
                <p>There are no projects currently posted for this group.</p>
            </div>
        `;
        return;
    }
    projects.forEach(p => {
        categoryList.appendChild(createCategoryItem(p));
    });
};

if (topBackBtn)   topBackBtn.addEventListener("click",   () => { window.location.href = "t.dashb.html"; });
if (groupInfoTab) groupInfoTab.addEventListener("click", () => {
  const grpId = getGrpId();
  window.location.href = `t.grpviewing.html${grpId ? `?grpId=${grpId}` : ""}`;
});

document.querySelector("#mobileGroupInfoBtn")?.addEventListener("click", () => {
  const grpId = getGrpId();
  window.location.href = `t.grpviewing.html${grpId ? `?grpId=${grpId}` : ""}`;
});

const logoutBtn = document.querySelector(".logout");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        showConfirmation("Are you sure you want to log out?", () => window.doLogout?.(), { title: "Log Out", confirmText: "Log Out", cancelText: "Cancel" });
    });
}

// ── Load sidebar profile ────────────────────────────────────────────────────
const loadTeacherSidebarProfile = async () => {
    const supabase = supa();
    if (!supabase) return;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: userData, error } = await supabase
            .from("USER")
            .select("userDisplayName, userEmail, avatarPath")
            .eq("userId", user.id)
            .maybeSingle();
        if (error || !userData) return;
        const avatarImg = document.querySelector(".avatar-circle img");
        if (avatarImg && userData.avatarPath) {
            avatarImg.src = userData.avatarPath;
            avatarImg.style.objectFit = "cover";
        }
        const h3s = document.querySelectorAll(".profile-block h3");
        if (h3s[0]) h3s[0].textContent = userData.userDisplayName || "Name";
        if (h3s[1]) h3s[1].textContent = userData.userEmail || "Email";
    } catch (err) {
        console.error("Error loading teacher profile:", err);
    }
};

renderAllProjects();
loadTeacherSidebarProfile();