/* =========================================================
   VIDORA – FULL WORKING APP
   Auth, feed, create, filters, music, stories, chat,
   avatars, profile photo, settings, AI assistant
   ========================================================= */

const SUPABASE_URL = "https://htnrqgzxkfktwoioscjr.supabase.co";
const SUPABASE_KEY = "sb_publishable_JT5rBfXYSX3-3_zyC2cazQ_YXg_ih_h";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

function toast(msg) {
  const el = $("toast");
  if (!el) return console.log(msg);
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.add("hidden"), 2800);
}

function esc(str = "") {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function showStatus(el, msg, ok = false) {
  if (!el) return;
  el.textContent = msg || "";
  el.className = "status " + (ok ? "ok" : "err");
}

function formatCount(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n || 0);
}

/* ================= SETTINGS ================= */
const defaultSettings = {
  swipeMode: "sideways",
  notificationSound: true,
  aiMessageNotify: true,
  darkMode: true
};

function loadSettings() {
  try {
    const s = localStorage.getItem("vidora_settings");
    if (s) return { ...defaultSettings, ...JSON.parse(s) };
  } catch (e) {}
  return { ...defaultSettings };
}

function saveSettings() {
  localStorage.setItem("vidora_settings", JSON.stringify(settings));
}

let settings = loadSettings();

function playNotifySound() {
  if (!settings.notificationSound) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.value = 0.08;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    o.stop(ctx.currentTime + 0.25);
  } catch (e) {}
}

/* ================= STATE ================= */
let user = null;
let profile = null;
let currentView = "home";
let currentVideoIndex = 0;
let videoList = [];
let selectedFilter = "none";
let selectedMusic = null;
let selectedAvatar = null;
let chatUser = null;
let createFile = null;
let createPreviewUrl = null;
let storyFile = null;
let userPosts = [];

try {
  userPosts = JSON.parse(localStorage.getItem("vidora_user_posts") || "[]");
} catch (e) { userPosts = []; }

/* ================= FILTERS (Snapchat / CapCut style color effects) ================= */
const FILTERS = [
  { id: "none", name: "Original", css: "none" },
  { id: "vivid", name: "Vivid", css: "saturate(1.7) contrast(1.12)" },
  { id: "warm", name: "Warm", css: "sepia(.28) saturate(1.35) brightness(1.05)" },
  { id: "cool", name: "Cool", css: "hue-rotate(18deg) saturate(1.25) brightness(1.02)" },
  { id: "noir", name: "Noir", css: "grayscale(1) contrast(1.25)" },
  { id: "vintage", name: "Vintage", css: "sepia(.5) contrast(1.1) brightness(.95)" },
  { id: "neon", name: "Neon", css: "saturate(2) contrast(1.2) hue-rotate(295deg)" },
  { id: "beauty", name: "Beauty", css: "brightness(1.14) contrast(1.04) saturate(1.12)" },
  { id: "cinema", name: "Cinema", css: "contrast(1.28) saturate(.88) brightness(.94)" },
  { id: "glow", name: "Glow", css: "brightness(1.18) contrast(1.05) saturate(1.3)" },
  { id: "moody", name: "Moody", css: "contrast(1.4) brightness(.88) saturate(.8)" },
  { id: "golden", name: "Golden", css: "sepia(.4) saturate(1.4) brightness(1.08)" },
  { id: "soft", name: "Soft", css: "brightness(1.1) contrast(.92) saturate(1.08)" },
  { id: "sharp", name: "Sharp", css: "contrast(1.55) saturate(1.1)" },
  { id: "pastel", name: "Pastel", css: "saturate(.75) brightness(1.12) contrast(.95)" },
  { id: "sunset", name: "Sunset", css: "sepia(.35) saturate(1.5) hue-rotate(-10deg)" },
  { id: "ocean", name: "Ocean", css: "hue-rotate(175deg) saturate(1.25) brightness(1.05)" },
  { id: "rose", name: "Rose", css: "sepia(.2) hue-rotate(310deg) saturate(1.35)" },
  { id: "film", name: "Film", css: "sepia(.22) contrast(1.15) saturate(.85)" },
  { id: "dream", name: "Dream", css: "brightness(1.12) saturate(1.2) contrast(.92)" },
  { id: "electric", name: "Electric", css: "saturate(2.1) contrast(1.18) hue-rotate(25deg)" },
  { id: "arctic", name: "Arctic", css: "hue-rotate(190deg) brightness(1.12) saturate(.85)" },
  { id: "candy", name: "Candy", css: "saturate(1.85) brightness(1.1) contrast(1.05)" },
  { id: "midnight", name: "Midnight", css: "brightness(.78) contrast(1.35) saturate(1.15)" }
];

function getFilterCss(id) {
  return FILTERS.find(f => f.id === id)?.css || "none";
}

/* ================= MUSIC ================= */
const MUSIC = {
  Beats: [
    { id: "b1", title: "Night Pulse", artist: "Vidora Beatz" },
    { id: "b2", title: "Chrome Drive", artist: "Vidora Beatz" },
    { id: "b3", title: "Low Rider", artist: "Vidora Beatz" },
    { id: "b4", title: "Bass Hit", artist: "Vidora Beatz" }
  ],
  Funk: [
    { id: "f1", title: "Groovy Lane", artist: "Vidora Funk" },
    { id: "f2", title: "Bass Pocket", artist: "Vidora Funk" },
    { id: "f3", title: "Electric Soul", artist: "Vidora Funk" }
  ],
  Drills: [
    { id: "d1", title: "UK Slide", artist: "Vidora Drills" },
    { id: "d2", title: "Dark Lane", artist: "Vidora Drills" },
    { id: "d3", title: "Cold Blocks", artist: "Vidora Drills" }
  ],
  Popular: [
    { id: "p1", title: "Summer Hits", artist: "Charts" },
    { id: "p2", title: "Viral Dance", artist: "Trending" },
    { id: "p3", title: "Night Vibes", artist: "Charts" }
  ]
};

