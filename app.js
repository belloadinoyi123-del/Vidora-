/* =========================================================
   VIDORA — APP.JS
   Video feed • Rotational swipe • Music • Filters
   Likes • Comments • Uploads • Profiles • Skye assistant
   ========================================================= */

"use strict";

/* ===================== CONFIGURATION ===================== */

const SUPABASE_URL =
  "https://htnrqgzxkfktwoioscjr.supabase.co";

/*
  IMPORTANT:
  Replace YOUR_EXISTING_SUPABASE_ANON_KEY with your project's
  public anon/publishable key from Supabase API settings.

  NEVER put your service_role key in frontend JavaScript.
*/

const SUPABASE_ANON_KEY = "sb_publishable_JT5rBfXYSX3-3_zyC2cazQ_YXg_ih_h";

const MUSIC_TRACKS = [
  { name: "Original sound", url: "" },
  { name: "Upload your own music", url: "" }
];

const VIDEO_FILTERS = [
  { name: "Normal", value: "none" },
  { name: "Warm", value: "sepia(0.18) saturate(1.25)" },
  { name: "Vintage", value: "sepia(0.35) contrast(0.92)" },
  { name: "Grayscale", value: "grayscale(1)" },
  { name: "Vivid", value: "saturate(1.6) contrast(1.08)" },
  { name: "Dreamy", value: "brightness(1.08) saturate(1.2)" },
  { name: "Cool", value: "hue-rotate(12deg) saturate(1.1)" }
];

const AVATARS = [
  { name: "Skye", emoji: "🌌", color: "#8b5cf6" },
  { name: "Neo", emoji: "🤖", color: "#06b6d4" },
  { name: "Nova", emoji: "✨", color: "#ff2d75" },
  { name: "Luna", emoji: "🌙", color: "#818cf8" },
  { name: "Ace", emoji: "⚡", color: "#f59e0b" },
  { name: "Pixel", emoji: "🎮", color: "#22c55e" },
  { name: "Echo", emoji: "🎧", color: "#ec4899" },
  { name: "Orbit", emoji: "🪐", color: "#a78bfa" },
  { name: "Blaze", emoji: "🔥", color: "#ef4444" },
  { name: "Cloud", emoji: "☁️", color: "#38bdf8" },
  { name: "Milo", emoji: "🐼", color: "#64748b" },
  { name: "Sunny", emoji: "☀️", color: "#facc15" }
];

const FILTERS = VIDEO_FILTERS;

/* ===================== APPLICATION STATE ===================== */

const state = {
  supabase: null,
  user: null,
  profile: null,
  posts: [],
  currentIndex: 0,
  likedPosts: new Set(),
  activeFilter: "none",
  selectedMusic: null,
  localFiles: new Map(),
  localComments: new Map(),
  following: new Set(),
  stories: [],
  isMuted: true,
  touchStartX: 0,
  touchStartY: 0,
  touchStartTime: 0,
  rotationStartAngle: null,
  currentView: "homeView",
  assistantName: "Skye",
  assistantAvatar: AVATARS[0],
  speechEnabled: false,
  currentAudio: null
};

/* ===================== HELPERS ===================== */

const $ = (id) => document.getElementById(id);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function notify(message) {
  let box = $("vidoraToast");

  if (!box) {
    box = document.createElement("div");
    box.id = "vidoraToast";
    box.style.cssText = `
      position:fixed;
      left:50%;
      bottom:95px;
      transform:translateX(-50%);
      z-index:99999;
      background:#191925;
      color:white;
      padding:12px 18px;
      border-radius:14px;
      box-shadow:0 8px 30px #0008;
      max-width:85%;
      font-size:14px;
      text-align:center;
      display:none;
    `;
    document.body.appendChild(box);
  }

  box.textContent = message;
  box.style.display = "block";

  clearTimeout(box._timer);
  box._timer = setTimeout(() => {
    box.style.display = "none";
  }, 2800);
}

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value ?? "";
}

function formatCount(value) {
  const number = Number(value) || 0;

  if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + "M";
  }

  if (number >= 1000) {
    return (number / 1000).toFixed(1) + "K";
  }

  return String(number);
}

function makeId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now() + "-" + Math.random().toString(36).slice(2);
}

function getUsername() {
  return (
    state.profile?.username ||
    state.user?.email?.split("@")[0] ||
    "vidora_user"
  );
}

function getDisplayName() {
  return (
    state.profile?.display_name ||
    state.profile?.username ||
    state.user?.email?.split("@")[0] ||
    "Vidora Creator"
  );
}

function requireLogin() {
  if (!state.user) {
    notify("Please log in first.");
    showAuth();
    return false;
  }

  return true;
}

function showAuth() {
  const auth = $("authScreen");
  const app = $("appShell");

  if (auth) auth.style.display = "flex";
  if (app) app.style.display = "none";
}

/* ===================== SUPABASE ===================== */

