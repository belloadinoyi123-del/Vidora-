/* =========================================================
   VIDORA - PROFESSIONAL SOCIAL APP.JS
   ========================================================= */
console.log("VIDORA PROFESSIONAL APP LOADED");

/* 1) SUPABASE */
const SUPABASE_URL = "https://htnrqgzxkfktwoioscjr.supabase.co";
const SUPABASE_KEY = "sb_publishable_JT5rBfXYSX3-3_zyC2cazQ_YXg_ih_h"

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

/* 2) STATE */
let currentUser = null;
let feedLoading = false;
let selectedVidoraSound = null;
let selectedVidoraFilter = "normal";
let vidoraAudioPlayer = null;
let activeChatUser = null;
let activeCallType = null;
let localStream = null;
let muteOriginalAudio = false;
let interactiveAvatarEnabled = localStorage.getItem("vidoraInteractiveAvatar") === "true";

const localChats = JSON.parse(localStorage.getItem("vidoraLocalChats") || "{}");
const localNotifications = JSON.parse(localStorage.getItem("vidoraNotifications") || "[]");

/* 3) HELPERS */
function $(id) { return document.getElementById(id); }
function setMessage(id, msg, ok) {
  const el = $(id); if (!el) return;
  el.textContent = msg || "";
  el.style.color = ok ? "#4ade80" : "#ff6b6b";
}
function clearMessage(id) { const el = $(id); if (el) el.textContent = ""; }
function escapeHTML(v) {
  const d = document.createElement("div");
  d.textContent = v == null ? "" : String(v);
  return d.innerHTML;
}
function fileExt(file) {
  if (!file?.name) return "bin";
  const p = file.name.split(".");
  return p.length < 2 ? "bin" : p.pop().toLowerCase();
}
function safeName(file) {
  const id = (crypto.randomUUID && crypto.randomUUID()) || (Date.now() + "-" + Math.random().toString(36).slice(2));
  return id + "." + fileExt(file);
}
function formatDate(s) {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
function saveChats() { localStorage.setItem("vidoraLocalChats", JSON.stringify(localChats)); }
function saveNotes() { localStorage.setItem("vidoraNotifications", JSON.stringify(localNotifications)); }

function pushNotification(type, text, fromUser) {
  localNotifications.unshift({
    id: Date.now() + Math.random(),
    type, text, fromUser: fromUser || "Someone",
    at: new Date().toISOString(),
    read: false
  });
  if (localNotifications.length > 100) localNotifications.length = 100;
  saveNotes();
  renderNotifications();
}

/* 4) AVATARS (unchanged set) */
const VIDORA_AVATARS = {
  nova:  { id: "nova",  name: "Nova",  image: "./nova.png" },
  kai:   { id: "kai",   name: "Kai",   image: "./kai.png" },
  luna:  { id: "luna",  name: "Luna",  image: "./luna.png" },
  ivy:   { id: "ivy",   name: "Ivy",   image: "./ivy.png" },
  orion: { id: "orion", name: "Orion", image: "./orion.png" },
  zeno:  { id: "zeno",  name: "Zeno",  image: "./zeno.png" },
  sage:  { id: "sage",  name: "Sage",  image: "./sage.png" },
  rex:   { id: "rex",   name: "Rex",   image: "./rex.png" },
  pixel: { id: "pixel", name: "Pixel", image: "./pixel.png" },
  vexa:  { id: "vexa",  name: "Vexa",  image: "./vexa.png" }
};

function getSelectedVidoraAvatar() {
  const s = localStorage.getItem("vidoraSelectedAvatar");
  return s && VIDORA_AVATARS[s] ? s : "nova";
}
function getVidoraAvatarInfo(name) {
  const key = String(name || "").toLowerCase().trim();
  return VIDORA_AVATARS[key] || VIDORA_AVATARS.nova;
}
function selectVidoraAvatar(name) {
  const key = String(name || "").toLowerCase().trim();
  if (!VIDORA_AVATARS[key]) return;
  localStorage.setItem("vidoraSelectedAvatar", key);
  document.querySelectorAll(".vidoraAvatar").forEach(function (b) {
    b.classList.toggle("selected", (b.dataset.avatar || "").toLowerCase() === key);
  });
  const info = getVidoraAvatarInfo(key);
  const preview = $("profileAvatarPreview");
  if (preview) preview.innerHTML = '<img class="profileAvatarImage" src="' + info.image + '" alt="' + info.name + '">';
  const profileAvatar = $("profileAvatar");
  if (profileAvatar) renderDefaultAvatar(profileAvatar, info.name);
}
function renderDefaultAvatar(container, displayName) {
  if (!container) return;
  const info = getVidoraAvatarInfo(getSelectedVidoraAvatar());
  container.innerHTML = "";
  const img = document.createElement("img");
  img.className = "profileAvatarImage";
  img.src = info.image;
  img.alt = displayName || info.name;
  img.onerror = function () {
    container.innerHTML = "<span>" + (displayName || "V").charAt(0).toUpperCase() + "</span>";
  };
  container.appendChild(img);
}
function initializeVidoraAvatarSystem() {
  const selected = getSelectedVidoraAvatar();
  const box = $("vidoraAvatarChoices");
  if (!box) return;
  box.innerHTML = "";
  Object.keys(VIDORA_AVATARS).forEach(function (key) {
    const a = VIDORA_AVATARS[key];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vidoraAvatar" + (key === selected ? " selected" : "");
    btn.dataset.avatar = key;
    btn.innerHTML = '<img src="' + a.image + '" alt="' + a.name + '"><span>' + a.name + "</span>";
    btn.onclick = function () { selectVidoraAvatar(key); };
    box.appendChild(btn);
  });
}

/* Interactive avatar - broader answers */
function getAvatarReply(text) {
  const msg = String(text || "").toLowerCase().trim();

  if (!msg) return "Ask me anything about Vidora, or life in general.";
  if (/(home|feed)/.test(msg)) { showPage("home"); return "Opening Home."; }
  if (/profile/.test(msg)) { showPage("profile"); return "Opening your profile."; }
  if (/(create|post|upload)/.test(msg)) { showPage("create"); return "Let's create a post."; }
  if (/(chat|message)/.test(msg)) { showPage("chat"); return "Opening chat."; }
  if (/(discover|explore|search)/.test(msg)) { showPage("discover"); return "Opening Discover."; }
  if (/(story|stories)/.test(msg)) { showPage("home"); return "Stories are on Home. Add one from the story row."; }
  if (/(follow|followers)/.test(msg)) return "Open any user post and use Follow / Unfollow.";
  if (/(block)/.test(msg)) return "Use Block on a user profile/post actions to stop seeing them.";
  if (/(like|comment)/.test(msg)) return "On each post you can like, unlike, comment, or delete your own comment.";
  if (/(call|video|hologram|voice)/.test(msg)) return "Open chat with a user, then use Voice, Video, or Hologram Call.";
  if (/(filter)/.test(msg)) return "In Create Post, pick a filter before publishing.";
  if (/(song|beat|funk|music|sound)/.test(msg)) return "In Create, choose Funk/Beats/Trending or upload your own song.";
  if (/(hello|hi|hey)\b/.test(msg)) return "Hey! I'm your Vidora assistant. Ask me anything.";
  if (/help/.test(msg)) return "I can guide you around Vidora, explain features, or answer general questions.";
  if (/who are you|what are you/.test(msg)) return "I'm Vidora's interactive avatar assistant — here to guide and answer questions.";
  if (/how are you/.test(msg)) return "All good and ready to help.";
  if (/thank/.test(msg)) return "You're welcome.";
  if (/love|life|motivation|sad|happy/.test(msg)) return "Whatever you're feeling, take one small step today. I'm here if you need guidance on Vidora too.";
  if (/weather/.test(msg)) return "I can't read live weather here, but I can help you post, chat, or call on Vidora.";
  if (/time/.test(msg)) return "Local time is about " + new Date().toLocaleTimeString() + ".";
  if (/date/.test(msg)) return "Today is " + new Date().toLocaleDateString() + ".";
  if (/delete account/.test(msg)) return "In Profile, use Delete Account. This permanently removes your Vidora account.";

  return "Interesting question. On Vidora you can post, story, chat, call, follow, and more. Ask me how to do any of that — or ask a general question and I'll help as best I can.";
}

function showInteractiveAvatar() {
  if (!interactiveAvatarEnabled) return;
  const box = $("interactiveAvatar");
  const img = $("interactiveAvatarImage");
  if (!box || !img) return;
  const info = getVidoraAvatarInfo(getSelectedVidoraAvatar());
  img.src = info.image;
  img.onerror = function () { img.src = "./nova.png"; };
  box.classList.remove("hidden");
}
function closeInteractiveAvatar() { const b = $("interactiveAvatar"); if (b) b.classList.add("hidden"); }
function toggleInteractiveAvatar(on) {
  interactiveAvatarEnabled = !!on;
  localStorage.setItem("vidoraInteractiveAvatar", on ? "true" : "false");
  if (on) showInteractiveAvatar(); else closeInteractiveAvatar();
}
function openAvatarChat() { $("avatarChatPanel")?.classList.remove("hidden"); }
function closeAvatarChat() { $("avatarChatPanel")?.classList.add("hidden"); }
function sendAvatarMessage() {
  const input = $("avatarChatInput");
  const box = $("avatarChatMessages");
  if (!input || !box) return;
  const text = input.value.trim();
  if (!text) return;
  const u = document.createElement("div");
  u.className = "avatarChatMessage avatarUser";
  u.textContent = text;
  box.appendChild(u);
  input.value = "";
  setTimeout(function () {
    const b = document.createElement("div");
    b.className = "avatarChatMessage avatarBot";
    b.textContent = getAvatarReply(text);
    box.appendChild(b);
    box.scrollTop = box.scrollHeight;
  }, 350);
}

/* 5) FILTERS + SONGS */
const VIDORA_FILTERS = [
  { id: "normal", name: "Normal", css: "none" },
  { id: "vivid", name: "Vivid", css: "contrast(1.2) saturate(1.45)" },
  { id: "warm", name: "Warm", css: "sepia(0.28) saturate(1.25)" },
  { id: "cool", name: "Cool", css: "hue-rotate(18deg) saturate(1.15)" },
  { id: "mono", name: "Mono", css: "grayscale(1)" },
  { id: "fade", name: "Fade", css: "contrast(0.9) brightness(1.12) saturate(0.8)" },
  { id: "cinema", name: "Cinema", css: "contrast(1.28) saturate(0.88) brightness(0.94)" },
  { id: "glow", name: "Glow", css: "brightness(1.16) saturate(1.3)" },
  { id: "sunset", name: "Sunset", css: "sepia(0.4) saturate(1.45) hue-rotate(-12deg)" },
  { id: "arctic", name: "Arctic", css: "hue-rotate(175deg) saturate(0.75) brightness(1.06)" },
  { id: "pink", name: "Pink", css: "hue-rotate(-20deg) saturate(1.4)" },
  { id: "sharp", name: "Sharp", css: "contrast(1.35) saturate(1.1)" }
];

const VIDORA_SONGS = [
  { id: "night-funk", name: "Night Funk", artist: "Vidora Mix", type: "funk", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: "city-groove", name: "City Groove", artist: "Pulse Lab", type: "funk", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: "heavy-room", name: "Heavy Room", artist: "Beat Foundry", type: "beats", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { id: "bounce-check", name: "Bounce Check", artist: "Drumline", type: "beats", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  { id: "viral-wave", name: "Viral Wave", artist: "Trend Audio", type: "trending", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
  { id: "soft-scroll", name: "Soft Scroll", artist: "Feed Tunes", type: "trending", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" }
];

function renderVidoraFilterChips() {
  const box = $("vidoraFilterChips"); if (!box) return;
  box.innerHTML = "";
  VIDORA_FILTERS.forEach(function (f) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "filterChip" + (f.id === selectedVidoraFilter ? " active" : "");
    b.textContent = f.name;
    b.onclick = function () { selectVidoraFilter(f.id); };
    box.appendChild(b);
  });
}
function selectVidoraFilter(id) {
  selectedVidoraFilter = id || "normal";
  const f = VIDORA_FILTERS.find(x => x.id === selectedVidoraFilter);
  document.querySelectorAll(".filterChip").forEach(function (chip) {
    chip.classList.toggle("active", chip.textContent === (f?.name || ""));
  });
  const preview = $("createMediaPreview");
  if (preview) preview.style.filter = f ? f.css : "none";
}
function stopVidoraSound() {
  if (vidoraAudioPlayer) {
    try { vidoraAudioPlayer.pause(); vidoraAudioPlayer.src = ""; } catch (e) {}
    vidoraAudioPlayer = null;
  }
}
function playSong(songId) {
  const song = VIDORA_SONGS.find(s => s.id === songId) || (selectedVidoraSound && selectedVidoraSound.id === songId ? selectedVidoraSound : null);
  if (!song?.audioUrl) return alert("No song found.");
  stopVidoraSound();
  const a = new Audio(song.audioUrl);
  a.volume = 1;
  vidoraAudioPlayer = a;
  a.play().catch(err => alert("Play failed: " + (err.message || "error")));
}
function openVidoraSongs(type) {
  const panel = $("vidoraSoundPanel");
  const list = $("vidoraSoundList");
  if (!panel || !list) return;
  const songs = !type || type === "all" ? VIDORA_SONGS : VIDORA_SONGS.filter(s => s.type === type);
  list.innerHTML = "";
  songs.forEach(function (song) {
    const row = document.createElement("div");
    row.className = "soundItemRow";
    row.innerHTML = "<div class='soundMeta'><strong>" + escapeHTML(song.name) + "</strong><small>" +
      escapeHTML(song.artist) + " · " + escapeHTML(song.type) +
      "</small></div><div class='soundActions'><button type='button' class='secondary'>▶</button><button type='button'>Use</button></div>";
    row.querySelectorAll("button")[0].onclick = function (e) { e.preventDefault(); playSong(song.id); };
    row.querySelectorAll("button")[1].onclick = function (e) {
      e.preventDefault();
      selectedVidoraSound = song;
      $("selectedSoundName").textContent = song.name;
      $("selectedSoundArtist").textContent = song.artist + " · " + song.type;
      $("selectedVidoraSound")?.classList.remove("hidden");
    };
    list.appendChild(row);
  });
  panel.classList.remove("hidden");
}
function closeVidoraSounds() { $("vidoraSoundPanel")?.classList.add("hidden"); }
function removeVidoraSound() {
  selectedVidoraSound = null;
  stopVidoraSound();
  $("selectedVidoraSound")?.classList.add("hidden");
}
function handleCustomSoundUpload(e) {
  const file = e?.target?.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("audio/")) return alert("Choose an audio file.");
  selectedVidoraSound = {
    id: "custom-" + Date.now(),
    name: file.name || "My Song",
    artist: "Uploaded by you",
    type: "upload",
    audioUrl: URL.createObjectURL(file),
    file
  };
  $("selectedSoundName").textContent = selectedVidoraSound.name;
  $("selectedSoundArtist").textContent = selectedVidoraSound.artist;
  $("selectedVidoraSound")?.classList.remove("hidden");
}
function playSelectedCustomSound() {
  if (!selectedVidoraSound?.audioUrl) return alert("Choose or upload a song first.");
  stopVidoraSound();
  const a = new Audio(selectedVidoraSound.audioUrl);
  vidoraAudioPlayer = a;
  a.play().catch(err => alert("Play failed: " + (err.message || "error")));
}
function toggleMuteOriginalAudio() {
  muteOriginalAudio = !muteOriginalAudio;
  const btn = $("muteOriginalBtn");
  if (btn) btn.textContent = muteOriginalAudio ? "🔇 Original muted" : "🔊 Original audio";
}

/* 6) AUTH */
function showAuthScreen() {
  $("authScreen")?.classList.remove("hidden");
  $("app")?.classList.add("hidden");
}
function showAppScreen() {
  $("authScreen")?.classList.add("hidden");
  $("app")?.classList.remove("hidden");
}
function showAuthChoice() {
  $("authChoice")?.classList.remove("hidden");
  $("loginForm")?.classList.add("hidden");
  $("signupForm")?.classList.add("hidden");
  clearMessage("authMessage");
}
function showLoginForm() {
  $("authChoice")?.classList.add("hidden");
  $("loginForm")?.classList.remove("hidden");
  $("signupForm")?.classList.add("hidden");
  clearMessage("authMessage");
}
function showCreateAccount() {
  $("authChoice")?.classList.add("hidden");
  $("loginForm")?.classList.add("hidden");
  $("signupForm")?.classList.remove("hidden");
  clearMessage("authMessage");
}
function togglePassword(id, btn) {
  const input = $(id); if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
  if (btn) btn.textContent = input.type === "password" ? "👁" : "🙈";
}

async function signUp() {
  const email = $("signupEmail")?.value.trim();
  const password = $("signupPassword")?.value || "";
  const confirm = $("signupPasswordConfirm")?.value || "";
  const username = $("signupUsername")?.value.trim().toLowerCase();
  const displayName = $("signupDisplayName")?.value.trim();
  const age = Number($("signupAge")?.value);
  const msg = $("authMessage");
  const btn = $("signUpBtn");

  if (!email || !password || !confirm || !username || !displayName || !$("signupAge")?.value) {
    if (msg) msg.textContent = "Please complete all fields."; return;
  }
  if (password.length < 6) { if (msg) msg.textContent = "Password must be 6+ characters."; return; }
  if (password !== confirm) { if (msg) msg.textContent = "Passwords do not match."; return; }
  if (!Number.isFinite(age) || age < 13) { if (msg) msg.textContent = "You must be at least 13."; return; }
  if (!/^[a-z0-9_]{3,20}$/.test(username)) { if (msg) msg.textContent = "Username: 3-20 letters/numbers/_"; return; }

  if (btn) { btn.disabled = true; btn.textContent = "Creating..."; }
  try {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) { if (msg) msg.textContent = error.message; return; }
    const user = data?.user;
    if (!user) { if (msg) msg.textContent = "Check your email to confirm your account."; return; }

    const { error: pErr } = await supabaseClient.from("profiles").upsert({
      id: user.id, username, display_name: displayName, age, bio: "", avatar_url: null
    });
    if (pErr) { if (msg) msg.textContent = "Account created, profile error: " + pErr.message; return; }

    currentUser = user;
    await showApp();
  } catch (e) {
    if (msg) msg.textContent = "Sign up failed.";
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Create Account"; }
  }
}

async function login() {
  const email = $("email")?.value.trim();
  const password = $("password")?.value || "";
  const msg = $("authMessage");
  const btn = $("loginBtn");
  if (!email || !password) { if (msg) msg.textContent = "Enter email and password."; return; }
  if (btn) { btn.disabled = true; btn.textContent = "Logging in..."; }
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) { if (msg) msg.textContent = error.message; return; }
    currentUser = data.user;
    await showApp();
  } catch (e) {
    if (msg) msg.textContent = "Login failed.";
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Log In"; }
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  showAuthScreen();
  showAuthChoice();
}

async function deleteAccount() {
  if (!currentUser) return;
  if (!confirm("Delete your Vidora account permanently?")) return;
  // Preferred: Supabase Edge Function with service role.
  // Client-side best effort cleanup:
  try {
    await supabaseClient.from("posts").delete().eq("user_id", currentUser.id);
    await supabaseClient.from("comments").delete().eq("user_id", currentUser.id);
    await supabaseClient.from("likes").delete().eq("user_id", currentUser.id);
    await supabaseClient.from("follows").delete().eq("follower_id", currentUser.id);
    await supabaseClient.from("follows").delete().eq("following_id", currentUser.id);
    await supabaseClient.from("profiles").delete().eq("id", currentUser.id);
    await supabaseClient.auth.signOut();
    currentUser = null;
    alert("Your Vidora data was removed. Full auth deletion may require server support.");
    showAuthScreen();
    showAuthChoice();
  } catch (e) {
    alert("Could not fully delete account from client.");
  }
}

async function checkSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (data?.session?.user) {
    currentUser = data.session.user;
    await showApp();
  } else {
    showAuthScreen();
    showAuthChoice();
  }
}
async function showApp() {
  showAppScreen();
  initializeVidoraAvatarSystem();
  renderVidoraFilterChips();
  renderNotifications();
  showPage("home");
  if (interactiveAvatarEnabled) showInteractiveAvatar();
}

