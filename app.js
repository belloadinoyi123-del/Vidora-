/* =========================================================
   VIDORA - COMPLETE APP.JS (CLEAN VERSION)
   ========================================================= */
console.log("VIDORA APP.JS LOADED");

/* =========================================================
   1. SUPABASE CONFIGURATION
   ========================================================= */

const SUPABASE_URL = "https://htnrqgzxkfktwoioscjr.supabase.co";
const SUPABASE_KEY = "sb_publishable_JT5rBfXYSX3-3_zyC2cazQ_YXg_ih_h";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

/* =========================================================
   2. GLOBAL STATE
   ========================================================= */

let currentUser = null;
let searchTimer = null;
let appInitialized = false;
let feedLoading = false;
let interactiveAvatarEnabled =
  localStorage.getItem("vidoraInteractiveAvatar") === "true";

/* =========================================================
   3. SMALL HELPERS
   ========================================================= */

function getElement(id) {
  return document.getElementById(id);
}

function setMessage(id, message, success = false) {
  const element = getElement(id);
  if (!element) return;
  element.textContent = message;
  element.style.color = success ? "#4ade80" : "#ff6b6b";
}

function clearMessage(id) {
  const element = getElement(id);
  if (element) element.textContent = "";
}

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

function getFileExtension(file) {
  if (!file || !file.name) return "bin";
  const parts = file.name.split(".");
  if (parts.length < 2) return "bin";
  return parts.pop().toLowerCase();
}

function createSafeFileName(file) {
  const extension = getFileExtension(file);
  let id;
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    id = window.crypto.randomUUID();
  } else {
    id = Date.now().toString() + "-" + Math.random().toString(36).substring(2);
  }
  return id + "." + extension;
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

/* =========================================================
   4. VIDORA AVATAR SYSTEM
   ========================================================= */

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
  const saved = localStorage.getItem("vidoraSelectedAvatar");
  if (saved && VIDORA_AVATARS[saved]) return saved;
  return "nova";
}

function getVidoraAvatarInfo(name) {
  const key = String(name || "").toLowerCase().trim();
  return VIDORA_AVATARS[key] || VIDORA_AVATARS.nova;
}

function getVidoraAvatarImage(name) {
  return getVidoraAvatarInfo(name).image;
}

function selectVidoraAvatar(name) {
  const key = String(name || "").toLowerCase().trim();
  if (!VIDORA_AVATARS[key]) {
    console.warn("Unknown avatar:", name);
    return;
  }

  localStorage.setItem("vidoraSelectedAvatar", key);
  localStorage.setItem("vidoraAvatarMode", "preset");

  const hidden = document.getElementById("selectedVidoraAvatar");
  if (hidden) hidden.value = key;

  document.querySelectorAll(".vidoraAvatar").forEach(function (btn) {
    const btnKey = String(btn.dataset.avatar || "").toLowerCase();
    btn.classList.toggle("selected", btnKey === key);
  });

  const info = getVidoraAvatarInfo(key);
  updateAvatarPreview(info.image, info.name);

  const profileAvatar = document.getElementById("profileAvatar");
  if (profileAvatar) renderDefaultAvatar(profileAvatar, info.name);

  console.log("Avatar selected:", key);
}

function updateAvatarPreview(imageUrl, name) {
  const preview = document.getElementById("profileAvatarPreview");
  if (!preview) return;

  preview.innerHTML = "";
  const img = document.createElement("img");
  img.src = imageUrl;
  img.alt = name || "Avatar";
  img.className = "profileAvatarImage";
  img.onerror = function () {
    img.src = "./nova.png";
  };
  preview.appendChild(img);
}

function renderDefaultAvatar(container, displayName) {
  if (!container) return;

  container.innerHTML = "";
  const info = getVidoraAvatarInfo(getSelectedVidoraAvatar());

  const img = document.createElement("img");
  img.src = info.image;
  img.alt = displayName || info.name;
  img.className = "profileAvatarImage";
  img.onerror = function () {
    container.innerHTML =
      "<span>" + (displayName || "V").charAt(0).toUpperCase() + "</span>";
  };
  container.appendChild(img);
}

function renderProfileAvatar(container, avatarUrl, displayName) {
  if (!container) return;
  container.innerHTML = "";

  if (avatarUrl && !String(avatarUrl).includes("dicebear.com")) {
    const img = document.createElement("img");
    img.src = avatarUrl;
    img.alt = displayName || "Profile";
    img.className = "profileAvatarImage";
    img.onerror = function () {
      renderDefaultAvatar(container, displayName);
    };
    container.appendChild(img);
  } else {
    renderDefaultAvatar(container, displayName);
  }
}