function initSupabase() {
  if (!window.supabase?.createClient) {
    console.warn("Supabase library was not loaded.");
    notify("Supabase library not found.");
    return;
  }

  if (
    !SUPABASE_ANON_KEY ||
    SUPABASE_ANON_KEY === "YOUR_EXISTING_SUPABASE_ANON_KEY"
  ) {
    console.warn("Add your public Supabase anon/publishable key.");
    notify("Add your Supabase public key in app.js.");
    return;
  }

  state.supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  state.supabase.auth.onAuthStateChange((_event, session) => {
    state.user = session?.user || null;

    setTimeout(async () => {
      if (state.user) {
        await loadProfile();
        await loadFeed();
        showApp();
      } else {
        showAuth();
      }
    }, 0);
  });

  state.supabase.auth.getSession().then(async ({ data, error }) => {
    if (error) console.error(error);

    state.user = data?.session?.user || null;

    if (state.user) {
      await loadProfile();
      await loadFeed();
      showApp();
    } else {
      showAuth();
    }
  });
}

function showApp() {
  if ($("authScreen")) $("authScreen").style.display = "none";
  if ($("appShell")) $("appShell").style.display = "block";

  updateProfileUI();
  showView("homeView");
}

/* ===================== AUTHENTICATION ===================== */

function setAuthMode(mode) {
  const isSignup = mode === "signup";

  if ($("loginFields")) {
    $("loginFields").style.display = isSignup ? "none" : "block";
  }

  if ($("signupWizard")) {
    $("signupWizard").style.display = isSignup ? "block" : "none";
  }

  if ($("authSubmit")) {
    $("authSubmit").textContent = isSignup
      ? "Create account"
      : "Log in";
  }
}

async function handleAuth(event) {
  event?.preventDefault();

  if (!state.supabase) {
    notify("Configure Supabase before logging in.");
    return;
  }

  const isSignup =
    $("signupWizard") &&
    $("signupWizard").style.display !== "none";

  const email = (
    isSignup ? $("authEmail")?.value : $("loginEmail")?.value
  )?.trim();

  const password = (
    isSignup ? $("authPassword")?.value : $("loginPassword")?.value
  )?.trim();

  if (!email || !password) {
    notify("Enter your email and password.");
    return;
  }

  try {
    if (isSignup) {
      const username = $("authUsername")?.value.trim();
      const displayName = $("authDisplayName")?.value.trim();

      if (!username) {
        notify("Choose a username.");
        return;
      }

      if ($("authTerms") && !$("authTerms").checked) {
        notify("Please accept the terms first.");
        return;
      }

      const { data, error } =
        await state.supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              display_name: displayName || username,
              bio: $("authBio")?.value.trim() || ""
            }
          }
        });

      if (error) throw error;

      if (data.user && data.session) {
        state.user = data.user;
        await createProfileIfNeeded({
          username,
          display_name: displayName || username,
          bio: $("authBio")?.value.trim() || ""
        });
        await loadProfile();
        await loadFeed();
        showApp();
      } else {
        notify("Account created. Check your email to verify it.");
      }
    } else {
      const { data, error } =
        await state.supabase.auth.signInWithPassword({
          email,
          password
        });

      if (error) throw error;

      state.user = data.user;
      await loadProfile();
      await loadFeed();
      showApp();
    }
  } catch (error) {
    console.error("Authentication error:", error);
    notify(error.message || "Authentication failed.");
  }
}

async function logout() {
  if (!state.supabase) return;

  const { error } = await state.supabase.auth.signOut();

  if (error) {
    console.error(error);
    notify("Could not log out.");
    return;
  }

  state.user = null;
  state.profile = null;
  state.posts = [];
  showAuth();
}

async function createProfileIfNeeded(details) {
  if (!state.supabase || !state.user) return;

  const { error } = await state.supabase
    .from("profiles")
    .upsert({
      id: state.user.id,
      username: details.username,
      display_name: details.display_name,
      bio: details.bio
    }, { onConflict: "id" });

  if (error) {
    console.warn("Profile creation failed:", error.message);
  }
}

async function loadProfile() {
  if (!state.supabase || !state.user) return;

  const { data, error } = await state.supabase
    .from("profiles")
    .select("*")
    .eq("id", state.user.id)
    .maybeSingle();

  if (error) {
    console.warn("Could not load profile:", error.message);
    return;
  }

  state.profile = data || {
    id: state.user.id,
    username: state.user.user_metadata?.username || "creator",
    display_name:
      state.user.user_metadata?.display_name || "Vidora Creator",
    bio: ""
  };

  updateProfileUI();
}

/* ===================== PROFILE ===================== */

