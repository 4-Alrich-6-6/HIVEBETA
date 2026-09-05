const formatNotifDate = (iso) => {
    if (!iso) return "";
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const d = new Date(iso);
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

const truncateBody = (text, max = 90) => {
    if (!text) return "";
    return text.length > max ? text.slice(0, max).trimEnd() + "..." : text;
};

const loadNotifications = async (supabase) => {
    if (!supabase) return [];
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from("NOTIFICATION")
            .select(`notiId, notiTitle, notiBody, "notiDate&Time", notiIsRead, grpId, grpmemId, userId, GROUP(grpName)`)
            .eq("userId", user.id)
            .order('"notiDate&Time"', { ascending: false });

        if (error) {
            console.error("Failed to load notifications:", error);
            return [];
        }

        return (data || []).map(n => ({
            id: n.notiId,
            title: n.notiTitle,
            body: n.notiBody || "",
            date: n["notiDate&Time"] || null,
            isRead: n.notiIsRead || false,
            grpId: n.grpId,
            grpmemId: n.grpmemId,
            userId: n.userId,
            group: n.GROUP?.grpName || null
        }));
    } catch (err) {
        console.error("loadNotifications error:", err);
        return [];
    }
};

const markNotificationRead = async (supabase, notiId) => {
    if (!supabase || !notiId) return;
    await supabase
        .from("NOTIFICATION")
        .update({ notiIsRead: true })
        .eq("notiId", notiId);
};

const markAllNotificationsRead = async (supabase) => {
    if (!supabase) return;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase
            .from("NOTIFICATION")
            .update({ notiIsRead: true })
            .eq("userId", user.id);
    } catch (err) {
        console.error("markAllNotificationsRead error:", err);
    }
};

// Send a notification to a specific user (works for members, leaders, AND teachers)
const saveNotification = async (supabase, { notiTitle, notiBody, recipientUserId, grpmemId = null, grpId = null }) => {
    if (!supabase || !recipientUserId) return;
    await supabase.from("NOTIFICATION").insert({
        notiTitle,
        notiBody,
        "notiDate&Time": new Date().toISOString(),
        notiIsRead: false,
        userId: recipientUserId,
        grpmemId: grpmemId || null,
        grpId: grpId || null
    });
};

const deleteNotification = async (supabase, notiId) => {
    if (!supabase || !notiId) return;
    await supabase.from("NOTIFICATION").delete().eq("notiId", notiId);
};

const deleteAllNotificationsForUser = async (supabase) => {
    if (!supabase) return;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("NOTIFICATION").delete().eq("userId", user.id);
    } catch (err) {
        console.error("deleteAllNotificationsForUser error:", err);
    }
};
