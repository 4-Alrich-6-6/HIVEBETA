const getSupabase = () => {
    if (!window.hiveSupabase) {
        throw new Error("Supabase is not ready. Please check your internet connection and try again.");
    }

    return window.hiveSupabase;
};

const getFriendlyAuthMessage = (error) => {
    const message = error?.message || "";
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("invalid login") || lowerMessage.includes("invalid credentials")) {
        return "Incorrect email or password. Please check your login details and try again.";
    }

    if (lowerMessage.includes("already registered") || lowerMessage.includes("user already registered") || lowerMessage.includes("email already exists") || lowerMessage.includes("email already in use") || lowerMessage.includes("duplicate") || lowerMessage.includes("already exists")) {
        return "This email is already registered. Please log in instead.";
    }

    if (lowerMessage.includes("confirmation email") || lowerMessage.includes("email")) {
        return "We could not send the OTP email right now. Please check your email address, then try again in a moment.";
    }

    if (lowerMessage.includes("user not found") || lowerMessage.includes("signups not allowed")) {
        return "We could not find an account with that email. Please sign up first.";
    }

    if (lowerMessage.includes("rate limit") || lowerMessage.includes("too many")) {
        return "Too many OTP requests. Please wait a little before trying again.";
    }

    return "Something went wrong while sending your OTP. Please try again.";
};

const checkExistingSignupEmail = async (supabase, email) => {
    const result = await supabase.auth.signInWithOtp({
        email,
        options: {
            shouldCreateUser: false,
        },
    });

    if (!result.error) {
        return { exists: true, error: null };
    }

    const lowerMessage = (result.error.message || "").toLowerCase();

    if (lowerMessage.includes("user not found") || lowerMessage.includes("signups not allowed")) {
        return { exists: false, error: null };
    }

    return { exists: false, error: result.error };
};

const redirectAfterLogin = async (supabase) => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        showAuthNotice("Login failed. Please try again.", { title: "Login Failed" });
        return;
    }

    const { data: existingUser, error } = await supabase
        .from("USER")
        .select("userId, posId, userDisplayName, progId, deptId")
        .eq("userId", user.id)
        .maybeSingle();

    if (error) {
        console.error("Profile lookup failed:", error);
        showAuthNotice("Login worked, but your profile could not be loaded. Please try again.", {
            title: "Profile Check Failed",
        });
        return;
    }

    if (!existingUser) {
        window.location.href = "profiling.html";
        return;
    }

    let role = "";
    let posId = existingUser.posId || null;

    if (!posId && existingUser.progId) {
        role = "student";
    } else if (!posId && existingUser.deptId) {
        role = "teacher";
    }

    if (!posId && role) {
        const { data: inferredPos } = await supabase
            .from("POSITION")
            .select("posId")
            .ilike("posName", role)
            .maybeSingle();

        if (inferredPos?.posId) {
            posId = inferredPos.posId;
            await supabase
                .from("USER")
                .update({ posId })
                .eq("userId", user.id);
        }
    }

    const { data: pos } = await supabase
        .from("POSITION")
        .select("posName")
        .eq("posId", posId)
        .maybeSingle();

    role = pos?.posName?.toLowerCase() || role;

    const isStudent = role === "student";
    const isTeacher = role === "teacher" || role === "professor";
    const profileIncomplete =
        !existingUser.userDisplayName ||
        (isStudent && !existingUser.progId) ||
        (isTeacher && !existingUser.deptId);

    if (profileIncomplete && (isStudent || isTeacher)) {
        localStorage.setItem("hive_posId", String(posId));
        localStorage.setItem("hive_role", role);
        window.location.href = isStudent
            ? "../student/s.profiling.html"
            : "../teacher/t.profiling.html";
        return;
    }

    if (isTeacher) {
        window.location.href = "../teacher/t.dashb.html";
    } else if (isStudent) {
        window.location.href = "../student/s.dashb.html";
    } else {
        window.location.href = "profiling.html";
    }
};

const showAuthNotice = (message, options = {}) => {
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

    const icon = notice.querySelector(".auth-notice-icon");
    const titleEl = notice.querySelector(".auth-notice-title");
    const messageEl = notice.querySelector(".auth-notice-message");
    const okBtn = notice.querySelector(".auth-notice-ok");

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

    const handleOverlayClick = (event) => {
        if (event.target === notice) closeNotice();
    };

    okBtn.addEventListener("click", closeNotice);
    notice.addEventListener("click", handleOverlayClick);
    notice.classList.add("open");
    notice.setAttribute("aria-hidden", "false");
    okBtn.focus();
};

// Clean up any abandoned signup from a previous session
(async () => {
    const abandonedEmail = localStorage.getItem("hive_email");
    const abandonedMode = localStorage.getItem("hive_auth_mode");
    if (abandonedEmail && abandonedMode === "signup") {
        try {
            const supabase = getSupabase();
            await supabase.rpc("delete_unverified_signup", { target_email: abandonedEmail });
        } catch (e) {
            console.error("Abandoned signup cleanup failed:", e);
        }
        localStorage.removeItem("hive_email");
        localStorage.removeItem("hive_auth_mode");
        localStorage.removeItem("hive_password");
    }
})();