/* =========================================================
   5. INTERACTIVE AVATAR
   ========================================================= */

async function showInteractiveAvatar() {
  if (!interactiveAvatarEnabled) return;

  const box = document.getElementById("interactiveAvatar");
  const img = document.getElementById("interactiveAvatarImage");
  if (!box || !img) return;

  let avatarUrl = getVidoraAvatarImage(getSelectedVidoraAvatar());
  let displayName = "Vidora User";

  if (currentUser) {
    try {
      const { data } = await supabaseClient
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (data) {
        displayName = data.display_name || displayName;
        if (data.avatar_url && !data.avatar_url.includes("dicebear.com")) {
          avatarUrl = data.avatar_url;
        }
      }
    } catch (err) {
      console.error("Avatar load error:", err);
    }
  }

  img.src = avatarUrl;
  img.onerror = function () {
    img.src = "./nova.png";
  };

  const greetingEl = document.getElementById("avatarGreeting");
  const messageEl = document.getElementById("avatarMessage");
  const hour = new Date().getHours();
  let greeting = "Hello";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";
  else greeting = "Good evening";

  if (greetingEl) greetingEl.textContent = greeting + ", " + displayName + "!";
  if (messageEl) {
    messageEl.textContent = "I'm your Vidora assistant. How can I help you?";
  }

  box.classList.remove("hidden");
}

function closeInteractiveAvatar() {
  const box = document.getElementById("interactiveAvatar");
  if (box) box.classList.add("hidden");
}

function toggleInteractiveAvatar(enabled) {
  interactiveAvatarEnabled = !!enabled;
  localStorage.setItem(
    "vidoraInteractiveAvatar",
    interactiveAvatarEnabled ? "true" : "false"
  );

  if (interactiveAvatarEnabled) showInteractiveAvatar();
  else closeInteractiveAvatar();
}

function avatarReact() {
  const messages = [
    "Hey! Need help?",
    "I'm here for you 🚀",
    "Want me to guide you?",
    "Tap Chat to talk to me!",
    "I can change the theme for you too!"
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];
  const messageEl = document.getElementById("avatarMessage");
  if (messageEl) messageEl.textContent = msg;
}

function openAvatarChat() {
  const panel = document.getElementById("avatarChatPanel");
  if (panel) panel.classList.remove("hidden");
}

function closeAvatarChat() {
  const panel = document.getElementById("avatarChatPanel");
  if (panel) panel.classList.add("hidden");
}

function sendAvatarMessage() {
  const input = document.getElementById("avatarChatInput");
  const messages = document.getElementById("avatarChatMessages");
  if (!input || !messages) return;

  const text = input.value.trim();
  if (!text) return;

  const userMsg = document.createElement("div");
  userMsg.className = "avatarChatMessage avatarUser";
  userMsg.textContent = text;
  messages.appendChild(userMsg);

  input.value = "";
  messages.scrollTop = messages.scrollHeight;

  setTimeout(function () {
    const reply = getAvatarReply(text);
    const botMsg = document.createElement("div");
    botMsg.className = "avatarChatMessage avatarBot";
    botMsg.textContent = reply;
    messages.appendChild(botMsg);
    messages.scrollTop = messages.scrollHeight;
  }, 500);
}

function getAvatarReply(text) {
  const msg = String(text || "").toLowerCase();

  if (msg.includes("home") || msg.includes("feed")) {
    showPage("home");
    closeInteractiveAvatar();
    return "Taking you to Home 🏠";
  }
  if (msg.includes("profile")) {
    showPage("profile");
    closeInteractiveAvatar();
    return "Opening your Profile 👤";
  }
  if (msg.includes("create") || msg.includes("post")) {
    showPage("create");
    closeInteractiveAvatar();
    return "Let's create something! ✨";
  }
  if (msg.includes("discover") || msg.includes("search")) {
    showPage("discover");
    closeInteractiveAvatar();
    return "Exploring Discover 🔍";
  }
  if (msg.includes("dark") || msg.includes("night mode")) {
    setVidoraTheme("dark");
    return "Dark mode enabled 🌙";
  }
  if (msg.includes("light") || msg.includes("day mode")) {
    setVidoraTheme("light");
    return "Light mode enabled ☀️";
  }
  if (msg.includes("theme") || msg.includes("mode")) {
    const hour = new Date().getHours();
    if (hour >= 18 || hour < 6) {
      setVidoraTheme("dark");
      return "It's getting late — Dark Mode enabled 🌙";
    }
    setVidoraTheme("light");
    return "Nice day! Light Mode enabled ☀️";
  }
  if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
    return "Hey there! 👋 How can I help you on Vidora?";
  }
  if (msg.includes("help")) {
    return "I can take you to Home, Profile, Create, Discover, or change the theme.";
  }
  if (msg.includes("thank")) return "You're welcome! 💜";

  return "I'm still learning! Try asking me to go somewhere or change the theme.";
}

