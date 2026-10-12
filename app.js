
/* =========================================================
   VIDORA — APP.JS
   Matches the new Vidora HTML and CSS.
   No DiceBear dependency.
   ========================================================= */

(() => {
  "use strict";

  /* ---------- CONFIGURATION ---------- */

  const SUPABASE_URL =
    "https://htnrqgzxkfktwoioscjr.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_JT5rBfXYSX3-3_zyC2cazQ_YXg_ih_h";

  const STORAGE_BUCKET = "media";
  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  const AVATAR_CREATOR_URL =
    "https://mobile.metaperson.avatarsdk.com/";

  const AVATARS = [
    "Nova", "Kai", "Luna", "Ivy", "Orion",
    "Zeno", "Sage", "Rex", "Pixel", "Vexa"
  ];

  const $ = (id) => document.getElementById(id);

  const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  const safeURL = (value) => {
    try {
      const url = new URL(value, window.location.origin);
      if (["http:", "https:"].includes(url.protocol)) {
        return url.href;
      }
    } catch (_) {}
    return "";
  };

  const notify = (message) => {
    const toast = $("toast");

    if (toast) {
      toast.textContent = message;
      toast.classList.add("show");

      clearTimeout(notify.timer);
      notify.timer = setTimeout(() => {
        toast.classList.remove("show");
      }, 3000);
    } else {
      console.info("[Vidora]", message);
    }
  };

  /* ---------- SUPABASE ---------- */

  if (!window.supabase?.createClient) {
    console.error("Supabase library did not load.");
    notify("Vidora could not load Supabase. Refresh the page.");
    return;
  }

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const state = {
    user: null,
    profile: null,
    posts: [],
    avatar: localStorage.getItem("vidoraPremiumAvatar") || "Nova",
    theme: localStorage.getItem("vidoraTheme") || "dark",
    currentView: "feed",
    loadingFeed: false,
    busy: false
  };

  /* ---------- GREETING ---------- */

  function getGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  function updateGreeting() {
    const greeting = getGreeting();

    if ($("greetingText")) {
      $("greetingText").textContent =
        `${greeting}${state.profile?.display_name
          ? ", " + state.profile.display_name
          : ""}!`;
    }

    if ($("avatarGreeting")) {
      $("avatarGreeting").textContent =
        `${greeting}! I'm ${state.avatar}.`;
    }
  }

  /* ---------- AVATAR ---------- */

  function renderAvatar() {
    const name = state.avatar;

    if ($("avatarName")) {
      $("avatarName").textContent = name;
    }

    if ($("avatarFace")) {
      // This is a fallback avatar badge, not a 3D model.
      $("avatarFace").textContent = name.slice(0, 1);
      $("avatarFace").setAttribute("aria-label", `${name} avatar`);
    }

    if ($("avatarSelect")) {
      $("avatarSelect").value = name;
    }

    updateGreeting();
  }

  function selectAvatar() {
    const selected = $("avatarSelect")?.value;

    if (!AVATARS.includes(selected)) return;

    state.avatar = selected;
    localStorage.setItem("vidoraPremiumAvatar", selected);

    renderAvatar();
    notify(`${selected} selected.`);
  }

  function openAvatarCreator() {
    window.open(
      AVATAR_CREATOR_URL,
      "_blank",
      "noopener,noreferrer"
    );

    if ($("avatar3DStatus")) {
      $("avatar3DStatus").textContent =
        "Create an avatar, export a compatible model, then connect its model URL to Vidora.";
    }
  }

  /*
   * A real 3D avatar requires an exported model and a renderer.
   * No model file is invented or loaded automatically here.
   */

  /* ---------- AVATAR SPEECH ---------- */

  function speakAvatar() {
    const message = $("avatarSpeechText")?.value.trim();

    if (!message) {
      notify("Type a message first.");
      return;
    }

    if (!("speechSynthesis" in window)) {
      notify("Speech is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    const preference = $("avatarVoice")?.value || "default";
    const voices = window.speechSynthesis.getVoices();

    if (preference !== "default") {
      const pattern = preference === "female"
        ? /female|woman|jenny|aria|samantha/i
        : /male|man|david|guy|mark/i;

      const voice = voices.find((item) =>
        /^en/i.test(item.lang) && pattern.test(item.name)
      );

      if (voice) utterance.voice = voice;
    }

    utterance.onstart = () => {
      $("avatarFace")?.classList.add("avatar-talking");

      if ($("avatarSpeechStatus")) {
        $("avatarSpeechStatus").textContent =
          `${state.avatar} is speaking…`;
      }

      if ($("avatarSpeakBtn")) {
        $("avatarSpeakBtn").disabled = true;
      }
    };

    const finishSpeech = () => {
      $("avatarFace")?.classList.remove("avatar-talking");

      if ($("avatarSpeakBtn")) {
        $("avatarSpeakBtn").disabled = false;
      }
    };

    utterance.onend = () => {
      finishSpeech();

      if ($("avatarSpeechStatus")) {
        $("avatarSpeechStatus").textContent =
          "Finished speaking.";
      }
    };

    utterance.onerror = () => {
      finishSpeech();

      if ($("avatarSpeechStatus")) {
        $("avatarSpeechStatus").textContent =
          "Speech playback failed.";
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  function stopAvatarSpeech() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    $("avatarFace")?.classList.remove("avatar-talking");

    if ($("avatarSpeakBtn")) {
      $("avatarSpeakBtn").disabled = false;
    }

    if ($("avatarSpeechStatus")) {
      $("avatarSpeechStatus").textContent = "Speech stopped.";
    }
  }

  /* ---------- THEME ---------- */

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;

    document.body.classList.toggle(
      "light-theme",
      state.theme === "light"
    );

    if ($("themeToggle")) {
      $("themeToggle").textContent =
        state.theme === "dark" ? "☀️" : "🌙";
    }
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";

    localStorage.setItem("vidoraTheme", state.theme);
    applyTheme();
  }

  /* ---------- NAVIGATION ---------- */

  function setView(view) {
    const validViews = [
      "feed", "discover", "create", "assistant", "profile"
    ];

    if (!validViews.includes(view)) return;

    state.currentView = view;

    document.querySelectorAll("[data-view]").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.view === view
      );
    });

    document.querySelectorAll(".app-view").forEach((section) => {
      section.classList.toggle(
        "active",
        section.id === `view-${view}`
      );
    });

    if (view === "profile") loadProfile();
    if (view === "discover") loadFeed();

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showApp() {
    if ($("authScreen")) $("authScreen").hidden = true;
    if ($("appShell")) $("appShell").hidden = false;

    updateGreeting();
    renderAvatar();
    setView("feed");
    loadProfile();
    loadFeed();
  }

  function showAuth() {
    if ($("authScreen")) $("authScreen").hidden = false;
    if ($("appShell")) $("appShell").hidden = true;
  }

  /* ---------- AUTHENTICATION ---------- */

  function showAuthMode(mode) {
    const signup = mode === "signup";

    if ($("signupFields")) {
      $("signupFields").hidden = !signup;
    }

    if ($("authSubmit")) {
      $("authSubmit").textContent =
        signup ? "Create account" : "Log in";
    }

    if ($("showLogin")) {
      $("showLogin").classList.toggle("active", !signup);
    }

    if ($("showSignup")) {
      $("showSignup").classList.toggle("active", signup);
    }
  }

  async function handleAuth(event) {
    event.preventDefault();

    if (state.busy) return;

    const email = $("authEmail")?.value.trim();
    const password = $("authPassword")?.value;
    const signup = $("signupFields") &&
      !$("signupFields").hidden;

    if (!email || !password) {
      notify("Enter your email and password.");
      return;
    }

    state.busy = true;

    if ($("authSubmit")) {
      $("authSubmit").disabled = true;
      $("authSubmit").textContent = "Please wait…";
    }

    try {
      let result;

      if (signup) {
        const username = $("authUsername")?.value.trim();
        const displayName =
          $("authDisplayName")?.value.trim() || username;

        if (!username) {
          notify("Enter a username.");
          return;
        }

        result = await db.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
              display_name: displayName
            }
          }
        });
      } else {
        result = await db.auth.signInWithPassword({
          email,
          password
        });
      }

      if (result.error) throw result.error;

      if (signup && !result.data.session) {
        notify("Account created. Check your email if verification is required.");
        showAuthMode("login");
        return;
      }

      state.user = result.data.user;
      notify(signup ? "Welcome to Vidora!" : "Welcome back!");
      showApp();
    } catch (error) {
      console.error("Authentication error:", error);
      notify(error.message || "Authentication failed.");
    } finally {
      state.busy = false;

      if ($("authSubmit")) {
        $("authSubmit").disabled = false;
        $("authSubmit").textContent =
          signup ? "Create account" : "Log in";
      }
    }
  }

  async function logout() {
    stopAvatarSpeech();

    const { error } = await db.auth.signOut();

    if (error) {
      notify(error.message || "Could not log out.");
      return;
    }

    state.user = null;
    state.profile = null;
    state.posts = [];

    showAuth();
    notify("You have logged out.");
  }

  /* ---------- PROFILE ---------- */

  async function loadProfile() {
    if (!state.user) return;

    const { data, error } = await db
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, created_at")
      .eq("id", state.user.id)
      .maybeSingle();

    if (error) {
      console.error("Profile load error:", error);
      return;
    }

    state.profile = data || {
      id: state.user.id,
      username: state.user.email?.split("@")[0] || "user",
      display_name: state.user.user_metadata?.display_name || ""
    };

    if ($("profileUsername")) {
      $("profileUsername").textContent =
        state.profile.username || "User";
    }

    if ($("profileDisplayName")) {
      $("profileDisplayName").textContent =
        state.profile.display_name || state.profile.username || "User";
    }

    if ($("profileBio")) {
      $("profileBio").textContent = state.profile.bio || "";
    }

    if ($("profileAvatar")) {
      const avatarURL = safeURL(state.profile.avatar_url || "");

      if (avatarURL) {
        $("profileAvatar").innerHTML =
          `<img src="${escapeHTML(avatarURL)}" alt="Profile avatar">`;
      }
    }

    updateGreeting();
  }

  async function saveProfile() {
    if (!state.user) {
      notify("Log in first.");
      return;
    }

    const username = $("profileUsernameInput")?.value.trim();
    const displayName = $("profileDisplayNameInput")?.value.trim();
    const bio = $("profileBioInput")?.value.trim();

    const update = { id: state.user.id };

    if (username) update.username = username;
    if (displayName) update.display_name = displayName;
    if (bio !== undefined) update.bio = bio;

    const { error } = await db
      .from("profiles")
      .upsert(update, { onConflict: "id" });

    if (error) {
      console.error("Profile save error:", error);
      notify(error.message || "Could not save profile.");
      return;
    }

    notify("Profile saved.");
    await loadProfile();
  }

  /* ---------- MEDIA UPLOAD ---------- */

  function getSelectedFile() {
    return $("createFile")?.files?.[0] ||
      $("mediaFile")?.files?.[0] ||
      null;
  }

  function validateMediaFile(file) {
    if (!file) {
      notify("Choose a photo or video first.");
      return false;
    }

    if (!file.type.startsWith("image/") &&
        !file.type.startsWith("video/")) {
      notify("Choose an image or video file.");
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      notify("Media must be 50 MB or smaller.");
      return false;
    }

    return true;
  }

  async function publishPost() {
    if (!state.user) {
      notify("Log in to publish.");
      return;
    }

    const file = getSelectedFile();
    const caption = (
      $("createCaption")?.value ??
      $("postCaption")?.value ??
      ""
    ).trim();

    if (!validateMediaFile(file)) return;

    const publishButton = document.querySelector(
      "#publishBtn, #publishPostBtn, #createPublishBtn"
    );

    try {
      if (publishButton) {
        publishButton.disabled = true;
        publishButton.textContent = "Publishing…";
      }

      const extension = file.name.includes(".")
        ? file.name.split(".").pop().toLowerCase()
        : "bin";

      const path =
        `${state.user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await db.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = db.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);

      const mediaURL = publicData?.publicUrl;

      if (!mediaURL) {
        throw new Error("Could not obtain the uploaded media URL.");
      }

      const { error: insertError } = await db
        .from("posts")
        .insert({
          user_id: state.user.id,
          media_url: mediaURL,
          media_type: file.type.startsWith("video/") ? "video" : "image",
          caption
        });

      if (insertError) throw insertError;

      if ($("createCaption")) $("createCaption").value = "";
      if ($("postCaption")) $("postCaption").value = "";

      const fileInput = $("createFile") || $("mediaFile");
      if (fileInput) fileInput.value = "";

      notify("Your post is published!");
      setView("feed");
      await loadFeed();
    } catch (error) {
      console.error("Publish error:", error);
      notify(error.message || "Could not publish post. Check storage permissions.");
    } finally {
      if (publishButton) {
        publishButton.disabled = false;
        publishButton.textContent = "🚀 Publish to Vidora";
      }
    }
  }

  /* ---------- FEED ---------- */

  async function loadFeed() {
    if (state.loadingFeed) return;

    const feed = $("feedContainer") ||
      $("feedPosts") ||
      $("feed");

    if (!feed) return;

    state.loadingFeed = true;
    feed.innerHTML = "<p class='empty-state'>Loading Vidora…</p>";

    try {
      const { data, error } = await db
        .from("posts")
        .select("id, user_id, media_url, media_type, caption, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      state.posts = data || [];
      renderFeed(feed);
    } catch (error) {
      console.error("Feed error:", error);
      feed.innerHTML =
        "<p class='empty-state'>Could not load posts. Check your posts table and permissions.</p>";
    } finally {
      state.loadingFeed = false;
    }
  }

  function renderFeed(feed) {
    if (!state.posts.length) {
      feed.innerHTML =
        "<p class='empty-state'>No posts yet. Be the first to share something!</p>";
      return;
    }

    feed.innerHTML = state.posts.map((post, index) => {
      const mediaURL = safeURL(post.media_url);

      const media = mediaURL
        ? post.media_type === "video"
          ? `<video class="post-media" controls playsinline preload="metadata" src="${escapeHTML(mediaURL)}"></video>`
          : `<img class="post-media" loading="lazy" alt="Vidora post" src="${escapeHTML(mediaURL)}">`
        : "<p>Media unavailable.</p>";

      const caption = escapeHTML(post.caption || "");
      const date = post.created_at
        ? new Date(post.created_at).toLocaleDateString()
        : "";

      return `
        <article class="postCard" data-post-id="${escapeHTML(post.id)}">
          <div class="post-header">
            <div class="post-user-avatar">V</div>
            <div>
              <strong>Vidora creator</strong>
              <small>${escapeHTML(date)}</small>
            </div>
          </div>

          <div class="post-media-wrap" data-media-index="${index}">
            ${media}
          </div>

          <div class="post-actions">
            <button type="button" data-action="like"
              data-id="${escapeHTML(post.id)}">♡ Like</button>
            <button type="button" data-action="comment"
              data-id="${escapeHTML(post.id)}">💬 Comment</button>
            <button type="button" data-action="next"
              data-index="${index}">↻ Next video</button>
          </div>

          <p class="post-caption">${caption}</p>

          <form class="comment-form" data-comment-form="${escapeHTML(post.id)}">
            <input name="comment" maxlength="500"
              placeholder="Write a comment…" required>
            <button type="submit">Send</button>
          </form>

          <div class="post-comments" id="comments-${escapeHTML(post.id)}"></div>
        </article>
      `;
    }).join("");
  }

  /* ---------- NEXT POST: 360° ROTATION ---------- */

  function nextPost(index) {
    const current = state.posts[index];
    const nextIndex = index + 1;

    if (!current || nextIndex >= state.posts.length) {
      notify("You've reached the end of the feed.");
      return;
    }

    const currentCard = document.querySelector(
      `[data-post-id="${CSS.escape(String(current.id))}"]`
    );

    const mediaWrap = currentCard?.querySelector(".post-media-wrap");

    if (mediaWrap) {
      mediaWrap.classList.remove("rotating");
      void mediaWrap.offsetWidth;
      mediaWrap.classList.add("rotating");

      setTimeout(() => {
        mediaWrap.classList.remove("rotating");
      }, 900);
    }

    const nextCard = document.querySelector(
      `[data-post-id="${CSS.escape(String(state.posts[nextIndex].id))}"]`
    );

    setTimeout(() => {
      nextCard?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 250);
  }

  /* ---------- LIKES ---------- */

  async function toggleLike(postId, button) {
    if (!state.user) {
      notify("Log in to like posts.");
      return;
    }

    /*
     * This expects a "likes" table with user_id and post_id.
     * Create that table and its RLS policies before using likes.
     */

    try {
      const { data: existing, error: findError } = await db
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", state.user.id)
        .maybeSingle();

      if (findError) throw findError;

      if (existing) {
        const { error } = await db
          .from("likes")
          .delete()
          .eq("id", existing.id)
          .eq("user_id", state.user.id);

        if (error) throw error;

        if (button) button.textContent = "♡ Like";
      } else {
        const { error } = await db.from("likes").insert({
          post_id: postId,
          user_id: state.user.id
        });

        if (error) throw error;

        if (button) button.textContent = "♥ Liked";
      }
    } catch (error) {
      console.error("Like error:", error);
      notify("Like failed. Check your likes table and RLS policies.");
    }
  }

  /* ---------- COMMENTS ---------- */

  async function submitComment(postId, textValue) {
    if (!state.user) {
      notify("Log in to comment.");
      return;
    }

    const content = textValue.trim();

    if (!content || content.length > 500) {
      notify("Comments must be between 1 and 500 characters.");
      return;
    }

    /*
     * This expects a "comments" table with:
     * id, post_id, user_id, content, created_at.
     */

    try {
      const { error } = await db.from("comments").insert({
        post_id: postId,
        user_id: state.user.id,
        content
      });

      if (error) throw error;

      notify("Comment added.");
      await loadComments(postId);
    } catch (error) {
      console.error("Comment error:", error);
      notify("Comment failed. Check your comments table and permissions.");
    }
  }

  async function loadComments(postId) {
    const container = $(`comments-${postId}`);
    if (!container) return;

    try {
      const { data, error } = await db
        .from("comments")
        .select("id, user_id, content, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      container.innerHTML = (data || []).map((comment) => `
        <div class="comment">
          <strong>${comment.user_id === state.user?.id ? "You" : "Creator"}</strong>
          <p>${escapeHTML(comment.content)}</p>
          ${comment.user_id === state.user?.id
            ? `<button type="button" data-action="delete-comment" data-id="${escapeHTML(comment.id)}" data-post-id="${escapeHTML(postId)}">Delete</button>`
            : ""}
        </div>
      `).join("");
    } catch (error) {
      console.error("Load comments error:", error);
    }
  }

  async function deleteComment(commentId, postId) {
    if (!state.user) return;

    try {
      const { error } = await db
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", state.user.id);

      if (error) throw error;

      notify("Comment deleted.");
      await loadComments(postId);
    } catch (error) {
      console.error("Delete comment error:", error);
      notify("Could not delete comment.");
    }
  }

  /* ---------- EVENT HANDLERS ---------- */

  function attachEvents() {
    $("authForm")?.addEventListener("submit", handleAuth);

    $("showLogin")?.addEventListener("click", () => {
      showAuthMode("login");
    });

    $("showSignup")?.addEventListener("click", () => {
      showAuthMode("signup");
    });

    $("logoutBtn")?.addEventListener("click", logout);
    $("themeToggle")?.addEventListener("click", toggleTheme);

    $("avatarSelect")?.addEventListener("change", selectAvatar);

    $("avatarCreatorLink")?.addEventListener("click", (event) => {
      event.preventDefault();
      openAvatarCreator();
    });

    $("avatarSpeakBtn")?.addEventListener("click", speakAvatar);
    $("avatarStopBtn")?.addEventListener("click", stopAvatarSpeech);

    $("saveProfileBtn")?.addEventListener("click", saveProfile);

    document.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        setView(button.dataset.view);
      });
    });

    $("brandHome")?.addEventListener("click", (event) => {
      event.preventDefault();
      setView("feed");
    });

    $("brandHomeTop")?.addEventListener("click", (event) => {
      event.preventDefault();
      setView("feed");
    });

    /*
     * Supports the new create button and the older button IDs.
     * Change these selectors if your HTML uses a different ID.
     */
    ["publishBtn", "publishPostBtn", "createPublishBtn"].forEach((id) => {
      $(id)?.addEventListener("click", publishPost);
    });

    document.addEventListener("submit", async (event) => {
      const form = event.target.closest("[data-comment-form]");
      if (!form) return;

      event.preventDefault();

      const postId = form.dataset.commentForm;
      const input = form.querySelector('[name="comment"]');

      await submitComment(postId, input?.value || "");

      if (input) input.value = "";
    });

    document.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;

      const action = button.dataset.action;
      const postId = button.dataset.id;

      if (action === "like") {
        await toggleLike(postId, button);
      }

      if (action === "next") {
        nextPost(Number(button.dataset.index));
      }

      if (action === "comment") {
        const card = button.closest(".postCard");
        card?.querySelector('[name="comment"]')?.focus();
      }

      if (action === "delete-comment") {
        await deleteComment(button.dataset.id, button.dataset.postId);
      }
    });
  }

  /* ---------- STARTUP ---------- */

  async function init() {
    applyTheme();
    renderAvatar();
    attachEvents();

    const { data, error } = await db.auth.getSession();

    if (error) {
      console.error("Session error:", error);
    }

    state.user = data?.session?.user || null;

    if (state.user) {
      showApp();
    } else {
      showAuth();
      showAuthMode("login");
    }

    // Update the greeting if the page remains open across a time change.
    setInterval(updateGreeting, 60_000);
  }

  init().catch((error) => {
    console.error("Vidora startup error:", error);
    notify("Vidora could not start. Check the browser console.");
  });

})();
