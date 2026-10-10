/* =========================================================
   VIDORA APP.JS
   Enhanced controller
   Features:
   Authentication, Posts, Stories, Story Reactions,
   Filters, Music, Avatars, Comments, Likes, Discover,
   Following, Messages, Notifications and Vidora AI.

   No hologram features.
   No face-tracking technology.
========================================================= */


/* =========================================================
   1. SUPABASE
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
   2. HELPERS AND STATE
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

let authListenerReady = false;
let appStarting = false;

let musicCategory = "All";
let assistantHistory = [];

function toast(message) {
  const el = $("toast");
  if (!el) {
    console.log("VIDORA:", message);
    return;
  }

  el.textContent = String(message || "");
  el.classList.remove("hidden");

  clearTimeout(window.__vidoraToast);

  window.__vidoraToast = setTimeout(() => {
    el.classList.add("hidden");
  }, 3000);
}

function esc(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]
  );
}

function safeError(error, fallback = "Something went wrong.") {
  return (
    error?.message ||
    error?.details ||
    error?.hint ||
    fallback
  );
}

function showStatus(element, message, success = false) {
  if (!element) return;

  element.textContent = message || "";

  element.className =
    "status " + (success ? "ok" : "err");
}

function fallbackAvatar(name = "V") {
  const initial = esc(name).slice(0, 1) || "V";

  return "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg"
           width="160" height="160">
        <rect width="160" height="160" rx="80"
              fill="#181824"/>
        <circle cx="80" cy="60" r="30"
                fill="#8b5cf6"/>
        <path d="M30 150c8-45 92-45 100 0"
              fill="#ff2d75"/>
        <text x="80" y="145"
              text-anchor="middle"
              fill="white"
              font-size="22"
              font-family="Arial">${initial}</text>
      </svg>
    `);
}

function avatarSrc(value) {
  if (!value) return fallbackAvatar("V");

  if (
    /^https?:\/\//i.test(value) ||
    /^data:image\//i.test(value) ||
    value.startsWith("/")
  ) {
    return value;
  }

  return value;
}


/* =========================================================
   3. VIDORA FILTERS
   Color effects only. No face tracking.
========================================================= */

const FILTERS = [
  { id: "none", name: "Original", css: "none" },

  {
    id: "vivid",
    name: "Vivid",
    css: "saturate(1.6) contrast(1.1)"
  },
  {
    id: "warm",
    name: "Warm",
    css: "sepia(.25) saturate(1.3) brightness(1.05)"
  },
  {
    id: "cool",
    name: "Cool",
    css: "hue-rotate(15deg) saturate(1.2)"
  },
  {
    id: "noir",
    name: "Noir",
    css: "grayscale(1) contrast(1.2)"
  },
  {
    id: "vintage",
    name: "Vintage",
    css: "sepia(.45) contrast(1.1) brightness(.95)"
  },
  {
    id: "fade",
    name: "Fade",
    css: "contrast(.85) brightness(1.1) saturate(.8)"
  },
  {
    id: "drama",
    name: "Drama",
    css: "contrast(1.4) saturate(1.2)"
  },
  {
    id: "glow",
    name: "Glow",
    css: "brightness(1.15) contrast(1.05) saturate(1.3)"
  },
  {
    id: "cinema",
    name: "Cinema",
    css: "contrast(1.25) saturate(.9) brightness(.95)"
  },
  {
    id: "retro",
    name: "Retro",
    css: "sepia(.5) contrast(1.2) saturate(1.4)"
  },
  {
    id: "neon",
    name: "Neon",
    css: "saturate(1.8) contrast(1.2) hue-rotate(300deg)"
  },

  {
    id: "beauty",
    name: "Beauty",
    css: "brightness(1.12) contrast(1.05) saturate(1.15)"
  },
  {
    id: "soft",
    name: "Soft Glow",
    css: "brightness(1.1) contrast(.9) saturate(1.1)"
  },
  {
    id: "sunset",
    name: "Sunset",
    css: "sepia(.35) saturate(1.4) brightness(1.05)"
  },
  {
    id: "ocean",
    name: "Ocean",
    css: "hue-rotate(180deg) saturate(1.3)"
  },
  {
    id: "candy",
    name: "Candy",
    css: "saturate(1.7) brightness(1.1) contrast(1.05)"
  },
  {
    id: "moody",
    name: "Moody",
    css: "contrast(1.35) brightness(.9) saturate(.85)"
  },
  {
    id: "golden",
    name: "Golden Hour",
    css: "sepia(.4) saturate(1.35) brightness(1.08)"
  },
  {
    id: "icy",
    name: "Icy",
    css: "hue-rotate(190deg) saturate(1.2) brightness(1.1)"
  },
  {
    id: "pink",
    name: "Pink Dream",
    css: "hue-rotate(300deg) saturate(1.4) brightness(1.05)"
  },
  {
    id: "sharp",
    name: "Sharp",
    css: "contrast(1.5) saturate(1.1)"
  },
  {
    id: "wealthy",
    name: "💎 Wealthy",
    css: "saturate(1.3) contrast(1.12) brightness(1.08) sepia(.12)"
  },
  {
    id: "richgold",
    name: "✨ Rich Gold",
    css: "sepia(.3) saturate(1.7) contrast(1.1) brightness(1.05)"
  },
  {
    id: "luxury",
    name: "👑 Luxury",
    css: "contrast(1.2) saturate(1.2) brightness(1.05)"
  },
  {
    id: "diamond",
    name: "💠 Diamond",
    css: "brightness(1.15) contrast(1.15) saturate(1.25)"
  },
  {
    id: "glam",
    name: "Glam",
    css: "brightness(1.12) saturate(1.25) contrast(1.08)"
  },
  {
    id: "electric",
    name: "Electric",
    css: "saturate(2) contrast(1.15) hue-rotate(20deg)"
  },
  {
    id: "dream",
    name: "Dream",
    css: "brightness(1.1) saturate(1.15) contrast(.95)"
  },
  {
    id: "midnight",
    name: "Midnight",
    css: "brightness(.8) contrast(1.3) saturate(1.1)"
  },
  {
    id: "sunshine",
    name: "Sunshine",
    css: "sepia(.2) brightness(1.2) saturate(1.3)"
  },
  {
    id: "arctic",
    name: "Arctic",
    css: "hue-rotate(175deg) brightness(1.1) saturate(.9)"
  },
  {
    id: "rose",
    name: "Rose",
    css: "sepia(.15) hue-rotate(315deg) saturate(1.3)"
  },
  {
    id: "film",
    name: "Film",
    css: "sepia(.2) contrast(1.15) saturate(.85)"
  }
];

function getFilterCss(id) {
  return FILTERS.find(f => f.id === id)?.css || "none";
}

function selectFilter(id) {
  selectedFilter = FILTERS.some(f => f.id === id)
    ? id
    : "none";

  toast(
    "Post filter: " +
    (FILTERS.find(f => f.id === selectedFilter)?.name || "Original")
  );
}

function selectStoryFilter(id) {
  selectedStoryFilter = FILTERS.some(f => f.id === id)
    ? id
    : "none";

  toast(
    "Story filter: " +
    (FILTERS.find(f => f.id === selectedStoryFilter)?.name || "Original")
  );
}


/* =========================================================
   4. BUILT-IN MUSIC
========================================================= */

const BUILTIN_TRACKS = [
  {
    id: "bz1",
    title: "Night Pulse",
    artist: "Vidora Beatz",
    category: "Beatz",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },
  {
    id: "bz2",
    title: "Chrome Drive",
    artist: "Vidora Beatz",
    category: "Beatz",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
  },
  {
    id: "bz3",
    title: "Low Rider",
    artist: "Vidora Beatz",
    category: "Beatz",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
  },
  {
    id: "dr1",
    title: "UK Slide",
    artist: "Vidora Drills",
    category: "Drills",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"
  },
  {
    id: "dr2",
    title: "Dark Lane",
    artist: "Vidora Drills",
    category: "Drills",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"
  },
  {
    id: "dr3",
    title: "Cold Blocks",
    artist: "Vidora Drills",
    category: "Drills",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3"
  },
  {
    id: "fk1",
    title: "Groovy Lane",
    artist: "Vidora Funk",
    category: "Funk",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3"
  },
  {
    id: "fk2",
    title: "Bass Pocket",
    artist: "Vidora Funk",
    category: "Funk",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"
  },
  {
    id: "fk3",
    title: "Electric Soul",
    artist: "Vidora Funk",
    category: "Funk",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  }
];

