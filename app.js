/* =========================================================
   VIDORA APP.JS
   Complete fixed + enhanced controller
   ========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  "https://htnrqgzxkfktwoioscjr.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_JT5rBfXYSX3-3_zyC2cazQ_YXg_ih_h";

const sb = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


/* =========================================================
   HELPERS
========================================================= */

const $ = id => document.getElementById(id);

let user = null;
let profile = null;
let currentView = "home";

let selectedMusic = null;
let selectedStoryMusic = null;

let selectedFilter = "none";
let selectedStoryFilter = "none";

let storyItems = [];
let storyIndex = 0;
let storyAudio = null;

let commentsPost = null;
let chatUser = null;

let realtimeChannel = null;
let authListenerReady = false;
let appStarting = false;

let assistantHistory = [];

let musicCategory = "All";


function toast(message){
  const el = $("toast");
  if(!el) return;
  el.textContent = String(message || "");
  el.classList.remove("hidden");
  clearTimeout(window.__vidoraToast);
  window.__vidoraToast = setTimeout(()=>{
    el.classList.add("hidden");
  },3000);
}


function esc(value = ""){
  return String(value).replace(
    /[&<>"']/g,
    character => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[character])
  );
}


function safeError(error, fallback = "Something went wrong."){
  return (
    error?.message ||
    error?.details ||
    error?.hint ||
    fallback
  );
}


function showStatus(element,message,success=false){
  if(!element) return;
  element.textContent = message || "";
  element.className =
    "status " +
    (success ? "ok" : "err");
}