/* =========================================================
   6. THEME
   ========================================================= */

function setVidoraTheme(theme) {
  localStorage.setItem("vidoraTheme", theme);
  document.body.classList.toggle("lightMode", theme === "light");
  document.body.classList.toggle("darkMode", theme === "dark");
}

function loadVidoraTheme() {
  const saved = localStorage.getItem("vidoraTheme");
  if (saved) setVidoraTheme(saved);
}

/* =========================================================
   7. AVATAR INIT
   ========================================================= */

function initializeVidoraAvatarSystem() {
  const selected = getSelectedVidoraAvatar();
  const hidden = document.getElementById("selectedVidoraAvatar");
  if (hidden) hidden.value = selected;

  const container = document.getElementById("vidoraAvatarChoices");
  if (container) {
    container.innerHTML = "";
    Object.keys(VIDORA_AVATARS).forEach(function (key) {
      const avatar = VIDORA_AVATARS[key];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vidoraAvatar";
      btn.dataset.avatar = key;
      if (key === selected) btn.classList.add("selected");

      btn.innerHTML =
        '<img src="' +
        avatar.image +
        '" alt="' +
        avatar.name +
        '"><span>' +
        avatar.name +
        "</span>";

      btn.onclick = function () {
        selectVidoraAvatar(key);
      };
      container.appendChild(btn);
    });
  }

  loadVidoraTheme();

  if (interactiveAvatarEnabled) {
    setTimeout(function () {
      showInteractiveAvatar();
    }, 800);
  }
}

/* =========================================================
   8. AUTH HELPERS
   ========================================================= */

function showLoginForm() {
  const authChoice = document.getElementById("authChoice");
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");

  if (authChoice) authChoice.classList.add("hidden");
  if (signupForm) signupForm.classList.add("hidden");
  if (loginForm) loginForm.classList.remove("hidden");

  clearMessage("authMessage");
}

function showCreateAccount() {
  const authChoice = document.getElementById("authChoice");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  if (authChoice) authChoice.classList.add("hidden");
  if (loginForm) loginForm.classList.add("hidden");
  if (signupForm) signupForm.classList.remove("hidden");

  clearMessage("authMessage");
}

function showAuthChoice() {
  const authChoice = document.getElementById("authChoice");
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");

  if (authChoice) authChoice.classList.remove("hidden");
  if (signupForm) signupForm.classList.add("hidden");
  if (loginForm) loginForm.classList.add("hidden");

  clearMessage("authMessage");
}

function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    if (button) {
      button.textContent = "🙈";
      button.setAttribute("aria-label", "Hide password");
    }
  } else {
    input.type = "password";
    if (button) {
      button.textContent = "👁";
      button.setAttribute("aria-label", "Show password");
    }
  }
}

/* =========================================================
   9. AUTHENTICATION
   ========================================================= */

async function signUp() {
  const email = document.getElementById("signupEmail")?.value.trim();
const password = document.getElementById("signupPassword")?.value.trim();
  const message = document.getElementById("authMessage");
  const button = document.getElementById("signUpBtn");

  if (!email || !password) {
    if (message) message.textContent = "Enter your email and password.";
    return;
  }
  if (password.length < 6) {
    if (message) message.textContent = "Password must be at least 6 characters.";
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Creating...";
  }

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password
    });

    if (error) {
      if (message) {
        message.textContent = error.message;
        message.style.color = "#ff6b6b";
      }
      return;
    }

    if (data.session) {
      currentUser = data.user;
      if (message) {
        message.textContent = "Account created successfully!";
        message.style.color = "#4ade80";
      }
      await showApp();
    } else if (message) {
      message.textContent =
        "Account created. Check your email to confirm your account.";
      message.style.color = "#4ade80";
    }
  } catch (error) {
    console.error("SIGNUP EXCEPTION:", error);
    if (message) {
      message.textContent = error.message || "Sign up failed.";
      message.style.color = "#ff6b6b";
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Create Account";
    }
  }
}

