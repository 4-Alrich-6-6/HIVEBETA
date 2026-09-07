// Redirects unauthenticated users to the login page, and users with the
// wrong role away from pages they are not allowed to see.
// Must be loaded AFTER supabaseClient.js.

const getLoginUrl = () => {
    const path = window.location.pathname.replace(/\\/g, "/");
    if (
        path.includes("/student/leader/") ||
        path.includes("/student/member/") ||
        path.includes("/student/validation/")
    ) return new URL("../../auth/log-sign.html", window.location.href).href;
    if (path.includes("/student/") || path.includes("/teacher/"))
        return new URL("../auth/log-sign.html", window.location.href).href;
    if (path.includes("/lib/")) return new URL("../auth/log-sign.html", window.location.href).href;
        const relativeLoginPath = path.includes("/lib/")
            ? "../auth/log-sign.html"
            : "log-sign.html";
        return new URL(relativeLoginPath, window.location.href).href;
};

// Returns the role this page requires, or null if any authenticated user is OK.
const getRequiredRole = () => {
    const path = window.location.pathname.replace(/\\/g, "/");
    // Profiling pages are onboarding — new users have no group/role yet.
    if (path.includes("profiling")) return null;
    if (path.includes("/student/leader/")) return "Leader";
    if (path.includes("/student/member/")) return "Member";
    if (path.includes("/student/validation/")) {
        const mode = new URLSearchParams(window.location.search).get("mode") || "member";
        if (mode === "leader")  return "Leader";
        if (mode === "teacher") return "Teacher";
        return "Member";
    }
    if (path.includes("/teacher/")) return "Teacher";
    return null;
};

// Where to send a user who failed the role check.
const getRoleFailUrl = () => {
    const path = window.location.pathname.replace(/\\/g, "/");
    // teacher pages — bounced users go to the student dashboard
    if (path.includes("/teacher/")) return "../student/s.dashb.html";
    // student sub-folders — one level up is the student root
    return "../s.dashb.html";
};

// Exposed globally so every logout button can call window.doLogout()
window.doLogout = async () => {
    const supabase = window.hiveSupabase;
    if (supabase) {
        try { await supabase.auth.signOut(); } catch (e) {}
    }
    sessionStorage.clear();
    window.location.replace(getLoginUrl());
};

(async () => {
    const supabase = window.hiveSupabase;
    const path = window.location.pathname.replace(/\\/g, "/");
    if (!supabase) {
        window.location.replace(getLoginUrl());
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.replace(getLoginUrl());
        return;
    }

    const requiredRole = getRequiredRole();
    if (requiredRole) {
        const userId = session.user.id;
        const params = new URLSearchParams(window.location.search);
        const grpId  = params.get("grpId") || sessionStorage.getItem("hive_grpId");

        let ok = false;

        if (requiredRole === "Teacher") {
            // A teacher is identified by having deptId set in their USER profile.
            // Using GROUP.teacherId would block teachers who haven't joined a group yet
            // (e.g. on t.dashb.html itself where they go to join one).
            const { data: userRow } = await supabase
                .from("USER")
                .select("deptId")
                .eq("userId", userId)
                .maybeSingle();
            ok = !!(userRow?.deptId);
        } else if (grpId) {
            // Leader / Member — check GROUPMEMBER role for this specific group.
            const { data: memberships } = await supabase
                .from("GROUPMEMBER")
                .select("ROLE(roleName)")
                .eq("userId", userId)
                .eq("grpId", Number(grpId))
                .limit(10);
            const membershipRoles = (memberships || [])
                .map((membership) => String(membership.ROLE?.roleName || "").trim().toLowerCase());
            const isStudentSwarmView = path.includes("/student/leader/s.leadergrpviewing.html")
                || path.includes("/student/member/s.membergrpviewing.html");
            ok = membershipRoles.includes(requiredRole.toLowerCase())
                || (isStudentSwarmView && membershipRoles.includes("teacher"));
        } else {
            // Group-scoped pages must identify the group before checking membership.
            ok = false;
        }

        if (!ok) {
            window.location.replace(getRoleFailUrl());
            return;
        }
    }

    // Auth + role check passed — reveal the page.
    document.documentElement.style.visibility = "visible";
})();
