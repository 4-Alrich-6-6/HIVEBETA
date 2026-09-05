// Redirects unauthenticated users to the login page, and users with the
// wrong role away from pages they are not allowed to see.
// Must be loaded AFTER supabaseClient.js.

const getLoginUrl = () => {
    const path = window.location.pathname.replace(/\\/g, "/");
    if (
        path.includes("/student/leader/") ||
        path.includes("/student/member/") ||
        path.includes("/student/validation/")
    ) return "../../auth/log-sign.html";
    if (path.includes("/student/") || path.includes("/teacher/"))
        return "../auth/log-sign.html";
    return "log-sign.html";
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
            const { data: membership } = await supabase
                .from("GROUPMEMBER")
                .select("ROLE(roleName)")
                .eq("userId", userId)
                .eq("grpId", Number(grpId))
                .maybeSingle();
            ok = membership?.ROLE?.roleName === requiredRole;
        } else {
            // No grpId available — can't verify role, allow through
            // (the page itself will show an empty state).
            ok = true;
        }

        if (!ok) {
            window.location.replace(getRoleFailUrl());
            return;
        }
    }

    // Auth + role check passed — reveal the page.
    document.documentElement.style.visibility = "visible";
})();
