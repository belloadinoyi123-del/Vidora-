"use strict";

const SUPABASE_URL = "https://htnrqgzxkfktwoioscjr.supabase.co";
 const SUPABASE_ANON_KEY = "sb_publishable_JT5rBfXYSX3-3_zyC2cazQ_YXg_ih_h"; // paste your real key here// ← PUT YOUR REAL KEY HERE

const state = {
  supabase: null,
  user: null,
  currentSignupStep: 1,
  currentSong: null,
  currentFilter: "none"
};

const AVATARS = [
  "skye","neo","nova","luna","blaze","pixel","aria","jett","kai","zara","onyx","rex"
];

const SONGS = [
  { id: 1, title: "Neon Pulse", artist: "Vidora Beats", genre: "Electronic" },
  { id: 2, title: "Night Drill", artist: "Street Sound", genre: "Drill" },
  { id: 3, title: "Funk Wave", artist: "Groove Lab", genre: "Funk" },
  { id: 4, title: "Midnight Run", artist: "Urban Core", genre: "Beats" },
  { id: 5, title: "Echo Remix", artist: "Vidora", genre: "Remix" },
  { id: 6, title: "Motivation Flow", artist: "Rise Up", genre: "Motivational" },
  { id: 7, title: "Green Light", artist: "Future Bass", genre: "Electronic" },
  { id: 8, title: "City Rain", artist: "Lo-fi Dreams", genre: "Chill" }
];

const FILTERS = [
  { name: "Normal", value: "none" },
  { name: "Cinematic", value: "contrast(1.1) saturate(1.2)" },
  { name: "Vintage", value: "sepia(0.35) contrast(0.9)" },
  { name: "Vivid", value: "saturate(1.6) contrast(1.1)" },
  { name: "Cool", value: "hue-rotate(15deg) saturate(1.1)" },
  { name: "Warm", value: "sepia(0.2) saturate(1.3)" },
  { name: "Noir", value: "grayscale(1) contrast(1.2)" },
  { name: "Glow", value: "brightness(1.15) saturate(1.3)" }
];

const $ = id => document.getElementById(id);