function updateProfileUI() {
  setText("profileDisplayName", getDisplayName());
  setText("profileUsername", "@" + getUsername());

  const avatar = $("profileAvatar");

  if (avatar) {
    const image = state.profile?.avatar_url;

    if (image) {
      avatar.innerHTML =
        `<img src="${escapeHTML(image)}" alt="Profile avatar"
        style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else {
      avatar.textContent = state.assistantAvatar.emoji;
    }
  }

  const ownPosts = state.posts.filter(
    post => post.user_id === state.user?.id
  );

  setText("postCount", ownPosts.length);
  setText("followerCount", state.profile?.follower_count || 0);
  setText("followingCount", state.profile?.following_count || 0);

  renderMyPosts();
}

function renderMyPosts() {
  const container = $("myPosts");
  if (!container) return;

  const ownPosts = state.posts.filter(
    post => post.user_id === state.user?.id
  );

  if (!ownPosts.length) {
    container.innerHTML = "<p>You haven't posted anything yet.</p>";
    return;
  }

  container.innerHTML = ownPosts.map(post => `
    <article class="vidora-profile-post">
      <p>${escapeHTML(post.caption || "My Vidora post")}</p>
      <button type="button" data-delete-post="${escapeHTML(post.id)}">
        Delete post
      </button>
    </article>
  `).join("");
}

/* ===================== FEED ===================== */

async function loadFeed() {
  if (!state.supabase) {
    renderFeed();
    return;
  }

  try {
    const { data, error } = await state.supabase
      .from("posts")
      .select(`
        id,
        user_id,
        media_url,
        media_type,
        caption,
        created_at
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    state.posts = (data || []).map(post => ({
      ...post,
      likes: Number(post.likes) || 0,
      comments: Number(post.comments) || 0
    }));

    state.currentIndex = Math.min(
      state.currentIndex,
      Math.max(state.posts.length - 1, 0)
    );

    renderFeed();
    updateProfileUI();
  } catch (error) {
    console.error("Feed error:", error);
    notify("Could not load posts. Check your Supabase posts table.");
    renderFeed();
  }
}

function renderFeed() {
  const feed = $("feed");
  if (!feed) return;

  if (!state.posts.length) {
    feed.innerHTML = `
      <div class="vidora-empty-feed">
        <h2>Welcome to Vidora ✨</h2>
        <p>Watch, swipe, create and connect.</p>
        <p>Be the first to publish a video!</p>
      </div>
    `;
    return;
  }

  const post = state.posts[state.currentIndex];

  if (!post) return;

  const isLiked = state.likedPosts.has(String(post.id));
  const mediaType = post.media_type || "video";
  const source = state.localFiles.get(String(post.id)) || post.media_url;

  feed.innerHTML = `
    <article class="vidora-player" id="vidoraPlayer"
      data-post-id="${escapeHTML(post.id)}">

      <div class="vidora-media-wrap">
        ${
          source && mediaType.startsWith("image")
            ? `<img class="vidora-media" src="${escapeHTML(source)}"
                alt="Vidora post">`
            : source
              ? `<video class="vidora-media" id="vidoraVideo"
                    src="${escapeHTML(source)}"
                    playsinline
                    loop
                    muted
                    preload="metadata"></video>`
              : `<div class="vidora-no-media">
                  <div>🎬</div>
                  <p>Media unavailable</p>
                </div>`
        }

        <div class="vidora-top-label">VIDORA</div>

        <button class="vidora-mute" id="vidoraMute" type="button">
          🔇
        </button>

        <div class="vidora-actions">
          <button type="button" data-action="like">
            ${isLiked ? "❤️" : "🤍"}
            <span>${formatCount(post.likes || 0)}</span>
          </button>

          <button type="button" data-action="comments">
            💬
            <span>${formatCount(post.comments || 0)}</span>
          </button>

          <button type="button" data-action="share">↗️
            <span>Share</span>
          </button>

          <button type="button" data-action="music">🎵
            <span>Sounds</span>
          </button>

          <button type="button" data-action="filters">🎨
            <span>Filters</span>
          </button>
        </div>

        <div class="vidora-caption">
          <strong>@${escapeHTML(post.username || "creator")}</strong>
          <p>${escapeHTML(post.caption || "")}</p>
          <small>🎵 ${escapeHTML(post.music_name || "Original sound")}</small>
        </div>

        <div class="vidora-player-controls">
          <button type="button" data-action="previous">‹ Previous</button>
          <button type="button" data-action="play">▶ / ❚❚</button>
          <button type="button" data-action="next">Next ›</button>
        </div>

        <div class="vidora-progress">
          <div id="vidoraProgressBar"></div>
        </div>
      </div>
    </article>
  `;

  applyFilter();
  attachVideoEvents();
}

function attachVideoEvents() {
  const video = $("vidoraVideo");
  const progress = $("vidoraProgressBar");

  if (!video) return;

  video.muted = state.isMuted;

  const muteButton = $("vidoraMute");
  if (muteButton) muteButton.textContent = state.isMuted ? "🔇" : "🔊";

  video.addEventListener("timeupdate", () => {
    if (!progress || !Number.isFinite(video.duration)) return;

    const percent = video.duration
      ? (video.currentTime / video.duration) * 100
      : 0;

    progress.style.width = percent + "%";
  });

  video.addEventListener("click", () => {
    if (video.paused) {
      video.play().catch(() => notify("Tap play to start the video."));
    } else {
      video.pause();
    }
  });

  video.addEventListener("ended", nextPost);

  video.play().catch(() => {
    // Mobile browsers may require a user tap before playback.
  });
}

/* ===================== VIDEO NAVIGATION ===================== */

function nextPost() {
  if (!state.posts.length) return;

  state.currentIndex =
    (state.currentIndex + 1) % state.posts.length;

  rotateTransition(1);
  renderFeed();
}

function previousPost() {
  if (!state.posts.length) return;

  state.currentIndex =
    (state.currentIndex - 1 + state.posts.length) %
    state.posts.length;

  rotateTransition(-1);
  renderFeed();
}

function rotateTransition(direction) {
  const player = $("vidoraPlayer");
  if (!player) return;

  player.style.transition = "transform 260ms ease, opacity 260ms ease";
  player.style.transform =
    `perspective(900px) rotateY(${direction * 70}deg) scale(.86)`;
  player.style.opacity = "0.35";

  setTimeout(() => {
    const current = $("vidoraPlayer");

    if (current) {
      current.style.transform = "perspective(900px) rotateY(0deg) scale(1)";
      current.style.opacity = "1";
    }
  }, 40);
}

function togglePlayback() {
  const video = $("vidoraVideo");
  if (!video) return;

  if (video.paused) {
    video.play().catch(() => notify("Tap the video to play it."));
  } else {
    video.pause();
  }
}

function toggleMute() {
  state.isMuted = !state.isMuted;

  const video = $("vidoraVideo");
  if (video) video.muted = state.isMuted;

  const button = $("vidoraMute");
  if (button) button.textContent = state.isMuted ? "🔇" : "🔊";
}

/* ===================== TOUCH / ROTATIONAL SWIPE ===================== */

function getAngle(x, y, centerX, centerY) {
  return Math.atan2(y - centerY, x - centerX);
}

function handleFeedTouchStart(event) {
  const touch = event.touches?.[0];
  if (!touch) return;

  state.touchStartX = touch.clientX;
  state.touchStartY = touch.clientY;
  state.touchStartTime = Date.now();

  const rect = event.currentTarget.getBoundingClientRect();

  state.rotationStartAngle = getAngle(
    touch.clientX,
    touch.clientY,
    rect.left + rect.width / 2,
    rect.top + rect.height / 2
  );
}

function handleFeedTouchEnd(event) {
  const touch = event.changedTouches?.[0];
  if (!touch) return;

  const dx = touch.clientX - state.touchStartX;
  const dy = touch.clientY - state.touchStartY;
  const elapsed = Date.now() - state.touchStartTime;

  if (Math.abs(dy) > 55 && Math.abs(dy) > Math.abs(dx)) {
    dy < 0 ? nextPost() : previousPost();
    return;
  }

  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) {
    dx < 0 ? nextPost() : previousPost();
    return;
  }

  const rect = event.currentTarget.getBoundingClientRect();

  const endAngle = getAngle(
    touch.clientX,
    touch.clientY,
    rect.left + rect.width / 2,
    rect.top + rect.height / 2
  );

  if (state.rotationStartAngle !== null) {
    let delta = endAngle - state.rotationStartAngle;

    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    if (Math.abs(delta) > 0.45 && elapsed < 1500) {
      delta < 0 ? nextPost() : previousPost();
    }
  }
}

