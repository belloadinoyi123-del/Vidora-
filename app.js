/* =========================================================
   VIDORA - COMPLETE APP.JS
   AUTH + PROFILE + POSTS + STORIES + SOUNDS + FILTERS
   + LIKES + COMMENTS + FOLLOW + BLOCK
   + CHAT + VOICE NOTES + CALLS + NOTIFICATIONS
   + AVATAR ASSISTANT
   ========================================================= */

console.log("VIDORA COMPLETE APP.JS LOADED");

/* =========================================================
   1. SUPABASE CONFIGURATION
   ========================================================= */

const SUPABASE_URL =
  "https://htnrqgzxkfktwoioscjr.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_JT5rBfXYSX3-3_zyC2cazQ_YXg_ih_h";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );


/* =========================================================
   2. GLOBAL STATE
   ========================================================= */

let currentUser = null;
let searchTimer = null;
let appInitialized = false;
let feedLoading = false;

let interactiveAvatarEnabled =
  localStorage.getItem(
    "vidoraInteractiveAvatar"
  ) === "true";

let selectedVidoraSound = null;
let selectedVidoraFilter = "normal";

let vidoraAudioPlayer = null;

let vidoraStories = [];
let currentStoryIndex = 0;
let currentStory = null;
let selectedStoryFile = null;
let storyTimer = null;

let currentChatUser = null;
let currentCall = null;
let localStream = null;
let remoteStream = null;
let peerConnection = null;

const VIDORA_STORY_DURATION = 5000;


/* =========================================================
   3. BASIC HELPERS
   ========================================================= */

function getElement(id) {
  return document.getElementById(id);
}

function setMessage(
  id,
  message,
  success = false
) {
  const element = getElement(id);

  if (!element) return;

  element.textContent = message;

  element.style.color =
    success
      ? "#4ade80"
      : "#ff6b6b";
}

function clearMessage(id) {
  const element = getElement(id);

  if (element) {
    element.textContent = "";
  }
}

function escapeHTML(value) {
  const div =
    document.createElement("div");

  div.textContent =
    value == null
      ? ""
      : String(value);

  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return "";

  const date =
    new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(
    [],
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  );
}

function getFileExtension(file) {
  if (!file || !file.name) {
    return "bin";
  }

  const parts =
    file.name.split(".");

  if (parts.length < 2) {
    return "bin";
  }

  return parts
    .pop()
    .toLowerCase();
}

function createSafeFileName(file) {
  const extension =
    getFileExtension(file);

  let id;

  if (
    window.crypto &&
    typeof window.crypto.randomUUID ===
      "function"
  ) {
    id =
      window.crypto.randomUUID();
  } else {
    id =
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .substring(2);
  }

  return id + "." + extension;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (e) {
    return null;
  }
}


/* =========================================================
   4. VIDORA AVATARS
   ========================================================= */

const VIDORA_AVATARS = {
  nova: {
    id: "nova",
    name: "Nova",
    image: "./nova.png"
  },

  kai: {
    id: "kai",
    name: "Kai",
    image: "./kai.png"
  },

  luna: {
    id: "luna",
    name: "Luna",
    image: "./luna.png"
  },

  ivy: {
    id: "ivy",
    name: "Ivy",
    image: "./ivy.png"
  },

  orion: {
    id: "orion",
    name: "Orion",
    image: "./orion.png"
  },

  zeno: {
    id: "zeno",
    name: "Zeno",
    image: "./zeno.png"
  },

  sage: {
    id: "sage",
    name: "Sage",
    image: "./sage.png"
  },

  rex: {
    id: "rex",
    name: "Rex",
    image: "./rex.png"
  },

  pixel: {
    id: "pixel",
    name: "Pixel",
    image: "./pixel.png"
  },

  vexa: {
    id: "vexa",
    name: "Vexa",
    image: "./vexa.png"
  }
};

function getSelectedVidoraAvatar() {
  const saved =
    localStorage.getItem(
      "vidoraSelectedAvatar"
    );

  if (
    saved &&
    VIDORA_AVATARS[saved]
  ) {
    return saved;
  }

  return "nova";
}

function getVidoraAvatarInfo(name) {
  const key =
    String(name || "")
      .toLowerCase()
      .trim();

  return (
    VIDORA_AVATARS[key] ||
    VIDORA_AVATARS.nova
  );
}

function getVidoraAvatarImage(name) {
  return getVidoraAvatarInfo(name).image;
}

function selectVidoraAvatar(name) {
  const key =
    String(name || "")
      .toLowerCase()
      .trim();

  if (!VIDORA_AVATARS[key]) {
    return;
  }

  localStorage.setItem(
    "vidoraSelectedAvatar",
    key
  );

  localStorage.setItem(
    "vidoraAvatarMode",
    "preset"
  );

  const hidden =
    getElement(
      "selectedVidoraAvatar"
    );

  if (hidden) {
    hidden.value = key;
  }

  document
    .querySelectorAll(
      ".vidoraAvatar"
    )
    .forEach(function (btn) {
      btn.classList.toggle(
        "selected",
        String(
          btn.dataset.avatar || ""
        ).toLowerCase() === key
      );
    });

  const info =
    getVidoraAvatarInfo(key);

  updateAvatarPreview(
    info.image,
    info.name
  );

  const profileAvatar =
    getElement("profileAvatar");

  if (profileAvatar) {
    renderDefaultAvatar(
      profileAvatar,
      info.name
    );
  }
}

function updateAvatarPreview(
  imageUrl,
  name
) {
  const preview =
    getElement(
      "profileAvatarPreview"
    );

  if (!preview) return;

  preview.innerHTML = "";

  const img =
    document.createElement("img");

  img.src = imageUrl;
  img.alt = name || "Avatar";
  img.className =
    "profileAvatarImage";

  img.onerror = function () {
    img.src = "./nova.png";
  };

  preview.appendChild(img);
}

function renderDefaultAvatar(
  container,
  displayName
) {
  if (!container) return;

  container.innerHTML = "";

  const info =
    getVidoraAvatarInfo(
      getSelectedVidoraAvatar()
    );

  const img =
    document.createElement("img");

  img.src = info.image;

  img.alt =
    displayName ||
    info.name;

  img.className =
    "profileAvatarImage";

  img.onerror =
    function () {
      container.innerHTML =
        "<span>" +
        (
          displayName ||
          "V"
        )
          .charAt(0)
          .toUpperCase() +
        "</span>";
    };

  container.appendChild(img);
}

function renderProfileAvatar(
  container,
  avatarUrl,
  displayName
) {
  if (!container) return;

  container.innerHTML = "";

  if (
    avatarUrl &&
    !String(
      avatarUrl
    ).includes("dicebear.com")
  ) {
    const img =
      document.createElement("img");

    img.src = avatarUrl;

    img.alt =
      displayName ||
      "Profile";

    img.className =
      "profileAvatarImage";

    img.onerror =
      function () {
        renderDefaultAvatar(
          container,
          displayName
        );
      };

    container.appendChild(img);
  } else {
    renderDefaultAvatar(
      container,
      displayName
    );
  }
}


/* =========================================================
   5. INTERACTIVE AVATAR
   ========================================================= */

async function showInteractiveAvatar() {
  if (!interactiveAvatarEnabled) {
    return;
  }

  const box =
    getElement(
      "interactiveAvatar"
    );

  const img =
    getElement(
      "interactiveAvatarImage"
    );

  if (!box || !img) {
    return;
  }

  let avatarUrl =
    getVidoraAvatarImage(
      getSelectedVidoraAvatar()
    );

  let displayName =
    "Vidora User";

  if (currentUser) {
    try {
      const { data } =
        await supabaseClient
          .from("profiles")
          .select(
            "display_name,avatar_url"
          )
          .eq(
            "id",
            currentUser.id
          )
          .maybeSingle();

      if (data) {
        displayName =
          data.display_name ||
          displayName;

        if (
          data.avatar_url &&
          !data.avatar_url.includes(
            "dicebear.com"
          )
        ) {
          avatarUrl =
            data.avatar_url;
        }
      }
    } catch (error) {
      console.error(
        "AVATAR LOAD ERROR:",
        error
      );
    }
  }

  img.src = avatarUrl;

  img.onerror =
    function () {
      img.src = "./nova.png";
    };

  const greetingEl =
    getElement(
      "avatarGreeting"
    );

  const messageEl =
    getElement(
      "avatarMessage"
    );

  const hour =
    new Date().getHours();

  let greeting =
    "Hello";

  if (hour < 12) {
    greeting =
      "Good morning";
  } else if (hour < 18) {
    greeting =
      "Good afternoon";
  } else {
    greeting =
      "Good evening";
  }

  if (greetingEl) {
    greetingEl.textContent =
      greeting +
      ", " +
      displayName +
      "!";
  }

  if (messageEl) {
    messageEl.textContent =
      "I'm your Vidora assistant. How can I help you?";
  }

  box.classList.remove(
    "hidden"
  );
}

function closeInteractiveAvatar() {
  const box =
    getElement(
      "interactiveAvatar"
    );

  if (box) {
    box.classList.add(
      "hidden"
    );
  }
}

function toggleInteractiveAvatar(
  enabled
) {
  interactiveAvatarEnabled =
    !!enabled;

  localStorage.setItem(
    "vidoraInteractiveAvatar",
    interactiveAvatarEnabled
      ? "true"
      : "false"
  );

  if (
    interactiveAvatarEnabled
  ) {
    showInteractiveAvatar();
  } else {
    closeInteractiveAvatar();
  }
}

function avatarReact() {
  const messages = [
    "Hey! Need help?",
    "I'm here for you 🚀",
    "Want me to guide you?",
    "Tap Chat to talk to me!",
    "I can help you navigate Vidora."
  ];

  const msg =
    messages[
      Math.floor(
        Math.random() *
          messages.length
      )
    ];

  const messageEl =
    getElement(
      "avatarMessage"
    );

  if (messageEl) {
    messageEl.textContent =
      msg;
  }
}

function openAvatarChat() {
  const panel =
    getElement(
      "avatarChatPanel"
    );

  if (panel) {
    panel.classList.remove(
      "hidden"
    );
  }
}

function closeAvatarChat() {
  const panel =
    getElement(
      "avatarChatPanel"
    );

  if (panel) {
    panel.classList.add(
      "hidden"
    );
  }
}

function sendAvatarMessage() {
  const input =
    getElement(
      "avatarChatInput"
    );

  const messages =
    getElement(
      "avatarChatMessages"
    );

  if (!input || !messages) {
    return;
  }

  const text =
    input.value.trim();

  if (!text) return;

  const userMsg =
    document.createElement(
      "div"
    );

  userMsg.className =
    "avatarChatMessage avatarUser";

  userMsg.textContent =
    text;

  messages.appendChild(
    userMsg
  );

  input.value = "";

  const reply =
    getAvatarReply(text);

  setTimeout(
    function () {
      const botMsg =
        document.createElement(
          "div"
        );

      botMsg.className =
        "avatarChatMessage avatarBot";

      botMsg.textContent =
        reply;

      messages.appendChild(
        botMsg
      );

      messages.scrollTop =
        messages.scrollHeight;
    },
    400
  );
}

