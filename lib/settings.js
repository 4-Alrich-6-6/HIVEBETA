(function () {
    const scriptEl = document.currentScript
        || document.querySelector('script[src*="settings.js"]');
    const scriptSrc = scriptEl ? scriptEl.src : "";
    const libBaseUrl = scriptSrc.replace(/settings\.js(\?.*)?$/, "");
    const assetsBaseUrl = libBaseUrl.replace(/\/lib\/$/, "/assets/");

    const ensureStylesheet = () => {
        if (document.querySelector('link[data-settings="true"]')) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = libBaseUrl + "settings.css";
        link.setAttribute("data-settings", "true");
        document.head.appendChild(link);
    };
    ensureStylesheet();

    const maskEmail = (email) => {
        if (!email) return "Not set";
        const [name, domain] = email.split("@");
        if (!domain) return email;
        const visible = Math.min(2, name.length);
        return name.substring(0, visible) + "*".repeat(Math.max(0, name.length - visible)) + "@" + domain;
    };

    const buildModal = () => {
        const overlay = document.createElement("div");
        overlay.className = "settings-overlay";
        overlay.id = "settingsOverlay";
        overlay.setAttribute("aria-hidden", "true");

        overlay.innerHTML = `
            <div class="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
                <div class="settings-header">
                    <h2 id="settingsTitle">Settings</h2>
                </div>
                <div class="settings-body">
                    <div class="settings-section">
                        <h3>Account</h3>
                        <div class="settings-info-row settings-profile-row">
                            <div class="settings-row-content"><img class="settings-profile-avatar" id="settingsProfileAvatar" src="${assetsBaseUrl}profile.png" alt="Profile picture"><span class="settings-label">Profile Picture</span></div>
                            <button type="button" class="settings-btn settings-btn-action" id="settingsChangePictureBtn">Change</button>
                            <input type="file" id="settingsPictureInput" accept="image/png,image/jpeg,image/jpg" hidden>
                        </div>
                        <div class="settings-info-row">
                            <span class="settings-label">Name</span>
                            <span class="settings-value" id="settingsNameDisplay">Loading...</span>
                            <button type="button" class="settings-btn settings-btn-action" id="settingsEditNameBtn">Edit Name</button>
                        </div>
                        <div class="settings-info-row">
                            <span class="settings-label">Change Email</span>
                            <span class="settings-value" id="settingsEmailDisplay">Loading...</span>
                            <button type="button" class="settings-btn settings-btn-action" id="settingsEditEmailBtn">Change</button>
                        </div>
                        <div class="settings-info-row">
                            <span class="settings-label">Change Password</span>
                            <span class="settings-value">••••••••</span>
                            <button type="button" class="settings-btn settings-btn-action" id="settingsEditPasswordBtn">Change</button>
                        </div>
                        <div class="settings-info-row">
                            <span class="settings-label" id="settingsOrgLabel">Program</span>
                            <span class="settings-value" id="settingsOrgDisplay">Loading...</span>
                            <button type="button" class="settings-btn settings-btn-action" id="settingsEditOrgBtn">Change</button>
                        </div>
                    </div>
                    <div class="settings-section settings-notification-section">
                        <h3>Notification</h3>
                        <div class="settings-info-row settings-reminder-row">
                            <div><strong class="settings-row-title">Task Reminders</strong><span class="settings-row-description">Get task reminder notification</span></div>
                            <label class="settings-switch"><input type="checkbox" id="settingsTaskReminderToggle"><span class="settings-switch-slider" aria-hidden="true"></span></label>
                        </div>
                    </div>
                    <div class="settings-section settings-privacy-section">
                        <h3>Privacy</h3>
                        <div class="settings-info-row settings-reminder-row">
                            <div><strong class="settings-row-title">Make Email Private</strong><span class="settings-row-description">Hide your email from other users.</span></div>
                            <label class="settings-switch"><input type="checkbox" id="settingsPrivateEmailToggle"><span class="settings-switch-slider" aria-hidden="true"></span></label>
                        </div>
                        <div class="settings-info-row settings-reminder-row">
                            <div><strong class="settings-row-title">Make Statistics Private</strong><span class="settings-row-description">Hide your statistics from other users.</span></div>
                            <label class="settings-switch"><input type="checkbox" id="settingsPrivateStatsToggle"><span class="settings-switch-slider" aria-hidden="true"></span></label>
                        </div>
                    </div>
                    <div class="settings-section settings-help-section">
                        <h3>Help</h3>
                        <div class="settings-info-row settings-reminder-row">
                            <div><strong class="settings-row-title">Report a Problem</strong><span class="settings-row-description">Please report a problem if you encounter one.</span></div>
                            <button type="button" class="settings-btn settings-btn-action" id="settingsReportProblemBtn">Report</button>
                        </div>
                    </div>
                    <p id="settingsStatusMsg" style="color:#e74c3c;font-size:13px;margin-top:8px;min-height:18px;"></p>
                </div>
                <div class="settings-actions">
                    <button type="button" class="settings-btn settings-btn-close" id="settingsCloseBtn">Close</button>
                </div>
            </div>

            <div class="settings-edit-overlay" id="settingsEditNameOverlay" aria-hidden="true">
                <div class="settings-edit-modal" role="dialog" aria-modal="true" aria-labelledby="settingsEditNameTitle">
                    <div class="settings-header"><h2 id="settingsEditNameTitle">Edit Name</h2></div>
                    <form id="settingsEditNameForm" class="settings-edit-form">
                        <div class="settings-form-group"><label for="settingsNewName">Name <span id="settingsNameCounter">0/50</span></label><input type="text" id="settingsNewName" placeholder="Enter your name" maxlength="50" required></div>
                        <div class="settings-edit-actions"><button type="button" class="settings-btn settings-btn-cancel" id="settingsEditNameCancelBtn">Cancel</button><button type="submit" class="settings-btn settings-btn-save">Save</button></div>
                    </form>
                </div>
            </div>

            <div class="settings-edit-overlay" id="settingsCropOverlay" aria-hidden="true">
                <div class="settings-edit-modal settings-crop-modal" role="dialog" aria-modal="true" aria-labelledby="settingsCropTitle">
                    <div class="settings-header"><h2 id="settingsCropTitle">Crop Profile Picture</h2></div>
                    <div class="settings-crop-body">
                        <div class="settings-crop-frame"><canvas id="settingsCropCanvas" width="320" height="320"></canvas></div>
                        <label class="settings-zoom-control" for="settingsCropZoom">Zoom<input id="settingsCropZoom" type="range" min="1" max="3" step="0.01" value="1"></label>
                    </div>
                    <div class="settings-edit-actions settings-crop-actions"><button type="button" class="settings-btn settings-btn-cancel" id="settingsCropCancelBtn">Cancel</button><button type="button" class="settings-btn settings-btn-save" id="settingsCropSaveBtn">Save Picture</button></div>
                </div>
            </div>

            <!-- Change Email Modal -->
            <div class="settings-edit-overlay" id="settingsEditEmailOverlay" aria-hidden="true">
                <div class="settings-edit-modal" role="dialog" aria-modal="true" aria-labelledby="settingsEditEmailTitle">
                    <div class="settings-header">
                        <h2 id="settingsEditEmailTitle">Change Email</h2>
                    </div>
                    <form id="settingsEditEmailForm" class="settings-edit-form">
                        <div class="settings-form-group">
                            <label for="settingsCurrentEmail">Current Email</label>
                            <input type="email" id="settingsCurrentEmail" readonly>
                        </div>
                        <div class="settings-form-group">
                            <label for="settingsNewEmail">New Email</label>
                            <div style="display:flex;gap:8px;">
                                <input type="email" id="settingsNewEmail" placeholder="Enter new email" style="flex:1;">
                                <button type="button" class="settings-btn settings-btn-save" id="settingsSendOtpBtn" style="white-space:nowrap;min-width:90px;">Send OTP</button>
                            </div>
                        </div>
                        <div class="settings-form-group" id="settingsOtpGroup" style="display:none;border-top:2px solid #ffcc00;padding-top:12px;margin-top:4px;">
                            <label for="settingsEmailOtp">Enter OTP sent to your new email</label>
                            <input type="text" id="settingsEmailOtp" placeholder="6-digit code" maxlength="6" autocomplete="one-time-code" inputmode="numeric">
                        </div>
                        <p id="emailErrorMsg" style="color:#e74c3c;font-size:13px;min-height:18px;"></p>
                        <div class="settings-edit-actions">
                            <button type="button" class="settings-btn settings-btn-cancel" id="settingsEditEmailCancelBtn">Cancel</button>
                            <button type="submit" class="settings-btn settings-btn-save" id="settingsEditEmailSaveBtn" disabled>Save</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Change Password Modal -->
            <div class="settings-edit-overlay" id="settingsEditPasswordOverlay" aria-hidden="true">
                <div class="settings-edit-modal" role="dialog" aria-modal="true" aria-labelledby="settingsEditPasswordTitle">
                    <div class="settings-header">
                        <h2 id="settingsEditPasswordTitle">Change Password</h2>
                    </div>
                    <form id="settingsEditPasswordForm" class="settings-edit-form">
                        <div class="settings-form-group">
                            <label for="settingsCurrentPassword">Current Password</label>
                            <input type="password" id="settingsCurrentPassword" placeholder="Enter current password">
                        </div>
                        <div class="settings-form-group">
                            <label for="settingsNewPassword">New Password</label>
                            <input type="password" id="settingsNewPassword" placeholder="Enter new password">
                        </div>
                        <div class="settings-form-group">
                            <label for="settingsConfirmPassword">Confirm New Password</label>
                            <input type="password" id="settingsConfirmPassword" placeholder="Confirm new password">
                        </div>
                        <p id="passwordErrorMsg" style="color:#e74c3c;font-size:13px;min-height:18px;"></p>
                        <div class="settings-edit-actions">
                            <button type="button" class="settings-btn settings-btn-cancel" id="settingsEditPasswordCancelBtn">Cancel</button>
                            <button type="submit" class="settings-btn settings-btn-save" id="settingsEditPasswordSaveBtn">Save</button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="settings-edit-overlay" id="settingsEditOrgOverlay" aria-hidden="true">
                <div class="settings-edit-modal" role="dialog" aria-modal="true" aria-labelledby="settingsEditOrgTitle">
                    <div class="settings-header"><h2 id="settingsEditOrgTitle">Change Program</h2></div>
                    <form id="settingsEditOrgForm" class="settings-edit-form">
                        <div class="settings-form-group">
                            <label for="settingsOrgSelect" id="settingsOrgSelectLabel">Program</label>
                            <select id="settingsOrgSelect" required><option value="">Loading options...</option></select>
                        </div>
                        <p id="orgErrorMsg" style="color:#e74c3c;font-size:13px;min-height:18px;"></p>
                        <div class="settings-edit-actions"><button type="button" class="settings-btn settings-btn-cancel" id="settingsEditOrgCancelBtn">Cancel</button><button type="submit" class="settings-btn settings-btn-save">Save</button></div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        return overlay;
    };

    const init = () => {
        const settingsBtns = document.querySelectorAll(".settings, .settings-link");
        if (!settingsBtns.length) return;

        const overlay = buildModal();
        const emailDisplay = overlay.querySelector("#settingsEmailDisplay");
        const nameDisplay = overlay.querySelector("#settingsNameDisplay");
        const profileAvatar = overlay.querySelector("#settingsProfileAvatar");
        const pictureInput = overlay.querySelector("#settingsPictureInput");
        const changePictureBtn = overlay.querySelector("#settingsChangePictureBtn");
        const editNameBtn = overlay.querySelector("#settingsEditNameBtn");
        const editNameOverlay = overlay.querySelector("#settingsEditNameOverlay");
        const editNameForm = overlay.querySelector("#settingsEditNameForm");
        const newNameInput = overlay.querySelector("#settingsNewName");
        const nameCounter = overlay.querySelector("#settingsNameCounter");
        const editNameCancelBtn = overlay.querySelector("#settingsEditNameCancelBtn");
        const cropOverlay = overlay.querySelector("#settingsCropOverlay");
        const cropCanvas = overlay.querySelector("#settingsCropCanvas");
        const cropZoom = overlay.querySelector("#settingsCropZoom");
        const cropCancelBtn = overlay.querySelector("#settingsCropCancelBtn");
        const cropSaveBtn = overlay.querySelector("#settingsCropSaveBtn");
        const reminderToggle = overlay.querySelector("#settingsTaskReminderToggle");
        const privateEmailToggle = overlay.querySelector("#settingsPrivateEmailToggle");
        const privateStatsToggle = overlay.querySelector("#settingsPrivateStatsToggle");
        const reportProblemBtn = overlay.querySelector("#settingsReportProblemBtn");
        const statusMsg = overlay.querySelector("#settingsStatusMsg");
        const closeBtn = overlay.querySelector("#settingsCloseBtn");
        const orgLabel = overlay.querySelector("#settingsOrgLabel");
        const orgDisplay = overlay.querySelector("#settingsOrgDisplay");
        const editOrgBtn = overlay.querySelector("#settingsEditOrgBtn");
        const editOrgOverlay = overlay.querySelector("#settingsEditOrgOverlay");
        const editOrgForm = overlay.querySelector("#settingsEditOrgForm");
        const orgSelect = overlay.querySelector("#settingsOrgSelect");
        const orgSelectLabel = overlay.querySelector("#settingsOrgSelectLabel");
        const editOrgTitle = overlay.querySelector("#settingsEditOrgTitle");
        const editOrgCancelBtn = overlay.querySelector("#settingsEditOrgCancelBtn");
        const orgErrorMsg = overlay.querySelector("#orgErrorMsg");

        reportProblemBtn?.addEventListener("click", () => {
            window.open("https://mail.google.com/mail/?view=cm&fs=1&to=partihive.system@gmail.com", "_blank", "noopener,noreferrer");
        });

        const avatarViewer = document.createElement("div");
        avatarViewer.className = "settings-avatar-viewer";
        avatarViewer.setAttribute("aria-hidden", "true");
        avatarViewer.innerHTML = `<button type="button" class="settings-avatar-viewer-close" aria-label="Close profile picture">&times;</button><img src="" alt="Profile picture">`;
        document.body.appendChild(avatarViewer);
        const avatarViewerImage = avatarViewer.querySelector("img");
        const closeAvatarViewer = () => {
            avatarViewer.classList.remove("open");
            avatarViewer.setAttribute("aria-hidden", "true");
        };
        profileAvatar?.addEventListener("click", () => {
            if (!profileAvatar.src) return;
            avatarViewerImage.src = profileAvatar.src;
            avatarViewer.classList.add("open");
            avatarViewer.setAttribute("aria-hidden", "false");
        });
        avatarViewer.querySelector(".settings-avatar-viewer-close")?.addEventListener("click", closeAvatarViewer);
        avatarViewer.addEventListener("click", (event) => {
            if (event.target === avatarViewer) closeAvatarViewer();
        });
        const isTeacher = window.location.pathname.replace(/\\/g, "/").includes("/teacher/");
        const orgField = isTeacher ? "deptId" : "progId";
        const orgTable = isTeacher ? "DEPARTMENT" : "PROGRAM";
        const orgIdField = isTeacher ? "deptId" : "progId";
        const orgNameField = isTeacher ? "deptName" : "progName";
        const orgDisplayField = isTeacher ? "deptName" : "progCode";
        const orgTitle = isTeacher ? "Department" : "Program";

        const editEmailOverlay = overlay.querySelector("#settingsEditEmailOverlay");
        const editEmailBtn = overlay.querySelector("#settingsEditEmailBtn");
        const editEmailCancelBtn = overlay.querySelector("#settingsEditEmailCancelBtn");
        const editEmailForm = overlay.querySelector("#settingsEditEmailForm");
        const currentEmailInput = overlay.querySelector("#settingsCurrentEmail");
        const newEmailInput = overlay.querySelector("#settingsNewEmail");
        const sendOtpBtn = overlay.querySelector("#settingsSendOtpBtn");
        const otpGroup = overlay.querySelector("#settingsOtpGroup");
        const emailOtpInput = overlay.querySelector("#settingsEmailOtp");
        const emailErrorMsg = overlay.querySelector("#emailErrorMsg");
        let emailOtpCooldown = null;
        let cropImage = null;
        let cropScale = 1;
        let cropOffsetX = 0;
        let cropOffsetY = 0;
        let cropPointer = null;

        if (orgLabel) orgLabel.textContent = orgTitle;
        if (orgSelectLabel) orgSelectLabel.textContent = orgTitle;
        if (editOrgTitle) editOrgTitle.textContent = `Change ${orgTitle}`;

        const editPasswordOverlay = overlay.querySelector("#settingsEditPasswordOverlay");
        const editPasswordBtn = overlay.querySelector("#settingsEditPasswordBtn");
        const editPasswordCancelBtn = overlay.querySelector("#settingsEditPasswordCancelBtn");
        const editPasswordForm = overlay.querySelector("#settingsEditPasswordForm");
        const currentPasswordInput = overlay.querySelector("#settingsCurrentPassword");
        const newPasswordInput = overlay.querySelector("#settingsNewPassword");
        const confirmPasswordInput = overlay.querySelector("#settingsConfirmPassword");
        const passwordErrorMsg = overlay.querySelector("#passwordErrorMsg");

        const setStatus = (el, msg, isError = true) => {
            if (!el) return;
            el.textContent = msg;
            el.style.color = isError ? "#e74c3c" : "#27ae60";
        };

        const updateNameCounter = () => {
            if (nameCounter) nameCounter.textContent = `${newNameInput?.value.length || 0}/50`;
        };
        newNameInput?.addEventListener("input", updateNameCounter);

        // Load and display current email from Supabase Auth
        const loadCurrentEmail = async () => {
            try {
                const { data: { user } } = await hiveSupabase.auth.getUser();
                if (user?.email && emailDisplay) {
                    emailDisplay.textContent = maskEmail(user.email);
                }
                const { data: profile } = await hiveSupabase
                    .from("USER")
                    .select(`userDisplayName, avatarPath, ${orgField}, privateEmail, privateStats`)
                    .eq("userId", user.id)
                    .maybeSingle();
                if (nameDisplay) nameDisplay.textContent = profile?.userDisplayName || "Not set";
                if (profile?.avatarPath && profileAvatar) {
                    profileAvatar.src = profile.avatarPath.startsWith("http")
                        ? profile.avatarPath
                        : hiveSupabase.storage.from("profilePicture").getPublicUrl(profile.avatarPath).data?.publicUrl || profileAvatar.src;
                }
                if (orgDisplay) {
                    const { data: currentOption } = profile?.[orgField]
                        ? await hiveSupabase
                            .from(orgTable)
                            .select(orgDisplayField)
                            .eq(orgIdField, profile[orgField])
                            .maybeSingle()
                        : { data: null };
                    orgDisplay.textContent = currentOption?.[orgDisplayField] || "Not set";
                }
                if (reminderToggle) reminderToggle.checked = localStorage.getItem(`hive_task_reminders_${user.id}`) !== "off";
                if (privateEmailToggle) privateEmailToggle.checked = Boolean(profile?.privateEmail);
                if (privateStatsToggle) privateStatsToggle.checked = Boolean(profile?.privateStats);
                return user?.email || "";
            } catch {
                return "";
            }
        };

        const openModal = async (event) => {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            window.HiveLoading?.hide();
            setStatus(statusMsg, "");
            await loadCurrentEmail();
            overlay.classList.add("open");
            overlay.setAttribute("aria-hidden", "false");
        };

        const closeModal = () => {
            overlay.classList.remove("open");
            overlay.setAttribute("aria-hidden", "true");
        };

        const resetEmailModal = () => {
            if (newEmailInput) newEmailInput.value = "";
            if (emailOtpInput) emailOtpInput.value = "";
            if (otpGroup) otpGroup.style.display = "none";
            const saveBtn = overlay.querySelector("#settingsEditEmailSaveBtn");
            if (saveBtn) saveBtn.disabled = true;
            if (sendOtpBtn) { sendOtpBtn.disabled = false; sendOtpBtn.textContent = "Send OTP"; }
            if (emailOtpCooldown) { clearInterval(emailOtpCooldown); emailOtpCooldown = null; }
            setStatus(emailErrorMsg, "");
        };

        const openEmailModal = async () => {
            const email = await loadCurrentEmail();
            if (currentEmailInput) currentEmailInput.value = email;
            resetEmailModal();
            editEmailOverlay.classList.add("open");
            editEmailOverlay.setAttribute("aria-hidden", "false");
        };

        const closeEmailModal = () => {
            editEmailOverlay.classList.remove("open");
            editEmailOverlay.setAttribute("aria-hidden", "true");
            resetEmailModal();
        };

        const startOtpCooldown = () => {
            let secs = 60;
            if (sendOtpBtn) { sendOtpBtn.disabled = true; sendOtpBtn.textContent = `Resend (${secs}s)`; }
            emailOtpCooldown = setInterval(() => {
                secs--;
                if (secs <= 0) {
                    clearInterval(emailOtpCooldown);
                    emailOtpCooldown = null;
                    if (sendOtpBtn) { sendOtpBtn.disabled = false; sendOtpBtn.textContent = "Resend OTP"; }
                } else {
                    if (sendOtpBtn) sendOtpBtn.textContent = `Resend (${secs}s)`;
                }
            }, 1000);
        };

        const openPasswordModal = () => {
            if (currentPasswordInput) currentPasswordInput.value = "";
            if (newPasswordInput) newPasswordInput.value = "";
            if (confirmPasswordInput) confirmPasswordInput.value = "";
            setStatus(passwordErrorMsg, "");
            editPasswordOverlay.classList.add("open");
            editPasswordOverlay.setAttribute("aria-hidden", "false");
        };

        const closePasswordModal = () => {
            editPasswordOverlay.classList.remove("open");
            editPasswordOverlay.setAttribute("aria-hidden", "true");
            if (editPasswordForm) editPasswordForm.reset();
            setStatus(passwordErrorMsg, "");
        };

        const closeOrgModal = () => {
            editOrgOverlay.classList.remove("open");
            editOrgOverlay.setAttribute("aria-hidden", "true");
            setStatus(orgErrorMsg, "");
        };

        const openOrgModal = async () => {
            setStatus(orgErrorMsg, "");
            orgSelect.innerHTML = `<option value="">Loading ${orgTitle.toLowerCase()}s...</option>`;
            editOrgOverlay.classList.add("open");
            editOrgOverlay.setAttribute("aria-hidden", "false");
            const [{ data: options, error: optionsError }, { data: { user } }] = await Promise.all([
                hiveSupabase.from(orgTable).select(`${orgIdField}, ${orgNameField}`).order(orgIdField, { ascending: true }),
                hiveSupabase.auth.getUser(),
            ]);
            if (optionsError || !options?.length || !user) {
                setStatus(orgErrorMsg, `Unable to load ${orgTitle.toLowerCase()} options.`);
                return;
            }
            const { data: profile } = await hiveSupabase.from("USER").select(orgField).eq("userId", user.id).maybeSingle();
            orgSelect.innerHTML = `<option value="">Select ${orgTitle.toLowerCase()}</option>`;
            options.forEach((option) => {
                const optionEl = document.createElement("option");
                optionEl.value = option[orgIdField];
                optionEl.textContent = option[orgNameField];
                optionEl.selected = String(option[orgIdField]) === String(profile?.[orgField] || "");
                orgSelect.appendChild(optionEl);
            });
            orgSelect.focus();
        };

        const closeNameModal = () => {
            editNameOverlay.classList.remove("open");
            editNameOverlay.setAttribute("aria-hidden", "true");
        };

        editNameBtn.addEventListener("click", async () => {
            const { data: { user } } = await hiveSupabase.auth.getUser();
            if (!user) return;
            if (newNameInput) newNameInput.value = nameDisplay?.textContent === "Not set" ? "" : nameDisplay?.textContent || "";
            updateNameCounter();
            editNameOverlay.classList.add("open");
            editNameOverlay.setAttribute("aria-hidden", "false");
            newNameInput?.focus();
        });
        editNameCancelBtn.addEventListener("click", closeNameModal);
        editNameOverlay.addEventListener("click", (e) => { if (e.target === editNameOverlay) closeNameModal(); });
        editNameForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = newNameInput?.value.trim().slice(0, 50);
            if (!name) return;
            const { data: { user } } = await hiveSupabase.auth.getUser();
            const { error } = await hiveSupabase.from("USER").update({ userDisplayName: name }).eq("userId", user.id);
            if (error) { setStatus(statusMsg, "Failed to update name."); return; }
            if (nameDisplay) nameDisplay.textContent = name;
            closeNameModal();
        });

        const drawCropPreview = () => {
            if (!cropImage || !cropCanvas) return;
            const context = cropCanvas.getContext("2d");
            const size = cropCanvas.width;
            const baseScale = Math.max(size / cropImage.width, size / cropImage.height);
            const scale = baseScale * cropScale;
            context.clearRect(0, 0, size, size);
            context.fillStyle = "#111";
            context.fillRect(0, 0, size, size);
            context.drawImage(cropImage, (size - cropImage.width * scale) / 2 + cropOffsetX, (size - cropImage.height * scale) / 2 + cropOffsetY, cropImage.width * scale, cropImage.height * scale);
        };

        const closeCropModal = () => {
            cropOverlay.classList.remove("open");
            cropOverlay.setAttribute("aria-hidden", "true");
            cropImage = null;
            cropPointer = null;
            pictureInput.value = "";
        };

        changePictureBtn.addEventListener("click", () => pictureInput?.click());
        pictureInput.addEventListener("change", async () => {
            const file = pictureInput.files?.[0];
            if (!file) return;
            if (!file.type.startsWith("image/")) { setStatus(statusMsg, "Please select an image file."); return; }
            const reader = new FileReader();
            reader.onload = () => {
                cropImage = new Image();
                cropImage.onload = () => {
                    cropScale = 1;
                    cropOffsetX = 0;
                    cropOffsetY = 0;
                    cropZoom.value = "1";
                    drawCropPreview();
                    cropOverlay.classList.add("open");
                    cropOverlay.setAttribute("aria-hidden", "false");
                };
                cropImage.src = reader.result;
            };
            reader.readAsDataURL(file);
        });

        cropZoom.addEventListener("input", () => { cropScale = Number(cropZoom.value); drawCropPreview(); });
        cropCanvas.addEventListener("pointerdown", (event) => {
            cropPointer = { x: event.clientX, y: event.clientY };
            cropCanvas.setPointerCapture(event.pointerId);
        });
        cropCanvas.addEventListener("pointermove", (event) => {
            if (!cropPointer) return;
            cropOffsetX += event.clientX - cropPointer.x;
            cropOffsetY += event.clientY - cropPointer.y;
            cropPointer = { x: event.clientX, y: event.clientY };
            drawCropPreview();
        });
        cropCanvas.addEventListener("pointerup", () => { cropPointer = null; });
        cropCanvas.addEventListener("pointercancel", () => { cropPointer = null; });
        cropCancelBtn.addEventListener("click", closeCropModal);
        cropOverlay.addEventListener("click", (event) => { if (event.target === cropOverlay) closeCropModal(); });
        cropSaveBtn.addEventListener("click", async () => {
            if (!cropImage) return;
            const croppedBlob = await new Promise((resolve) => cropCanvas.toBlob(resolve, "image/jpeg", 0.9));
            if (!croppedBlob) return;
            const { data: { user } } = await hiveSupabase.auth.getUser();
            if (!user) return;
            cropSaveBtn.disabled = true;
            const path = `avatars/${user.id}_${Date.now()}.jpg`;
            const { error: uploadError } = await hiveSupabase.storage.from("profilePicture").upload(path, croppedBlob, { upsert: true, contentType: "image/jpeg" });
            if (uploadError) { cropSaveBtn.disabled = false; setStatus(statusMsg, "Failed to upload profile picture."); return; }
            const { error: updateError } = await hiveSupabase.from("USER").update({ avatarPath: path }).eq("userId", user.id);
            cropSaveBtn.disabled = false;
            if (updateError) { setStatus(statusMsg, "Failed to save profile picture."); return; }
            const avatarUrl = hiveSupabase.storage.from("profilePicture").getPublicUrl(path).data?.publicUrl;
            if (profileAvatar && avatarUrl) profileAvatar.src = avatarUrl;
            closeCropModal();
        });

        reminderToggle.addEventListener("change", async () => {
            const { data: { user } } = await hiveSupabase.auth.getUser();
            if (user) localStorage.setItem(`hive_task_reminders_${user.id}`, reminderToggle.checked ? "on" : "off");
        });

        const savePrivacySetting = async (field, value) => {
            const { data: { user } } = await hiveSupabase.auth.getUser();
            if (!user) return;
            const { error } = await hiveSupabase.from("USER").update({ [field]: value }).eq("userId", user.id);
            if (error) setStatus(statusMsg, "Failed to save privacy setting.");
        };
        privateEmailToggle?.addEventListener("change", () => savePrivacySetting("privateEmail", privateEmailToggle.checked));
        privateStatsToggle?.addEventListener("change", () => savePrivacySetting("privateStats", privateStatsToggle.checked));

        // Settings button click — stop propagation to avoid loading screen
        settingsBtns.forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                openModal(e);
            });
        });

        closeBtn.addEventListener("click", closeModal);
        overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
        editEmailOverlay.addEventListener("click", (e) => { if (e.target === editEmailOverlay) closeEmailModal(); });
        editPasswordOverlay.addEventListener("click", (e) => { if (e.target === editPasswordOverlay) closePasswordModal(); });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                if (editEmailOverlay.classList.contains("open")) closeEmailModal();
                else if (editPasswordOverlay.classList.contains("open")) closePasswordModal();
                else if (overlay.classList.contains("open")) closeModal();
            }
        });

        editEmailBtn.addEventListener("click", openEmailModal);
        editEmailCancelBtn.addEventListener("click", closeEmailModal);

        // Send OTP to new email via email change flow (does NOT create a new account)
        if (sendOtpBtn) {
            sendOtpBtn.addEventListener("click", async () => {
                console.log("Send OTP button clicked");
                const newEmail = newEmailInput ? newEmailInput.value.trim() : "";
                if (!newEmail) { setStatus(emailErrorMsg, "Please enter a new email."); return; }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { setStatus(emailErrorMsg, "Please enter a valid email address."); return; }

                setStatus(emailErrorMsg, "Sending OTP...", false);
                try {
                    console.log("Sending OTP to:", newEmail);
                    const { error } = await hiveSupabase.auth.updateUser({ email: newEmail });
                    console.log("updateUser response:", { error });
                    if (error) { setStatus(emailErrorMsg, error.message || "Failed to send OTP."); return; }
                    setStatus(emailErrorMsg, `OTP sent to ${newEmail}. Check your inbox.`, false);
                    if (otpGroup) otpGroup.style.display = "block";
                    if (emailOtpInput) emailOtpInput.value = "";
                    const saveBtn = overlay.querySelector("#settingsEditEmailSaveBtn");
                    if (saveBtn) saveBtn.disabled = false;
                    startOtpCooldown();
                } catch {
                    setStatus(emailErrorMsg, "An unexpected error occurred.");
                }
            });
        }

        // Verify the email change OTP sent by Supabase to the new email
        if (editEmailForm) {
            editEmailForm.addEventListener("submit", async (e) => {
                console.log("Email form submit event fired");
                e.preventDefault();
                const newEmail = newEmailInput ? newEmailInput.value.trim() : "";
                const otp = emailOtpInput ? emailOtpInput.value.trim() : "";

                console.log("Form values:", { newEmail, otp, otpLength: otp.length });

                if (!newEmail) { setStatus(emailErrorMsg, "Please enter a new email."); console.log("No email"); return; }
                if (!otp) { setStatus(emailErrorMsg, "Please enter the OTP sent to your new email."); console.log("No OTP"); return; }

                const saveBtn = overlay.querySelector("#settingsEditEmailSaveBtn");
                if (saveBtn) saveBtn.disabled = true;
                setStatus(emailErrorMsg, "Verifying OTP...", false);

                try {
                    console.log("Verifying:", { email: newEmail, otp: otp, otpLength: otp.length, type: "email_change" });
                    
                    const { error: verifyError } = await hiveSupabase.auth.verifyOtp({
                        email: newEmail,
                        token: otp,
                        type: "email_change",
                    });

                    if (verifyError) {
                        console.error("OTP verification error:", verifyError);
                        setStatus(emailErrorMsg, "Invalid or expired OTP. Please try again.");
                        if (saveBtn) saveBtn.disabled = false;
                        return;
                    }

                    setStatus(emailErrorMsg, "Email updated successfully!", false);
                    if (emailDisplay) emailDisplay.textContent = maskEmail(newEmail);
                    setTimeout(() => closeEmailModal(), 2000);
                } catch {
                    setStatus(emailErrorMsg, "An unexpected error occurred.");
                    if (saveBtn) saveBtn.disabled = false;
                }
            });
        }

        editPasswordBtn.addEventListener("click", openPasswordModal);
        editPasswordCancelBtn.addEventListener("click", closePasswordModal);
        editOrgBtn.addEventListener("click", openOrgModal);
        editOrgCancelBtn.addEventListener("click", closeOrgModal);
        editOrgOverlay.addEventListener("click", (e) => { if (e.target === editOrgOverlay) closeOrgModal(); });
        editOrgForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!orgSelect.value) return;
            const { data: { user } } = await hiveSupabase.auth.getUser();
            if (!user) return;
            const { error } = await hiveSupabase.from("USER").update({ [orgField]: Number(orgSelect.value) }).eq("userId", user.id);
            if (error) { setStatus(orgErrorMsg, `Failed to update ${orgTitle.toLowerCase()}.`); return; }
            orgDisplay.textContent = orgSelect.options[orgSelect.selectedIndex].textContent;
            closeOrgModal();
        });

        // Change Password — verifies current password first, then uses Supabase Auth updateUser
        if (editPasswordForm) {
            editPasswordForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const currentPassword = currentPasswordInput ? currentPasswordInput.value : "";
                const newPassword = newPasswordInput ? newPasswordInput.value.trim() : "";
                const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value.trim() : "";

                if (!currentPassword) { setStatus(passwordErrorMsg, "Please enter your current password."); return; }
                if (!newPassword) { setStatus(passwordErrorMsg, "Please enter a new password."); return; }
                if (newPassword.length < 6) { setStatus(passwordErrorMsg, "Password must be at least 6 characters."); return; }
                if (newPassword !== confirmPassword) { setStatus(passwordErrorMsg, "Passwords do not match."); return; }

                const saveBtn = overlay.querySelector("#settingsEditPasswordSaveBtn");
                if (saveBtn) saveBtn.disabled = true;
                setStatus(passwordErrorMsg, "Verifying...", false);

                try {
                    // Verify current password by re-authenticating
                    const { data: { user } } = await hiveSupabase.auth.getUser();
                    const { error: signInError } = await hiveSupabase.auth.signInWithPassword({
                        email: user?.email,
                        password: currentPassword,
                    });

                    if (signInError) {
                        setStatus(passwordErrorMsg, "Current password is incorrect.");
                        if (saveBtn) saveBtn.disabled = false;
                        return;
                    }

                    setStatus(passwordErrorMsg, "Saving...", false);
                    const { error } = await hiveSupabase.auth.updateUser({ password: newPassword });

                    if (error) {
                        setStatus(passwordErrorMsg, error.message || "Failed to update password.");
                        if (saveBtn) saveBtn.disabled = false;
                        return;
                    }

                    setStatus(passwordErrorMsg, "Password updated successfully!", false);
                    setTimeout(() => closePasswordModal(), 2000);
                } catch (err) {
                    setStatus(passwordErrorMsg, "An unexpected error occurred.");
                } finally {
                    if (saveBtn) saveBtn.disabled = false;
                }
            });
        }

        // Load email on init
        loadCurrentEmail();
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();