/* 7) PROFILE + PHOTO UPLOAD */
async function loadProfile() {
  if (!currentUser) return;
  const { data } = await supabaseClient.from("profiles")
    .select("username,display_name,bio,avatar_url,age")
    .eq("id", currentUser.id).maybeSingle();

  const name = data?.display_name || "Vidora User";
  const username = data?.username || "user";
  if ($("profileDisplayName")) $("profileDisplayName").textContent = name;
  if ($("profileUsername")) $("profileUsername").textContent = "@" + username;
  if ($("profileBio")) $("profileBio").textContent = data?.bio || "No bio yet";
  if ($("profileEmail")) $("profileEmail").textContent = currentUser.email || "";

  const followers = await countFollowers(currentUser.id);
  if ($("profileFollowers")) $("profileFollowers").textContent = followers + " Followers";

  const avatar = $("profileAvatar");
  if (avatar) {
    if (data?.avatar_url) {
      avatar.innerHTML = '<img class="profileAvatarImage" src="' + escapeHTML(data.avatar_url) + '" alt="Avatar">';
    } else {
      renderDefaultAvatar(avatar, name);
    }
  }
}

async function uploadProfilePhoto(e) {
  const file = e?.target?.files?.[0];
  if (!file || !currentUser) return;
  if (!file.type.startsWith("image/")) return alert("Choose an image.");
  const path = currentUser.id + "/avatar/" + safeName(file);
  const { error } = await supabaseClient.storage.from("media").upload(path, file, { upsert: true });
  if (error) return alert(error.message);
  const { data } = supabaseClient.storage.from("media").getPublicUrl(path);
  await supabaseClient.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", currentUser.id);
  await loadProfile();
}