/* ===================== LIKES ===================== */

async function toggleLike(postId) {
  if (!requireLogin()) return;

  const key = String(postId);
  const post = state.posts.find(item => String(item.id) === key);

  if (!post) return;

  const wasLiked = state.likedPosts.has(key);

  if (wasLiked) {
    state.likedPosts.delete(key);
    post.likes = Math.max(0, (post.likes || 0) - 1);
  } else {
    state.likedPosts.add(key);
    post.likes = (post.likes || 0) + 1;
  }

  renderFeed();

  if (!state.supabase) return;

  try {
    if (wasLiked) {
      const { error } = await state.supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", state.user.id);

      if (error) throw error;
    } else {
      const { error } = await state.supabase
        .from("post_likes")
        .insert({
          post_id: postId,
          user_id: state.user.id
        });

      if (error) throw error;
    }
  } catch (error) {
    console.warn("Like could not be saved:", error.message);
    notify("Like may not have saved. Check post_likes permissions.");
  }
}

/* ===================== COMMENTS ===================== */

function showComments(postId) {
  const existing = state.localComments.get(String(postId)) || [];

  const comment = prompt(
    "Write a comment (maximum 500 characters):"
  );

  if (comment === null) return;

  const trimmed = comment.trim();

  if (!trimmed) return;

  if (trimmed.length > 500) {
    notify("Comments must be 500 characters or fewer.");
    return;
  }

  if (!requireLogin()) return;

  existing.push({
    id: makeId(),
    user_id: state.user.id,
    username: getUsername(),
    text: trimmed,
    created_at: new Date().toISOString()
  });

  state.localComments.set(String(postId), existing);

  notify("Comment added on this device.");

  /*
    For permanent cross-device comments, create a comments table
    and insert/read records through Supabase.
  */
}

/* ===================== SHARING ===================== */

async function sharePost(post) {
  const url = post.media_url || window.location.href;

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Watch on Vidora",
        text: post.caption || "Check out this Vidora post!",
        url
      });
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      notify("Link copied.");
    } else {
      prompt("Copy this link:", url);
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      console.warn(error);
      notify("Could not share this post.");
    }
  }
}

/* ===================== MUSIC ===================== */

