(() => {
  "use strict";

  /* =========================================
     VIDORA — NEON GALAXY APP
     Supabase JavaScript v2
  ========================================= */

  const SUPABASE_URL =
    "https://htnrqgzxkfktwoioscjr.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_JT5rBfXYSX3-3_zyC2cazQ_YXg_ih_h";

  if (!window.supabase) {
    console.error("Vidora: Supabase library was not loaded.");
    return;
  }

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const $ = (id) => document.getElementById(id);

  const state = {
    user: null,
    profile: null,
    currentChat: null,
    feed: [],
    busy: false,
    selectedFile: null,
    subscriptions: [],
    timers: []
  };

  /* =========================================
     GENERAL HELPERS
  ========================================= */

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function status(id, message, error = false) {
    const element = $(id);

    if (!element) return;

    element.textContent = message;
    element.style.color = error ? "#ff6b9d" : "";
  }

  function displayName(profile) {
    return profile?.display_name ||
      profile?.username ||
      "Vidora User";
  }

  function username(profile) {
    return profile?.username || "vidora_user";
  }

  function avatarURL(profile) {
    return profile?.avatar_url || "";
  }

  function initials(profile) {
    return displayName(profile)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || "")
      .join("")
      .toUpperCase() || "V";
  }

  function formatTime(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function relativeTime(value) {
    if (!value) return "";

    const seconds = Math.max(
      0,
      Math.floor((Date.now() - new Date(value).getTime()) / 1000)
    );

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;

    return `${Math.floor(seconds / 86400)}d ago`;
  }

  function greeting() {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";

    return "Good evening";
  }

  function setText(id, value) {
    const element = $(id);

    if (element) element.textContent = value ?? "";
  }

  function setAvatarMood(mood) {
    const element = $("avatarMood");

    if (element) element.textContent = mood || "Ready to explore";
  }

  function updateGreeting() {
    const message = `${greeting()}, ${displayName(state.profile)}!`;

    setText("greetingText", message);
    setText("greetingTextAssistant", message);
  }

  function speak(message) {
    if (!("speechSynthesis" in window)) {
      status("assistantReply", message);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1;
    utterance.pitch = 1.05;

    window.speechSynthesis.speak(utterance);
  }

  function showMessage(message) {
    let box = $("vidoraToast");

    if (!box) {
      box = document.createElement("div");
      box.id = "vidoraToast";

      Object.assign(box.style, {
        position: "fixed",
        left: "50%",
        bottom: "90px",
        transform: "translateX(-50%)",
        zIndex: "99999",
        maxWidth: "90%",
        padding: "12px 18px",
        borderRadius: "14px",
        background: "#19152c",
        color: "#ffffff",
        border: "1px solid #8b5cf6",
        boxShadow: "0 0 24px #8b5cf644",
        textAlign: "center",
        fontSize: "14px"
      });

      document.body.appendChild(box);
    }

    box.textContent = message;
    box.hidden = false;

    clearTimeout(box._hideTimer);

    box._hideTimer = setTimeout(() => {
      box.hidden = true;
    }, 3500);
  }

  function setBusy(button, busy, text = "Please wait...") {
    if (!button) return;

    if (busy) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.textContent = text;
    } else {
      button.disabled = false;

      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
      }
    }
  }

  /* =========================================
     NAVIGATION
  ========================================= */

  function showView(viewId) {
    const views = document.querySelectorAll(
      "#appShell .view, #appShell [data-app-view]"
    );

    views.forEach((view) => {
      const matches =
        view.id === viewId ||
        view.dataset.appView === viewId;

      view.hidden = !matches;
      view.classList.toggle("active", matches);
      view.setAttribute("aria-hidden", String(!matches));
    });

    document.querySelectorAll(".nav-button").forEach((button) => {
      const matches = button.dataset.view === viewId;

      button.classList.toggle("active", matches);

      if (matches) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    if (viewId === "homeView") loadFeed();
    if (viewId === "discoverView") loadDiscover();
    if (viewId === "profileView") loadProfile();
    if (viewId === "notificationsView") loadNotifications();
    if (viewId === "inboxView") loadInbox();
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");

    if (!button) return;

    const viewId = button.dataset.view;

    if (!viewId) return;

    if (!state.user) {
      showAuth();
      return;
    }

    showView(viewId);
  });

  function showAuth() {
    const auth = $("authScreen");
    const app = $("appShell");

    if (auth) auth.hidden = false;
    if (app) app.hidden = true;
  }

  function showApp() {
    const auth = $("authScreen");
    const app = $("appShell");

    if (auth) auth.hidden = true;
    if (app) app.hidden = false;

    updateGreeting();
    showView("homeView");
  }

  /* =========================================
     AUTHENTICATION
  ========================================= */

  async function getProfile(userId) {
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Profile lookup failed:", error);
      return null;
    }

    return data;
  }

  async function ensureProfile(user, extra = {}) {
    let profile = await getProfile(user.id);

    if (!profile) {
      const emailName =
        user.email?.split("@")[0] || "vidora_user";

      const desiredUsername =
        extra.username ||
        user.user_metadata?.username ||
        emailName;

      const payload = {
        id: user.id,
        username: desiredUsername,
        display_name:
          extra.display_name ||
          user.user_metadata?.display_name ||
          desiredUsername,
        avatar_url: extra.avatar_url || "",
        bio: extra.bio || ""
      };

      const { error } = await db
        .from("profiles")
        .upsert(payload, { onConflict: "id" });

      if (error) {
        console.error("Profile creation failed:", error);
        showMessage("Your account exists, but profile setup needs attention.");
      }

      profile = await getProfile(user.id);
    }

    state.profile = profile;

    return profile;
  }

  async function handleAuth(event) {
    event.preventDefault();

    const email = $("loginEmail")?.value.trim();
    const password = $("loginPassword")?.value;

    if (!email || !password) {
      status("authMessage", "Enter your email and password.", true);
      return;
    }

    const button = $("authSubmit");

    try {
      setBusy(button, true, "Signing in...");

      const { data, error } = await db.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      await startSession(data.user);
    } catch (error) {
      status(
        "authMessage",
        error.message || "Login failed.",
        true
      );
    } finally {
      setBusy(button, false);
    }
  }

  async function signup() {
    const email = $("authEmail")?.value.trim();
    const password = $("authPassword")?.value;
    const desiredUsername = $("authUsername")?.value.trim();
    const name =
      $("authDisplayName")?.value.trim() || desiredUsername;
    const bio = $("authBio")?.value.trim() || "";

    if (!email || !password || !desiredUsername) {
      status(
        "authMessage",
        "Enter your username, email, and password.",
        true
      );
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,24}$/.test(desiredUsername)) {
      status(
        "authMessage",
        "Use 3–24 letters, numbers, or underscores for your username.",
        true
      );
      return;
    }

    const terms = $("authTerms");

    if (terms && !terms.checked) {
      status("authMessage", "Please accept the terms to continue.", true);
      return;
    }

    const button = $("signupNext");

    try {
      setBusy(button, true, "Creating account...");

      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: desiredUsername,
            display_name: name,
            bio
          }
        }
      });

      if (error) throw error;

      if (data.session && data.user) {
        await ensureProfile(data.user, {
          username: desiredUsername,
          display_name: name,
          bio
        });

        await startSession(data.user);
      } else {
        status(
          "authMessage",
          "Account created! Check your email to confirm your account, then sign in."
        );

        showLoginForm();
      }
    } catch (error) {
      status(
        "authMessage",
        error.message || "Signup failed.",
        true
      );
    } finally {
      setBusy(button, false);
    }
  }

  function showLoginForm() {
    if ($("loginFields")) $("loginFields").hidden = false;
    if ($("signupWizard")) $("signupWizard").hidden = true;
    setText("authTitle", "Welcome back");
  }

  function showSignupForm() {
    if ($("loginFields")) $("loginFields").hidden = true;
    if ($("signupWizard")) $("signupWizard").hidden = false;
    setText("authTitle", "Join Vidora");
  }

  async function startSession(user) {
    if (!user) {
      showAuth();
      return;
    }

    state.user = user;

    await ensureProfile(user);

    showApp();

    await Promise.allSettled([
      loadFeed(),
      loadNotifications(),
      loadInbox()
    ]);
  }

  async function logout() {
    try {
      await db.auth.signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
    }

    state.user = null;
    state.profile = null;
    state.currentChat = null;

    state.timers.forEach(clearInterval);
    state.timers = [];

    showAuth();
  }

  /* =========================================
     PROFILE AVATARS
  ========================================= */

  function avatarMarkup(profile, extraClass = "") {
    const src = avatarURL(profile);

    if (src) {
      return `
        <img
          class="mini-avatar ${extraClass}"
          src="${escapeHTML(src)}"
          alt="${escapeHTML(displayName(profile))}"
          loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.hidden=false"
        >
        <span class="mini-avatar avatar-fallback" hidden>
          ${escapeHTML(initials(profile))}
        </span>
      `;
    }

    return `
      <span class="mini-avatar avatar-fallback ${extraClass}">
        ${escapeHTML(initials(profile))}
      </span>
    `;
  }

  async function saveProfile() {
    if (!state.user) return;

    const display_name = $("editDisplayName")?.value.trim();
    const bio = $("editBio")?.value.trim();

    const updates = {};

    if (display_name) updates.display_name = display_name;
    if (bio !== undefined) updates.bio = bio;

    if (!Object.keys(updates).length) return;

    const { error } = await db
      .from("profiles")
      .update(updates)
      .eq("id", state.user.id);

    if (error) {
      showMessage("Could not update profile: " + error.message);
      return;
    }

    state.profile = await getProfile(state.user.id);
    updateGreeting();
    await loadProfile();

    showMessage("Profile updated!");
  }

  async function loadProfile() {
    if (!state.user) return;

    state.profile = await getProfile(state.user.id);

    const profile = state.profile;

    if (!profile) return;

    setText("profileDisplayName", displayName(profile));
    setText("profileUsername", "@" + username(profile));

    const avatar = $("profileAvatar");

    if (avatar) {
      if (avatar.tagName === "IMG") {
        avatar.src = avatarURL(profile);
        avatar.alt = displayName(profile);
      } else {
        avatar.innerHTML = avatarMarkup(profile);
      }
    }

    const { data: posts, error } = await db
      .from("posts")
      .select("*")
      .eq("user_id", state.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Profile posts failed:", error);
      return;
    }

    setText("postCount", posts.length);

    const { count: followers } = await db
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", state.user.id);

    const { count: following } = await db
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", state.user.id);

    setText("followerCount", followers ?? 0);
    setText("followingCount", following ?? 0);

    const container = $("myPosts");

    if (!container) return;

    if (!posts.length) {
      container.innerHTML = "<p>You haven't published anything yet.</p>";
      return;
    }

    container.innerHTML = posts.map((post) => `
      <article class="profile-post">
        ${
          post.media_type === "video"
            ? `<video src="${escapeHTML(post.media_url)}" controls playsinline></video>`
            : `<img src="${escapeHTML(post.media_url)}" alt="Your post" loading="lazy">`
        }
        <p>${escapeHTML(post.caption || "")}</p>
        <button
          type="button"
          class="text-button"
          data-delete-post="${escapeHTML(post.id)}"
        >Delete post</button>
      </article>
    `).join("");
  }

  /* =========================================
     FEED
  ========================================= */

  async function loadFeed() {
    if (!state.user) return;

    const container = $("feed");

    if (!container) return;

    container.innerHTML = "<p>Loading Vidora...</p>";

    const { data: posts, error } = await db
      .from("posts")
      .select(`
        id,
        user_id,
        media_url,
        media_type,
        caption,
        created_at,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url,
          bio
        )
      `)
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      console.error("Feed failed:", error);

      container.innerHTML =
        `<p>Couldn't load the feed: ${escapeHTML(error.message)}</p>`;

      return;
    }

    state.feed = posts || [];

    if (!state.feed.length) {
      container.innerHTML =
        "<p class='empty-state'>No posts yet. Be the first to publish!</p>";

      return;
    }

    const postIds = state.feed.map((post) => post.id);

    const { data: likes, error: likesError } = await db
      .from("likes")
      .select("post_id,user_id")
      .in("post_id", postIds);

    if (likesError) {
      console.warn("Likes couldn't be loaded:", likesError);
    }

    const { data: comments } = await db
      .from("comments")
      .select("post_id")
      .in("post_id", postIds);

    const likesByPost = {};
    const commentsByPost = {};

    (likes || []).forEach((like) => {
      likesByPost[like.post_id] ||= [];
      likesByPost[like.post_id].push(like);
    });

    (comments || []).forEach((comment) => {
      commentsByPost[comment.post_id] =
        (commentsByPost[comment.post_id] || 0) + 1;
    });

    container.innerHTML = state.feed.map((post) => {
      const profile = post.profiles || {};
      const postLikes = likesByPost[post.id] || [];

      const liked = postLikes.some(
        (like) => like.user_id === state.user.id
      );

      const ownPost = post.user_id === state.user.id;

      const media = post.media_type === "video"
        ? `
          <video
            class="post-media"
            src="${escapeHTML(post.media_url)}"
            controls
            playsinline
            preload="metadata"
          ></video>
        `
        : `
          <img
            class="post-media"
            src="${escapeHTML(post.media_url)}"
            alt="Vidora post"
            loading="lazy"
          >
        `;

      return `
        <article class="post-card" data-post-id="${escapeHTML(post.id)}">
          <header class="post-header">
            ${avatarMarkup(profile)}
            <div class="post-author">
              <strong>${escapeHTML(displayName(profile))}</strong>
              <small>@${escapeHTML(username(profile))}</small>
              <small>${escapeHTML(relativeTime(post.created_at))}</small>
            </div>

            ${
              !ownPost
                ? `<button type="button" class="follow-button" data-follow-user="${escapeHTML(post.user_id)}">Follow</button>`
                : `<button type="button" class="text-button" data-delete-post="${escapeHTML(post.id)}">Delete</button>`
            }
          </header>

          ${post.caption ? `<p class="post-caption">${escapeHTML(post.caption)}</p>` : ""}

          <div class="post-media-wrap">${media}</div>

          <footer class="post-actions">
            <button
              type="button"
              class="like-button ${liked ? "liked" : ""}"
              data-like-post="${escapeHTML(post.id)}"
            >${liked ? "♥ Liked" : "♡ Like"} · ${postLikes.length}</button>

            <button
              type="button"
              class="comment-button"
              data-comment-post="${escapeHTML(post.id)}"
            >💬 Comment · ${commentsByPost[post.id] || 0}</button>

            <button
              type="button"
              class="text-button"
              data-share-post="${escapeHTML(post.id)}"
            >↗ Share</button>
          </footer>

          <div class="comment-area" id="comments-${escapeHTML(post.id)}" hidden>
            <div class="comment-list"></div>
            <form data-comment-form="${escapeHTML(post.id)}">
              <input
                name="content"
                maxlength="500"
                placeholder="Write a comment..."
                required
              >
              <button type="submit">Send</button>
            </form>
          </div>
        </article>
      `;
    }).join("");
  }

  /* =========================================
     CREATE POSTS
  ========================================= */

  async function publishPost(event) {
    event.preventDefault();

    if (!state.user) {
      showAuth();
      return;
    }

    const fileInput = $("createFile");
    const captionInput = $("createCaption");
    const button = $("publishBtn");

    const file = fileInput?.files?.[0];
    const caption = captionInput?.value.trim() || "";

    if (!file) {
      status("createMessage", "Choose a photo or video first.", true);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      status("createMessage", "The maximum upload size is 50 MB.", true);
      return;
    }

    if (!file.type.startsWith("image/") &&
        !file.type.startsWith("video/")) {
      status("createMessage", "Choose an image or video file.", true);
      return;
    }

    let uploadedPath = null;

    try {
      setBusy(button, true, "Uploading...");

      const safeName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, "_");

      const path =
        `${state.user.id}/${Date.now()}_${safeName}`;

      const { data: uploaded, error: uploadError } = await db
        .storage
        .from("media")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      uploadedPath = uploaded.path;

      const { data: publicURL } = db
        .storage
        .from("media")
        .getPublicUrl(uploaded.path);

      const mediaURL = publicURL?.publicUrl;

      if (!mediaURL) {
        throw new Error("Couldn't create the media URL.");
      }

      const { error: insertError } = await db
        .from("posts")
        .insert({
          user_id: state.user.id,
          media_url: mediaURL,
          media_type: file.type.startsWith("video/")
            ? "video"
            : "image",
          caption
        });

      if (insertError) throw insertError;

      if (fileInput) fileInput.value = "";
      if (captionInput) captionInput.value = "";

      status("createMessage", "Published successfully!");

      showMessage("Your post is now on Vidora!");

      showView("homeView");

      await loadFeed();
      await loadProfile();
    } catch (error) {
      console.error("Publish failed:", error);

      status(
        "createMessage",
        "Upload failed: " + (error.message || "Unknown error"),
        true
      );

      /*
       * If the database insert fails after the upload,
       * leave the uploaded object in storage for inspection.
       * It can be deleted manually after checking the error.
       */
      if (uploadedPath) {
        console.warn("Uploaded object path:", uploadedPath);
      }
    } finally {
      setBusy(button, false);
    }
  }

  /* =========================================
     LIKES
  ========================================= */

  async function toggleLike(postId, button) {
    if (!state.user) return;

    button.disabled = true;

    try {
      const { data: existing, error: lookupError } = await db
        .from("likes")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", state.user.id)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existing) {
        const { error } = await db
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", state.user.id);

        if (error) throw error;
      } else {
        const { error } = await db
          .from("likes")
          .insert({
            post_id: postId,
            user_id: state.user.id
          });

        if (error) throw error;
      }

      await loadFeed();
    } catch (error) {
      console.error("Like failed:", error);
      showMessage("Couldn't update like: " + error.message);
    } finally {
      button.disabled = false;
    }
  }

  /* =========================================
     COMMENTS
  ========================================= */

  async function loadComments(postId) {
    const area = $(`comments-${postId}`);

    if (!area) return;

    const list = area.querySelector(".comment-list");

    if (!list) return;

    list.innerHTML = "<p>Loading comments...</p>";

    const { data, error } = await db
      .from("comments")
      .select(`
        id,
        user_id,
        content,
        created_at,
        profiles:user_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      list.textContent = "Couldn't load comments.";
      return;
    }

    if (!data?.length) {
      list.textContent = "No comments yet.";
      return;
    }

    list.innerHTML = data.map((comment) => `
      <div class="comment-row">
        ${avatarMarkup(comment.profiles || {})}
        <div>
          <strong>${escapeHTML(displayName(comment.profiles || {}))}</strong>
          <p>${escapeHTML(comment.content)}</p>
          <small>${escapeHTML(relativeTime(comment.created_at))}</small>
        </div>
      </div>
    `).join("");
  }

  async function addComment(event, postId) {
    event.preventDefault();

    const input = event.currentTarget.elements.content;
    const content = input?.value.trim();

    if (!content) return;

    if (content.length > 500) {
      showMessage("Comments can contain up to 500 characters.");
      return;
    }

    const { error } = await db
      .from("comments")
      .insert({
        post_id: postId,
        user_id: state.user.id,
        content
      });

    if (error) {
      showMessage("Couldn't add comment: " + error.message);
      return;
    }

    input.value = "";

    await loadComments(postId);
    await loadFeed();
  }

  /* =========================================
     DELETE OWN POSTS
  ========================================= */

  async function deleteOwnPost(postId) {
    if (!confirm("Delete this post? This cannot be undone.")) return;

    const { error } = await db
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", state.user.id);

    if (error) {
      showMessage("Couldn't delete post: " + error.message);
      return;
    }

    showMessage("Post deleted.");

    await loadFeed();
    await loadProfile();
  }

  /* =========================================
     FOLLOW SYSTEM
  ========================================= */

  async function followUser(targetId, button) {
    if (!state.user || targetId === state.user.id) return;

    if (button) button.disabled = true;

    try {
      const { data: existing, error: lookupError } = await db
        .from("follows")
        .select("follower_id")
        .eq("follower_id", state.user.id)
        .eq("following_id", targetId)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existing) {
        const { error } = await db
          .from("follows")
          .delete()
          .eq("follower_id", state.user.id)
          .eq("following_id", targetId);

        if (error) throw error;

        showMessage("You unfollowed this user.");
      } else {
        const { error } = await db
          .from("follows")
          .insert({
            follower_id: state.user.id,
            following_id: targetId
          });

        if (error) throw error;

        showMessage("You're now following this user.");
      }

      await loadDiscover();
      await loadFeed();
    } catch (error) {
      showMessage("Follow failed: " + error.message);
    } finally {
      if (button) button.disabled = false;
    }
  }

  /* =========================================
     DISCOVER
  ========================================= */

  async function loadDiscover(searchTerm = "") {
    if (!state.user) return;

    const container =
      $("discoverList") ||
      $("discoverResults") ||
      $("discoverUsers");

    if (!container) return;

    container.innerHTML = "<p>Discovering creators...</p>";

    let query = db
      .from("profiles")
      .select("id,username,display_name,avatar_url,bio")
      .neq("id", state.user.id)
      .limit(40);

    if (searchTerm.trim()) {
      const safeSearch = searchTerm.trim()
        .replace(/[%_,()]/g, "");

      query = query.or(
        `username.ilike.%${safeSearch}%,display_name.ilike.%${safeSearch}%`
      );
    }

    const { data: profiles, error } = await query;

    if (error) {
      container.innerHTML =
        `<p>Discover failed: ${escapeHTML(error.message)}</p>`;
      return;
    }

    if (!profiles?.length) {
      container.innerHTML = "<p>No creators found.</p>";
      return;
    }

    const { data: following } = await db
      .from("follows")
      .select("following_id")
      .eq("follower_id", state.user.id);

    const followingIds = new Set(
      (following || []).map((item) => item.following_id)
    );

    container.innerHTML = profiles.map((profile) => `
      <article class="person-row user-card">
        ${avatarMarkup(profile)}
        <div class="person-info">
          <strong>${escapeHTML(displayName(profile))}</strong>
          <small>@${escapeHTML(username(profile))}</small>
          <p>${escapeHTML(profile.bio || "")}</p>
        </div>

        <button
          type="button"
          class="follow-button"
          data-follow-user="${escapeHTML(profile.id)}"
        >${followingIds.has(profile.id) ? "Unfollow" : "Follow"}</button>

        <button
          type="button"
          class="text-button"
          data-open-chat="${escapeHTML(profile.id)}"
        >Message</button>
      </article>
    `).join("");
  }

  /* =========================================
     IN-APP NOTIFICATIONS
  ========================================= */

  async function createNotification(
    targetUserId,
    type,
    message,
    postId = null
  ) {
    if (!state.user || !targetUserId ||
        targetUserId === state.user.id) return;

    const { error } = await db
      .from("notifications")
      .insert({
        user_id: targetUserId,
        actor_id: state.user.id,
        type,
        message,
        post_id: postId
      });

    if (error) {
      console.warn("Notification could not be created:", error.message);
    }
  }

  async function loadNotifications() {
    if (!state.user) return;

    const container = $("notificationList");

    if (!container) return;

    const { data, error } = await db
      .from("notifications")
      .select(`
        id,
        actor_id,
        type,
        message,
        post_id,
        created_at,
        profiles:actor_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("user_id", state.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      container.innerHTML =
        `<p>Couldn't load notifications: ${escapeHTML(error.message)}</p>`;
      return;
    }

    if (!data?.length) {
      container.innerHTML = "<p>You're all caught up!</p>";
      return;
    }

    container.innerHTML = data.map((item) => `
      <article class="notification-row notification-card">
        ${avatarMarkup(item.profiles || {})}
        <div class="notification-content">
          <p>${escapeHTML(item.message || "New activity on Vidora.")}</p>
          <small>${escapeHTML(relativeTime(item.created_at))}</small>
        </div>
      </article>
    `).join("");
  }

  /* =========================================
     INBOX AND MUTUAL FOLLOWING
  ========================================= */

  async function areMutualFollowers(otherUserId) {
    const { data, error } = await db
      .from("follows")
      .select("follower_id,following_id")
      .or(
        `and(follower_id.eq.${state.user.id},following_id.eq.${otherUserId}),and(follower_id.eq.${otherUserId},following_id.eq.${state.user.id})`
      );

    if (error) {
      console.error("Follow relationship check failed:", error);
      return false;
    }

    const hasMyFollow = data.some(
      (item) =>
        item.follower_id === state.user.id &&
        item.following_id === otherUserId
    );

    const hasTheirFollow = data.some(
      (item) =>
        item.follower_id === otherUserId &&
        item.following_id === state.user.id
    );

    return hasMyFollow && hasTheirFollow;
  }

  async function loadInbox() {
    if (!state.user) return;

    const container = $("inboxList");

    if (!container) return;

    container.innerHTML = "<p>Loading conversations...</p>";

    const { data, error } = await db
      .from("messages")
      .select("sender_id,receiver_id,content,created_at")
      .or(
        `sender_id.eq.${state.user.id},receiver_id.eq.${state.user.id}`
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      container.innerHTML =
        `<p>Couldn't load messages: ${escapeHTML(error.message)}</p>`;
      return;
    }

    const people = new Map();

    for (const message of data || []) {
      const otherId = message.sender_id === state.user.id
        ? message.receiver_id
        : message.sender_id;

      if (!people.has(otherId)) {
        people.set(otherId, message);
      }
    }

    if (!people.size) {
      container.innerHTML =
        "<p>No conversations yet. Find a creator and start a conversation.</p>";
      return;
    }

    const ids = [...people.keys()];

    const { data: profiles } = await db
      .from("profiles")
      .select("id,username,display_name,avatar_url")
      .in("id", ids);

    const profileMap = new Map(
      (profiles || []).map((profile) => [profile.id, profile])
    );

    container.innerHTML = ids.map((id) => {
      const message = people.get(id);
      const profile = profileMap.get(id) || {};

      return `
        <button
          type="button"
          class="inbox-row inbox-item"
          data-open-chat="${escapeHTML(id)}"
        >
          ${avatarMarkup(profile)}
          <span class="person-info">
            <strong>${escapeHTML(displayName(profile))}</strong>
            <small>${escapeHTML(message.content)}</small>
            <small>${escapeHTML(relativeTime(message.created_at))}</small>
          </span>
        </button>
      `;
    }).join("");
  }

  async function openChat(otherUserId) {
    if (!state.user || otherUserId === state.user.id) return;

    const mutual = await areMutualFollowers(otherUserId);

    if (!mutual) {
      showMessage("Chat is available only between mutual followers.");
      return;
    }

    const { data: profile, error } = await db
      .from("profiles")
      .select("*")
      .eq("id", otherUserId)
      .maybeSingle();

    if (error || !profile) {
      showMessage("Couldn't open this profile.");
      return;
    }

    state.currentChat = {
      id: otherUserId,
      profile
    };

    setText("chatName", displayName(profile));
    setText("chatStatus", "Mutual followers");

    const avatar = $("chatAvatar");

    if (avatar) {
      if (avatar.tagName === "IMG") {
        avatar.src = avatarURL(profile);
        avatar.alt = displayName(profile);
      } else {
        avatar.innerHTML = avatarMarkup(profile);
      }
    }

    if ($("chatPanel")) $("chatPanel").hidden = false;
    if ($("inboxList")) $("inboxList").hidden = true;

    await loadMessages();
  }

  async function loadMessages() {
    if (!state.currentChat || !state.user) return;

    const container = $("chatMessages");

    if (!container) return;

    const otherId = state.currentChat.id;

    const { data, error } = await db
      .from("messages")
      .select("id,sender_id,receiver_id,content,created_at")
      .or(
        `and(sender_id.eq.${state.user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${state.user.id})`
      )
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      container.innerHTML =
        `<p>Couldn't load messages: ${escapeHTML(error.message)}</p>`;
      return;
    }

    container.innerHTML = (data || []).map((message) => {
      const mine = message.sender_id === state.user.id;

      return `
        <div class="chat-bubble ${mine ? "mine" : "theirs"}">
          <div class="bubble-content">${escapeHTML(message.content)}</div>
          <small class="message-time">${escapeHTML(formatTime(message.created_at))}</small>
        </div>
      `;
    }).join("");

    container.scrollTop = container.scrollHeight;
  }

  async function sendMessage(event) {
    event.preventDefault();

    if (!state.currentChat || !state.user) return;

    const input = $("messageInput");
    const content = input?.value.trim();

    if (!content) return;

    if (content.length > 2000) {
      showMessage("Messages can contain up to 2,000 characters.");
      return;
    }

    const mutual = await areMutualFollowers(state.currentChat.id);

    if (!mutual) {
      showMessage("You must follow each other to chat.");
      return;
    }

    const { error } = await db
      .from("messages")
      .insert({
        sender_id: state.user.id,
        receiver_id: state.currentChat.id,
        content
      });

    if (error) {
      showMessage("Message failed: " + error.message);
      return;
    }

    input.value = "";

    await loadMessages();
    await loadInbox();
  }

  /* =========================================
     SHARE POSTS
  ========================================= */

  async function sharePost(postId) {
    const post = state.feed.find(
      (item) => String(item.id) === String(postId)
    );

    const shareURL = new URL(window.location.href);
    shareURL.searchParams.set("post", postId);

    const shareData = {
      title: "Vidora",
      text: post?.caption || "Check out this post on Vidora!",
      url: shareURL.toString()
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareURL.toString());
        showMessage("Post link copied!");
      } else {
        showMessage("Copy this page's address to share the post.");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        showMessage("Couldn't share this post.");
      }
    }
  }

  /* =========================================
     AVATAR CONTROLS
  ========================================= */

  function assistantHelp() {
    const message =
      "I'm Skye, your Vidora assistant. I can help you explore creators, " +
      "publish posts, manage your profile, and use Vidora's features.";

    setText("assistantReply", message);
    setAvatarMood("Happy to help!");

    speak(message);
  }

  function waveAvatar() {
    setAvatarMood("Waving hello!");

    const canvas = $("avatarCanvas");

    if (canvas) {
      canvas.classList.remove("avatar-wave");
      void canvas.offsetWidth;
      canvas.classList.add("avatar-wave");
    }

    speak(`Hello! ${greeting()}! Welcome to Vidora.`);
  }

  function danceAvatar() {
    setAvatarMood("Dancing!");

    const canvas = $("avatarCanvas");

    if (canvas) {
      canvas.classList.remove("avatar-dance");
      void canvas.offsetWidth;
      canvas.classList.add("avatar-dance");
    }
  }

  function changeAvatarColor() {
    const colors = [
      "#8b5cf6",
      "#00d9ff",
      "#ff3d9a",
      "#32e6a1",
      "#ffbd59"
    ];

    const color = colors[
      Math.floor(Math.random() * colors.length)
    ];

    document.documentElement.style.setProperty(
      "--primary",
      color
    );

    document.documentElement.style.setProperty(
      "--purple",
      color
    );

    setAvatarMood("New look unlocked!");
  }

  /* =========================================
     CASTING OVERLAY
  ========================================= */

  function openCast() {
    const overlay = $("castOverlay");

    if (overlay) overlay.hidden = false;

    status(
      "castStatus",
      "Casting interface ready. Choose a supported presentation option."
    );
  }

  function closeCast() {
    const overlay = $("castOverlay");

    if (overlay) overlay.hidden = true;
  }

  async function enterFullscreen() {
    const target = $("castPresentation") || document.documentElement;

    try {
      if (target.requestFullscreen) {
        await target.requestFullscreen();
      } else {
        showMessage("Fullscreen isn't supported in this browser.");
      }
    } catch {
      showMessage("Couldn't enter fullscreen.");
    }
  }

  /* =========================================
     PUSH SUBSCRIPTION SETUP
  ========================================= */

  function base64ToBytes(base64) {
    const padding = "=".repeat((4 - base64.length % 4) % 4);

    const normalized = (base64 + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const raw = atob(normalized);

    return Uint8Array.from(raw, (char) => char.charCodeAt(0));
  }

  async function enablePush() {
    if (!state.user) {
      showMessage("Sign in first.");
      return;
    }

    if (!("serviceWorker" in navigator) ||
        !("PushManager" in window)) {
      status(
        "pushStatus",
        "Push notifications aren't supported by this browser.",
        true
      );
      return;
    }

    /*
     * Replace this value with your actual VAPID public key
     * if it is different in your existing project.
     */
    const VAPID_PUBLIC_KEY =
      "BNSyI5LHkvoR198feKug9f2VN8t1nZQzlrjg5cWsvenuTQzyOsxfZn1KLHmVwLpNFJhZgyFkm9O3hUtmJuOYEVw";

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        status("pushStatus", "Notification permission wasn't granted.", true);
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToBytes(VAPID_PUBLIC_KEY)
        });
      }

      const { error } = await db
        .from("push_subscriptions")
        .upsert({
          user_id: state.user.id,
          endpoint: subscription.endpoint,
          subscription: subscription.toJSON()
        }, {
          onConflict: "endpoint"
        });

      if (error) throw error;

      status(
        "pushStatus",
        "Push subscription saved. Server-side push delivery must also be configured."
      );

      showMessage("Notification subscription enabled!");
    } catch (error) {
      console.error("Push setup failed:", error);

      status(
        "pushStatus",
        "Push setup failed: " + error.message,
        true
      );
    }
  }

  /* =========================================
     CLICK HANDLERS
  ========================================= */

  document.addEventListener("click", async (event) => {
    const like = event.target.closest("[data-like-post]");
    const follow = event.target.closest("[data-follow-user]");
    const deleteButton = event.target.closest("[data-delete-post]");
    const commentButton = event.target.closest("[data-comment-post]");
    const openChatButton = event.target.closest("[data-open-chat]");
    const shareButton = event.target.closest("[data-share-post]");

    if (like) {
      await toggleLike(like.dataset.likePost, like);
    }

    if (follow) {
      await followUser(follow.dataset.followUser, follow);
    }

    if (deleteButton) {
      await deleteOwnPost(deleteButton.dataset.deletePost);
    }

    if (commentButton) {
      const postId = commentButton.dataset.commentPost;
      const area = $(`comments-${postId}`);

      if (area) {
        area.hidden = !area.hidden;

        if (!area.hidden) {
          await loadComments(postId);
        }
      }
    }

    if (openChatButton) {
      await openChat(openChatButton.dataset.openChat);
    }

    if (shareButton) {
      await sharePost(shareButton.dataset.sharePost);
    }
  });

  document.addEventListener("submit", async (event) => {
    const commentForm = event.target.closest("[data-comment-form]");

    if (commentForm) {
      event.preventDefault();

      await addComment(
        event,
        commentForm.dataset.commentForm
      );
    }
  });

  /* =========================================
     EVENT WIRING
  ========================================= */

  function bind(id, eventName, handler) {
    const element = $(id);

    if (element) {
      element.addEventListener(eventName, handler);
    }
  }

  function setupAuthButtons() {
    bind("authForm", "submit", handleAuth);
    bind("showSignup", "click", showSignupForm);
    bind("showLogin", "click", showLoginForm);

    bind("signupNext", "click", async (event) => {
      event.preventDefault();
      await signup();
    });

    bind("signupBack", "click", (event) => {
      event.preventDefault();
      showLoginForm();
    });

    bind("logoutBtn", "click", logout);
  }

  function setupAppButtons() {
    bind("createForm", "submit", publishPost);
    bind("refreshFeedBtn", "click", loadFeed);
    bind("enablePushBtn", "click", enablePush);

    bind("notificationsBtn", "click", () => {
      showView("notificationsView");
    });

    bind("backHomeBtn", "click", () => {
      showView("homeView");
    });

    bind("messageForm", "submit", sendMessage);

    bind("backToInboxBtn", "click", () => {
      state.currentChat = null;

      if ($("chatPanel")) $("chatPanel").hidden = true;
      if ($("inboxList")) $("inboxList").hidden = false;

      loadInbox();
    });

    bind("assistantHelpBtn", "click", assistantHelp);
    bind("avatarWaveBtn", "click", waveAvatar);
    bind("avatarDanceBtn", "click", danceAvatar);
    bind("avatarColorBtn", "click", changeAvatarColor);

    bind("speakBtn", "click", () => {
      speak(`Hello, ${displayName(state.profile)}!`);
    });

    bind("castBtn", "click", openCast);
    bind("castClose", "click", closeCast);
    bind("castFullscreen", "click", enterFullscreen);
    bind("chatCastBtn", "click", openCast);

    bind("profileSaveBtn", "click", saveProfile);
  }

  function setupDiscoverSearch() {
    const input =
      $("discoverSearch") ||
      $("searchInput") ||
      $("discoverQuery");

    if (!input) return;

    let timer;

    input.addEventListener("input", () => {
      clearTimeout(timer);

      timer = setTimeout(() => {
        loadDiscover(input.value);
      }, 350);
    });
  }

  /* =========================================
     REALTIME UPDATES
  ========================================= */

  function setupRealtime() {
    if (!state.user) return;

    const channel = db
      .channel("vidora-live-" + state.user.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts"
        },
        () => {
          if (!$("homeView")?.hidden) loadFeed();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${state.user.id}`
        },
        async (payload) => {
          if (
            state.currentChat &&
            payload.new.sender_id === state.currentChat.id
          ) {
            await loadMessages();
          }

          await loadInbox();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${state.user.id}`
        },
        () => {
          loadNotifications();
          showMessage("You have a new notification!");
        }
      )
      .subscribe();

    state.subscriptions.push(channel);
  }

  /* =========================================
     STARTUP
  ========================================= */

  async function init() {
    initParticles();
    setupAuthButtons();
    setupAppButtons();
    setupDiscoverSearch();

    db.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        state.user = session.user;

        /*
         * Defer additional Supabase work so the auth callback
         * doesn't perform nested auth operations.
         */
        setTimeout(() => {
          startSession(session.user);
          setupRealtime();
        }, 0);
      } else if (event === "SIGNED_OUT") {
        state.user = null;
        state.profile = null;
        showAuth();
      }
    });

    const { data, error } = await db.auth.getSession();

    if (error) {
      console.error("Session lookup failed:", error);
      showAuth();
      return;
    }

    if (data.session?.user) {
      await startSession(data.session.user);
      setupRealtime();
    } else {
      showAuth();
    }
  }

  /* =========================================
     ANIMATED BACKGROUND
  ========================================= */

  function initParticles() {
    const canvas = $("bgCanvas");

    if (!canvas) return;

    const context = canvas.getContext("2d");

    if (!context) return;

    let width = 0;
    let height = 0;

    const particles = [];

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;

      particles.length = 0;

      const count = Math.min(
        65,
        Math.floor((width * height) / 18000)
      );

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.8 + 0.4,
          speed: Math.random() * 0.35 + 0.08,
          drift: (Math.random() - 0.5) * 0.3
        });
      }
    }

    function draw() {
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.y -= particle.speed;
        particle.x += particle.drift;

        if (particle.y < -5) {
          particle.y = height + 5;
          particle.x = Math.random() * width;
        }

        if (particle.x < -5) particle.x = width + 5;
        if (particle.x > width + 5) particle.x = -5;

        context.beginPath();
        context.arc(
          particle.x,
          particle.y,
          particle.radius,
          0,
          Math.PI * 2
        );

        context.fillStyle = "rgba(139,92,246,0.55)";
        context.fill();
      }

      requestAnimationFrame(draw);
    }

    resize();

    window.addEventListener("resize", resize);

    draw();
  }

  /* =========================================
     EXPOSE OPTIONAL HELPERS
  ========================================= */

  window.Vidora = {
    loadFeed,
    loadDiscover,
    loadProfile,
    loadNotifications,
    loadInbox,
    loadMessages,
    showView,
    logout,
    assistantHelp
  };

  document.addEventListener("DOMContentLoaded", init);

  if (document.readyState !== "loading") {
    init();
  }
})();