async function login() {
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value.trim();
  const message = document.getElementById("authMessage");
  const button = document.getElementById("loginBtn");

  if (!email || !password) {
    if (message) message.textContent = "Enter your email and password.";
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Logging in...";
  }

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    console.log("LOGIN RESULT:", data);
    console.log("LOGIN ERROR:", error);

    if (error) {
      if (message) {
        message.textContent = error.message;
        message.style.color = "#ff6b6b";
      }
      return;
    }

    currentUser = data.user;

    if (message) {
      message.textContent = "Login successful!";
      message.style.color = "#4ade80";
    }

    await showApp();
  } catch (error) {
    console.error("LOGIN EXCEPTION:", error);
    if (message) {
      message.textContent = error.message || "Login failed.";
      message.style.color = "#ff6b6b";
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Log In";
    }
  }
}

async function logout() {
  const button = getElement("logoutBtn");
  if (button) {
    button.disabled = true;
    button.textContent = "Logging out...";
  }

  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      alert(error.message || "Unable to log out.");
      return;
    }
    currentUser = null;
    showAuthScreen();
  } catch (error) {
    console.error("LOGOUT EXCEPTION:", error);
    alert("Unable to log out.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Log Out";
    }
  }
}

function showAuthScreen() {
  const authScreen = getElement("authScreen");
  const app = getElement("app");

  if (authScreen) authScreen.classList.remove("hidden");
  if (app) app.classList.add("hidden");

  clearMessage("uploadMessage");
  clearMessage("createMessage");
}

function showProfileSetup() {
  const setup = document.getElementById("profileSetup");
  if (setup) setup.classList.remove("hidden");
}

/* =========================================================
   10. SHOW APP
   ========================================================= */

async function showApp() {
  const authScreen = getElement("authScreen");
  const app = getElement("app");

  if (authScreen) authScreen.classList.add("hidden");
  if (app) app.classList.remove("hidden");

  if (!currentUser) {
    const { data } = await supabaseClient.auth.getUser();
    currentUser = data?.user || null;
  }

  if (!currentUser) {
    showAuthScreen();
    return;
  }

  showPage("home");
  await loadProfile();
  await loadFeed();
  appInitialized = true;

  if (interactiveAvatarEnabled) {
    setTimeout(function () {
      showInteractiveAvatar();
    }, 600);
  }
}

/* =========================================================
   11. LOAD PROFILE
   ========================================================= */

async function loadProfile() {
  if (!currentUser) return;

  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, created_at")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.error("LOAD PROFILE ERROR:", error);
      return;
    }

    if (!data) {
      showProfileSetup();
      return;
    }

    const displayNameEl = document.getElementById("profileDisplayName");
    if (displayNameEl) {
      displayNameEl.textContent = data.display_name || "Vidora User";
    }

    const usernameEl = document.getElementById("profileUsername");
    if (usernameEl) {
      usernameEl.textContent = data.username
        ? "@" + data.username
        : "Set up your username";
    }

    const bioEl = document.getElementById("profileBio");
    if (bioEl) bioEl.textContent = data.bio || "No bio yet.";

    const emailEl = document.getElementById("profileEmail");
    if (emailEl) emailEl.textContent = currentUser.email || "";

    const avatarEl = document.getElementById("profileAvatar");
    if (avatarEl) {
      if (data.avatar_url && !data.avatar_url.includes("dicebear.com")) {
        const img = document.createElement("img");
        img.src = data.avatar_url;
        img.alt = data.display_name || "Profile picture";
        img.className = "profileAvatarImage";
        img.onerror = function () {
          renderDefaultAvatar(avatarEl, data.display_name);
        };
        avatarEl.innerHTML = "";
        avatarEl.appendChild(img);
      } else {
        renderDefaultAvatar(avatarEl, data.display_name);
      }
    }

    const displayInput = document.getElementById("profileDisplayNameInput");
    if (displayInput) displayInput.value = data.display_name || "";

    const usernameInput = document.getElementById("profileUsernameInput");
    if (usernameInput) usernameInput.value = data.username || "";

    const bioInput = document.getElementById("profileBioInput");
    if (bioInput) bioInput.value = data.bio || "";

    const setup = document.getElementById("profileSetup");
    if (setup) setup.classList.add("hidden");
  } catch (error) {
    console.error("LOAD PROFILE EXCEPTION:", error);
  }
}