function showMusicPicker() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "audio/*";

  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;

    if (state.currentAudio) {
      state.currentAudio.pause();
    }

    const url = URL.createObjectURL(file);
    state.selectedMusic = {
      name: file.name,
      url,
      file
    };

    state.currentAudio = new Audio(url);
    state.currentAudio.loop = true;

    state.currentAudio.play().catch(() => {
      notify("Tap Sounds again to play the music.");
    });

    notify("Selected sound: " + file.name);
  };

  input.click();
}

/* ===================== VIDEO FILTERS ===================== */

function applyFilter() {
  const video = $("vidoraVideo");

  if (video) {
    video.style.filter = state.activeFilter;
  }

  const image = document.querySelector(
    "#feed .vidora-media:not(video)"
  );

  if (image) {
    image.style.filter = state.activeFilter;
  }
}

function showFilterPicker() {
  const options = VIDEO_FILTERS
    .map((filter, index) => `${index + 1}. ${filter.name}`)
    .join("\n");

  const choice = prompt(
    "Choose a video filter:\n" + options
  );

  if (choice === null) return;

  const index = Number(choice) - 1;

  if (index < 0 || index >= VIDEO_FILTERS.length) {
    notify("Choose a valid filter number.");
    return;
  }

  state.activeFilter = VIDEO_FILTERS[index].value;
  applyFilter();

  notify(VIDEO_FILTERS[index].name + " filter applied.");
}

/* ===================== CREATE / UPLOAD POST ===================== */

async function publishPost(event) {
  event?.preventDefault();

  if (!requireLogin()) return;

  const file = $("createFile")?.files?.[0];
  const caption = $("createCaption")?.value.trim() || "";

  if (!file) {
    notify("Choose a video or image first.");
    return;
  }

  if (!file.type.startsWith("video/") &&
      !file.type.startsWith("image/")) {
    notify("Choose a supported video or image.");
    return;
  }

  if (file.size > 50 * 1024 * 1024) {
    notify("Maximum upload size is 50 MB.");
    return;
  }

  if (!state.supabase) {
    notify("Supabase is not configured.");
    return;
  }

  const button = $("publishBtn");
  if (button) {
    button.disabled = true;
    button.textContent = "Uploading...";
  }

  try {
    const extension = file.name.split(".").pop() || "media";
    const path =
      `${state.user.id}/${Date.now()}-${makeId()}.${extension}`;

    const { data: uploaded, error: uploadError } =
      await state.supabase.storage
        .from("media")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        });

    if (uploadError) throw uploadError;

    const { data: publicData } =
      state.supabase.storage
        .from("media")
        .getPublicUrl(uploaded.path);

    const mediaUrl = publicData?.publicUrl;

    if (!mediaUrl) {
      throw new Error("Could not create a media URL.");
    }

    const { data: post, error: postError } =
      await state.supabase
        .from("posts")
        .insert({
          user_id: state.user.id,
          media_url: mediaUrl,
          media_type: file.type.startsWith("video/")
            ? "video"
            : "image",
          caption
        })
        .select()
        .single();

    if (postError) throw postError;

    state.posts.unshift({
      ...post,
      username: getUsername(),
      likes: 0,
      comments: 0
    });

    state.currentIndex = 0;

    if ($("createForm")) $("createForm").reset();

    notify("Your post is live on Vidora!");
    showView("homeView");
    renderFeed();
    updateProfileUI();
  } catch (error) {
    console.error("Publish error:", error);
    notify(error.message || "Upload failed. Check Storage and table policies.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "🚀 Publish to Vidora";
    }
  }
}

/* ===================== DELETE OWN POSTS ===================== */

async function deletePost(postId) {
  if (!requireLogin()) return;

  const post = state.posts.find(
    item => String(item.id) === String(postId)
  );

  if (!post || post.user_id !== state.user.id) {
    notify("You can only delete your own posts.");
    return;
  }

  if (!confirm("Delete this post?")) return;

  if (!state.supabase) return;

  const { error } = await state.supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", state.user.id);

  if (error) {
    console.error(error);
    notify("Could not delete post. Check your database policies.");
    return;
  }

  state.posts = state.posts.filter(
    item => String(item.id) !== String(postId)
  );

  state.currentIndex = Math.max(
    0,
    Math.min(state.currentIndex, state.posts.length - 1)
  );

  renderFeed();
  updateProfileUI();
  notify("Post deleted.");
}

/* ===================== NAVIGATION ===================== */