function getAvatarReply(text) {
  const msg =
    String(text || "")
      .toLowerCase();

  if (
    msg.includes("home") ||
    msg.includes("feed")
  ) {
    showPage("home");
    closeInteractiveAvatar();
    return "Opening Home 🏠";
  }

  if (
    msg.includes("profile")
  ) {
    showPage("profile");
    closeInteractiveAvatar();
    return "Opening your Profile 👤";
  }

  if (
    msg.includes("create") ||
    msg.includes("post")
  ) {
    showPage("create");
    closeInteractiveAvatar();
    return "Let's create something ✨";
  }

  if (
    msg.includes("discover") ||
    msg.includes("search")
  ) {
    showPage("discover");
    closeInteractiveAvatar();
    return "Opening Discover 🔍";
  }

  if (
    msg.includes("dark")
  ) {
    setVidoraTheme("dark");
    return "Dark mode enabled 🌙";
  }

  if (
    msg.includes("light")
  ) {
    setVidoraTheme("light");
    return "Light mode enabled ☀️";
  }

  if (
    msg.includes("theme") ||
    msg.includes("mode")
  ) {
    return "You can say 'dark mode' or 'light mode' and I'll change it.";
  }

  if (
    msg.includes("hello") ||
    msg.includes("hi") ||
    msg.includes("hey")
  ) {
    return "Hey there! 👋 How can I help you on Vidora?";
  }

  if (
    msg.includes("help")
  ) {
    return "I can take you to Home, Profile, Create or Discover, and help with Vidora features.";
  }

  if (
    msg.includes("thank")
  ) {
    return "You're welcome! 💜";
  }

  return "I'm still learning. Try asking me to open Home, Profile, Create or Discover.";
}


/* =========================================================
   6. THEME
   ========================================================= */

function setVidoraTheme(theme) {
  localStorage.setItem(
    "vidoraTheme",
    theme
  );

  document.body.classList.toggle(
    "lightMode",
    theme === "light"
  );

  document.body.classList.toggle(
    "darkMode",
    theme === "dark"
  );
}

function loadVidoraTheme() {
  const saved =
    localStorage.getItem(
      "vidoraTheme"
    );

  if (saved) {
    setVidoraTheme(saved);
  }
}


/* =========================================================
   7. AVATAR INITIALIZATION
   ========================================================= */

function initializeVidoraAvatarSystem() {
  const selected =
    getSelectedVidoraAvatar();

  const hidden =
    getElement(
      "selectedVidoraAvatar"
    );

  if (hidden) {
    hidden.value = selected;
  }

  const container =
    getElement(
      "vidoraAvatarChoices"
    );

  if (container) {
    container.innerHTML = "";

    Object.keys(
      VIDORA_AVATARS
    ).forEach(function (key) {
      const avatar =
        VIDORA_AVATARS[key];

      const btn =
        document.createElement(
          "button"
        );

      btn.type = "button";

      btn.className =
        "vidoraAvatar";

      btn.dataset.avatar =
        key;

      if (key === selected) {
        btn.classList.add(
          "selected"
        );
      }

      btn.innerHTML =
        '<img src="' +
        avatar.image +
        '" alt="' +
        escapeHTML(
          avatar.name
        ) +
        '">' +
        "<span>" +
        escapeHTML(
          avatar.name
        ) +
        "</span>";

      btn.onclick =
        function () {
          selectVidoraAvatar(
            key
          );
        };

      container.appendChild(
        btn
      );
    });
  }

  loadVidoraTheme();

  if (
    interactiveAvatarEnabled
  ) {
    setTimeout(
      showInteractiveAvatar,
      800
    );
  }
}


/* =========================================================
   8. AUTHENTICATION
   ========================================================= */

function showLoginForm() {
  const authChoice =
    getElement("authChoice");

  const signupForm =
    getElement("signupForm");

  const loginForm =
    getElement("loginForm");

  if (authChoice) {
    authChoice.classList.add(
      "hidden"
    );
  }

  if (signupForm) {
    signupForm.classList.add(
      "hidden"
    );
  }

  if (loginForm) {
    loginForm.classList.remove(
      "hidden"
    );
  }

  clearMessage(
    "authMessage"
  );
}

function showCreateAccount() {
  const authChoice =
    getElement("authChoice");

  const loginForm =
    getElement("loginForm");

  const signupForm =
    getElement("signupForm");

  if (authChoice) {
    authChoice.classList.add(
      "hidden"
    );
  }

  if (loginForm) {
    loginForm.classList.add(
      "hidden"
    );
  }

  if (signupForm) {
    signupForm.classList.remove(
      "hidden"
    );
  }

  clearMessage(
    "authMessage"
  );
}

function showAuthChoice() {
  const authChoice =
    getElement("authChoice");

  const signupForm =
    getElement("signupForm");

  const loginForm =
    getElement("loginForm");

  if (authChoice) {
    authChoice.classList.remove(
      "hidden"
    );
  }

  if (signupForm) {
    signupForm.classList.add(
      "hidden"
    );
  }

  if (loginForm) {
    loginForm.classList.add(
      "hidden"
    );
  }

  clearMessage(
    "authMessage"
  );
}

function togglePassword(
  inputId,
  button
) {
  const input =
    getElement(inputId);

  if (!input) return;

  if (
    input.type ===
    "password"
  ) {
    input.type = "text";

    if (button) {
      button.textContent =
        "🙈";

      button.setAttribute(
        "aria-label",
        "Hide password"
      );
    }
  } else {
    input.type = "password";

    if (button) {
      button.textContent =
        "👁";

      button.setAttribute(
        "aria-label",
        "Show password"
      );
    }
  }
}


/* =========================================================
   9. SIGN UP
   ========================================================= */

async function signUp() {
  const email =
    getElement(
      "signupEmail"
    )?.value.trim();

  const password =
    getElement(
      "signupPassword"
    )?.value.trim();

  const message =
    getElement(
      "authMessage"
    );

  const button =
    getElement(
      "signUpBtn"
    );

  if (!email || !password) {
    if (message) {
      message.textContent =
        "Enter your email and password.";

      message.style.color =
        "#ff6b6b";
    }

    return;
  }

  if (password.length < 6) {
    if (message) {
      message.textContent =
        "Password must be at least 6 characters.";

      message.style.color =
        "#ff6b6b";
    }

    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent =
      "Creating...";
  }

  try {
    const { data, error } =
      await supabaseClient.auth.signUp(
        {
          email: email,
          password: password
        }
      );

    if (error) {
      if (message) {
        message.textContent =
          error.message;

        message.style.color =
          "#ff6b6b";
      }

      return;
    }

    if (data.session) {
      currentUser =
        data.user;

      if (message) {
        message.textContent =
          "Account created successfully!";

        message.style.color =
          "#4ade80";
      }

      await showApp();
    } else if (message) {
      message.textContent =
        "Account created. Check your email to confirm your account.";

      message.style.color =
        "#4ade80";
    }

  } catch (error) {
    console.error(
      "SIGNUP EXCEPTION:",
      error
    );

    if (message) {
      message.textContent =
        error.message ||
        "Sign up failed.";

      message.style.color =
        "#ff6b6b";
    }

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        "Create Account";
    }
  }
}


/* =========================================================
   10. LOGIN
   ========================================================= */

async function login() {
  const email =
    getElement(
      "email"
    )?.value.trim();

  const password =
    getElement(
      "password"
    )?.value.trim();

  const message =
    getElement(
      "authMessage"
    );

  const button =
    getElement(
      "loginBtn"
    );

  if (!email || !password) {
    if (message) {
      message.textContent =
        "Enter your email and password.";

      message.style.color =
        "#ff6b6b";
    }

    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent =
      "Logging in...";
  }

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword(
        {
          email: email,
          password: password
        }
      );

    console.log(
      "LOGIN RESULT:",
      data
    );

    console.log(
      "LOGIN ERROR:",
      error
    );

    if (error) {
      if (message) {
        message.textContent =
          error.message;

        message.style.color =
          "#ff6b6b";
      }

      return;
    }

    currentUser =
      data.user;

    if (message) {
      message.textContent =
        "Login successful!";

      message.style.color =
        "#4ade80";
    }

    await showApp();

  } catch (error) {
    console.error(
      "LOGIN EXCEPTION:",
      error
    );

    if (message) {
      message.textContent =
        error.message ||
        "Login failed.";

      message.style.color =
        "#ff6b6b";
    }

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        "Log In";
    }
  }
}


/* =========================================================
   11. LOGOUT
   ========================================================= */

async function logout() {
  const button =
    getElement(
      "logoutBtn"
    );

  if (button) {
    button.disabled = true;
    button.textContent =
      "Logging out...";
  }

  try {
    const { error } =
      await supabaseClient.auth.signOut();

    if (error) {
      alert(
        error.message ||
        "Unable to log out."
      );

      return;
    }

    currentUser = null;

    stopCurrentCall();

    showAuthScreen();

  } catch (error) {
    console.error(
      "LOGOUT ERROR:",
      error
    );

    alert(
      "Unable to log out."
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        "Log Out";
    }
  }
}

function showAuthScreen() {
  const authScreen =
    getElement(
      "authScreen"
    );

  const app =
    getElement("app");

  if (authScreen) {
    authScreen.classList.remove(
      "hidden"
    );
  }

  if (app) {
    app.classList.add(
      "hidden"
    );
  }

  clearMessage(
    "uploadMessage"
  );

  clearMessage(
    "createMessage"
  );
}


/* =========================================================
   12. APP START
   ========================================================= */

async function showApp() {
  const authScreen =
    getElement(
      "authScreen"
    );

  const app =
    getElement("app");

  if (authScreen) {
    authScreen.classList.add(
      "hidden"
    );
  }

  if (app) {
    app.classList.remove(
      "hidden"
    );
  }

  if (!currentUser) {
    const { data } =
      await supabaseClient.auth.getUser();

    currentUser =
      data?.user || null;
  }

  if (!currentUser) {
    showAuthScreen();
    return;
  }

  showPage("home");

  await loadProfile();

  await loadFeed();

  await loadStories();

  appInitialized = true;

  if (
    interactiveAvatarEnabled
  ) {
    setTimeout(
      showInteractiveAvatar,
      600
    );
  }

  loadNotifications();
}


/* =========================================================
   13. SESSION CHECK
   ========================================================= */

async function checkSession() {
  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) {
      console.error(
        "SESSION ERROR:",
        error
      );

      showAuthScreen();
      return;
    }

    if (
      data?.session?.user
    ) {
      currentUser =
        data.session.user;

      await showApp();
    } else {
      showAuthScreen();
    }

  } catch (error) {
    console.error(
      "CHECK SESSION ERROR:",
      error
    );

    showAuthScreen();
  }
}


/* =========================================================
   14. PROFILE
   ========================================================= */

function showProfileSetup() {
  const setup =
    getElement(
      "profileSetup"
    );

  if (setup) {
    setup.classList.remove(
      "hidden"
    );
  }
}

async function loadProfile() {
  if (!currentUser) return;

  try {
    const { data, error } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,username,display_name,avatar_url,bio,created_at"
        )
        .eq(
          "id",
          currentUser.id
        )
        .maybeSingle();

    if (error) {
      console.error(
        "LOAD PROFILE ERROR:",
        error
      );

      return;
    }

    if (!data) {
      showProfileSetup();
      return;
    }

    const displayNameEl =
      getElement(
        "profileDisplayName"
      );

    if (displayNameEl) {
      displayNameEl.textContent =
        data.display_name ||
        "Vidora User";
    }

    const usernameEl =
      getElement(
        "profileUsername"
      );

    if (usernameEl) {
      usernameEl.textContent =
        data.username
          ? "@" +
            data.username
          : "Set up your username";
    }

    const bioEl =
      getElement(
        "profileBio"
      );

    if (bioEl) {
      bioEl.textContent =
        data.bio ||
        "No bio yet.";
    }

    const emailEl =
      getElement(
        "profileEmail"
      );

    if (emailEl) {
      emailEl.textContent =
        currentUser.email ||
        "";
    }

    const avatarEl =
      getElement(
        "profileAvatar"
      );

    if (avatarEl) {
      renderProfileAvatar(
        avatarEl,
        data.avatar_url,
        data.display_name
      );
    }

    const displayInput =
      getElement(
        "profileDisplayNameInput"
      );

    if (displayInput) {
      displayInput.value =
        data.display_name ||
        "";
    }

    const usernameInput =
      getElement(
        "profileUsernameInput"
      );

    if (usernameInput) {
      usernameInput.value =
        data.username ||
        "";
    }

    const bioInput =
      getElement(
        "profileBioInput"
      );

    if (bioInput) {
      bioInput.value =
        data.bio ||
        "";
    }

    const setup =
      getElement(
        "profileSetup"
      );

    if (setup) {
      setup.classList.add(
        "hidden"
      );
    }

  } catch (error) {
    console.error(
      "LOAD PROFILE EXCEPTION:",
      error
    );
  }
}