async function saveProfile() {
  if (!currentUser) return;
  const display_name = $("editDisplayName")?.value.trim();
  const username = $("editUsername")?.value.trim().toLowerCase();
  const bio = $("editBio")?.value.trim() || "";
  if (!display_name || !username) return setMessage("profileMessage", "Name and username required.");
  const { error } = await supabaseClient.from("profiles")
    .update({ display_name, username, bio }).eq("id", currentUser.id);
  if (error) return setMessage("profileMessage", error.message);
  setMessage("profileMessage", "Profile updated", true);
  await loadProfile();
}

/* 8) FOLLOW / BLOCK / COUNTS */
async function countFollowers(userId) {
  const { count } = await supabaseClient.from("follows")
    .select("id", { count: "exact", head: true }).eq("following_id", userId);
  return count || 0;
}
async function toggleFollow(userId, btn) {
  if (!currentUser || userId === currentUser.id) return;
  const { data: existing } = await supabaseClient.from("follows").select("id")
    .eq("follower_id", currentUser.id).eq("following_id", userId).maybeSingle();
  if (existing) {
    await supabaseClient.from("follows").delete().eq("id", existing.id);
    if (btn) btn.textContent = "Follow";
  } else {
    await supabaseClient.from("follows").insert({ follower_id: currentUser.id, following_id: userId });
    if (btn) btn.textContent = "Unfollow";
    pushNotification("follow", "Someone followed you", "User");
  }
}
async function blockUser(userId) {
  if (!currentUser || userId === currentUser.id) return;
  if (!confirm("Block this user?")) return;
  await supabaseClient.from("blocks").upsert({ blocker_id: currentUser.id, blocked_id: userId });
  alert("User blocked");
  await loadFeed();
}
async function getBlockedIds() {
  if (!currentUser) return [];
  const { data } = await supabaseClient.from("blocks").select("blocked_id").eq("blocker_id", currentUser.id);
  return (data || []).map(x => x.blocked_id);
}