function showView(viewId) {
  const views = [
    "homeView",
    "discoverView",
    "createView",
    "inboxView",
    "assistantView",
    "profileView",
    "notificationsView"
  ];

  views.forEach(id => {
    const element = $(id);
    if (element) {
      element.style.display = id === viewId ? "block" : "none";
    }
  });

  state.currentView = viewId;

  document.querySelectorAll("[data-view]").forEach(button => {
    const active = button.dataset.view === viewId;

    button.classList.toggle("active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });

  if (viewId === "homeView") renderFeed();
  if (viewId === "profileView") updateProfileUI();
  if (viewId === "discoverView") renderDiscover();
  if (viewId === "assistantView") updateGreetings();
}

/* ===================== DISCOVER ===================== */

function renderDiscover() {
  const container = $("discoverList");
  if (!container) return;

  if (!state.posts.length) {
    container.innerHTML = `
      <h2>Discover Vidora</h2>
      <p>Videos will appear here as creators publish them.</p>
    `;
    return;
  }

  container.innerHTML = `
    <h2>Discover</h2>
    <div class="vidora-categories">
      ${[
        "😂 Funny",
        "🌟 Vidora Originals",
        "💡 Motivation",
        "📚 Education",
        "🎮 Gaming",
        "🎵 Music",
        "🔥 Trending"
      ].map(category =>
        `<button type="button" data-category="${escapeHTML(category)}">
          ${escapeHTML(category)}
        </button>`
      ).join("")}
    </div>

    <div class="vidora-discover-posts">
      ${state.posts.map((post, index) => `
        <button type="button" data-open-post="${index}">
          <span>🎬</span>
          <strong>${escapeHTML(post.caption || "Vidora video")}</strong>
        </button>
      `).join("")}
    </div>
  `;
}

/* ===================== SKYE ASSISTANT ===================== */

function updateGreetings() {
  const hour = new Date().getHours();

  let greeting = "Hello";

  if (hour < 12) greeting = "Good morning";
  else if (hour < 17) greeting = "Good afternoon";
  else greeting = "Good evening";

  const message =
    `${greeting}! I'm Skye, your Vidora assistant. ` +
    "I can help you create posts, explore videos, and learn about Vidora.";

  setText("greetingTextAssistant", message);
  setText("avatarMood", "✨ Ready to help");
}

function assistantReply(message) {
  const text = String(message || "").toLowerCase();

  if (text.includes("vidora")) {
    return "Vidora is a place to share videos, discover creators, and connect.";
  }

  if (text.includes("post") || text.includes("upload")) {
    return "Open Create, choose your video, add a caption, and tap Publish.";
  }

  if (text.includes("filter")) {
    return "Open the video feed and tap Filters to try a look.";
  }

  if (text.includes("music") || text.includes("song")) {
    return "Tap Sounds on a post to choose an audio file you are allowed to use.";
  }

  if (text.includes("profile") || text.includes("avatar")) {
    return "Open your Profile to view your creator information.";
  }

  if (text.includes("hello") || text.includes("hi")) {
    return "Hey! 😊 What would you like to do on Vidora today?";
  }

  if (text.includes("funny")) {
    return "Open Discover and explore the Funny category.";
  }

  if (text.includes("help")) {
    return "I can help with uploading, filters, music, profiles, and finding videos.";
  }

  return "I'm here to help! Ask me about Vidora, posting videos, music, filters, or your profile.";
}

function sendAssistantMessage() {
  const input = $("assistantInput") ||
    $("assistantMessage") ||
    $("assistantQuestion");

  const output = $("assistantReply");

  if (!input || !output) {
    notify("Assistant message field not found in your HTML.");
    return;
  }

  const message = input.value.trim();
  if (!message) return;

  output.textContent = assistantReply(message);
  input.value = "";

  speak(output.textContent);
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    notify("Speech is not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1.05;

  window.speechSynthesis.speak(utterance);
}

function changeAssistantAvatar() {
  const currentIndex = AVATARS.findIndex(
    avatar => avatar.name === state.assistantAvatar.name
  );

  state.assistantAvatar =
    AVATARS[(currentIndex + 1) % AVATARS.length];

  const stage = $("avatarStage");

  if (stage) {
    stage.textContent = state.assistantAvatar.emoji;
    stage.style.color = state.assistantAvatar.color;
  }

  const canvas = $("avatarCanvas");

  if (canvas && canvas.tagName !== "CANVAS") {
    canvas.textContent = state.assistantAvatar.emoji;
  }

  notify("Avatar changed to " + state.assistantAvatar.name);
}

function danceAssistant() {
  const stage = $("avatarStage");
  if (!stage) {
    notify("Skye is ready to dance! 💃");
    return;
  }

  stage.animate(
    [
      { transform: "rotate(0deg) scale(1)" },
      { transform: "rotate(12deg) scale(1.08)" },
      { transform: "rotate(-12deg) scale(1.08)" },
      { transform: "rotate(0deg) scale(1)" }
    ],
    { duration: 800, iterations: 2 }
  );
}

/* ===================== AVATAR UPLOAD ===================== */

function chooseProfilePhoto() {
  if (!requireLogin()) return;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notify("Choose an image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notify("Profile pictures must be under 5 MB.");
      return;
    }

    if (!state.supabase) return;

    try {
      const extension = file.name.split(".").pop() || "jpg";
      const path = `${state.user.id}/avatar-${Date.now()}.${extension}`;

      const { data, error } = await state.supabase.storage
        .from("media")
        .upload(path, file, {
          upsert: true,
          contentType: file.type
        });

      if (error) throw error;

      const { data: publicData } = state.supabase.storage
        .from("media")
        .getPublicUrl(data.path);

      const avatarUrl = publicData.publicUrl;

      const { error: profileError } = await state.supabase
        .from("profiles")
        .upsert({
          id: state.user.id,
          username: state.profile?.username || getUsername(),
          display_name: state.profile?.display_name || getDisplayName(),
          avatar_url: avatarUrl
        }, { onConflict: "id" });

      if (profileError) throw profileError;

      state.profile = {
        ...state.profile,
        avatar_url: avatarUrl
      };

      updateProfileUI();
      notify("Profile picture updated.");
    } catch (error) {
      console.error(error);
      notify("Could not update photo. Check Storage policies.");
    }
  };

  input.click();
}

/* ===================== STORIES ===================== */

/*
  Stories need a stories table, a storage URL, and follower
  relationships to enforce follower-only visibility.
  This local UI does not pretend to enforce those database rules.
*/

function createStory() {
  if (!requireLogin()) return;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*,video/*";

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      notify("Story file must be under 50 MB.");
      return;
    }

    notify(
      "Story selected. A stories table and follower-only database policies are needed to publish it securely."
    );
  };

  input.click();
}

/* ===================== NOTIFICATIONS ===================== */

async function loadNotifications() {
  const list = $("notificationList");

  if (list) {
    list.innerHTML = `
      <p>You're all caught up.</p>
      <p>New notifications can appear here when the notifications table is configured.</p>
    `;
  }
}

function enablePushNotifications() {
  if (!("Notification" in window)) {
    notify("Notifications are not supported in this browser.");
    return;
  }

  Notification.requestPermission().then(permission => {
    if (permission === "granted") {
      notify("Browser notifications are enabled.");
      /*
        Real push notifications also require a service worker,
        VAPID keys, server-side sending, and saved subscriptions.
      */
    } else {
      notify("Notification permission was not granted.");
    }
  });
}

/* ===================== INBOX PLACEHOLDER ===================== */

function openInbox() {
  if (!requireLogin()) return;

  const list = $("inboxList");

  if (list) {
    list.innerHTML = `
      <p>Messages will appear here when your conversations and messages tables are configured.</p>
    `;
  }

  const conversationItems = $("conversationItems");

  if (conversationItems) {
    conversationItems.innerHTML = `
      <p>Your conversations will appear here.</p>
    `;
  }

  const messages = $("chatMessages");

  if (messages && !messages.textContent.trim()) {
    messages.textContent = "Select a conversation to start chatting.";
  }
}

/* ===================== EVENT LISTENERS ===================== */

function bindEvents() {
  $("authForm")?.addEventListener("submit", handleAuth);
  $("showSignup")?.addEventListener("click", () => setAuthMode("signup"));
  $("showLogin")?.addEventListener("click", () => setAuthMode("login"));

  $("logoutBtn")?.addEventListener("click", logout);

  $("createForm")?.addEventListener("submit", publishPost);
  $("publishBtn")?.addEventListener("click", (event) => {
    if ($("createForm")) return;
    publishPost(event);
  });

  $("refreshFeedBtn")?.addEventListener("click", loadFeed);
  $("enablePushBtn")?.addEventListener(
    "click",
    enablePushNotifications
  );

  document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => {
      showView(button.dataset.view);
    });
  });

  $("feed")?.addEventListener("touchstart", handleFeedTouchStart, {
    passive: true
  });

  $("feed")?.addEventListener("touchend", handleFeedTouchEnd, {
    passive: true
  });

  $("feed")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const post = state.posts[state.currentIndex];

    switch (action) {
      case "next":
        nextPost();
        break;

      case "previous":
        previousPost();
        break;

      case "play":
        togglePlayback();
        break;

      case "like":
        if (post) await toggleLike(post.id);
        break;

      case "comments":
        if (post) showComments(post.id);
        break;

      case "share":
        if (post) await sharePost(post);
        break;

      case "music":
        showMusicPicker();
        break;

      case "filters":
        showFilterPicker();
        break;
    }
  });

  $("vidoraMute")?.addEventListener("click", toggleMute);

  $("myPosts")?.addEventListener("click", event => {
    const button = event.target.closest("[data-delete-post]");
    if (button) deletePost(button.dataset.deletePost);
  });

  $("discoverList")?.addEventListener("click", event => {
    const button = event.target.closest("[data-open-post]");

    if (button) {
      state.currentIndex = Number(button.dataset.openPost) || 0;
      showView("homeView");
      renderFeed();
    }
  });

  $("avatarWaveBtn")?.addEventListener("click", () => {
    notify("Hi! 👋 Skye is happy to see you.");
  });

  $("avatarDanceBtn")?.addEventListener("click", danceAssistant);

  $("avatarColorBtn")?.addEventListener(
    "click",
    changeAssistantAvatar
  );

  $("assistantHelpBtn")?.addEventListener("click", () => {
    const output = $("assistantReply");
    if (output) {
      output.textContent = assistantReply("help");
    }
  });

  $("speakBtn")?.addEventListener("click", () => {
    speak(
      $("greetingTextAssistant")?.textContent ||
      "Hello! I'm Skye, your Vidora assistant."
    );
  });

  const assistantInput =
    $("assistantInput") ||
    $("assistantMessage") ||
    $("assistantQuestion");

  assistantInput?.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendAssistantMessage();
    }
  });

  $("assistantSendBtn")?.addEventListener(
    "click",
    sendAssistantMessage
  );

  $("profileAvatar")?.addEventListener(
    "click",
    chooseProfilePhoto
  );

  $("notificationList")?.addEventListener("click", () => {
    loadNotifications();
  });
}