window._musicTracks = [...BUILTIN_TRACKS];

function findMusic(id) {
  return (
    window._musicTracks?.find(t => String(t.id) === String(id)) ||
    BUILTIN_TRACKS.find(t => String(t.id) === String(id)) ||
    null
  );
}


/* =========================================================
   5. MEDIA UPLOAD
========================================================= */

async function uploadMedia(file, folder = "posts") {
  if (!user) {
    throw new Error("You must be logged in.");
  }

  if (!file) {
    throw new Error("No file selected.");
  }

  const allowed =
    file.type.startsWith("image/") ||
    file.type.startsWith("video/") ||
    file.type.startsWith("audio/");

  if (!allowed) {
    throw new Error("This file type is not supported.");
  }

  const extension = file.name?.includes(".")
    ? file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "")
    : "bin";

  const safeFolder = String(folder).replace(/[^a-zA-Z0-9_-]/g, "");

  const path =
    `${safeFolder}/${user.id}/${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}.${extension}`;

  const { data, error } = await sb.storage
    .from("media")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined
    });

  if (error) throw error;

  const { data: publicData } =
    sb.storage.from("media").getPublicUrl(data.path);

  if (!publicData?.publicUrl) {
    throw new Error("Could not create media URL.");
  }

  return publicData.publicUrl;
}


/* =========================================================
   6. AUTH INITIALIZATION
========================================================= */

async function init() {
  if (authListenerReady) return;

  authListenerReady = true;

  console.log("VIDORA: initializing...");

  try {
    const { data, error } = await sb.auth.getSession();

    if (error) throw error;

    if (data?.session?.user) {
      await enterApp(data.session.user);
    } else {
      $("app")?.classList.add("hidden");
      $("authScreen")?.classList.remove("hidden");
    }
  } catch (error) {
    console.error("VIDORA INIT ERROR:", error);

    $("app")?.classList.add("hidden");
    $("authScreen")?.classList.remove("hidden");

    showStatus(
      $("authStatus"),
      safeError(error, "Unable to connect to Vidora.")
    );
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    console.log("AUTH EVENT:", event);

    if (
      (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
      session?.user
    ) {
      if (!user || user.id !== session.user.id) {
        await enterApp(session.user);
      }
    }

    if (event === "SIGNED_OUT") {
      user = null;
      profile = null;

      stopStoryAudio();

      $("app")?.classList.add("hidden");
      $("authScreen")?.classList.remove("hidden");
    }
  });
}

async function enterApp(currentUser) {
  if (!currentUser) return;

  if (appStarting && user?.id === currentUser.id) return;

  appStarting = true;
  user = currentUser;

  $("authScreen")?.classList.add("hidden");
  $("app")?.classList.remove("hidden");

  try {
    await loadProfile();
    await loadNotifications();
    await renderView("home");
  } catch (error) {
    console.error("ENTER APP ERROR:", error);
    toast(safeError(error, "Unable to load Vidora."));
  } finally {
    appStarting = false;
  }
}


/* =========================================================
   7. PROFILE DATA
========================================================= */

async function loadProfile() {
  if (!user) return;

  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("PROFILE:", error);
    return;
  }

  profile = data;
}


/* =========================================================
   8. LOGIN
========================================================= */

async function login() {
  const email = $("loginEmail")?.value?.trim() || "";
  const password = $("loginPassword")?.value || "";
  const button = $("loginBtn");
  const status = $("authStatus");

  if (!email) {
    showStatus(status, "Enter your email.");
    return;
  }

  if (!password) {
    showStatus(status, "Enter your password.");
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Signing in...";
  }

  showStatus(status, "Signing in...", true);

  try {
    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    if (!data?.user) {
      throw new Error("No user was returned.");
    }

    await enterApp(data.user);

    showStatus(status, "Login successful.", true);
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    showStatus(
      status,
      safeError(error, "Unable to login. Check your connection.")
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Login";
    }
  }
}


/* =========================================================
   9. SIGNUP
========================================================= */

async function signup() {
  const displayName = $("signupDisplayName")?.value?.trim() || "";
  const username = $("signupUsername")?.value?.trim().toLowerCase() || "";
  const age = Number($("signupAge")?.value || 0);
  const email = $("signupEmail")?.value?.trim() || "";
  const password = $("signupPassword")?.value || "";
  const confirmPassword = $("signupPasswordConfirm")?.value || "";

  const status = $("authStatus");
  const button = $("signupBtn");

  if (
    !displayName ||
    !username ||
    !age ||
    !email ||
    !password ||
    !confirmPassword
  ) {
    showStatus(status, "Complete all signup fields.");
    return;
  }

  if (age < 13) {
    showStatus(status, "You must be at least 13 to use Vidora.");
    return;
  }

  if (!/^[a-z0-9_]{3,30}$/.test(username)) {
    showStatus(
      status,
      "Username must be 3–30 characters using letters, numbers or underscores."
    );
    return;
  }

  if (password.length < 6) {
    showStatus(status, "Password must be at least 6 characters.");
    return;
  }

  if (password !== confirmPassword) {
    showStatus(status, "Passwords do not match.");
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Creating...";
  }

  try {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName,
          age
        }
      }
    });

    if (error) throw error;

    if (!data?.user) {
      throw new Error("Account could not be created.");
    }

    const { error: profileError } = await sb
      .from("profiles")
      .upsert({
        id: data.user.id,
        username,
        display_name: displayName
      });

    if (profileError) {
      console.warn("PROFILE UPSERT:", profileError);
    }

    if (data.session) {
      await enterApp(data.user);

      showStatus(status, "Account created successfully.", true);
    } else {
      showStatus(
        status,
        "Account created. Check your email to confirm your account.",
        true
      );
    }
  } catch (error) {
    console.error("SIGNUP ERROR:", error);

    showStatus(status, safeError(error, "Unable to create account."));
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Create account";
    }
  }
}


/* =========================================================
   10. NAVIGATION
========================================================= */

async function renderView(view) {
  if (!user) return;

  currentView = view || "home";

  document.querySelectorAll(".nav button").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.view === currentView
    );
  });

  if (currentView === "home") return renderHome();
  if (currentView === "discover") return renderDiscover();
  if (currentView === "create") return renderCreate();
  if (currentView === "messages") return renderMessages();
  if (currentView === "profile") return renderProfile(user.id);

  return renderHome();
}


/* =========================================================
   11. BLOCKED USERS
========================================================= */

async function blockedIds() {
  if (!user) return new Set();

  const { data, error } = await sb
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", user.id);

  if (error) return new Set();

  return new Set((data || []).map(item => item.blocked_id));
}


/* =========================================================
   12. HOME FEED
========================================================= */