async function saveProfile() {
  if (!currentUser) {
    setMessage(
      "profileMessage",
      "Please log in first."
    );

    return;
  }

  const displayName =
    getElement(
      "profileDisplayNameInput"
    )?.value.trim() ||
    "";

  const username =
    getElement(
      "profileUsernameInput"
    )?.value
      .trim()
      .replace(
        /^@/,
        ""
      ) || "";

  const bio =
    getElement(
      "profileBioInput"
    )?.value.trim() ||
    "";

  if (!displayName) {
    setMessage(
      "profileMessage",
      "Please enter a display name."
    );

    return;
  }

  try {
    const { error } =
      await supabaseClient
        .from("profiles")
        .upsert({
          id: currentUser.id,
          display_name:
            displayName,
          username:
            username || null,
          bio: bio,
          updated_at:
            new Date().toISOString()
        });

    if (error) {
      setMessage(
        "profileMessage",
        error.message
      );

      return;
    }

    setMessage(
      "profileMessage",
      "Profile saved!",
      true
    );

    await loadProfile();

  } catch (error) {
    console.error(
      "SAVE PROFILE ERROR:",
      error
    );

    setMessage(
      "profileMessage",
      "Could not save profile."
    );
  }
}


/* =========================================================
   15. MEDIA
   ========================================================= */

function validateMediaFile(file) {
  if (!file) {
    return {
      valid: false,
      message:
        "Please choose a photo or video."
    };
  }

  const isImage =
    file.type.startsWith(
      "image/"
    );

  const isVideo =
    file.type.startsWith(
      "video/"
    );

  if (!isImage && !isVideo) {
    return {
      valid: false,
      message:
        "Only images and videos are allowed."
    };
  }

  const maxSize =
    50 * 1024 * 1024;

  if (file.size > maxSize) {
    return {
      valid: false,
      message:
        "File is too large. Maximum is 50MB."
    };
  }

  return {
    valid: true,
    message: ""
  };
}


/* =========================================================
   16. CREATE POST
   ========================================================= */

async function createPost(
  file,
  caption
) {
  if (!currentUser) {
    return {
      success: false,
      message:
        "You are not logged in."
    };
  }

  const fileName =
    createSafeFileName(file);

  const filePath =
    currentUser.id +
    "/" +
    fileName;

  const mediaType =
    file.type.startsWith(
      "video/"
    )
      ? "video"
      : "image";

  let uploadedPath = null;

  try {
    const {
      error: uploadError
    } =
      await supabaseClient.storage
        .from("media")
        .upload(
          filePath,
          file,
          {
            cacheControl:
              "3600",
            upsert: false,
            contentType:
              file.type
          }
        );

    if (uploadError) {
      return {
        success: false,
        message:
          "Media upload failed: " +
          uploadError.message
      };
    }

    uploadedPath =
      filePath;

    const { data: publicData } =
      supabaseClient.storage
        .from("media")
        .getPublicUrl(
          filePath
        );

    const mediaUrl =
      publicData?.publicUrl;

    if (!mediaUrl) {
      await supabaseClient.storage
        .from("media")
        .remove([
          filePath
        ]);

      return {
        success: false,
        message:
          "Could not create media URL."
      };
    }

    const {
      data,
      error: postError
    } =
      await supabaseClient
        .from("posts")
        .insert({
          user_id:
            currentUser.id,
          media_url:
            mediaUrl,
          media_type:
            mediaType,
          caption:
            caption || "",
          views: 0
        })
        .select()
        .single();

    if (postError) {
      await supabaseClient.storage
        .from("media")
        .remove([
          filePath
        ]);

      return {
        success: false,
        message:
          "Post could not be saved: " +
          postError.message
      };
    }

    return {
      success: true,
      data: data
    };

  } catch (error) {
    console.error(
      "CREATE POST ERROR:",
      error
    );

    if (uploadedPath) {
      try {
        await supabaseClient.storage
          .from("media")
          .remove([
            uploadedPath
          ]);
      } catch (e) {}
    }

    return {
      success: false,
      message:
        "An unexpected error occurred."
    };
  }
}


/* =========================================================
   17. OLD HOME UPLOAD
   ========================================================= */

async function uploadPost() {
  const fileInput =
    getElement("mediaFile");

  const captionInput =
    getElement("postCaption");

  if (!fileInput ||
      !captionInput) {
    return;
  }

  const file =
    fileInput.files[0];

  const caption =
    captionInput.value.trim();

  clearMessage(
    "uploadMessage"
  );

  if (!currentUser) {
    setMessage(
      "uploadMessage",
      "Please log in first."
    );

    return;
  }

  const validation =
    validateMediaFile(file);

  if (!validation.valid) {
    setMessage(
      "uploadMessage",
      validation.message
    );

    return;
  }

  const button =
    document.querySelector(
      '#homeScreen button[onclick="uploadPost()"]'
    );

  if (button) {
    button.disabled = true;
    button.textContent =
      "Uploading...";
  }

  try {
    const result =
      await createPost(
        file,
        caption
      );

    if (!result.success) {
      setMessage(
        "uploadMessage",
        result.message
      );

      return;
    }

    setMessage(
      "uploadMessage",
      "Post published successfully!",
      true
    );

    fileInput.value = "";
    captionInput.value = "";

    await loadFeed();

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        "📤 Publish";
    }
  }
}


/* =========================================================
   18. CREATE PAGE
   ========================================================= */

function previewCreateMedia(event) {
  const file =
    event?.target?.files?.[0];

  const preview =
    getElement(
      "createMediaPreview"
    );

  if (!preview) return;

  preview.innerHTML = "";

  if (!file) return;

  const url =
    URL.createObjectURL(
      file
    );

  if (
    file.type.startsWith(
      "video/"
    )
  ) {
    const video =
      document.createElement(
        "video"
      );

    video.src = url;
    video.controls = true;
    video.playsInline = true;

    preview.appendChild(
      video
    );
  } else {
    const img =
      document.createElement(
        "img"
      );

    img.src = url;
    img.alt = "Preview";

    preview.appendChild(
      img
    );
  }

  selectVidoraFilter(
    selectedVidoraFilter
  );
}

async function publishFromCreate() {
  const fileInput =
    getElement(
      "createFile"
    );

  const captionInput =
    getElement(
      "createCaption"
    );

  if (!fileInput ||
      !captionInput) {
    return;
  }

  const file =
    fileInput.files[0];

  let caption =
    captionInput.value.trim();

  clearMessage(
    "createMessage"
  );

  if (!currentUser) {
    setMessage(
      "createMessage",
      "Please log in first."
    );

    return;
  }

  const validation =
    validateMediaFile(file);

  if (!validation.valid) {
    setMessage(
      "createMessage",
      validation.message
    );

    return;
  }

  if (selectedVidoraSound) {
    caption +=
      (caption
        ? "\n\n"
        : "") +
      "🎵 " +
      selectedVidoraSound.name +
      " — " +
      selectedVidoraSound.artist;
  }

  if (
    selectedVidoraFilter &&
    selectedVidoraFilter !==
      "normal"
  ) {
    caption +=
      (caption
        ? "\n"
        : "") +
      "🎨 Filter: " +
      selectedVidoraFilter;
  }

  const button =
    document.querySelector(
      '#createScreen button[onclick="publishFromCreate()"]'
    );

  if (button) {
    button.disabled = true;
    button.textContent =
      "Publishing...";
  }

  try {
    const result =
      await createPost(
        file,
        caption
      );

    if (!result.success) {
      setMessage(
        "createMessage",
        result.message
      );

      return;
    }

    setMessage(
      "createMessage",
      "Post published successfully!",
      true
    );

    fileInput.value = "";
    captionInput.value = "";

    removeVidoraSound();

    selectVidoraFilter(
      "normal"
    );

    const preview =
      getElement(
        "createMediaPreview"
      );

    if (preview) {
      preview.innerHTML = "";
    }

    await loadFeed();

    setTimeout(
      function () {
        showPage("home");
      },
      700
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        "🚀 Publish to Vidora";
    }
  }
}


/* =========================================================
   19. LOAD FEED
   ========================================================= */

async function loadFeed() {
  if (feedLoading) return;

  feedLoading = true;

  const feed =
    getElement("feed");

  if (!feed) {
    feedLoading = false;
    return;
  }

  feed.innerHTML =
    '<div class="loading">Loading Vidora...</div>';

  try {
    const {
      data,
      error
    } =
      await supabaseClient
        .from("posts")
        .select(
          "id,user_id,media_url,media_type,caption,created_at,views"
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );

    if (error) {
      feed.innerHTML =
        '<div class="loading">' +
        escapeHTML(
          error.message
        ) +
        "</div>";

      return;
    }

    if (
      !data ||
      data.length === 0
    ) {
      feed.innerHTML =
        '<div class="loading">No posts yet.<br>Be the first to publish something!</div>';

      return;
    }

    feed.innerHTML = "";

    for (
      const post of data
    ) {
      const element =
        await createPostElement(
          post
        );

      if (element) {
        feed.appendChild(
          element
        );
      }
    }

  } catch (error) {
    console.error(
      "LOAD FEED ERROR:",
      error
    );

    feed.innerHTML =
      '<div class="loading">Something went wrong while loading Vidora.</div>';

  } finally {
    feedLoading = false;
  }
}


/* =========================================================
   20. POST ELEMENT
   ========================================================= */