function notify(msg) {
  let t = $("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.style.cssText = "position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:12px 20px;border-radius:14px;border:1px solid rgba(0,230,118,0.3);z-index:9999;font-size:14px;display:none;";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(t.timer);
  t.timer = setTimeout(() => t.style.display = "none", 2500);
}

function showAuth() {
  $("authScreen").style.display = "flex";
  $("appShell").classList.remove("active");
}

function showApp() {
  $("authScreen").style.display = "none";
  $("appShell").classList.add("active");
  loadStories();
  loadSongs();
  loadFilters();
}

/* ========== AUTH (Fixed - no more page refresh) ========== */
function setAuthMode(mode) {
  const isSignup = mode === "signup";
  $("loginFields").classList.toggle("hidden", isSignup);
  $("signupWizard").classList.toggle("hidden", !isSignup);
  $("showSignup").classList.toggle("hidden", isSignup);
  $("showLogin").classList.toggle("hidden", !isSignup);
  $("authTitle").textContent = isSignup ? "Create your account" : "Welcome back";
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

  if (step === 4) {
    $("reviewName").textContent = $("authDisplayName").value || "—";
    $("reviewUsername").textContent = $("authUsername").value || "—";
    $("reviewEmail").textContent = $("authEmail").value || "—";
    $("reviewCountry").textContent = $("authCountry").selectedOptions[0]?.text || "—";
  }
}

async function doLogin() {
  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value.trim();

  if (!email || !password) {
    notify("Please enter email and password");
    return;
  }

  if (!state.supabase) {
    notify("Supabase is not ready. Check your anon key in app.js");
    console.error("Supabase client is null");
    return;
  }

  notify("Logging in...");

  try {
    const { data, error } = await state.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    state.user = data.user;
    showApp();
    notify("Welcome back!");
  } catch (err) {
    console.error(err);
    notify(err.message || "Login failed");
  }
}

async function doSignup() {
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value.trim();
  const username = $("authUsername").value.trim();
  const displayName = $("authDisplayName").value.trim();
  const country = $("authCountry").value;
  const language = $("authLanguage").value;

  if (!email || !password || !username) {
    notify("Please fill all required fields");
    return;
  }
  if (!$("authTerms").checked) {
    notify("Please accept the terms");
    return;
  }

  if (!state.supabase) {
    notify("Supabase is not ready. Check your anon key in app.js");
    return;
  }

  notify("Creating account...");

  try {
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

    localStorage.setItem("vidora_country", country);
    localStorage.setItem("vidora_language", language);

    notify("Account created successfully!");
    
    if (data.session) {
      state.user = data.user;
      showApp();
    } else {
      notify("Check your email to verify your account");
    }
  } catch (err) {
    console.error(err);
    notify(err.message || "Signup failed");
  }
}

/* ========== STORIES ========== */
function loadStories() {
  const bar = $("storiesBar");
  const addBtn = $("addStoryBtn");
  bar.innerHTML = "";
  if (addBtn) bar.appendChild(addBtn);

  AVATARS.forEach(name => {
    const item = document.createElement("div");
    item.className = "story-item";
    item.innerHTML = `
      <div class="story-ring">
                <img src="avatars/${name}.png" alt="${name}" onerror="this.src='https://via.placeholder.com/64/111/00e676?text=${name[0]}'">
      </div>
      <span style="font-size:11px;color:#9e9e9e;">${name}</span>
    `;
    item.onclick = () => notify(`Opening ${name}'s story`);
    bar.appendChild(item);
  });
}

/* ========== SONG LIBRARY ========== */
function loadSongs() {
  const list = $("songList");
  list.innerHTML = "";
  SONGS.forEach(song => {
    const el = document.createElement("div");
    el.className = "song-item";
        el.innerHTML = `<div style="font-size:24px;">🎵</div><div><strong>${song.title}</strong><br><small style="color:#9e9e9e;">${song.artist} • ${song.genre}</small></div>`;
    el.onclick = () => {
      state.currentSong = song;
            $("videoSong").textContent = `${song.title} - ${song.artist}`;
      $("songModal").classList.remove("active");
      notify(`Now playing: ${song.title}`);
    };
    list.appendChild(el);
  });
}

/* ========== FILTERS ========== */
function loadFilters() {
  const list = $("filterList");
  list.innerHTML = "";
  FILTERS.forEach(f => {
    const el = document.createElement("div");
    el.className = "filter-item";
    el.innerHTML = `<strong>${f.name}</strong>`;
    el.onclick = () => {
      state.currentFilter = f.value;
      $("mainVideo").style.filter = f.value;
      $("filterModal").classList.remove("active");
      notify(`Filter: ${f.name}`);
    };
    list.appendChild(el);
  });
}

/* ========== SPEAKING AVATAR ========== */
function speak(text) {
  if (!window.speechSynthesis) return notify("Speech not supported");
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1;
  u.pitch = 1.1;
  window.speechSynthesis.speak(u);
}

/* ========== INIT ========== */
function initSupabase() {
  if (!window.supabase) return;
  if (SUPABASE_ANON_KEY.includes("YOUR_REAL")) {
    console.warn("Put your real Supabase anon key in app.js");
    return;
  }
  state.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  state.supabase.auth.getSession().then(({ data }) => {
    if (data?.session) {
      state.user = data.session.user;
      showApp();
    } else {
      showAuth();
    }
  });
}

function bindEvents() {
  // Fixed login - no page refresh
  $("loginBtn").onclick = doLogin;

  $("showSignup").onclick = () => setAuthMode("signup");
  $("showLogin").onclick = () => setAuthMode("login");

  $("signupNext").onclick = () => {
    if (state.currentSignupStep < 4) {
      if (state.currentSignupStep === 1 && (!\( ("authDisplayName").value || ! \)("authUsername").value)) {
        return notify("Enter name and username");
      }
      if (state.currentSignupStep === 2 && (!\( ("authEmail").value || ! \)("authPassword").value)) {
        return notify("Enter email and password");
      }
      state.currentSignupStep++;
      showSignupStep(state.currentSignupStep);
    } else {
      doSignup();
    }
  };

  $("signupBack").onclick = () => {
    if (state.currentSignupStep > 1) {
      state.currentSignupStep--;
      showSignupStep(state.currentSignupStep);
    }
  };

  // Actions
  document.querySelectorAll("[data-action]").forEach(btn => {
    btn.onclick = () => {
      const action = btn.dataset.action;
      if (action === "music") $("songModal").classList.add("active");
      if (action === "filter") $("filterModal").classList.add("active");
      if (action === "like") notify("Liked!");
    };
  });

  $("closeSongModal").onclick = () => $("songModal").classList.remove("active");
  $("closeFilterModal").onclick = () => $("filterModal").classList.remove("active");

  $("castBtn").onclick = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
      notify("Cast / Fullscreen activated");
    }
  };

  $("assistantToggle").onclick = () => {
    $("assistantPanel").classList.toggle("active");
  };

  $("createBtn").onclick = () => notify("Create post coming soon");
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  initSupabase();
  setAuthMode("login");
});

// Public API
window.Vidora = { speak, notify };