const AVATARS = [
  "Nova","Kai","Luna","Ivy","Orion","Zeno","Sage","Rex","Pixel","Vexa",
  "Aero","Mika","Juno","Kairo","Nia","Zara","Axel","Riven","Sora","Nyx",
  "Aria","Dax","Milo","Zuri","Kira","Echo","Tari","Vio","Onyx","Cleo",
  "Abdulhamid"
];

/* ================= AUTH ================= */
function populateBirthdaySelects() {
  const daySel = $("signupDay");
  const yearSel = $("signupYear");
  if (!daySel || !yearSel) return;
  if (daySel.options.length > 1) return;
  for (let d = 1; d <= 31; d++) {
    const o = document.createElement("option");
    o.value = d; o.textContent = d;
    daySel.appendChild(o);
  }
  const cy = new Date().getFullYear();
  for (let y = cy - 13; y >= 1920; y--) {
    const o = document.createElement("option");
    o.value = y; o.textContent = y;
    yearSel.appendChild(o);
  }
}

function showLogin() {
  $("loginForm")?.classList.remove("hidden");
  $("signupForm")?.classList.add("hidden");
  showStatus($("authStatus"), "");
}

function showSignup() {
  $("loginForm")?.classList.add("hidden");
  $("signupForm")?.classList.remove("hidden");
  showStatus($("authStatus"), "");
}

async function handleLogin(e) {
  e.preventDefault();
  const email = $("loginEmail")?.value.trim();
  const password = $("loginPassword")?.value;
  if (!email || !password) return showStatus($("authStatus"), "Enter email and password.");
  $("loginBtn").disabled = true;
  $("loginBtn").textContent = "Logging in...";
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await enterApp(data.user);
  } catch (err) {
    showStatus($("authStatus"), err.message || "Login failed.");
  } finally {
    $("loginBtn").disabled = false;
    $("loginBtn").textContent = "Log In";
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const firstName = $("signupFirstName")?.value.trim();
  const lastName = $("signupLastName")?.value.trim();
  const email = $("signupEmail")?.value.trim();
  const password = $("signupPassword")?.value;
  const day = $("signupDay")?.value;
  const month = $("signupMonth")?.value;
  const year = $("signupYear")?.value;
  const gender = document.querySelector('input[name="gender"]:checked')?.value;

  if (!firstName || !lastName || !email || !password || !day || !month || !year || !gender) {
    return showStatus($("authStatus"), "Please fill in all fields.");
  }
  if (password.length < 6) return showStatus($("authStatus"), "Password must be at least 6 characters.");

  const displayName = `${firstName} ${lastName}`;
  const username = (firstName + lastName).toLowerCase().replace(/[^a-z0-9]/g, "") + Math.floor(Math.random() * 900 + 100);
  const birthday = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

  $("signupBtn").disabled = true;
  $("signupBtn").textContent = "Signing up...";
  try {
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { display_name: displayName, username, first_name: firstName, last_name: lastName, birthday, gender } }
    });
    if (error) throw error;
    if (data.user) {
      try {
        await sb.from("profiles").upsert({
          id: data.user.id, display_name: displayName, username,
          first_name: firstName, last_name: lastName, birthday, gender,
          avatar_url: null, created_at: new Date().toISOString()
        });
      } catch (e) {}
      showStatus($("authStatus"), "Account created! You can log in now.", true);
      setTimeout(showLogin, 1800);
    }
  } catch (err) {
    showStatus($("authStatus"), err.message || "Sign up failed.");
  } finally {
    $("signupBtn").disabled = false;
    $("signupBtn").textContent = "Sign Up";
  }
}

/* ================= ENTER APP ================= */
async function enterApp(authUser) {
  user = authUser;
  $("authScreen")?.classList.add("hidden");
  $("app")?.classList.remove("hidden");
  $("assistantFab")?.classList.remove("hidden");

  if (!settings.darkMode) document.body.classList.add("light-mode");
  else document.body.classList.remove("light-mode");

  try {
    const { data } = await sb.from("profiles").select("*").eq("id", user.id).single();
    profile = data;
  } catch (e) {
    profile = {
      display_name: user.user_metadata?.display_name || user.email,
      username: user.user_metadata?.username || "user",
      avatar_url: localStorage.getItem("vidora_avatar_" + user.id) || null
    };
  }

  // Restore local avatar
  const localAv = localStorage.getItem("vidora_avatar_" + user.id);
  if (localAv && profile) profile.avatar_url = localAv;

  $$(".nav-btn").forEach(btn => {
    btn.onclick = () => switchView(btn.dataset.view);
  });

  $("assistantFab").onclick = openAssistant;
  $("closeAssistant").onclick = closeAssistant;
  $("assistantForm").onsubmit = handleAssistant;
  $$(".quick-btn").forEach(btn => {
    btn.onclick = () => handleQuickAction(btn.dataset.action);
  });

  switchView("home");
}

/* ================= NAV ================= */
function switchView(view) {
  currentView = view;
  $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  const main = $("main");
  if (!main) return;

  if (view === "home") renderHome();
  else if (view === "discover") renderDiscover();
  else if (view === "create") renderCreate();
  else if (view === "inbox") renderInbox();
  else if (view === "profile") renderProfile();
  else if (view === "settings") renderSettings();
}

