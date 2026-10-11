/* =========================================================
   VIDORA – COMPLETE REBUILD
   Features:
   • Facebook-style Sign Up
   • Horizontal swipe video player (sideways)
   • Compact music button only
   • Create (filters + music categories)
   • WhatsApp-style Stories
   • TikTok-style Chat
   • Avatars + Avatar Creator
   • Likes / Comments / Views (owner-only views)
   • Delete own posts / stories / comments / messages
   • Vidora AI Assistant (theme, messages, sign out)
   ========================================================= */

const SUPABASE_URL = "https://htnrqgzxkfktwoioscjr.supabase.co";
const SUPABASE_KEY = "sb_publishable_JT5rBfXYSX3-3_zyC2cazQ_YXg_ih_h";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ================= HELPERS ================= */
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

function toast(msg) {
  const el = $("toast");
  if (!el) return console.log("VIDORA:", msg);
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

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
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
let storyItems = [];
let assistantHistory = [];

/* ================= FILTERS ================= */
const FILTERS = [
  { id: "none", name: "Original", css: "none" },
  { id: "vivid", name: "Vivid", css: "saturate(1.6) contrast(1.1)" },
  { id: "warm", name: "Warm", css: "sepia(.25) saturate(1.3) brightness(1.05)" },
  { id: "cool", name: "Cool", css: "hue-rotate(15deg) saturate(1.2)" },
  { id: "noir", name: "Noir", css: "grayscale(1) contrast(1.2)" },
  { id: "vintage", name: "Vintage", css: "sepia(.45) contrast(1.1) brightness(.95)" },
  { id: "neon", name: "Neon", css: "saturate(1.8) contrast(1.2) hue-rotate(300deg)" },
  { id: "beauty", name: "Beauty", css: "brightness(1.12) contrast(1.05) saturate(1.15)" },
  { id: "cinema", name: "Cinema", css: "contrast(1.25) saturate(.9) brightness(.95)" },
  { id: "glow", name: "Glow", css: "brightness(1.15) contrast(1.05) saturate(1.3)" },
  { id: "moody", name: "Moody", css: "contrast(1.35) brightness(.9) saturate(.85)" },
  { id: "golden", name: "Golden", css: "sepia(.4) saturate(1.35) brightness(1.08)" }
];

/* ================= MUSIC LIBRARY ================= */
const MUSIC = {
  Beats: [
    { id: "b1", title: "Night Pulse", artist: "Vidora Beatz" },
    { id: "b2", title: "Chrome Drive", artist: "Vidora Beatz" },
    { id: "b3", title: "Low Rider", artist: "Vidora Beatz" }
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
    { id: "p1", title: "Summer Hits 2026", artist: "Various" },
    { id: "p2", title: "Viral Dance", artist: "Trending" },
    { id: "p3", title: "Night Vibes", artist: "Charts" }
  ]
};

/* ================= AVATARS ================= */
const AVATARS = [
  "Nova","Kai","Luna","Ivy","Orion","Zeno","Sage","Rex","Pixel","Vexa",
  "Aero","Mika","Juno","Kairo","Nia","Zara","Axel","Riven","Sora","Nyx",
  "Aria","Dax","Milo","Zuri","Kira","Echo","Tari","Vio","Onyx","Cleo"
];

/* ================= AUTH ================= */
function populateBirthdaySelects() {
  const daySel = $("signupDay");
  const yearSel = $("signupYear");
  if (!daySel || !yearSel) return;
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
      await sb.from("profiles").upsert({
        id: data.user.id, display_name: displayName, username,
        first_name: firstName, last_name: lastName, birthday, gender,
        avatar_url: null, created_at: new Date().toISOString()
      });
      showStatus($("authStatus"), "Account created! You can now log in.", true);
      setTimeout(showLogin, 2000);
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

  try {
    const { data } = await sb.from("profiles").select("*").eq("id", user.id).single();
    profile = data;
  } catch (e) { console.warn(e); }

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

/* ================= NAVIGATION ================= */
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
}

/* ================= HOME (Stories + Horizontal Video) ================= */
function renderHome() {
  const main = $("main");
  main.innerHTML = `
    <div class="home-wrap">
      <!-- WhatsApp-style Stories -->
      <div class="stories-bar" id="storiesBar">
        <button class="story-item your-story" onclick="openCreateStory()">
          <div class="story-ring add"><span>+</span></div>
          <small>Your Story</small>
        </button>
        ${["Sofia","Arjun","Maya","Noah","Luna"].map(n => `
          <button class="story-item" onclick="openStory('${n}')">
            <div class="story-ring"><div class="story-avatar">${n[0]}</div></div>
            <small>${n}</small>
          </button>
        `).join("")}
      </div>

      <!-- Horizontal Video Feed -->
      <div class="video-feed" id="videoFeed">
        <div class="video-track" id="videoTrack"></div>
        <div class="swipe-hint left">‹</div>
        <div class="swipe-hint right">›</div>
      </div>
    </div>
  `;

  videoList = [
    { id:1, url:"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", user:"Sofia", avatar:"S", likes:12800, comments:256, shares:1200, views:45200, music:"Night Pulse – Vidora Beatz", caption:"Feeling the vibe 🔥", isOwner:false },
    { id:2, url:"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", user:"Arjun", avatar:"A", likes:8900, comments:142, shares:670, views:23100, music:"Chrome Drive – Vidora Beatz", caption:"New drop", isOwner:false },
    { id:3, url:"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", user:"Maya", avatar:"M", likes:21400, comments:512, shares:2300, views:89100, music:"Electric Soul – Vidora Funk", caption:"Dance challenge", isOwner:false },
    { id:4, url:"https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4", user: profile?.display_name?.split(" ")[0] || "You", avatar:"Y", likes:320, comments:18, shares:45, views:890, music:"UK Slide – Vidora Drills", caption:"My first Vidora post", isOwner:true }
  ];

  const track = $("videoTrack");
  track.innerHTML = videoList.map((v,i) => `
    <div class="video-slide" data-index="${i}">
      <video src="${v.url}" loop muted playsinline></video>
      <div class="side-actions">
        <button class="action-btn" onclick="toast('Follow @${esc(v.user)}')">
          <div class="icon avatar-sm">${v.avatar}</div>
          <span class="count">+</span>
        </button>
        <button class="action-btn like-btn" data-id="${v.id}" onclick="toggleLike(this, ${v.likes})">
          <div class="icon">♡</div>
          <span class="count">${formatCount(v.likes)}</span>
        </button>
        <button class="action-btn" onclick="openComments(${v.id})">
          <div class="icon">💬</div>
          <span class="count">${formatCount(v.comments)}</span>
        </button>
        <button class="action-btn" onclick="toast('Shared!')">
          <div class="icon">↗</div>
          <span class="count">${formatCount(v.shares)}</span>
        </button>
        ${v.isOwner ? `<button class="action-btn" onclick="deletePost(${v.id})"><div class="icon">🗑️</div></button>` : ""}
        <button class="music-btn" title="${esc(v.music)}" onclick="toast('${esc(v.music)}')">🎵</button>
      </div>
      <div class="video-info">
        <div class="user-row">@${esc(v.user)}</div>
        <div class="caption">${esc(v.caption)}</div>
        ${v.isOwner ? `<div class="views-owner">👁 ${formatCount(v.views)} views (only you see this)</div>` : ""}
      </div>
      <div class="vidora-watermark"><div class="v-logo">V</div><span>Vidora</span></div>
    </div>
  `).join("");

  currentVideoIndex = 0;
  updateVideoPosition();
  playCurrentVideo();
  setupHorizontalSwipe();
}

function updateVideoPosition() {
  const track = $("videoTrack");
  if (track) track.style.transform = `translateX(-${currentVideoIndex * 100}%)`;
}

function playCurrentVideo() {
  $$(".video-slide video").forEach((vid, i) => {
    if (i === currentVideoIndex) { vid.muted = false; vid.play().catch(()=>{}); }
    else { vid.pause(); vid.currentTime = 0; }
  });
}

function goToVideo(index) {
  if (index < 0 || index >= videoList.length) return;
  currentVideoIndex = index;
  updateVideoPosition();
  playCurrentVideo();
}

function setupHorizontalSwipe() {
  const feed = $("videoFeed");
  if (!feed) return;
  let startX = 0, isDragging = false;

  feed.ontouchstart = (e) => { startX = e.touches[0].clientX; isDragging = true; };
  feed.ontouchend = (e) => {
    if (!isDragging) return;
    isDragging = false;
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToVideo(currentVideoIndex + 1);
      else goToVideo(currentVideoIndex - 1);
    }
  };
  // Desktop
  let mouseDown = false;
  feed.onmousedown = (e) => { startX = e.clientX; mouseDown = true; };
  feed.onmouseup = (e) => {
    if (!mouseDown) return;
    mouseDown = false;
    const diff = startX - e.clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToVideo(currentVideoIndex + 1);
      else goToVideo(currentVideoIndex - 1);
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
  if (!confirm("Delete this post? Only you can delete your own posts.")) return;
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
      <div class="comment"><strong>Sofia</strong> Amazing! 🔥 <button class="del-btn" onclick="this.parentElement.remove();toast('Comment deleted')">Delete</button></div>
      <div class="comment"><strong>Arjun</strong> Fire edit</div>
      <div class="comment"><strong>You</strong> Thanks everyone! <button class="del-btn" onclick="this.parentElement.remove();toast('Your comment deleted')">Delete</button></div>
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
    <p class="muted">Stories disappear after 24 hours (WhatsApp style)</p>
    <button class="btn primary full" style="margin:12px 0" onclick="toast('Camera opened');closeSheet()">📷 Take Photo / Video</button>
    <button class="btn secondary full" onclick="toast('Gallery opened');closeSheet()">🖼️ Choose from Gallery</button>
  `);
}

function openStory(name) {
  openSheet(`
    <div class="story-viewer">
      <div class="story-progress"><div class="bar" style="width:70%"></div></div>
      <div class="story-user">@${esc(name)}</div>
      <div class="story-content">
        <div style="font-size:48px;margin:40px 0">🌟</div>
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
  $("main").innerHTML = `
    <div class="create-screen">
      <div class="create-header">
        <button onclick="switchView('home')">←</button>
        <h2>Create</h2>
        <button class="btn primary sm" onclick="publishPost()">Post</button>
      </div>

      <div class="create-preview" id="createPreview">
        <div class="preview-placeholder">
          <span style="font-size:48px">📷</span>
          <p>Tap to add photo or video</p>
        </div>
      </div>

      <div class="create-actions">
        <button class="btn secondary" onclick="toast('Camera')">Record</button>
        <button class="btn secondary" onclick="toast('Gallery')">Gallery</button>
      </div>

      <!-- Filters -->
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

      <!-- Music -->
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

function selectFilter(id) {
  selectedFilter = id;
  $$(".filter-chip").forEach(c => c.classList.toggle("active", c.dataset.id === id));
  toast("Filter: " + (FILTERS.find(f => f.id === id)?.name || "Original"));
}

function showMusicCat(cat) {
  $$(".music-tab").forEach(t => t.classList.toggle("active", t.textContent === cat));
  const list = $("musicList");
  list.innerHTML = MUSIC[cat].map(m => `
    <button class="music-item ${selectedMusic?.id===m.id?'active':''}" onclick="selectMusic('${m.id}','${esc(m.title)}','${esc(m.artist)}')">
      <span class="music-icon">🎵</span>
      <div><strong>${esc(m.title)}</strong><br><small class="muted">${esc(m.artist)}</small></div>
    </button>
  `).join("");
}

function selectMusic(id, title, artist) {
  selectedMusic = { id, title, artist };
  toast(`Music: ${title}`);
  // re-render current category to show active
  const activeTab = document.querySelector(".music-tab.active");
  if (activeTab) showMusicCat(activeTab.textContent);
}

function publishPost() {
  toast("Post published! 🎉");
  switchView("home");
}

/* ================= DISCOVER ================= */
function renderDiscover() {
  $("main").innerHTML = `
    <div style="padding:16px">
      <input class="field" placeholder="Search users, sounds, hashtags..." />
      <h3 style="margin:20px 0 12px">Trending</h3>
      <div class="trending-grid">
        ${["#VidoraDance","#NightVibes","#FunkChallenge","#NewMusic","#StoryTime","#AvatarDrop"].map(t => `
          <button class="trend-chip" onclick="toast('${t}')">${t}</button>
        `).join("")}
      </div>
      <h3 style="margin:24px 0 12px">Suggested for you</h3>
      ${["Kai","Luna","Rex","Nova","Pixel"].map(n => `
        <div class="user-row-card">
          <div class="avatar-circle">${n[0]}</div>
          <div><strong>${n}</strong><br><small class="muted">@${n.toLowerCase()}</small></div>
          <button class="btn primary sm" onclick="toast('Following ${n}')">Follow</button>
        </div>
      `).join("")}
    </div>
  `;
}

/* ================= INBOX / CHAT ================= */
function renderInbox() {
  $("main").innerHTML = `
    <div class="inbox-screen">
      <div class="inbox-header">
        <h2>Inbox</h2>
        <button class="icon-btn" onclick="toast('New message')">✎</button>
      </div>
      <div class="chat-list">
        ${[
          {name:"Sofia", last:"Did you see the new video?", time:"2m", unread:2},
          {name:"Arjun", last:"Loved your edit 🔥", time:"1h", unread:0},
          {name:"Maya", last:"Let's collab!", time:"3h", unread:1},
          {name:"Noah", last:"Check this sound", time:"Yesterday", unread:0}
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
        <div class="bubble them">Hey! Did you see the new video?</div>
        <div class="bubble me">Yes! Just watched it. So good 🔥</div>
        <div class="bubble them">Right? The ending 😮</div>
      </div>
      <form class="chat-input-row" onsubmit="sendMessage(event)">
        <input class="field" id="msgInput" placeholder="Message..." autocomplete="off" />
        <button type="submit" class="btn primary">Send</button>
      </form>
      <button class="btn danger sm" style="margin-top:8px" onclick="toast('Message deleted (only your messages)')">Delete last message</button>
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
  // Simulate assistant notification
  setTimeout(() => {
    if ($("assistantBox") && !$("assistantBox").classList.contains("hidden")) {
      addAssistantMsg(`New reply from ${chatUser || "someone"}`);
    }
  }, 1500);
}

/* ================= PROFILE + AVATARS ================= */
function renderProfile() {
  const name = profile?.display_name || user?.email || "User";
  const uname = profile?.username || "user";
  $("main").innerHTML = `
    <div class="profile-screen">
      <div class="profile-header">
        <div class="avatar-large" onclick="openAvatarCreator()">${(name[0]||"U").toUpperCase()}</div>
        <h2>${esc(name)}</h2>
        <p class="muted">@${esc(uname)}</p>
        <div class="profile-stats">
          <div><strong>12</strong><br><span class="muted">Posts</span></div>
          <div><strong>1.2K</strong><br><span class="muted">Followers</span></div>
          <div><strong>340</strong><br><span class="muted">Following</span></div>
        </div>
        <button class="btn secondary" onclick="openAvatarCreator()">Edit Avatar</button>
      </div>
      <div class="profile-tabs">
        <button class="active">Posts</button>
        <button>Liked</button>
      </div>
      <div class="posts-grid">
        ${[1,2,3,4,5,6].map(i => `<div class="grid-item" onclick="toast('Open post')">▶</div>`).join("")}
      </div>
      <button class="btn secondary full" style="margin-top:20px" onclick="handleSignOut()">Sign Out</button>
    </div>
  `;
}

function openAvatarCreator() {
  openSheet(`
    <div class="sheet-header"><h3>Create Your Avatar</h3><button class="icon-btn" onclick="closeSheet()">×</button></div>
    <div class="avatar-preview-large" id="avatarPreview">👤</div>
    <div class="avatar-categories">
      <button class="active">Face</button><button>Hair</button><button>Clothes</button><button>Costumes</button><button>Accessories</button>
    </div>
    <div class="avatar-grid">
      ${AVATARS.map(a => `
        <button class="avatar-choice" onclick="selectAvatar('${a}')">
          <div class="avatar-circle">${a[0]}</div>
          <span>${a}</span>
        </button>
      `).join("")}
    </div>
    <p class="muted small" style="margin:12px 0">Tap an avatar or customize with costumes</p>
    <button class="btn primary full" onclick="toast('Avatar saved!');closeSheet()">Save Avatar</button>
  `);
}

function selectAvatar(name) {
  selectedAvatar = name;
  const prev = $("avatarPreview");
  if (prev) prev.textContent = name[0];
  toast("Selected: " + name);
}

/* ================= SHEET / MODAL ================= */
function openSheet(html) {
  $("sheet").innerHTML = html;
  $("modal").classList.remove("hidden");
}

function closeSheet() {
  $("modal").classList.add("hidden");
  $("sheet").innerHTML = "";
}

$("modal")?.addEventListener("click", (e) => {
  if (e.target.id === "modal") closeSheet();
});

/* ================= ASSISTANT ================= */
function openAssistant() {
  $("assistantBox")?.classList.remove("hidden");
  if ($("assistantMessages") && !$("assistantMessages").children.length) {
    addAssistantMsg("Hi! I'm Vidora AI. I can toggle theme, check messages, or help you sign out.");
  }
}

function closeAssistant() {
  $("assistantBox")?.classList.add("hidden");
}

function addAssistantMsg(text, isUser = false) {
  const box = $("assistantMessages");
  if (!box) return;
  const div = document.createElement("div");
  div.style.cssText = `align-self:${isUser?"flex-end":"flex-start"};max-width:85%;padding:10px 14px;border-radius:16px;background:${isUser?"linear-gradient(135deg,var(--purple),var(--pink))":"var(--surface2)"};font-size:14px;`;
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
      addAssistantMsg("Theme toggled!");
    } else if (low.includes("sign out") || low.includes("logout")) {
      addAssistantMsg("Signing you out...");
      setTimeout(handleSignOut, 700);
    } else if (low.includes("message") || low.includes("inbox") || low.includes("notify")) {
      addAssistantMsg("You have 3 unread messages. Open Inbox to see them.");
    } else {
      addAssistantMsg("Try: “toggle theme”, “messages”, or “sign out”.");
    }
  }, 400);
}

function handleQuickAction(action) {
  if (action === "toggle-theme") {
    document.body.classList.toggle("light-mode");
    toast("Theme toggled");
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

// Make some functions global for onclick handlers
window.toggleLike = toggleLike;
window.deletePost = deletePost;
window.openComments = openComments;
window.addComment = addComment;
window.openCreateStory = openCreateStory;
window.openStory = openStory;
window.selectFilter = selectFilter;
window.showMusicCat = showMusicCat;
window.selectMusic = selectMusic;
window.publishPost = publishPost;
window.openChat = openChat;
window.sendMessage = sendMessage;
window.openAvatarCreator = openAvatarCreator;
window.selectAvatar = selectAvatar;
window.closeSheet = closeSheet;
window.handleSignOut = handleSignOut;