/* 9) POSTS / LIKES / COMMENTS */
function validateMediaFile(file) {
  if (!file) return { valid: false, message: "Choose a photo or video." };
  if (!(file.type.startsWith("image/") || file.type.startsWith("video/")))
    return { valid: false, message: "Only photos/videos allowed." };
  return { valid: true };
}
function previewCreateMedia(e) {
  const file = e?.target?.files?.[0];
  const preview = $("createMediaPreview");
  if (!preview) return;
  preview.innerHTML = "";
  if (!file) return;
  const url = URL.createObjectURL(file);
  if (file.type.startsWith("video/")) {
    const v = document.createElement("video");
    v.src = url; v.controls = true; v.playsInline = true; v.muted = muteOriginalAudio;
    preview.appendChild(v);
  } else {
    const img = document.createElement("img");
    img.src = url; preview.appendChild(img);
  }
  selectVidoraFilter(selectedVidoraFilter);
}

async function createPost(file, caption) {
  const path = currentUser.id + "/" + safeName(file);
  const mediaType = file.type.startsWith("video/") ? "video" : "image";
  const { error: upErr } = await supabaseClient.storage.from("media").upload(path, file);
  if (upErr) return { success: false, message: upErr.message };
  const { data } = supabaseClient.storage.from("media").getPublicUrl(path);

  const payload = {
    user_id: currentUser.id,
    media_url: data.publicUrl,
    media_type: mediaType,
    caption: caption || "",
    views: 0,
    filter_name: selectedVidoraFilter || "normal",
    sound_name: selectedVidoraSound?.name || null,
    sound_url: selectedVidoraSound?.audioUrl || null,
    mute_original: muteOriginalAudio
  };

  const { error } = await supabaseClient.from("posts").insert(payload);
  if (error) return { success: false, message: error.message };
  return { success: true };
}

