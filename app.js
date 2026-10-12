/* ==========================================
   VIDORA UPGRADE
   Authentication, profiles, feed, publishing,
   comments, likes, premium avatar and 360° next.
   ========================================== */

(() => {
  "use strict";

  // SUPABASE CONFIGURATION
  const SUPABASE_URL =
    "https://htnrqgzxkfktwoioscjr.supabase.co";

  const SUPABASE_KEY =
    "YOUR_SUPABASE_ANON_KEY_HERE";

  const STORAGE_BUCKET = "media";
  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  const $ = id => document.getElementById(id);

  const state = {
    db: null,
    user: null,
    profile: null,
    authMode: "login",
    posts: [],
    avatar: localStorage.getItem("vidoraPremiumAvatar") || "Nova",
    theme: localStorage.getItem("vidoraTheme") || "dark",
    page: 0,
    pageSize: 10,
    hasMore: false,
    previewURL: null,
    search: ""
  };

  /* ---------- GENERAL HELPERS ---------- */

  function notify(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");

    clearTimeout(notify.timer);

    notify.timer = setTimeout(() => {
      el.classList.remove("show");
    }, 3500);
  }

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function friendlyError(error) {
    const message = error?.message || String(error);

    if (/Invalid login credentials/i.test(message)) {
      return "Incorrect email or password.";
    }

    if (/User already registered/i.test(message)) {
      return "This email is registered already. Try logging in.";
    }

    if (/row-level security|permission denied/i.test(message)) {
      return "Supabase permissions blocked this action. Check your RLS policies.";
    }

    if (/bucket not found/i.test(message)) {
      return 'Create a Supabase Storage bucket named "media".';
    }

    if (/duplicate key/i.test(message)) {
      return "That username may already be in use.";
    }

    return message;
  }

  function timeGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";

    return "Good evening";
  }

  /* ---------- GREETINGS ---------- */

  function updateGreetings() {
    const greeting = timeGreeting();

    const name =
      state.profile?.display_name ||
      state.profile?.username ||
      "there";

    $("timeGreeting").textContent =
      `${greeting}, ${name}!`;

    $("feedHeading").textContent =
      `${greeting} 👋`;

    $("avatarGreeting").textContent =
      `${greeting}, ${name}! Ready to explore Vidora?`;
  }

  /* ---------- AUTHENTICATION UI ---------- */

  function setAuthMode(mode) {
    state.authMode = mode;

    $("showLogin").classList.toggle(
      "active", mode === "login"
    );

    $("showSignup").classList.toggle(
      "active", mode === "signup"
    );

    $("signupFields").classList.toggle(
      "hidden", mode !== "signup"
    );

    $("authSubmit").textContent =
      mode === "login" ? "Login" : "Create account";

    $("authPassword").autocomplete =
      mode === "login" ? "current-password" : "new-password";

    $("authUsername").required = mode === "signup";
  }

  function showApp(signedIn) {
    $("authScreen").classList.toggle("hidden", signedIn);
    $("appShell").classList.toggle("hidden", !signedIn);
  }

  async function handleAuth(event) {
    event.preventDefault();

    if (!state.db) {
      notify("Add your Supabase public key in app.js first.");
      return;
    }

    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;
    const button = $("authSubmit");

    button.disabled = true;

    try {
      if (state.authMode === "login") {
        const { data, error } =
          await state.db.auth.signInWithPassword({
            email,
            password
          });

        if (error) throw error;

        state.user = data.user;

        await startApp();

      } else {
        const username =
          $("authUsername").value.trim();

        const displayName =
          $("authDisplayName").value.trim() || username;

        if (!/^[A-Za-z0-9_]{2,24}$/.test(username)) {
          throw new Error(
            "Username must contain 2–24 letters, numbers or underscores."
          );
        }

        const { data, error } =
          await state.db.auth.signUp({
            email,
            password,
            options: {
              data: {
                username,
                display_name: displayName
              }
            }
          });

        if (error) throw error;

        if (data.user && data.session) {
          state.user = data.user;

          await createProfile(
            data.user,
            username,
            displayName
          );

          await startApp();

        } else {
          setAuthMode("login");

          notify(
            "Account created. Check your email to confirm your account, then log in."
          );
        }
      }

    } catch (error) {
      notify(friendlyError(error));

    } finally {
      button.disabled = false;
    }
  }

  async function createProfile(user, username, displayName) {
    const { error } = await state.db
      .from("profiles")
      .upsert({
        id: user.id,
        username,
        display_name: displayName
      }, {
        onConflict: "id"
      });

    if (error) {
      console.error("Profile creation:", error.message);
    }
  }

  /* ---------- APP STARTUP ---------- */

  async function startApp() {
    showApp(true);

    await loadProfile();

    renderAvatar();
    updateGreetings();

    await loadFeed(true);
  }

  /* ---------- NAVIGATION ---------- */

  function setView(view) {
    const allowed = [
      "feed",
      "discover",
      "create",
      "assistant",
      "profile"
    ];

    if (!allowed.includes(view)) return;

    allowed.forEach(name => {
      $("view-" + name).classList.toggle(
        "hidden", name !== view
      );
    });

    document.querySelectorAll("[data-view]").forEach(button => {
      button.classList.toggle(
        "active", button.dataset.view === view
      );
    });

    if (view === "profile") {
      loadProfileAndPosts();
    }

    if (view === "discover") {
      renderDiscover();
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  /* ---------- PROFILE ---------- */

  async function loadProfile() {
    if (!state.user) return;

    const { data, error } = await state.db
      .from("profiles")
      .select(
        "id,username,display_name,avatar_url,bio,created_at"
      )
      .eq("id", state.user.id)
      .maybeSingle();

    if (error) {
      console.error("Profile loading:", error.message);
    }

    state.profile = data || {
      id: state.user.id,
      username: state.user.email?.split("@")[0] || "member",
      display_name: "Vidora member",
      bio: ""
    };

    $("profileDisplayName").textContent =
      state.profile.display_name ||
      state.profile.username;

    $("profileUsername").textContent =
      "@" + (state.profile.username || "member");

    $("profileAvatar").textContent =
      (state.profile.display_name || "V")
        .slice(0, 1).toUpperCase();

    $("profileDisplayInput").value =
      state.profile.display_name || "";

    $("profileUsernameInput").value =
      state.profile.username || "";

    $("profileBioInput").value =
      state.profile.bio || "";

    updateGreetings();
  }

  async function saveProfile(event) {
    event.preventDefault();

    const username =
      $("profileUsernameInput").value.trim();

    const displayName =
      $("profileDisplayInput").value.trim() || username;

    const bio =
      $("profileBioInput").value.trim();

    if (!/^[A-Za-z0-9_]{2,24}$/.test(username)) {
      notify("Enter a valid username.");
      return;
    }

    try {
      const { error } = await state.db
        .from("profiles")
        .upsert({
          id: state.user.id,
          username,
          display_name: displayName,
          bio
        }, {
          onConflict: "id"
        });

      if (error) throw error;

      await loadProfile();

      notify("Profile saved!");

    } catch (error) {
      notify(friendlyError(error));
    }
  }

  async function loadProfileAndPosts() {
    await loadProfile();

    const { data, error } = await state.db
      .from("posts")
      .select(
        "id,user_id,media_url,media_type,caption,created_at"
      )
      .eq("user_id", state.user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      $("myPosts").innerHTML =
        `<div class="empty-state">${escapeHTML(
          friendlyError(error)
        )}</div>`;

      return;
    }

    const mine = (data || []).map(post => ({
      ...post,
      username: state.profile?.username,
      display_name: state.profile?.display_name
    }));

    renderPosts("myPosts", mine, true);
  }

  /* ---------- FEED ---------- */

  async function loadFeed(reset = true) {
    if (!state.db || !state.user) return;

    if (reset) {
      state.page = 0;
      state.posts = [];
    }

    $("feedStatus").textContent = "Loading posts…";

    try {
      const start = state.page * state.pageSize;
      const end = start + state.pageSize - 1;

      const { data, error } = await state.db
        .from("posts")
        .select(
          "id,user_id,media_url,media_type,caption,created_at"
        )
        .order("created_at", { ascending: false })
        .range(start, end);

      if (error) throw error;

      const posts = data || [];

      const userIds = [
        ...new Set(posts.map(post => post.user_id))
      ].filter(Boolean);

      let profiles = [];

      if (userIds.length) {
        const result = await state.db
          .from("profiles")
          .select("id,username,display_name,avatar_url")
          .in("id", userIds);

        if (!result.error) {
          profiles = result.data || [];
        }
      }

      const profileMap = new Map(
        profiles.map(profile => [profile.id, profile])
      );

      const prepared = posts.map(post => ({
        ...post,
        ...(profileMap.get(post.user_id) || {})
      }));

      state.posts = reset
        ? prepared
        : state.posts.concat(prepared);

      state.hasMore = posts.length === state.pageSize;

      renderPosts("feedList", state.posts);

      $("feedStatus").textContent =
        state.posts.length
          ? `${state.posts.length} posts loaded`
          : "";

      $("loadMoreBtn").classList.toggle(
        "hidden", !state.hasMore
      );

    } catch (error) {
      $("feedStatus").textContent =
        friendlyError(error);

      if (reset) {
        $("feedList").innerHTML =
          `<div class="empty-state">Could not load posts.<br>${escapeHTML(
            friendlyError(error)
          )}</div>`;
      }
    }
  }

  /* ---------- POST RENDERING ---------- */

  function makeMedia(post) {
    const url = escapeHTML(post.media_url || "");
    const type = String(post.media_type || "").toLowerCase();

    if (!url) {
      return '<div class="empty-state">Media unavailable.</div>';
    }

    if (type.startsWith("video")) {
      return `
        <video
          class="post-media"
          src="${url}"
          controls
          playsinline
          preload="metadata">
        </video>`;
    }

    return `
      <img
        class="post-media"
        src="${url}"
        alt="Vidora post"
        loading="lazy">`;
  }

  function makePost(post, mine = false) {
    const id = escapeHTML(post.id);
    const username = post.username || "member";
    const displayName = post.display_name || username;

    const date = post.created_at
      ? new Date(post.created_at).toLocaleDateString()
      : "";

    const isVideo =
      String(post.media_type || "").startsWith("video");

    return `
      <article class="post-card" data-post-id="${id}">

        <div class="post-header">
          <div class="post-avatar">
            ${escapeHTML(displayName.slice(0, 1).toUpperCase())}
          </div>

          <div>
            <div class="post-author">
              ${escapeHTML(displayName)}
              <span class="muted">@${escapeHTML(username)}</span>
            </div>

            <div class="post-time">${escapeHTML(date)}</div>
          </div>
        </div>

        <div class="post-media-wrap" data-media-wrap>
          ${makeMedia(post)}
          <span class="media-label">
            ${isVideo ? "▶ VIDEO" : "✦ PHOTO"}
          </span>
        </div>

        <div class="post-body">
          <p class="post-caption">${escapeHTML(post.caption || "")}</p>

          <div class="post-actions">
            <button class="action-btn"
                    type="button"
                    data-action="like"
                    data-id="${id}">
              ♡ Like
            </button>

            <button class="action-btn"
                    type="button"
                    data-action="comments"
                    data-id="${id}">
              ▤ Comments
            </button>

            <button class="action-btn next-btn"
                    type="button"
                    data-action="next"
                    data-id="${id}">
              Next ↻
            </button>

            ${mine ? `
              <button class="action-btn"
                      type="button"
                      data-action="delete"
                      data-id="${id}">
                Delete
              </button>` : ""}
          </div>

          <div class="comments hidden"
               data-comments="${id}">
            <div class="comment-list"></div>

            <form class="comment-form"
                  data-comment-form="${id}">
              <input name="comment"
                     maxlength="500"
                     required
                     placeholder="Write a comment…">

              <button class="action-btn" type="submit">
                Send
              </button>
            </form>
          </div>
        </div>
      </article>`;
  }

  function renderPosts(target, posts, mine = false) {
    const container = $(target);

    if (!posts.length) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No posts yet</h3>
          <p>Publish something to get started.</p>
        </div>`;

      return;
    }

    container.innerHTML =
      posts.map(post => makePost(post, mine)).join("");
  }

  /* ---------- 360° NEXT-POST EFFECT ---------- */

  function nextPost(card) {
    const wrap = card.querySelector("[data-media-wrap]");

    if (!wrap) return;

    wrap.classList.remove("rotating");

    // Restart the animation cleanly.
    void wrap.offsetWidth;

    wrap.classList.add("rotating");

    const cards = [
      ...document.querySelectorAll("#feedList .post-card")
    ];

    const currentIndex = cards.indexOf(card);

    const next =
      cards[currentIndex + 1] || cards[0];

    if (next && next !== card) {
      setTimeout(() => {
        next.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 400);
    }

    setTimeout(() => {
      wrap.classList.remove("rotating");
    }, 850);
  }

  /* ---------- CREATE POST ---------- */

  function previewMedia() {
    const file = $("createFile").files[0];
    const box = $("mediaPreview");

    if (state.previewURL) {
      URL.revokeObjectURL(state.previewURL);
      state.previewURL = null;
    }

    if (!file) {
      box.innerHTML = "";
      box.classList.add("hidden");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      box.innerHTML = "";
      box.classList.add("hidden");
      notify("File is too large. Maximum size is 50 MB.");
      return;
    }

    if (!file.type.startsWith("image/") &&
        !file.type.startsWith("video/")) {
      notify("Choose an image or video.");
      return;
    }

    state.previewURL = URL.createObjectURL(file);

    box.innerHTML = file.type.startsWith("video/")
      ? `<video src="${state.previewURL}" controls playsinline></video>`
      : `<img src="${state.previewURL}" alt="Preview">`;

    box.classList.remove("hidden");
  }

  async function publishPost(event) {
    event.preventDefault();

    if (!state.user) {
      notify("Log in before publishing.");
      return;
    }

    const file = $("createFile").files[0];
    const caption = $("createCaption").value.trim();

    if (!file) {
      notify("Choose a photo or video.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      notify("Maximum file size is 50 MB.");
      return;
    }

    if (!file.type.startsWith("image/") &&
        !file.type.startsWith("video/")) {
      notify("Unsupported file type.");
      return;
    }

    const button = $("publishBtn");

    button.disabled = true;
    button.textContent = "Uploading…";

    let storagePath = null;

    try {
      const safeName = file.name.replace(
        /[^A-Za-z0-9._-]/g, "_"
      );

      storagePath =
        `${state.user.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } =
        await state.db.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false
          });

      if (uploadError) throw uploadError;

      const { data: publicData } =
        state.db.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(storagePath);

      const { error: postError } =
        await state.db.from("posts").insert({
          user_id: state.user.id,
          media_url: publicData.publicUrl,
          media_type: file.type,
          caption
        });

      if (postError) {
        await state.db.storage
          .from(STORAGE_BUCKET)
          .remove([storagePath]);

        throw postError;
      }

      $("createForm").reset();

      if (state.previewURL) {
        URL.revokeObjectURL(state.previewURL);
        state.previewURL = null;
      }

      $("mediaPreview").innerHTML = "";
      $("mediaPreview").classList.add("hidden");

      notify("Post published successfully!");

      setView("feed");
      await loadFeed(true);

    } catch (error) {
      notify(friendlyError(error));

    } finally {
      button.disabled = false;
      button.textContent = "🚀 Publish to Vidora";
    }
  }

  /* ---------- LIKES ---------- */

  async function toggleLike(postId, button) {
    /*
      This function expects a table named post_likes
      with user_id and post_id columns.

      Its post_id type must match posts.id.
    */

    try {
      const { data: existing, error: readError } =
        await state.db.from("post_likes")
          .select("user_id")
          .eq("post_id", postId)
          .eq("user_id", state.user.id)
          .maybeSingle();

      if (readError) throw readError;

      if (existing) {
        const { error } = await state.db
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", state.user.id);

        if (error) throw error;

        button.classList.remove("liked");
        button.textContent = "♡ Like";

      } else {
        const { error } = await state.db
          .from("post_likes")
          .insert({
            post_id: postId,
            user_id: state.user.id
          });

        if (error) throw error;

        button.classList.add("liked");
        button.textContent = "♥ Like";
      }

    } catch (error) {
      if (/does not exist|schema cache/i.test(error.message || "")) {
        notify("Likes need a post_likes table in Supabase.");
      } else {
        notify(friendlyError(error));
      }
    }
  }

  /* ---------- COMMENTS ---------- */

  async function loadComments(postId, container) {
    const list = container.querySelector(".comment-list");

    list.textContent = "Loading comments…";

    try {
      const { data, error } = await state.db
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) throw error;

      const comments = data || [];

      if (!comments.length) {
        list.innerHTML =
          '<p class="muted">No comments yet.</p>';

        return;
      }

      const userIds = [
        ...new Set(comments.map(c => c.user_id).filter(Boolean))
      ];

      let profiles = [];

      if (userIds.length) {
        const result = await state.db
          .from("profiles")
          .select("id,username,display_name")
          .in("id", userIds);

        if (!result.error) {
          profiles = result.data || [];
        }
      }

      const map = new Map(
        profiles.map(profile => [profile.id, profile])
      );

      list.innerHTML = comments.map(comment => {
        const profile = map.get(comment.user_id);

        const name =
          profile?.username ||
          profile?.display_name ||
          "member";

        return `
          <div class="comment-line">
            <strong>${escapeHTML(name)}</strong>
            ${escapeHTML(
              comment.content || comment.comment || ""
            )}
          </div>`;
      }).join("");

    } catch (error) {
      list.innerHTML = `
        <p class="muted">
          ${escapeHTML(friendlyError(error))}
        </p>`;
    }
  }

  async function submitComment(event, form) {
    event.preventDefault();

    const postId = form.dataset.commentForm;
    const input = form.elements.comment;
    const content = input.value.trim();

    if (!content) return;

    try {
      const { error } = await state.db
        .from("comments")
        .insert({
          post_id: postId,
          user_id: state.user.id,
          content
        });

      if (error) throw error;

      input.value = "";

      const container = document.querySelector(
        `[data-comments="${CSS.escape(postId)}"]`
      );

      if (container) {
        await loadComments(postId, container);
      }

      notify("Comment added!");

    } catch (error) {
      notify(friendlyError(error));
    }
  }

  /* ---------- DELETE YOUR OWN POSTS ---------- */

  async function deletePost(postId, card) {
    if (!confirm("Delete this post permanently?")) return;

    try {
      const { error } = await state.db
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", state.user.id);

      if (error) throw error;

      card.remove();

      state.posts = state.posts.filter(
        post => String(post.id) !== String(postId)
      );

      notify("Post deleted.");

    } catch (error) {
      notify(friendlyError(error));
    }
  }

  /* ---------- DISCOVER ---------- */

  function renderDiscover() {
    const term = state.search.toLowerCase().trim();

    const results = state.posts.filter(post => {
      const searchable =
        `${post.caption || ""} ${post.username || ""} ${post.display_name || ""}`
          .toLowerCase();

      return searchable.includes(term);
    });

    renderPosts("discoverList", results);
  }

  /* ---------- PREMIUM AVATAR ---------- */

  function renderAvatar() {
    const available = [
      "Nova", "Kai", "Luna", "Ivy", "Orion",
      "Zeno", "Sage", "Rex", "Pixel", "Vexa"
    ];

    if (!available.includes(state.avatar)) {
      state.avatar = "Nova";
    }

    $("avatarSelect").value = state.avatar;
    $("avatarName").textContent = state.avatar;
    $("avatarFace").textContent = state.avatar[0];

    localStorage.setItem(
      "vidoraPremiumAvatar",
      state.avatar
    );
  }

  /* ---------- THEME ---------- */

  function applyTheme() {
    document.body.classList.toggle(
      "light-theme",
      state.theme === "light"
    );

    $("themeToggle").textContent =
      state.theme === "light" ? "☾" : "☼";

    localStorage.setItem("vidoraTheme", state.theme);
  }

  /* ---------- EVENTS ---------- */

  function attachEvents() {
    $("showLogin").addEventListener("click", () => {
      setAuthMode("login");
    });

    $("showSignup").addEventListener("click", () => {
      setAuthMode("signup");
    });

    $("authForm").addEventListener("submit", handleAuth);

    $("brandHome").addEventListener("click", event => {
      event.preventDefault();
      setView("feed");
    });

    document.querySelectorAll("[data-view]").forEach(button => {
      button.addEventListener("click", () => {
        setView(button.dataset.view);
      });
    });

    $("logoutBtn").addEventListener("click", async () => {
      const { error } = await state.db.auth.signOut();

      if (error) {
        notify(friendlyError(error));
        return;
      }

      state.user = null;
      state.profile = null;
      state.posts = [];

      showApp(false);
      setAuthMode("login");
    });

    $("refreshFeed").addEventListener("click", () => {
      loadFeed(true);
    });

    $("loadMoreBtn").addEventListener("click", async () => {
      if (!state.hasMore) return;

      state.page += 1;
      await loadFeed(false);
    });

    $("createFile").addEventListener("change", previewMedia);

    $("createForm").addEventListener("submit", publishPost);

    $("profileForm").addEventListener("submit", saveProfile);

    $("avatarSelect").addEventListener("change", () => {
      state.avatar = $("avatarSelect").value;
      renderAvatar();
    });

    $("themeToggle").addEventListener("click", () => {
      state.theme =
        state.theme === "dark" ? "light" : "dark";

      applyTheme();
    });

    $("discoverSearch").addEventListener("input", () => {
      state.search = $("discoverSearch").value;
      renderDiscover();
    });

    // Post action buttons.
    document.body.addEventListener("click", async event => {
      const button = event.target.closest("[data-action]");

      if (!button || !state.user) return;

      const card = button.closest(".post-card");
      const id = button.dataset.id;
      const action = button.dataset.action;

      if (action === "like") {
        await toggleLike(id, button);
      }

      if (action === "comments") {
        const box = card.querySelector(
          `[data-comments="${CSS.escape(id)}"]`
        );

        box.classList.toggle("hidden");

        if (!box.classList.contains("hidden")) {
          await loadComments(id, box);
        }
      }

      if (action === "next") {
        nextPost(card);
      }

      if (action === "delete") {
        await deletePost(id, card);
      }
    });

    document.body.addEventListener("submit", event => {
      const form = event.target.closest("[data-comment-form]");

      if (form) {
        submitComment(event, form);
      }
    });
  }

  /* ---------- INITIALIZATION ---------- */

  async function init() {
    attachEvents();
    applyTheme();
    renderAvatar();
    setAuthMode("login");

    if (SUPABASE_KEY === "YOUR_SUPABASE_ANON_KEY_HERE") {
      notify("Add your Supabase public key in app.js.");

      return;
    }

    if (!window.supabase?.createClient) {
      notify("Supabase failed to load. Check your connection.");

      return;
    }

    state.db = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );

    const { data, error } =
      await state.db.auth.getSession();

    if (error) {
      notify(friendlyError(error));
    }

    if (data?.session?.user) {
      state.user = data.session.user;
      await startApp();
    }

    state.db.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user && !state.user) {
          state.user = session.user;

          // Avoid awaiting network calls inside the auth callback.
          setTimeout(() => startApp(), 0);
        }

        if (!session) {
          state.user = null;
          showApp(false);
        }
      }
    );
  }

  document.addEventListener("DOMContentLoaded", init);

})();