async function renderHome() {
  const main = $("main");
  if (!main) return;

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
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
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
    <div class="panel muted">
      No posts yet. Be the first to post.
    </div>
  `;
}


/* =========================================================
   13. RENDER POSTS
========================================================= */

async function renderPost(post) {
  const [
    authorResult,
    likeResult,
    commentResult,
    likedResult
  ] = await Promise.all([
    sb.from("profiles")
      .select("username,display_name,avatar_url")
      .eq("id", post.user_id)
      .maybeSingle(),

    sb.from("post_likes")
      .select("id", { count: "exact", head: true })
      .eq("post_id", post.id),

    sb.from("comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", post.id),

    sb.from("post_likes")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", user.id)
      .maybeSingle()
  ]);

  const author = authorResult.data || {};
  const likes = likeResult.count || 0;
  const comments = commentResult.count || 0;
  const liked = !!likedResult.data;

  let track = post.music_id ? findMusic(post.music_id) : null;

  if (post.music_id && !track) {
    const { data } = await sb
      .from("tracks")
      .select("id,title,artist,audio_url,category")
      .eq("id", post.music_id)
      .maybeSingle();

    track = data || null;
  }

  const filterCss = getFilterCss(post.filter || "none");

  let media = "";

  if (post.media_type === "video") {
    media = `
      <video
        class="post-media"
        controls
        playsinline
        preload="metadata"
        style="filter:${filterCss}"
        src="${esc(post.media_url)}"
        onplay="onPostMediaPlay(this)"
        onpause="onPostMediaPause(this)"
        onended="onPostMediaPause(this)">
      </video>
    `;
  } else {
    media = `
      <img
        class="post-media"
        loading="lazy"
        style="filter:${filterCss}"
        src="${esc(post.media_url)}"
        alt="Vidora post"
        onclick="playPostMusic(this)">
    `;
  }

  const music = track?.audio_url ? `
  <div class="panel music-info" style="margin-top:8px">
    <b>🎵 ${esc(track.title || "Track")}</b>
    <div class="muted">${esc(track.artist || "")}</div>

    <audio
      class="post-audio"
      controls
      preload="metadata"
      loop
      style="display:block;width:100%;margin-top:8px"
      src="${esc(track.audio_url)}"
      onplay="stopOtherPostAudio(this)">
      Your browser cannot play this audio.
    </audio>
  </div>
` : "";

  return `
    <article class="card" data-post-id="${esc(post.id)}">

      <div class="row">
        <img
          class="avatar sm"
          src="${esc(avatarSrc(author.avatar_url))}"
          alt="">

        <div>
          <b>${esc(author.display_name || author.username || "User")}</b>
          <div class="muted">@${esc(author.username || "user")}</div>
        </div>

        <span class="spacer"></span>

        ${
          post.user_id === user.id
            ? `<button class="iconbtn"
                onclick="deletePost('${esc(post.id)}')">🗑</button>`
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
        <button class="${liked ? "active" : ""}"
          onclick="toggleLike('${esc(post.id)}')">
          ${liked ? "♥" : "♡"} ${likes}
        </button>

        <button onclick="openComments('${esc(post.id)}')">
          💬 ${comments}
        </button>

        <button onclick="sharePost('${esc(post.id)}')">
          ↗ Share
        </button>
      </div>

    </article>
  `;
}


/* =========================================================
   14. POST MUSIC
========================================================= */

function stopOtherPostAudio(except = null) {
  document.querySelectorAll(".post-audio").forEach(audio => {
    if (audio !== except) audio.pause();
  });
}

function onPostMediaPlay(videoEl) {
  const audio = videoEl.closest("article")?.querySelector(".post-audio");

  stopOtherPostAudio(audio);

  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }
}

function onPostMediaPause(videoEl) {
  const audio = videoEl.closest("article")?.querySelector(".post-audio");

  if (audio) audio.pause();
}

function playPostMusic(imgEl) {
  const audio = imgEl.closest("article")?.querySelector(".post-audio");

  if (!audio) return;

  stopOtherPostAudio(audio);

  if (audio.paused) {
    audio.play().catch(() => {
      toast("Tap again to play the music.");
    });
  } else {
    audio.pause();
  }
}


/* =========================================================
   15. STORIES
========================================================= */

async function renderStories() {
  const box = $("stories");
  if (!box) return;

  const { data, error } = await sb
    .from("stories")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.warn("STORIES:", error);

    box.innerHTML = `
      <span class="muted">Unable to load stories.</span>
    `;

    return;
  }

  storyItems = data || [];

  const blocked = await blockedIds();

  storyItems = storyItems.filter(
    story => !blocked.has(story.user_id)
  );

  const ids = [...new Set(storyItems.map(s => s.user_id))];

  const profiles = {};

  if (ids.length) {
    const { data: people } = await sb
      .from("profiles")
      .select("id,username,display_name,avatar_url")
      .in("id", ids);

    (people || []).forEach(person => {
      profiles[person.id] = person;
    });
  }

  const groups = {};

  storyItems.forEach(story => {
    if (!groups[story.user_id]) groups[story.user_id] = [];

    groups[story.user_id].push(story);
  });

  box.innerHTML = Object.entries(groups).map(([id]) => {
    const person = profiles[id] || {};

    return `
      <button class="storyitem"
        onclick="openStoryUser('${esc(id)}')">

        <div class="storyring">
          <img
            src="${esc(avatarSrc(person.avatar_url))}"
            alt="">
        </div>

        <small>
          ${esc(person.username || person.display_name || "Story")}
        </small>

      </button>
    `;
  }).join("") || `
    <span class="muted">No stories yet.</span>
  `;
}


async function openStoryUser(id) {
  const stories = storyItems.filter(s => s.user_id === id);

  if (!stories.length) {
    toast("Story unavailable.");
    return;
  }

  window.currentStorySet = stories;

  storyIndex = 0;

  openStory(stories, 0);
}


function stopStoryAudio() {
  if (!storyAudio) return;

  try {
    storyAudio.pause();
    storyAudio.currentTime = 0;
    storyAudio.src = "";
  } catch (error) {
    console.warn(error);
  }

  storyAudio = null;
}


/* =========================================================
   16. STORY REACTIONS
========================================================= */

async function reactToStory(storyId, reaction = "❤️") {
  if (!user) return toast("Please log in first.");

  const allowed = ["❤️", "😂", "🔥", "😍", "👏", "😮"];

  if (!allowed.includes(reaction)) {
    reaction = "❤️";
  }

  try {
    const { data: existing, error: findError } = await sb
      .from("story_likes")
      .select("id,reaction")
      .eq("story_id", storyId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (findError) throw findError;

    if (existing) {
      if (existing.reaction === reaction) {
        const { error } = await sb
          .from("story_likes")
          .delete()
          .eq("id", existing.id)
          .eq("user_id", user.id);

        if (error) throw error;

        toast("Reaction removed.");
      } else {
        const { error } = await sb
          .from("story_likes")
          .update({ reaction })
          .eq("id", existing.id)
          .eq("user_id", user.id);

        if (error) throw error;

        toast("Reaction updated " + reaction);
      }
    } else {
      const { error } = await sb
        .from("story_likes")
        .insert({
          story_id: storyId,
          user_id: user.id,
          reaction
        });

      if (error) throw error;

      toast("Story reaction sent " + reaction);
    }

    const stories = window.currentStorySet || [];

    openStory(stories, storyIndex);
  } catch (error) {
    console.error("STORY REACTION ERROR:", error);

    toast(
      "Story reactions need the story_likes database table. " +
      safeError(error)
    );
  }
}


/* =========================================================
   17. STORY VIEWER
========================================================= */

async function openStory(stories, index) {
  if (!stories?.length) return;

  const story = stories[index];

  if (!story) return;

  stopStoryAudio();

  storyIndex = index;

  const filterCss = getFilterCss(story.filter || "none");

  const media = story.media_type === "video"
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

  let existingReaction = null;

  try {
    const { data, error } = await sb
      .from("story_likes")
      .select("reaction")
      .eq("story_id", story.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error) existingReaction = data;
  } catch (error) {
    console.warn("STORY REACTION LOOKUP:", error);
  }

  const reactions = ["❤️", "😂", "🔥", "😍", "👏", "😮"];

  $("sheet").innerHTML = `
    <div class="row">
      <b>Story ${index + 1}/${stories.length}</b>

      <span class="spacer"></span>

      <button class="iconbtn" onclick="closeModal()">×</button>
    </div>

    ${media}

    ${
      track?.title
        ? `<div class="panel">
            🎵 <b>${esc(track.title)}</b>
            <div class="muted">${esc(track.artist || "")}</div>
          </div>`
        : ""
    }

    <div class="panel">
      <div class="title">React to this story</div>

      <div class="row wrap">
        ${reactions.map(reaction => `
          <button
            class="btn"
            style="font-size:20px;${existingReaction?.reaction === reaction ? "border:2px solid var(--purple);" : ""}"
            onclick="reactToStory('${esc(story.id)}','${reaction}')">
            ${reaction}
          </button>
        `).join("")}
      </div>

      ${
        existingReaction?.reaction
          ? `<div class="muted">Your reaction: ${existingReaction.reaction}</div>`
          : ""
      }
    </div>

    <div class="row wrap">
      <button class="btn"
        onclick="storyMove(${index - 1})"
        ${index <= 0 ? "disabled" : ""}>
        ← Prev
      </button>

      <button class="btn"
        onclick="storyMove(${index + 1})"
        ${index >= stories.length - 1 ? "disabled" : ""}>
        Next →
      </button>

      ${
        story.user_id === user.id
          ? `<button class="btn danger"
              onclick="deleteStory('${esc(story.id)}')">
              Delete
            </button>`
          : ""
      }
    </div>
  `;

  $("modal")?.classList.remove("hidden");

  if (track?.audio_url) {
    try {
      storyAudio = new Audio(track.audio_url);
      storyAudio.loop = true;
      storyAudio.volume = 0.85;

      storyAudio.play().catch(() => {});
    } catch (error) {
      console.warn("STORY AUDIO:", error);
    }
  }
}


function storyMove(index) {
  const stories = window.currentStorySet || [];

  if (index < 0 || index >= stories.length) return;

  storyIndex = index;

  openStory(stories, index);
}


/* =========================================================
   18. DELETE STORY
========================================================= */

async function deleteStory(id) {
  if (!user || !id) return;

  if (!confirm("Delete this story?")) return;

  const { error } = await sb
    .from("stories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return toast(safeError(error, "Unable to delete story."));
  }

  storyItems = storyItems.filter(story => story.id !== id);

  toast("Story deleted.");

  closeModal();

  await renderView("home");
}


/* =========================================================
   19. CREATE PAGE
========================================================= */

async function renderCreate() {
  $("main").innerHTML = `
    <section class="panel">
      <div class="title">Create Post</div>

      <input id="createFile"
        class="field"
        type="file"
        accept="image/*,video/*">

      <div id="createPreview" class="hidden"></div>

      <textarea
        id="createCaption"
        class="field"
        maxlength="2000"
        placeholder="Write a caption..."></textarea>

      <div class="title">✨ Post Filters</div>

      <div class="row wrap">
        ${FILTERS.map(f => `
          <button class="btn"
            onclick="selectFilter('${f.id}')">
            ${esc(f.name)}
          </button>
        `).join("")}
      </div>

      <div class="title">🎵 Music</div>

      <div id="musicList">Loading music...</div>

      <div class="panel" style="margin-top:12px">
        <div class="title">Upload Your Own Song</div>

        <input id="customSongFile"
          class="field"
          type="file"
          accept="audio/*">

        <input id="customSongTitle"
          class="field"
          maxlength="100"
          placeholder="Song title">

        <button class="btn"
          onclick="uploadCustomSong(false)">
          Upload Song for Posts
        </button>
      </div>

      <button class="btn primary full"
        onclick="publishPost()">
        🚀 Publish to Vidora
      </button>
    </section>

    <section class="panel">
      <div class="title">Create Story</div>

      <input id="storyFile"
        class="field"
        type="file"
        accept="image/*,video/*">

      <div class="title">✨ Story Filters</div>

      <div class="row wrap">
        ${FILTERS.map(f => `
          <button class="btn"
            onclick="selectStoryFilter('${f.id}')">
            ${esc(f.name)}
          </button>
        `).join("")}
      </div>

      <div class="title">🎵 Story Music</div>

      <div id="storyMusicList">Loading music...</div>

      <div class="panel" style="margin-top:12px">
        <div class="title">Upload Your Own Song for Stories</div>

        <input id="customStorySongFile"
          class="field"
          type="file"
          accept="audio/*">

        <input id="customStorySongTitle"
          class="field"
          maxlength="100"
          placeholder="Song title">

        <button class="btn"
          onclick="uploadCustomSong(true)">
          Upload Song for Stories
        </button>
      </div>

      <button class="btn primary full"
        onclick="publishStory()">
        📖 Publish Story
      </button>
    </section>
  `;

  await loadMusic();

  $("createFile")?.addEventListener("change", previewCreateMedia);
}


function previewCreateMedia() {
  const file = $("createFile")?.files?.[0];
  const box = $("createPreview");

  if (!box) return;

  if (!file) {
    box.innerHTML = "";
    box.classList.add("hidden");
    return;
  }

  const url = URL.createObjectURL(file);

  box.innerHTML = file.type.startsWith("video/")
    ? `<video src="${url}" controls playsinline
         style="width:100%;max-height:350px;object-fit:contain"></video>`
    : `<img src="${url}" alt="Preview"
         style="width:100%;max-height:350px;object-fit:contain">`;

  box.classList.remove("hidden");
}

/* =========================================================
   MUSIC PREVIEW PLAYER
========================================================= */

let vidoraPreviewAudio = null;
let vidoraPreviewTrackId = null;

async function previewMusic(id) {
  const track = findMusic(id);

  if (!track || !track.audio_url) {
    toast("This song has no audio URL.");
    return;
  }

  if (
    vidoraPreviewAudio &&
    vidoraPreviewTrackId === String(id) &&
    !vidoraPreviewAudio.paused
  ) {
    vidoraPreviewAudio.pause();
    toast("Preview paused.");
    return;
  }

  if (vidoraPreviewAudio) {
    vidoraPreviewAudio.pause();
  }

  vidoraPreviewTrackId = String(id);
  vidoraPreviewAudio = new Audio(track.audio_url);

  vidoraPreviewAudio.addEventListener("error", () => {
    toast("Song failed to load. Check the audio URL.");
  }, { once: true });

  try {
    await vidoraPreviewAudio.play();
    toast("Playing: " + (track.title || "Song"));
  } catch (error) {
    console.error("MUSIC PREVIEW ERROR:", error);
    toast("Playback failed: " + error.message);
  }
}

window.previewMusic = previewMusic;


/* =========================================================
   20. MUSIC LIBRARY
========================================================= */



async function loadMusic() {
  let tracks = [...BUILTIN_TRACKS];

  try {
    const { data, error } = await sb
      .from("tracks")
      .select("id,title,artist,audio_url,category")
      .limit(100);

    if (error) {
      console.warn("TRACKS:", error);
    } else if (data?.length) {
      tracks = [...data, ...BUILTIN_TRACKS];
    }
  } catch (error) {
    console.warn("TRACKS:", error);
  }

  window._musicTracks = tracks;

  const categories = [
    "All",
    ...new Set(tracks.map(t => t.category || "Other"))
  ];

  function renderMusicList(target, story = false) {
    if (!target) return;

    const selectedCategory = story ? "All" : musicCategory;

    const filtered = tracks.filter(track =>
      selectedCategory === "All" ||
      (track.category || "Other") === selectedCategory
    );

    target.innerHTML = `
      <div class="row wrap">
        ${categories.map(category => `
          <button class="btn"
            onclick="setMusicCategory('${esc(category)}')">
            ${esc(category)}
          </button>
        `).join("")}
      </div>

      ${
        selectedMusic && !story
          ? `<div class="muted">
              Selected post track: ${esc(selectedMusic.title)}
            </div>`
          : ""
      }

      ${
        selectedStoryMusic && story
          ? `<div class="muted">
              Selected story track: ${esc(selectedStoryMusic.title)}
            </div>`
          : ""
      }

      ${filtered.map(track => `
        <div class="panel" style="margin-bottom:8px">
          <div style="font-weight:700">
            🎵 ${esc(track.title || "Track")}
          </div>

          <div class="muted" style="margin:4px 0 10px">
            ${esc(track.artist || "Vidora")}
            · ${esc(track.category || "Other")}
          </div>

          <div class="row wrap">
            <button class="btn"
              onclick="${story
                ? `selectStoryMusic('${esc(track.id)}')`
                : `selectMusic('${esc(track.id)}')`}">
              ${story ? "Select for Story" : "Select for Post"}
            </button>

            <button class="btn"
              onclick="previewMusic('${esc(track.id)}')">
              ▶ Play Preview
            </button>
          </div>
        </div>
      `).join("")}
    `;
  }

  renderMusicList($("musicList"), false);
  renderMusicList($("storyMusicList"), true);
}
  


function setMusicCategory(category) {
  musicCategory = category || "All";
  loadMusic();
}


async function selectMusic(id) {
  const track = findMusic(id);

  if (!track) return toast("Track not found.");

  selectedMusic = track;

  toast("Selected: " + (track.title || "Track"));

  await loadMusic();
}


async function selectStoryMusic(id) {
  const track = findMusic(id);

  if (!track) return toast("Track not found.");

  selectedStoryMusic = track;

  toast("Story music selected.");

  await loadMusic();
}


/* =========================================================
   21. CUSTOM MUSIC UPLOAD
========================================================= */

async function uploadCustomSong(forStory = false) {
  if (!user) return toast("You must be logged in.");

  const fileInput = forStory
    ? $("customStorySongFile")
    : $("customSongFile");

  const titleInput = forStory
    ? $("customStorySongTitle")
    : $("customSongTitle");

  const file = fileInput?.files?.[0];

  const title = titleInput?.value?.trim() || "My Custom Track";

  if (!file) return toast("Choose an audio file.");

  if (!file.type.startsWith("audio/")) {
    return toast("Please choose an audio file.");
  }

  if (file.size > 20 * 1024 * 1024) {
    return toast("Maximum song size is 20MB.");
  }

  try {
    toast("Uploading your song...");

    const audioUrl = await uploadMedia(file, "music");

    let trackId = "custom_" + Date.now();

    const customTrack = {
      id: trackId,
      title,
      artist: profile?.display_name || profile?.username || "You",
      category: "Custom",
      audio_url: audioUrl
    };

    try {
      const { data, error } = await sb
        .from("tracks")
        .insert({
          title,
          artist: customTrack.artist,
          audio_url: audioUrl,
          category: "Custom",
          user_id: user.id
        })
        .select()
        .single();

      if (!error && data) {
        customTrack.id = data.id;
      } else if (error) {
        console.warn("TRACK INSERT:", error);
      }
    } catch (error) {
      console.warn("CUSTOM TRACK DATABASE:", error);
    }

    trackId = customTrack.id;

    window._musicTracks = [
      customTrack,
      ...(window._musicTracks || [])
    ];

    if (forStory) {
      selectedStoryMusic = customTrack;
    } else {
      selectedMusic = customTrack;
    }

    await loadMusic();

    toast(
      forStory
        ? "Song ready for your story!"
        : "Song ready for your post!"
    );
  } catch (error) {
    console.error("CUSTOM SONG ERROR:", error);

    toast("Upload failed: " + safeError(error));
  }
}


/* =========================================================
   22. PUBLISH POST
========================================================= */

async function publishPost() {
  if (!user) return toast("You are not logged in.");

  const file = $("createFile")?.files?.[0];

  const caption = $("createCaption")?.value?.trim() || "";

  if (!file) return toast("Choose an image or video.");

  if (
    !file.type.startsWith("image/") &&
    !file.type.startsWith("video/")
  ) {
    return toast("Please choose an image or video.");
  }

  if (file.size > 50 * 1024 * 1024) {
    return toast("Maximum upload size is 50MB.");
  }

  try {
    toast("Uploading post...");

    const mediaUrl = await uploadMedia(file, "posts");

    const mediaType = file.type.startsWith("video/")
      ? "video"
      : "image";

    const post = {
      user_id: user.id,
      media_url: mediaUrl,
      media_type: mediaType,
      caption
    };

    if (selectedMusic?.id) {
      post.music_id = selectedMusic.id;
    }

    if (selectedFilter !== "none") {
      post.filter = selectedFilter;
    }

    let { error } = await sb.from("posts").insert(post);

    /*
      Compatibility fallback:
      Some existing databases may not have music_id or filter
      columns yet. Retry using only the original post columns.
    */

    if (
      error &&
      (
        error.message?.includes("music_id") ||
        error.message?.includes("filter") ||
        error.code === "PGRST204"
      )
    ) {
      console.warn("Retrying post without optional columns.");

      ({ error } = await sb.from("posts").insert({
        user_id: user.id,
        media_url: mediaUrl,
        media_type: mediaType,
        caption
      }));
    }

    if (error) throw error;

    selectedMusic = null;
    selectedFilter = "none";

    if ($("createFile")) $("createFile").value = "";
    if ($("createCaption")) $("createCaption").value = "";

    const preview = $("createPreview");

    if (preview) {
      preview.innerHTML = "";
      preview.classList.add("hidden");
    }

    toast("Post published successfully!");

    await renderView("home");
  } catch (error) {
    console.error("PUBLISH POST ERROR:", error);

    toast("Post failed: " + safeError(error));
  }
}


/* =========================================================
   23. PUBLISH STORY
========================================================= */

async function publishStory() {
  if (!user) return toast("You are not logged in.");

  const file = $("storyFile")?.files?.[0];

  if (!file) return toast("Choose a photo or video.");

  if (
    !file.type.startsWith("image/") &&
    !file.type.startsWith("video/")
  ) {
    return toast("Please choose an image or video.");
  }

  if (file.size > 50 * 1024 * 1024) {
    return toast("Maximum upload size is 50MB.");
  }

  try {
    toast("Uploading story...");

    const mediaUrl = await uploadMedia(file, "stories");

    const mediaType = file.type.startsWith("video/")
      ? "video"
      : "image";

    const story = {
      user_id: user.id,
      media_url: mediaUrl,
      media_type: mediaType
    };

    if (selectedStoryMusic?.id) {
      story.music_id = selectedStoryMusic.id;
    }

    if (selectedStoryFilter !== "none") {
      story.filter = selectedStoryFilter;
    }

    let { error } = await sb.from("stories").insert(story);

    if (
      error &&
      (
        error.message?.includes("music_id") ||
        error.message?.includes("filter") ||
        error.code === "PGRST204"
      )
    ) {
      console.warn("Retrying story without optional columns.");

      ({ error } = await sb.from("stories").insert({
        user_id: user.id,
        media_url: mediaUrl,
        media_type: mediaType
      }));
    }

    if (error) throw error;

    selectedStoryMusic = null;
    selectedStoryFilter = "none";

    if ($("storyFile")) $("storyFile").value = "";

    toast("Story published successfully!");

    await renderView("home");
  } catch (error) {
    console.error("PUBLISH STORY ERROR:", error);

    toast("Story failed: " + safeError(error));
  }
}


/* =========================================================
   24. DELETE POST
========================================================= */

async function deletePost(id) {
  if (!user || !id) return;

  if (!confirm("Delete this post?")) return;

  const { error } = await sb
    .from("posts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return toast(safeError(error, "Unable to delete post."));
  }

  toast("Post deleted.");

  await renderView(currentView);
}


/* =========================================================
   25. POST LIKES
========================================================= */

async function toggleLike(postId) {
  if (!user) return;

  try {
    const { data, error } = await sb
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      const { error: deleteError } = await sb
        .from("post_likes")
        .delete()
        .eq("id", data.id)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;
    } else {
      const { error: insertError } = await sb
        .from("post_likes")
        .insert({
          post_id: postId,
          user_id: user.id
        });

      if (insertError) throw insertError;
    }

    await renderView(currentView);
  } catch (error) {
    toast(safeError(error, "Unable to update like."));
  }
}


/* =========================================================
   26. COMMENTS
========================================================= */

async function openComments(postId) {
  commentsPost = postId;

  const { data, error } = await sb
    .from("comments")
    .select("id,user_id,content,created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) return toast(safeError(error));

  const comments = data || [];

  const userIds = [...new Set(comments.map(c => c.user_id))];

  const authors = {};

  if (userIds.length) {
    const { data: profiles } = await sb
      .from("profiles")
      .select("id,username,display_name")
      .in("id", userIds);

    (profiles || []).forEach(p => {
      authors[p.id] = p;
    });
  }

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
            <b>
              ${esc(
                authors[c.user_id]?.display_name ||
                authors[c.user_id]?.username ||
                "User"
              )}
            </b>

            <div style="margin-top:6px;white-space:pre-wrap;word-break:break-word;">
              ${esc(c.content)}
            </div>

            ${
              c.user_id === user.id
                ? `<button class="iconbtn"
                    onclick="deleteComment('${esc(c.id)}')">🗑</button>`
                : ""
            }
          </div>
        `).join("") || `<div class="muted">No comments yet.</div>`
      }
    </div>

    <div class="row">
      <input
        id="commentInput"
        class="field"
        maxlength="500"
        placeholder="Write a comment...">

      <button class="btn" onclick="addComment()">Send</button>
    </div>
  `;

  $("modal")?.classList.remove("hidden");
}


async function addComment() {
  if (!user || !commentsPost) return;

  const input = $("commentInput");
  const content = input?.value?.trim() || "";

  if (!content) return;

  if (content.length > 500) {
    return toast("Comment is too long.");
  }

  const { error } = await sb
    .from("comments")
    .insert({
      post_id: commentsPost,
      user_id: user.id,
      content
    });

  if (error) return toast(safeError(error));

  await openComments(commentsPost);

  const refreshedInput = $("commentInput");

  if (refreshedInput) refreshedInput.focus();

  await renderView(currentView);
}


async function deleteComment(id) {
  if (!user || !id) return;

  if (!confirm("Delete your comment?")) return;

  const { error } = await sb
    .from("comments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return toast(safeError(error));

  toast("Comment deleted.");

  await openComments(commentsPost);

  await renderView(currentView);
}


/* =========================================================
   27. SHARE POSTS
========================================================= */

async function sharePost(postId) {
  const url =
    window.location.href.split("#")[0] + "#post-" + postId;

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Vidora",
        text: "Check out this Vidora post.",
        url
      });
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);

      toast("Post link copied.");
    } else {
      toast("Sharing is not supported on this browser.");
    }
  } catch (error) {
    console.log("SHARE:", error);
  }
}


/* =========================================================
   28. DISCOVER USERS
========================================================= */

async function renderDiscover() {
  $("main").innerHTML = `
    <section class="panel">
      <div class="title">Discover</div>

      <input
        id="userSearch"
        class="field"
        placeholder="Search users...">

      <div id="discoverResults">
        Search for users.
      </div>
    </section>
  `;

  $("userSearch")?.addEventListener("input", event => {
    clearTimeout(window.__vidoraSearchTimer);

    window.__vidoraSearchTimer = setTimeout(() => {
      searchUsers(event.target.value);
    }, 350);
  });
}


async function searchUsers(query) {
  const box = $("discoverResults");

  if (!box) return;

  query = String(query || "").trim();

  if (!query) {
    box.innerHTML = "Search for users.";
    return;
  }

  const safeQuery = query
    .replace(/[,%()]/g, " ")
    .trim();

  if (!safeQuery) {
    box.innerHTML = "Enter a valid username.";
    return;
  }

  const { data, error } = await sb
    .from("profiles")
    .select("id,username,display_name,avatar_url")
    .or(
      `username.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%`
    )
    .limit(30);

  if (error) {
    box.innerHTML = esc(safeError(error));
    return;
  }

  const people = data || [];

  box.innerHTML = people.map(person => `
    <div class="panel row">
      <img
        class="avatar sm"
        src="${esc(avatarSrc(person.avatar_url))}"
        alt="">

      <div>
        <b>${esc(person.display_name || person.username || "User")}</b>
        <div class="muted">@${esc(person.username || "user")}</div>
      </div>

      <span class="spacer"></span>

      ${
        person.id !== user.id
          ? `<button class="btn"
              onclick="toggleFollow('${esc(person.id)}')">
              Follow
            </button>`
          : ""
      }
    </div>
  `).join("") || `<div class="muted">No users found.</div>`;
}


/* =========================================================
   29. FOLLOW AND UNFOLLOW
========================================================= */

async function toggleFollow(targetId) {
  if (!user || !targetId) return;

  if (targetId === user.id) {
    return toast("You cannot follow yourself.");
  }

  try {
    const { data, error } = await sb
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", targetId)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      const { error: deleteError } = await sb
        .from("follows")
        .delete()
        .eq("id", data.id)
        .eq("follower_id", user.id);

      if (deleteError) throw deleteError;

      toast("Unfollowed.");
    } else {
      const { error: insertError } = await sb
        .from("follows")
        .insert({
          follower_id: user.id,
          following_id: targetId
        });

      if (insertError) throw insertError;

      toast("Following.");
    }

    if (currentView === "discover") {
      await searchUsers($("userSearch")?.value || "");
    }
  } catch (error) {
    toast(safeError(error, "Unable to update follow."));
  }
}


/* =========================================================
   30. PROFILE PAGE
========================================================= */

async function renderProfile(id) {
  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    $("main").innerHTML = `
      <div class="panel">
        ${esc(safeError(error, "Unable to load profile."))}
      </div>
    `;

    return;
  }

  const p = data || profile || {};

  if (id === user.id) profile = p;

  const { count: postCount } = await sb
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", id);

  const { count: followerCount } = await sb
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("following_id", id);

  const { count: followingCount } = await sb
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("follower_id", id);

  $("main").innerHTML = `
    <section class="panel">
      <div style="text-align:center">

        <img
          class="avatar lg"
          src="${esc(avatarSrc(p.avatar_url))}"
          alt="Profile avatar">

        <h2>${esc(p.display_name || p.username || "User")}</h2>

        <div class="muted">@${esc(p.username || "user")}</div>

        ${
          p.bio
            ? `<p class="muted">${esc(p.bio)}</p>`
            : ""
        }

        <div class="row wrap" style="justify-content:center;margin-top:14px">
          <div class="panel">
            <b>${postCount || 0}</b>
            <div class="muted">Posts</div>
          </div>

          <div class="panel">
            <b>${followerCount || 0}</b>
            <div class="muted">Followers</div>
          </div>

          <div class="panel">
            <b>${followingCount || 0}</b>
            <div class="muted">Following</div>
          </div>
        </div>

        ${
          id === user.id
            ? `
              <button class="btn"
                onclick="renderAvatarPicker()">
                Change Avatar
              </button>

              <button class="btn danger"
                onclick="logout()">
                Logout
              </button>
            `
            : `
              <button class="btn"
                onclick="toggleFollow('${esc(id)}')">
                Follow / Unfollow
              </button>
            `
        }

      </div>
    </section>
  `;
}


/* =========================================================
   31. VIDORA AVATARS
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


async function renderAvatarPicker() {
  if (!user) return toast("Please log in first.");

  const currentAvatar = profile?.avatar_url || "";

  $("sheet").innerHTML = `
    <div class="row">
      <div>
        <h2>Choose Avatar</h2>
        <div class="muted">
          Choose a Vidora avatar or upload your own picture.
        </div>
      </div>

      <span class="spacer"></span>

      <button class="iconbtn" onclick="closeModal()">×</button>
    </div>

    <div class="panel">
      <div class="title">📷 Upload Your Picture</div>

      <input
        id="customAvatarInput"
        class="field"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onchange="handleCustomAvatar(this.files[0])">

      <div id="avatarUploadStatus" class="status"></div>
    </div>

    <div class="title">✨ Vidora Avatars</div>

    <div class="avatar-grid"
      style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">

      ${VIDORA_AVATARS.map(avatar => `
        <button
          type="button"
          onclick="saveAvatar('${avatar.file}')"
          style="padding:8px;border-radius:16px;border:2px solid ${
            currentAvatar === avatar.file
              ? "var(--purple)"
              : "var(--border)"
          };background:var(--surface2);color:var(--text)">

          <img
            src="${esc(avatar.file)}"
            alt="${esc(avatar.name)}"
            loading="lazy"
            style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:11px"
            onerror="this.style.opacity='.25'">

          <div style="padding:8px;font-weight:700">
            ${esc(avatar.name)}
          </div>

          ${
            currentAvatar === avatar.file
              ? "<span>✓ Selected</span>"
              : ""
          }
        </button>
      `).join("")}

    </div>
  `;

  $("modal")?.classList.remove("hidden");
}


async function saveAvatar(filePath) {
  if (!user) return toast("Please log in first.");

  try {
    const { error } = await sb
      .from("profiles")
      .update({ avatar_url: filePath })
      .eq("id", user.id);

    if (error) throw error;

    profile = {
      ...(profile || {}),
      avatar_url: filePath
    };

    toast("Avatar updated!");

    closeModal();

    await renderView("profile");
  } catch (error) {
    console.error("SAVE AVATAR ERROR:", error);

    toast(safeError(error, "Unable to save avatar."));
  }
}


async function handleCustomAvatar(file) {
  if (!file || !user) return;

  const status = $("avatarUploadStatus");

  try {
    if (!file.type.startsWith("image/")) {
      throw new Error("Choose an image.");
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error("Profile picture must be 10MB or smaller.");
    }

    if (status) status.textContent = "Uploading...";

    const extension = (
      file.name.split(".").pop() || "jpg"
    ).toLowerCase().replace(/[^a-z0-9]/g, "");

    const filePath =
      `avatars/${user.id}/${Date.now()}_${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await sb.storage
      .from("media")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (uploadError) throw uploadError;

    const { data } = sb.storage
      .from("media")
      .getPublicUrl(filePath);

    const avatarUrl = data?.publicUrl;

    if (!avatarUrl) {
      throw new Error("Unable to create profile picture URL.");
    }

    const { error } = await sb
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);

    if (error) throw error;

    profile = {
      ...(profile || {}),
      avatar_url: avatarUrl
    };

    toast("Profile picture updated!");

    closeModal();

    await renderView("profile");
  } catch (error) {
    console.error("AVATAR UPLOAD ERROR:", error);

    if (status) status.textContent = safeError(error);

    toast(safeError(error));
  }
}