async function publishFromCreate() {
  const fileInput = $("createFile");
  const captionInput = $("createCaption");
  if (!fileInput || !captionInput) return;
  const file = fileInput.files[0];
  let caption = captionInput.value.trim();
  clearMessage("createMessage");
  if (!currentUser) return setMessage("createMessage", "Please log in.");
  const v = validateMediaFile(file);
  if (!v.valid) return setMessage("createMessage", v.message);

  if (selectedVidoraSound) caption += (caption ? "\n\n" : "") + "🎵 " + selectedVidoraSound.name + " — " + selectedVidoraSound.artist;
  if (selectedVidoraFilter !== "normal") caption += (caption ? "\n" : "") + "🎨 " + selectedVidoraFilter;

  try {
    const result = await createPost(file, caption);
    if (!result.success) return setMessage("createMessage", result.message);
    setMessage("createMessage", "Posted!", true);
    fileInput.value = ""; captionInput.value = "";
    removeVidoraSound(); selectVidoraFilter("normal");
    $("createMediaPreview").innerHTML = "";
    await loadFeed();
    showPage("home");
  } catch (e) {
    setMessage("createMessage", "Could not publish.");
  }
}

async function deletePost(postId) {
  if (!confirm("Delete this post?")) return;
  const { error } = await supabaseClient.from("posts").delete().eq("id", postId).eq("user_id", currentUser.id);
  if (error) return alert(error.message);
  await loadFeed();
}