async function createPostElement(
  post
) {
  const article =
    document.createElement(
      "article"
    );

  article.className =
    "postCard";

  article.dataset.postId =
    post.id;

  let username =
    "Vidora User";

  let displayName =
    "Vidora User";

  try {
    const { data } =
      await supabaseClient
        .from("profiles")
        .select(
          "username,display_name,avatar_url"
        )
        .eq(
          "id",
          post.user_id
        )
        .maybeSingle();

    if (data) {
      username =
        data.username ||
        data.display_name ||
        username;

      displayName =
        data.display_name ||
        username;
    }
  } catch (e) {}

  const isOwner =
    currentUser &&
    currentUser.id ===
      post.user_id;

  const mediaHTML =
    post.media_type ===
    "video"
      ? '<video src="' +
        escapeHTML(
          post.media_url
        ) +
        '" controls playsinline></video>'
      : '<img src="' +
        escapeHTML(
          post.media_url
        ) +
        '" alt="Post media">';

  const viewsHTML =
    isOwner
      ? '<span class="viewCount">👁️ ' +
        (
          post.views ||
          0
        ) +
        " Views</span>"
      : "";

  article.innerHTML =
    '<div class="postHeader">' +
    "<strong>@" +
    escapeHTML(
      username
    ) +
    "</strong>" +
    "<span>" +
    escapeHTML(
      formatDate(
        post.created_at
      )
    ) +
    "</span>" +
    "</div>" +

    '<div class="postMedia">' +
    mediaHTML +
    "</div>" +

    '<div class="postCaption">' +
    escapeHTML(
      post.caption ||
        ""
    ) +
    "</div>" +

    '<div class="postStats">' +
    '<span class="likeCount">❤️ 0 Likes</span>' +
    '<span class="commentCount">💬 0 Comments</span>' +
    viewsHTML +
    "</div>" +

    '<div class="vidoraPostActions">' +
    '<button type="button" class="vidoraLikeBtn">❤️ Like</button>' +
    '<button type="button" class="vidoraCommentBtn">💬 Comment</button>' +
    '<button type="button" class="vidoraFollowBtn">👤 Follow</button>' +
    '<button type="button" class="vidoraChatBtn">💬 Chat</button>' +
    "</div>" +

    '<div class="vidoraCommentBox hidden">' +
    '<input type="text" class="vidoraCommentInput" maxlength="500" placeholder="Write a comment...">' +
    '<button type="button" class="vidoraSendCommentBtn">Send</button>' +
    '<div class="vidoraCommentsList"></div>' +
    "</div>";

  const likeBtn =
    article.querySelector(
      ".vidoraLikeBtn"
    );

  const commentBtn =
    article.querySelector(
      ".vidoraCommentBtn"
    );

  const followBtn =
    article.querySelector(
      ".vidoraFollowBtn"
    );

  const chatBtn =
    article.querySelector(
      ".vidoraChatBtn"
    );

  const commentBox =
    article.querySelector(
      ".vidoraCommentBox"
    );

  const sendCommentBtn =
    article.querySelector(
      ".vidoraSendCommentBtn"
    );

  const commentInput =
    article.querySelector(
      ".vidoraCommentInput"
    );

  likeBtn.onclick =
    function () {
      togglePostLike(
        post.id,
        article
      );
    };

  commentBtn.onclick =
    async function () {
      commentBox.classList.toggle(
        "hidden"
      );

      if (
        !commentBox.classList.contains(
          "hidden"
        )
      ) {
        await loadPostComments(
          post.id,
          article
        );
      }
    };

  sendCommentBtn.onclick =
    async function () {
      await addPostComment(
        post.id,
        commentInput,
        article
      );
    };

  followBtn.onclick =
    async function () {
      await toggleFollowUser(
        post.user_id,
        followBtn
      );
    };

  chatBtn.onclick =
    function () {
      openChat(
        post.user_id,
        displayName
      );
    };

  await updatePostLikeUI(
    post.id,
    article
  );

  await updateFollowButton(
    post.user_id,
    followBtn
  );

  return article;
}


/* =========================================================
   21. POST LIKES
   ========================================================= */

async function updatePostLikeUI(
  postId,
  article
) {
  if (!article) return;

  try {
    const {
      count
    } =
      await supabaseClient
        .from("post_likes")
        .select(
          "*",
          {
            count:
              "exact",
            head: true
          }
        )
        .eq(
          "post_id",
          postId
        );

    const likeBtn =
      article.querySelector(
        ".vidoraLikeBtn"
      );

    const stat =
      article.querySelector(
        ".likeCount"
      );

    if (stat) {
      stat.textContent =
        "❤️ " +
        (
          count || 0
        ) +
        " Likes";
    }

    if (likeBtn &&
        currentUser) {
      const { data } =
        await supabaseClient
          .from("post_likes")
          .select("id")
          .eq(
            "post_id",
            postId
          )
          .eq(
            "user_id",
            currentUser.id
          )
          .maybeSingle();

      likeBtn.textContent =
        data
          ? "💖 Liked"
          : "❤️ Like";
    }

  } catch (error) {
    console.warn(
      "LIKE UI:",
      error.message
    );
  }
}

async function togglePostLike(
  postId,
  article
) {
  if (!currentUser) {
    alert(
      "Please log in first."
    );

    return;
  }

  try {
    const { data } =
      await supabaseClient
        .from("post_likes")
        .select("id")
        .eq(
          "post_id",
          postId
        )
        .eq(
          "user_id",
          currentUser.id
        )
        .maybeSingle();

    if (data) {
      await supabaseClient
        .from("post_likes")
        .delete()
        .eq(
          "id",
          data.id
        );
    } else {
      await supabaseClient
        .from("post_likes")
        .insert({
          post_id:
            postId,
          user_id:
            currentUser.id
        });
    }

    await updatePostLikeUI(
      postId,
      article
    );

  } catch (error) {
    console.error(
      "LIKE ERROR:",
      error
    );
  }
}


/* =========================================================
   22. COMMENTS
   ========================================================= */

async function loadPostComments(
  postId,
  article
) {
  const list =
    article.querySelector(
      ".vidoraCommentsList"
    );

  if (!list) return;

  list.innerHTML =
    "<div>Loading comments...</div>";

  try {
    const {
      data,
      error
    } =
      await supabaseClient
        .from("post_comments")
        .select(
          "id,user_id,content,created_at"
        )
        .eq(
          "post_id",
          postId
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        );

    if (error) {
      list.innerHTML =
        "<div>" +
        escapeHTML(
          error.message
        ) +
        "</div>";

      return;
    }

    list.innerHTML = "";

    if (
      !data ||
      data.length === 0
    ) {
      list.innerHTML =
        "<div>No comments yet.</div>";

      return;
    }

    for (
      const comment of data
    ) {
      const item =
        document.createElement(
          "div"
        );

      item.className =
        "vidoraCommentItem";

      const mine =
        currentUser &&
        currentUser.id ===
          comment.user_id;

      item.innerHTML =
        "<span>" +
        escapeHTML(
          comment.content
        ) +
        "</span>" +
        (
          mine
            ? '<button type="button">Delete</button>'
            : ""
        );

      if (mine) {
        item
          .querySelector(
            "button"
          )
          .onclick =
          async function () {
            await deletePostComment(
              comment.id,
              postId,
              article
            );
          };
      }

      list.appendChild(
        item
      );
    }

  } catch (error) {
    list.innerHTML =
      "<div>Could not load comments.</div>";
  }
}

async function addPostComment(
  postId,
  input,
  article
) {
  if (!currentUser) {
    alert(
      "Please log in first."
    );

    return;
  }

  const content =
    input.value.trim();

  if (!content) return;

  try {
    const { error } =
      await supabaseClient
        .from("post_comments")
        .insert({
          post_id:
            postId,
          user_id:
            currentUser.id,
          content:
            content
        });

    if (error) {
      alert(
        error.message
      );

      return;
    }

    input.value = "";

    await loadPostComments(
      postId,
      article
    );

  } catch (error) {
    console.error(
      "COMMENT ERROR:",
      error
    );
  }
}

async function deletePostComment(
  commentId,
  postId,
  article
) {
  try {
    const { error } =
      await supabaseClient
        .from("post_comments")
        .delete()
        .eq(
          "id",
          commentId
        );

    if (error) {
      alert(
        error.message
      );

      return;
    }

    await loadPostComments(
      postId,
      article
    );

  } catch (error) {
    console.error(
      "DELETE COMMENT ERROR:",
      error
    );
  }
}


/* =========================================================
   23. DELETE OWN POST
   ========================================================= */

async function deleteOwnPost(
  postId
) {
  if (!currentUser) {
    return;
  }

  const confirmed =
    confirm(
      "Delete this post?"
    );

  if (!confirmed) {
    return;
  }

  try {
    const {
      data: post
    } =
      await supabaseClient
        .from("posts")
        .select(
          "id,user_id,media_url"
        )
        .eq(
          "id",
          postId
        )
        .single();

    if (!post) return;

    if (
      post.user_id !==
      currentUser.id
    ) {
      alert(
        "You can only delete your own posts."
      );

      return;
    }

    const { error } =
      await supabaseClient
        .from("posts")
        .delete()
        .eq(
          "id",
          postId
        );

    if (error) {
      alert(
        error.message
      );

      return;
    }

    await loadFeed();

  } catch (error) {
    console.error(
      "DELETE POST ERROR:",
      error
    );
  }
}


/* =========================================================
   24. FOLLOW SYSTEM
   ========================================================= */

async function updateFollowButton(
  userId,
  button
) {
  if (
    !button ||
    !currentUser ||
    userId ===
      currentUser.id
  ) {
    if (
      button &&
      userId ===
        currentUser?.id
    ) {
      button.classList.add(
        "hidden"
      );
    }

    return;
  }

  try {
    const { data } =
      await supabaseClient
        .from("follows")
        .select("id")
        .eq(
          "follower_id",
          currentUser.id
        )
        .eq(
          "following_id",
          userId
        )
        .maybeSingle();

    button.textContent =
      data
        ? "✓ Following"
        : "👤 Follow";

  } catch (error) {}
}

async function toggleFollowUser(
  userId,
  button
) {
  if (!currentUser) {
    alert(
      "Please log in first."
    );

    return;
  }

  if (
    userId ===
    currentUser.id
  ) {
    return;
  }

  try {
    const { data } =
      await supabaseClient
        .from("follows")
        .select("id")
        .eq(
          "follower_id",
          currentUser.id
        )
        .eq(
          "following_id",
          userId
        )
        .maybeSingle();

    if (data) {
      await supabaseClient
        .from("follows")
        .delete()
        .eq(
          "id",
          data.id
        );
    } else {
      await supabaseClient
        .from("follows")
        .insert({
          follower_id:
            currentUser.id,
          following_id:
            userId
        });
    }

    await updateFollowButton(
      userId,
      button
    );

  } catch (error) {
    console.error(
      "FOLLOW ERROR:",
      error
    );
  }
}


/* =========================================================
   25. BLOCK USERS
   ========================================================= */

async function blockVidoraUser(
  userId
) {
  if (!currentUser) return;

  if (
    userId ===
    currentUser.id
  ) {
    return;
  }

  const confirmed =
    confirm(
      "Block this Vidora user?"
    );

  if (!confirmed) return;

  try {
    const { error } =
      await supabaseClient
        .from("blocked_users")
        .upsert({
          blocker_id:
            currentUser.id,
          blocked_id:
            userId
        });

    if (error) {
      alert(
        error.message
      );

      return;
    }

    alert(
      "User blocked."
    );

    await loadFeed();

  } catch (error) {
    console.error(
      "BLOCK ERROR:",
      error
    );
  }
}

async function unblockVidoraUser(
  userId
) {
  if (!currentUser) return;

  try {
    await supabaseClient
      .from("blocked_users")
      .delete()
      .eq(
        "blocker_id",
        currentUser.id
      )
      .eq(
        "blocked_id",
        userId
      );
  } catch (error) {
    console.error(
      "UNBLOCK ERROR:",
      error
    );
  }
}


/* =========================================================
   26. CHAT
   ========================================================= */

function createChatPanel() {
  if (
    getElement(
      "vidoraChatPanel"
    )
  ) {
    return;
  }

  const panel =
    document.createElement(
      "div"
    );

  panel.id =
    "vidoraChatPanel";

  panel.className =
    "vidoraFloatingPanel hidden";

  panel.innerHTML =
    '<div class="vidoraChatHeader">' +
    '<strong id="vidoraChatTitle">Chat</strong>' +
    '<button type="button" id="closeVidoraChat">✕</button>' +
    "</div>" +

    '<div id="vidoraChatMessages" class="vidoraChatMessages"></div>' +

    '<div class="vidoraChatInputRow">' +
    '<input id="vidoraChatInput" type="text" maxlength="1000" placeholder="Message...">' +
    '<button type="button" id="sendVidoraChat">Send</button>' +
    '<button type="button" id="recordVoiceNote">🎤</button>' +
    "</div>";

  document.body.appendChild(
    panel
  );

  getElement(
    "closeVidoraChat"
  ).onclick =
    closeChat;

  getElement(
    "sendVidoraChat"
  ).onclick =
    sendChatMessage;

  getElement(
    "recordVoiceNote"
  ).onclick =
    toggleVoiceRecording;
}