/* ================= HOME ================= */
function renderHome() {
  const mode = settings.swipeMode || "sideways";
  const main = $("main");
  main.innerHTML = `
    <div class="home-wrap">
      <div class="stories-bar" id="storiesBar">
        <button class="story-item your-story" onclick="openCreateStory()">
          <div class="story-ring add"><span>+</span></div>
          <small>Your Story</small>
        </button>
        ${["Sofia","Arjun","Maya","Abdulhamid","Noah","Luna"].map(n => `
          <button class="story-item" onclick="openStory('${n}')">
            <div class="story-ring"><div class="story-avatar">${n[0]}</div></div>
            <small>${n}</small>
          </button>
        `).join("")}
      </div>
      <div class="video-feed mode-${mode}" id="videoFeed">
        <div class="video-track" id="videoTrack"></div>
      </div>
    </div>
  `;

  const demo = [
    { id:1, url:"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", user:"Sofia", avatar:"S", likes:24, comments:5, shares:2, views:0, music:"Night Pulse", caption:"Feeling the vibe", isOwner:false },
    { id:2, url:"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", user:"Arjun", avatar:"A", likes:18, comments:3, shares:1, views:0, music:"Chrome Drive", caption:"New drop", isOwner:false },
    { id:3, url:"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", user:"Maya", avatar:"M", likes:31, comments:7, shares:4, views:0, music:"Electric Soul", caption:"Dance challenge", isOwner:false },
    { id:4, url:"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4", user:"Abdulhamid", avatar:"A", likes:12, comments:2, shares:1, views:0, music:"UK Slide", caption:"Welcome to Vidora", isOwner:false }
  ];

  const own = userPosts.map((p, i) => ({
    id: 1000 + i,
    url: p.url,
    user: profile?.display_name?.split(" ")[0] || "You",
    avatar: (profile?.display_name || "Y")[0],
    likes: p.likes || 0,
    comments: p.comments || 0,
    shares: 0,
    views: p.views || 0,
    music: p.music || "Original",
    caption: p.caption || "",
    isOwner: true,
    filter: p.filter || "none"
  }));

  videoList = [...own, ...demo];

  const track = $("videoTrack");
  track.className = "video-track mode-" + mode;
  track.innerHTML = videoList.map((v, i) => `
    <div class="video-slide" data-index="${i}">
      ${v.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || v.url.startsWith("data:image")
        ? `<img src="${v.url}" style="width:100%;height:100%;object-fit:cover;filter:${getFilterCss(v.filter||'none')}" />`
        : `<video src="${v.url}" loop muted playsinline style="filter:${getFilterCss(v.filter||'none')}"></video>`
      }
      <div class="side-actions">
        <button class="action-btn" onclick="toast('Following @${esc(v.user)}')">
          <div class="icon avatar-sm">${v.avatar}</div>
          <span class="count">+</span>
        </button>
        <button class="action-btn like-btn" onclick="toggleLike(this, ${v.likes})">
          <div class="icon">♡</div>
          <span class="count">${formatCount(v.likes)}</span>
        </button>
        <button class="action-btn" onclick="openComments(${v.id})">
          <div class="icon">💬</div>
          <span class="count">${formatCount(v.comments)}</span>
        </button>
        <button class="action-btn" onclick="toast('Shared')">
          <div class="icon">↗</div>
          <span class="count">${formatCount(v.shares)}</span>
        </button>
        ${v.isOwner ? `<button class="action-btn" onclick="deletePost(${v.id})"><div class="icon">🗑️</div></button>` : ""}
        <button class="music-btn" title="${esc(v.music)}" onclick="toast('${esc(v.music)}')">🎵</button>
      </div>
      <div class="video-info">
        <div class="user-row">@${esc(v.user)}</div>
        <div class="caption">${esc(v.caption)}</div>
        ${v.isOwner && v.views > 0 ? `<div class="views-owner">👁 ${formatCount(v.views)} views</div>` : ""}
      </div>
      <div class="vidora-watermark"><div class="v-logo">V</div><span>Vidora</span></div>
    </div>
  `).join("");

  currentVideoIndex = 0;
  updateVideoPosition();
  playCurrentVideo();
  setupSwipe();
}

function updateVideoPosition() {
  const track = $("videoTrack");
  if (!track) return;
  const mode = settings.swipeMode || "sideways";
  if (mode === "upward") {
    track.style.transform = `translateY(-${currentVideoIndex * 100}%)`;
  } else if (mode === "rotational") {
    track.style.transform = `translateX(-${currentVideoIndex * 100}%) rotate(${currentVideoIndex * 2}deg)`;
  } else {
    track.style.transform = `translateX(-${currentVideoIndex * 100}%)`;
  }
}

function playCurrentVideo() {
  $$(".video-slide video").forEach((vid, i) => {
    if (i === currentVideoIndex) {
      vid.muted = false;
      vid.play().catch(() => {});
    } else {
      vid.pause();
      try { vid.currentTime = 0; } catch (e) {}
    }
  });
}

function goToVideo(index) {
  if (index < 0 || index >= videoList.length) return;
  currentVideoIndex = index;
  updateVideoPosition();
  playCurrentVideo();
}