async function getLikeCount(postId) {
  const { count } = await supabaseClient.from("likes").select("id", { count: "exact", head: true }).eq("post_id", postId);
  return count || 0;
}
async function getCommentCount(postId) {
  const { count } = await supabaseClient.from("comments").select("id", { count: "exact", head: true }).eq("post_id", postId);
  return count || 0;
}
async function toggleLike(postId, btn) {
  if (!currentUser) return;
  const { data: existing } = await supabaseClient.from("likes").select("id")
    .eq("post_id", postId).eq("user_id", currentUser.id).maybeSingle();
  if (existing) {
    await supabaseClient.from("likes").delete().eq("id", existing.id);
  } else {
    await supabaseClient.from("likes").insert({ post_id: postId, user_id: currentUser.id });
    pushNotification("like", "Someone liked a post", "User");
  }
  const c = await getLikeCount(postId);
  if (btn) btn.textContent = "❤️ " + c;
}

async function loadComments(postId, box) {
  box.innerHTML = "Loading...";
  const { data } = await supabaseClient.from("comments")
    .select("id,user_id,content,created_at").eq("post_id", postId).order("created_at");
  if (!data?.length) { box.innerHTML = "<p class='muted'>No comments yet.</p>"; return; }
  box.innerHTML = "";
  for (const c of data) {
    let name = "user";
    const { data: p } = await supabaseClient.from("profiles").select("username").eq("id", c.user_id).maybeSingle();
    if (p?.username) name = p.username;
    const row = document.createElement("div");
    row.className = "commentRow";
    row.innerHTML = "<strong>@" + escapeHTML(name) + "</strong> " + escapeHTML(c.content) +
      (currentUser?.id === c.user_id ? " <button type='button' class='secondary'>Delete</button>" : "");
    const del = row.querySelector("button");
    if (del) del.onclick = async function () {
      await supabaseClient.from("comments").delete().eq("id", c.id).eq("user_id", currentUser.id);
      await loadComments(postId, box);
    };
    box.appendChild(row);
  }
}

async function addComment(postId, input, box) {
  const content = input.value.trim();
  if (!content) return;
  const { error } = await supabaseClient.from("comments").insert({
    post_id: postId, user_id: currentUser.id, content
  });
  if (error) return alert(error.message);
  input.value = "";
  await loadComments(postId, box);
}

async function incrementViews(postId, ownerId) {
  if (!currentUser || currentUser.id === ownerId) return;
  // simple best-effort
  try {
    const { data } = await supabaseClient.from("posts").select("views").eq("id", postId).maybeSingle();
    await supabaseClient.from("posts").update({ views: (data?.views || 0) + 1 }).eq("id", postId);
  } catch (e) {}
}

/* 10) FEED */
async function loadFeed() {
  if (feedLoading) return;
  feedLoading = true;
  const feed = $("feed");
  if (!feed) { feedLoading = false; return; }
  feed.innerHTML = '<div class="loading">Loading Vidora...</div>';
  try {
    const blocked = await getBlockedIds();
    const { data, error } = await supabaseClient.from("posts")
      .select("id,user_id,media_url,media_type,caption,created_at,views,sound_name,sound_url,mute_original,filter_name")
      .order("created_at", { ascending: false });
    if (error) { feed.innerHTML = '<div class="loading">' + escapeHTML(error.message) + "</div>"; return; }
    const posts = (data || []).filter(p => !blocked.includes(p.user_id));
    if (!posts.length) { feed.innerHTML = '<div class="loading">No posts yet.</div>'; return; }
    feed.innerHTML = "";
    for (const post of posts) {
      const el = await createPostElement(post);
      if (el) feed.appendChild(el);
      incrementViews(post.id, post.user_id);
    }
  } finally { feedLoading = false; }
}

