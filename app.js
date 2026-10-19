/* =====================================================
   VIDORA — FUTURISTIC APP.JS
   Green + Black Theme | Stories | Country/Language | Auth
   ===================================================== */

"use strict";

/* ===================== CONFIG ===================== */

const SUPABASE_URL = "https://htnrqgzxkfktwoioscjr.supabase.co";

// IMPORTANT: Replace with your real Supabase anon key
const SUPABASE_ANON_KEY = "sb_publishable_JT5rBfXYSX3-3_zyC2cazQ_YXg_ih_h";

/* ===================== STATE ===================== */

const state = {
  supabase: null,
  user: null,
  profile: null,
  currentSignupStep: 1,
  country: localStorage.getItem("vidora_country") || "",
  language: localStorage.getItem("vidora_language") || "en",
  isMuted: true,
  currentView: "homeView"
};

/* ===================== AVATARS (from your folder) ===================== */

const AVATARS = [
  { name: "Skye",  file: "avatars/skye.png" },
  { name: "Neo",   file: "avatars/neo.png" },
  { name: "Nova",  file: "avatars/nova.png" },
  { name: "Luna",  file: "avatars/luna.png" },
  { name: "Blaze", file: "avatars/blaze.png" },
  { name: "Pixel", file: "avatars/pixel.png" },
  { name: "Aria",  file: "avatars/aria.png" },
  { name: "Jett",  file: "avatars/jett.png" },
  { name: "Kai",   file: "avatars/kai.png" },
  { name: "Zara",  file: "avatars/zara.png" },
  { name: "Onyx",  file: "avatars/onyx.png" },
  { name: "Rex",   file: "avatars/rex.png" }
];

/* ===================== HELPERS ===================== */

const $ = (id) => document.getElementById(id);

function notify(message) {
  let box = $("vidoraToast");
  if (!box) {
    box = document.createElement("div");
    box.id = "vidoraToast";
    box.style.cssText = `
      position: fixed;
      left: 50%;
      bottom: 90px;
      transform: translateX(-50%);
      background: #111;
      color: white;
      padding: 12px 20px;
      border-radius: 14px;
      border: 1px solid rgba(0,230,118,0.3);
      z-index: 9999;
      font-size: 14px;
      max-width: 85%;
      text-align: center;
      display: none;
    `;
    document.body.appendChild(box);
  }
  box.textContent = message;
  box.style.display = "block";
  clearTimeout(box._timer);
  box._timer = setTimeout(() => box.style.display = "none", 2800);
}

function showAuth() {
  $("authScreen").style.display = "flex";
  $("appShell").style.display = "none";
}

function showApp() {
  $("authScreen").style.display = "none";
  $("appShell").style.display = "flex";
  loadStories();
}

/* ===================== AUTH ===================== */

function setAuthMode(mode) {
  const isSignup = mode === "signup";

  $("loginFields").classList.toggle("hidden", isSignup);
  $("signupWizard").classList.toggle("hidden", !isSignup);
  $("showSignup").classList.toggle("hidden", isSignup);
  $("showLogin").classList.toggle("hidden", !isSignup);

  $("authTitle").textContent = isSignup ? "Create your account" : "Welcome back";
  $("authMessage").textContent = "";

  if (isSignup) {
    state.currentSignupStep = 1;
    showSignupStep(1);
  }
}

function showSignupStep(step) {
  document.querySelectorAll(".signup-step").forEach(el => {
    el.classList.toggle("hidden", Number(el.dataset.step) !== step);
  });

  $("signupBack").classList.toggle("hidden", step === 1);
  $("signupNext").textContent = step === 4 ? "Create Account" : "Continue";

  // Update review
  if (step === 4) {
    $("reviewName").textContent = $("authDisplayName")?.value || "—";
    $("reviewUsername").textContent = $("authUsername")?.value || "—";
    $("reviewEmail").textContent = $("authEmail")?.value || "—";
    $("reviewCountry").textContent = $("authCountry")?.selectedOptions[0]?.text || "—";
  }
}