function setupSwipe() {
  const feed = $("videoFeed");
  if (!feed) return;
  let startX = 0, startY = 0, dragging = false;
  const mode = settings.swipeMode || "sideways";

  feed.ontouchstart = (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    dragging = true;
  };
  feed.ontouchend = (e) => {
    if (!dragging) return;
    dragging = false;
    const dx = startX - e.changedTouches[0].clientX;
    const dy = startY - e.changedTouches[0].clientY;
    if (mode === "upward") {
      if (Math.abs(dy) > 50) {
        if (dy > 0) goToVideo(currentVideoIndex + 1);
        else goToVideo(currentVideoIndex - 1);
      }
    } else {
      if (Math.abs(dx) > 50) {
        if (dx > 0) goToVideo(currentVideoIndex + 1);
        else goToVideo(currentVideoIndex - 1);
      }
    }
  };

  let mouseDown = false;
  feed.onmousedown = (e) => { startX = e.clientX; startY = e.clientY; mouseDown = true; };
  feed.onmouseup = (e) => {
    if (!mouseDown) return;
    mouseDown = false;
    const dx = startX - e.clientX;
    const dy = startY - e.clientY;
    if (mode === "upward") {
      if (Math.abs(dy) > 50) {
        if (dy > 0) goToVideo(currentVideoIndex + 1);
        else goToVideo(currentVideoIndex - 1);
      }
    } else {
      if (Math.abs(dx) > 50) {
        if (dx > 0) goToVideo(currentVideoIndex + 1);
        else goToVideo(currentVideoIndex - 1);
      }
    }
  };
}

function toggleLike(btn, base) {
  btn.classList.toggle("liked");
  const icon = btn.querySelector(".icon");
  const count = btn.querySelector(".count");
  if (btn.classList.contains("liked")) {
    icon.textContent = "♥";
    count.textContent = formatCount(base + 1);
    toast("Liked");
  } else {
    icon.textContent = "♡";
    count.textContent = formatCount(base);
  }
}

function deletePost(id) {
  if (!confirm("Delete this post?")) return;
  if (id >= 1000) {
    const idx = id - 1000;
    userPosts.splice(idx, 1);
    localStorage.setItem("vidora_user_posts", JSON.stringify(userPosts));
  }
  videoList = videoList.filter(v => v.id !== id);
  toast("Post deleted");
  renderHome();
}

function openComments(postId) {
  openSheet(`
    <div class="sheet-header">
      <h3>Comments</h3>
      <button class="icon-btn" onclick="closeSheet()">×</button>
    </div>
    <div class="comments-list" id="commentsList">
      <div class="comment"><strong>Sofia</strong> Amazing! <button class="del-btn" onclick="this.parentElement.remove();toast('Comment deleted')">Delete</button></div>
      <div class="comment"><strong>Abdulhamid</strong> Fire 👏</div>
      <div class="comment"><strong>You</strong> Thanks <button class="del-btn" onclick="this.parentElement.remove();toast('Comment deleted')">Delete</button></div>
    </div>
    <form class="comment-form" onsubmit="addComment(event)">
      <input class="field" id="commentInput" placeholder="Add a comment..." maxlength="300" />
      <button type="submit" class="btn primary">Post</button>
    </form>
  `);
}

function addComment(e) {
  e.preventDefault();
  const input = $("commentInput");
  const text = input?.value.trim();
  if (!text) return;
  const list = $("commentsList");
  const div = document.createElement("div");
  div.className = "comment";
  div.innerHTML = `<strong>You</strong> ${esc(text)} <button class="del-btn" onclick="this.parentElement.remove();toast('Comment deleted')">Delete</button>`;
  list.appendChild(div);
  input.value = "";
  toast("Comment added");
}

/* ================= STORIES ================= */
function openCreateStory() {
  openSheet(`
    <div class="sheet-header"><h3>Add Story</h3><button class="icon-btn" onclick="closeSheet()">×</button></div>
    <p class="muted small">Stories disappear after 24 hours</p>
    <input type="file" id="storyFileInput" accept="image/*,video/*" style="display:none" onchange="onStoryFile(event)" />
    <button class="btn primary full" style="margin:12px 0" onclick="document.getElementById('storyFileInput').click()">📷 Take or choose photo / video</button>
    <div id="storyPreview" style="margin:12px 0;text-align:center"></div>
    <button class="btn secondary full" id="storyPublishBtn" style="display:none" onclick="publishStory()">Share to Story</button>
  `);
}

function onStoryFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  storyFile = file;
  const url = URL.createObjectURL(file);
  const prev = $("storyPreview");
  if (file.type.startsWith("video/")) {
    prev.innerHTML = `<video src="${url}" controls style="max-width:100%;max-height:280px;border-radius:12px"></video>`;
  } else {
    prev.innerHTML = `<img src="${url}" style="max-width:100%;max-height:280px;border-radius:12px" />`;
  }
  $("storyPublishBtn").style.display = "block";
}

function publishStory() {
  toast("Story shared");
  closeSheet();
  if (settings.notificationSound) playNotifySound();
}

function openStory(name) {
  openSheet(`
    <div class="story-viewer">
      <div class="story-progress"><div class="bar" style="width:60%"></div></div>
      <div class="story-user">@${esc(name)}</div>
      <div class="story-content">
        <div style="font-size:48px;margin:30px 0">🌟</div>
        <p>${esc(name)}'s story</p>
      </div>
      <button class="btn secondary" onclick="closeSheet()">Close</button>
      ${name === "You" ? `<button class="btn danger" style="margin-top:8px" onclick="toast('Story deleted');closeSheet()">Delete my story</button>` : ""}
    </div>
  `);
}