async function createPostElement(post) {
  const article = document.createElement("article");
  article.className = "postCard";
  let username = "user";
  const { data: profile } = await supabaseClient.from("profiles").select("username,display_name").eq("id", post.user_id).maybeSingle();
  username = profile?.username || profile?.display_name || username;

  const likes = await getLikeCount(post.id);
  const comments = await getCommentCount(post.id);
  const isOwner = currentUser?.id === post.user_id;
  const followers = isOwner ? await countFollowers(currentUser.id) : null;

  const media = post.media_type === "video"
    ? '<video src="' + escapeHTML(post.media_url) + '" controls playsinline ' + (post.mute_original ? "muted" : "") + "></video>"
    : '<img src="' + escapeHTML(post.media_url) + '" alt="Post">';

  const ownerStats = isOwner
    ? '<span>👁️ ' + (post.views || 0) + ' Views</span><span>👥 ' + followers + ' Followers</span>'
    : "";

  article.innerHTML =
    '<div class="postHeader"><strong>@' + escapeHTML(username) + "</strong><span>" + escapeHTML(formatDate(post.created_at)) +
    '</span></div><div class="postMedia">' + media +
    '<div class="vidoraMark">V</div></div>' +
    '<div class="postCaption">' + escapeHTML(post.caption || "") + "</div>" +
    (post.sound_url ? '<div class="postSongRow"><button type="button" class="playPostSongBtn">▶ Play song</button> <span>' +
      escapeHTML(post.sound_name || "Vidora Song") + "</span></div>" : "") +
    '<div class="postStats"><span>❤️ ' + likes + ' Likes</span><span>💬 ' + comments + ' Comments</span>' + ownerStats + "</div>" +
    '<div class="postActions">' +
    '<button type="button" class="likeBtn">❤️ ' + likes + "</button>" +
    '<button type="button" class="commentToggleBtn">💬 Comment</button>' +
    (!isOwner ? '<button type="button" class="followBtn">Follow</button><button type="button" class="chatBtn">Chat</button><button type="button" class="blockBtn">Block</button>' : "") +
    (isOwner ? '<button type="button" class="deletePostBtn">Delete</button>' : "") +
    "</div>" +
    '<div class="commentsBox hidden"></div>' +
    '<div class="addCommentRow hidden"><input type="text" class="commentInput" placeholder="Write a comment..."><button type="button" class="sendCommentBtn">Post</button></div>';

  article.querySelector(".likeBtn").onclick = function () { toggleLike(post.id, article.querySelector(".likeBtn")); };
  const cBox = article.querySelector(".commentsBox");
  const cRow = article.querySelector(".addCommentRow");
  article.querySelector(".commentToggleBtn").onclick = async function () {
    cBox.classList.toggle("hidden"); cRow.classList.toggle("hidden");
    if (!cBox.classList.contains("hidden")) await loadComments(post.id, cBox);
  };
  article.querySelector(".sendCommentBtn").onclick = function () {
    addComment(post.id, article.querySelector(".commentInput"), cBox);
  };
  if (article.querySelector(".deletePostBtn")) article.querySelector(".deletePostBtn").onclick = function () { deletePost(post.id); };
  if (article.querySelector(".followBtn")) article.querySelector(".followBtn").onclick = function () { toggleFollow(post.user_id, article.querySelector(".followBtn")); };
  if (article.querySelector(".chatBtn")) article.querySelector(".chatBtn").onclick = function () { openChatWith(post.user_id, username); };
  if (article.querySelector(".blockBtn")) article.querySelector(".blockBtn").onclick = function () { blockUser(post.user_id); };
  if (article.querySelector(".playPostSongBtn") && post.sound_url) {
    article.querySelector(".playPostSongBtn").onclick = function () {
      stopVidoraSound();
      const a = new Audio(post.sound_url);
      vidoraAudioPlayer = a;
      a.play().catch(() => alert("Could not play song"));
    };
  }
  return article;
}

/* 11) STORIES */
async function createStory() {
  const input = $("storyFileInput");
  if (!input?.files?.[0] || !currentUser) return alert("Choose a story file.");
  const file = input.files[0];
  const path = currentUser.id + "/stories/" + safeName(file);
  const mediaType = file.type.startsWith("video/") ? "video" : "image";
  const { error: upErr } = await supabaseClient.storage.from("media").upload(path, file);
  if (upErr) return alert(upErr.message);
  const { data } = supabaseClient.storage.from("media").getPublicUrl(path);
  const { error } = await supabaseClient.from("stories").insert({
    user_id: currentUser.id,
    media_url: data.publicUrl,
    media_type: mediaType,
    sound_name: selectedVidoraSound?.name || null,
    sound_url: selectedVidoraSound?.audioUrl || null
  });
  if (error) return alert(error.message);
  alert("Story created");
  input.value = "";
  await loadStories();
}
async function loadStories() {
  const row = $("storiesRow"); if (!row) return;
  const { data } = await supabaseClient.from("stories").select("*").order("created_at", { ascending: false }).limit(40);
  row.innerHTML = "";
  (data || []).forEach(function (story) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "storyBubble"; b.textContent = "Story";
    b.onclick = function () { openStoryViewer(story); };
    row.appendChild(b);
  });
}
function openStoryViewer(story) {
  const viewer = $("storyViewer"); const content = $("storyViewerContent");
  if (!viewer || !content) return;
  content.innerHTML = story.media_type === "video"
    ? '<video src="' + escapeHTML(story.media_url) + '" controls autoplay playsinline></video>'
    : '<img src="' + escapeHTML(story.media_url) + '" alt="Story">';
  viewer.dataset.storyId = story.id;
  viewer.dataset.storyUserId = story.user_id;
  viewer.classList.remove("hidden");
  if (story.sound_url) {
    stopVidoraSound();
    const a = new Audio(story.sound_url);
    vidoraAudioPlayer = a; a.play().catch(() => {});
  }
}
function closeStoryViewer() { stopVidoraSound(); $("storyViewer")?.classList.add("hidden"); }
async function deleteStory() {
  const viewer = $("storyViewer");
  if (!viewer || currentUser?.id !== viewer.dataset.storyUserId) return alert("Only your story can be deleted.");
  await supabaseClient.from("stories").delete().eq("id", viewer.dataset.storyId);
  closeStoryViewer();
  await loadStories();
}

/* 12) CHAT */
function openChatWith(userId, username) {
  activeChatUser = { id: userId, username: username || "user" };
  showPage("chat");
  if ($("chatThreadTitle")) $("chatThreadTitle").textContent = "@" + activeChatUser.username;
  $("chatStatus")?.classList.add("hidden");
  $("chatThread")?.classList.remove("hidden");
  renderChatMessages();
}
function renderChatMessages() {
  const box = $("chatMessages"); if (!box || !activeChatUser) return;
  const msgs = localChats[activeChatUser.id] || [];
  box.innerHTML = "";
  if (!msgs.length) {
    box.innerHTML = '<div class="chatEmpty">Start a conversation with @' + escapeHTML(activeChatUser.username) + "</div>";
    return;
  }
  msgs.forEach(function (m) {
    const row = document.createElement("div");
    row.className = "chatBubble " + (m.from === "me" ? "chatMe" : "chatThem");
    if (m.type === "voice") row.innerHTML = "🎤 <audio controls src='" + escapeHTML(m.audioUrl) + "'></audio>";
    else row.textContent = m.text || "";
    box.appendChild(row);
  });
  box.scrollTop = box.scrollHeight;
}
function sendChatMessage() {
  const input = $("chatInput"); if (!input || !activeChatUser) return;
  const text = input.value.trim(); if (!text) return;
  if (!localChats[activeChatUser.id]) localChats[activeChatUser.id] = [];
  localChats[activeChatUser.id].push({ from: "me", text, at: Date.now() });
  saveChats(); input.value = ""; renderChatMessages();
}
function handleVoiceNoteUpload(e) {
  const file = e?.target?.files?.[0];
  if (!file || !activeChatUser) return;
  if (!file.type.startsWith("audio/")) return alert("Choose audio.");
  if (!localChats[activeChatUser.id]) localChats[activeChatUser.id] = [];
  localChats[activeChatUser.id].push({ from: "me", type: "voice", audioUrl: URL.createObjectURL(file), at: Date.now() });
  saveChats(); renderChatMessages();
}

