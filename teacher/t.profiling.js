const showNotice = (message, options = {}) => {
    const { title = "Notice", type = "info", onClose = null } = options;

    if (!document.querySelector("#hiveNoticeStyle")) {
        const style = document.createElement("style");
        style.id = "hiveNoticeStyle";
        style.textContent = `
            .hive-notice{position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,0.7)}
            .hive-notice.open{display:flex}
            .hive-notice-content{width:min(430px,100%);border:3px solid #ffcf24;border-radius:20px;background:#1c1c1c;color:#fff;padding:26px 24px 22px;box-shadow:0 16px 0 rgba(0,0,0,0.5)}
            .hive-notice-header{display:flex;align-items:center;gap:12px;margin-bottom:12px}
            .hive-notice-icon{width:42px;height:42px;border:3px solid #000;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;background:#ffcf24;color:#000;font-family:Montserrat,sans-serif;font-size:25px;font-weight:900;line-height:1}
            .hive-notice-title{margin:0;font-family:Montserrat,sans-serif;font-size:22px;font-weight:800;line-height:1.1}
            .hive-notice-message{margin:0;font-size:15px;font-weight:500;line-height:1.5}
            .hive-notice-actions{display:flex;justify-content:flex-end;margin-top:22px}
            .hive-notice-ok{min-width:108px;height:44px;border:none;border-radius:14px;background:#ffcf24;color:#000;font-family:Montserrat,sans-serif;font-size:18px;font-weight:800;cursor:pointer;padding:0 22px}
        `;
        document.head.appendChild(style);
    }

    let notice = document.querySelector("#hiveNotice");
    if (!notice) {
        notice = document.createElement("div");
        notice.className = "hive-notice";
        notice.id = "hiveNotice";
        notice.setAttribute("aria-hidden", "true");
        notice.innerHTML = `
            <div class="hive-notice-content" role="dialog" aria-modal="true" aria-labelledby="hiveNoticeTitle">
                <div class="hive-notice-header">
                    <span class="hive-notice-icon" aria-hidden="true">!</span>
                    <h2 class="hive-notice-title" id="hiveNoticeTitle"></h2>
                </div>
                <p class="hive-notice-message"></p>
                <div class="hive-notice-actions">
                    <button class="hive-notice-ok" type="button">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(notice);
    }

    const icon = notice.querySelector(".hive-notice-icon");
    const titleEl = notice.querySelector(".hive-notice-title");
    const messageEl = notice.querySelector(".hive-notice-message");
    const okBtn = notice.querySelector(".hive-notice-ok");

    if (icon) icon.textContent = type === "success" ? "✓" : "!";
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;

    const closeNotice = () => {
        notice.classList.remove("open");
        notice.setAttribute("aria-hidden", "true");
        okBtn.removeEventListener("click", closeNotice);
        notice.removeEventListener("click", handleOverlayClick);
        if (onClose) onClose();
    };

    const handleOverlayClick = (e) => { if (e.target === notice) closeNotice(); };

    okBtn.addEventListener("click", closeNotice);
    notice.addEventListener("click", handleOverlayClick);
    notice.classList.add("open");
    notice.setAttribute("aria-hidden", "false");
    okBtn.focus();
};

const backButton = document.querySelector(".back-button");
const saveButton = document.querySelector(".save-button button");
const editProfilePicBtn = document.querySelector("#editProfilePicBtn");
const profilePicInput = document.querySelector("#profilePicInput");
const profilePicPreview = document.querySelector("#profilePicPreview");
const displayNameInput = document.querySelector("#displayNameInput");
const programSelect = document.querySelector("#program");

let avatarFile = null;

const getPositionId = async (supabase, roleName) => {
    const { data, error } = await supabase
        .from("POSITION")
        .select("posId")
        .ilike("posName", roleName)
        .maybeSingle();

    if (error) {
        console.error("Failed to load position:", error);
        return null;
    }

    return data?.posId || null;
};

// ── Load existing profile data from DB ──────────────────────────────────────
const loadProfileData = async () => {
    const supabase = window.hiveSupabase;
    if (!supabase) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData, error } = await supabase
            .from("USER")
            .select("userDisplayName, progId, avatarPath")
            .eq("userId", user.id)
            .maybeSingle();

        if (error) {
            console.error("Error loading profile:", error);
            return;
        }

        if (userData) {
            // Set display name
            if (userData.userDisplayName && displayNameInput) {
                displayNameInput.value = userData.userDisplayName;
            }

            // Set program
            if (userData.progId && programSelect) {
                programSelect.value = userData.progId;
            }

            // Set avatar preview — resolve path to public URL
            if (userData.avatarPath && profilePicPreview) {
                const supabase = window.hiveSupabase;
                if (supabase && !userData.avatarPath.startsWith("http")) {
                    const { data } = supabase.storage.from("profilePicture").getPublicUrl(userData.avatarPath);
                    profilePicPreview.src = data?.publicUrl ? data.publicUrl + "?t=" + Date.now() : userData.avatarPath;
                } else {
                    profilePicPreview.src = userData.avatarPath;
                }
            }
        }
    } catch (err) {
        console.error("Failed to load profile data:", err);
    }
};

// Populate program dropdown from DB
(async () => {
    if (!programSelect) return;
    const supabase = window.hiveSupabase;
    if (!supabase) return;
    const { data, error } = await supabase
        .from("PROGRAM")
        .select("progId, progName")
        .order("progId", { ascending: true });
    if (error || !data) return;
    data.forEach(prog => {
        const opt = document.createElement("option");
        opt.value = prog.progId;
        opt.textContent = prog.progName;
        programSelect.appendChild(opt);
    });
    
    // Load profile data after programs are loaded
    await loadProfileData();
})();

if (editProfilePicBtn && profilePicInput) {
    editProfilePicBtn.addEventListener("click", () => profilePicInput.click());
    profilePicInput.addEventListener("change", () => {
        const file = profilePicInput.files && profilePicInput.files[0];
        if (!file) return;
        const allowed = ["image/png", "image/jpeg", "image/jpg"];
        if (!allowed.includes(file.type)) {
            showNotice("Only PNG, JPG, and JPEG files are allowed.", { title: "Invalid File Type" });
            profilePicInput.value = "";
            return;
        }
        avatarFile = file;
        const reader = new FileReader();
        reader.onload = (e) => { if (profilePicPreview) profilePicPreview.src = e.target.result; };
        reader.readAsDataURL(file);
    });
}

if (backButton) {
    backButton.addEventListener("click", () => {
        window.location.href = "../auth/profiling.html";
    });
}

if (saveButton) {
    saveButton.addEventListener("click", async () => {
        const supabase = window.hiveSupabase;
        if (!supabase) { showNotice("Supabase not ready.", { title: "Error" }); return; }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { showNotice("Not logged in.", { title: "Error" }); return; }

        const displayName = displayNameInput ? displayNameInput.value.trim() : "";
        const progId = programSelect && programSelect.value ? Number(programSelect.value) : null;

        if (!displayName) { showNotice("Please enter a display name.", { title: "Missing Field" }); return; }
        if (!progId) { showNotice("Please select a program.", { title: "Missing Field" }); return; }

        let posId = localStorage.getItem("hive_posId")
            ? Number(localStorage.getItem("hive_posId"))
            : null;

        if (!posId) posId = await getPositionId(supabase, "student");

        // Upload avatar if selected
        let avatarPath = null;
        if (avatarFile) {
            const ext = avatarFile.name.split(".").pop().toLowerCase();
            const filePath = `avatars/${user.id}_${Date.now()}.${ext}`;
            const { error: uploadErr } = await supabase.storage
                .from("profilePicture")
                .upload(filePath, avatarFile, { upsert: true, contentType: avatarFile.type });
            if (uploadErr) {
                showNotice("Failed to upload profile picture: " + uploadErr.message, { title: "Upload Error" });
                return;
            }
            // Store the path, not the URL — URLs can expire
            avatarPath = filePath;
        } else {
            // Load existing avatar path if not changing picture
            const { data: existingUser, error: fetchErr } = await supabase
                .from("USER")
                .select("avatarPath")
                .eq("userId", user.id)
                .maybeSingle();
            
            if (!fetchErr && existingUser) {
                avatarPath = existingUser.avatarPath;
                console.log("Using existing avatar:", avatarPath);
            }
        }

        const payload = {
            userId: user.id,
            userEmail: user.email,
            userDisplayName: displayName,
            posId,
            progId,
        };
        if (avatarPath) payload.avatarPath = avatarPath;

        console.log("Saving user profile with payload:", payload);

        const { error } = await supabase
            .from("USER")
            .upsert(payload, { onConflict: "userId" });

        if (error) {
            console.error("Database save error:", error);
            showNotice("Failed to save profile: " + error.message, { title: "Save Failed" });
            return;
        }

        console.log("Profile saved successfully to database");
        showNotice("Profile saved successfully!", {
            title: "Profile Created",
            type: "success",
            onClose: () => {
                localStorage.removeItem("hive_posId");
                localStorage.removeItem("hive_role");
                window.location.href = "t.dashb.html";
            },
        });
        return;

    });
}