async function handleAuth(e) {
  e?.preventDefault();

  if (!state.supabase) {
    notify("Supabase is not configured yet.");
    return;
  }

  const isSignup = !$("signupWizard").classList.contains("hidden");

  try {
    if (isSignup) {
      const email = $("authEmail")?.value.trim();
      const password = $("authPassword")?.value.trim();
      const username = $("authUsername")?.value.trim();
      const displayName = $("authDisplayName")?.value.trim();
      const country = $("authCountry")?.value;
      const language = $("authLanguage")?.value;

      if (!username || !email || !password) {
        notify("Please fill all required fields.");
        return;
      }
      if (!$("authTerms")?.checked) {
        notify("Please accept the terms.");
        return;
      }

      const { data, error } = await state.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: displayName || username,
            country,
            language
          }
        }
      });

      if (error) throw error;

      // Save preferences
      localStorage.setItem("vidora_country", country);
      localStorage.setItem("vidora_language", language);

      notify("Account created! Check your email if verification is required.");
      if (data.session) {
        state.user = data.user;
        showApp();
      }
    } else {
      const email = $("loginEmail")?.value.trim();
      const password = $("loginPassword")?.value.trim();

      const { data, error } = await state.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      state.user = data.user;
      showApp();
    }
  } catch (err) {
    console.error(err);
    notify(err.message || "Authentication failed");
  }
}

/* ===================== STORIES ===================== */

function loadStories() {
  const bar = $("storiesBar");
  if (!bar) return;

  // Keep the "Your Story" button
  const addBtn = $("addStoryBtn");
  bar.innerHTML = "";
  if (addBtn) bar.appendChild(addBtn);

  // Add avatars as stories
  AVATARS.forEach(avatar => {
    const item = document.createElement("div");
    item.className = "story-item";
    item.innerHTML = `
      <div class="story-ring">
        <img src="\( {avatar.file}" alt=" \){avatar.name}" onerror="this.src='https://via.placeholder.com/64'">
      </div>
      <span>${avatar.name}</span>
    `;
    item.addEventListener("click", () => {
      notify(`Opening ${avatar.name}'s story...`);
      // Future: open story viewer
    });
    bar.appendChild(item);
  });
}

/* ===================== SPEAKING ASSISTANT ===================== */

function speak(text) {
  if (!window.speechSynthesis) {
    notify("Speech not supported on this device");
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1.05;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

/* ===================== INIT ===================== */

function initSupabase() {
  if (!window.supabase?.createClient) {
    console.warn("Supabase library missing");
    return;
  }

  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("YOUR_REAL")) {
    console.warn("Please set your real Supabase anon key");
    return;
  }

  state.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  state.supabase.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user || null;
    if (state.user) {
      showApp();
    } else {
      showAuth();
    }
  });

  state.supabase.auth.getSession().then(({ data }) => {
    state.user = data?.session?.user || null;
    if (state.user) showApp();
    else showAuth();
  });
}

function bindEvents() {
  // Auth
  $("authForm")?.addEventListener("submit", handleAuth);
  $("showSignup")?.addEventListener("click", () => setAuthMode("signup"));
  $("showLogin")?.addEventListener("click", () => setAuthMode("login"));

  // Signup wizard
  $("signupNext")?.addEventListener("click", () => {
    if (state.currentSignupStep < 4) {
      // Simple validation
      if (state.currentSignupStep === 1) {
        if (!\( ("authDisplayName")?.value.trim() || ! \)("authUsername")?.value.trim()) {
          notify("Please enter your name and username");
          return;
        }
      }
      if (state.currentSignupStep === 2) {
        if (!\( ("authEmail")?.value.trim() || ! \)("authPassword")?.value.trim()) {
          notify("Please enter email and password");
          return;
        }
      }
      state.currentSignupStep++;
      showSignupStep(state.currentSignupStep);
    } else {
      handleAuth(new Event("submit"));
    }
  });

  $("signupBack")?.addEventListener("click", () => {
    if (state.currentSignupStep > 1) {
      state.currentSignupStep--;
      showSignupStep(state.currentSignupStep);
    }
  });

  // Bottom nav
  document.querySelectorAll(".nav-item[data-view]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      // Future: switch views
    });
  });

  // Create button
  $("createBtn")?.addEventListener("click", () => {
    notify("Create post coming soon");
  });

  // Cast
  $("castBtn")?.addEventListener("click", () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
      notify("Cast / Fullscreen mode");
    } else {
      notify("Fullscreen not supported");
    }
  });
}

/* ===================== START ===================== */

function initVidora() {
  bindEvents();
  setAuthMode("login");
  initSupabase();
  loadStories();
}

document.addEventListener("DOMContentLoaded", initVidora);

// Public API
window.Vidora = {
  speak,
  loadStories,
  notify
};