/* =========================================================
   12. SAVE PROFILE
   ========================================================= */

async function saveProfile() {
  if (!currentUser) {
    setMessage("profileMessage", "Please log in first.");
    return;
  }

  const displayName =
    document.getElementById("profileDisplayNameInput")?.value.trim() || "";
  const username =
    document.getElementById("profileUsernameInput")?.value.trim().replace(/^@/, "") ||
    "";
  const bio = document.getElementById("profileBioInput")?.value.trim() || "";
  const selectedAvatar = getSelectedVidoraAvatar();

  if (!displayName) {
    setMessage("profileMessage", "Please enter a display name.");
    return;
  }

  try {
    const { error } = await supabaseClient.from("profiles").upsert({
      id: currentUser.id,
      display_name: displayName,
      username: username || null,
      bio: bio,
      avatar_type: "preset",
      avatar_name: selectedAvatar,
      updated_at: new Date().toISOString()
    });

    if (error) {
      setMessage("profileMessage", error.message || "Could not save profile.");
      return;
    }

    setMessage("profileMessage", "Profile saved!", true);
    await loadProfile();
  } catch (error) {
    console.error("SAVE PROFILE ERROR:", error);
    setMessage("profileMessage", "Could not save profile.");
  }
}

/* =========================================================
   13. MEDIA VALIDATION
   ========================================================= */

function validateMediaFile(file) {
  if (!file) {
    return { valid: false, message: "Please choose a photo or video." };
  }

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  if (!isImage && !isVideo) {
    return { valid: false, message: "Only images and videos are allowed." };
  }

  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, message: "File is too large (max 50MB)." };
  }

  return { valid: true, message: "" };
}

/* =========================================================
   14. CREATE POST
   ========================================================= */

async function createPost(file, caption) {
  if (!currentUser) {
    return { success: false, message: "You are not logged in." };
  }

  const fileName = createSafeFileName(file);
  const filePath = currentUser.id + "/" + fileName;
  const mediaType = file.type.startsWith("video/") ? "video" : "image";
  let uploadedPath = null;

  try {
    const { error: uploadError } = await supabaseClient.storage
      .from("media")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      return {
        success: false,
        message: "Media upload failed: " + uploadError.message
      };
    }

    uploadedPath = filePath;

    const { data: publicData } = supabaseClient.storage
      .from("media")
      .getPublicUrl(filePath);

    const mediaUrl = publicData?.publicUrl;
    if (!mediaUrl) {
      await supabaseClient.storage.from("media").remove([filePath]);
      return { success: false, message: "Could not create media URL." };
    }

    const { data, error: postError } = await supabaseClient
      .from("posts")
      .insert({
        user_id: currentUser.id,
        media_url: mediaUrl,
        media_type: mediaType,
        caption: caption || "",
        views: 0
      })
      .select()
      .single();

    if (postError) {
      await supabaseClient.storage.from("media").remove([filePath]);
      return {
        success: false,
        message: "Post could not be saved: " + postError.message
      };
    }

    return { success: true, data: data };
  } catch (error) {
    console.error("CREATE POST EXCEPTION:", error);
    if (uploadedPath) {
      try {
        await supabaseClient.storage.from("media").remove([uploadedPath]);
      } catch (e) {}
    }
    return { success: false, message: "An unexpected error occurred." };
  }
}

async function uploadPost() {
  const fileInput = getElement("mediaFile");
  const captionInput = getElement("postCaption");
  const button = document.querySelector(
    '#homeScreen button[onclick="uploadPost()"]'
  );

  if (!fileInput || !captionInput) return;

  const file = fileInput.files[0];
  const caption = captionInput.value.trim();
  clearMessage("uploadMessage");

  if (!currentUser) {
    setMessage("uploadMessage", "Please log in first.");
    return;
  }

  const validation = validateMediaFile(file);
  if (!validation.valid) {
    setMessage("uploadMessage", validation.message);
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Uploading...";
  }

  try {
    const result = await createPost(file, caption);
    if (!result.success) {
      setMessage("uploadMessage", result.message);
      return;
    }

    setMessage("uploadMessage", "Post published successfully!", true);
    fileInput.value = "";
    captionInput.value = "";
    await loadFeed();
  } catch (error) {
    console.error("UPLOAD POST ERROR:", error);
    setMessage("uploadMessage", "Could not publish your post.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "📤 Publish";
    }
  }
}