/* ================= CREATE ================= */
function renderCreate() {
  selectedFilter = "none";
  selectedMusic = null;
  createFile = null;
  createPreviewUrl = null;

  $("main").innerHTML = `
    <div class="create-screen">
      <div class="create-header">
        <button onclick="switchView('home')" class="icon-btn">←</button>
        <h2>Create</h2>
        <button class="btn primary sm" onclick="publishPost()">Post</button>
      </div>

      <div class="create-preview" id="createPreview" onclick="document.getElementById('createFileInput').click()">
        <div class="preview-placeholder" id="previewPlaceholder">
          <span style="font-size:48px">📷</span>
          <p>Tap to add photo or video</p>
        </div>
      </div>
      <input type="file" id="createFileInput" accept="image/*,video/*" style="display:none" onchange="onCreateFile(event)" />

      <div class="create-actions">
        <button class="btn secondary" onclick="document.getElementById('createFileInput').click()">Gallery</button>
        <button class="btn secondary" onclick="document.getElementById('createFileInput').click()">Record</button>
      </div>

      <div class="section">
        <h4>Filters</h4>
        <div class="filter-scroll" id="filterScroll">
          ${FILTERS.map(f => `
            <button class="filter-chip ${f.id==='none'?'active':''}" data-id="${f.id}" onclick="selectFilter('${f.id}')">
              <div class="filter-preview" style="filter:${f.css}"></div>
              <span>${f.name}</span>
            </button>
          `).join("")}
        </div>
      </div>

      <div class="section">
        <h4>Music</h4>
        <div class="music-tabs">
          ${Object.keys(MUSIC).map(cat => `<button class="music-tab ${cat==='Beats'?'active':''}" onclick="showMusicCat('${cat}')">${cat}</button>`).join("")}
        </div>
        <div class="music-list" id="musicList"></div>
      </div>

      <div class="section">
        <input class="field" id="captionInput" placeholder="Write a caption..." maxlength="2200" />
      </div>
    </div>
  `;
  showMusicCat("Beats");
}

function onCreateFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  createFile = file;
  if (createPreviewUrl) URL.revokeObjectURL(createPreviewUrl);
  createPreviewUrl = URL.createObjectURL(file);
  const box = $("createPreview");
  const filter = getFilterCss(selectedFilter);
  if (file.type.startsWith("video/")) {
    box.innerHTML = `<video src="${createPreviewUrl}" controls style="width:100%;height:100%;object-fit:cover;filter:${filter}" id="createMedia"></video>`;
  } else {
    box.innerHTML = `<img src="${createPreviewUrl}" style="width:100%;height:100%;object-fit:cover;filter:${filter}" id="createMedia" />`;
  }
}

function selectFilter(id) {
  selectedFilter = id;
  $$(".filter-chip").forEach(c => c.classList.toggle("active", c.dataset.id === id));
  const media = $("createMedia");
  if (media) media.style.filter = getFilterCss(id);
  toast(FILTERS.find(f => f.id === id)?.name || "Original");
}

function showMusicCat(cat) {
  $$(".music-tab").forEach(t => t.classList.toggle("active", t.textContent === cat));
  const list = $("musicList");
  if (!list) return;
  list.innerHTML = MUSIC[cat].map(m => `
    <button class="music-item ${selectedMusic?.id===m.id?'active':''}" onclick="selectMusic('${m.id}','${esc(m.title)}','${esc(m.artist)}')">
      <span class="music-icon">🎵</span>
      <div><strong>${esc(m.title)}</strong><br><small class="muted">${esc(m.artist)}</small></div>
    </button>
  `).join("");
}

function selectMusic(id, title, artist) {
  selectedMusic = { id, title, artist };
  toast(title);
  const activeTab = document.querySelector(".music-tab.active");
  if (activeTab) showMusicCat(activeTab.textContent);
}

function publishPost() {
  if (!createFile && !createPreviewUrl) {
    toast("Add a photo or video first");
    return;
  }
  const caption = $("captionInput")?.value.trim() || "";
  const post = {
    url: createPreviewUrl,
    caption,
    music: selectedMusic ? selectedMusic.title : "Original",
    filter: selectedFilter,
    likes: 0,
    comments: 0,
    views: 0,
    created: Date.now()
  };
  userPosts.unshift(post);
  localStorage.setItem("vidora_user_posts", JSON.stringify(userPosts));
  toast("Posted!");
  if (settings.notificationSound) playNotifySound();
  switchView("home");
}

/* ================= DISCOVER ================= */
function renderDiscover() {
  $("main").innerHTML = `
    <div style="padding:16px">
      <input class="field" placeholder="Search users, sounds, hashtags..." id="searchInput" />
      <h3 style="margin:20px 0 12px">Trending</h3>
      <div class="trending-grid">
        ${["#VidoraDance","#NightVibes","#NewMusic","#StoryTime","#AvatarDrop","#Create"].map(t => `
          <button class="trend-chip" onclick="toast('${t}')">${t}</button>
        `).join("")}
      </div>
      <h3 style="margin:24px 0 12px">Suggested</h3>
      ${["Abdulhamid","Kai","Luna","Rex","Nova","Pixel"].map(n => `
        <div class="user-row-card">
          <div class="avatar-circle">${n[0]}</div>
          <div><strong>${n}</strong><br><small class="muted">@${n.toLowerCase()}</small></div>
          <button class="btn primary sm" onclick="toast('Following ${n}')">Follow</button>
        </div>
      `).join("")}
    </div>
  `;
}