/* 13) CALLS */
function openCallUI(title, name, hologram) {
  if ($("callTitle")) $("callTitle").textContent = title;
  if ($("callUserName")) $("callUserName").textContent = name || "User";
  const panel = $("callPanel");
  if (panel) {
    panel.classList.remove("hidden");
    panel.classList.toggle("hologramMode", !!hologram);
  }
}
async function startLocalCamera(hologram) {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const video = $("localCallVideo");
    if (video) {
      video.srcObject = localStream;
      video.classList.toggle("hologramVideo", !!hologram);
      video.play();
    }
  } catch (e) { alert("Allow camera & mic for calls."); }
}
function stopLocalCamera() {
  if (localStream) localStream.getTracks().forEach(t => t.stop());
  localStream = null;
  const video = $("localCallVideo"); if (video) video.srcObject = null;
}
function startVoiceCall(name) { activeCallType = "voice"; openCallUI("Voice Call", name, false); }
function startVideoCall(name) { activeCallType = "video"; openCallUI("Video Call", name, false); startLocalCamera(false); }
function startHologramCall(name) { activeCallType = "hologram"; openCallUI("Hologram Call", name, true); startLocalCamera(true); }
function endCall() { stopLocalCamera(); activeCallType = null; $("callPanel")?.classList.add("hidden"); }

/* 14) NOTIFICATIONS */
function renderNotifications() {
  const box = $("notificationList"); if (!box) return;
  if (!localNotifications.length) { box.innerHTML = "<p class='muted'>No notifications</p>"; return; }
  box.innerHTML = localNotifications.slice(0, 20).map(n =>
    "<div class='noteItem'><strong>" + escapeHTML(n.type) + "</strong> — " + escapeHTML(n.text) +
    "<small>" + escapeHTML(formatDate(n.at)) + "</small></div>"
  ).join("");
}

/* 15) NAV */
function showPage(page) {
  const map = {
    home: "homeScreen", profile: "profileScreen", create: "createScreen",
    discover: "discoverScreen", friends: "friendsScreen", chat: "chatScreen",
    notifications: "notificationsScreen"
  };
  Object.values(map).forEach(function (id) { $(id)?.classList.add("hidden"); });
  $(map[page] || map.home)?.classList.remove("hidden");
  if (page === "home") { loadFeed(); loadStories(); }
  if (page === "profile") loadProfile();
  if (page === "create") renderVidoraFilterChips();
  if (page === "notifications") renderNotifications();
}
function showpage(p) { showPage(p); }

/* 16) INIT + EXPORTS */
document.addEventListener("DOMContentLoaded", async function () {
  initializeVidoraAvatarSystem();
  renderVidoraFilterChips();
  await checkSession();
});

window.signUp = signUp; window.login = login; window.logout = logout;
window.showAuthChoice = showAuthChoice; window.showLoginForm = showLoginForm; window.showCreateAccount = showCreateAccount;
window.togglePassword = togglePassword; window.deleteAccount = deleteAccount;
window.showPage = showPage; window.showpage = showpage;
window.loadProfile = loadProfile; window.saveProfile = saveProfile; window.uploadProfilePhoto = uploadProfilePhoto;
window.previewCreateMedia = previewCreateMedia; window.publishFromCreate = publishFromCreate;
window.openVidoraSongs = openVidoraSongs; window.openVidoraSounds = openVidoraSongs;
window.closeVidoraSounds = closeVidoraSounds; window.removeVidoraSound = removeVidoraSound;
window.handleCustomSoundUpload = handleCustomSoundUpload; window.playSelectedCustomSound = playSelectedCustomSound;
window.toggleMuteOriginalAudio = toggleMuteOriginalAudio; window.selectVidoraFilter = selectVidoraFilter;
window.selectVidoraAvatar = selectVidoraAvatar;
window.createStory = createStory; window.closeStoryViewer = closeStoryViewer; window.deleteStory = deleteStory;
window.openChatWith = openChatWith; window.sendChatMessage = sendChatMessage; window.handleVoiceNoteUpload = handleVoiceNoteUpload;
window.startVoiceCall = startVoiceCall; window.startVideoCall = startVideoCall; window.startHologramCall = startHologramCall; window.endCall = endCall;
window.showInteractiveAvatar = showInteractiveAvatar; window.closeInteractiveAvatar = closeInteractiveAvatar;
window.toggleInteractiveAvatar = toggleInteractiveAvatar; window.openAvatarChat = openAvatarChat; window.closeAvatarChat = closeAvatarChat;
window.sendAvatarMessage = sendAvatarMessage;
console.log("VIDORA PROFESSIONAL READY");