// TOGGLE BUTTONS
const toggleButtons = document.querySelectorAll(".toggle-btn");

// FORMS
const loginForm = document.querySelector(".lForm");
const signUpForm = document.querySelector(".sForm");

// SWITCH LOGIN / SIGNUP
const setMode = (targetMode) => {
    const isSignup = targetMode === "signup";

    toggleButtons.forEach((btn) => {
        const isActive =
            btn.dataset.target === (isSignup ? "signup" : "login");

        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    if (!loginForm || !signUpForm) return;

    loginForm.classList.toggle("active", !isSignup);
    signUpForm.classList.toggle("active", isSignup);
};

// URL MODE
const urlMode = new URLSearchParams(window.location.search).get("mode");

if (urlMode === "signup" || urlMode === "login") {
    setMode(urlMode);
}

// TOGGLE BUTTON EVENTS
toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
        setMode(button.dataset.target);
    });
});

// PASSWORD TOGGLE
document.querySelectorAll(".toggle-password").forEach((toggle) => {
    toggle.addEventListener("click", () => {
        const input = toggle.previousElementSibling;

        if (!input || input.tagName !== "INPUT") return;

        input.type = input.type === "password" ? "text" : "password";
    });
});

// LOGIN
if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const emailInput = document.querySelector("#login-user");
        const passwordInput = document.querySelector("#login-pass");

        if (!emailInput || !emailInput.value.trim()) {
            showAuthNotice("Please enter your email.", { title: "Missing Email" });
            return;
        }

        if (!passwordInput || !passwordInput.value.trim()) {
            showAuthNotice("Please enter your password.", { title: "Missing Password" });
            return;
        }

        let error = null;
        let supabase = null;

        try {
            supabase = getSupabase();
            const result = await supabase.auth.signInWithPassword({
                email: emailInput.value.trim(),
                password: passwordInput.value,
            });
            error = result.error;
        } catch (authError) {
            console.error("Login failed:", authError);
            showAuthNotice(getFriendlyAuthMessage(authError), { title: "Login Failed" });
            return;
        }

        if (error) {
            console.error("Login failed:", error);
            showAuthNotice(getFriendlyAuthMessage(error), { title: "Login Failed" });
            return;
        }

        localStorage.removeItem("hive_email");
        localStorage.removeItem("hive_auth_mode");
        localStorage.removeItem("hive_password");

        await redirectAfterLogin(supabase);
    });
}

// SIGNUP
if (signUpForm) {
    signUpForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const emailInput = document.querySelector("#sign-email");
        const passwordInput = document.querySelector("#sign-pass");
        const confirmPasswordInput = document.querySelector("#confirm-pass");

        if (!emailInput || !emailInput.value.trim()) {
            showAuthNotice("Please enter your email.", { title: "Missing Email" });
            return;
        }

        if (!passwordInput || !confirmPasswordInput) return;

        if (passwordInput.value !== confirmPasswordInput.value) {
            showAuthNotice("Passwords do not match.", { title: "Check Password" });
            confirmPasswordInput.focus();
            return;
        }

        const normalizedEmail = emailInput.value.trim();
        localStorage.setItem("hive_email", normalizedEmail);
        localStorage.setItem("hive_auth_mode", "signup");
        localStorage.setItem("hive_password", passwordInput.value.trim());

        let error = null;

        try {
            const supabase = getSupabase();
            const { exists, error: emailCheckError } = await checkExistingSignupEmail(supabase, normalizedEmail);

            if (emailCheckError) {
                throw emailCheckError;
            }

            if (exists) {
                localStorage.removeItem("hive_email");
                localStorage.removeItem("hive_auth_mode");
                localStorage.removeItem("hive_password");
                showAuthNotice("This email is already registered. Please log in instead.", {
                    title: "Email Already Exists",
                });
                return;
            }

            const result = await supabase.auth.signInWithOtp({
                email: normalizedEmail,
                options: {
                    shouldCreateUser: true,
                },
            });
            error = result.error;
        } catch (authError) {
            console.error("Signup OTP request failed:", authError);
            showAuthNotice(getFriendlyAuthMessage(authError), { title: "OTP Not Sent" });
            return;
        }

        if (error) {
            console.error("Signup OTP request failed:", error);
            showAuthNotice(getFriendlyAuthMessage(error), { title: "OTP Not Sent" });
            return;
        }

        showAuthNotice("OTP sent to your email.", {
            title: "Check Your Email",
            type: "success",
            onClose: () => {
                window.location.href = "signverf.html";
            },
        });
    });
}

// TERMS MODAL
const termsModal = document.getElementById("termsModal");
const openTerms = document.getElementById("openTermsModal");
const closeTerms = document.getElementById("closeTerms");

if (openTerms && closeTerms && termsModal) {
    openTerms.onclick = () => {
        termsModal.style.display = "flex";
    };

    closeTerms.onclick = () => {
        termsModal.style.display = "none";
    };

    window.onclick = (e) => {
        if (e.target === termsModal) {
            termsModal.style.display = "none";
        }
    };
}