async function publishFromCreate() {
  const fileInput = getElement("createFile");
  const captionInput = getElement("createCaption");
  const button = document.querySelector(
    '#createScreen button[onclick="publishFromCreate()"]'
  );

  if (!fileInput || !captionInput) return;

  const file = fileInput.files[0];
  const caption = captionInput.value.trim();
  clearMessage("createMessage");

  if (!currentUser) {
    setMessage("createMessage", "Please log in first.");
    return;
  }

  const validation = validateMediaFile(file);
  if (!validation.valid) {
    setMessage("createMessage", validation.message);
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Publishing...";
  }

  try {
    const result = await createPost(file, caption);
    if (!result.success) {
      setMessage("createMessage", result.message);
      return;
    }

    setMessage("createMessage", "Post published successfully!", true);
    fileInput.value = "";
    captionInput.value = "";
    await loadFeed();
    setTimeout(function () {
      showPage("home");
    }, 700);
  } catch (error) {
    console.error("CREATE PAGE POST ERROR:", error);
    setMessage("createMessage", "Could not publish your post.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "🚀 Publish to Vidora";
    }
  }
}

/* =========================================================
   15. LOAD FEED
   ========================================================= */

async function loadFeed() {
  if (feedLoading) return;
  feedLoading = true;

  const feed = getElement("feed");
  if (!feed) {
    feedLoading = false;
    return;
  }

  feed.innerHTML = '<div class="loading">Loading Vidora...</div>';

  try {
    const { data, error } = await supabaseClient
      .from("posts")
      .select("id,user_id,media_url,media_type,caption,created_at,views")
      .order("created_at", { ascending: false });

    if (error) {
      feed.innerHTML =
        '<div class="loading">Unable to load posts.<br><br>' +
        escapeHTML(error.message) +
        "</div>";
      return;
    }

    if (!data || data.length === 0) {
      feed.innerHTML =
        '<div class="loading">No posts yet.<br>Be the first to publish something!</div>';
      return;
    }

    feed.innerHTML = "";
    for (const post of data) {
      const element = await createPostElement(post);
      if (element) feed.appendChild(element);
    }
  } catch (error) {
    console.error("LOAD FEED EXCEPTION:", error);
    feed.innerHTML =
      '<div class="loading">Something went wrong while loading Vidora.</div>';
  } finally {
    feedLoading = false;
  }
}

async function createPostElement(post) {
  const article = document.createElement("article");
  article.className = "postCard";
  article.dataset.postId = post.id;

  let username = "Vidora User";
  try {
    const { data } = await supabaseClient
      .from("profiles")
      .select("username, display_name")
      .eq("id", post.user_id)
      .maybeSingle();

    if (data) {
      username = data.username || data.display_name || username;
    }
  } catch (e) {}

  const isOwner = currentUser && currentUser.id === post.user_id;
  const mediaHTML =
    post.media_type === "video"
      ? '<video src="' +
        escapeHTML(post.media_url) +
        '" controls playsinline></video>'
      : '<img src="' +
        escapeHTML(post.media_url) +
        '" alt="Post media">';

  const viewsHTML = isOwner
    ? '<span class="viewCount">👁️ ' + (post.views || 0) + " Views</span>"
    : "";

  article.innerHTML =
    '<div class="postHeader"><strong>@' +
    escapeHTML(username) +
    "</strong><span>" +
    escapeHTML(formatDate(post.created_at)) +
    "</span></div>" +
    '<div class="postMedia">' +
    mediaHTML +
    "</div>" +
    '<div class="postCaption">' +
    escapeHTML(post.caption || "") +
    "</div>" +
    '<div class="postStats">' +
    '<span class="likeCount">❤️ 0 Likes</span>' +
    '<span class="commentCount">💬 0 Comments</span>' +
    viewsHTML +
    "</div>";

  return article;
}

/* =========================================================
   16. NAVIGATION
   ========================================================= */