async function openChat(
  userId,
  displayName
) {
  if (!currentUser) {
    alert(
      "Please log in first."
    );

    return;
  }

  if (
    userId ===
    currentUser.id
  ) {
    return;
  }

  createChatPanel();

  currentChatUser = {
    id: userId,
    name:
      displayName ||
      "Vidora User"
  };

  const panel =
    getElement(
      "vidoraChatPanel"
    );

  const title =
    getElement(
      "vidoraChatTitle"
    );

  if (title) {
    title.textContent =
      "Chat with " +
      currentChatUser.name;
  }

  panel.classList.remove(
    "hidden"
  );

  await loadChatMessages();
}

function closeChat() {
  const panel =
    getElement(
      "vidoraChatPanel"
    );

  if (panel) {
    panel.classList.add(
      "hidden"
    );
  }

  currentChatUser =
    null;
}

async function loadChatMessages() {
  if (
    !currentUser ||
    !currentChatUser
  ) {
    return;
  }

  const box =
    getElement(
      "vidoraChatMessages"
    );

  if (!box) return;

  try {
    const {
      data,
      error
    } =
      await supabaseClient
        .from("messages")
        .select(
          "id,sender_id,receiver_id,content,voice_url,created_at"
        )
        .or(
          "and(sender_id.eq." +
            currentUser.id +
            ",receiver_id.eq." +
            currentChatUser.id +
            "),and(sender_id.eq." +
            currentChatUser.id +
            ",receiver_id.eq." +
            currentUser.id +
            ")"
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        );

    if (error) {
      box.innerHTML =
        "<div>" +
        escapeHTML(
          error.message
        ) +
        "</div>";

      return;
    }

    box.innerHTML = "";

    (data || []).forEach(
      function (message) {
        const row =
          document.createElement(
            "div"
          );

        row.className =
          message.sender_id ===
          currentUser.id
            ? "vidoraMessage mine"
            : "vidoraMessage";

        if (
          message.voice_url
        ) {
          row.innerHTML =
            '<audio controls src="' +
            escapeHTML(
              message.voice_url
            ) +
            '"></audio>';
        } else {
          row.textContent =
            message.content ||
            "";
        }

        box.appendChild(
          row
        );
      }
    );

    box.scrollTop =
      box.scrollHeight;

  } catch (error) {
    console.error(
      "LOAD CHAT ERROR:",
      error
    );
  }
}

async function sendChatMessage() {
  if (
    !currentUser ||
    !currentChatUser
  ) {
    return;
  }

  const input =
    getElement(
      "vidoraChatInput"
    );

  const content =
    input?.value.trim();

  if (!content) return;

  try {
    const { error } =
      await supabaseClient
        .from("messages")
        .insert({
          sender_id:
            currentUser.id,
          receiver_id:
            currentChatUser.id,
          content:
            content
        });

    if (error) {
      alert(
        error.message
      );

      return;
    }

    input.value = "";

    await loadChatMessages();

  } catch (error) {
    console.error(
      "SEND CHAT ERROR:",
      error
    );
  }
}


/* =========================================================
   27. VOICE NOTES
   ========================================================= */

let voiceRecorder = null;
let voiceChunks = [];
let voiceRecording = false;

async function toggleVoiceRecording() {
  if (voiceRecording) {
    stopVoiceRecording();
    return;
  }

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    alert(
      "Voice recording is not supported here."
    );

    return;
  }

  try {
    const stream =
      await navigator.mediaDevices.getUserMedia(
        {
          audio: true
        }
      );

    voiceChunks = [];

    voiceRecorder =
      new MediaRecorder(
        stream
      );

    voiceRecorder.ondataavailable =
      function (event) {
        if (
          event.data.size >
          0
        ) {
          voiceChunks.push(
            event.data
          );
        }
      };

    voiceRecorder.onstop =
      async function () {
        stream
          .getTracks()
          .forEach(
            function (track) {
              track.stop();
            }
          );

        const blob =
          new Blob(
            voiceChunks,
            {
              type:
                "audio/webm"
            }
          );

        await sendVoiceNote(
          blob
        );
      };

    voiceRecorder.start();

    voiceRecording =
      true;

    const button =
      getElement(
        "recordVoiceNote"
      );

    if (button) {
      button.textContent =
        "⏹️";
    }

  } catch (error) {
    console.error(
      "VOICE RECORD ERROR:",
      error
    );

    alert(
      "Microphone permission is required."
    );
  }
}

function stopVoiceRecording() {
  if (
    voiceRecorder &&
    voiceRecorder.state !==
      "inactive"
  ) {
    voiceRecorder.stop();
  }

  voiceRecording =
    false;

  const button =
    getElement(
      "recordVoiceNote"
    );

  if (button) {
    button.textContent =
      "🎤";
  }
}

async function sendVoiceNote(
  blob
) {
  if (
    !currentUser ||
    !currentChatUser
  ) {
    return;
  }

  try {
    const path =
      "voice/" +
      currentUser.id +
      "/" +
      Date.now() +
      ".webm";

    const {
      error: uploadError
    } =
      await supabaseClient.storage
        .from("media")
        .upload(
          path,
          blob,
          {
            contentType:
              "audio/webm",
            upsert: false
          }
        );

    if (uploadError) {
      alert(
        uploadError.message
      );

      return;
    }

    const { data } =
      supabaseClient.storage
        .from("media")
        .getPublicUrl(
          path
        );

    const voiceUrl =
      data?.publicUrl;

    if (!voiceUrl) {
      return;
    }

    const { error } =
      await supabaseClient
        .from("messages")
        .insert({
          sender_id:
            currentUser.id,
          receiver_id:
            currentChatUser.id,
          content: "",
          voice_url:
            voiceUrl
        });

    if (error) {
      alert(
        error.message
      );

      return;
    }

    await loadChatMessages();

  } catch (error) {
    console.error(
      "VOICE NOTE ERROR:",
      error
    );
  }
}


/* =========================================================
   28. VOICE EFFECTS
   ========================================================= */

async function applyVoiceEffect(
  blob,
  effect
) {
  /*
    Browser voice effects are basic effects,
    not AI voice cloning.
  */

  if (!blob) {
    return null;
  }

  return blob;
}


/* =========================================================
   29. VIDEO / VOICE CALL UI
   ========================================================= */

function createCallUI() {
  if (
    getElement(
      "vidoraCallOverlay"
    )
  ) {
    return;
  }

  const overlay =
    document.createElement(
      "div"
    );

  overlay.id =
    "vidoraCallOverlay";

  overlay.className =
    "vidoraCallOverlay hidden";

  overlay.innerHTML =
    '<div class="vidoraCallBox">' +

    '<div class="vidoraCallHeader">' +
    '<strong id="vidoraCallName">Vidora Call</strong>' +
    "</div>" +

    '<div class="vidoraRemoteWrap">' +
    '<video id="vidoraRemoteVideo" autoplay playsinline></video>' +
    '<div id="vidoraHologramGlow"></div>' +
    "</div>" +

    '<video id="vidoraLocalVideo" autoplay muted playsinline></video>' +

    '<div class="vidoraCallButtons">' +
    '<button type="button" id="toggleCallMute">🎤</button>' +
    '<button type="button" id="toggleCallCamera">📹</button>' +
    '<button type="button" id="toggleHologram">✨</button>' +
    '<button type="button" id="endVidoraCall">🔴</button>' +
    "</div>" +

    "</div>";

  document.body.appendChild(
    overlay
  );

  getElement(
    "endVidoraCall"
  ).onclick =
    endVidoraCall;

  getElement(
    "toggleCallMute"
  ).onclick =
    toggleCallMute;

  getElement(
    "toggleCallCamera"
  ).onclick =
    toggleCallCamera;

  getElement(
    "toggleHologram"
  ).onclick =
    toggleHologramEffect;
}

async function startVoiceCall(
  userId,
  name
) {
  return startVidoraCall(
    userId,
    name,
    false
  );
}

async function startVideoCall(
  userId,
  name
) {
  return startVidoraCall(
    userId,
    name,
    true
  );
}

async function startVidoraCall(
  userId,
  name,
  videoEnabled
) {
  if (!currentUser) {
    alert(
      "Please log in first."
    );

    return;
  }

  if (
    userId ===
    currentUser.id
  ) {
    return;
  }

  createCallUI();

  const overlay =
    getElement(
      "vidoraCallOverlay"
    );

  const title =
    getElement(
      "vidoraCallName"
    );

  if (title) {
    title.textContent =
      name ||
      "Vidora User";
  }

  overlay.classList.remove(
    "hidden"
  );

  try {
    localStream =
      await navigator.mediaDevices.getUserMedia(
        {
          audio: true,
          video:
            !!videoEnabled
        }
      );

    const localVideo =
      getElement(
        "vidoraLocalVideo"
      );

    if (localVideo) {
      localVideo.srcObject =
        localStream;

      if (!videoEnabled) {
        localVideo.classList.add(
          "hidden"
        );
      }
    }

    peerConnection =
      new RTCPeerConnection(
        {
          iceServers: [
            {
              urls:
                "stun:stun.l.google.com:19302"
            }
          ]
        }
      );

    localStream
      .getTracks()
      .forEach(
        function (track) {
          peerConnection.addTrack(
            track,
            localStream
          );
        }
      );

    peerConnection.ontrack =
      function (event) {
        remoteStream =
          event.streams[0];

        const remoteVideo =
          getElement(
            "vidoraRemoteVideo"
          );

        if (remoteVideo) {
          remoteVideo.srcObject =
            remoteStream;
        }
      };

    peerConnection.onicecandidate =
      async function (event) {
        if (
          event.candidate
        ) {
          await sendCallSignal({
            type:
              "candidate",
            target:
              userId,
            candidate:
              event.candidate
          });
        }
      };

    const offer =
      await peerConnection.createOffer();

    await peerConnection.setLocalDescription(
      offer
    );

    await sendCallSignal({
      type:
        "offer",
      target:
        userId,
      offer:
        offer,
      video:
        videoEnabled
    });

    currentCall = {
      userId:
        userId,
      video:
        videoEnabled
    };

  } catch (error) {
    console.error(
      "CALL ERROR:",
      error
    );

    alert(
      "Camera/microphone permission is required."
    );

    stopCurrentCall();
  }
}


/* =========================================================
   30. WEBRTC SIGNALING
   ========================================================= */

let callChannel = null;

function initializeCallSignaling() {
  if (
    !currentUser ||
    callChannel
  ) {
    return;
  }

  callChannel =
    supabaseClient
      .channel(
        "vidora-call-" +
        currentUser.id
      )
      .on(
        "broadcast",
        {
          event:
            "call-signal"
        },
        function (payload) {
          handleCallSignal(
            payload.payload
          );
        }
      )
      .subscribe();
}

async function sendCallSignal(
  signal
) {
  if (
    !currentUser
  ) {
    return;
  }

  initializeCallSignaling();

  if (!callChannel) {
    return;
  }

  await callChannel.send({
    type:
      "broadcast",
    event:
      "call-signal",
    payload: {
      sender:
        currentUser.id,
      target:
        signal.target,
      data:
        signal
    }
  });
}