/* ===================== OPTIONAL CSS ===================== */

function injectVidoraStyles() {
  if ($("vidoraRuntimeStyles")) return;

  const style = document.createElement("style");
  style.id = "vidoraRuntimeStyles";

  style.textContent = `
    #feed {
      width: 100%;
      touch-action: pan-y;
    }

    .vidora-player {
      width: 100%;
      max-width: 680px;
      margin: 0 auto;
      perspective: 1000px;
    }

    .vidora-media-wrap {
      position: relative;
      width: 100%;
      min-height: 420px;
      height: min(72vh, 760px);
      overflow: hidden;
      background: #08080d;
      border-radius: 18px;
      color: white;
    }

    .vidora-media {
      width: 100%;
      height: 100%;
      position: absolute;
      inset: 0;
      object-fit: cover;
      background: #08080d;
    }

    .vidora-top-label {
      position: absolute;
      top: 14px;
      left: 14px;
      z-index: 2;
      font-weight: 900;
      letter-spacing: 2px;
      text-shadow: 0 2px 8px #000;
    }

    .vidora-mute {
      position: absolute;
      right: 12px;
      top: 12px;
      z-index: 5;
      border: 0;
      border-radius: 50%;
      padding: 10px;
      background: #0008;
      color: white;
      font-size: 18px;
    }

    .vidora-actions {
      position: absolute;
      right: 10px;
      bottom: 125px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      z-index: 4;
    }

    .vidora-actions button {
      border: 0;
      color: white;
      background: #0007;
      border-radius: 14px;
      padding: 8px 7px;
      min-width: 52px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      font-size: 21px;
    }

    .vidora-actions span {
      font-size: 11px;
    }

    .vidora-caption {
      position: absolute;
      bottom: 45px;
      left: 12px;
      right: 75px;
      z-index: 3;
      color: white;
      text-shadow: 0 1px 6px #000;
      overflow-wrap: anywhere;
    }

    .vidora-caption p {
      margin: 7px 0;
      white-space: pre-wrap;
    }

    .vidora-caption small {
      font-size: 12px;
    }

    .vidora-player-controls {
      position: absolute;
      bottom: 8px;
      left: 8px;
      right: 8px;
      z-index: 6;
      display: flex;
      justify-content: space-between;
      gap: 6px;
    }

    .vidora-player-controls button {
      color: white;
      background: #11111acb;
      border: 1px solid #ffffff30;
      border-radius: 12px;
      padding: 7px 10px;
    }

    .vidora-progress {
      position: absolute;
      height: 3px;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 7;
      background: #ffffff45;
    }

    #vidoraProgressBar {
      height: 100%;
      width: 0;
      background: #ff2d75;
      transition: width .15s linear;
    }

    .vidora-no-media,
    .vidora-empty-feed {
      padding: 30px;
      text-align: center;
    }

    .vidora-no-media {
      position: absolute;
      inset: 0;
      display: grid;
      place-content: center;
      color: white;
    }

    .vidora-no-media div {
      font-size: 50px;
    }

    .vidora-categories {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 14px 0;
    }

    .vidora-categories button {
      border: 0;
      border-radius: 18px;
      padding: 10px 14px;
      background: #191925;
      color: white;
    }

    .vidora-discover-posts {
      display: grid;
      gap: 8px;
    }

    .vidora-discover-posts button {
      padding: 14px;
      display: flex;
      gap: 10px;
      align-items: center;
      text-align: left;
      background: #11111a;
      color: white;
      border: 1px solid #ffffff18;
      border-radius: 12px;
    }

    .vidora-profile-post {
      padding: 12px;
      margin: 8px 0;
      border-radius: 12px;
      background: #11111a;
    }

    .vidora-profile-post button {
      padding: 8px 12px;
      border-radius: 9px;
    }

    @media (max-width: 480px) {
      .vidora-media-wrap {
        height: 68vh;
        min-height: 360px;
        border-radius: 12px;
      }

      .vidora-actions {
        right: 5px;
        gap: 8px;
      }

      .vidora-actions button {
        min-width: 44px;
        font-size: 19px;
        padding: 7px 5px;
      }

      .vidora-caption {
        left: 9px;
        right: 58px;
      }
    }
  `;

  document.head.appendChild(style);
}

/* ===================== INITIALIZATION ===================== */

function initVidora() {
  injectVidoraStyles();
  bindEvents();
  updateGreetings();
  renderFeed();
  setAuthMode("login");
  initSupabase();
}

document.addEventListener("DOMContentLoaded", initVidora);

/* ===================== PUBLIC API ===================== */

window.Vidora = {
  loadFeed,
  renderFeed,
  nextPost,
  previousPost,
  togglePlayback,
  toggleMute,
  publishPost,
  toggleLike,
  showComments,
  sharePost,
  showView,
  logout,
  showMusicPicker,
  showFilterPicker,
  changeAssistantAvatar,
  createStory,
  sendAssistantMessage,
  assistantReply,
  state
};