/* =========================================================
   32. VIDORA MESSAGING UPGRADE
   Uses existing messages table:
   sender_id, receiver_id, content, voice_url, created_at
========================================================= */

let chatRefreshTimer = null;
let messageSearchTimer = null;

async function renderMessages() {
  const main = $("main");
  if (!main || !user) return;

  if (chatRefreshTimer) {
    clearInterval(chatRefreshTimer);
    chatRefreshTimer = null;
  }

  main.innerHTML = `
    <section class="panel vidora-messages">
      <div class="row">
        <div>
          <div class="title">Messages 💬</div>
          <div class="muted">Chat with your Vidora connections</div>
        </div>
      </div>

      <input
        id="chatSearch"
        class="field"
        type="search"
        placeholder="Search people..."
        autocomplete="off">

      <div id="messageUsers">
        <div class="muted">Loading conversations...</div>
      </div>
    </section>
  `;

  const search = $("chatSearch");

  search?.addEventListener("input", () => {
    clearTimeout(messageSearchTimer);

    messageSearchTimer = setTimeout(() => {
      loadChatPeople(search.value);
    }, 250);
  });

  await loadChatPeople("");
}

async function loadChatPeople(query = "") {
  const box = $("messageUsers");
  if (!box || !user) return;

  box.innerHTML = `<div class="muted">Loading people...</div>`;

  try {
    // Include people the user follows and people who follow the user.
    const [followingResult, followersResult] = await Promise.all([
      sb.from("follows")
        .select("following_id")
        .eq("follower_id", user.id),

      sb.from("follows")
        .select("follower_id")
        .eq("following_id", user.id)
    ]);

    if (followingResult.error) throw followingResult.error;
    if (followersResult.error) throw followersResult.error;

    const ids = new Set([
      ...(followingResult.data || []).map(row => row.following_id),
      ...(followersResult.data || []).map(row => row.follower_id)
    ]);

    let people = [];

    if (ids.size) {
      const { data, error } = await sb
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .in("id", [...ids]);

      if (error) throw error;
      people = data || [];
    }

    const normalizedQuery = String(query || "").trim().toLowerCase();

    people = people.filter(person => {
      const name = person.display_name || "";
      const username = person.username || "";

      return (
        person.id !== user.id &&
        (
          !normalizedQuery ||
          name.toLowerCase().includes(normalizedQuery) ||
          username.toLowerCase().includes(normalizedQuery)
        )
      );
    });

    people.sort((a, b) =>
      (a.display_name || a.username || "")
        .localeCompare(b.display_name || b.username || "")
    );

    if (!people.length) {
      box.innerHTML = `
        <div class="panel muted">
          ${
            normalizedQuery
              ? "No matching people found."
              : "No connections yet. Follow someone or connect with a follower to start chatting."
          }
        </div>
      `;
      return;
    }

    box.innerHTML = people.map(person => `
      <button
        type="button"
        class="panel row vidora-chat-person"
        style="
          width:100%;
          text-align:left;
          align-items:center;
          margin-top:8px;
          cursor:pointer;
        "
        onclick="openChat('${esc(person.id)}')">

        <img
          class="avatar sm"
          src="${esc(avatarSrc(person.avatar_url))}"
          alt=""
          style="flex-shrink:0">

        <div style="min-width:0;flex:1">
          <div style="font-weight:700;overflow-wrap:anywhere">
            ${esc(person.display_name || person.username || "User")}
          </div>
          <div class="muted">@${esc(person.username || "user")}</div>
        </div>

        <span aria-hidden="true">›</span>
      </button>
    `).join("");

  } catch (error) {
    console.error("CHAT PEOPLE ERROR:", error);

    box.innerHTML = `
      <div class="panel">
        <b>Unable to load chats.</b>
        <div class="muted">${esc(safeError(error))}</div>
        <button class="btn" onclick="renderMessages()">Try again</button>
      </div>
    `;
  }
}

function formatMessageTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function openChat(userId) {
  if (!user || !userId) return;

  if (chatRefreshTimer) {
    clearInterval(chatRefreshTimer);
    chatRefreshTimer = null;
  }

  try {
    const { data: person, error: personError } = await sb
      .from("profiles")
      .select("id,username,display_name,avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (personError) throw personError;
    if (!person) throw new Error("This user could not be found.");

    chatUser = person;

    $("sheet").innerHTML = `
      <div class="vidora-chat-window">

        <div class="row" style="align-items:center">
          <button
            class="iconbtn"
            type="button"
            onclick="backToMessages()"
            aria-label="Back to messages">←</button>

          <img
            class="avatar sm"
            src="${esc(avatarSrc(person.avatar_url))}"
            alt="">

          <div style="min-width:0;flex:1">
            <b>${esc(person.display_name || person.username || "Chat")}</b>
            <div class="muted">@${esc(person.username || "user")}</div>
          </div>

          <button
            class="iconbtn"
            type="button"
            onclick="closeModal()"
            aria-label="Close chat">×</button>
        </div>

        <div
          id="chatMessages"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
          style="
            display:flex;
            flex-direction:column;
            gap:8px;
            max-height:55vh;
            min-height:180px;
            overflow-y:auto;
            padding:12px 2px;
          ">
          <div class="muted">Loading messages...</div>
        </div>

        <form
          id="messageForm"
          class="row"
          style="align-items:center;gap:8px">

          <input
            id="messageInput"
            class="field"
            maxlength="2000"
            autocomplete="off"
            placeholder="Write a message..."
            aria-label="Message text"
            style="min-width:0;flex:1">

          <button
            id="sendMessageBtn"
            class="btn primary"
            type="submit">Send</button>
        </form>

        <div id="chatStatus" class="muted" role="status"></div>
      </div>
    `;

    $("modal")?.classList.remove("hidden");

    $("messageForm")?.addEventListener("submit", async event => {
      event.preventDefault();
      await sendMessage();
    });

    await refreshChatMessages();

    // Poll for new messages while this chat is open.
    chatRefreshTimer = setInterval(async () => {
      if (
        currentView === "messages" &&
        chatUser?.id === userId &&
        !$("modal")?.classList.contains("hidden")
      ) {
        await refreshChatMessages(true);
      } else {
        clearInterval(chatRefreshTimer);
        chatRefreshTimer = null;
      }
    }, 5000);

  } catch (error) {
    console.error("OPEN CHAT ERROR:", error);
    toast(safeError(error, "Unable to open chat."));
  }
}

async function refreshChatMessages(quiet = false) {
  if (!user || !chatUser) return;

  const box = $("chatMessages");
  if (!box) return;

  const wasNearBottom =
    box.scrollHeight - box.scrollTop - box.clientHeight < 100;

  try {
    const myId = user.id;
    const otherId = chatUser.id;

    const { data, error } = await sb
      .from("messages")
      .select("id,sender_id,receiver_id,content,voice_url,created_at")
      .or(
        `and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`
      )
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) throw error;

    if (!box.isConnected) return;

    const messages = data || [];

    box.innerHTML = messages.map(message => {
      const mine = message.sender_id === myId;

      return `
        <div style="
          align-self:${mine ? "flex-end" : "flex-start"};
          width:fit-content;
          max-width:85%;
          min-width:65px;
          padding:10px 12px;
          border-radius:16px;
          background:${mine ? "var(--purple, #8b5cf6)" : "var(--surface2, #20202b)"};
          color:${mine ? "#fff" : "var(--text, #fff)"};
          overflow-wrap:anywhere;
        ">
          ${
            message.content
              ? `<div style="white-space:pre-wrap">${esc(message.content)}</div>`
              : ""
          }

          ${
            message.voice_url
              ? `<audio
                  controls
                  preload="none"
                  src="${esc(message.voice_url)}"
                  style="display:block;max-width:100%;width:230px;margin-top:6px">
                </audio>`
              : ""
          }

          <div style="
            font-size:10px;
            opacity:.8;
            text-align:right;
            margin-top:5px">
            ${esc(formatMessageTime(message.created_at))}
          </div>
        </div>
      `;
    }).join("") || `
      <div class="muted" style="margin:auto">
        No messages yet. Say hello 👋
      </div>
    `;

    if (wasNearBottom || !quiet) {
      box.scrollTop = box.scrollHeight;
    }

    const status = $("chatStatus");
    if (status) status.textContent = "";

  } catch (error) {
    console.error("REFRESH CHAT ERROR:", error);

    if (!quiet) {
      const status = $("chatStatus");
      if (status) status.textContent = safeError(error);
    }
  }
}

