const supa = () => window.hiveSupabase;

const backLink   = document.querySelector("#backLink");
const step1Form  = document.querySelector("#step1Form");
const step2Form  = document.querySelector("#step2Form");
const sendOtpBtn = document.querySelector("#sendOtpBtn");
const emailInput = document.querySelector("#email");

if (backLink) backLink.style.display = "flex";

// ── Styled notice (same as log-sign) ─────────────────────────────────────
const showNotice = (message, options = {}) => {
    const { title = "Notice", type = "info", onClose = null } = options;
    let notice = document.querySelector("#authNotice");
    if (!notice) {
        notice = document.createElement("div");
        notice.className = "auth-notice";
        notice.id = "authNotice";
        notice.setAttribute("aria-hidden", "true");
        notice.innerHTML = `
            <div class="auth-notice-content" role="dialog" aria-modal="true" aria-labelledby="authNoticeTitle">
                <div class="auth-notice-header">
                    <span class="auth-notice-icon" aria-hidden="true">!</span>
                    <h2 class="auth-notice-title" id="authNoticeTitle"></h2>
                </div>
                <p class="auth-notice-message"></p>
                <div class="auth-notice-actions">
                    <button class="auth-notice-ok" type="button">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(notice);
    }
    const icon      = notice.querySelector(".auth-notice-icon");
    const titleEl   = notice.querySelector(".auth-notice-title");
    const messageEl = notice.querySelector(".auth-notice-message");
    const okBtn     = notice.querySelector(".auth-notice-ok");

    if (icon)      icon.textContent     = type === "success" ? "✓" : "!";
    if (titleEl)   titleEl.textContent  = title;
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

// ── Cooldown timer ────────────────────────────────────────────────────────
let cooldownInterval = null;
const startCooldown = () => {
    let secondsLeft = 120;
    sendOtpBtn.disabled = true;
    sendOtpBtn.textContent = `Resend (${secondsLeft}s)`;
    if (cooldownInterval) clearInterval(cooldownInterval);
    cooldownInterval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft <= 0) {
            clearInterval(cooldownInterval);
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = "Send";
        } else {
            sendOtpBtn.textContent = `Resend (${secondsLeft}s)`;
        }
    }, 1000);
};

// ── Send OTP ──────────────────────────────────────────────────────────────
if (sendOtpBtn) {
    sendOtpBtn.addEventListener("click", async () => {
        if (!emailInput?.value.trim()) {
            showNotice("Please enter your email first.", { title: "Missing Email" });
            emailInput.focus();
            return;
        }

        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = "Sending...";

        try {
            const { error } = await supa().auth.signInWithOtp({
                email: emailInput.value.trim(),
                options: { shouldCreateUser: false },
            });

            if (error) {
                showNotice("Failed to send OTP: " + error.message, { title: "Error" });
                sendOtpBtn.disabled = false;
                sendOtpBtn.textContent = "Send";
                return;
            }

            showNotice("OTP sent! Check your email.", { title: "Check Your Email", type: "success" });
            startCooldown();

        } catch (err) {
            console.error("OTP error:", err);
            showNotice("Something went wrong. Please try again.", { title: "Error" });
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = "Send";
        }
    });
}

// ── Step 1: Verify OTP ────────────────────────────────────────────────────
if (step1Form) {
    step1Form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const otpInput = document.querySelector("#otp");
        if (!otpInput?.value.trim()) {
            showNotice("Please enter the OTP.", { title: "Missing OTP" });
            return;
        }

        try {
            const { error } = await supa().auth.verifyOtp({
                email: emailInput.value.trim(),
                token: otpInput.value.trim(),
                type: "email",
            });

            if (error) {
                showNotice("Invalid OTP. Please try again.", { title: "Invalid OTP" });
                otpInput.value = "";
                otpInput.focus();
                return;
            }

            step1Form.style.display = "none";
            step2Form.style.display = "block";
            if (backLink) backLink.style.display = "none";
            document.querySelector(".form-description p").textContent = "Enter your new password...";

        } catch (err) {
            console.error("Verify error:", err);
            showNotice("Something went wrong. Please try again.", { title: "Error" });
        }
    });
}

// ── Step 2: Update password ───────────────────────────────────────────────
if (step2Form) {
    step2Form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const newPass     = document.querySelector("#newPass");
        const confirmPass = document.querySelector("#confirmPass");

        if (newPass.value !== confirmPass.value) {
            showNotice("Passwords do not match.", { title: "Check Password" });
            confirmPass.value = "";
            confirmPass.focus();
            return;
        }

        try {
            const { error } = await supa().auth.updateUser({ password: newPass.value });

            if (error) {
                showNotice("Failed to reset password: " + error.message, { title: "Error" });
                return;
            }

            showNotice("Password reset successful! Please log in.", {
                title: "Success",
                type: "success",
                onClose: () => { window.location.href = "log-sign.html"; },
            });

        } catch (err) {
            console.error("Update error:", err);
            showNotice("Something went wrong. Please try again.", { title: "Error" });
        }
    });
}

// ── Password visibility toggle ────────────────────────────────────────────
document.querySelectorAll(".toggle-password").forEach((toggle) => {
    toggle.addEventListener("click", () => {
        const input = toggle.previousElementSibling;
        if (!input || input.tagName !== "INPUT") return;
        input.type = input.type === "password" ? "text" : "password";
    });
});

if (backLink) backLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "log-sign.html";
});

// ── Zoom prevention ───────────────────────────────────────────────────────
const blockedZoomKeys = ["+", "-", "=", "_", "0"];
window.addEventListener("wheel", (e) => { if (e.ctrlKey || e.metaKey) e.preventDefault(); }, { passive: false });
window.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && blockedZoomKeys.includes(e.key)) e.preventDefault(); });
window.addEventListener("gesturestart",  (e) => e.preventDefault());
window.addEventListener("gesturechange", (e) => e.preventDefault());
window.addEventListener("gestureend",    (e) => e.preventDefault());