function showPage(page) {
  const pages = {
    home: "homeScreen",
    profile: "profileScreen",
    create: "createScreen",
    discover: "discoverScreen",
    friends: "friendsScreen"
  };

  Object.keys(pages).forEach(function (key) {
    const el = document.getElementById(pages[key]);
    if (el) el.classList.add("hidden");
  });

  const target = document.getElementById(pages[page] || pages.home);
  if (target) target.classList.remove("hidden");

  if (page === "home") loadFeed();
  if (page === "profile") loadProfile();
  if (page === "discover" && typeof loadVidoraDiscover === "function") {
    loadVidoraDiscover("for-you");
  }
}

function showpage(page) {
  showPage(page);
}

/* =========================================================
   17. SESSION CHECK
   ========================================================= */

async function checkSession() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.error("SESSION ERROR:", error);
      showAuthScreen();
      return;
    }

    if (data?.session?.user) {
      currentUser = data.session.user;
      await showApp();
    } else {
      showAuthScreen();
    }
  } catch (error) {
    console.error("CHECK SESSION EXCEPTION:", error);
    showAuthScreen();
  }
}

/* =========================================================
   18. DISCOVER (BASIC)
   ========================================================= */

let vidoraDiscoverFilter = "for-you";

async function loadVidoraDiscover(filter) {
  filter = filter || "for-you";
  vidoraDiscoverFilter = filter;

  const results = document.getElementById("discoverResults");
  if (!results) return;

  results.innerHTML =
    '<div class="loading">Loading ' +
    escapeHTML(filter.replace("-", " ")) +
    "...</div>";

  try {
    const { data, error } = await supabaseClient
      .from("posts")
      .select("id,user_id,media_url,media_type,caption,created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      results.innerHTML =
        '<div class="loading">Unable to load Discover.</div>';
      return;
    }

    if (!data || data.length === 0) {
      results.innerHTML = '<div class="loading">Nothing to discover yet.</div>';
      return;
    }

    results.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "discoverGrid";

    data.forEach(function (post) {
      const card = document.createElement("div");
      card.className = "discoverCard";
      if (post.media_type === "video") {
        card.innerHTML =
          '<video src="' +
          escapeHTML(post.media_url) +
          '" muted playsinline></video>';
      } else {
        card.innerHTML =
          '<img src="' + escapeHTML(post.media_url) + '" alt="Discover">';
      }
      grid.appendChild(card);
    });

    results.appendChild(grid);
  } catch (error) {
    console.error("DISCOVER ERROR:", error);
    results.innerHTML = '<div class="loading">Discover failed to load.</div>';
  }
}

/* =========================================================
   19. INIT
   ========================================================= */

document.addEventListener("DOMContentLoaded", async function () {
  console.log("Vidora DOM ready");
  initializeVidoraAvatarSystem();
  renderVidoraFilterChips();
  showPage("home");
  await checkSession();
});
/* =========================================================
   VIDORA SOUNDS / BEATS / FILTERS
   ========================================================= */

const VIDORA_SOUNDS = [
  { id: "neon-drive", name: "Neon Drive", artist: "Vidora Beats", type: "trending" },
  { id: "night-pulse", name: "Night Pulse", artist: "Aether", type: "trending" },
  { id: "soft-glow", name: "Soft Glow", artist: "Luna Wave", type: "chill" },
  { id: "city-rain", name: "City Rain", artist: "Nova Keys", type: "chill" },
  { id: "bass-room", name: "Bass Room", artist: "Rex Audio", type: "beats" },
  { id: "heat-check", name: "Heat Check", artist: "Pixel Lab", type: "beats" },
  { id: "orbit-flow", name: "Orbit Flow", artist: "Orion", type: "trending" },
  { id: "violet-hour", name: "Violet Hour", artist: "Vexa", type: "chill" }
];

const VIDORA_FILTERS = [
  { id: "normal", name: "Normal", css: "none" },
  { id: "warm", name: "Warm", css: "sepia(0.25) saturate(1.2)" },
  { id: "cool", name: "Cool", css: "hue-rotate(20deg) saturate(1.1)" },
  { id: "mono", name: "B&W", css: "grayscale(1)" },
  { id: "vivid", name: "Vivid", css: "contrast(1.15) saturate(1.35)" }
];

let selectedVidoraSound = null;
let selectedVidoraFilter = "normal";

