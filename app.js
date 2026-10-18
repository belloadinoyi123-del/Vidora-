(() => {
  "use strict";

  /* ==========================================
     VIDORA — FUTURISTIC SOCIAL PLATFORM
     Supabase JavaScript v2
     ========================================== */

  const SUPABASE_URL =
    "https://htnrqgzxkfktwoioscjr.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_JT5rBfXYSX3-3_zyC2cazQ_YXg_ih_h";

  if (!window.supabase) {
    console.error("Vidora: Supabase JS v2 is missing.");
    return;
  }

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const $ = id => document.getElementById(id);

  const state = {
    user: null,
    profile: null,
    feed: [],
    stories: [],
    currentChat: null,
    subscriptions: [],
    avatar: "skye",
    selectedMedia: null,
    recognition: null,
    listening: false,
    assistantName: "Skye",
    timers: [],
    editorFile: null,
    editorFilter: "none"
  };

  /* ==========================================
     VIDORA AVATAR LIBRARY
     ========================================== */

  const AVATARS = [
    "zeno", "zara", "vexa", "skye", "sage",
    "rex", "pixel", "onyx", "orion", "nova",
    "nia", "neo", "luna", "kairo", "kai",
    "jett", "ivy", "blaze", "axel", "aria"
  ];

  const avatarPath = name => `avatars/${name}.png`;

  function selectedAvatar() {
    const saved = state.profile?.avatar_url || "";

    if (saved && !saved.startsWith("avatars/")) {
      return saved;
    }

    const name = saved.startsWith("avatars/")
      ? saved.split("/").pop().replace(/\.png$/i, "")
      : state.avatar;

    return avatarPath(AVATARS.includes(name) ? name : "skye");
  }

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function displayName(profile = state.profile) {
    return profile?.display_name ||
      profile?.username ||
      state.user?.email?.split("@")[0] ||
      "Vidora User";
  }

  function username(profile = state.profile) {
    return profile?.username || "vidora_user";
  }

  function avatarURL(profile = {}) {
    return profile.avatar_url || "";
  }

  function initials(profile = {}) {
    return displayName(profile)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0] || "")
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

  function status(id, message, error = false) {
    const element = $(id);

    if (!element) return;

    element.textContent = message;
    element.style.color = error ? "#ff6b9d" : "";
  }

  function showMessage(message) {
    let toast = $("vidoraToast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "vidoraToast";

      Object.assign(toast.style, {
        position: "fixed",
        left: "50%",
        bottom: "90px",
        transform: "translateX(-50%)",
        zIndex: "999999",
        maxWidth: "90%",
        padding: "12px 18px",
        borderRadius: "14px",
        background: "#19152c",
        color: "#fff",
        border: "1px solid #8b5cf6",
        boxShadow: "0 0 24px #8b5cf644",
        textAlign: "center",
        fontSize: "14px"
      });

      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.hidden = false;

    clearTimeout(toast._timer);

    toast._timer = setTimeout(() => {
      toast.hidden = true;
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

  /* ==========================================
     SAFE OPTIONAL UI CREATION
     ========================================== */

  function ensurePanel(id, title, description = "") {
    let panel = $(id);

    if (panel) return panel;

    const host = $("appShell") || document.body;

    panel = document.createElement("section");
    panel.id = id;
    panel.className = "view vidora-generated-view";
    panel.hidden = true;

    panel.innerHTML = `
      <div class="vidora-feature-panel">
        <h2>${escapeHTML(title)}</h2>
        <p>${escapeHTML(description)}</p>
        <div id="${id}Content"></div>
      </div>
    `;

    host.appendChild(panel);

    return panel;
  }

  function ensureStyles() {
    if ($("vidoraGeneratedStyles")) return;

    const style = document.createElement("style");
    style.id = "vidoraGeneratedStyles";

    style.textContent = `
      .vidora-generated-view {
        padding: 18px;
        min-height: 60vh;
      }

      .vidora-feature-panel {
        max-width: 900px;
        margin: 0 auto;
        padding: 20px;
        border-radius: 22px;
        border: 1px solid #8b5cf655;
        background: linear-gradient(145deg,#11111a,#171328);
        color: #fff;
        box-shadow: 0 10px 40px #0004;
      }

      .vidora-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill,minmax(115px,1fr));
        gap: 12px;
        margin-top: 18px;
      }

      .vidora-avatar-card {
        padding: 12px 8px;
        border-radius: 16px;
        background: #191925;
        color: white;
        border: 1px solid #8b5cf655;
        cursor: pointer;
        text-align: center;
      }

      .vidora-avatar-card img {
        display: block;
        width: 78px;
        height: 78px;
        object-fit: cover;
        border-radius: 50%;
        margin: 0 auto 8px;
      }

      .vidora-avatar-card.selected {
        border-color: #ff2d75;
        box-shadow: 0 0 18px #8b5cf655;
      }

      .vidora-tool-button,
      .vidora-feature-panel button {
        padding: 10px 14px;
        margin: 4px;
        border: 1px solid #8b5cf6;
        border-radius: 12px;
        color: #fff;
        background: #211a39;
        cursor: pointer;
      }

      .vidora-feature-panel input,
      .vidora-feature-panel select,
      .vidora-feature-panel textarea {
        box-sizing: border-box;
        width: 100%;
        margin: 8px 0;
        padding: 12px;
        border: 1px solid #8b5cf655;
        border-radius: 12px;
        background: #11111a;
        color: white;
      }

      .vidora-story {
        width: 105px;
        min-width: 105px;
        padding: 8px;
        text-align: center;
      }

      .vidora-story img,
      .vidora-story video {
        width: 76px;
        height: 76px;
        object-fit: cover;
        border: 2px solid #ff2d75;
        border-radius: 50%;
      }

      .vidora-story-row {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        padding: 10px 0;
      }

      .vidora-assistant-avatar {
        display: block;
        width: 120px;
        height: 120px;
        object-fit: cover;
        border-radius: 50%;
        margin: 12px auto;
        box-shadow: 0 0 28px #8b5cf655;
      }

      .vidora-editor-preview {
        display: block;
        width: 100%;
        max-height: 420px;
        object-fit: contain;
        border-radius: 16px;
        margin: 14px 0;
        background: #08080d;
      }

      .vidora-chat-message {
        padding: 10px 14px;
        border-radius: 15px;
        background: #211a39;
        margin: 8px 0;
        overflow-wrap: anywhere;
      }

      .vidora-chat-message.mine {
        background: #40266e;
        margin-left: 12%;
      }

      .vidora-muted {
        opacity: .72;
        font-size: .9rem;
      }
    `;

    document.head.appendChild(style);
  }

  /* ==========================================
     NAVIGATION
     ========================================== */

  function showView(viewId) {
    const views = document.querySelectorAll(
      "#appShell .view, #appShell [data-app-view]"
    );

    views.forEach(view => {
      const matches =
        view.id === viewId ||
        view.dataset.appView === viewId;

      view.hidden = !matches;
      view.classList.toggle("active", matches);
      view.setAttribute("aria-hidden", String(!matches));
    });

    document.querySelectorAll(".nav-button").forEach(button => {
      const active = button.dataset.view === viewId;

      button.classList.toggle("active", active);

      if (active) {
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
    if (viewId === "storiesView") loadStories();
  }

  function showAuth() {
    if ($("authScreen")) $("authScreen").hidden = false;
    if ($("appShell")) $("appShell").hidden = true;
  }

  function showApp() {
    if ($("authScreen")) $("authScreen").hidden = true;
    if ($("appShell")) $("appShell").hidden = false;

    updateGreeting();
    showView("homeView");
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-view]");

    if (!button) return;

    const view = button.dataset.view;

    if (!state.user) {
      showAuth();
      return;
    }

    showView(view);
  });

  /* ==========================================
     AUTHENTICATION
     ========================================== */

  async function getProfile(userId) {
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Profile lookup:", error);
      return null;
    }

    return data;
  }

  async function ensureProfile(user, extra = {}) {
    let profile = await getProfile(user.id);

    if (!profile) {
      const fallback = user.email?.split("@")[0] || "vidora_user";

      const desiredUsername =
        extra.username ||
        user.user_metadata?.username ||
        fallback;

      const { error } = await db
        .from("profiles")
        .upsert({
          id: user.id,
          username: desiredUsername,
          display_name:
            extra.display_name ||
            user.user_metadata?.display_name ||
            desiredUsername,
          avatar_url:
            extra.avatar_url ||
            user.user_metadata?.avatar_url ||
            "",
          bio: extra.bio || user.user_metadata?.bio || ""
        }, {
          onConflict: "id"
        });

      if (error) {
        console.warn("Profile creation:", error.message);
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
      status("authMessage", error.message || "Login failed.", true);
    } finally {
      setBusy(button, false);
    }
  }

  async function signup() {
    const email =
      $("authEmail")?.value.trim() ||
      $("loginEmail")?.value.trim();

    const password =
      $("authPassword")?.value ||
      $("loginPassword")?.value;

    const desiredUsername = $("authUsername")?.value.trim();

    const name =
      $("authDisplayName")?.value.trim() ||
      desiredUsername;

    const bio = $("authBio")?.value.trim() || "";
    const country = $("signupCountry")?.value || "";
    const language = $("signupLanguage")?.value || "en";

    if (!email || !password || !desiredUsername) {
      status(
        "authMessage",
        "Enter a username, email, and password.",
        true
      );
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,24}$/.test(desiredUsername)) {
      status(
        "authMessage",
        "Username must contain 3–24 letters, numbers, or underscores.",
        true
      );
      return;
    }

    const terms = $("authTerms");

    if (terms && !terms.checked) {
      status("authMessage", "Please accept the terms.", true);
      return;
    }

    try {
      setBusy($("signupNext"), true, "Creating account...");

      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: desiredUsername,
            display_name: name,
            bio,
            country,
            language
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
          "Account created. Confirm your email, then sign in."
        );

        showLoginForm();
      }
    } catch (error) {
      status("authMessage", error.message || "Signup failed.", true);
    } finally {
      setBusy($("signupNext"), false);
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
      loadInbox(),
      loadStories()
    ]);

    setupRealtime();
    announcePendingActivity();
  }

  async function logout() {
    for (const channel of state.subscriptions) {
      try {
        await db.removeChannel(channel);
      } catch (_) {}
    }

    state.subscriptions = [];

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    try {
      await db.auth.signOut();
    } catch (error) {
      console.error(error);
    }

    state.user = null;
    state.profile = null;
    state.currentChat = null;

    showAuth();
  }

  /* ==========================================
     COUNTRY AND LANGUAGE
     ========================================== */

  const COUNTRIES = [
    ["NG", "Nigeria"],
    ["GH", "Ghana"],
    ["KE", "Kenya"],
    ["ZA", "South Africa"],
    ["UG", "Uganda"],
    ["TZ", "Tanzania"],
    ["US", "United States"],
    ["GB", "United Kingdom"],
    ["CA", "Canada"],
    ["IN", "India"],
    ["PK", "Pakistan"],
    ["BD", "Bangladesh"],
    ["PH", "Philippines"],
    ["AU", "Australia"],
    ["BR", "Brazil"],
    ["FR", "France"],
    ["DE", "Germany"],
    ["ES", "Spain"],
    ["MX", "Mexico"],
    ["JP", "Japan"]
  ];

  const LANGUAGES = [
    ["en", "English"],
    ["fr", "French"],
    ["es", "Spanish"],
    ["pt", "Portuguese"],
    ["de", "German"],
    ["ar", "Arabic"],
    ["ha", "Hausa"],
    ["yo", "Yoruba"],
    ["ig", "Igbo"],
    ["sw", "Swahili"],
    ["hi", "Hindi"],
    ["ur", "Urdu"],
    ["zh", "Chinese"],
    ["ja", "Japanese"]
  ];

  function populateSelect(id, items, placeholder) {
    const select = $(id);

    if (!select || select.tagName !== "SELECT") return;

    if (select.options.length > 0) return;

    const first = document.createElement("option");
    first.value = "";
    first.textContent = placeholder;
    select.appendChild(first);

    items.forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
  }

  function setupRegistrationOptions() {
    populateSelect("signupCountry", COUNTRIES, "Choose your country");
    populateSelect("signupLanguage", LANGUAGES, "Choose your language");
  }

  /* ==========================================
     AVATAR SELECTOR AND CUSTOM AVATAR
     ========================================== */

  function avatarMarkup(profile = {}, extraClass = "") {
    const source = avatarURL(profile);

    if (source) {
      return `
        <img class="mini-avatar ${extraClass}"
             src="${escapeHTML(source)}"
             alt="${escapeHTML(displayName(profile))}"
             loading="lazy">
      `;
    }

    const avatarName = AVATARS.includes(state.avatar)
      ? state.avatar
      : "skye";

    return `
      <img class="mini-avatar ${extraClass}"
           src="${escapeHTML(avatarPath(avatarName))}"
           alt="${escapeHTML(avatarName)}"
           loading="lazy"
           onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('span'),{className:'mini-avatar avatar-fallback',textContent:'${escapeHTML(initials(profile))}'}))">
    `;
  }

  function openAvatarStudio() {
    ensureStyles();

    let panel = $("avatarStudioView");

    if (!panel) {
      panel = ensurePanel(
        "avatarStudioView",
        "Vidora Avatar Studio",
        "Choose your Vidora avatar, upload a profile photo, or create a custom avatar."
      );

      const content = $("avatarStudioViewContent");

      content.innerHTML = `
        <div class="vidora-grid" id="vidoraAvatarGrid"></div>

        <h3>Upload your profile photo</h3>
        <input id="vidoraProfileUpload"
               type="file"
               accept="image/*">

        <button id="vidoraUploadProfileBtn" type="button">
          Upload profile photo
        </button>

        <h3>Create a custom avatar</h3>
        <p class="vidora-muted">
          Build a basic avatar from your chosen colors and appearance.
          This does not require a paid avatar service.
        </p>

        <label>Avatar background</label>
        <input id="customAvatarColor"
               type="color"
               value="#8b5cf6">

        <label>Display name</label>
        <input id="customAvatarLabel"
               maxlength="30"
               placeholder="Your avatar name">

        <button id="createCustomAvatarBtn" type="button">
          Create my avatar
        </button>

        <div id="customAvatarPreview"></div>
        <p id="avatarStudioStatus" role="status"></p>
      `;

      content.addEventListener("click", async event => {
        const card = event.target.closest("[data-avatar-name]");

        if (card) {
          await chooseAvatar(card.dataset.avatarName);
        }
      });

      $("vidoraUploadProfileBtn").addEventListener(
        "click",
        uploadProfilePhoto
      );

      $("createCustomAvatarBtn").addEventListener(
        "click",
        createCustomAvatar
      );
    }

    renderAvatarGrid();
    showView("avatarStudioView");
  }

  function renderAvatarGrid() {
    const grid = $("vidoraAvatarGrid");

    if (!grid) return;

    grid.innerHTML = AVATARS.map(name => `
      <button type="button"
              class="vidora-avatar-card ${state.avatar === name ? "selected" : ""}"
              data-avatar-name="${name}">
        <img src="${escapeHTML(avatarPath(name))}"
             alt="${escapeHTML(name)}"
             loading="lazy">
        <strong>${escapeHTML(name)}</strong>
      </button>
    `).join("");
  }

  async function chooseAvatar(name) {
    if (!AVATARS.includes(name)) return;

    state.avatar = name;

    if (state.user) {
      const { error } = await db
        .from("profiles")
        .update({ avatar_url: avatarPath(name) })
        .eq("id", state.user.id);

      if (error) {
        status(
          "avatarStudioStatus",
          "Avatar selected locally. Saving failed: " + error.message,
          true
        );

        return;
      }

      state.profile = await getProfile(state.user.id);
    }

    renderAvatarGrid();
    updateGreeting();

    status("avatarStudioStatus", `${name} selected successfully.`);
    showMessage(`${name} is now your Vidora avatar.`);
  }

  async function uploadProfilePhoto() {
    if (!state.user) return;

    const file = $("vidoraProfileUpload")?.files?.[0];

    if (!file) {
      showMessage("Choose a profile photo first.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      showMessage("Please choose an image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage("Profile photos must be under 5 MB.");
      return;
    }

    try {
      const extension = file.name.split(".").pop().replace(/[^a-zA-Z0-9]/g, "");

      const path =
        `${state.user.id}/profile_${Date.now()}.${extension}`;

      const { data, error } = await db.storage
        .from("media")
        .upload(path, file, {
          upsert: true,
          contentType: file.type
        });

      if (error) throw error;

      const { data: publicData } = db.storage
        .from("media")
        .getPublicUrl(data.path);

      const { error: updateError } = await db
        .from("profiles")
        .update({ avatar_url: publicData.publicUrl })
        .eq("id", state.user.id);

      if (updateError) throw updateError;

      state.profile = await getProfile(state.user.id);

      status("avatarStudioStatus", "Profile photo updated.");
      showMessage("Your profile photo is now updated.");
    } catch (error) {
      status(
        "avatarStudioStatus",
        "Upload failed: " + error.message,
        true
      );
    }
  }

  async function createCustomAvatar() {
    const color = $("customAvatarColor")?.value || "#8b5cf6";
    const label = $("customAvatarLabel")?.value.trim() || "My Avatar";

    const safeLabel = escapeHTML(label);

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
        <defs>
          <linearGradient id="g">
            <stop offset="0%" stop-color="${color}"/>
            <stop offset="100%" stop-color="#11111a"/>
          </linearGradient>
        </defs>
        <rect width="400" height="400" rx="200" fill="url(#g)"/>
        <circle cx="200" cy="145" r="70" fill="#f1d4c1"/>
        <path d="M65 380 Q70 220 200 230 Q330 220 335 380"
              fill="#191925" stroke="#fff" stroke-opacity=".3" stroke-width="8"/>
        <text x="200" y="350" font-size="28" fill="white"
              text-anchor="middle">${safeLabel}</text>
      </svg>
    `;

    const blob = new Blob([svg], {
      type: "image/svg+xml"
    });

    const url = URL.createObjectURL(blob);

    const preview = $("customAvatarPreview");

    if (preview) {
      preview.innerHTML = "";

      const image = document.createElement("img");
      image.src = url;
      image.alt = "Your custom avatar";
      image.width = 140;
      image.height = 140;
      image.style.borderRadius = "50%";

      preview.appendChild(image);
    }

    /*
     * This creates a basic custom SVG avatar.
     * Persistent profile saving is handled by the profile
     * upload/storage workflow when the user uploads an image.
     */
    showMessage("Custom avatar created! Save it as an image to use it permanently.");

    const download = document.createElement("a");
    download.href = url;
    download.download = "vidora-custom-avatar.svg";
    download.textContent = "Download your custom avatar";

    if (preview) preview.appendChild(download);
  }

  /* ==========================================
     PROFILE
     ========================================== */

  async function saveProfile() {
    if (!state.user) return;

    const updates = {};

    const name = $("editDisplayName")?.value.trim();
    const bio = $("editBio")?.value.trim();

    if (name) updates.display_name = name;
    if (bio !== undefined) updates.bio = bio;

    if (!Object.keys(updates).length) return;

    const { error } = await db
      .from("profiles")
      .update(updates)
      .eq("id", state.user.id);

    if (error) {
      showMessage("Profile update failed: " + error.message);
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
        avatar.src = avatarURL(profile) || selectedAvatar();
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
      console.error(error);
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

    if (!posts?.length) {
      container.innerHTML = "<p>You haven't published anything yet.</p>";
      return;
    }

    container.innerHTML = posts.map(post => `
      <article class="profile-post">
        ${
          post.media_type === "video"
            ? `<video src="${escapeHTML(post.media_url)}" controls playsinline></video>`
            : `<img src="${escapeHTML(post.media_url)}" alt="Your post">`
        }

        <p>${escapeHTML(post.caption || "")}</p>

        <button type="button"
                data-delete-post="${escapeHTML(post.id)}">
          Delete post
        </button>
      </article>
    `).join("");
  }

  /* ==========================================
     FEED
     ========================================== */

  async function loadFeed() {
    if (!state.user) return;

    const container = $("feed");

    if (!container) return;

    container.innerHTML = "<p>Loading Vidora...</p>";

    const { data: posts, error } = await db
      .from("posts")
      .select(`
        id,user_id,media_url,media_type,caption,created_at,
        profiles:user_id(id,username,display_name,avatar_url,bio)
      `)
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      container.textContent = "Couldn't load feed: " + error.message;
      return;
    }

    state.feed = posts || [];

    if (!state.feed.length) {
      container.innerHTML =
        "<p class='empty-state'>No posts yet. Be the first to publish!</p>";
      return;
    }

    const ids = state.feed.map(post => post.id);

    const { data: likes } = await db
      .from("likes")
      .select("post_id,user_id")
      .in("post_id", ids);

    const { data: comments } = await db
      .from("comments")
      .select("post_id")
      .in("post_id", ids);

    const likesMap = {};
    const commentsMap = {};

    (likes || []).forEach(like => {
      likesMap[like.post_id] ||= [];
      likesMap[like.post_id].push(like);
    });

    (comments || []).forEach(comment => {
      commentsMap[comment.post_id] =
        (commentsMap[comment.post_id] || 0) + 1;
    });

    container.innerHTML = state.feed.map(post => {
      const profile = post.profiles || {};
      const postLikes = likesMap[post.id] || [];
      const liked = postLikes.some(like =>
        like.user_id === state.user.id
      );

      const own = post.user_id === state.user.id;

      const media = post.media_type === "video"
        ? `<video class="post-media" src="${escapeHTML(post.media_url)}" controls playsinline preload="metadata"></video>`
        : `<img class="post-media" src="${escapeHTML(post.media_url)}" alt="Vidora post" loading="lazy">`;

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
              own
                ? `<button type="button" data-delete-post="${escapeHTML(post.id)}">Delete</button>`
                : `<button type="button" data-follow-user="${escapeHTML(post.user_id)}">Follow</button>`
            }
          </header>

          ${post.caption ? `<p class="post-caption">${escapeHTML(post.caption)}</p>` : ""}

          <div class="post-media-wrap">${media}</div>

          <footer class="post-actions">
            <button type="button"
                    data-like-post="${escapeHTML(post.id)}"
                    class="like-button ${liked ? "liked" : ""}">
              ${liked ? "♥ Liked" : "♡ Like"} · ${postLikes.length}
            </button>

            <button type="button"
                    data-comment-post="${escapeHTML(post.id)}">
              💬 Comment · ${commentsMap[post.id] || 0}
            </button>

            <button type="button"
                    data-share-post="${escapeHTML(post.id)}">
              ↗ Share
            </button>
          </footer>

          <div class="comment-area"
               id="comments-${escapeHTML(post.id)}"
               hidden>
            <div class="comment-list"></div>

            <form data-comment-form="${escapeHTML(post.id)}">
              <input name="content"
                     maxlength="500"
                     placeholder="Write a comment..."
                     required>
              <button type="submit">Send</button>
            </form>
          </div>
        </article>
      `;
    }).join("");
  }

  /* ==========================================
     CREATE POSTS
     ========================================== */

  async function publishPost(event) {
    event.preventDefault();

    if (!state.user) return showAuth();

    const file = $("createFile")?.files?.[0];
    const caption = $("createCaption")?.value.trim() || "";
    const button = $("publishBtn");

    if (!file) {
      status("createMessage", "Choose a photo or video.", true);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      status("createMessage", "Maximum upload size is 50 MB.", true);
      return;
    }

    if (!file.type.startsWith("image/") &&
        !file.type.startsWith("video/")) {
      status("createMessage", "Choose an image or video.", true);
      return;
    }

    try {
      setBusy(button, true, "Uploading...");

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

      const path = `${state.user.id}/${Date.now()}_${safeName}`;

      const { data: uploaded, error: uploadError } = await db.storage
        .from("media")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = db.storage
        .from("media")
        .getPublicUrl(uploaded.path);

      const { error } = await db
        .from("posts")
        .insert({
          user_id: state.user.id,
          media_url: publicData.publicUrl,
          media_type: file.type.startsWith("video/")
            ? "video"
            : "image",
          caption
        });

      if (error) throw error;

      $("createFile").value = "";
      $("createCaption").value = "";

      status("createMessage", "Published successfully!");
      showMessage("Your post is now on Vidora!");

      showView("homeView");

      await loadFeed();
      await loadProfile();
    } catch (error) {
      console.error(error);

      status(
        "createMessage",
        "Upload failed: " + error.message,
        true
      );
    } finally {
      setBusy(button, false);
    }
  }

  /* ==========================================
     LIKES AND COMMENTS
     ========================================== */

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
      showMessage("Like failed: " + error.message);
    } finally {
      button.disabled = false;
    }
  }

  async function loadComments(postId) {
    const area = $(`comments-${postId}`);
    const list = area?.querySelector(".comment-list");

    if (!list) return;

    list.textContent = "Loading comments...";

    const { data, error } = await db
      .from("comments")
      .select(`
        id,user_id,content,created_at,
        profiles:user_id(username,display_name,avatar_url)
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

    list.innerHTML = data.map(comment => `
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

    if (!content || content.length > 500) return;

    const { error } = await db
      .from("comments")
      .insert({
        post_id: postId,
        user_id: state.user.id,
        content
      });

    if (error) {
      showMessage("Comment failed: " + error.message);
      return;
    }

    input.value = "";

    await loadComments(postId);
    await loadFeed();
  }

  async function deleteOwnPost(postId) {
    if (!confirm("Delete this post?")) return;

    const { error } = await db
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", state.user.id);

    if (error) {
      showMessage("Delete failed: " + error.message);
      return;
    }

    showMessage("Post deleted.");

    await loadFeed();
    await loadProfile();
  }

  /* ==========================================
     FOLLOWING AND DISCOVER
     ========================================== */

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

        showMessage("Unfollowed.");
      } else {
        const { error } = await db
          .from("follows")
          .insert({
            follower_id: state.user.id,
            following_id: targetId
          });

        if (error) throw error;

        showMessage("Following!");
      }

      await loadDiscover();
      await loadFeed();
    } catch (error) {
      showMessage("Follow failed: " + error.message);
    } finally {
      if (button) button.disabled = false;
    }
  }

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
      const term = searchTerm.trim().replace(/[%_,()]/g, "");

      query = query.or(
        `username.ilike.%${term}%,display_name.ilike.%${term}%`
      );
    }

    const { data: profiles, error } = await query;

    if (error) {
      container.textContent = "Discover failed: " + error.message;
      return;
    }

    if (!profiles?.length) {
      container.textContent = "No creators found.";
      return;
    }

    const { data: following } = await db
      .from("follows")
      .select("following_id")
      .eq("follower_id", state.user.id);

    const followingIds = new Set(
      (following || []).map(item => item.following_id)
    );

    container.innerHTML = profiles.map(profile => `
      <article class="person-row user-card">
        ${avatarMarkup(profile)}

        <div class="person-info">
          <strong>${escapeHTML(displayName(profile))}</strong>
          <small>@${escapeHTML(username(profile))}</small>
          <p>${escapeHTML(profile.bio || "")}</p>
        </div>

        <button type="button"
                data-follow-user="${escapeHTML(profile.id)}">
          ${followingIds.has(profile.id) ? "Unfollow" : "Follow"}
        </button>

        <button type="button"
                data-open-chat="${escapeHTML(profile.id)}">
          Message
        </button>
      </article>
    `).join("");
  }

  /* ==========================================
     STORIES
     ========================================== */

  function ensureStoriesView() {
    if ($("storiesView")) return;

    ensurePanel(
      "storiesView",
      "Vidora Stories",
      "Share moments with your followers."
    );

    $("storiesViewContent").innerHTML = `
      <form id="storyForm">
        <label for="storyFile">Photo or video</label>
        <input id="storyFile" type="file" accept="image/*,video/*" required>

        <label for="storyCaption">Caption</label>
        <input id="storyCaption" maxlength="250" placeholder="Add a story caption">

        <label for="storyDuration">Story duration</label>
        <select id="storyDuration">
          <option value="24">24 hours</option>
        </select>

        <button type="submit">Publish story</button>
      </form>

      <div id="storiesList" class="vidora-story-row"></div>
      <p id="storyStatus" role="status"></p>
    `;

    $("storyForm").addEventListener("submit", publishStory);
  }

  async function loadStories() {
    if (!state.user) return;

    ensureStoriesView();

    const container = $("storiesList");

    if (!container) return;

    const { data, error } = await db
      .from("stories")
      .select(`
        id,user_id,media_url,media_type,caption,created_at,expires_at,
        profiles:user_id(username,display_name,avatar_url)
      `)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) {
      container.innerHTML =
        "<p>Stories database setup is required before stories can load.</p>";

      return;
    }

    state.stories = data || [];

    container.innerHTML = state.stories.map(story => `
      <button type="button"
              class="vidora-story"
              data-open-story="${escapeHTML(story.id)}">
        ${avatarMarkup(story.profiles || {})}
        <span>${escapeHTML(displayName(story.profiles || {}))}</span>
        <small>${escapeHTML(relativeTime(story.created_at))}</small>
      </button>
    `).join("");
  }

  async function publishStory(event) {
    event.preventDefault();

    if (!state.user) return;

    const file = $("storyFile")?.files?.[0];
    const caption = $("storyCaption")?.value.trim() || "";

    if (!file) {
      status("storyStatus", "Choose a photo or video.", true);
      return;
    }

    if (!file.type.startsWith("image/") &&
        !file.type.startsWith("video/")) {
      status("storyStatus", "Choose a photo or video.", true);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      status("storyStatus", "Maximum file size is 50 MB.", true);
      return;
    }

    try {
      const path =
        `${state.user.id}/stories/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const { data: upload, error: uploadError } = await db.storage
        .from("media")
        .upload(path, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = db.storage
        .from("media")
        .getPublicUrl(upload.path);

      const { error } = await db.from("stories").insert({
        user_id: state.user.id,
        media_url: publicData.publicUrl,
        media_type: file.type.startsWith("video/") ? "video" : "image",
        caption,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

      if (error) throw error;

      $("storyForm").reset();

      status("storyStatus", "Story published!");
      await loadStories();
    } catch (error) {
      status("storyStatus", "Story failed: " + error.message, true);
    }
  }

  function openStory(storyId) {
    const story = state.stories.find(item => String(item.id) === String(storyId));

    if (!story) return;

    const overlay = document.createElement("div");

    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "999999",
      background: "#05040af5",
      display: "grid",
      placeItems: "center",
      padding: "20px"
    });

    const media = story.media_type === "video"
      ? `<video src="${escapeHTML(story.media_url)}" controls autoplay playsinline style="max-width:95%;max-height:75vh"></video>`
      : `<img src="${escapeHTML(story.media_url)}" alt="Story" style="max-width:95%;max-height:75vh;object-fit:contain">`;

    overlay.innerHTML = `
      <div style="text-align:center;color:white">
        <button type="button" id="closeStory">✕ Close</button>
        <p>${escapeHTML(story.caption || "")}</p>
        ${media}
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector("#closeStory").onclick = () => overlay.remove();

    overlay.addEventListener("click", event => {
      if (event.target === overlay) overlay.remove();
    });
  }

  /* ==========================================
     NOTIFICATIONS
     ========================================== */

  async function loadNotifications() {
    if (!state.user) return;

    const container = $("notificationList");

    if (!container) return;

    const { data, error } = await db
      .from("notifications")
      .select(`
        id,actor_id,type,message,post_id,created_at,
        profiles:actor_id(username,display_name,avatar_url)
      `)
      .eq("user_id", state.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      container.textContent = "Couldn't load notifications: " + error.message;
      return;
    }

    if (!data?.length) {
      container.textContent = "You're all caught up!";
      return;
    }

    container.innerHTML = data.map(item => `
      <article class="notification-row notification-card">
        ${avatarMarkup(item.profiles || {})}

        <div>
          <p>${escapeHTML(item.message || "New activity on Vidora.")}</p>
          <small>${escapeHTML(relativeTime(item.created_at))}</small>
        </div>

        <button type="button"
                data-read-notification="${escapeHTML(item.id)}">
          Read aloud
        </button>
      </article>
    `).join("");
  }

  async function createNotification(targetUserId, type, message, postId = null) {
    if (!state.user ||
        !targetUserId ||
        targetUserId === state.user.id) return;

    const { error } = await db.from("notifications").insert({
      user_id: targetUserId,
      actor_id: state.user.id,
      type,
      message,
      post_id: postId
    });

    if (error) console.warn("Notification:", error.message);
  }

  /* ==========================================
     MUTUAL FOLLOWING AND MESSAGES
     ========================================== */

  async function areMutualFollowers(otherId) {
    if (!state.user || !otherId) return false;

    const { data, error } = await db
      .from("follows")
      .select("follower_id,following_id")
      .or(
        `and(follower_id.eq.${state.user.id},following_id.eq.${otherId}),and(follower_id.eq.${otherId},following_id.eq.${state.user.id})`
      );

    if (error) return false;

    const mine = (data || []).some(item =>
      item.follower_id === state.user.id &&
      item.following_id === otherId
    );

    const theirs = (data || []).some(item =>
      item.follower_id === otherId &&
      item.following_id === state.user.id
    );

    return mine && theirs;
  }

  async function loadInbox() {
    if (!state.user) return;

    const container = $("inboxList");

    if (!container) return;

    const { data, error } = await db
      .from("messages")
      .select("id,sender_id,receiver_id,content,created_at")
      .or(
        `sender_id.eq.${state.user.id},receiver_id.eq.${state.user.id}`
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      container.textContent = "Couldn't load messages: " + error.message;
      return;
    }

    const people = new Map();

    (data || []).forEach(message => {
      const otherId = message.sender_id === state.user.id
        ? message.receiver_id
        : message.sender_id;

      if (!people.has(otherId)) people.set(otherId, message);
    });

    if (!people.size) {
      container.textContent = "No conversations yet.";
      return;
    }

    const ids = [...people.keys()];

    const { data: profiles } = await db
      .from("profiles")
      .select("id,username,display_name,avatar_url")
      .in("id", ids);

    const map = new Map((profiles || []).map(profile => [profile.id, profile]));

    container.innerHTML = ids.map(id => {
      const message = people.get(id);
      const profile = map.get(id) || {};

      return `
        <button type="button"
                class="inbox-row inbox-item"
                data-open-chat="${escapeHTML(id)}">
          ${avatarMarkup(profile)}
          <span>
            <strong>${escapeHTML(displayName(profile))}</strong>
            <small>${escapeHTML(message.content || "")}</small>
            <small>${escapeHTML(relativeTime(message.created_at))}</small>
          </span>
        </button>
      `;
    }).join("");
  }

  async function openChat(otherId) {
    if (!state.user || otherId === state.user.id) return;

    if (!(await areMutualFollowers(otherId))) {
      showMessage("Chat is available only between mutual followers.");
      return;
    }

    const { data: profile, error } = await db
      .from("profiles")
      .select("*")
      .eq("id", otherId)
      .maybeSingle();

    if (error || !profile) {
      showMessage("Couldn't open this profile.");
      return;
    }

    state.currentChat = {
      id: otherId,
      profile
    };

    setText("chatName", displayName(profile));
    setText("chatStatus", "Mutual followers");

    const panel = $("chatPanel");

    if (panel) panel.hidden = false;

    if ($("inboxLayout")) {
      $("inboxLayout").classList.add("has-chat");
    }

    if ($("inboxView")) {
      $("inboxView").classList.add("chat-open");
    }

    await loadMessages();
    setupMessageActions();
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
      container.textContent = "Couldn't load messages: " + error.message;
      return;
    }

    container.innerHTML = (data || []).map(message => {
      const mine = message.sender_id === state.user.id;

      return `
        <div class="chat-bubble ${mine ? "mine" : "theirs"}"
             data-message-id="${escapeHTML(message.id)}">

          <div class="bubble-content">${escapeHTML(message.content || "")}</div>

          <small>${escapeHTML(formatTime(message.created_at))}</small>

          <div class="message-actions">
            <button type="button"
                    data-reply-id="${escapeHTML(message.id)}">
              ↩ Reply
            </button>

            <button type="button"
                    data-react-id="${escapeHTML(message.id)}"
                    data-emoji="❤️">❤️</button>

            <button type="button"
                    data-react-id="${escapeHTML(message.id)}"
                    data-emoji="😂">😂</button>

            <button type="button"
                    data-react-id="${escapeHTML(message.id)}"
                    data-emoji="👍">👍</button>
          </div>
        </div>
      `;
    }).join("");

    container.scrollTop = container.scrollHeight;
  }

  let replyingToMessage = null;

  function setupMessageActions() {
    const container = $("chatMessages");

    if (!container || container.dataset.actionsReady) return;

    container.dataset.actionsReady = "true";

    container.addEventListener("click", async event => {
      const reply = event.target.closest("[data-reply-id]");
      const react = event.target.closest("[data-react-id]");

      if (reply) {
        const bubble = reply.closest(".chat-bubble");

        replyingToMessage = {
          id: reply.dataset.replyId,
          content: bubble?.querySelector(".bubble-content")?.textContent || ""
        };

        const input = $("messageInput");

        if (input) {
          input.placeholder = `Replying to: ${replyingToMessage.content.slice(0, 80)}`;
          input.focus();
        }

        return;
      }

      if (react) {
        showMessage(
          `Reaction ${react.dataset.emoji} selected. Message reaction storage will be connected in Supabase setup.`
        );
      }
    });
  }

  async function sendMessage(event) {
    event.preventDefault();

    if (!state.currentChat || !state.user) return;

    const input = $("messageInput");
    let content = input?.value.trim();

    if (!content) return;

    if (content.length > 2000) {
      showMessage("Messages can contain up to 2,000 characters.");
      return;
    }

    if (!(await areMutualFollowers(state.currentChat.id))) {
      showMessage("You must follow each other to chat.");
      return;
    }

    if (replyingToMessage) {
      content = `↩ ${replyingToMessage.content.slice(0, 100)}\n${content}`;
    }

    const { error } = await db.from("messages").insert({
      sender_id: state.user.id,
      receiver_id: state.currentChat.id,
      content
    });

    if (error) {
      showMessage("Message failed: " + error.message);
      return;
    }

    input.value = "";
    input.placeholder = "Write a message...";
    replyingToMessage = null;

    await loadMessages();
    await loadInbox();
  }

  /* ==========================================
     SHARE POSTS
     ========================================== */

  async function sharePost(postId) {
    const post = state.feed.find(item => String(item.id) === String(postId));

    const shareURL = new URL(window.location.href);
    shareURL.searchParams.set("post", postId);

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Vidora",
          text: post?.caption || "Check out this post on Vidora!",
          url: shareURL.toString()
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareURL.toString());
        showMessage("Post link copied!");
      } else {
        showMessage("Copy the page address to share this post.");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        showMessage("Couldn't share this post.");
      }
    }
  }

  /* ==========================================
     VIDORA VOICE ASSISTANT
     ========================================== */

  function assistantName() {
    return state.profile?.assistant_name ||
      localStorage.getItem("vidoraAssistantName") ||
      state.avatar ||
      "Skye";
  }

  function updateGreeting() {
    const message = `${greeting()}, ${displayName()}!`;

    setText("greetingText", message);
    setText("greetingTextAssistant", message);
  }

  function speak(message) {
    if (!("speechSynthesis" in window)) {
      showMessage(message);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);

    utterance.rate = 1;
    utterance.pitch = 1.05;

    const language = state.profile?.language || "en";

    utterance.lang = language === "en" ? "en-NG" : language;

    window.speechSynthesis.speak(utterance);
  }

  function assistantHelp() {
    const message =
      `Hello ${displayName()}! I'm ${assistantName()}, your Vidora assistant. ` +
      "I can help you navigate Vidora, explain features, and read messages aloud. " +
      "For answers to general questions, an AI service will need to be connected.";

    setText("assistantReply", message);
    setAvatarMood("Ready to help!");

    speak(message);
  }

  function setAvatarMood(mood) {
    setText("avatarMood", mood);
  }

  function waveAvatar() {
    setAvatarMood("Waving hello!");
    speak(`Hello ${displayName()}! ${greeting()}! Welcome to Vidora.`);
  }

  function danceAvatar() {
    setAvatarMood("Dancing!");

    const avatar = $("avatarCanvas");

    if (avatar) {
      avatar.classList.remove("avatar-dance");
      void avatar.offsetWidth;
      avatar.classList.add("avatar-dance");
    }
  }

  function changeAvatarColor() {
    const colors = ["#8b5cf6", "#00d9ff", "#ff3d9a", "#32e6a1", "#ffbd59"];

    const color = colors[Math.floor(Math.random() * colors.length)];

    document.documentElement.style.setProperty("--primary", color);
    document.documentElement.style.setProperty("--purple", color);

    setAvatarMood("New look unlocked!");
  }

  function startVoiceAssistant() {
    const Recognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!Recognition) {
      showMessage("Voice recognition isn't supported in this browser. Try a supported browser.");
      return;
    }

    if (state.listening && state.recognition) {
      state.recognition.stop();
      state.listening = false;
      return;
    }

    const recognition = new Recognition();

    recognition.lang = state.profile?.language || "en-NG";
    recognition.interimResults = false;
    recognition.continuous = false;

    state.recognition = recognition;
    state.listening = true;

    setAvatarMood("Listening...");

    recognition.onresult = event => {
      const transcript = event.results[0][0].transcript.trim();

      setText("assistantTranscript", transcript);

      handleAssistantQuestion(transcript);
    };

    recognition.onerror = event => {
      setAvatarMood("Voice input unavailable");
      showMessage("Voice recognition error: " + event.error);
    };

    recognition.onend = () => {
      state.listening = false;
      setAvatarMood("Ready to listen");
    };

    recognition.start();
  }

  function handleAssistantQuestion(question) {
    const normalized = question.toLowerCase();
    let answer;

    if (/\b(hello|hi|hey)\b/.test(normalized)) {
      answer = `Hello ${displayName()}! How can I help you today?`;
    } else if (normalized.includes("time")) {
      answer = `The time is ${new Date().toLocaleTimeString()}.`;
    } else if (normalized.includes("date") || normalized.includes("today")) {
      answer = `Today is ${new Date().toLocaleDateString()}.`;
    } else if (normalized.includes("feed") || normalized.includes("home")) {
      showView("homeView");
      answer = "I've opened your Vidora home feed.";
    } else if (normalized.includes("discover") || normalized.includes("search")) {
      showView("discoverView");
      answer = "I've opened Discover.";
    } else if (normalized.includes("profile")) {
      showView("profileView");
      answer = "I've opened your profile.";
    } else if (normalized.includes("story") || normalized.includes("stories")) {
      showView("storiesView");
      answer = "I've opened Vidora Stories.";
    } else if (normalized.includes("notification")) {
      showView("notificationsView");
      answer = "I've opened your notifications.";
    } else if (normalized.includes("message") || normalized.includes("inbox")) {
      showView("inboxView");
      answer = "I've opened your inbox.";
    } else if (normalized.includes("avatar")) {
      openAvatarStudio();
      answer = "I've opened Avatar Studio.";
    } else if (normalized.includes("read") && normalized.includes("message")) {
      readLatestMessage();
      answer = "I'll read your latest available message.";
    } else {
      answer =
        "I heard you say: " + question +
        ". I can answer general questions once an AI provider is connected. " +
        "For now, try asking me to open your feed, profile, stories, inbox, or notifications.";
    }

    setText("assistantReply", answer);
    speak(answer);
  }

  async function readLatestMessage() {
    if (!state.user) return;

    const { data, error } = await db
      .from("messages")
      .select("sender_id,receiver_id,content,created_at")
      .or(
        `sender_id.eq.${state.user.id},receiver_id.eq.${state.user.id}`
      )
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data?.length) {
      speak("You don't have any messages available to read.");
      return;
    }

    speak("Your latest message says: " + data[0].content);
  }

  async function announcePendingActivity() {
    if (!state.user) return;

    const { data } = await db
      .from("notifications")
      .select("message,created_at")
      .eq("user_id", state.user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (data?.length) {
      setText(
        "avatarMood",
        "You have a recent notification."
      );
    }
  }

  /* ==========================================
     NOTIFICATION READING
     ========================================== */

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-read-notification]");

    if (!button) return;

    const row = button.closest(".notification-row");
    const message = row?.querySelector("p")?.textContent;

    if (message) speak(message);
  });

  /* ==========================================
     VIDEO EDITOR AND FILTERS
     ========================================== */

  const VIDEO_FILTERS = [
    ["none", "Original"],
    ["grayscale(1)", "Black & White"],
    ["sepia(.8)", "Vintage"],
    ["saturate(1.8)", "Vivid"],
    ["contrast(1.3) saturate(1.2)", "Cinematic"],
    ["brightness(1.15) saturate(1.4)", "Glow"],
    ["hue-rotate(35deg) saturate(1.4)", "Neon"],
    ["blur(1px) saturate(1.2)", "Dream"]
  ];

  const MUSIC_CATEGORIES = [
    {
      title: "Popular Songs",
      description: "Discover songs for your videos."
    },
    {
      title: "Popular Beats",
      description: "Find beats and instrumentals."
    },
    {
      title: "Popular Funk",
      description: "Explore funk sounds."
    },
    {
      title: "Popular Drill",
      description: "Explore drill instrumentals."
    }
  ];

  function openEditor() {
    ensureStyles();

    if (!$("editorView")) {
      ensurePanel(
        "editorView",
        "Vidora Studio",
        "Edit your media with browser-based visual filters."
      );

      $("editorViewContent").innerHTML = `
        <input type="file"
               id="editorFile"
               accept="image/*,video/*">

        <div id="editorPreview"></div>

        <h3>Visual filters</h3>
        <div id="editorFilters"></div>

        <h3>Creative templates</h3>
        <div id="editorTemplates"></div>

        <h3>Discover music</h3>
        <div id="editorMusic"></div>

        <p class="vidora-muted">
          Music selections are discovery categories. Actual tracks require
          licensed audio sources. This editor does not export a rendered
          video with effects applied.
        </p>

        <button type="button" id="editorDownloadBtn">
          Download image with selected filter
        </button>

        <p id="editorStatus" role="status"></p>
      `;

      $("editorFile").addEventListener("change", previewEditorFile);

      $("editorFilters").innerHTML = VIDEO_FILTERS.map(([value, label]) => `
        <button type="button"
                data-editor-filter="${escapeHTML(value)}">
          ${escapeHTML(label)}
        </button>
      `).join("");

      $("editorTemplates").innerHTML = [
        "Neon Galaxy",
        "Classic Cinema",
        "Creator Intro",
        "Story Mode",
        "Futuristic Glow"
      ].map(name => `
        <button type="button"
                data-editor-template="${escapeHTML(name)}">
          ${escapeHTML(name)}
        </button>
      `).join("");

      $("editorMusic").innerHTML = MUSIC_CATEGORIES.map(item => `
        <article>
          <h4>${escapeHTML(item.title)}</h4>
          <p>${escapeHTML(item.description)}</p>
          <button type="button"
                  data-music-category="${escapeHTML(item.title)}">
            Explore
          </button>
        </article>
      `).join("");

      $("editorDownloadBtn").addEventListener("click", downloadEditedImage);
    }

    showView("editorView");
  }

  function previewEditorFile(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (state.editorFile) {
      URL.revokeObjectURL(state.editorFile);
    }

    state.editorFile = URL.createObjectURL(file);

    const container = $("editorPreview");

    container.innerHTML = "";

    const element = document.createElement(
      file.type.startsWith("video/") ? "video" : "img"
    );

    element.src = state.editorFile;
    element.className = "vidora-editor-preview";

    if (element.tagName === "VIDEO") {
      element.controls = true;
      element.playsInline = true;
    }

    element.style.filter = state.editorFilter;

    container.appendChild(element);
  }

  function applyEditorFilter(filter) {
    state.editorFilter = filter;

    const preview = $("editorPreview")?.firstElementChild;

    if (preview) preview.style.filter = filter;
  }

  async function downloadEditedImage() {
    const file = $("editorFile")?.files?.[0];

    if (!file || !file.type.startsWith("image/")) {
      status("editorStatus", "Choose an image to export.", true);
      return;
    }

    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext("2d");

      context.filter = state.editorFilter;
      context.drawImage(image, 0, 0);

      canvas.toBlob(blob => {
        if (!blob) {
          status("editorStatus", "Image export failed.", true);
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "vidora-edited-image.png";
        link.click();

        URL.revokeObjectURL(url);

        status("editorStatus", "Edited image downloaded.");
      }, "image/png");
    };

    image.onerror = () => {
      status("editorStatus", "Couldn't process this image.", true);
    };

    image.src = URL.createObjectURL(file);
  }

  /* ==========================================
     CASTING OVERLAY
     ========================================== */

  function openCast() {
    if ($("castOverlay")) $("castOverlay").hidden = false;

    status(
      "castStatus",
      "Presentation interface ready."
    );
  }

  function closeCast() {
    if ($("castOverlay")) $("castOverlay").hidden = true;
  }

  async function enterFullscreen() {
    const target = $("castPresentation") || document.documentElement;

    try {
      if (target.requestFullscreen) {
        await target.requestFullscreen();
      } else {
        showMessage("Fullscreen isn't supported.");
      }
    } catch {
      showMessage("Couldn't enter fullscreen.");
    }
  }

  /* ==========================================
     PUSH NOTIFICATIONS
     ========================================== */

  async function enablePush() {
    if (!state.user) return;

    if (!("serviceWorker" in navigator) ||
        !("PushManager" in window)) {
      status("pushStatus", "Push notifications aren't supported.", true);
      return;
    }

    showMessage(
      "Browser push requires a configured service worker and VAPID key. We'll configure this separately."
    );
  }

  /* ==========================================
     EVENT WIRING
     ========================================== */

  function bind(id, event, handler) {
    const element = $(id);

    if (element) {
      element.addEventListener(event, handler);
    }
  }

  function setupAuthButtons() {
    bind("authForm", "submit", handleAuth);

    bind("showSignup", "click", showSignupForm);
    bind("showLogin", "click", showLoginForm);

    bind("signupNext", "click", event => {
      event.preventDefault();
      signup();
    });

    bind("signupBack", "click", event => {
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

      if ($("inboxView")) {
        $("inboxView").classList.remove("chat-open");
      }

      if ($("inboxLayout")) {
        $("inboxLayout").classList.remove("has-chat");
      }

      loadInbox();
    });

    bind("assistantHelpBtn", "click", assistantHelp);
    bind("avatarWaveBtn", "click", waveAvatar);
    bind("avatarDanceBtn", "click", danceAvatar);
    bind("avatarColorBtn", "click", changeAvatarColor);

    bind("speakBtn", "click", () => {
      speak(`Hello ${displayName()}!`);
    });

    bind("castBtn", "click", openCast);
    bind("castClose", "click", closeCast);
    bind("castFullscreen", "click", enterFullscreen);
    bind("chatCastBtn", "click", openCast);

    bind("profileSaveBtn", "click", saveProfile);

    bind("avatarStudioBtn", "click", openAvatarStudio);
    bind("openAvatarStudio", "click", openAvatarStudio);
    bind("openEditorBtn", "click", openEditor);

    bind("voiceAssistantBtn", "click", startVoiceAssistant);
    bind("assistantMicBtn", "click", startVoiceAssistant);

    bind("storiesBtn", "click", () => {
      ensureStoriesView();
      showView("storiesView");
      loadStories();
    });
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

  /* ==========================================
     GLOBAL CLICK AND FORM HANDLERS
     ========================================== */

  document.addEventListener("click", async event => {
    const like = event.target.closest("[data-like-post]");
    const follow = event.target.closest("[data-follow-user]");
    const deleteButton = event.target.closest("[data-delete-post]");
    const commentButton = event.target.closest("[data-comment-post]");
    const chatButton = event.target.closest("[data-open-chat]");
    const shareButton = event.target.closest("[data-share-post]");
    const storyButton = event.target.closest("[data-open-story]");
    const filterButton = event.target.closest("[data-editor-filter]");
    const templateButton = event.target.closest("[data-editor-template]");
    const musicButton = event.target.closest("[data-music-category]");

    if (like) await toggleLike(like.dataset.likePost, like);

    if (follow) {
      await followUser(follow.dataset.followUser, follow);
    }

    if (deleteButton) {
      await deleteOwnPost(deleteButton.dataset.deletePost);
    }

    if (commentButton) {
      const area = $(`comments-${commentButton.dataset.commentPost}`);

      if (area) {
        area.hidden = !area.hidden;

        if (!area.hidden) {
          await loadComments(commentButton.dataset.commentPost);
        }
      }
    }

    if (chatButton) {
      await openChat(chatButton.dataset.openChat);
    }

    if (shareButton) {
      await sharePost(shareButton.dataset.sharePost);
    }

    if (storyButton) {
      openStory(storyButton.dataset.openStory);
    }

    if (filterButton) {
      applyEditorFilter(filterButton.dataset.editorFilter);
    }

    if (templateButton) {
      const name = templateButton.dataset.editorTemplate;

      const filters = {
        "Neon Galaxy": "saturate(1.6) contrast(1.2) hue-rotate(12deg)",
        "Classic Cinema": "sepia(.35) contrast(1.15)",
        "Creator Intro": "saturate(1.4) contrast(1.1)",
        "Story Mode": "brightness(1.08) saturate(1.3)",
        "Futuristic Glow": "saturate(1.7) hue-rotate(35deg)"
      };

      applyEditorFilter(filters[name] || "none");

      status("editorStatus", `${name} template applied to preview.`);
    }

    if (musicButton) {
      showMessage(
        `${musicButton.dataset.musicCategory}: connect a licensed music catalogue to browse and play real tracks.`
      );
    }
  });

  document.addEventListener("submit", async event => {
    const form = event.target.closest("[data-comment-form]");

    if (form) {
      event.preventDefault();
      await addComment(event, form.dataset.commentForm);
    }
  });

  /* ==========================================
     REALTIME
     ========================================== */

  function setupRealtime() {
    if (!state.user) return;

    const channelName = "vidora-live-" + state.user.id;

    if (state.subscriptions.some(channel => channel.topic?.includes(channelName))) {
      return;
    }

    const channel = db
      .channel(channelName)
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
        async payload => {
          if (
            state.currentChat &&
            payload.new.sender_id === state.currentChat.id
          ) {
            await loadMessages();
          }

          await loadInbox();

          showMessage("You have a new message!");

          if (document.visibilityState === "visible") {
            speak(`You have a new message, ${displayName()}.`);
          }
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
        async () => {
          await loadNotifications();

          showMessage("You have a new notification!");

          if (document.visibilityState === "visible") {
            speak(`You have a new notification, ${displayName()}.`);
          }
        }
      )
      .subscribe();

    state.subscriptions.push(channel);
  }

  /* ==========================================
     PARTICLE BACKGROUND
     ========================================== */

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
          radius: Math.random() * 1.8 + .4,
          speed: Math.random() * .35 + .08,
          drift: (Math.random() - .5) * .3
        });
      }
    }

    function draw() {
      context.clearRect(0, 0, width, height);

      particles.forEach(particle => {
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

        context.fillStyle = "rgba(139,92,246,.55)";
        context.fill();
      });

      requestAnimationFrame(draw);
    }

    resize();

    window.addEventListener("resize", resize);

    draw();
  }

  /* ==========================================
     INITIALIZATION
     ========================================== */

  let initialized = false;

  async function init() {
    if (initialized) return;

    initialized = true;

    ensureStyles();
    setupRegistrationOptions();
    ensureStoriesView();

    initParticles();
    setupAuthButtons();
    setupAppButtons();
    setupDiscoverSearch();

    db.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        state.user = session.user;

        setTimeout(async () => {
          await startSession(session.user);
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
    } else {
      showAuth();
    }
  }

  /* ==========================================
     PUBLIC VIDORA API
     ========================================== */

  window.Vidora = {
    loadFeed,
    loadDiscover,
    loadProfile,
    loadNotifications,
    loadInbox,
    loadMessages,
    loadStories,
    showView,
    logout,
    assistantHelp,
    speak,
    startVoiceAssistant,
    openAvatarStudio,
    openEditor,
    openChat
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})();