async function sendMessage() {
  if (!user || !chatUser) {
    return toast("Open a chat first.");
  }

  const input = $("messageInput");
  const button = $("sendMessageBtn");
  const content = input?.value?.trim() || "";

  if (!content) return;
  if (content.length > 2000) return toast("Message is too long.");

  if (button) {
    button.disabled = true;
    button.textContent = "Sending...";
  }

  try {
    const { error } = await sb
      .from("messages")
      .insert({
        sender_id: user.id,
        receiver_id: chatUser.id,
        content: content,
        voice_url: null
      });

    if (error) throw error;

    if (input) input.value = "";

    await refreshChatMessages();

    input?.focus();

  } catch (error) {
    console.error("SEND MESSAGE ERROR:", error);

    const status = $("chatStatus");

    if (status) {
      status.textContent = safeError(error, "Unable to send message.");
    } else {
      toast(safeError(error, "Unable to send message."));
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Send";
    }
  }
}

function backToMessages() {
  if (chatRefreshTimer) {
    clearInterval(chatRefreshTimer);
    chatRefreshTimer = null;
  }

  chatUser = null;
  closeModal();
  renderMessages();
}




  


/* =========================================================
   33. NOTIFICATIONS
========================================================= */

async function loadNotifications() {
  if (!user) return;

  const { count, error } = await sb
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

  const badge = $("notifCount");

  if (badge && !error) {
    badge.textContent = count > 0 ? String(count) : "";
  }
}