/* ================= INBOX ================= */
function renderInbox() {
  $("main").innerHTML = `
    <div class="inbox-screen">
      <div class="inbox-header">
        <h2>Inbox</h2>
        <button class="icon-btn" onclick="toast('New chat')">✎</button>
      </div>
      <div class="chat-list">
        ${[
          {name:"Abdulhamid", last:"Welcome to Vidora!", time:"1m", unread:1},
          {name:"Sofia", last:"Did you see the video?", time:"2m", unread:2},
          {name:"Arjun", last:"Loved your edit", time:"1h", unread:0},
          {name:"Maya", last:"Let's collab!", time:"3h", unread:1}
        ].map(c => `
          <button class="chat-row" onclick="openChat('${c.name}')">
            <div class="avatar-circle">${c.name[0]}</div>
            <div class="chat-meta">
              <div class="chat-top"><strong>${c.name}</strong><span class="muted small">${c.time}</span></div>
              <div class="chat-preview">${esc(c.last)}</div>
            </div>
            ${c.unread ? `<span class="unread-badge">${c.unread}</span>` : ""}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function openChat(name) {
  chatUser = name;
  openSheet(`
    <div class="chat-view">
      <div class="sheet-header">
        <button onclick="closeSheet()">←</button>
        <strong>${esc(name)}</strong>
        <button class="icon-btn" onclick="toast('Options')">⋯</button>
      </div>
      <div class="chat-bubbles" id="chatBubbles">
        <div class="bubble them">Hey! How are you?</div>
        <div class="bubble me">Good, just posted something new</div>
        <div class="bubble them">Nice, I'll check it out</div>
      </div>
      <form class="chat-input-row" onsubmit="sendMessage(event)">
        <input class="field" id="msgInput" placeholder="Message..." autocomplete="off" />
        <button type="submit" class="btn primary">Send</button>
      </form>
      <button class="btn danger sm" style="margin-top:8px" onclick="deleteLastMessage()">Delete last message</button>
    </div>
  `);
}

function sendMessage(e) {
  e.preventDefault();
  const input = $("msgInput");
  const text = input?.value.trim();
  if (!text) return;
  const box = $("chatBubbles");
  const div = document.createElement("div");
  div.className = "bubble me";
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  input.value = "";
  if (settings.aiMessageNotify) {
    setTimeout(() => {
      if (settings.notificationSound) playNotifySound();
      addAssistantMsg("New reply from " + (chatUser || "someone"));
    }, 2000);
  }
}

function deleteLastMessage() {
  const box = $("chatBubbles");
  const mine = box?.querySelectorAll(".bubble.me");
  if (mine?.length) {
    mine[mine.length - 1].remove();
    toast("Message deleted");
  }
}

/* ================= PROFILE ================= */
function renderProfile() {
  const name = profile?.display_name || user?.email || "User";
  const uname = profile?.username || "user";
  const av = profile?.avatar_url;

  $("main").innerHTML = `
    <div class="profile-screen">
      <div class="profile-header">
        <div class="avatar-large" id="profileAvatar" onclick="document.getElementById('profilePhotoInput').click()">
          ${av ? `<img src="${av}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />` : (name[0]||"U").toUpperCase()}
        </div>
        <input type="file" id="profilePhotoInput" accept="image/*" style="display:none" onchange="onProfilePhoto(event)" />
        <h2>${esc(name)}</h2>
        <p class="muted">@${esc(uname)}</p>
        <div class="profile-stats">
          <div><strong>${userPosts.length}</strong><br><span class="muted">Posts</span></div>
          <div><strong>0</strong><br><span class="muted">Followers</span></div>
          <div><strong>0</strong><br><span class="muted">Following</span></div>
        </div>
        <button class="btn secondary" onclick="openAvatarCreator()">Edit Avatar</button>
        <button class="btn secondary" style="margin-top:8px" onclick="switchView('settings')">⚙️ Settings</button>
      </div>
      <div class="profile-tabs">
        <button class="active">Posts</button>
        <button>Liked</button>
      </div>
      <div class="posts-grid">
        ${userPosts.length ? userPosts.map((p,i) => `
          <div class="grid-item" onclick="toast('Open post')">
            ${p.url && (p.url.match(/image|data:image/) || p.url.match(/\.(jpg|png|webp)/i))
              ? `<img src="${p.url}" style="width:100%;height:100%;object-fit:cover" />`
              : "▶"}
          </div>
        `).join("") : `<div class="grid-item" style="grid-column:1/-1;aspect-ratio:auto;padding:30px;color:var(--muted)">No posts yet</div>`}
      </div>
    </div>
  `;
}

function onProfilePhoto(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  if (profile) profile.avatar_url = url;
  if (user) localStorage.setItem("vidora_avatar_" + user.id, url);
  const el = $("profileAvatar");
  if (el) el.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`;
  toast("Profile photo updated");

  // Try upload to Supabase if possible
  uploadProfilePhoto(file).catch(() => {});
}

async function uploadProfilePhoto(file) {
  if (!user) return;
  try {
    const path = `avatars/${user.id}/${Date.now()}.jpg`;
    const { error } = await sb.storage.from("media").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = sb.storage.from("media").getPublicUrl(path);
    if (data?.publicUrl) {
      profile.avatar_url = data.publicUrl;
      localStorage.setItem("vidora_avatar_" + user.id, data.publicUrl);
      await sb.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
    }
  } catch (e) {
    console.warn("Avatar upload:", e);
  }
}

function openAvatarCreator() {
  openSheet(`
    <div class="sheet-header"><h3>Choose Avatar</h3><button class="icon-btn" onclick="closeSheet()">×</button></div>
    <div class="avatar-preview-large" id="avatarPreview">${selectedAvatar ? selectedAvatar[0] : "👤"}</div>
    <div class="avatar-categories">
      <button class="active">All</button>
      <button>Face</button>
      <button>Style</button>
      <button>Costume</button>
    </div>
    <div class="avatar-grid">
      ${AVATARS.map(a => `
        <button class="avatar-choice" onclick="selectAvatar('${a}')">
          <div class="avatar-circle">${a[0]}</div>
          <span>${a}</span>
        </button>
      `).join("")}
    </div>
    <button class="btn primary full" style="margin-top:14px" onclick="saveAvatar()">Save Avatar</button>
  `);
}

function selectAvatar(name) {
  selectedAvatar = name;
  const prev = $("avatarPreview");
  if (prev) prev.textContent = name[0];
  toast(name);
}

function saveAvatar() {
  if (selectedAvatar && profile) {
    const letter = selectedAvatar[0];
    // Use letter avatar as data
    localStorage.setItem("vidora_avatar_name_" + (user?.id || ""), selectedAvatar);
    toast("Avatar saved: " + selectedAvatar);
  }
  closeSheet();
  if (currentView === "profile") renderProfile();
}

/* ================= SETTINGS ================= */
function renderSettings() {
  $("main").innerHTML = `
    <div style="padding:16px 16px 80px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <button onclick="switchView('profile')" class="icon-btn">←</button>
        <h2 style="margin:0">Settings</h2>
      </div>

      <div class="card" style="margin-bottom:14px;padding:0;overflow:hidden">
        <div style="padding:14px 16px;border-bottom:1px solid var(--border)"><strong>Video</strong></div>
        <label class="setting-row">
          <span>Sideways swipe</span>
          <input type="radio" name="swipeMode" value="sideways" ${settings.swipeMode==='sideways'?'checked':''} onchange="setSwipeMode('sideways')" />
        </label>
        <label class="setting-row">
          <span>Upward swipe</span>
          <input type="radio" name="swipeMode" value="upward" ${settings.swipeMode==='upward'?'checked':''} onchange="setSwipeMode('upward')" />
        </label>
        <label class="setting-row">
          <span>Rotational movement</span>
          <input type="radio" name="swipeMode" value="rotational" ${settings.swipeMode==='rotational'?'checked':''} onchange="setSwipeMode('rotational')" />
        </label>
      </div>

      <div class="card" style="margin-bottom:14px;padding:0;overflow:hidden">
        <div style="padding:14px 16px;border-bottom:1px solid var(--border)"><strong>Notifications</strong></div>
        <label class="setting-row">
          <span>Notification sound</span>
          <input type="checkbox" ${settings.notificationSound?'checked':''} onchange="toggleNotifSound(this.checked)" />
        </label>
        <label class="setting-row">
          <span>Message alerts from Vidora AI</span>
          <input type="checkbox" ${settings.aiMessageNotify?'checked':''} onchange="toggleAiNotify(this.checked)" />
        </label>
      </div>

      <div class="card" style="margin-bottom:14px;padding:0;overflow:hidden">
        <div style="padding:14px 16px;border-bottom:1px solid var(--border)"><strong>Appearance</strong></div>
        <label class="setting-row">
          <span>Dark mode</span>
          <input type="checkbox" ${settings.darkMode?'checked':''} onchange="toggleDarkMode(this.checked)" />
        </label>
      </div>

      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:14px 16px;border-bottom:1px solid var(--border)"><strong>Account</strong></div>
        <button class="setting-row" style="width:100%;text-align:left;background:none;border:none;color:var(--text)" onclick="handleSignOut()">
          <span>Sign out</span>
        </button>
      </div>
    </div>
  `;
}

function setSwipeMode(mode) {
  settings.swipeMode = mode;
  saveSettings();
  toast("Swipe: " + mode);
}

function toggleNotifSound(on) {
  settings.notificationSound = on;
  saveSettings();
  toast(on ? "Sound on" : "Sound off");
  if (on) playNotifySound();
}

function toggleAiNotify(on) {
  settings.aiMessageNotify = on;
  saveSettings();
  toast(on ? "AI alerts on" : "AI alerts off");
}

function toggleDarkMode(on) {
  settings.darkMode = on;
  saveSettings();
  if (on) document.body.classList.remove("light-mode");
  else document.body.classList.add("light-mode");
  toast(on ? "Dark mode" : "Light mode");
}

/* ================= MODAL ================= */
function openSheet(html) {
  $("sheet").innerHTML = html;
  $("modal").classList.remove("hidden");
}
function closeSheet() {
  $("modal").classList.add("hidden");
  $("sheet").innerHTML = "";
}
document.addEventListener("click", (e) => {
  if (e.target?.id === "modal") closeSheet();
});

/* ================= AI ASSISTANT ================= */
function openAssistant() {
  $("assistantBox")?.classList.remove("hidden");
  if ($("assistantMessages") && !$("assistantMessages").children.length) {
    addAssistantMsg("Hi! I can help with theme, messages, sign out, swipe mode, sound, and more. Ask me anything.");
  }
}
function closeAssistant() {
  $("assistantBox")?.classList.add("hidden");
}
function addAssistantMsg(text, isUser = false) {
  const box = $("assistantMessages");
  if (!box) return;
  const div = document.createElement("div");
  div.style.cssText = `align-self:${isUser?"flex-end":"flex-start"};max-width:85%;padding:10px 14px;border-radius:16px;background:${isUser?"linear-gradient(135deg,var(--purple),var(--pink))":"var(--surface2)"};font-size:14px;white-space:pre-wrap;`;
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function handleAssistant(e) {
  e.preventDefault();
  const input = $("assistantInput");
  const text = input?.value.trim();
  if (!text) return;
  addAssistantMsg(text, true);
  input.value = "";
  const low = text.toLowerCase();

  setTimeout(() => {
    if (low.includes("theme") || low.includes("dark") || low.includes("light")) {
      document.body.classList.toggle("light-mode");
      settings.darkMode = !document.body.classList.contains("light-mode");
      saveSettings();
      addAssistantMsg("Theme updated.");
      return;
    }
    if (low.includes("sign out") || low.includes("logout") || low.includes("log out")) {
      addAssistantMsg("Signing you out...");
      setTimeout(handleSignOut, 700);
      return;
    }
    if (low.includes("message") || low.includes("inbox") || low.includes("notify")) {
      addAssistantMsg("Check your Inbox for messages. I can alert you when new ones arrive — turn that on in Settings.");
      return;
    }
    if (low.includes("sound")) {
      if (low.includes("off") || low.includes("mute") || low.includes("disable")) {
        settings.notificationSound = false;
        saveSettings();
        addAssistantMsg("Notification sound is off.");
      } else {
        settings.notificationSound = true;
        saveSettings();
        playNotifySound();
        addAssistantMsg("Notification sound is on.");
      }
      return;
    }
    if (low.includes("swipe") || low.includes("scroll") || low.includes("sideways") || low.includes("upward") || low.includes("rotational") || low.includes("vertical") || low.includes("horizontal")) {
      if (low.includes("up") || low.includes("vertical")) {
        settings.swipeMode = "upward";
        saveSettings();
        addAssistantMsg("Swipe set to upward. Open Home to try it.");
      } else if (low.includes("rotat") || low.includes("spin")) {
        settings.swipeMode = "rotational";
        saveSettings();
        addAssistantMsg("Swipe set to rotational. Open Home to try it.");
      } else {
        settings.swipeMode = "sideways";
        saveSettings();
        addAssistantMsg("Swipe set to sideways. Open Home to try it.");
      }
      return;
    }
    if (low.includes("delete post") || low.includes("remove post")) {
      addAssistantMsg("On Home, go to your post and tap the trash icon. Only your own posts can be deleted.");
      return;
    }
    if (low.includes("setting")) {
      addAssistantMsg("Opening Settings...");
      setTimeout(() => { switchView("settings"); closeAssistant(); }, 500);
      return;
    }
    if (low.includes("help") || low.includes("what can")) {
      addAssistantMsg("I can help with:\n• Dark / light theme\n• Sign out\n• Messages\n• Swipe mode (sideways, upward, rotational)\n• Notification sound\n• Opening Settings\n• Deleting posts\n\nJust ask.");
      return;
    }
    if (low.includes("hello") || low.includes("hi ") || low === "hi" || low.includes("hey")) {
      addAssistantMsg("Hey! How can I help?");
      return;
    }
    addAssistantMsg("I can help with theme, messages, sign out, swipe mode, sound, and Settings. Say “help” for the full list.");
  }, 350);
}

function handleQuickAction(action) {
  if (action === "toggle-theme") {
    document.body.classList.toggle("light-mode");
    settings.darkMode = !document.body.classList.contains("light-mode");
    saveSettings();
    toast("Theme updated");
  } else if (action === "messages") {
    switchView("inbox");
    closeAssistant();
  } else if (action === "signout") {
    handleSignOut();
  }
}

async function handleSignOut() {
  await sb.auth.signOut();
  user = null; profile = null;
  $("app")?.classList.add("hidden");
  $("assistantFab")?.classList.add("hidden");
  $("assistantBox")?.classList.add("hidden");
  $("authScreen")?.classList.remove("hidden");
  showLogin();
  toast("Signed out");
}

/* ================= INIT ================= */
async function init() {
  populateBirthdaySelects();
  $("loginForm")?.addEventListener("submit", handleLogin);
  $("signupForm")?.addEventListener("submit", handleSignup);
  $("showSignupBtn")?.addEventListener("click", showSignup);
  $("showLoginBtn")?.addEventListener("click", showLogin);

  try {
    const { data } = await sb.auth.getSession();
    if (data?.session?.user) await enterApp(data.session.user);
    else {
      $("authScreen")?.classList.remove("hidden");
      $("app")?.classList.add("hidden");
    }
  } catch (e) {
    $("authScreen")?.classList.remove("hidden");
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session?.user) await enterApp(session.user);
    if (event === "SIGNED_OUT") {
      user = null; profile = null;
      $("app")?.classList.add("hidden");
      $("authScreen")?.classList.remove("hidden");
    }
  });
}

document.addEventListener("DOMContentLoaded", init);

/* Global handlers */
window.toggleLike = toggleLike;
window.deletePost = deletePost;
window.openComments = openComments;
window.addComment = addComment;
window.openCreateStory = openCreateStory;
window.openStory = openStory;
window.onStoryFile = onStoryFile;
window.publishStory = publishStory;
window.selectFilter = selectFilter;
window.showMusicCat = showMusicCat;
window.selectMusic = selectMusic;
window.publishPost = publishPost;
window.onCreateFile = onCreateFile;
window.openChat = openChat;
window.sendMessage = sendMessage;
window.deleteLastMessage = deleteLastMessage;
window.openAvatarCreator = openAvatarCreator;
window.selectAvatar = selectAvatar;
window.saveAvatar = saveAvatar;
window.onProfilePhoto = onProfilePhoto;
window.closeSheet = closeSheet;
window.handleSignOut = handleSignOut;
window.setSwipeMode = setSwipeMode;
window.toggleNotifSound = toggleNotifSound;
window.toggleAiNotify = toggleAiNotify;
window.toggleDarkMode = toggleDarkMode;
window.switchView = switchView;
