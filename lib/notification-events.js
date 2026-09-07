const hiveNotificationEvents = (() => {
  const unique = (ids) => [...new Set((ids || []).filter(Boolean).map(String))];

  const insert = async (supabase, rows) => {
    const filtered = (rows || []).filter((row) => row?.userId);
    if (!supabase || !filtered.length) return { error: null };
    return supabase.from("NOTIFICATION").insert(filtered);
  };

  const groupRecipients = async (supabase, grpId, excludeUserId = null) => {
    const [{ data: members }, { data: group }] = await Promise.all([
      supabase.from("GROUPMEMBER").select("userId").eq("grpId", Number(grpId)),
      supabase.from("GROUP").select("teacherId").eq("grpId", Number(grpId)).maybeSingle()
    ]);
    return unique([
      ...(members || []).map((member) => member.userId),
      group?.teacherId
    ]).filter((userId) => String(userId) !== String(excludeUserId));
  };

  const notifyGroup = async (supabase, { grpId, title, body, excludeUserId = null, recipients = null }) => {
    const userIds = recipients || await groupRecipients(supabase, grpId, excludeUserId);
    const now = new Date().toISOString();
    return insert(supabase, userIds.map((userId) => ({
      notiTitle: title,
      notiBody: body,
      "notiDate&Time": now,
      notiIsRead: false,
      userId,
      grpId: Number(grpId)
    })));
  };

  const notifyUsers = async (supabase, { userIds, grpId, title, body }) => notifyGroup(supabase, {
    grpId,
    title,
    body,
    recipients: unique(userIds)
  });

  return { groupRecipients, notifyGroup, notifyUsers, insert };
})();