async function handleCallSignal(
  payload
) {
  if (
    !payload ||
    !currentUser
  ) {
    return;
  }

  if (
    payload.target !==
    currentUser.id
  ) {
    return;
  }

  const signal =
    payload.data;

  if (!signal) {
    return;
  }

  createCallUI();

  if (
    signal.type ===
    "offer"
  ) {
    const accepted =
      confirm(
        "Incoming Vidora call. Accept?"
      );

    if (!accepted) {
      return;
    }

    try {
      localStream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
            video:
              !!signal.video
          }
        );

      peerConnection =
        new RTCPeerConnection({
          iceServers: [
            {
              urls:
                "stun:stun.l.google.com:19302"
            }
          ]
        });

      localStream
        .getTracks()
        .forEach(
          function (track) {
            peerConnection.addTrack(
              track,
              localStream
            );
          }
        );

      peerConnection.ontrack =
        function (event) {
          remoteStream =
            event.streams[0];

          const video =
            getElement(
              "vidoraRemoteVideo"
            );

          if (video) {
            video.srcObject =
              remoteStream;
          }
        };

      peerConnection.onicecandidate =
        function (event) {
          if (
            event.candidate
          ) {
            sendCallSignal({
              type:
                "candidate",
              target:
                payload.sender,
              candidate:
                event.candidate
            });
          }
        };

      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(
          signal.offer
        )
      );

      const answer =
        await peerConnection.createAnswer();

      await peerConnection.setLocalDescription(
        answer
      );

      await sendCallSignal({
        type:
          "answer",
        target:
          payload.sender,
        answer:
          answer
      });

      const overlay =
        getElement(
          "vidoraCallOverlay"
        );

      if (overlay) {
        overlay.classList.remove(
          "hidden"
        );
      }

    } catch (error) {
      console.error(
        "ACCEPT CALL ERROR:",
        error
      );
    }

  } else if (
    signal.type ===
    "answer"
  ) {
    if (!peerConnection) {
      return;
    }

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(
        signal.answer
      )
    );

  } else if (
    signal.type ===
    "candidate"
  ) {
    if (
      peerConnection &&
      signal.candidate
    ) {
      try {
        await peerConnection.addIceCandidate(
          new RTCIceCandidate(
            signal.candidate
          )
        );
      } catch (error) {
        console.error(
          "ICE ERROR:",
          error
        );
      }
    }
  }
}


/* =========================================================
   31. CALL CONTROLS
   ========================================================= */

function toggleCallMute() {
  if (!localStream) return;

  localStream
    .getAudioTracks()
    .forEach(
      function (track) {
        track.enabled =
          !track.enabled;
      }
    );
}

function toggleCallCamera() {
  if (!localStream) return;

  localStream
    .getVideoTracks()
    .forEach(
      function (track) {
        track.enabled =
          !track.enabled;
      }
    );
}

function toggleHologramEffect() {
  const glow =
    getElement(
      "vidoraHologramGlow"
    );

  const video =
    getElement(
      "vidoraRemoteVideo"
    );

  if (!glow || !video) {
    return;
  }

  glow.classList.toggle(
    "active"
  );

  video.classList.toggle(
    "hologramVideo"
  );
}

function endVidoraCall() {
  stopCurrentCall();
}

function stopCurrentCall() {
  if (localStream) {
    localStream
      .getTracks()
      .forEach(
        function (track) {
          track.stop();
        }
      );

    localStream = null;
  }

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  remoteStream = null;
  currentCall = null;

  const overlay =
    getElement(
      "vidoraCallOverlay"
    );

  if (overlay) {
    overlay.classList.add(
      "hidden"
    );
  }
}


/* =========================================================
   32. STORIES
   ========================================================= */

function openStoryCreator() {
  const creator =
    getElement(
      "storyCreator"
    );

  if (!creator) return;

  creator.classList.remove(
    "hidden"
  );

  const input =
    getElement(
      "storyFileInput"
    );

  const preview =
    getElement(
      "storyPreview"
    );

  const publishButton =
    getElement(
      "publishStoryButton"
    );

  if (input) {
    input.value = "";
  }

  if (preview) {
    preview.innerHTML = "";
  }

  if (publishButton) {
    publishButton.classList.add(
      "hidden"
    );
  }

  selectedStoryFile =
    null;
}

function closeStoryCreator() {
  const creator =
    getElement(
      "storyCreator"
    );

  if (creator) {
    creator.classList.add(
      "hidden"
    );
  }

  selectedStoryFile =
    null;
}

function handleStoryFile(
  event
) {
  const file =
    event.target.files?.[0];

  if (!file) return;

  const validation =
    validateMediaFile(file);

  if (!validation.valid) {
    showStoryMessage(
      validation.message
    );

    return;
  }

  selectedStoryFile =
    file;

  const preview =
    getElement(
      "storyPreview"
    );

  const publishButton =
    getElement(
      "publishStoryButton"
    );

  if (!preview) return;

  preview.innerHTML = "";

  const url =
    URL.createObjectURL(
      file
    );

  if (
    file.type.startsWith(
      "video/"
    )
  ) {
    const video =
      document.createElement(
        "video"
      );

    video.src = url;
    video.controls = true;
    video.muted = true;
    video.playsInline = true;

    preview.appendChild(
      video
    );
  } else {
    const image =
      document.createElement(
        "img"
      );

    image.src = url;
    image.alt =
      "Story preview";

    preview.appendChild(
      image
    );
  }

  if (publishButton) {
    publishButton.classList.remove(
      "hidden"
    );
  }

  showStoryMessage("");
}

async function publishStory() {
  if (!currentUser) {
    showStoryMessage(
      "Please log in first."
    );

    return;
  }

  if (!selectedStoryFile) {
    showStoryMessage(
      "Choose a photo or video first."
    );

    return;
  }

  const button =
    getElement(
      "publishStoryButton"
    );

  try {
    if (button) {
      button.disabled = true;
      button.textContent =
        "Uploading...";
    }

    const extension =
      getFileExtension(
        selectedStoryFile
      );

    const filePath =
      "stories/" +
      currentUser.id +
      "/" +
      Date.now() +
      "." +
      extension;

    const {
      error: uploadError
    } =
      await supabaseClient.storage
        .from("media")
        .upload(
          filePath,
          selectedStoryFile,
          {
            cacheControl:
              "3600",
            upsert: false,
            contentType:
              selectedStoryFile.type
          }
        );

    if (uploadError) {
      throw uploadError;
    }

    const { data } =
      supabaseClient.storage
        .from("media")
        .getPublicUrl(
          filePath
        );

    const mediaUrl =
      data?.publicUrl;

    if (!mediaUrl) {
      throw new Error(
        "Could not create media URL."
      );
    }

    const mediaType =
      selectedStoryFile.type.startsWith(
        "video/"
      )
        ? "video"
        : "image";

    const {
      error: storyError
    } =
      await supabaseClient
        .from("stories")
        .insert({
          user_id:
            currentUser.id,
          media_url:
            mediaUrl,
          media_type:
            mediaType
        });

    if (storyError) {
      throw storyError;
    }

    showStoryMessage(
      "Story shared successfully! 🎉"
    );

    selectedStoryFile =
      null;

    setTimeout(
      async function () {
        closeStoryCreator();
        await loadStories();
      },
      700
    );

  } catch (error) {
    console.error(
      "STORY UPLOAD ERROR:",
      error
    );

    showStoryMessage(
      "Story could not be uploaded: " +
      (
        error.message ||
        "Unknown error"
      )
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent =
        "🚀 Share to Story";
    }
  }
}

function showStoryMessage(
  message
) {
  const element =
    getElement(
      "storyMessage"
    );

  if (element) {
    element.textContent =
      message || "";
  }
}

async function loadStories() {
  const container =
    getElement(
      "otherStories"
    );

  if (!container) return;

  try {
    const cutoff =
      new Date(
        Date.now() -
        24 *
          60 *
          60 *
          1000
      ).toISOString();

    const {
      data,
      error
    } =
      await supabaseClient
        .from("stories")
        .select(
          `
          id,
          user_id,
          media_url,
          media_type,
          created_at,
          profiles:user_id (
            username,
            display_name,
            avatar_url
          )
          `
        )
        .gte(
          "created_at",
          cutoff
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        );

    if (error) {
      throw error;
    }

    vidoraStories =
      data || [];

    renderStories();

  } catch (error) {
    console.error(
      "LOAD STORIES ERROR:",
      error
    );
  }
}

function renderStories() {
  const container =
    getElement(
      "otherStories"
    );

  if (!container) return;

  container.innerHTML = "";

  const users = {};

  vidoraStories.forEach(
    function (story) {
      if (
        !users[
          story.user_id
        ]
      ) {
        users[
          story.user_id
        ] = [];
      }

      users[
        story.user_id
      ].push(
        story
      );
    }
  );

  Object.keys(users)
    .forEach(
      function (userId) {
        const stories =
          users[userId];

        const firstStory =
          stories[0];

        const profile =
          firstStory.profiles ||
          {};

        const name =
          profile.display_name ||
          profile.username ||
          "Vidora User";

        const button =
          document.createElement(
            "button"
          );

        button.type =
          "button";

        button.className =
          "storyItem hasStory";

        button.onclick =
          function () {
            const index =
              vidoraStories.indexOf(
                firstStory
              );

            openStory(index);
          };

        const avatar =
          document.createElement(
            "div"
          );

        avatar.className =
          "storyAvatar";

        if (
          profile.avatar_url
        ) {
          const image =
            document.createElement(
              "img"
            );

          image.src =
            profile.avatar_url;

          image.alt =
            name;

          avatar.appendChild(
            image
          );
        } else {
          avatar.textContent =
            name
              .charAt(0)
              .toUpperCase();
        }

        const nameElement =
          document.createElement(
            "span"
          );

        nameElement.className =
          "storyName";

        nameElement.textContent =
          name;

        button.appendChild(
          avatar
        );

        button.appendChild(
          nameElement
        );

        container.appendChild(
          button
        );
      }
    );
}

function openStory(index) {
  if (
    index < 0 ||
    index >=
      vidoraStories.length
  ) {
    return;
  }

  currentStoryIndex =
    index;

  currentStory =
    vidoraStories[index];

  showCurrentStory();
}

function showCurrentStory() {
  if (!currentStory) {
    return;
  }

  clearTimeout(
    storyTimer
  );

  let content =
    getElement(
      "storyViewerContent"
    );

  if (!content) {
    createStoryViewer();
    content =
      getElement(
        "storyViewerContent"
      );
  }

  if (!content) return;

  const viewer =
    getElement(
      "storyViewer"
    );

  if (viewer) {
    viewer.classList.remove(
      "hidden"
    );
  }

  content.innerHTML = "";

  const profile =
    currentStory.profiles ||
    {};

  const name =
    profile.display_name ||
    profile.username ||
    "Vidora User";

  const nameElement =
    getElement(
      "storyViewerName"
    );

  if (nameElement) {
    nameElement.textContent =
      name;
  }

  const timeElement =
    getElement(
      "storyViewerTime"
    );

  if (timeElement) {
    timeElement.textContent =
      getStoryAge(
        currentStory.created_at
      );
  }

  if (
    currentStory.media_type ===
    "video"
  ) {
    const video =
      document.createElement(
        "video"
      );

    video.src =
      currentStory.media_url;

    video.autoplay = true;
    video.playsInline = true;
    video.controls = true;

    video.onended =
      nextStory;

    content.appendChild(
      video
    );

  } else {
    const image =
      document.createElement(
        "img"
      );

    image.src =
      currentStory.media_url;

    image.alt =
      "Vidora Story";

    content.appendChild(
      image
    );

    storyTimer =
      setTimeout(
        nextStory,
        VIDORA_STORY_DURATION
      );
  }

  recordStoryView(
    currentStory.id
  );
}

