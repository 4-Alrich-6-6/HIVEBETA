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

const updateSaveButtonState = () => {
    if (!saveButton) return;
    saveButton.disabled = !displayNameInput?.value.trim() || !programSelect?.value;
};

displayNameInput?.addEventListener("input", updateSaveButtonState);
programSelect?.addEventListener("change", updateSaveButtonState);
updateSaveButtonState();

let avatarFile = null;
const cropOverlay = document.querySelector("#profileCropOverlay");
const cropCanvas = document.querySelector("#profileCropCanvas");
const cropZoom = document.querySelector("#profileCropZoom");
const cropCancel = document.querySelector("#profileCropCancel");
const cropSave = document.querySelector("#profileCropSave");
let cropImage = null;
let cropScale = 1;
let cropOffsetX = 0;
let cropOffsetY = 0;
let cropPointer = null;

const drawCropPreview = () => {
    if (!cropImage || !cropCanvas) return;
    const context = cropCanvas.getContext("2d");
    const size = cropCanvas.width;
    const baseScale = Math.max(size / cropImage.width, size / cropImage.height);
    const scale = baseScale * cropScale;
    context.clearRect(0, 0, size, size);
    context.fillStyle = "#fff";
    context.fillRect(0, 0, size, size);
    context.drawImage(cropImage, (size - cropImage.width * scale) / 2 + cropOffsetX, (size - cropImage.height * scale) / 2 + cropOffsetY, cropImage.width * scale, cropImage.height * scale);
};

const closeCrop = () => {
    cropOverlay?.classList.remove("open");
    cropOverlay?.setAttribute("aria-hidden", "true");
    cropImage = null;
    cropPointer = null;
};

const openCrop = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
        cropImage = new Image();
        cropImage.onload = () => {
            cropScale = 1;
            cropOffsetX = 0;
            cropOffsetY = 0;
            if (cropZoom) cropZoom.value = "1";
            drawCropPreview();
            cropOverlay?.classList.add("open");
            cropOverlay?.setAttribute("aria-hidden", "false");
        };
        cropImage.src = reader.result;
    };
    reader.readAsDataURL(file);
};

cropZoom?.addEventListener("input", () => { cropScale = Number(cropZoom.value); drawCropPreview(); });
cropCanvas?.addEventListener("pointerdown", (event) => { cropPointer = { x: event.clientX, y: event.clientY }; cropCanvas.setPointerCapture(event.pointerId); });
cropCanvas?.addEventListener("pointermove", (event) => { if (!cropPointer) return; cropOffsetX += event.clientX - cropPointer.x; cropOffsetY += event.clientY - cropPointer.y; cropPointer = { x: event.clientX, y: event.clientY }; drawCropPreview(); });
cropCanvas?.addEventListener("pointerup", () => { cropPointer = null; });
cropCanvas?.addEventListener("pointercancel", () => { cropPointer = null; });
cropCancel?.addEventListener("click", closeCrop);
cropOverlay?.addEventListener("click", (event) => { if (event.target === cropOverlay) closeCrop(); });
cropSave?.addEventListener("click", async () => {
    if (!cropImage || !cropCanvas) return;
    const blob = await new Promise((resolve) => cropCanvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) return;
    avatarFile = new File([blob], "profile-picture.jpg", { type: "image/jpeg" });
    if (profilePicPreview) profilePicPreview.src = cropCanvas.toDataURL("image/jpeg", 0.9);
    closeCrop();
});

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
    if (!supabase) {
        console.error("Program dropdown could not load: Supabase client is unavailable.");
        showNotice("Program options could not be loaded. Please refresh and try again.", { title: "Loading Error" });
        return;
    }
    const { data, error } = await supabase
        .from("PROGRAM")
        .select("progId, progName")
        .order("progId", { ascending: true });
    if (error) {
        console.error("Program dropdown query failed:", error);
        showNotice(`Program options could not be loaded: ${error.message}`, { title: "Loading Error" });
        return;
    }
    if (!data?.length) {
        console.warn("Program dropdown query returned no rows. Check PROGRAM data and SELECT policies.");
        showNotice("No programs are available yet. Please ask an administrator to add program options.", { title: "No Programs" });
        return;
    }
    data.forEach(prog => {
        const opt = document.createElement("option");
        opt.value = prog.progId;
        opt.textContent = prog.progName;
        programSelect.appendChild(opt);
    });
    
    // Load profile data after programs are loaded
    await loadProfileData();
    updateSaveButtonState();
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
        openCrop(file);
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
                window.location.href = "../lib/tutorial.html?role=student";
            },
        });
        return;

    });
}