async function renderNotifications() {
  if (!user) return;

  const { data, error } = await sb
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return toast(safeError(error));

  $("sheet").innerHTML = `
    <div class="row">
      <b>Notifications</b>

      <span class="spacer"></span>

      <button class="iconbtn" onclick="closeModal()">×</button>
    </div>

    ${
      (data || []).map(notification => `
        <div class="panel">
          <b>${esc(notification.type || "Notification")}</b>

          ${
            notification.message
              ? `<div>${esc(notification.message)}</div>`
              : ""
          }
        </div>
      `).join("") || `<div class="muted">No notifications.</div>`
    }
  `;

  $("modal")?.classList.remove("hidden");
}


/* =========================================================
   34. VIDORA AI ASSISTANT
========================================================= */

function openAssistant() {
  $("assistantBox")?.classList.remove("hidden");
}

function closeAssistant() {
  $("assistantBox")?.classList.add("hidden");
}

function assistantSay(message, from = "ai") {
  const box = $("assistantMessages");

  if (!box) return;

  const div = document.createElement("div");

  div.className = "panel";

  const heading = document.createElement("b");

  heading.textContent = from === "user" ? "You" : "Vidora AI";

  const content = document.createElement("div");

  content.style.marginTop = "5px";
  content.textContent = message;

  div.append(heading, content);

  box.appendChild(div);

  box.scrollTop = box.scrollHeight;
}