function createStoryViewer() {
  if (
    getElement(
      "storyViewer"
    )
  ) {
    return;
  }

  const viewer =
    document.createElement(
      "div"
    );

  viewer.id =
    "storyViewer";

  viewer.className =
    "storyViewer hidden";

  viewer.innerHTML =
    '<div class="storyViewerHeader">' +
    '<strong id="storyViewerName">Story</strong>' +
    '<span id="storyViewerTime"></span>' +
    '<button id="closeStoryViewerBtn" type="button">✕</button>' +
    "</div>" +

    '<div id="storyViewerContent"></div>' +

    '<button id="storyPreviousBtn" type="button">‹</button>' +
    '<button id="storyNextBtn" type="button">›</button>';

  document.body.appendChild(
    viewer
  );

  getElement(
    "closeStoryViewerBtn"
  ).onclick =
    closeStoryViewer;

  getElement(
    "storyPreviousBtn"
  ).onclick =
    previousStory;

  getElement(
    "storyNextBtn"
  ).onclick =
    nextStory;
}

function nextStory() {
  clearTimeout(
    storyTimer
  );

  if (
    currentStoryIndex <
    vidoraStories.length -
      1
  ) {
    currentStoryIndex++;

    currentStory =
      vidoraStories[
        currentStoryIndex
      ];

    showCurrentStory();
  } else {
    closeStoryViewer();
  }
}

function previousStory() {
  clearTimeout(
    storyTimer
  );

  if (
    currentStoryIndex >
    0
  ) {
    currentStoryIndex--;

    currentStory =
      vidoraStories[
        currentStoryIndex
      ];

    showCurrentStory();
  }
}

function closeStoryViewer() {
  clearTimeout(
    storyTimer
  );

  const viewer =
    getElement(
      "storyViewer"
    );

  if (viewer) {
    viewer.classList.add(
      "hidden"
    );
  }

  currentStory =
    null;
}

async function recordStoryView(
  storyId
) {
  if (
    !currentUser ||
    !storyId
  ) {
    return;
  }

  if (
    currentStory &&
    currentStory.user_id ===
      currentUser.id
  ) {
    return;
  }

  try {
    await supabaseClient
      .from("story_views")
      .upsert(
        {
          story_id:
            storyId,
          viewer_id:
            currentUser.id
        },
        {
          onConflict:
            "story_id,viewer_id"
        }
      );
  } catch (error) {
    console.error(
      "STORY VIEW ERROR:",
      error
    );
  }
}