function fallbackAvatar(name="V"){
  return "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg"
           width="160"
           height="160">
        <rect width="160" height="160" rx="80" fill="#181824"/>
        <circle cx="80" cy="60" r="30" fill="#8b5cf6"/>
        <path d="M30 150c8-45 92-45 100 0" fill="#ff2d75"/>
        <text x="80" y="153" text-anchor="middle" fill="white" font-size="15" font-family="Arial">
          ${esc(name).slice(0,1)}
        </text>
      </svg>
    `);
}


function avatarSrc(value){
  if(!value){
    return fallbackAvatar("V");
  }
  return String(value);
}


/* =========================================================
   FILTERS (expanded with Snapchat-inspired styles)
========================================================= */

const FILTERS = [
  { id:"none", name:"Original", css:"none" },
  { id:"vivid", name:"Vivid", css:"saturate(1.6) contrast(1.1)" },
  { id:"warm", name:"Warm", css:"sepia(.25) saturate(1.3) brightness(1.05)" },
  { id:"cool", name:"Cool", css:"hue-rotate(15deg) saturate(1.2) brightness(1.05)" },
  { id:"noir", name:"Noir", css:"grayscale(1) contrast(1.2)" },
  { id:"vintage", name:"Vintage", css:"sepia(.45) contrast(1.1) brightness(.95)" },
  { id:"fade", name:"Fade", css:"contrast(.85) brightness(1.1) saturate(.8)" },
  { id:"drama", name:"Drama", css:"contrast(1.4) saturate(1.2)" },
  { id:"glow", name:"Glow", css:"brightness(1.15) contrast(1.05) saturate(1.3)" },
  { id:"cinema", name:"Cinema", css:"contrast(1.25) saturate(.9) brightness(.95)" },
  { id:"retro", name:"Retro", css:"sepia(.5) contrast(1.2) saturate(1.4)" },
  { id:"neon", name:"Neon", css:"saturate(1.8) contrast(1.2) hue-rotate(300deg)" },

  // Snapchat-inspired approximations
  { id:"beauty", name:"Beauty", css:"brightness(1.12) contrast(1.05) saturate(1.15)" },
  { id:"soft", name:"Soft Glow", css:"brightness(1.1) contrast(.9) saturate(1.1)" },
  { id:"sunset", name:"Sunset", css:"sepia(.35) saturate(1.4) brightness(1.05) hue-rotate(-10deg)" },
  { id:"ocean", name:"Ocean", css:"hue-rotate(180deg) saturate(1.3) brightness(1.05)" },
  { id:"candy", name:"Candy", css:"saturate(1.7) brightness(1.1) contrast(1.05)" },
  { id:"moody", name:"Moody", css:"contrast(1.35) brightness(.9) saturate(.85)" },
  { id:"golden", name:"Golden Hour", css:"sepia(.4) saturate(1.35) brightness(1.08)" },
  { id:"icy", name:"Icy", css:"hue-rotate(190deg) saturate(1.2) brightness(1.1) contrast(1.1)" },
  { id:"pink", name:"Pink Dream", css:"hue-rotate(300deg) saturate(1.4) brightness(1.05)" },
  { id:"sharp", name:"Sharp", css:"contrast(1.5) saturate(1.1)" }
];


function getFilterCss(id){
  return (
    FILTERS.find(filter => filter.id === id)?.css || "none"
  );
}


/* =========================================================
   BUILT-IN MUSIC
========================================================= */

const BUILTIN_TRACKS = [
  {
    id:"bz1",
    title:"Night Pulse",
    artist:"Vidora Beatz",
    category:"Beatz",
    audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },
  {
    id:"bz2",
    title:"Chrome Drive",
    artist:"Vidora Beatz",
    category:"Beatz",
    audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
  },
  {
    id:"bz3",
    title:"Low Rider",
    artist:"Vidora Beatz",
    category:"Beatz",
    audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
  },
  {
    id:"dr1",
    title:"UK Slide",
    artist:"Vidora Drills",
    category:"Drills",
    audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"
  },
  {
    id:"dr2",
    title:"Dark Lane",
    artist:"Vidora Drills",
    category:"Drills",
    audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"
  },
  {
    id:"dr3",
    title:"Cold Blocks",
    artist:"Vidora Drills",
    category:"Drills",
    audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3"
  },
  {
    id:"fk1",
    title:"Groovy Lane",
    artist:"Vidora Funk",
    category:"Funk",
    audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3"
  },
  {
    id:"fk2",
    title:"Bass Pocket",
    artist:"Vidora Funk",
    category:"Funk",
    audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"
  },
  {
    id:"fk3",
    title:"Electric Soul",
    artist:"Vidora Funk",
    category:"Funk",
    audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  }
];

window._musicTracks = [...BUILTIN_TRACKS];


/* =========================================================
   MEDIA UPLOAD
========================================================= */

async function uploadMedia(file, folder="posts"){
  if(!user){
    throw new Error("You must be logged in.");
  }
  if(!file){
    throw new Error("No file selected.");
  }

  const allowed =
    file.type.startsWith("image/") ||
    file.type.startsWith("video/") ||
    file.type.startsWith("audio/");

  if(!allowed){
    throw new Error("This file type is not supported.");
  }

  const extension =
    file.name?.includes(".")
    ? file.name.split(".").pop().toLowerCase()
    : "bin";

  const path =
    `\( {folder}/ \){user.id}/\( {Date.now()}- \){Math.random()
      .toString(36)
      .slice(2,9)}.${extension}`;

  const { data, error } =
    await sb.storage
      .from("media")
      .upload(path, file, {
        cacheControl:"3600",
        upsert:false,
        contentType:file.type || undefined
      });

  if(error){
    throw error;
  }

  const { data: publicData } =
    sb.storage.from("media").getPublicUrl(data.path);

  if(!publicData?.publicUrl){
    throw new Error("Could not create media URL.");
  }

  return publicData.publicUrl;
}


/* =========================================================
   AUTH INITIALIZATION
========================================================= */

async function init(){
  if(authListenerReady) return;
  authListenerReady = true;

  console.log("VIDORA: initializing...");

  try{
    const { data, error } = await sb.auth.getSession();
    if(error) throw error;

    if(data?.session?.user){
      await enterApp(data.session.user);
    }else{
      $("app")?.classList.add("hidden");
      $("authScreen")?.classList.remove("hidden");
    }
  }catch(error){
    console.error("VIDORA INIT ERROR:", error);
    $("app")?.classList.add("hidden");
    $("authScreen")?.classList.remove("hidden");
    showStatus($("authStatus"), safeError(error, "Unable to connect to Vidora."));
  }

  sb.auth.onAuthStateChange(async(event, session)=>{
    console.log("AUTH EVENT:", event);

    if((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user){
      if(!user || user.id !== session.user.id){
        await enterApp(session.user);
      }
    }

    if(event === "SIGNED_OUT"){
      user = null;
      profile = null;
      stopStoryAudio();
      $("app")?.classList.add("hidden");
      $("authScreen")?.classList.remove("hidden");
    }
  });
}


/* =========================================================
   ENTER APP
========================================================= */

async function enterApp(currentUser){
  if(!currentUser) return;

  if(appStarting && user?.id === currentUser.id) return;

  appStarting = true;
  user = currentUser;

  $("authScreen")?.classList.add("hidden");
  $("app")?.classList.remove("hidden");

  try{
    await loadProfile();
    await loadNotifications();
    await renderView("home");
  }catch(error){
    console.error("ENTER APP ERROR:", error);
    toast(safeError(error, "Unable to load Vidora."));
  }finally{
    appStarting = false;
  }
}


/* =========================================================
   PROFILE
========================================================= */

async function loadProfile(){
  if(!user) return;

  const { data, error } =
    await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if(error){
    console.warn("PROFILE:", error);
    return;
  }
  profile = data;
}


/* =========================================================
   LOGIN
========================================================= */

async function login(){
  const emailInput = $("loginEmail");
  const passwordInput = $("loginPassword");
  const button = $("loginBtn");
  const status = $("authStatus");

  const email = emailInput?.value?.trim() || "";
  const password = passwordInput?.value || "";

  if(!email){
    showStatus(status, "Enter your email.");
    return;
  }
  if(!password){
    showStatus(status, "Enter your password.");
    return;
  }

  if(button){
    button.disabled = true;
    button.textContent = "Signing in...";
  }

  showStatus(status, "Signing in...", true);

  try{
    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    if(error){
      console.error("SUPABASE LOGIN ERROR:", error);
      showStatus(status, safeError(error, "Login failed."));
      return;
    }

    if(!data?.user){
      throw new Error("Login succeeded but no user was returned.");
    }

    showStatus(status, "Login successful.", true);
    await enterApp(data.user);

  }catch(error){
    console.error("LOGIN ERROR:", error);
    showStatus(status, safeError(error, "Unable to login. Check your internet connection."));
  }finally{
    if(button){
      button.disabled = false;
      button.textContent = "Login";
    }
  }
}


/* =========================================================
   SIGNUP
========================================================= */

async function signup(){
  const displayName = $("signupDisplayName")?.value?.trim() || "";
  const username = $("signupUsername")?.value?.trim().toLowerCase() || "";
  const age = Number($("signupAge")?.value || 0);
  const email = $("signupEmail")?.value?.trim() || "";
  const password = $("signupPassword")?.value || "";
  const confirmPassword = $("signupPasswordConfirm")?.value || "";
  const status = $("authStatus");
  const button = $("signupBtn");

  if(!displayName || !username || !age || !email || !password || !confirmPassword){
    showStatus(status, "Complete all signup fields.");
    return;
  }
  if(age < 13){
    showStatus(status, "You must be at least 13 to use Vidora.");
    return;
  }
  if(password.length < 6){
    showStatus(status, "Password must be at least 6 characters.");
    return;
  }
  if(password !== confirmPassword){
    showStatus(status, "Passwords do not match.");
    return;
  }

  if(button){
    button.disabled = true;
    button.textContent = "Creating...";
  }

  showStatus(status, "Creating your account...", true);

  try{
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options:{
        data:{ username, display_name:displayName, age }
      }
    });

    if(error){
      console.error("SUPABASE SIGNUP ERROR:", error);
      showStatus(status, safeError(error, "Unable to create account."));
      return;
    }

    if(!data?.user){
      throw new Error("Account could not be created.");
    }

    const { error: profileError } = await sb.from("profiles").upsert({
      id: data.user.id,
      username,
      display_name: displayName
    });

    if(profileError){
      console.warn("PROFILE UPSERT:", profileError);
    }

    if(data.session){
      showStatus(status, "Account created successfully.", true);
      await enterApp(data.user);
    }else{
      showStatus(status, "Account created. Check your email to confirm your account.", true);
    }

  }catch(error){
    console.error("SIGNUP ERROR:", error);
    showStatus(status, safeError(error, "Unable to create account."));
  }finally{
    if(button){
      button.disabled = false;
      button.textContent = "Create account";
    }
  }
}


/* =========================================================
   NAVIGATION
========================================================= */

async function renderView(view){
  if(!user) return;

  currentView = view || "home";

  document.querySelectorAll(".nav button").forEach(button=>{
    button.classList.toggle("active", button.dataset.view === currentView);
  });

  if(currentView === "home") return renderHome();
  if(currentView === "discover") return renderDiscover();
  if(currentView === "create") return renderCreate();
  if(currentView === "messages") return renderMessages();
  if(currentView === "profile") return renderProfile(user.id);

  return renderHome();
}


/* =========================================================
   BLOCKS
========================================================= */

async function blockedIds(){
  if(!user) return new Set();

  const { data, error } =
    await sb.from("blocks").select("blocked_id").eq("blocker_id", user.id);

  if(error) return new Set();
  return new Set((data || []).map(item => item.blocked_id));
}


/* =========================================================
   HOME
========================================================= */

async function renderHome(){
  const main = $("main");
  if(!main) return;

  main.innerHTML = `
    <section class="panel">
      <div class="title">Stories</div>
      <div id="stories" class="storybar">Loading stories...</div>
    </section>
    <div id="feed">Loading feed...</div>
  `;

  await renderStories();

  const { data, error } = await sb
    .from("posts")
    .select("id,user_id,media_url,media_type,caption,created_at,music_id,filter")
    .order("created_at", {ascending:false})
    .limit(40);

  if(error){
    console.error("POST LOAD:", error);
    $("feed").innerHTML = `
      <div class="panel">
        <b>Unable to load posts.</b>
        <div class="muted">${esc(safeError(error))}</div>
      </div>
    `;
    return;
  }

  let posts = data || [];
  const blocked = await blockedIds();
  posts = posts.filter(post => !blocked.has(post.user_id));

  const html = await Promise.all(posts.map(renderPost));
  $("feed").innerHTML = html.join("") || `
    <div class="panel muted">No posts yet. Be the first to post.</div>
  `;
}


/* =========================================================
   RENDER POST (TikTok-style music playback)
========================================================= */

async function renderPost(post){
  let author = null;
  let likes = 0;
  let comments = 0;
  let liked = false;
  let track = null;

  const authorResult = await sb
    .from("profiles")
    .select("username,display_name,avatar_url")
    .eq("id", post.user_id)
    .maybeSingle();
  author = authorResult.data || null;

  const likeResult = await sb
    .from("post_likes")
    .select("*", { count:"exact", head:true })
    .eq("post_id", post.id);
  likes = likeResult.count || 0;

  const commentResult = await sb
    .from("comments")
    .select("*", { count:"exact", head:true })
    .eq("post_id", post.id);
  comments = commentResult.count || 0;

  const likedResult = await sb
    .from("post_likes")
    .select("id")
    .eq("post_id", post.id)
    .eq("user_id", user.id)
    .maybeSingle();
  liked = !!likedResult.data;

  if(post.music_id){
    try{
      const result = await sb
        .from("tracks")
        .select("id,title,artist,audio_url,category")
        .eq("id", post.music_id)
        .maybeSingle();
      if(!result.error) track = result.data;
    }catch(e){}
  }

  // fallback to built-in
  if(!track && post.music_id){
    track = findMusic(post.music_id);
  }

  const filterCss = getFilterCss(post.filter || "none");

  const media =
    post.media_type === "video"
    ? `
      <video
        class="post-media"
        controls
        playsinline
        preload="metadata"
        muted="${track ? "true" : "false"}"
        style="filter:${filterCss}"
        src="${esc(post.media_url)}"
        onplay="onPostMediaPlay(this, '${esc(track?.audio_url || "")}')"
        onpause="onPostMediaPause(this)"
        onended="onPostMediaPause(this)">
      </video>
    `
    : `
      <img
        class="post-media"
        loading="lazy"
        style="filter:${filterCss}"
        src="${esc(post.media_url)}"
        alt="Vidora post"
        onclick="playPostMusic('${esc(track?.audio_url || "")}', this)">
    `;

  const music =
    track
    ? `
      <div class="panel music-info" style="margin-top:8px">
        🎵 <b>${esc(track.title || "Track")}</b>
        \( {track.artist ? `<div class="muted"> \){esc(track.artist)}</div>` : ""}
        <audio
          class="post-audio"
          data-post-id="${esc(post.id)}"
          preload="none"
          loop
          style="display:none"
          src="${esc(track.audio_url || "")}">
        </audio>
      </div>
    `
    : "";

  return `
    <article class="card" data-post-id="${esc(post.id)}">
      <div class="row">
        <img class="avatar sm" src="${avatarSrc(author?.avatar_url)}" alt="">
        <div>
          <b>${esc(author?.display_name || author?.username || "User")}</b>
          <div class="muted">@${esc(author?.username || "user")}</div>
        </div>
        <span class="spacer"></span>
        ${
          post.user_id === user.id
          ? `<button class="iconbtn" onclick="deletePost('${esc(post.id)}')">🗑</button>`
          : ""
        }
      </div>

      ${media}
      ${music}

      ${
        post.caption
        ? `<div style="margin-top:9px;white-space:pre-wrap;word-break:break-word;">${esc(post.caption)}</div>`
        : ""
      }

      <div class="post-actions">
        <button class="\( {liked ? "active" : ""}" onclick="toggleLike(' \){esc(post.id)}')">♥ ${likes}</button>
        <button onclick="openComments('${esc(post.id)}')">💬 ${comments}</button>
        <button onclick="sharePost('${esc(post.id)}')">↗ Share</button>
      </div>
    </article>
  `;
}


/* =========================================================
   POST MUSIC PLAYBACK (TikTok style)
========================================================= */

function onPostMediaPlay(videoEl, audioUrl){
  if(!audioUrl) return;
  // Pause other audios
  document.querySelectorAll(".post-audio").forEach(a => {
    if(!a.paused) a.pause();
  });
  const audio = videoEl.closest("article")?.querySelector(".post-audio");
  if(audio){
    audio.currentTime = 0;
    audio.play().catch(()=>{});
  }
}

function onPostMediaPause(videoEl){
  const audio = videoEl.closest("article")?.querySelector(".post-audio");
  if(audio) audio.pause();
}

function playPostMusic(audioUrl, imgEl){
  if(!audioUrl) return;
  document.querySelectorAll(".post-audio").forEach(a => {
    if(!a.paused) a.pause();
  });
  const audio = imgEl.closest("article")?.querySelector(".post-audio");
  if(audio){
    if(audio.paused){
      audio.currentTime = 0;
      audio.play().catch(()=>{});
      toast("Playing music with post");
    }else{
      audio.pause();
    }
  }
}


/* =========================================================
   STORIES
========================================================= */

async function renderStories(){
  const box = $("stories");
  if(!box) return;

  const { data, error } = await sb
    .from("stories")
    .select("*")
    .order("created_at", {ascending:false})
    .limit(50);

  if(error){
    console.warn("STORIES:", error);
    box.innerHTML = `<span class="muted">No stories available.</span>`;
    return;
  }

  storyItems = data || [];
  const users = [...new Set(storyItems.map(s => s.user_id))];
  const profiles = {};

  if(users.length){
    const { data: profileData } = await sb
      .from("profiles")
      .select("id,username,display_name,avatar_url")
      .in("id", users);
    (profileData || []).forEach(item => { profiles[item.id] = item; });
  }

  const groups = {};
  storyItems.forEach(story => {
    if(!groups[story.user_id]) groups[story.user_id] = [];
    groups[story.user_id].push(story);
  });

  box.innerHTML =
    Object.entries(groups).map(([id]) => {
      const p = profiles[id] || {};
      return `
        <button class="storyitem" onclick="openStoryUser('${esc(id)}')">
          <div class="storyring">
            <img src="${avatarSrc(p.avatar_url)}" alt="">
          </div>
          <small>${esc(p.username || p.display_name || "Story")}</small>
        </button>
      `;
    }).join("") || `<span class="muted">No stories yet.</span>`;
}


async function openStoryUser(id){
  const stories = storyItems.filter(s => s.user_id === id);
  if(!stories.length) return toast("Story unavailable.");
  storyIndex = 0;
  window.currentStorySet = stories;
  openStory(stories, 0);
}


function stopStoryAudio(){
  if(!storyAudio) return;
  try{
    storyAudio.pause();
    storyAudio.currentTime = 0;
    storyAudio.src = "";
  }catch(e){}
  storyAudio = null;
}


function openStory(stories, index){
  if(!stories?.length) return;
  const story = stories[index];
  if(!story) return;

  stopStoryAudio();

  const filterCss = getFilterCss(story.filter || "none");

  const media =
    story.media_type === "video"
    ? `
      <video
        class="post-media story-media"
        controls
        autoplay
        playsinline
        style="filter:${filterCss}"
        src="${esc(story.media_url)}">
      </video>
    `
    : `
      <img
        class="post-media story-media"
        style="filter:${filterCss}"
        src="${esc(story.media_url)}"
        alt="Story">
    `;

  const track = story.music_id ? findMusic(story.music_id) : null;

  $("sheet").innerHTML = `
    <div class="row">
      <b>Story \( {index + 1}/ \){stories.length}</b>
      <span class="spacer"></span>
      <button class="iconbtn" onclick="closeModal()">×</button>
    </div>

    ${media}

    ${
      track
      ? `
        <div class="panel">
          🎵 <b>${esc(track.title)}</b>
          <div class="muted">${esc(track.artist || "")}</div>
        </div>
      `
      : ""
    }

    <div class="row wrap">
      <button class="btn" onclick="storyMove(${index - 1})" ${index <= 0 ? "disabled" : ""}>← Prev</button>
      <button class="btn" onclick="storyMove(${index + 1})" ${index >= stories.length - 1 ? "disabled" : ""}>Next →</button>
      ${
        story.user_id === user.id
        ? `<button class="btn danger" onclick="deleteStory('${esc(story.id)}')">Delete</button>`
        : ""
      }
    </div>
  `;

  $("modal")?.classList.remove("hidden");

  // WhatsApp-style background music
  if(track?.audio_url){
    try{
      storyAudio = new Audio(track.audio_url);
      storyAudio.loop = true;
      storyAudio.volume = 0.85;
      storyAudio.play().catch(()=>{});
    }catch(e){}
  }
}


function storyMove(index){
  const stories = window.currentStorySet || [];
  if(index < 0 || index >= stories.length) return;
  storyIndex = index;
  openStory(stories, index);
}


async function deleteStory(id){
  if(!user || !id) return;
  if(!confirm("Delete this story?")) return;

  const { error } = await sb
    .from("stories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if(error){
    return toast(safeError(error, "Unable to delete story."));
  }

  toast("Story deleted.");
  closeModal();
  await renderView("home");
}


/* =========================================================
   CREATE
========================================================= */

async function renderCreate(){
  $("main").innerHTML = `
    <section class="panel">
      <div class="title">Create Post</div>

      <input id="createFile" class="field" type="file" accept="image/*,video/*">

      <div id="createPreview" class="hidden"></div>

      <textarea id="createCaption" class="field" maxlength="2000" placeholder="Write a caption..."></textarea>

      <div class="title">Filters</div>
      <div class="row wrap">
        ${FILTERS.map(f => `
          <button class="btn" onclick="selectFilter('\( {f.id}')"> \){esc(f.name)}</button>
        `).join("")}
      </div>

      <div class="title">Music</div>
      <div id="musicList">Loading music...</div>

      <!-- Custom song upload -->
      <div class="panel" style="margin-top:12px">
        <div class="title">Upload your own song</div>
        <input id="customSongFile" class="field" type="file" accept="audio/*">
        <input id="customSongTitle" class="field" placeholder="Song title (optional)">
        <button class="btn" onclick="uploadCustomSong(false)">Upload Song for Posts</button>
      </div>

      <button class="btn primary full" onclick="publishPost()">🚀 Publish to Vidora</button>
    </section>

    <section class="panel">
      <div class="title">Create Story</div>

      <input id="storyFile" class="field" type="file" accept="image/*,video/*">

      <div class="title">Story Filters</div>
      <div class="row wrap">
        ${FILTERS.map(f => `
          <button class="btn" onclick="selectStoryFilter('\( {f.id}')"> \){esc(f.name)}</button>
        `).join("")}
      </div>

      <div class="title">Story Music</div>
      <div id="storyMusicList">Loading music...</div>

      <div class="panel" style="margin-top:12px">
        <div class="title">Upload your own song for Story</div>
        <input id="customStorySongFile" class="field" type="file" accept="audio/*">
        <input id="customStorySongTitle" class="field" placeholder="Song title (optional)">
        <button class="btn" onclick="uploadCustomSong(true)">Upload Song for Stories</button>
      </div>

      <button class="btn primary full" onclick="publishStory()">📖 Publish Story</button>
    </section>
  `;

  await loadMusic();
}


/* =========================================================
   FILTER SELECTION
========================================================= */

function selectFilter(id){
  selectedFilter = id || "none";
  toast("Post filter: " + (FILTERS.find(f => f.id === id)?.name || "Original"));
}

function selectStoryFilter(id){
  selectedStoryFilter = id || "none";
  toast("Story filter: " + (FILTERS.find(f => f.id === id)?.name || "Original"));
}


/* =========================================================
   MUSIC
========================================================= */

async function loadMusic(){
  let tracks = [...BUILTIN_TRACKS];

  try{
    const { data, error } = await sb
      .from("tracks")
      .select("id,title,artist,audio_url,category")
      .limit(100);

    if(!error && data?.length){
      tracks = [...data, ...BUILTIN_TRACKS];
    }
  }catch(e){
    console.warn("TRACKS:", e);
  }

  window._musicTracks = tracks;

  const categories = ["All", ...new Set(tracks.map(t => t.category || "Other"))];

  function renderMusicList(target, story=false){
    if(!target) return;

    const selectedCategory = story ? "All" : musicCategory;
    const filtered = tracks.filter(t =>
      selectedCategory === "All" || (t.category || "Other") === selectedCategory
    );

    target.innerHTML = `
      <div class="row wrap">
        ${categories.map(c => `
          <button class="btn" onclick="setMusicCategory('\( {esc(c)}')"> \){esc(c)}</button>
        `).join("")}
      </div>
      ${filtered.map(track => `
        <button class="panel" style="width:100%;text-align:left;cursor:pointer;margin-bottom:6px;"
          onclick="\( {story ? `selectStoryMusic(' \){esc(track.id)}')` : `selectMusic('${esc(track.id)}')`}">
          🎵 <b>${esc(track.title || "Track")}</b>
          <div class="muted">${esc(track.artist || "Vidora")}</div>
        </button>
      `).join("")}
    `;
  }

  renderMusicList($("musicList"), false);
  renderMusicList($("storyMusicList"), true);
}


function setMusicCategory(category){
  musicCategory = category || "All";
  loadMusic();
}


function findMusic(id){
  return (
    window._musicTracks?.find(t => String(t.id) === String(id)) ||
    BUILTIN_TRACKS.find(t => String(t.id) === String(id)) ||
    null
  );
}


async function selectMusic(id){
  const track = findMusic(id);
  if(!track) return toast("Track not found.");
  selectedMusic = track;
  toast("Selected: " + (track.title || "Track"));
}


async function selectStoryMusic(id){
  const track = findMusic(id);
  if(!track) return toast("Track not found.");
  selectedStoryMusic = track;
  toast("Story music selected.");
}


/* =========================================================
   CUSTOM SONG UPLOAD
========================================================= */

async function uploadCustomSong(forStory = false){
  if(!user) return toast("You must be logged in.");

  const fileInput = forStory ? $("customStorySongFile") : $("customSongFile");
  const titleInput = forStory ? $("customStorySongTitle") : $("customSongTitle");
  const file = fileInput?.files?.[0];
  const title = titleInput?.value?.trim() || "My Custom Track";

  if(!file) return toast("Choose an audio file.");
  if(!file.type.startsWith("audio/")) return toast("Please choose an audio file.");
  if(file.size > 20 * 1024 * 1024) return toast("Max song size is 20MB.");

  try{
    toast("Uploading your song...");

    const audioUrl = await uploadMedia(file, "music");

    // Try to save to tracks table
    let trackId = "custom_" + Date.now();

    try{
      const { data, error } = await sb.from("tracks").insert({
        title,
        artist: profile?.display_name || profile?.username || "You",
        audio_url: audioUrl,
        category: "Custom",
        user_id: user.id
      }).select().single();

      if(!error && data){
        trackId = data.id;
      }
    }catch(e){
      console.warn("Could not insert into tracks table, using temporary id");
    }

    const customTrack = {
      id: trackId,
      title,
      artist: profile?.display_name || profile?.username || "You",
      category: "Custom",
      audio_url: audioUrl
    };

    // Add to local list
    window._musicTracks = [customTrack, ...(window._musicTracks || [])];

    if(forStory){
      selectedStoryMusic = customTrack;
      toast("Song ready for your story!");
    }else{
      selectedMusic = customTrack;
      toast("Song ready for your post!");
    }

    // Refresh lists
    await loadMusic();

  }catch(error){
    console.error("CUSTOM SONG ERROR:", error);
    toast("Upload failed: " + safeError(error));
  }
}


/* =========================================================
   PUBLISH POST
========================================================= */

async function publishPost(){
  if(!user) return toast("You are not logged in.");

  const file = $("createFile")?.files?.[0];
  const caption = $("createCaption")?.value?.trim() || "";

  if(!file) return toast("Choose an image or video.");
  if(!file.type.startsWith("image/") && !file.type.startsWith("video/")){
    return toast("Please choose an image or video.");
  }
  if(file.size > 50 * 1024 * 1024) return toast("Maximum upload size is 50MB.");

  try{
    toast("Uploading post...");

    const mediaUrl = await uploadMedia(file, "posts");
    const mediaType = file.type.startsWith("video/") ? "video" : "image";

    const basicPost = {
      user_id: user.id,
      media_url: mediaUrl,
      media_type: mediaType,
      caption
    };

    let result = await sb.from("posts").insert(basicPost).select().single();

    if(result.error){
      console.error("POST INSERT:", result.error);
      throw result.error;
    }

    // Optional music + filter
    if(selectedMusic?.id || selectedFilter !== "none"){
      try{
        const optionalUpdate = {};
        if(selectedMusic?.id) optionalUpdate.music_id = selectedMusic.id;
        if(selectedFilter !== "none") optionalUpdate.filter = selectedFilter;

        if(Object.keys(optionalUpdate).length){
          await sb.from("posts").update(optionalUpdate).eq("id", result.data.id);
        }
      }catch(e){
        console.warn("Optional post features unavailable:", e);
      }
    }

    selectedMusic = null;
    selectedFilter = "none";

    if($("createFile")) $("createFile").value = "";
    if($("createCaption")) $("createCaption").value = "";

    toast("Post published successfully!");
    await renderView("home");

  }catch(error){
    console.error("PUBLISH POST ERROR:", error);
    toast("Post failed: " + safeError(error, "Unable to publish post."));
  }
}


/* =========================================================
   PUBLISH STORY
========================================================= */

async function publishStory(){
  if(!user) return toast("You are not logged in.");

  const file = $("storyFile")?.files?.[0];
  if(!file) return toast("Choose a photo or video.");
  if(!file.type.startsWith("image/") && !file.type.startsWith("video/")){
    return toast("Please choose an image or video.");
  }
  if(file.size > 50 * 1024 * 1024) return toast("Maximum upload size is 50MB.");

  try{
    toast("Uploading story...");

    const mediaUrl = await uploadMedia(file, "stories");
    const mediaType = file.type.startsWith("video/") ? "video" : "image";

    const basicStory = {
      user_id: user.id,
      media_url: mediaUrl,
      media_type: mediaType
    };

    let result = await sb.from("stories").insert(basicStory).select().single();

    if(result.error){
      console.error("STORY INSERT:", result.error);
      throw result.error;
    }

    if(selectedStoryMusic?.id || selectedStoryFilter !== "none"){
      try{
        const optionalStory = {};
        if(selectedStoryMusic?.id) optionalStory.music_id = selectedStoryMusic.id;
        if(selectedStoryFilter !== "none") optionalStory.filter = selectedStoryFilter;

        if(Object.keys(optionalStory).length){
          await sb.from("stories").update(optionalStory).eq("id", result.data.id);
        }
      }catch(e){
        console.warn("Optional story features unavailable:", e);
      }
    }

    selectedStoryMusic = null;
    selectedStoryFilter = "none";
    if($("storyFile")) $("storyFile").value = "";

    toast("Story published successfully!");
    await renderView("home");

  }catch(error){
    console.error("PUBLISH STORY ERROR:", error);
    toast("Story failed: " + safeError(error, "Unable to publish story."));
  }
}


/* =========================================================
   DELETE POST
========================================================= */

async function deletePost(id){
  if(!user || !id) return;
  if(!confirm("Delete this post?")) return;

  const { error } = await sb
    .from("posts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if(error) return toast(safeError(error, "Unable to delete post."));
  toast("Post deleted.");
  await renderView(currentView);
}


/* =========================================================
   LIKES
========================================================= */

async function toggleLike(postId){
  if(!user) return;

  const { data, error } = await sb
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if(error) return toast(safeError(error));

  if(data){
    const { error: deleteError } = await sb.from("post_likes").delete().eq("id", data.id);
    if(deleteError) return toast(safeError(deleteError));
  }else{
    const { error: insertError } = await sb.from("post_likes").insert({
      post_id: postId,
      user_id: user.id
    });
    if(insertError) return toast(safeError(insertError));
  }

  await renderView(currentView);
}


/* =========================================================
   COMMENTS
========================================================= */

async function openComments(postId){
  commentsPost = postId;

  const { data, error } = await sb
    .from("comments")
    .select("id,user_id,content,created_at")
    .eq("post_id", postId)
    .order("created_at", {ascending:true});

  if(error) return toast(safeError(error));

  const comments = data || [];

  $("sheet").innerHTML = `
    <div class="row">
      <b>Comments</b>
      <span class="spacer"></span>
      <button class="iconbtn" onclick="closeModal()">×</button>
    </div>

    <div id="commentList">
      ${
        comments.map(c => `
          <div class="panel">
            <b>Comment</b>
            <div style="margin-top:6px;white-space:pre-wrap;word-break:break-word;">
              ${esc(c.content)}
            </div>
            ${c.user_id === user.id ? `
              <button class="iconbtn" onclick="deleteComment('${esc(c.id)}')">🗑</button>
            ` : ""}
          </div>
        `).join("") || `<div class="muted">No comments yet.</div>`
      }
    </div>

    <div class="row">
      <input id="commentInput" class="field" maxlength="500" placeholder="Write a comment...">
      <button class="btn" onclick="addComment()">Send</button>
    </div>
  `;

  $("modal")?.classList.remove("hidden");
}


async function addComment(){
  if(!user || !commentsPost) return;
  const input = $("commentInput");
  const content = input?.value?.trim() || "";
  if(!content) return;
  if(content.length > 500) return toast("Comment is too long.");

  const { error } = await sb.from("comments").insert({
    post_id: commentsPost,
    user_id: user.id,
    content
  });

  if(error) return toast(safeError(error));
  await openComments(commentsPost);
}


async function deleteComment(id){
  if(!user || !id) return;

  const { error } = await sb
    .from("comments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if(error) return toast(safeError(error));
  await openComments(commentsPost);
}


/* =========================================================
   SHARE
========================================================= */

async function sharePost(postId){
  const url = window.location.href.split("#")[0] + "#post-" + postId;

  try{
    if(navigator.share){
      await navigator.share({
        title: "Vidora",
        text: "Check out this Vidora post.",
        url
      });
    }else if(navigator.clipboard){
      await navigator.clipboard.writeText(url);
      toast("Post link copied.");
    }else{
      toast("Sharing is not supported on this browser.");
    }
  }catch(e){
    console.log("SHARE:", e);
  }
}


/* =========================================================
   DISCOVER
========================================================= */

async function renderDiscover(){
  $("main").innerHTML = `
    <section class="panel">
      <div class="title">Discover</div>
      <input id="userSearch" class="field" placeholder="Search users...">
      <div id="discoverResults">Search for users.</div>
    </section>
  `;

  $("userSearch")?.addEventListener("input", event => {
    clearTimeout(window.__vidoraSearchTimer);
    window.__vidoraSearchTimer = setTimeout(() => {
      searchUsers(event.target.value);
    }, 350);
  });
}


async function searchUsers(query){
  const box = $("discoverResults");
  if(!box) return;

  query = String(query || "").trim();
  if(!query){
    box.innerHTML = "Search for users.";
    return;
  }

  const { data, error } = await sb
    .from("profiles")
    .select("id,username,display_name,avatar_url")
    .or(`username.ilike.%\( {query}%,display_name.ilike.% \){query}%`)
    .limit(30);

  if(error){
    box.innerHTML = esc(safeError(error));
    return;
  }

  box.innerHTML =
    (data || []).map(person => `
      <div class="panel row">
        <img class="avatar sm" src="${avatarSrc(person.avatar_url)}" alt="">
        <div>
          <b>${esc(person.display_name || person.username || "User")}</b>
          <div class="muted">@${esc(person.username || "user")}</div>
        </div>
        <span class="spacer"></span>
        ${
          person.id !== user.id
          ? `<button class="btn" onclick="toggleFollow('${esc(person.id)}')">Follow</button>`
          : ""
        }
      </div>
    `).join("") || `<div class="muted">No users found.</div>`;
}


/* =========================================================
   FOLLOW
========================================================= */

async function toggleFollow(targetId){
  if(!user || !targetId) return;

  const { data, error } = await sb
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", targetId)
    .maybeSingle();

  if(error) return toast(safeError(error));

  if(data){
    await sb.from("follows").delete().eq("id", data.id);
    toast("Unfollowed.");
  }else{
    const { error: followError } = await sb.from("follows").insert({
      follower_id: user.id,
      following_id: targetId
    });
    if(followError) return toast(safeError(followError));
    toast("Following.");
  }
}


/* =========================================================
   PROFILE
========================================================= */

async function renderProfile(id){
  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if(error){
    \( ("main").innerHTML = `<div class="panel"> \){esc(safeError(error))}</div>`;
    return;
  }

  const p = data || profile || {};

  $("main").innerHTML = `
    <section class="panel">
      <div style="text-align:center">
        <img class="avatar lg" src="${avatarSrc(p.avatar_url)}" alt="">
        <h2>${esc(p.display_name || p.username || "User")}</h2>
        <div class="muted">@${esc(p.username || "user")}</div>
        \( {p.bio ? `<p class="muted"> \){esc(p.bio)}</p>` : ""}
        ${
          id === user.id
          ? `
            <button class="btn" onclick="renderAvatarPicker()">Change Avatar</button>
            <button class="btn danger" onclick="logout()">Logout</button>
          `
          : ""
        }
      </div>
    </section>
  `;
}


/* =========================================================
   VIDORA AVATAR SYSTEM
========================================================= */

const VIDORA_AVATARS = [
  { name: "Nova", file: "avatars/nova.png" },
  { name: "Zeno", file: "avatars/zeno.png" },
  { name: "Luna", file: "avatars/luna.png" },
  { name: "Kai", file: "avatars/kai.png" },
  { name: "Sage", file: "avatars/sage.png" },
  { name: "Rex", file: "avatars/rex.png" },
  { name: "Ivy", file: "avatars/ivy.png" },
  { name: "Orion", file: "avatars/orion.png" },
  { name: "Pixel", file: "avatars/pixel.png" },
  { name: "Vexa", file: "avatars/vexa.png" },
  { name: "Axel", file: "avatars/axel.png" },
  { name: "Jett", file: "avatars/jett.png" },
  { name: "Neo", file: "avatars/neo.png" },
  { name: "Skye", file: "avatars/skye.png" },
  { name: "Blaze", file: "avatars/blaze.png" },
  { name: "Aria", file: "avatars/aria.png" },
  { name: "Kairo", file: "avatars/kairo.png" },
  { name: "Zara", file: "avatars/zara.png" },
  { name: "Nia", file: "avatars/nia.png" },
  { name: "Onyx", file: "avatars/onyx.png" }
];


async function renderAvatarPicker(){
  if(!user){
    toast("Please login first");
    return;
  }

  const currentAvatar = profile?.avatar_url || "";

  $("sheet").innerHTML = `
    <div class="sheet-head">
      <div>
        <h2>Choose Avatar</h2>
        <div class="muted">Choose a Vidora avatar or upload your own picture.</div>
      </div>
      <button class="iconbtn" type="button" onclick="closeModal()">×</button>
    </div>

    <div class="panel" style="margin-bottom:18px;padding:16px;">
      <div class="title">📷 Upload your own picture</div>
      <div class="muted" style="margin:6px 0 12px;">Use a JPG, PNG or WEBP image.</div>
      <input id="customAvatarInput" class="field" type="file"
        accept="image/png,image/jpeg,image/webp"
        onchange="handleCustomAvatar(this.files[0])">
      <div id="avatarUploadStatus" class="status" style="margin-top:10px;"></div>
    </div>

    <div class="title">✨ Vidora Avatars</div>
    <div class="avatar-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:12px;">
      ${VIDORA_AVATARS.map(avatar => {
        const selected = currentAvatar === avatar.file;
        return `
          <button type="button" onclick="saveAvatar('${avatar.file}')"
            style="position:relative;padding:6px;border-radius:16px;border:2px solid ${selected ? "var(--purple)" : "var(--border)"};background:var(--surface2);color:var(--text);cursor:pointer;overflow:hidden;">
            <img src="\( {avatar.file}" alt=" \){avatar.name}" loading="lazy"
              style="width:100%;aspect-ratio:1/1;object-fit:cover;display:block;border-radius:11px;"
              onerror="this.style.opacity='.25'">
            <div style="padding:8px 4px 6px;font-size:14px;font-weight:700;">${avatar.name}</div>
            ${selected ? `
              <span style="position:absolute;top:10px;right:10px;width:28px;height:28px;border-radius:50%;background:var(--purple);color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;">✓</span>
            ` : ""}
          </button>
        `;
      }).join("")}
    </div>
  `;
}


async function saveAvatar(filePath){
  if(!user) return toast("Please login first");

  try{
    const { error } = await sb
      .from("profiles")
      .update({ avatar_url: filePath })
      .eq("id", user.id);

    if(error) throw error;

    profile = { ...(profile || {}), avatar_url: filePath };
    toast("Avatar updated!");
    closeModal();
    await renderView("profile");
  }catch(error){
    console.error("Save avatar error:", error);
    toast(safeError(error));
  }
}


async function handleCustomAvatar(file){
  if(!file) return;
  if(!user){
    toast("Please login first");
    return;
  }

  const status = $("avatarUploadStatus");

  try{
    if(!file.type.startsWith("image/")){
      throw new Error("Please choose an image.");
    }
    if(file.size > 10 * 1024 * 1024){
      throw new Error("Profile picture must be 10MB or smaller.");
    }

    if(status) status.textContent = "Uploading profile picture...";

    const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const filePath = `avatars/\( {user.id}/ \){Date.now()}_\( {crypto.randomUUID()}. \){extension}`;

    const { error: uploadError } = await sb.storage
      .from("media")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if(uploadError) throw uploadError;

    const { data: publicData } = sb.storage.from("media").getPublicUrl(filePath);
    const avatarUrl = publicData?.publicUrl;

    if(!avatarUrl) throw new Error("Could not create profile picture URL.");

    const { error: profileError } = await sb
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);

    if(profileError) throw profileError;

    profile = { ...(profile || {}), avatar_url: avatarUrl };

    if(status) status.textContent = "Profile picture updated successfully.";
    toast("Profile picture updated");
    closeModal();
    await renderView("profile");

  }catch(error){
    console.error("Avatar upload error:", error);
    const message = safeError(error);
    if(status) status.textContent = message;
    toast(message);
  }
}


/* =========================================================
   MESSAGES
========================================================= */

async function renderMessages(){
  $("main").innerHTML = `
    <section class="panel">
      <div class="title">Messages</div>
      <div id="messageUsers">Loading...</div>
    </section>
  `;

  const { data, error } = await sb
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  if(error){
    $("messageUsers").innerHTML = `<div class="muted">Unable to load followers.</div>`;
    return;
  }

  const ids = (data || []).map(x => x.following_id);

  if(!ids.length){
    $("messageUsers").innerHTML = `<div class="muted">Follow users to start chatting.</div>`;
    return;
  }

  const { data: people } = await sb
    .from("profiles")
    .select("id,username,display_name,avatar_url")
    .in("id", ids);

  $("messageUsers").innerHTML =
    (people || []).map(person => `
      <button class="panel row" style="width:100%;text-align:left;" onclick="openChat('${esc(person.id)}')">
        <img class="avatar sm" src="${avatarSrc(person.avatar_url)}" alt="">
        <div>
          <b>${esc(person.display_name || person.username || "User")}</b>
          <div class="muted">@${esc(person.username || "user")}</div>
        </div>
      </button>
    `).join("");
}


async function openChat(userId){
  const { data: person } = await sb
    .from("profiles")
    .select("id,username,display_name")
    .eq("id", userId)
    .maybeSingle();

  chatUser = person;

  const { data: messages, error } = await sb
    .from("messages")
    .select("id,sender_id,receiver_id,content,voice_url,created_at")
    .or(`and(sender_id.eq.\( {user.id},receiver_id.eq. \){userId}),and(sender_id.eq.\( {userId},receiver_id.eq. \){user.id})`)
    .order("created_at", {ascending:true});

  if(error){
    return toast(safeError(error, "Unable to load messages."));
  }

  $("sheet").innerHTML = `
    <div class="row">
      <b>${esc(person?.display_name || person?.username || "Chat")}</b>
      <span class="spacer"></span>
      <button class="iconbtn" onclick="closeModal()">×</button>
    </div>

    <div id="chatMessages" class="panel">
      ${
        (messages || []).map(m => `
          <div class="panel" style="margin:5px 0;text-align:${m.sender_id === user.id ? "right" : "left"};">
            ${esc(m.content || "")}
          </div>
        `).join("") || `<div class="muted">No messages yet.</div>`
      }
    </div>

    <div class="row">
      <input id="messageInput" class="field" placeholder="Message...">
      <button class="btn primary" onclick="sendMessage()">Send</button>
    </div>
  `;

  $("modal")?.classList.remove("hidden");
}


async function sendMessage(){
  if(!user || !chatUser) return;

  const input = $("messageInput");
  const content = input?.value?.trim() || "";
  if(!content) return;

  const { error } = await sb.from("messages").insert({
    sender_id: user.id,
    receiver_id: chatUser.id,
    content
  });

  if(error) return toast(safeError(error, "Unable to send message."));

  input.value = "";
  await openChat(chatUser.id);
}


/* =========================================================
   NOTIFICATIONS
========================================================= */

async function loadNotifications(){
  if(!user) return;

  const { count } = await sb
    .from("notifications")
    .select("*", { count:"exact", head:true })
    .eq("user_id", user.id)
    .eq("read", false);

  const badge = $("notifCount");
  if(badge){
    badge.textContent = count > 0 ? String(count) : "";
  }
}


async function renderNotifications(){
  if(!user) return;

  const { data, error } = await sb
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", {ascending:false})
    .limit(30);

  if(error) return toast(safeError(error, "Unable to load notifications."));

  $("sheet").innerHTML = `
    <div class="row">
      <b>Notifications</b>
      <span class="spacer"></span>
      <button class="iconbtn" onclick="closeModal()">×</button>
    </div>
    ${
      (data || []).map(n => `
        <div class="panel">
          <b>${esc(n.type || "Notification")}</b>
        </div>
      `).join("") || `<div class="muted">No notifications.</div>`
    }
  `;

  $("modal")?.classList.remove("hidden");
}


/* =========================================================
   AI ASSISTANT (greatly expanded)
========================================================= */

function openAssistant(){
  $("assistantBox")?.classList.remove("hidden");
}

function closeAssistant(){
  $("assistantBox")?.classList.add("hidden");
}

function assistantSay(message, from="ai"){
  const box = $("assistantMessages");
  if(!box) return;

  const div = document.createElement("div");
  div.className = "panel";
  div.innerHTML = `<b>${from === "user" ? "You" : "Vidora AI"}</b>
    <div style="margin-top:5px">${esc(message)}</div>`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}


async function assistantSend(){
  const input = $("assistantInput");
  const message = input?.value?.trim() || "";
  if(!message) return;

  input.value = "";
  assistantSay(message, "user");
  assistantHistory.push({ role:"user", content:message });

  const lower = message.toLowerCase();

  // Expanded intelligent responses
  if(lower.includes("hello") || lower.includes("hi") || lower.includes("hey")){
    assistantSay("Hey! I'm Vidora AI. Ask me anything about posting, stories, music, filters, avatars, or how the app works.");
    return;
  }

  if(lower.includes("logout") || lower.includes("sign out")){
    assistantSay("You can logout from your Profile page. Just open Profile → Logout.");
    return;
  }

  if(lower.includes("post") || lower.includes("upload") || lower.includes("publish")){
    assistantSay("To create a post: go to Create → choose a photo or video → optionally pick a filter and music (or upload your own song) → write a caption → hit Publish. Music will play together with your post like TikTok!");
    return;
  }

  if(lower.includes("story") || lower.includes("stories")){
    assistantSay("Stories work like WhatsApp Status. Go to Create → Create Story section → pick media + filter + music (or upload your own song). When someone views your story the music plays in the background.");
    return;
  }

  if(lower.includes("music") || lower.includes("song") || lower.includes("audio")){
    assistantSay("You can use built-in tracks or upload your own song (max 20MB). On posts the music plays with the media (TikTok style). On stories it plays in the background while the story is open (WhatsApp style).");
    return;
  }

  if(lower.includes("filter") || lower.includes("effect")){
    assistantSay("Vidora has many filters inspired by Snapchat and Instagram: Original, Vivid, Warm, Cool, Noir, Vintage, Beauty, Soft Glow, Sunset, Ocean, Candy, Moody, Golden Hour, Icy, Pink Dream, Sharp and more. Pick one before publishing.");
    return;
  }

  if(lower.includes("avatar") || lower.includes("profile picture") || lower.includes("pfp")){
    assistantSay("Tap the avatar button at the top or go to Profile → Change Avatar. You can choose from 20 Vidora avatars or upload your own photo.");
    return;
  }

  if(lower.includes("message") || lower.includes("chat") || lower.includes("dm")){
    assistantSay("Open the Messages tab. You can chat with people you follow. Just tap a user to open the conversation.");
    return;
  }

  if(lower.includes("follow") || lower.includes("discover") || lower.includes("search")){
    assistantSay("Go to Discover and search for usernames or display names. Then hit Follow. Once you follow someone you can message them.");
    return;
  }

  if(lower.includes("delete") || lower.includes("remove")){
    assistantSay("On your own posts and stories you'll see a 🗑 button. Tap it to delete. Comments you wrote also have a delete button.");
    return;
  }

  if(lower.includes("like") || lower.includes("heart")){
    assistantSay("Tap the ♥ button under any post to like or unlike it. The count updates live.");
    return;
  }

  if(lower.includes("comment")){
    assistantSay("Tap the 💬 button under a post to open comments. Type your message and hit Send.");
    return;
  }

  if(lower.includes("share")){
    assistantSay("Tap the Share button on a post. On supported devices it will open the native share sheet, otherwise it copies the link.");
    return;
  }

  if(lower.includes("who are you") || lower.includes("what are you") || lower.includes("your name")){
    assistantSay("I'm Vidora AI — your in-app assistant. I help you use the app, answer questions, and guide you through features. Think of me as a helpful friend inside Vidora.");
    return;
  }

  if(lower.includes("help") || lower.includes("how") || lower.includes("guide")){
    assistantSay("I can help with: creating posts & stories, adding music & filters, uploading custom songs/photos, avatars, messaging, following users, likes, comments and more. Just ask me specifically!");
    return;
  }

  if(lower.includes("thank") || lower.includes("thanks")){
    assistantSay("You're welcome! Happy to help anytime. Enjoy Vidora 💜");
    return;
  }

  // Fallback
  assistantSay("I'm Vidora AI. I can help with posts, stories, music (including your own uploads), filters, avatars, messaging, following, and navigating the app. Try asking something more specific!");
}


/* =========================================================
   MODAL
========================================================= */

function closeModal(){
  stopStoryAudio();
  $("modal")?.classList.add("hidden");
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout(){
  try{
    const { error } = await sb.auth.signOut();
    if(error) throw error;
  }catch(error){
    toast(safeError(error, "Unable to logout."));
  }
}


/* =========================================================
   GLOBAL FUNCTIONS
========================================================= */

window.login = login;
window.signup = signup;
window.publishPost = publishPost;
window.publishStory = publishStory;
window.deletePost = deletePost;
window.deleteStory = deleteStory;
window.deleteComment = deleteComment;
window.toggleLike = toggleLike;
window.openComments = openComments;
window.addComment = addComment;
window.openStoryUser = openStoryUser;
window.storyMove = storyMove;
window.selectMusic = selectMusic;
window.selectStoryMusic = selectStoryMusic;
window.setMusicCategory = setMusicCategory;
window.selectFilter = selectFilter;
window.selectStoryFilter = selectStoryFilter;
window.toggleFollow = toggleFollow;
window.sharePost = sharePost;
window.openChat = openChat;
window.sendMessage = sendMessage;
window.renderNotifications = renderNotifications;
window.renderAvatarPicker = renderAvatarPicker;
window.saveAvatar = saveAvatar;
window.handleCustomAvatar = handleCustomAvatar;
window.uploadCustomSong = uploadCustomSong;
window.closeModal = closeModal;
window.logout = logout;
window.onPostMediaPlay = onPostMediaPlay;
window.onPostMediaPause = onPostMediaPause;
window.playPostMusic = playPostMusic;


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", ()=>{
  console.log("VIDORA APP.JS LOADED");

  $("loginBtn")?.addEventListener("click", login);
  $("signupBtn")?.addEventListener("click", signup);

  $("showSignupBtn")?.addEventListener("click", ()=>{
    $("loginForm")?.classList.add("hidden");
    $("signupForm")?.classList.remove("hidden");
    showStatus($("authStatus"), "");
  });

  $("showLoginBtn")?.addEventListener("click", ()=>{
    $("signupForm")?.classList.add("hidden");
    $("loginForm")?.classList.remove("hidden");
    showStatus($("authStatus"), "");
  });

  document.querySelectorAll(".nav button").forEach(button=>{
    button.addEventListener("click", ()=>{
      renderView(button.dataset.view);
    });
  });

  $("openNotificationsBtn")?.addEventListener("click", renderNotifications);
  $("openAvatarBtn")?.addEventListener("click", renderAvatarPicker);
  $("assistantFab")?.addEventListener("click", openAssistant);
  $("closeAssistant")?.addEventListener("click", closeAssistant);
  $("assistantSend")?.addEventListener("click", assistantSend);

  $("assistantInput")?.addEventListener("keydown", event=>{
    if(event.key === "Enter") assistantSend();
  });

  $("modal")?.addEventListener("click", event=>{
    if(event.target === $("modal")) closeModal();
  });

  init();
});