async function assistantSend() {
  const input = $("assistantInput");

  const message = input?.value?.trim() || "";

  if (!message) return;

  input.value = "";

  assistantSay(message, "user");

  assistantHistory.push({
    role: "user",
    content: message
  });

  const lower = message.toLowerCase();

  const replies = [
    [
      ["hello", "hi", "hey"],
      "Hey! I'm Vidora AI. Ask me about posts, stories, music, filters, avatars, messaging or other Vidora features."
    ],
    [
      ["logout", "sign out"],
      "Open your Profile page and tap Logout."
    ],
    [
      ["post", "upload", "publish"],
      "Go to Create, choose a photo or video, optionally select a filter and music, add a caption and tap Publish to Vidora."
    ],
    [
      ["story", "stories", "status"],
      "Open Create and use the Create Story section. Choose your photo or video, select a filter or music, and publish your story. Viewers can react to stories."
    ],
    [
      ["music", "song", "audio"],
      "Vidora includes built-in music and custom song uploads. Select a track while creating a post or story."
    ],
    [
      ["filter", "effect", "wealthy", "golden hour"],
      "Vidora has Original, Vivid, Beauty, Glow, Golden Hour, Wealthy, Rich Gold, Luxury, Diamond, Neon, Pink Dream, Noir and many more color filters. These do not use face tracking."
    ],
    [
      ["avatar", "profile picture", "pfp"],
      "Open Profile and select Change Avatar. Choose one of the Vidora avatars or upload your own picture."
    ],
    [
      ["message", "chat", "dm"],
      "Open Messages and tap a user you follow to start a conversation."
    ],
    [
      ["follow", "discover", "search"],
      "Open Discover, search for a username or display name, and use Follow to connect."
    ],
    [
      ["delete", "remove"],
      "You can delete your own posts, stories and comments using their delete buttons."
    ],
    [
      ["like", "heart", "reaction"],
      "Tap the heart below a post to like it. When viewing a story, select a reaction such as ❤️, 😂, 🔥 or 😍."
    ],
    [
      ["comment"],
      "Tap the comment button under a post to read, add or delete your own comments."
    ],
    [
      ["share"],
      "Use the Share button on a post to open your device's sharing options or copy a post link."
    ],
    [
      ["who are you", "what are you", "your name"],
      "I'm Vidora AI, your in-app assistant. I can guide you through Vidora's features."
    ],
    [
      ["help", "guide"],
      "I can explain how to use posts, stories, music, filters, avatars, messaging, likes, comments, reactions and Discover."
    ],
    [
      ["thank", "thanks"],
      "You're welcome! Enjoy Vidora 💜"
    ]
  ];

  for (const [keywords, reply] of replies) {
    if (keywords.some(keyword => lower.includes(keyword))) {
      assistantSay(reply);
      return;
    }
  }

  assistantSay(
    "I'm Vidora AI. Ask me about posts, stories, reactions, music, filters, avatars, messaging, likes, comments or Discover."
  );
}


/* =========================================================
   35. MODAL
========================================================= */

function closeModal() {
  stopStoryAudio();

  $("modal")?.classList.add("hidden");
}


/* =========================================================
   36. LOGOUT
========================================================= */

async function logout() {
  try {
    const { error } = await sb.auth.signOut();

    if (error) throw error;

    user = null;
    profile = null;

    stopStoryAudio();

    $("app")?.classList.add("hidden");
    $("authScreen")?.classList.remove("hidden");
  } catch (error) {
    toast(safeError(error, "Unable to logout."));
  }
}


/* =========================================================
   37. GLOBAL FUNCTIONS
========================================================= */

window.login = login;
window.signup = signup;

window.renderView = renderView;

window.publishPost = publishPost;
window.publishStory = publishStory;

window.deletePost = deletePost;
window.deleteStory = deleteStory;
window.deleteComment = deleteComment;

window.toggleLike = toggleLike;
window.reactToStory = reactToStory;

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

window.openAssistant = openAssistant;
window.closeAssistant = closeAssistant;
window.assistantSend = assistantSend;


/* =========================================================
   38. DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  console.log("VIDORA APP.JS LOADED");

  $("loginBtn")?.addEventListener("click", login);

  $("signupBtn")?.addEventListener("click", signup);

  $("showSignupBtn")?.addEventListener("click", () => {
    $("loginForm")?.classList.add("hidden");
    $("signupForm")?.classList.remove("hidden");

    showStatus($("authStatus"), "");
  });

  $("showLoginBtn")?.addEventListener("click", () => {
    $("signupForm")?.classList.add("hidden");
    $("loginForm")?.classList.remove("hidden");

    showStatus($("authStatus"), "");
  });

  document.querySelectorAll(".nav button").forEach(button => {
    button.addEventListener("click", () => {
      renderView(button.dataset.view);
    });
  });

  $("openNotificationsBtn")?.addEventListener(
    "click",
    renderNotifications
  );

  $("openAvatarBtn")?.addEventListener(
    "click",
    renderAvatarPicker
  );

  $("assistantFab")?.addEventListener(
    "click",
    openAssistant
  );

  $("closeAssistant")?.addEventListener(
    "click",
    closeAssistant
  );

  $("assistantSend")?.addEventListener(
    "click",
    assistantSend
  );

  $("assistantInput")?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      assistantSend();
    }
  });

  $("modal")?.addEventListener("click", event => {
    if (event.target === $("modal")) {
      closeModal();
    }
  });

  init();
});
