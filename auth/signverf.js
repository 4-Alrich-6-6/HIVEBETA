const verifyForm = document.querySelector(".lForm");
const resendOtpBtn = document.querySelector("#resendOtpBtn");
const verifyBackLink = document.querySelector("#verifyBackLink");

let cooldownInterval = null;
let otpVerified = false;

// Get email from signup/login page
const userEmail = localStorage.getItem("hive_email");
const authMode = localStorage.getItem("hive_auth_mode") || "signup";
const getSupabase = () => {
  if (!window.hiveSupabase) {
    throw new Error("Supabase is not ready. Please check your internet connection and try again.");
  }

  return window.hiveSupabase;
};

const getFriendlyAuthMessage = (error) => {
  const message = error?.message || "";
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("confirmation email") || lowerMessage.includes("email")) {
    return "We could not send the OTP email right now. Please check your email address, then try again in a moment.";
  }

  if (lowerMessage.includes("rate limit") || lowerMessage.includes("too many")) {
    return "Too many OTP requests. Please wait a little before trying again.";
  }

  return "Something went wrong while sending your OTP. Please try again.";
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

const startCooldown = () => {
  if (!resendOtpBtn) return;

  let secondsLeft = 120;
  resendOtpBtn.disabled = true;
  resendOtpBtn.textContent = `Resend (${secondsLeft}s)`;

  if (cooldownInterval) clearInterval(cooldownInterval);

  cooldownInterval = setInterval(() => {
    secondsLeft--;

    if (secondsLeft <= 0) {
      clearInterval(cooldownInterval);
      resendOtpBtn.disabled = false;
      resendOtpBtn.textContent = "Resend";
    } else {
      resendOtpBtn.textContent = `Resend (${secondsLeft}s)`;
    }
  }, 1000);
};

// SEND OTP EMAIL
const sendOtp = async () => {
  if (!userEmail) {
    showAuthNotice("Email not found. Please go back and enter your email again.", {
      title: "Missing Email",
      onClose: () => {
        window.location.href = "log-sign.html";
      },
    });
    return;
  }

  let error = null;

  try {
    const supabase = getSupabase();

    if (authMode === "signup") {
      const { exists, error: emailCheckError } = await (async () => {
        const result = await supabase.auth.signInWithOtp({
          email: userEmail,
          options: { shouldCreateUser: false },
        });

        if (!result.error) {
          return { exists: true, error: null };
        }

        const lowerMessage = (result.error.message || "").toLowerCase();
        if (lowerMessage.includes("user not found") || lowerMessage.includes("signups not allowed")) {
          return { exists: false, error: null };
        }

        return { exists: false, error: result.error };
      })();

      if (emailCheckError) {
        throw emailCheckError;
      }

      if (exists) {
        showAuthNotice("This email is already registered. Please log in instead.", {
          title: "Email Already Exists",
        });
        return;
      }
    }

    const result = await supabase.auth.signInWithOtp({
      email: userEmail,
      options: {
        shouldCreateUser: authMode === "signup",
      },
    });
    error = result.error;
  } catch (authError) {
    console.error("Resend OTP request failed:", authError);
    showAuthNotice(getFriendlyAuthMessage(authError), { title: "OTP Not Sent" });
    return;
  }

  if (error) {
    console.error("Resend OTP request failed:", error);
    showAuthNotice(getFriendlyAuthMessage(error), { title: "OTP Not Sent" });
    return;
  }

  showAuthNotice("OTP sent to your email.", {
    title: "Check Your Email",
    type: "success",
  });
  startCooldown();
};

// RESEND OTP
if (resendOtpBtn) {
  resendOtpBtn.addEventListener("click", sendOtp);
}

// VERIFY OTP
if (verifyForm) {
  verifyForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const otpInput = document.querySelector("#otp");

    if (!userEmail) {
      showAuthNotice("Email not found. Please go back and enter your email again.", {
        title: "Missing Email",
        onClose: () => {
          window.location.href = "log-sign.html";
        },
      });
      return;
    }

    if (!otpInput || !otpInput.value.trim()) {
      showAuthNotice("Please enter your OTP.", { title: "Missing OTP" });
      return;
    }

    let error = null;
    let supabase = null;

    try {
      supabase = getSupabase();
      const result = await supabase.auth.verifyOtp({
        email: userEmail,
        token: otpInput.value.trim(),
        type: "email",
      });
      error = result.error;
    } catch (authError) {
      console.error("OTP verification failed:", authError);
      showAuthNotice("We could not verify your OTP right now. Please try again.", {
        title: "Verification Failed",
      });
      return;
    }

    if (error) {
      showAuthNotice("Invalid or expired OTP. Please try again.", {
        title: "Verification Failed",
      });
      otpInput.value = "";
      otpInput.focus();
      return;
    }

    otpVerified = true;

    // Set password for signup users
    if (authMode === "signup") {
      const password = localStorage.getItem("hive_password");
      if (password) {
        try {
          const { error: updateError } = await supabase.auth.updateUser({
            password: password
          });
          if (updateError) {
            console.error("Failed to set password:", updateError);
            showAuthNotice("Account created but password could not be set. You may need to reset your password.", {
              title: "Password Setup Failed",
            });
          }
        } catch (updateErr) {
          console.error("Password update error:", updateErr);
        }
      }
    }

    localStorage.removeItem("hive_email");
    localStorage.removeItem("hive_auth_mode");
    localStorage.removeItem("hive_password");

    // Check if USER row already exists in DB
    const { data: { user } } = await supabase.auth.getUser();
    const { data: existingUser, error: existingUserError } = await supabase
      .from("USER")
      .select("userId, posId, userDisplayName, progId, deptId")
      .eq("userId", user.id)
      .maybeSingle();

    if (existingUserError) {
      console.error("Profile lookup failed:", existingUserError);
      showAuthNotice("Login worked, but your profile could not be loaded because of a database policy error. Please fix the Supabase RLS policy and try again.", {
        title: "Profile Check Failed",
      });
      return;
    }

    if (existingUser) {
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
      // Returning user — check role and redirect
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
      } else if (isTeacher) {
        window.location.href = "../teacher/t.dashb.html";
      } else if (isStudent) {
        window.location.href = "../student/s.dashb.html";
      } else {
        window.location.href = "profiling.html";
      }
    } else {
      // New user — go through profiling
      window.location.href = "profiling.html";
    }
  });
}

const clearSignupStorage = () => {
  localStorage.removeItem("hive_email");
  localStorage.removeItem("hive_auth_mode");
  localStorage.removeItem("hive_password");
};

const deleteUnverifiedAccount = async () => {
  if (!userEmail) return;
  try {
    const supabase = getSupabase();
    await supabase.rpc("delete_unverified_signup", { target_email: userEmail });
  } catch (e) {
    console.error("Unverified account cleanup failed:", e);
  }
  clearSignupStorage();
};

// BACK
if (verifyBackLink) {
  verifyBackLink.addEventListener("click", async (event) => {
    event.preventDefault();
    if (authMode === "signup" && !otpVerified) {
      await deleteUnverifiedAccount();
    }
    window.location.href = `log-sign.html?mode=${authMode}`;
  });
}

// Clear localStorage if user leaves without verifying (signup only)
window.addEventListener("pagehide", () => {
  if (authMode === "signup" && !otpVerified) {
    clearSignupStorage();
  }
});

if (!userEmail) {
  showAuthNotice("Email not found. Please go back and enter your email again.", {
    title: "Missing Email",
    onClose: () => {
      window.location.href = "log-sign.html";
    },
  });
} else {
  startCooldown();
}
