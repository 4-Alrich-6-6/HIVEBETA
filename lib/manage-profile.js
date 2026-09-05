(function () {
    const scriptEl = document.currentScript
        || document.querySelector('script[src*="manage-profile.js"]');
    const scriptSrc = scriptEl ? scriptEl.src : "";
    const libBaseUrl = scriptSrc.replace(/manage-profile\.js(\?.*)?$/, "");
    const assetsBaseUrl = libBaseUrl.replace(/\/lib\/$/, "/assets/");

    const ensureStylesheet = () => {
        if (document.querySelector('link[data-manage-profile="true"]')) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = libBaseUrl + "manage-profile.css";
        link.setAttribute("data-manage-profile", "true");
        document.head.appendChild(link);
    };
    ensureStylesheet();

    // ── Role detection ────────────────────────────────────────────────────────
    const detectRole = () => {
        // Normalise separators so Windows file:// paths work too
        const path = location.pathname.replace(/\\/g, "/").toLowerCase();
        // Most reliable: check whether the URL sits inside /teacher/
        if (path.includes("/teacher/")) return "teacher";
        // Fallback: check the filename prefix
        const filename = path.split("/").filter(Boolean).pop() || "";
        return filename.startsWith("t.") ? "teacher" : "student";
    };
    const role = detectRole();
    const isTeacher = role === "teacher";
    const fieldLabel = isTeacher ? "Department" : "Program";

    // ── Supabase ──────────────────────────────────────────────────────────────
    const getSupabase = () => window.hiveSupabase;

    // ── Load options from DB (PROGRAM or DEPARTMENT) ──────────────────────────
    const loadOptions = async () => {
        const sb = getSupabase();
        if (!sb) return [];
        if (isTeacher) {
            const { data, error } = await sb
                .from("DEPARTMENT")
                .select("deptId, deptName")
                .order("deptId", { ascending: true });
            if (error || !data) return [];
            return data.map((d) => ({ id: d.deptId, name: d.deptName }));
        } else {
            const { data, error } = await sb
                .from("PROGRAM")
                .select("progId, progName")
                .order("progId", { ascending: true });
            if (error || !data) return [];
            return data.map((p) => ({ id: p.progId, name: p.progName }));
        }
    };

    // ── Load current user profile from DB ─────────────────────────────────────
    const loadProfile = async () => {
        const sb = getSupabase();
        if (!sb) return { displayName: "", fieldId: "", avatar: "" };

        const { data: { user } } = await sb.auth.getUser();
        if (!user) return { displayName: "", fieldId: "", avatar: "" };

        const { data, error } = await sb
            .from("USER")
            .select("userDisplayName, avatarPath, progId, deptId")
            .eq("userId", user.id)
            .maybeSingle();

        if (error || !data) return { displayName: "", fieldId: "", avatar: "" };

        return {
            displayName: data.userDisplayName || "",
            // fieldId is the numeric id: progId for students, deptId for teachers
            fieldId: isTeacher
                ? (data.deptId != null ? String(data.deptId) : "")
                : (data.progId != null ? String(data.progId) : ""),
            avatar: data.avatarPath || "",
        };
    };

    // ── Save profile to DB ────────────────────────────────────────────────────
    const saveProfileToDB = async (displayName, fieldId, newAvatarFile) => {
        const sb = getSupabase();
        if (!sb) throw new Error("Supabase not ready.");

        const { data: { user } } = await sb.auth.getUser();
        if (!user) throw new Error("Not logged in.");

        // Build update payload
        const payload = { userDisplayName: displayName };
        if (isTeacher) {
            payload.deptId = fieldId ? Number(fieldId) : null;
        } else {
            payload.progId = fieldId ? Number(fieldId) : null;
        }

        // Handle avatar upload if a new file was chosen
        if (newAvatarFile) {
            const ext = newAvatarFile.name.split(".").pop().toLowerCase();
            const filePath = `avatars/${user.id}_${Date.now()}.${ext}`;
            const { error: uploadErr } = await sb.storage
                .from("profilePicture")
                .upload(filePath, newAvatarFile, { upsert: true, contentType: newAvatarFile.type });
            if (uploadErr) throw new Error("Failed to upload avatar: " + uploadErr.message);
            // Store the path, not the URL — URLs can expire
            payload.avatarPath = filePath;
        }

        const { error } = await sb
            .from("USER")
            .update(payload)
            .eq("userId", user.id);

        if (error) throw new Error(error.message);

        return payload;
    };

    // ── Resolve a stored path to a public URL ─────────────────────────────────
    const resolveAvatar = (pathOrUrl) => {
        if (!pathOrUrl) return "";
        // Already a full URL (legacy data)
        if (pathOrUrl.startsWith("http")) {
            const sb = getSupabase();
            if (!sb) return pathOrUrl;
            // Extract path after /object/public/profilePicture/
            const match = pathOrUrl.match(/\/object\/public\/profilePicture\/(.+?)(\?|$)/);
            if (match) {
                const { data } = sb.storage.from("profilePicture").getPublicUrl(match[1]);
                return data?.publicUrl ? data.publicUrl + "?t=" + Date.now() : pathOrUrl;
            }
            return pathOrUrl;
        }
        const sb = getSupabase();
        if (!sb) return "";
        const { data } = sb.storage.from("profilePicture").getPublicUrl(pathOrUrl);
        return data?.publicUrl ? data.publicUrl + "?t=" + Date.now() : "";
    };

    // ── Lightbox for sidebar avatar ────────────────────────────────────────────
    const getSidebarLightbox = () => {
        let lb = document.querySelector("#avatarLightbox");
        if (!lb) {
            lb = document.createElement("div");
            lb.id = "avatarLightbox";
            lb.style.cssText = "display:none;position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:10000;align-items:center;justify-content:center;";
            lb.innerHTML = `
              <button style="position:absolute;top:16px;right:16px;width:40px;height:40px;border:none;border-radius:50%;background:#fff;font-size:20px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;" id="closeLightboxBtn">✕</button>
              <img id="lightboxImg" src="" alt="Profile picture" style="max-width:90vw;max-height:90vh;border-radius:12px;object-fit:contain;">
            `;
            document.body.appendChild(lb);
            lb.querySelector("#closeLightboxBtn").addEventListener("click", () => { lb.style.display = "none"; });
            lb.addEventListener("click", (e) => { if (e.target === lb) lb.style.display = "none"; });
        }
        return lb;
    };

    // ── Apply profile data to the sidebar ─────────────────────────────────────
    const applyToSidebar = (displayName, fieldName, avatarSrc) => {
        const profileBlock = document.querySelector(".profile-block");
        if (!profileBlock) return;

        const headings = profileBlock.querySelectorAll("h3");
        if (headings[0] && displayName) headings[0].textContent = displayName;
        // Always write h3[1] — fieldName may be empty if dept/program not yet set,
        // but we still want to clear the static "Email" placeholder.
        if (headings[1]) headings[1].textContent = fieldName || "";

        if (avatarSrc) {
            const avatarImg = profileBlock.querySelector(".avatar-circle img");
            if (avatarImg) {
                avatarImg.src = avatarSrc;
                avatarImg.style.cursor = "pointer";
                avatarImg.onclick = () => {
                    const lb = getSidebarLightbox();
                    lb.querySelector("#lightboxImg").src = avatarSrc;
                    lb.style.display = "flex";
                };
            }
        }
    };

    // ── Build modal HTML ───────────────────────────────────────────────────────
    const buildModal = () => {
        const overlay = document.createElement("div");
        overlay.className = "mp-overlay";
        overlay.id = "mpOverlay";
        overlay.setAttribute("aria-hidden", "true");

        overlay.innerHTML = `
            <div class="mp-modal" role="dialog" aria-modal="true" aria-labelledby="mpTitle">
                <div class="mp-header">
                    <h2 id="mpTitle">Manage Profile</h2>
                </div>
                <div class="mp-body">
                    <div class="mp-avatar-wrap">
                        <div class="mp-avatar">
                            <img id="mpAvatarImg" src="${assetsBaseUrl}profile.png" alt="Profile picture">
                        </div>
                        <button type="button" class="mp-avatar-edit" id="mpAvatarEdit" aria-label="Change profile picture">
                            <img src="${assetsBaseUrl}Edit.png" alt="Edit">
                        </button>
                        <input type="file" id="mpAvatarInput" accept="image/png,image/jpeg,image/jpg" hidden>
                    </div>
                    <div class="mp-field">
                        <label for="mpDisplayName">Display Name</label>
                        <input type="text" id="mpDisplayName" placeholder="Enter your Display Name">
                    </div>
                    <div class="mp-field">
                        <label for="mpProgram">${fieldLabel}</label>
                        <select id="mpProgram">
                            <option value="">Select ${fieldLabel}</option>
                        </select>
                    </div>
                </div>
                <div class="mp-actions">
                    <button type="button" class="mp-btn mp-btn-cancel" id="mpCancelBtn">Cancel</button>
                    <button type="button" class="mp-btn mp-btn-save" id="mpSaveBtn">Save</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        return overlay;
    };

    // ── Init ───────────────────────────────────────────────────────────────────
    const init = async () => {
        const profileLinks = document.querySelectorAll(".profile-link");
        if (!profileLinks.length) return;

        const overlay        = buildModal();
        const avatarImg      = overlay.querySelector("#mpAvatarImg");
        const avatarEditBtn  = overlay.querySelector("#mpAvatarEdit");
        const avatarInput    = overlay.querySelector("#mpAvatarInput");
        const displayNameInput = overlay.querySelector("#mpDisplayName");
        const programSelect  = overlay.querySelector("#mpProgram");
        const cancelBtn      = overlay.querySelector("#mpCancelBtn");
        const saveBtn        = overlay.querySelector("#mpSaveBtn");

        let pendingAvatarFile = null; // holds a File if user picked a new photo

        // ── Populate dropdown from DB ──────────────────────────────────────
        const dbOptions = await loadOptions();
        dbOptions.forEach(({ id, name }) => {
            const opt = document.createElement("option");
            opt.value = String(id);
            opt.textContent = name;
            programSelect.appendChild(opt);
        });

        // ── Load profile and apply to sidebar on page load ─────────────────
        const profile = await loadProfile();
        applyToSidebar(
            profile.displayName,
            dbOptions.find((o) => String(o.id) === profile.fieldId)?.name || "",
            resolveAvatar(profile.avatar)
        );

        // ── Open modal ─────────────────────────────────────────────────────
        const openModal = async (event) => {
            if (event) event.preventDefault();
            pendingAvatarFile = null;

            // Re-fetch fresh data every time the modal opens
            const fresh = await loadProfile();
            displayNameInput.value = fresh.displayName || "";
            programSelect.value    = fresh.fieldId     || "";
            avatarImg.src          = resolveAvatar(fresh.avatar) || (assetsBaseUrl + "profile.png");

            overlay.classList.add("open");
            overlay.setAttribute("aria-hidden", "false");
        };

        const closeModal = () => {
            overlay.classList.remove("open");
            overlay.setAttribute("aria-hidden", "true");
            pendingAvatarFile = null;
        };

        profileLinks.forEach((link) => link.addEventListener("click", openModal));
        cancelBtn.addEventListener("click", closeModal);
        overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
        });

        // ── Avatar preview (file picked but not uploaded yet) ──────────────
        avatarEditBtn.addEventListener("click", () => avatarInput.click());
        avatarInput.addEventListener("change", () => {
            const file = avatarInput.files && avatarInput.files[0];
            if (!file) return;
            const allowed = ["image/png", "image/jpeg", "image/jpg"];
            if (!allowed.includes(file.type)) {
                showAlert("Only PNG, JPG, and JPEG files are allowed.", { title: "Invalid File Type" });
                avatarInput.value = "";
                return;
            }
            pendingAvatarFile = file;
            const reader = new FileReader();
            reader.onload = (e) => { avatarImg.src = e.target.result; };
            reader.readAsDataURL(file);
        });

        // ── Save ───────────────────────────────────────────────────────────
        saveBtn.addEventListener("click", () => {
            const displayName = displayNameInput.value.trim();
            const fieldId     = programSelect.value;

            if (!displayName) {
                showAlert("Please enter a display name.", { title: "Missing Field" });
                return;
            }
            if (!fieldId) {
                showAlert(`Please select a ${fieldLabel}.`, { title: "Missing Field" });
                return;
            }

            const confirmFn = typeof showConfirmation === "function"
                ? showConfirmation
                : (msg, cb) => { if (confirm(msg)) cb(); };

            confirmFn(
                "Are you sure you want to save your profile changes?",
                async () => {
                    try {
                        const saved = await saveProfileToDB(displayName, fieldId, pendingAvatarFile);

                        // Update sidebar immediately
                        const selectedName = programSelect.options[programSelect.selectedIndex]?.text || "";
                        const newAvatar = pendingAvatarFile
                            ? (resolveAvatar(saved.avatarPath) || avatarImg.src)
                            : null;
                        applyToSidebar(displayName, selectedName, newAvatar);

                        closeModal();
                    } catch (err) {
                        showAlert("Failed to save profile: " + err.message, { title: "Save Failed" });
                    }
                },
                { title: "Save Profile", confirmText: "Save", cancelText: "Cancel" }
            );
        });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();