function openVidoraSounds(filterType) {
  const panel = document.getElementById("vidoraSoundPanel");
  const list = document.getElementById("vidoraSoundList");
  if (!panel || !list) return;

  const type = filterType || "all";
  const sounds =
    type === "all"
      ? VIDORA_SOUNDS
      : VIDORA_SOUNDS.filter(function (s) {
          return s.type === type;
        });

  list.innerHTML = "";
  sounds.forEach(function (sound) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "soundItem";
    btn.innerHTML =
      "<div><strong>" +
      escapeHTML(sound.name) +
      "</strong><small>" +
      escapeHTML(sound.artist) +
      " · " +
      escapeHTML(sound.type) +
      "</small></div><span>＋</span>";
    btn.onclick = function () {
      selectVidoraSound(sound.id);
    };
    list.appendChild(btn);
  });

  panel.classList.remove("hidden");
}

function closeVidoraSounds() {
  const panel = document.getElementById("vidoraSoundPanel");
  if (panel) panel.classList.add("hidden");
}

function selectVidoraSound(soundId) {
  selectedVidoraSound =
    VIDORA_SOUNDS.find(function (s) {
      return s.id === soundId;
    }) || null;

  const wrap = document.getElementById("selectedVidoraSound");
  const nameEl = document.getElementById("selectedSoundName");
  const artistEl = document.getElementById("selectedSoundArtist");

  if (selectedVidoraSound && wrap && nameEl && artistEl) {
    nameEl.textContent = selectedVidoraSound.name;
    artistEl.textContent =
      selectedVidoraSound.artist + " · " + selectedVidoraSound.type;
    wrap.classList.remove("hidden");
  }

  closeVidoraSounds();
}

function removeVidoraSound() {
  selectedVidoraSound = null;
  const wrap = document.getElementById("selectedVidoraSound");
  if (wrap) wrap.classList.add("hidden");
}

function selectVidoraFilter(filterId) {
  selectedVidoraFilter = filterId || "normal";
  const filter = VIDORA_FILTERS.find(function (f) {
    return f.id === selectedVidoraFilter;
  });

  document.querySelectorAll(".filterChip").forEach(function (chip) {
    chip.classList.toggle(
      "active",
      chip.dataset.filter === selectedVidoraFilter
    );
  });

  const preview = document.getElementById("createMediaPreview");
  if (preview) {
    preview.style.filter = filter ? filter.css : "none";
  }
}

function renderVidoraFilterChips() {
  const box = document.getElementById("vidoraFilterChips");
  if (!box) return;

  box.innerHTML = "";
  VIDORA_FILTERS.forEach(function (filter) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "filterChip" + (filter.id === selectedVidoraFilter ? " active" : "");
    btn.dataset.filter = filter.id;
    btn.textContent = filter.name;
    btn.onclick = function () {
      selectVidoraFilter(filter.id);
    };
    box.appendChild(btn);
  });
}

/* =========================================================
   20. GLOBAL EXPORTS
   ========================================================= */

window.login = login;
window.signUp = signUp;
window.logout = logout;

window.showLoginForm = showLoginForm;
window.showCreateAccount = showCreateAccount;
window.showAuthChoice = showAuthChoice;
window.showAuthScreen = showAuthScreen;
window.showProfileSetup = showProfileSetup;
window.togglePassword = togglePassword;

window.showPage = showPage;
window.showpage = showpage;

window.loadProfile = loadProfile;
window.saveProfile = saveProfile;

window.uploadPost = uploadPost;
window.publishFromCreate = publishFromCreate;
window.loadFeed = loadFeed;
window.loadVidoraDiscover = loadVidoraDiscover;

window.selectVidoraAvatar = selectVidoraAvatar;
window.getSelectedVidoraAvatar = getSelectedVidoraAvatar;
window.getVidoraAvatarImage = getVidoraAvatarImage;
window.getVidoraAvatarInfo = getVidoraAvatarInfo;
window.updateAvatarPreview = updateAvatarPreview;
window.renderDefaultAvatar = renderDefaultAvatar;
window.renderProfileAvatar = renderProfileAvatar;

window.showInteractiveAvatar = showInteractiveAvatar;
window.closeInteractiveAvatar = closeInteractiveAvatar;
window.toggleInteractiveAvatar = toggleInteractiveAvatar;
window.avatarReact = avatarReact;
window.openAvatarChat = openAvatarChat;
window.closeAvatarChat = closeAvatarChat;
window.sendAvatarMessage = sendAvatarMessage;
window.initializeVidoraAvatarSystem = initializeVidoraAvatarSystem;

window.setVidoraTheme = setVidoraTheme;
window.loadVidoraTheme = loadVidoraTheme;

console.log("VIDORA AUTH FUNCTIONS READY");