function getStoryAge(
  dateString
) {
  const seconds =
    Math.floor(
      (
        Date.now() -
        new Date(
          dateString
        ).getTime()
      ) / 1000
    );

  if (seconds < 60) {
    return "Just now";
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  if (minutes < 60) {
    return minutes + "m";
  }

  return (
    Math.floor(
      minutes / 60
    ) + "h"
  );
}


/* =========================================================
   33. STORY LIKES
   ========================================================= */

async function likeStory(
  storyId
) {
  if (!currentUser) return;

  try {
    const { data } =
      await supabaseClient
        .from("story_likes")
        .select("id")
        .eq(
          "story_id",
          storyId
        )
        .eq(
          "user_id",
          currentUser.id
        )
        .maybeSingle();

    if (data) {
      await supabaseClient
        .from("story_likes")
        .delete()
        .eq(
          "id",
          data.id
        );
    } else {
      await supabaseClient
        .from("story_likes")
        .insert({
          story_id:
            storyId,
          user_id:
            currentUser.id
        });
    }

  } catch (error) {
    console.error(
      "STORY LIKE ERROR:",
      error
    );
  }
}


/* =========================================================
   34. DELETE OWN STORY
   ========================================================= */

async function deleteOwnStory(
  storyId
) {
  if (!currentUser) return;

  const confirmed =
    confirm(
      "Delete this story?"
    );

  if (!confirmed) return;

  try {
    const {
      data,
      error
    } =
      await supabaseClient
        .from("stories")
        .select(
          "id,user_id"
        )
        .eq(
          "id",
          storyId
        )
        .single();

    if (error) {
      alert(
        error.message
      );

      return;
    }

    if (
      data.user_id !==
      currentUser.id
    ) {
      alert(
        "You can only delete your own story."
      );

      return;
    }

    await supabaseClient
      .from("stories")
      .delete()
      .eq(
        "id",
        storyId
      );

    closeStoryViewer();

    await loadStories();

  } catch (error) {
    console.error(
      "DELETE STORY ERROR:",
      error
    );
  }
}


/* =========================================================
   35. SOUNDS
   ========================================================= */

const VIDORA_SOUNDS = [
  {
    id:
      "neon-drive",
    name:
      "Neon Drive",
    artist:
      "Vidora Beats",
    type:
      "trending",
    audioUrl:
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },

  {
    id:
      "night-pulse",
    name:
      "Night Pulse",
    artist:
      "Aether",
    type:
      "trending",
    audioUrl:
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },

  {
    id:
      "soft-glow",
    name:
      "Soft Glow",
    artist:
      "Luna Wave",
    type:
      "chill",
    audioUrl:
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },

  {
    id:
      "bass-room",
    name:
      "Bass Room",
    artist:
      "Rex Audio",
    type:
      "beats",
    audioUrl:
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },

  {
    id:
      "heat-check",
    name:
      "Heat Check",
    artist:
      "Pixel Lab",
    type:
      "beats",
    audioUrl:
      "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  }
];

function stopVidoraSound() {
  if (vidoraAudioPlayer) {
    try {
      vidoraAudioPlayer.pause();
      vidoraAudioPlayer.src =
        "";
    } catch (e) {}

    vidoraAudioPlayer =
      null;
  }
}

function playVidoraSound(
  soundId
) {
  const sound =
    VIDORA_SOUNDS.find(
      function (s) {
        return (
          s.id === soundId
        );
      }
    );

  if (
    !sound ||
    !sound.audioUrl
  ) {
    return;
  }

  stopVidoraSound();

  const audio =
    new Audio(
      sound.audioUrl
    );

  audio.volume = 1;

  vidoraAudioPlayer =
    audio;

  audio.play().catch(
    function (error) {
      console.error(
        "PLAY SOUND ERROR:",
        error
      );
    }
  );
}

function selectVidoraSound(
  soundId
) {
  selectedVidoraSound =
    VIDORA_SOUNDS.find(
      function (s) {
        return (
          s.id ===
          soundId
        );
      }
    ) || null;

  const wrap =
    getElement(
      "selectedVidoraSound"
    );

  const nameEl =
    getElement(
      "selectedSoundName"
    );

  const artistEl =
    getElement(
      "selectedSoundArtist"
    );

  if (
    selectedVidoraSound &&
    wrap &&
    nameEl &&
    artistEl
  ) {
    nameEl.textContent =
      selectedVidoraSound.name;

    artistEl.textContent =
      selectedVidoraSound.artist +
      " · " +
      selectedVidoraSound.type;

    wrap.classList.remove(
      "hidden"
    );
  }
}

function removeVidoraSound() {
  selectedVidoraSound =
    null;

  stopVidoraSound();

  const wrap =
    getElement(
      "selectedVidoraSound"
    );

  if (wrap) {
    wrap.classList.add(
      "hidden"
    );
  }
}

function openVidoraSounds(
  filterType
) {
  const panel =
    getElement(
      "vidoraSoundPanel"
    );

  const list =
    getElement(
      "vidoraSoundList"
    );

  if (!panel || !list) {
    return;
  }

  const type =
    filterType ||
    "all";

  const sounds =
    type === "all"
      ? VIDORA_SOUNDS
      : VIDORA_SOUNDS.filter(
          function (sound) {
            return (
              sound.type ===
              type
            );
          }
        );

  list.innerHTML = "";

  sounds.forEach(
    function (sound) {
      const row =
        document.createElement(
          "div"
        );

      row.className =
        "soundItemRow";

      row.innerHTML =
        "<div>" +
        "<strong>" +
        escapeHTML(
          sound.name
        ) +
        "</strong>" +
        "<small>" +
        escapeHTML(
          sound.artist
        ) +
        "</small>" +
        "</div>" +

        '<div>' +
        '<button type="button" class="soundPlayBtn">▶</button>' +
        '<button type="button" class="soundUseBtn">Use</button>' +
        "</div>";

      row.querySelector(
        ".soundPlayBtn"
      ).onclick =
        function () {
          playVidoraSound(
            sound.id
          );
        };

      row.querySelector(
        ".soundUseBtn"
      ).onclick =
        function () {
          selectVidoraSound(
            sound.id
          );

          closeVidoraSounds();
        };

      list.appendChild(
        row
      );
    }
  );

  panel.classList.remove(
    "hidden"
  );
}

function closeVidoraSounds() {
  const panel =
    getElement(
      "vidoraSoundPanel"
    );

  if (panel) {
    panel.classList.add(
      "hidden"
    );
  }
}


/* =========================================================
   36. FILTERS
   ========================================================= */

const VIDORA_FILTERS = [
  {
    id:
      "normal",
    name:
      "Normal",
    css:
      "none"
  },

  {
    id:
      "warm",
    name:
      "Warm",
    css:
      "sepia(.25) saturate(1.2)"
  },

  {
    id:
      "cool",
    name:
      "Cool",
    css:
      "hue-rotate(20deg) saturate(1.1)"
  },

  {
    id:
      "mono",
    name:
      "B&W",
    css:
      "grayscale(1)"
  },

  {
    id:
      "vivid",
    name:
      "Vivid",
    css:
      "contrast(1.15) saturate(1.35)"
  }
];

function selectVidoraFilter(
  filterId
) {
  selectedVidoraFilter =
    filterId ||
    "normal";

  const filter =
    VIDORA_FILTERS.find(
      function (f) {
        return (
          f.id ===
          selectedVidoraFilter
        );
      }
    );

  document
    .querySelectorAll(
      ".filterChip"
    )
    .forEach(
      function (chip) {
        chip.classList.toggle(
          "active",
          chip.dataset.filter ===
            selectedVidoraFilter
        );
      }
    );

  const preview =
    getElement(
      "createMediaPreview"
    );

  if (preview) {
    preview.style.filter =
      filter
        ? filter.css
        : "none";
  }
}

function renderVidoraFilterChips() {
  const box =
    getElement(
      "vidoraFilterChips"
    );

  if (!box) return;

  box.innerHTML = "";

  VIDORA_FILTERS.forEach(
    function (filter) {
      const button =
        document.createElement(
          "button"
        );

      button.type =
        "button";

      button.className =
        "filterChip" +
        (
          filter.id ===
          selectedVidoraFilter
            ? " active"
            : ""
        );

      button.dataset.filter =
        filter.id;

      button.textContent =
        filter.name;

      button.onclick =
        function () {
          selectVidoraFilter(
            filter.id
          );
        };

      box.appendChild(
        button
      );
    }
  );
}


/* =========================================================
   37. DISCOVER
   ========================================================= */

let vidoraDiscoverFilter =
  "for-you";

async function loadVidoraDiscover(
  filter
) {
  filter =
    filter ||
    "for-you";

  vidoraDiscoverFilter =
    filter;

  const results =
    getElement(
      "discoverResults"
    );

  if (!results) return;

  results.innerHTML =
    '<div class="loading">Loading Discover...</div>';

  try {
    const {
      data,
      error
    } =
      await supabaseClient
        .from("posts")
        .select(
          "id,user_id,media_url,media_type,caption,created_at"
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        )
        .limit(30);

    if (error) {
      results.innerHTML =
        "<div>" +
        escapeHTML(
          error.message
        ) +
        "</div>";

      return;
    }

    results.innerHTML = "";

    if (
      !data ||
      data.length === 0
    ) {
      results.innerHTML =
        "<div>Nothing to discover yet.</div>";

      return;
    }

    const grid =
      document.createElement(
        "div"
      );

    grid.className =
      "discoverGrid";

    data.forEach(
      function (post) {
        const card =
          document.createElement(
            "div"
          );

        card.className =
          "discoverCard";

        if (
          post.media_type ===
          "video"
        ) {
          card.innerHTML =
            '<video src="' +
            escapeHTML(
              post.media_url
            ) +
            '" muted playsinline controls></video>';
        } else {
          card.innerHTML =
            '<img src="' +
            escapeHTML(
              post.media_url
            ) +
            '" alt="Discover">';
        }

        grid.appendChild(
          card
        );
      }
    );

    results.appendChild(
      grid
    );

  } catch (error) {
    console.error(
      "DISCOVER ERROR:",
      error
    );
  }
}


/* =========================================================
   38. NOTIFICATIONS
   ========================================================= */

async function loadNotifications() {
  if (!currentUser) {
    return;
  }

  const badge =
    getElement(
      "notificationBadge"
    );

  try {
    const {
      count
    } =
      await supabaseClient
        .from("notifications")
        .select(
          "*",
          {
            count:
              "exact",
            head: true
          }
        )
        .eq(
          "user_id",
          currentUser.id
        )
        .eq(
          "read",
          false
        );

    if (badge) {
      badge.textContent =
        count || 0;

      badge.classList.toggle(
        "hidden",
        !count
      );
    }

  } catch (error) {
    console.warn(
      "NOTIFICATION ERROR:",
      error.message
    );
  }
}

async function markNotificationsRead() {
  if (!currentUser) return;

  try {
    await supabaseClient
      .from("notifications")
      .update({
        read: true
      })
      .eq(
        "user_id",
        currentUser.id
      )
      .eq(
        "read",
        false
      );

    await loadNotifications();

  } catch (error) {
    console.error(
      "NOTIFICATION READ ERROR:",
      error
    );
  }
}


/* =========================================================
   39. ACCOUNT DELETION
   ========================================================= */

async function deleteVidoraAccount() {
  if (!currentUser) {
    return;
  }

  const confirmed =
    confirm(
      "Are you sure you want to delete your Vidora account?"
    );

  if (!confirmed) {
    return;
  }

  /*
    IMPORTANT:
    Supabase does not allow safely deleting an Auth
    user directly from browser code using the public key.

    This function expects a secure Supabase Edge Function
    named "delete-account".
  */

  try {
    const {
      data,
      error
    } =
      await supabaseClient.functions.invoke(
        "delete-account",
        {
          body: {
            user_id:
              currentUser.id
          }
        }
      );

    if (error) {
      alert(
        "Account deletion requires the secure delete-account Edge Function."
      );

      console.error(
        error
      );

      return;
    }

    console.log(
      "ACCOUNT DELETE:",
      data
    );

    await logout();

  } catch (error) {
    console.error(
      "ACCOUNT DELETE ERROR:",
      error
    );

    alert(
      "Account could not be deleted."
    );
  }
}


/* =========================================================
   40. NAVIGATION
   ========================================================= */

function showPage(page) {
  const pages = {
    home:
      "homeScreen",

    profile:
      "profileScreen",

    create:
      "createScreen",

    discover:
      "discoverScreen",

    friends:
      "friendsScreen"
  };

  Object.keys(pages)
    .forEach(
      function (key) {
        const element =
          getElement(
            pages[key]
          );

        if (element) {
          element.classList.add(
            "hidden"
          );
        }
      }
    );

  const target =
    getElement(
      pages[page] ||
      pages.home
    );

  if (target) {
    target.classList.remove(
      "hidden"
    );
  }

  if (
    page ===
    "home"
  ) {
    loadFeed();
  }

  if (
    page ===
    "profile"
  ) {
    loadProfile();
  }

  if (
    page ===
    "discover"
  ) {
    loadVidoraDiscover(
      "for-you"
    );
  }
}

function showpage(page) {
  showPage(page);
}


/* =========================================================
   41. GLOBAL EXPORTS
   ========================================================= */

window.login =
  login;

window.signUp =
  signUp;

window.logout =
  logout;

window.showLoginForm =
  showLoginForm;

window.showCreateAccount =
  showCreateAccount;

window.showAuthChoice =
  showAuthChoice;

window.showAuthScreen =
  showAuthScreen;

window.togglePassword =
  togglePassword;

window.showProfileSetup =
  showProfileSetup;

window.showPage =
  showPage;

window.showpage =
  showpage;

window.loadProfile =
  loadProfile;

window.saveProfile =
  saveProfile;

window.uploadPost =
  uploadPost;

window.publishFromCreate =
  publishFromCreate;

window.loadFeed =
  loadFeed;

window.loadVidoraDiscover =
  loadVidoraDiscover;

window.previewCreateMedia =
  previewCreateMedia;

window.selectVidoraAvatar =
  selectVidoraAvatar;

window.getSelectedVidoraAvatar =
  getSelectedVidoraAvatar;

window.getVidoraAvatarImage =
  getVidoraAvatarImage;

window.getVidoraAvatarInfo =
  getVidoraAvatarInfo;

window.updateAvatarPreview =
  updateAvatarPreview;

window.renderDefaultAvatar =
  renderDefaultAvatar;

window.renderProfileAvatar =
  renderProfileAvatar;

window.showInteractiveAvatar =
  showInteractiveAvatar;

window.closeInteractiveAvatar =
  closeInteractiveAvatar;

window.toggleInteractiveAvatar =
  toggleInteractiveAvatar;

window.avatarReact =
  avatarReact;

window.openAvatarChat =
  openAvatarChat;

window.closeAvatarChat =
  closeAvatarChat;

window.sendAvatarMessage =
  sendAvatarMessage;

window.setVidoraTheme =
  setVidoraTheme;

window.loadVidoraTheme =
  loadVidoraTheme;

window.openVidoraSounds =
  openVidoraSounds;

window.closeVidoraSounds =
  closeVidoraSounds;

window.selectVidoraSound =
  selectVidoraSound;

window.removeVidoraSound =
  removeVidoraSound;

window.playVidoraSound =
  playVidoraSound;

window.stopVidoraSound =
  stopVidoraSound;

window.selectVidoraFilter =
  selectVidoraFilter;

window.openStoryCreator =
  openStoryCreator;

window.closeStoryCreator =
  closeStoryCreator;

window.loadStories =
  loadStories;

window.openStory =
  openStory;

window.nextStory =
  nextStory;

window.previousStory =
  previousStory;

window.closeStoryViewer =
  closeStoryViewer;

window.publishStory =
  publishStory;

window.handleStoryFile =
  handleStoryFile;

window.togglePostLike =
  togglePostLike;

window.addPostComment =
  addPostComment;

window.deletePostComment =
  deletePostComment;

window.deleteOwnPost =
  deleteOwnPost;

window.toggleFollowUser =
  toggleFollowUser;

window.blockVidoraUser =
  blockVidoraUser;

window.unblockVidoraUser =
  unblockVidoraUser;

window.openChat =
  openChat;

window.closeChat =
  closeChat;

window.sendChatMessage =
  sendChatMessage;

window.toggleVoiceRecording =
  toggleVoiceRecording;

window.stopVoiceRecording =
  stopVoiceRecording;

window.startVoiceCall =
  startVoiceCall;

window.startVideoCall =
  startVideoCall;

window.endVidoraCall =
  endVidoraCall;

window.toggleCallMute =
  toggleCallMute;

window.toggleCallCamera =
  toggleCallCamera;

window.toggleHologramEffect =
  toggleHologramEffect;

window.likeStory =
  likeStory;

window.deleteOwnStory =
  deleteOwnStory;

window.loadNotifications =
  loadNotifications;

window.markNotificationsRead =
  markNotificationsRead;

window.deleteVidoraAccount =
  deleteVidoraAccount;


/* =========================================================
   42. DOM EVENTS
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async function () {

    console.log(
      "Vidora DOM ready"
    );

    initializeVidoraAvatarSystem();

    renderVidoraFilterChips();

    createStoryViewer();

    createChatPanel();

    createCallUI();

    showPage("home");

    const storyChoose =
      getElement(
        "chooseStoryFileBtn"
      );

    const storyInput =
      getElement(
        "storyFileInput"
      );

    if (
      storyChoose &&
      storyInput
    ) {
      storyChoose.onclick =
        function () {
          storyInput.click();
        };
    }

    if (storyInput) {
      storyInput.addEventListener(
        "change",
        handleStoryFile
      );
    }

    const storyClose =
      getElement(
        "closeStoryCreatorBtn"
      );

    if (storyClose) {
      storyClose.onclick =
        closeStoryCreator;
    }

    const storyPublish =
      getElement(
        "publishStoryButton"
      );

    if (storyPublish) {
      storyPublish.onclick =
        publishStory;
    }

    await checkSession();

    initializeCallSignaling();

  }
);


/* =========================================================
   43. SUPABASE AUTH STATE
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  async function (
    event,
    session
  ) {
    console.log(
      "AUTH EVENT:",
      event
    );

    if (
      session?.user
    ) {
      currentUser =
        session.user;

      initializeCallSignaling();

      if (
        !appInitialized
      ) {
        await showApp();
      }

    } else {
      currentUser =
        null;

      callChannel =
        null;

      if (
        event ===
        "SIGNED_OUT"
      ) {
        showAuthScreen();
      }
    }
  }
);


console.log(
  "VIDORA AUTH FUNCTIONS READY"
);

console.log(
  "VIDORA ADVANCED FEATURES READY"
);
// =========================================================
// VIDORA VOICE + VIDEO CALLS
// =========================================================

let vidoraCallType = null;
let vidoraLocalStream = null;
let vidoraPeerConnection = null;

const vidoraIceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

async function startVidoraCall(type) {
  try {
    vidoraCallType = type;

    const constraints = {
      audio: true,
      video: type === "video"
    };

    vidoraLocalStream =
      await navigator.mediaDevices.getUserMedia(constraints);

    console.log("Vidora call started:", type);

    alert(
      type === "video"
        ? "Video call started. Camera and microphone are ready."
        : "Voice call started. Microphone is ready."
    );

  } catch (error) {
    console.error("Call error:", error);

    alert(
      "Vidora could not access your " +
      (type === "video"
        ? "camera and microphone."
        : "microphone.")
    );
  }
}

function endVidoraCall() {
  if (vidoraLocalStream) {
    vidoraLocalStream.getTracks().forEach(track => {
      track.stop();
    });

    vidoraLocalStream = null;
  }

  if (vidoraPeerConnection) {
    vidoraPeerConnection.close();
    vidoraPeerConnection = null;
  }

  vidoraCallType = null;

  console.log("Vidora call ended.");
}


// Connect buttons after the page loads
document.addEventListener("DOMContentLoaded", () => {

  const voiceCallButton =
    document.getElementById("startVoiceCallBtn");

  const videoCallButton =
    document.getElementById("startVideoCallBtn");

  if (voiceCallButton) {
    voiceCallButton.addEventListener("click", () => {
      startVidoraCall("voice");
    });
  }

  if (videoCallButton) {
    videoCallButton.addEventListener("click", () => {
      startVidoraCall("video");
    });
  }

});
/* =========================================================
   VIDORA CALL BUTTON CONNECTION
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  const voiceCallBtn = document.getElementById("startVoiceCallBtn");
  const videoCallBtn = document.getElementById("startVideoCallBtn");

  if (voiceCallBtn) {
    voiceCallBtn.addEventListener("click", () => {
      if (typeof startVoiceCall === "function") {
        startVoiceCall();
      } else {
        alert("Voice calling is not connected yet.");
      }
    });
  }

  if (videoCallBtn) {
    videoCallBtn.addEventListener("click", () => {
      if (typeof startVideoCall === "function") {
        startVideoCall();
      } else {
        alert("Video calling is not connected yet.");
      }
    });
  }

});
