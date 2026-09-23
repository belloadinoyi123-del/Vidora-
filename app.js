/* =========================================================
   VIDORA - COMPLETE APP.JS
   ========================================================= */

/* =========================================================
   1. SUPABASE CONFIGURATION
   ========================================================= */

const SUPABASE_URL = "https://htnrqgzxkfktwoioscjr.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_JT5rBfXYSX3-3_zyC2cazQ_YXg_ih_h";

const supabaseClient = window.supabase.createClient(
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

  element.style.color = success
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
  const div = document.createElement("div");

  div.textContent = value == null ? "" : String(value);

  return div.innerHTML;
}


function getFileExtension(file) {
  if (!file || !file.name) {
    return "bin";
  }

  const parts = file.name.split(".");

  if (parts.length < 2) {
    return "bin";
  }

  return parts.pop().toLowerCase();
}


function createSafeFileName(file) {
  const extension = getFileExtension(file);

  let id;

  if (
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
  ) {
    id = window.crypto.randomUUID();
  } else {
    id =
      Date.now().toString() +
      "-" +
      Math.random().toString(36).substring(2);
  }

  return id + "." + extension;
}


function formatDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}


/* =========================================================
   4. AUTHENTICATION - SIGN UP
   ========================================================= */

async function signUp() {
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value.trim();
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

    console.log("SIGNUP RESULT:", data);
    console.log("SIGNUP ERROR:", error);

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

    } else {
      if (message) {
        message.textContent =
          "Account created. Check your email to confirm your account.";
        message.style.color = "#4ade80";
      }
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


/* =========================================================
   5. AUTHENTICATION - LOGIN
   ========================================================= */

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
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
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




/* =========================================================
   6. LOGOUT
   ========================================================= */

async function logout() {

  sessionStorage.removeItem(
    "vidoraAvatarWelcomed"
  );

  const button =
    getElement("logoutBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Logging out...";
  }

  try {

    const { error } =
      await supabaseClient.auth.signOut();

    if (error) {

      console.error(
        "LOGOUT ERROR:",
        error
      );

      alert(
        error.message ||
        "Unable to log out."
      );

      return;
    }

    currentUser = null;

    showPublicFeed();

  } catch (error) {

    console.error(
      "LOGOUT EXCEPTION:",
      error
    );

    alert(
      "Unable to log out."
    );

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent = "Log Out";
    }

  }
}
/* =========================================================
   7. SHOW AUTH SCREEN
   ========================================================= */

function showAuthScreen() {
   function showAuthScreen() {

  const authScreen = getElement("authScreen");

  setup.classList.remove("hidden");

}
  const authScreen = getElement("authScreen");
  const app = getElement("app");

  if (authScreen) {
    authScreen.classList.remove("hidden");
  }

  if (app) {
    app.classList.add("hidden");
  }

  clearMessage("uploadMessage");
  clearMessage("createMessage");
}

function showProfileSetup() {

  const setup =
    document.getElementById("profileSetup");

  if (!setup) {
    return;
  }

  setup.classList.remove("hidden");
}
/* =========================================================
   8. SHOW MAIN APP
   ========================================================= */

async function showApp() {
  const authScreen = getElement("authScreen");
  const app = getElement("app");

  if (authScreen) {
    authScreen.classList.add("hidden");
  }

  if (app) {
    app.classList.remove("hidden");
  }

  if (!currentUser) {
    const { data } =
      await supabaseClient.auth.getUser();

    currentUser = data?.user || null;
  }

  if (!currentUser) {
    showAuthScreen();
    return;
  }

  showPage("home");

await loadProfile();

/* Launch personalized avatar welcome */

// await launchAvatarWelcome();

await loadFeed();

appInitialized = true;
}

/* =========================================================
   VIDORA AVATAR SELECTION
   ========================================================= */

function selectVidoraAvatar(name) {

  const hiddenInput =
    document.getElementById(
      "selectedVidoraAvatar"
    );

  if (hiddenInput) {
    hiddenInput.value = name;
  }


  /* Save selection locally */

  localStorage.setItem(
    "vidoraAvatar",
    name
  );


  /* Highlight selected avatar */

  document
    .querySelectorAll(".vidoraAvatar")
    .forEach(function(button) {

      button.classList.toggle(
        "selected",
        button.dataset.avatar === name
      );

    });


  /* Clear uploaded photo */

  const fileInput =
    document.getElementById(
      "profileAvatarFile"
    );

  if (fileInput) {
    fileInput.value = "";
  }


  console.log(
    "Vidora avatar selected:",
    name
  );

}
/* =========================================================
   VIDORA INTERACTIVE AVATAR
   ========================================================= */


async function showInteractiveAvatar() {

  if (!interactiveAvatarEnabled) {
    return;
  }

  const avatarBox =
    document.getElementById(
      "interactiveAvatar"
    );

  const avatarImage =
    document.getElementById(
      "interactiveAvatarImage"
    );

  if (!avatarBox) {
    return;
  }

  let avatarUrl = "";

  /* -----------------------------------------
     Use user's uploaded profile picture first
     ----------------------------------------- */

  if (currentUser) {

    try {

      const { data, error } =
        await supabaseClient
          .from("profiles")
          .select("avatar_url")
          .eq("id", currentUser.id)
          .maybeSingle();

      if (
        !error &&
        data &&
        data.avatar_url
      ) {

        avatarUrl = data.avatar_url;
      }

    } catch (error) {

      console.error(
        "AVATAR IMAGE ERROR:",
        error
      );
    }
  }

  
  

  /* -----------------------------------------
     Otherwise use selected Vidora avatar
     ----------------------------------------- */

  if (!avatarUrl) {

    const avatarName =
      getSelectedVidoraAvatar();

    avatarUrl =
      getVidoraAvatarImage(
        avatarName
      );
  }

  if (avatarImage) {

    avatarImage.src = avatarUrl;

    avatarImage.onerror = function() {

      const avatarName =
        getSelectedVidoraAvatar();

      avatarImage.src =
        getVidoraAvatarImage(
          avatarName
        );
    };
  }

  avatarBox.classList.remove("hidden");
}
async function launchAvatarWelcome() {

  if (!interactiveAvatarEnabled) {
    return;
  }

  if (!currentUser) {
    return;
  }

  // Only welcome once per login session
  if (
    sessionStorage.getItem("vidoraAvatarWelcomed") === "true"
  ) {
    return;
  }

  // Small delay for a smooth entrance
  await new Promise(function(resolve) {
    setTimeout(resolve, 700);
  });

  await showInteractiveAvatar();

  await showSmartAvatarGreeting();

  sessionStorage.setItem(
    "vidoraAvatarWelcomed",
    "true"
  );
}
/* =========================================================
   VIDORA AVATAR - SMART GREETING & THEME ASSISTANT
   ========================================================= */

function getTimePeriod() {

  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "morning";
  }

  if (hour >= 12 && hour < 18) {
    return "afternoon";
  }

  if (hour >= 18 && hour < 22) {
    return "evening";
  }

  return "night";
}


/* ---------------------------------------------------------
   SMART AVATAR GREETING
   --------------------------------------------------------- */

async function showSmartAvatarGreeting() {

  if (!interactiveAvatarEnabled || !currentUser) {
    return;
  }

  const greeting =
    document.getElementById("avatarGreeting");

  const message =
    document.getElementById("avatarMessage");

  if (!greeting || !message) {
    return;
  }

  let displayName = "Vidora User";
  let username = "";

  try {

    const { data, error } =
      await supabaseClient
        .from("profiles")
        .select("display_name, username")
        .eq("id", currentUser.id)
        .maybeSingle();

    if (!error && data) {

      displayName =
        data.display_name || "Vidora User";

      username =
        data.username || "";
    }

  } catch (error) {

    console.error(
      "AVATAR PROFILE ERROR:",
      error
    );
  }

  const period = getTimePeriod();

  if (period === "morning") {

    greeting.textContent =
      "Good morning, " +
      displayName +
      "! ☀️";

  } else if (period === "afternoon") {

    greeting.textContent =
      "Good afternoon, " +
      displayName +
      "! 👋";

  } else if (period === "evening") {

    greeting.textContent =
      "Good evening, " +
      displayName +
      "! 🌆";

  } else {

    greeting.textContent =
      "Good night, " +
      displayName +
      "! 🌙";
  }

  if (username) {

    message.innerHTML =
      "<strong>@" +
      username +
      "</strong><br>" +
      "Welcome back to Vidora! " +
      "Ready to see what's happening? 🚀";

  } else {

    message.textContent =
      "Welcome back to Vidora! " +
      "Ready to see what's happening? 🚀";
  }

  addAvatarQuickActions();
}

function addAvatarQuickActions() {

  const actions =
    document.getElementById("avatarQuickActions");

  if (!actions) {
    return;
  }

  actions.innerHTML = "";

  const buttons = [

    {
      text: "🔥 Trending",
      page: "discover"
    },

    {
      text: "➕ Create",
      page: "create"
    },

    {
      text: "👤 Profile",
      page: "profile"
    },

    {
      text: "🏠 Home",
      page: "home"
    }

  ];

  buttons.forEach(function(item) {

    const button =
      document.createElement("button");

    button.type = "button";

    button.textContent = item.text;

    button.addEventListener(
      "click",
      function() {

        showPage(item.page);

        closeInteractiveAvatar();
      }
    );

    actions.appendChild(button);
  });
}
/* ---------------------------------------------------------
   THEME SUGGESTION BUTTONS
   --------------------------------------------------------- */

function showThemeSuggestion(theme) {

  const oldActions =
    document.getElementById(
      "avatarThemeActions"
    );

  if (oldActions) {
    oldActions.remove();
  }

  const avatarBox =
    document.getElementById(
      "interactiveAvatar"
    );

  if (!avatarBox) {
    return;
  }

  const actions =
    document.createElement("div");

  actions.id =
    "avatarThemeActions";

  actions.className =
    "avatarThemeActions";


  const yesButton =
    document.createElement("button");

  yesButton.type =
    "button";

  yesButton.textContent =
    theme === "dark"
      ? "🌙 Yes, Dark Mode"
      : "☀️ Yes, Light Mode";

  yesButton.onclick =
    function() {

      setVidoraTheme(theme);

      actions.remove();

      const message =
        document.getElementById(
          "avatarMessage"
        );

      if (message) {

        message.textContent =
          theme === "dark"
            ? "Done! Dark Mode is enabled. 🌙"
            : "Done! Light Mode is enabled. ☀️";

      }

    };


  const noButton =
    document.createElement("button");

  noButton.type =
    "button";

  noButton.textContent =
    "Not now";

  noButton.onclick =
    function() {

      actions.remove();

      const message =
        document.getElementById(
          "avatarMessage"
        );

      if (message) {

        message.textContent =
          "No problem! I'll leave your current theme as it is. 😊";

      }

    };


  actions.appendChild(yesButton);
  actions.appendChild(noButton);

  avatarBox.appendChild(actions);

}


/* ---------------------------------------------------------
   CHANGE VIDORA THEME
   --------------------------------------------------------- */

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


/* ---------------------------------------------------------
   LOAD SAVED THEME
   --------------------------------------------------------- */

function loadVidoraTheme() {

  const savedTheme =
    localStorage.getItem(
      "vidoraTheme"
    );

  if (!savedTheme) {
    return;
  }

  setVidoraTheme(savedTheme);

}
/* ---------------------------------------------------------
   GET SELECTED AVATAR
   --------------------------------------------------------- */

function getSelectedVidoraAvatar() {

  const avatar =
    localStorage.getItem("vidoraAvatar");

  return avatar || "Nova";
}


/* =========================================================
   VIDORA AVATAR SYSTEM
   ========================================================= */

const VIDORA_AVATARS = {
  nova: {
    id: "nova",
    name: "Nova",
    image: "avatars/nova.png"
  },

  zeno: {
    id: "zeno",
    name: "Zeno",
    image: "avatars/zeno.png"
  },

  luna: {
    id: "luna",
    name: "Luna",
    image: "avatars/luna.png"
  },

  kai: {
    id: "kai",
    name: "Kai",
    image: "avatars/kai.png"
  },

  sage: {
    id: "sage",
    name: "Sage",
    image: "avatars/sage.png"
  },

  rex: {
    id: "rex",
    name: "Rex",
    image: "avatars/rex.png"
  },

  ivy: {
    id: "ivy",
    name: "Ivy",
    image: "avatars/ivy.png"
  },

  orion: {
    id: "orion",
    name: "Orion",
    image: "avatars/orion.png"
  },

  pixel: {
    id: "pixel",
    name: "Pixel",
    image: "avatars/pixel.png"
  },

  vexa: {
    id: "vexa",
    name: "Vexa",
    image: "avatars/vexa.png"
  }
};


/* =========================================================
   GET SELECTED AVATAR
   ========================================================= */

function getSelectedVidoraAvatar() {
  const saved =
    localStorage.getItem("vidoraSelectedAvatar");

  if (saved && VIDORA_AVATARS[saved]) {
    return saved;
  }

  return "nova";
}


/* =========================================================
   GET AVATAR IMAGE
   ========================================================= function getVidoraAvatarImage(name) {

  const avatarImages = {
    Nova: "./avatars/nova.png",
    Kairo: "./avatars/kairo.png",
    Amara: "./avatars/amara.png",
    Eli: "./avatars/eli.png",
    Razor: "./avatars/razor.png",
    Zina: "./avatars/zina.png",
    Titan: "./avatars/titan.png",
    Kitana: "./avatars/kitana.png"
  };

  return avatarImages[name] || "./avatars/nova.png";
}


/* =========================================================
   GET AVATAR INFORMATION
   ========================================================= */

function getVidoraAvatarInfo(name) {
  const key = String(name || "")
    .toLowerCase()
    .trim();

  return VIDORA_AVATARS[key] || VIDORA_AVATARS.nova;
}


/* =========================================================
   SELECT AVATAR
   ========================================================= */

function selectVidoraAvatar(name) {
  const key = String(name || "")
    .toLowerCase()
    .trim();

  if (!VIDORA_AVATARS[key]) {
    console.warn("Unknown Vidora avatar:", name);
    return;
  }

  localStorage.setItem(
    "vidoraSelectedAvatar",
    key
  );

  const avatarInfo =
    getVidoraAvatarInfo(key);

  /* Update hidden field */
  const selected =
    document.getElementById("selectedVidoraAvatar");

  if (selected) {
    selected.value = key;
  }

  /* Highlight selected avatar */
  document
    .querySelectorAll(".vidoraAvatar")
    .forEach(function(button) {
      button.classList.remove("selected");
    });

  const selectedButton =
    document.querySelector(
      '.vidoraAvatar[data-avatar="' + key + '"]'
    );

  if (selectedButton) {
    selectedButton.classList.add("selected");
  }

  /* Update preview */
  updateAvatarPreview(
    avatarInfo.image,
    avatarInfo.name
  );
}


/* =========================================================
   UPDATE AVATAR PREVIEW
   ========================================================= */

function updateAvatarPreview(imageUrl, avatarName) {
  const preview =
    document.getElementById("profileAvatarPreview");

  if (!preview) return;

  preview.innerHTML = "";

  const image =
    document.createElement("img");

  image.src = imageUrl;
  image.alt =
    avatarName || "Vidora Avatar";

  image.className =
    "profileAvatarImage";

  preview.appendChild(image);
}


/* =========================================================
   HANDLE CUSTOM AVATAR UPLOAD
   ========================================================= */

function handleAvatarUpload(event) {
  const file =
    event.target.files &&
    event.target.files[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please choose an image.");
    event.target.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Avatar image must be smaller than 5 MB.");
    event.target.value = "";
    return;
  }

  const imageUrl =
    URL.createObjectURL(file);

  updateAvatarPreview(
    imageUrl,
    "Your Avatar"
  );

  /* Custom upload takes priority */
  localStorage.setItem(
    "vidoraAvatarMode",
    "custom"
  );
}


/* =========================================================
   USE VIDORA AVATAR
   ========================================================= */

function useVidoraAvatar() {
  localStorage.setItem(
    "vidoraAvatarMode",
    "preset"
  );

  const selected =
    getSelectedVidoraAvatar();

  const info =
    getVidoraAvatarInfo(selected);

  updateAvatarPreview(
    info.image,
    info.name
  );
}


/* =========================================================
   RESET AVATAR
   ========================================================= */

function resetVidoraAvatar() {
  localStorage.removeItem(
    "vidoraSelectedAvatar"
  );

  localStorage.removeItem(
    "vidoraAvatarMode"
  );

  selectVidoraAvatar("nova");

  const fileInput =
    document.getElementById(
      "profileAvatarFile"
    );

  if (fileInput) {
    fileInput.value = "";
  }
}


/* =========================================================
   RENDER AVATAR ON PROFILE
   ========================================================= */

function renderProfileAvatar(
  container,
  avatarUrl,
  displayName
) {
  if (!container) return;

  container.innerHTML = "";

  if (avatarUrl) {
    const image =
      document.createElement("img");

    image.src = avatarUrl;

    image.alt =
      displayName ||
      "Vidora profile picture";

    image.className =
      "profileAvatarImage";

    image.onerror = function() {
      renderDefaultAvatar(
        container,
        displayName
      );
    };

    container.appendChild(image);

    return;
  }

  renderDefaultAvatar(
    container,
    displayName
  );
}


/* =========================================================
   DEFAULT VIDORA AVATAR
   ========================================================= */

function renderDefaultAvatar(
  container,
  displayName
) {
  if (!container) return;

  container.innerHTML = "";

  const avatarName =
    getSelectedVidoraAvatar();

  const imageUrl =
    getVidoraAvatarImage(
      avatarName
    );

  const image =
    document.createElement("img");

  image.src = imageUrl;

  image.alt =
    displayName ||
    "Vidora Avatar";

  image.className =
    "profileAvatarImage";

  image.onerror = function() {
    container.innerHTML =
      "<span>" +
      (
        displayName ||
        "V"
      ).charAt(0).toUpperCase() +
      "</span>";
  };

  container.appendChild(image);
}


/* =========================================================
   AVATAR NAME + USERNAME
   ========================================================= */

function updateAvatarIdentity(
  displayName,
  username
) {
  const nameElement =
    document.getElementById(
      "avatarDisplayName"
    );

  const usernameElement =
    document.getElementById(
      "avatarDisplayUsername"
    );

  if (nameElement) {
    nameElement.textContent =
      displayName || "Vidora User";
  }

  if (usernameElement) {
    usernameElement.textContent =
      username
        ? "@" + username
        : "@vidora";
  }
}


/* =========================================================
   AVATAR PRESET LIST
   ========================================================= */

function renderVidoraAvatarChoices() {
  const container =
    document.getElementById(
      "vidoraAvatarChoices"
    );

  if (!container) return;

  container.innerHTML = "";

  const selected =
    getSelectedVidoraAvatar();

  Object.keys(VIDORA_AVATARS)
    .forEach(function(key) {

      const avatar =
        VIDORA_AVATARS[key];

      const button =
        document.createElement("button");

      button.type = "button";

      button.className =
        "vidoraAvatar";

      button.dataset.avatar =
        key;

      if (key === selected) {
        button.classList.add(
          "selected"
        );
      }

      button.innerHTML =
        '<img src="' +
        avatar.image +
        '" alt="' +
        avatar.name +
        '">' +
        '<span>' +
        avatar.name +
        "</span>";

      button.onclick =
        function() {
          selectVidoraAvatar(key);
        };

      container.appendChild(button);
    });
}


/* =========================================================
   INTERACTIVE AVATAR
   ========================================================= */

async function showInteractiveAvatar() {
  if (!interactiveAvatarEnabled) {
    return;
  }

  const avatarBox =
    document.getElementById(
      "interactiveAvatar"
    );

  const avatarImage =
    document.getElementById(
      "interactiveAvatarImage"
    );

  if (!avatarBox) return;

  let avatarUrl = "";

  let displayName =
    "Vidora User";

  let username =
    "";

  if (currentUser) {
    try {
      const { data, error } =
        await supabaseClient
          .from("profiles")
          .select(
            "display_name, username, avatar_url"
          )
          .eq(
            "id",
            currentUser.id
          )
          .maybeSingle();

      if (!error && data) {
        displayName =
          data.display_name ||
          displayName;

        username =
          data.username ||
          "";

        avatarUrl =
          data.avatar_url ||
          "";
      }

    } catch (error) {
      console.error(
        "INTERACTIVE AVATAR ERROR:",
        error
      );
    }
  }

  if (!avatarUrl) {
    avatarUrl =
      getVidoraAvatarImage(
        getSelectedVidoraAvatar()
      );
  }

  if (avatarImage) {
    avatarImage.src =
      avatarUrl;

    avatarImage.onerror =
      function() {
        avatarImage.src =
          getVidoraAvatarImage(
            "nova"
          );
      };
  }

  updateAvatarIdentity(
    displayName,
    username
  );

  avatarBox.classList.remove(
    "hidden"
  );
}


/* =========================================================
   CLOSE INTERACTIVE AVATAR
   ========================================================= */

function closeInteractiveAvatar() {
  const avatarBox =
    document.getElementById(
      "interactiveAvatar"
    );

  if (avatarBox) {
    avatarBox.classList.add(
      "hidden"
    );
  }
}


/* =========================================================
   AVATAR REACTION
   ========================================================= */

function avatarReact(message) {
  const messageBox =
    document.getElementById(
      "avatarMessage"
    );

  if (messageBox) {
    messageBox.textContent =
      message;
  }
}


/* =========================================================
   AVATAR QUICK ACTION
   ========================================================= */

function avatarGoHome() {
  closeInteractiveAvatar();
  showPage("home");
}

function avatarGoProfile() {
  closeInteractiveAvatar();
  showPage("profile");
}

function avatarGoCreate() {
  closeInteractiveAvatar();
  showPage("create");
}

function avatarGoTrending() {
  closeInteractiveAvatar();
  showPage("trending");
}


/* =========================================================
   INITIALIZE AVATAR SYSTEM
   ========================================================= */

function initializeVidoraAvatarSystem() {
  const selected =
    getSelectedVidoraAvatar();

  const hiddenInput =
    document.getElementById(
      "selectedVidoraAvatar"
    );

  if (hiddenInput) {
    hiddenInput.value =
      selected;
  }

  renderVidoraAvatarChoices();
}


/* ---------------------------------------------------------
   ENABLE / DISABLE
   --------------------------------------------------------- */

function toggleInteractiveAvatar(enabled) {

  interactiveAvatarEnabled = enabled;

  localStorage.setItem(
    "vidoraInteractiveAvatar",
    enabled ? "true" : "false"
  );

  if (enabled) {

    showInteractiveAvatar();

  } else {

    closeInteractiveAvatar();

  }

}


/* ---------------------------------------------------------
   SHOW AVATAR
   --------------------------------------------------------- */




/* ---------------------------------------------------------
   CLOSE AVATAR
   --------------------------------------------------------- */

function closeInteractiveAvatar() {

  const avatarBox =
    document.getElementById("interactiveAvatar");

  if (avatarBox) {
    avatarBox.classList.add("hidden");
  }

}


/* ---------------------------------------------------------
   AVATAR REACTION
   --------------------------------------------------------- */

function avatarReact() {

  const avatar =
    getSelectedVidoraAvatar();

  const message =
    document.getElementById("avatarMessage");

  const greeting =
    document.getElementById("avatarGreeting");

  if (!message) {
    return;
  }

  const reactions = [
    "😊 Nice tap!",
    "👋 Hey there!",
    "✨ I'm here!",
    "😄 That was fun!",
    "🚀 Ready to explore Vidora?",
    "💜 Thanks for checking on me!"
  ];

  const random =
    reactions[
      Math.floor(
        Math.random() * reactions.length
      )
    ];

  if (greeting) {
    greeting.textContent =
      avatar + " says:";
  }

  message.textContent = random;

}


/* ---------------------------------------------------------
   OPEN CHAT
   --------------------------------------------------------- */

function openAvatarChat() {

  const chat =
    document.getElementById("avatarChatPanel");

  if (!chat) {
    return;
  }

  chat.classList.remove("hidden");

}


/* ---------------------------------------------------------
   CLOSE CHAT
   --------------------------------------------------------- */

function closeAvatarChat() {

  const chat =
    document.getElementById("avatarChatPanel");

  if (chat) {
    chat.classList.add("hidden");
  }

}


/* ---------------------------------------------------------
   SEND AVATAR MESSAGE
   --------------------------------------------------------- */

function sendAvatarMessage() {

  const input =
    document.getElementById("avatarChatInput");

  const messages =
    document.getElementById("avatarChatMessages");

  if (!input || !messages) {
    return;
  }

  const text =
    input.value.trim();

  if (!text) {
    return;
  }

  const userMessage =
    document.createElement("div");

  userMessage.className =
    "avatarChatMessage avatarUser";

  userMessage.textContent =
    text;

  messages.appendChild(
    userMessage
  );

  input.value = "";

  messages.scrollTop =
    messages.scrollHeight;


  setTimeout(function() {

    const avatar =
      getSelectedVidoraAvatar();

    const botMessage =
      document.createElement("div");

    botMessage.className =
      "avatarChatMessage avatarBot";

    botMessage.textContent =
      getAvatarResponse(text, avatar);

    messages.appendChild(
      botMessage
    );

    messages.scrollTop =
      messages.scrollHeight;

  }, 500);

}


/* ---------------------------------------------------------
   SIMPLE AVATAR RESPONSES
   --------------------------------------------------------- */

function getAvatarResponse(text, avatar) {

  const message =
    text.toLowerCase();

  if (
    message.includes("hello") ||
    message.includes("hi") ||
    message.includes("hey")
  ) {

    return (
      "👋 Hey! I'm " +
      avatar +
      ". Nice to see you!"
    );

  }

  if (
    message.includes("how are you")
  ) {

    return (
      "😊 I'm doing great! " +
      "Ready to hang out on Vidora."
    );

  }

  if (
    message.includes("video")
  ) {

    return (
      "🎬 Check your Vidora feed. " +
      "You might find something interesting!"
    );

  }

  if (
    message.includes("thank")
  ) {

    return (
      "💜 You're welcome!"
    );

  }

  return (
    "✨ I'm still learning! " +
    "Soon I'll be able to have much smarter conversations with you."
  );

}


/* ---------------------------------------------------------
   INITIALIZE
   --------------------------------------------------------- */

function initializeInteractiveAvatar() {

  const toggle =
    document.getElementById(
      "interactiveAvatarToggle"
    );

  if (toggle) {
    toggle.checked =
      interactiveAvatarEnabled;
  }

  if (interactiveAvatarEnabled) {
    showInteractiveAvatar();
  }

}
/* =========================================================
   SAVE PROFILE
   ========================================================= */

async function saveProfile() {

  if (!currentUser) {
    alert("Please log in first.");
    return;
  }

  const displayNameInput =
    document.getElementById("profileDisplayNameInput");

  const usernameInput =
    document.getElementById("profileUsernameInput");

  const bioInput =
    document.getElementById("profileBioInput");

  const avatarFileInput =
    document.getElementById("profileAvatarFile");

  const message =
    document.getElementById("profileMessage");

  const displayName =
    displayNameInput?.value.trim() || "";

  const username =
    usernameInput?.value.trim().toLowerCase() || "";

  const bio =
    bioInput?.value.trim() || "";

  if (!displayName) {
    if (message) {
      message.textContent =
        "Please enter your display name.";
      message.style.color = "#ff6b6b";
    }
    return;
  }

  if (!username) {
    if (message) {
      message.textContent =
        "Please enter a username.";
      message.style.color = "#ff6b6b";
    }
    return;
  }

  try {

    if (message) {
      message.textContent = "Saving profile...";
      message.style.color = "#aaa";
    }

    let avatarUrl = null;

    /* -----------------------------------------
       UPLOAD PERSONAL PROFILE PHOTO
       ----------------------------------------- */

    const avatarFile =
      avatarFileInput?.files?.[0];

    if (avatarFile) {

      if (!avatarFile.type.startsWith("image/")) {
        throw new Error("Please select an image file.");
      }

      if (avatarFile.size > 5 * 1024 * 1024) {
        throw new Error(
          "Profile picture must be smaller than 5 MB."
        );
      }

      const extension =
        getFileExtension(avatarFile);

      const filePath =
        currentUser.id +
        "/profile-" +
        Date.now() +
        "." +
        extension;

      const { error: uploadError } =
        await supabaseClient.storage
          .from("media")
          .upload(
            filePath,
            avatarFile,
            {
              cacheControl: "3600",
              upsert: true,
              contentType: avatarFile.type
            }
          );

      if (uploadError) {
        throw new Error(
          "Profile picture upload failed: " +
          uploadError.message
        );
      }

      const { data: publicData } =
        supabaseClient.storage
          .from("media")
          .getPublicUrl(filePath);

      avatarUrl =
        publicData?.publicUrl || null;
    }

    /* -----------------------------------------
       SAVE PROFILE
       ----------------------------------------- */

    const { data, error } =
      await supabaseClient
        .from("profiles")
        .upsert(
          {
            id: currentUser.id,
            username: username,
            display_name: displayName,
            bio: bio,
            avatar_url: avatarUrl
          },
          {
            onConflict: "id"
          }
        )
        .select()
        .single();

    if (error) {

      console.error(
        "SAVE PROFILE ERROR:",
        error
      );

      throw new Error(
        "Profile could not be saved: " +
        error.message
      );
    }

    console.log(
      "PROFILE SAVED:",
      data
    );

    if (message) {
      message.textContent =
        "Profile saved successfully! ✅";
      message.style.color = "#4ade80";
    }

    await loadProfile();

    setTimeout(function() {

      const setup =
        document.getElementById("profileSetup");

      if (setup) {
        setup.classList.add("hidden");
      }

    }, 700);

  } catch (error) {

    console.error(
      "SAVE PROFILE EXCEPTION:",
      error
    );

    if (message) {
      message.textContent =
        error.message ||
        "Could not save your profile.";

      message.style.color = "#ff6b6b";
    }
  }
}
/* =========================================================
   9. LOAD PROFILE
   ========================================================= */

async function loadProfile() {

  if (!currentUser) {
    return;
  }

  try {

    const { data, error } =
      await supabaseClient
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url, bio, created_at"
        )
        .eq("id", currentUser.id)
        .maybeSingle();

    if (error) {

      console.error(
        "LOAD PROFILE ERROR:",
        error
      );

      return;
    }


    /* -----------------------------------------------------
       NO PROFILE YET
       ----------------------------------------------------- */

    if (!data) {

      showProfileSetup();

      return;
    }


    /* -----------------------------------------------------
       DISPLAY NAME
       ----------------------------------------------------- */

    const displayName =
      document.getElementById(
        "profileDisplayName"
      );

    if (displayName) {

      displayName.textContent =
        data.display_name ||
        "Vidora User";

    }


    /* -----------------------------------------------------
       USERNAME
       ----------------------------------------------------- */

    const username =
      document.getElementById(
        "profileUsername"
      );

    if (username) {

      username.textContent =
        data.username
          ? "@" + data.username
          : "Set up your username";

    }


    /* -----------------------------------------------------
       BIO
       ----------------------------------------------------- */

    const bio =
      document.getElementById(
        "profileBio"
      );

    if (bio) {

      bio.textContent =
        data.bio ||
        "No bio yet.";

    }


    /* -----------------------------------------------------
       EMAIL
       ----------------------------------------------------- */

    const email =
      document.getElementById(
        "profileEmail"
      );

    if (email) {

      email.textContent =
        currentUser.email || "";

    }


    /* -----------------------------------------------------
       PROFILE PICTURE
       ----------------------------------------------------- */

    const avatar =
      document.getElementById(
        "profileAvatar"
      );

    if (avatar) {

      avatar.innerHTML = "";

      if (data.avatar_url) {

        const image =
          document.createElement("img");

        image.src =
          data.avatar_url;

        image.alt =
          data.display_name ||
          "Vidora profile picture";

        image.className =
          "profileAvatarImage";

        image.onerror =
          function() {

            avatar.innerHTML =
              "<span>V</span>";

          };

        avatar.appendChild(image);

      } else {

        const letter =
          document.createElement("span");

        letter.textContent =
          (
            data.display_name ||
            "V"
          )
            .charAt(0)
            .toUpperCase();

        avatar.appendChild(letter);

      }

    }


    /* -----------------------------------------------------
       FILL EDIT PROFILE FORM
       ----------------------------------------------------- */

    const displayInput =
      document.getElementById(
        "profileDisplayNameInput"
      );

    if (displayInput) {

      displayInput.value =
        data.display_name || "";

    }


    const usernameInput =
      document.getElementById(
        "profileUsernameInput"
      );

    if (usernameInput) {

      usernameInput.value =
        data.username || "";

    }


    const bioInput =
      document.getElementById(
        "profileBioInput"
      );

    if (bioInput) {

      bioInput.value =
        data.bio || "";

    }


    /* -----------------------------------------------------
       HIDE SETUP AFTER PROFILE EXISTS
       ----------------------------------------------------- */

    const setup =
      document.getElementById(
        "profileSetup"
      );

    if (setup) {

      setup.classList.add("hidden");

    }

  } catch (error) {

    console.error(
      "LOAD PROFILE EXCEPTION:",
      error
    );

  }

}

    



/* =========================================================
   11. UPLOAD POST FROM HOME
   ========================================================= */

async function uploadPost() {
  const fileInput = getElement("mediaFile");
  const captionInput = getElement("postCaption");
  const button =
    document.querySelector(
      '#homeScreen button[onclick="uploadPost()"]'
    );

  if (!fileInput || !captionInput) {
    return;
  }

  const file = fileInput.files[0];
  const caption = captionInput.value.trim();

  clearMessage("uploadMessage");

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

  if (button) {
    button.disabled = true;
    button.textContent = "Uploading...";
  }

  try {
    const result =
      await createPost(file, caption);

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

  } catch (error) {
    console.error("UPLOAD POST ERROR:", error);

    setMessage(
      "uploadMessage",
      "Could not publish your post."
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "📤 Publish";
    }
  }
}


/* =========================================================
   12. PUBLISH FROM CREATE PAGE
   ========================================================= */

async function publishFromCreate() {
  const fileInput = getElement("createFile");
  const captionInput =
    getElement("createCaption");

  const button =
    document.querySelector(
      '#createScreen button[onclick="publishFromCreate()"]'
    );

  if (!fileInput || !captionInput) {
    return;
  }

  const file = fileInput.files[0];
  const caption = captionInput.value.trim();

  clearMessage("createMessage");

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

  if (button) {
    button.disabled = true;
    button.textContent = "Publishing...";
  }

  try {
    const result =
      await createPost(file, caption);

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

    await loadFeed();

    setTimeout(() => {
      showPage("home");
    }, 700);

  } catch (error) {
    console.error(
      "CREATE PAGE POST ERROR:",
      error
    );

    setMessage(
      "createMessage",
      "Could not publish your post."
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
   13. CREATE POST
   ========================================================= */

async function createPost(file, caption) {
  if (!currentUser) {
    return {
      success: false,
      message: "You are not logged in."
    };
  }

  const extension =
    getFileExtension(file);

  const fileName =
    createSafeFileName(file);

  const filePath =
    currentUser.id + "/" + fileName;

  const mediaType =
    file.type.startsWith("video/")
      ? "video"
      : "image";

  let uploadedPath = null;

  try {

    /* Upload to Storage */

    const { error: uploadError } =
      await supabaseClient.storage
        .from("media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        });

    if (uploadError) {
      console.error(
        "STORAGE UPLOAD ERROR:",
        uploadError
      );

      return {
        success: false,
        message:
          "Media upload failed: " +
          uploadError.message
      };
    }

    uploadedPath = filePath;

    /* Get public URL */

    const { data: publicData } =
      supabaseClient.storage
        .from("media")
        .getPublicUrl(filePath);

    const mediaUrl =
      publicData?.publicUrl;

    if (!mediaUrl) {

      await supabaseClient.storage
        .from("media")
        .remove([filePath]);

      return {
        success: false,
        message: "Could not create media URL."
      };
    }

    /* Insert post into database */

    const { data, error: postError } =
      await supabaseClient
        .from("posts")
        .insert({
          user_id: currentUser.id,
          media_url: mediaUrl,
          media_type: mediaType,
          caption: caption || ""
        })
        .select()
        .single();

    if (postError) {
      console.error(
        "POST DATABASE ERROR:",
        postError
      );

      /*
        Remove uploaded file if database insert fails.
      */

      await supabaseClient.storage
        .from("media")
        .remove([filePath]);

      return {
        success: false,
        message:
          "Post could not be saved: " +
          postError.message
      };
    }

    console.log("POST CREATED:", data);

    return {
      success: true,
      data: data
    };

  } catch (error) {
    console.error(
      "CREATE POST EXCEPTION:",
      error
    );

    if (uploadedPath) {
      try {
        await supabaseClient.storage
          .from("media")
          .remove([uploadedPath]);
      } catch (removeError) {
        console.error(
          "CLEANUP ERROR:",
          removeError
        );
      }
    }

    return {
      success: false,
      message:
        "An unexpected error occurred."
    };
  }
}


/* =========================================================
   14. LOAD FEED
   ========================================================= */
async function loadFeed() {
  if (feedLoading) return;

  feedLoading = true;

  const feed = getElement("feed");

  if (!feed) {
    feedLoading = false;
    return;
  }

  feed.innerHTML = `
    <div class="loading">
      Loading Vidora...
    </div>
  `;

  try {
    const { data, error } =
      await supabaseClient
        .from("posts")
        .select(
          "id,user_id,media_url,media_type,caption,created_at"
        )
        .order("created_at", {
          ascending: false
        });

    if (error) {
      console.error("LOAD FEED ERROR:", error);

      feed.innerHTML = `
        <div class="loading">
          Unable to load posts.
          <br><br>
          ${escapeHTML(error.message)}
        </div>
      `;

      return;
    }

    if (!data || data.length === 0) {
      feed.innerHTML = `
        <div class="loading">
          No posts yet.
          <br>
          Be the first to publish something!
        </div>
      `;

      return;
    }

    feed.innerHTML = "";

    for (const post of data) {
      const element = await createPostElement(post);

      if (element) {
        feed.appendChild(element);
      }
    }

  } catch (error) {
    console.error("LOAD FEED EXCEPTION:", error);

    feed.innerHTML = `
      <div class="loading">
        Something went wrong while loading Vidora.
      </div>
    `;

  } finally {
    feedLoading = false;
  }
}

/* =========================================================
   15. CREATE POST ELEMENT
   ========================================================= */

async function createPostElement(post) {
  const article =
    document.createElement("article");

  article.className = "postCard";

  article.dataset.postId = post.id;

  let username = "Vidora User";

  /*
    Try to retrieve profile username.
  */

  try {
    const { data, error } =
      await supabaseClient
        .from("profiles")
        .select("username")
        .eq("id", post.user_id)
        .maybeSingle();

    if (!error &&
        data &&
        data.username) {
      username = data.username;
    }
  } catch (error) {
    /* Profiles are optional for now. */
  }

  const avatarLetter =
    username.charAt(0).toUpperCase();

  const mediaHTML =
    post.media_type === "video"
      ? `
        <video
          class="postMedia"
          src="${escapeHTML(post.media_url)}"
          controls
          playsinline
          preload="metadata"
        ></video>
      `
      : `
        <img
          class="postMedia"
          src="${escapeHTML(post.media_url)}"
          alt="Vidora post"
          loading="lazy"
        >
      `;

  article.innerHTML = `
    <div class="postHeader">

      <div class="postAvatar">
        ${escapeHTML(avatarLetter)}
      </div>

      <div class="postUser">
        <strong>
          ${escapeHTML(username)}
        </strong>

        <small>
          @${escapeHTML(username.replace(/\s+/g, "").toLowerCase())}
        </small>
      </div>

    </div>

    <div class="postMediaContainer">
      ${mediaHTML}
    </div>

    <div class="postContent">

      ${
        post.caption
          ? `
            <p class="postCaption">
              ${escapeHTML(post.caption)}
            </p>
          `
          : ""
      }

      <small class="postDate">
        ${escapeHTML(formatDate(post.created_at))}
      </small>

      <div class="postActions">

  <button
    type="button"
    class="likeButton"
    data-post-id="${escapeHTML(post.id)}"
  >
    ❤️ Like
  </button>

  <button
    type="button"
    class="shareButton"
    data-post-id="${escapeHTML(post.id)}"
  >
    ↗️ Share
  </button>

  ${
    currentUser &&
    currentUser.id === post.user_id
      ? `
        <button
          type="button"
          class="deleteButton"
          data-post-id="${escapeHTML(post.id)}"
        >
          🗑️ Delete
        </button>
      `
      : ""
  }

</div>

      <div class="commentArea">

        <form class="commentForm">

          <input
            type="text"
            class="commentInput"
            placeholder="Write a comment..."
            maxlength="500"
          >

          <button type="submit">
            Send
          </button>

        </form>

        <div class="commentsList">
          Loading comments...
        </div>

      </div>

    </div>
  `;


  /* Like */

  const likeButton =
    article.querySelector(".likeButton");

  if (likeButton) {
    likeButton.addEventListener(
      "click",
      () => toggleLike(post.id, likeButton)
    );
  }


  /* Share */

  const shareButton =
    article.querySelector(".shareButton");

  if (shareButton) {
    shareButton.addEventListener(
      "click",
      () => sharePost(post)
    );
  }
/* Delete */

const deleteButton =
  article.querySelector(".deleteButton");

if (deleteButton) {
  deleteButton.addEventListener(
    "click",
    () => deletePost(
      post.id,
      post.media_url,
      article
    )
  );
}

  /* Comment */

  const commentForm =
    article.querySelector(".commentForm");

  const commentInput =
    article.querySelector(".commentInput");

  if (commentForm) {
    commentForm.addEventListener(
      "submit",
      async function(event) {

        event.preventDefault();

        const body =
          commentInput.value.trim();

        if (!body) {
          return;
        }

        await addComment(
          post.id,
          body,
          article
        );

        commentInput.value = "";
      }
    );
  }


  /* Load comments */

  await loadComments(
    post.id,
    article
  );


  /* Load like state */

  await updateLikeButton(
    post.id,
    likeButton
  );


  return article;
}


/* =========================================================
   16. UPDATE LIKE BUTTON
   ========================================================= */

async function updateLikeButton(
  postId,
  button
) {
  if (!button || !currentUser) {
    return;
  }

  try {
    const { data, error } =
      await supabaseClient
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", currentUser.id)
        .maybeSingle();

    if (error) {
      /*
        If likes table/RLS isn't ready,
        don't break the feed.
      */
      return;
    }

    if (data) {
      button.textContent = "❤️ Liked";
      button.dataset.liked = "true";
    } else {
      button.textContent = "🤍 Like";
      button.dataset.liked = "false";
    }

  } catch (error) {
    console.log("Like state unavailable.");
  }
}


/* =========================================================
   17. TOGGLE LIKE
   ========================================================= */

async function toggleLike(
  postId,
  button
) {
  if (!currentUser) {
  alert("Please log in first.");
  showAuthScreen();
  return;
}
  

  if (!button) {
    return;
  }

  button.disabled = true;

  try {
    const { data: existingLike, error: findError } =
      await supabaseClient
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", currentUser.id)
        .maybeSingle();

    if (findError) {
      console.error(
        "LIKE CHECK ERROR:",
        findError
      );

      alert(
        "Likes are not ready in the database yet."
      );

      return;
    }

    if (existingLike) {

      const { error } =
        await supabaseClient
          .from("likes")
          .delete()
          .eq("id", existingLike.id);

      if (error) {
        console.error(
          "UNLIKE ERROR:",
          error
        );

        alert(error.message);
        return;
      }

      button.textContent = "🤍 Like";
      button.dataset.liked = "false";

    } else {

      const { error } =
        await supabaseClient
          .from("likes")
          .insert({
            post_id: postId,
            user_id: currentUser.id
          });

      if (error) {
        console.error(
          "LIKE INSERT ERROR:",
          error
        );

        alert(error.message);
        return;
      }

      button.textContent = "❤️ Liked";
      button.dataset.liked = "true";
    }

  } catch (error) {
    console.error(
      "LIKE EXCEPTION:",
      error
    );

  } finally {
    button.disabled = false;
  }
}
/* =========================================================
   DELETE POST
   ========================================================= */

async function deletePost(postId, mediaUrl, article) {

  if (!currentUser) {
    alert("Please log in first.");
    showAuthScreen();
    return;
  }

  const confirmed = confirm(
    "Are you sure you want to delete this post?"
  );

  if (!confirmed) {
    return;
  }

  try {

    /* Delete database post */

    const { error: postError } =
      await supabaseClient
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", currentUser.id);

    if (postError) {
      console.error(
        "DELETE POST ERROR:",
        postError
      );

      alert(
        "Post could not be deleted:\n\n" +
        postError.message
      );

      return;
    }

    /* Try to remove the media file */

    if (mediaUrl) {

      try {

        const marker = "/storage/v1/object/public/media/";

        const index = mediaUrl.indexOf(marker);

        if (index !== -1) {

          const filePath =
            decodeURIComponent(
              mediaUrl.substring(
                index + marker.length
              )
            );

          const { error: storageError } =
            await supabaseClient.storage
              .from("media")
              .remove([filePath]);

          if (storageError) {
            console.error(
              "STORAGE DELETE ERROR:",
              storageError
            );
          }
        }

      } catch (storageError) {

        console.error(
          "MEDIA DELETE EXCEPTION:",
          storageError
        );
      }
    }

    /* Remove post from screen */

    if (article) {
      article.remove();
    }

    alert("Post deleted successfully.");

  } catch (error) {

    console.error(
      "DELETE POST EXCEPTION:",
      error
    );

    alert(
      "Something went wrong while deleting the post."
    );
  }
}
/* =========================================================
   18. LOAD COMMENTS
   ========================================================= */

async function loadComments(postId, article) {

  if (!article) {
    return;
  }

  const commentsList =
    article.querySelector(".commentsList");

  if (!commentsList) {
    return;
  }

  commentsList.innerHTML = `
    <small>Loading comments...</small>
  `;

  try {

    const { data, error } =
      await supabaseClient
        .from("comments")
        .select(
          "id,user_id,content,body,created_at"
        )
        .eq("post_id", postId)
        .order("created_at", {
          ascending: true
        });

    if (error) {
      console.error(
        "LOAD COMMENTS ERROR:",
        error
      );

      commentsList.innerHTML = `
        <small>
          Comments unavailable.
        </small>
      `;

      return;
    }

    if (!data || data.length === 0) {
      commentsList.innerHTML = `
        <small>
          No comments yet. Be the first!
        </small>
      `;

      return;
    }

    commentsList.innerHTML = "";

    for (const comment of data) {

      let username = "Vidora User";

      /* Get commenter's username */

      try {

        const { data: profileData } =
          await supabaseClient
            .from("profiles")
            .select("username")
            .eq("id", comment.user_id)
            .maybeSingle();

        if (
          profileData &&
          profileData.username
        ) {
          username = profileData.username;
        }

      } catch (profileError) {
        console.log(
          "Comment username unavailable."
        );
      }

      const commentText =
        comment.content ||
        comment.body ||
        "";

      const item =
        document.createElement("div");

      item.className = "comment";

      item.innerHTML = `
        <div class="commentHeader">

          <strong>
            ${escapeHTML(username)}
          </strong>

          ${
            currentUser &&
            currentUser.id === comment.user_id
              ? `
                <button
                  type="button"
                  class="deleteCommentButton"
                >
                  🗑️
                </button>
              `
              : ""
          }

        </div>

        <div class="commentText">
          ${escapeHTML(commentText)}
        </div>
      `;

      /* Delete own comment */

      const deleteButton =
        item.querySelector(
          ".deleteCommentButton"
        );

      if (deleteButton) {

        deleteButton.addEventListener(
          "click",
          () => deleteComment(
            comment.id,
            item,
            postId,
            article
          )
        );
      }

      commentsList.appendChild(item);
    }

  } catch (error) {

    console.error(
      "LOAD COMMENTS EXCEPTION:",
      error
    );

    commentsList.innerHTML = `
      <small>
        Unable to load comments.
      </small>
    `;
  }
}


/* =========================================================
   19. ADD COMMENT
   ========================================================= */

async function addComment(postId, body, article) {
  if (!currentUser) {
  alert("Please log in first.");
  showAuthScreen();
  return;

  }

  const cleanBody = body.trim();

  if (!cleanBody) {
    return;
  }

  try {
    console.log("Adding comment...");
    console.log("User:", currentUser.id);
    console.log("Post:", postId);
    console.log("Comment:", cleanBody);

    const { data, error } =
      await supabaseClient
        .from("comments")
        .insert({
  post_id: postId,
  user_id: currentUser.id,
  body: cleanBody,
  content: cleanBody
})
        .select()
        .single();

    if (error) {
      console.error(
        "COMMENT INSERT ERROR:",
        error
      );

      alert(
        "Comment could not be added:\n\n" +
        error.message
      );

      return;
    }

    console.log(
      "COMMENT CREATED:",
      data
    );

    await loadComments(
      postId,
      article
    );

  } catch (error) {
    console.error(
      "COMMENT EXCEPTION:",
      error
    );

    alert(
      "Something went wrong while adding the comment."
    );
  }
}
/* =========================================================
   DELETE COMMENT
   ========================================================= */

async function deleteComment(
  commentId,
  commentElement,
  postId,
  article
) {

  if (!currentUser) {
    alert("Please log in first.");
    showAuthScreen();
    return;
  }

  const confirmed = confirm(
    "Are you sure you want to delete this comment?"
  );

  if (!confirmed) {
    return;
  }

  try {

    const { error } =
      await supabaseClient
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", currentUser.id);

    if (error) {

      console.error(
        "DELETE COMMENT ERROR:",
        error
      );

      alert(
        "Comment could not be deleted:\n\n" +
        error.message
      );

      return;
    }

    if (commentElement) {
      commentElement.remove();
    }

    alert("Comment deleted successfully.");

  } catch (error) {

    console.error(
      "DELETE COMMENT EXCEPTION:",
      error
    );

    alert(
      "Something went wrong while deleting the comment."
    );
  }
}
/* =========================================================
   20. SHARE POST
   ========================================================= */

async function sharePost(post) {
  if (!post) {
    return;
  }

  const shareData = {
    title: "Vidora",
    text: post.caption || "Check out this post on Vidora.",
    url: window.location.href
  };

  try {

    if (
      navigator.share &&
      typeof navigator.share === "function"
    ) {
      await navigator.share(shareData);
      return;
    }

    if (
      navigator.clipboard &&
      navigator.clipboard.writeText
    ) {
      await navigator.clipboard.writeText(
        window.location.href
      );

      alert("Vidora link copied!");
      return;
    }

    alert(
      "Share this Vidora page: " +
      window.location.href
    );

  } catch (error) {

    /*
      User cancelling the native share menu
      is not an error we need to display.
    */

    if (error.name !== "AbortError") {
      console.error(
        "SHARE ERROR:",
        error
      );
    }
  }
}


/* =========================================================
   21. SHOW PAGE
   ========================================================= */

function showPage(page) {
  
const pages = {
  home: "homeScreen",
  discover: "discoverScreen",
  create: "createScreen",
  chat: "chatScreen",
  friends: "friendsScreen",
  profile: "profileScreen",
  notifications: "notificationsScreen"
};
  const requestedScreen =
    pages[page];

  if (!requestedScreen) {
    console.warn(
      "Unknown Vidora page:",
      page
    );

    return;
  }

  Object.values(pages).forEach(
    function(screenId) {

      const screen =
        getElement(screenId);

      if (!screen) {
        return;
      }

      if (screenId === requestedScreen) {
        screen.classList.remove("hidden");
      } else {
        screen.classList.add("hidden");
      }
    }
  );

  updateNavigation(page);

  /*
    Useful page-specific actions.
  */

  if (page === "discover") {
    const searchInput =
      getElement("searchInput");

    if (searchInput) {
      setTimeout(() => {
        searchInput.focus();
      }, 100);
    }
  }

  if (page === "profile") {
    loadProfile();
  }

  
}


/* =========================================================
   22. LOWERCASE NAVIGATION ALIAS
   ========================================================= */

function showpage(page) {
  showPage(page);
}


/* =========================================================
   23. UPDATE BOTTOM NAVIGATION
   ========================================================= */

function updateNavigation(page) {
  const buttons =
    document.querySelectorAll(
      ".bottomNav .navButton"
    );

  buttons.forEach(
    function(button) {
      button.classList.remove("active");
    }
  );

  const pageIndex = {
  home: 0,
  discover: 1,
  create: 2,
  chat: 3,
  friends: 4,
  profile: 5
};

  const index =
    pageIndex[page];

  if (index === undefined) {
    return;
  }

  if (buttons[index]) {
    buttons[index].classList.add("active");
  }
}


/* =========================================================
   24. SEARCH POSTS
   ========================================================= */

function searchPosts() {
  clearTimeout(searchTimer);

  searchTimer = setTimeout(
    async function() {

      const input =
        getElement("searchInput");

      const results =
        getElement("discoverResults");

      if (!input || !results) {
        return;
      }

      const query =
        input.value.trim();

      if (!query) {
        results.innerHTML = `
          <div class="loading">
            Discover what's trending.
          </div>
        `;

        return;
      }

      results.innerHTML = `
        <div class="loading">
          Searching Vidora...
        </div>
      `;

      try {

        const { data, error } =
          await supabaseClient
            .from("posts")
            .select(
              "id,user_id,media_url,media_type,caption,created_at"
            )
            .ilike(
              "caption",
              "%" + query + "%"
            )
            .order("created_at", {
              ascending: false
            });

        if (error) {
          console.error(
            "SEARCH ERROR:",
            error
          );

          results.innerHTML = `
            <div class="loading">
              Search failed.
              <br><br>
              ${escapeHTML(error.message)}
            </div>
          `;

          return;
        }

        if (!data || data.length === 0) {
          results.innerHTML = `
            <div class="loading">
              No posts found for "${escapeHTML(query)}".
            </div>
          `;

          return;
        }

        results.innerHTML = "";

        for (const post of data) {
          const element =
            await createPostElement(post);

          results.appendChild(element);
        }

      } catch (error) {

        console.error(
          "SEARCH EXCEPTION:",
          error
        );

        results.innerHTML = `
          <div class="loading">
            Something went wrong while searching.
          </div>
        `;
      }

    },
    300
  );
}
/* =========================================================
   PUBLIC FEED - WATCH WITHOUT ACCOUNT
   ========================================================= */

async function showPublicFeed() {

  const authScreen =
    getElement("authScreen");

  const app =
    getElement("app");

  if (authScreen) {
    authScreen.classList.add("hidden");
  }

  if (app) {
    app.classList.remove("hidden");
  }

  currentUser = null;

  showPage("home");

  await loadFeed();
}


/* =========================================================
   25. CHECK CURRENT SESSION
   ========================================================= */

async function checkSession() {
  try {

    console.log(
      "Checking Vidora Supabase session..."
    );

    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) {
      console.error(
        "SESSION ERROR:",
        error
      );

      showPublicFeed();
      return;
    }

    if (data && data.session) {

      currentUser =
        data.session.user;

      console.log(
        "Existing session found:",
        currentUser.email
      );

      await showApp();

    } else {

      console.log(
        "No active session. Showing public feed."
      );

      currentUser = null;

      showPublicFeed();
    }

  } catch (error) {

    console.error(
      "SESSION EXCEPTION:",
      error
    );

    currentUser = null;

    showPublicFeed();
  }
}
/* =========================================================
   26. SUPABASE AUTH STATE LISTENER
   ========================================================= */


supabaseClient.auth.onAuthStateChange(
  async function(event, session) {

    console.log("AUTH EVENT:", event);

    if (session && session.user) {

      currentUser = session.user;

      if (event === "SIGNED_IN") {
        await showApp();
      }

    } else if (event === "SIGNED_OUT") {

      currentUser = null;

      await showPublicFeed();
    }
  }
);
/* =========================================================
   27. INITIALIZE VIDORA
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async function() {

    console.log(
      "Vidora JavaScript loaded successfully."
    );

    /*
      Confirm Supabase exists.
    */

    if (!window.supabase) {

      console.error(
        "Supabase JavaScript library was not loaded."
      );

      setMessage(
        "authMessage",
        "Vidora could not load Supabase."
      );

      return;
    }

    /*
      Make sure authentication screen
      is visible while checking session.
    */

    showAuthScreen();

    /*
      Set Home as the default page.
    */

    showPage("home");

    /*
      Check whether user is already logged in.
    */

    await checkSession();
  }
);


/* =========================================================
   28. EXPOSE FUNCTIONS TO HTML
   ========================================================= */

window.signUp = signUp;
window.login = login;
window.logout = logout;

window.showPage = showPage;
window.showpage = showpage;

window.uploadPost = uploadPost;
window.publishFromCreate = publishFromCreate;

window.searchPosts = searchPosts;
window.deletePost = deletePost;
window.deleteComment = deleteComment;
/* =========================================================
   FIND FRIENDS
   ========================================================= */

async function searchFriends() {

  const input = document.getElementById("friendSearchInput");
  const results = document.getElementById("friendSearchResults");

  if (!input || !results) return;

  const searchText = input.value.trim();

  if (!searchText) {
    results.innerHTML = "<p>Enter a username to search.</p>";
    return;
  }

  results.innerHTML = "<p>Searching...</p>";

  try {

    const { data, error } = await supabaseClient
      .from("profiles")
      .select("id, username")
      .ilike("username", "%" + searchText + "%")
      .limit(20);

    if (error) {
      console.error("FRIEND SEARCH ERROR:", error);

      results.innerHTML =
        "<p>Could not search users.</p>";

      return;
    }

    if (!data || data.length === 0) {

      results.innerHTML =
        "<p>No users found.</p>";

      return;
    }

    results.innerHTML = "";

    data.forEach(function(user) {

      // Don't show yourself in the results
      if (currentUser && user.id === currentUser.id) {
        return;
      }

      const card = document.createElement("div");

      card.className = "friendCard";

      card.innerHTML = `
        <div class="friendInfo">

          <strong>
            ${escapeHTML(user.username || "Vidora User")}
          </strong>

          <span>
            @${escapeHTML(user.username || "user")}
          </span>

        </div>

        <button
          type="button"
          class="messageFriendButton"
          data-user-id="${user.id}"
          data-username="${escapeHTML(user.username || "Vidora User")}"
        >
          💬 Message
        </button>
      `;

      results.appendChild(card);

    });

    if (!results.innerHTML.trim()) {
      results.innerHTML = "<p>No other users found.</p>";
    }

  } catch (error) {

    console.error("FRIEND SEARCH EXCEPTION:", error);

    results.innerHTML =
      "<p>Something went wrong.</p>";
  }
}


/* Search button */

const friendSearchButton =
  document.getElementById("friendSearchButton");

if (friendSearchButton) {

  friendSearchButton.addEventListener(
    "click",
    searchFriends
  );

}


/* Press Enter to search */

const friendSearchInput =
  document.getElementById("friendSearchInput");

if (friendSearchInput) {

  friendSearchInput.addEventListener(
    "keydown",
    function(event) {

      if (event.key === "Enter") {
        searchFriends();
      }

    }
  );

}

/* =========================================================
   29. VIDORA READY MESSAGE
   ========================================================= */

console.log(
  "Vidora app.js initialized."
);
window.showAuthScreen = showAuthScreen;
window.showProfileSetup = showProfileSetup;
window.saveProfile = saveProfile;
window.loadProfile = loadProfile;
window.selectVidoraAvatar = selectVidoraAvatar;
window.toggleInteractiveAvatar = toggleInteractiveAvatar;
window.closeInteractiveAvatar = closeInteractiveAvatar;
window.avatarReact = avatarReact;
window.openAvatarChat = openAvatarChat;
window.closeAvatarChat = closeAvatarChat;
window.sendAvatarMessage = sendAvatarMessage;
window.showInteractiveAvatar = showInteractiveAvatar;
document.addEventListener(
  "DOMContentLoaded",
  function() {
    initializeInteractiveAvatar();
  }
);
document.addEventListener(
  "DOMContentLoaded",
  function() {

    loadVidoraTheme();

    initializeInteractiveAvatar();

  }
);
document.addEventListener(
  "DOMContentLoaded",
  function() {
    initializeVidoraAvatarSystem();
  }
);
/* =========================================================
   VIDORA - GLOBAL FUNCTION EXPORTS
   ========================================================= */

window.showAuthScreen = showAuthScreen;
window.showProfileSetup = showProfileSetup;
window.loadProfile = loadProfile;
window.saveProfile = saveProfile;

/* Avatar selection */
window.selectVidoraAvatar = selectVidoraAvatar;
window.getSelectedVidoraAvatar = getSelectedVidoraAvatar;
window.getVidoraAvatarImage = getVidoraAvatarImage;
window.getVidoraAvatarInfo = getVidoraAvatarInfo;

/* Avatar editor */
window.handleAvatarUpload = handleAvatarUpload;
window.useVidoraAvatar = useVidoraAvatar;
window.resetVidoraAvatar = resetVidoraAvatar;
window.updateAvatarPreview = updateAvatarPreview;
window.renderProfileAvatar = renderProfileAvatar;
window.renderDefaultAvatar = renderDefaultAvatar;
window.renderVidoraAvatarChoices =
  renderVidoraAvatarChoices;

/* Avatar identity */
window.updateAvatarIdentity =
  updateAvatarIdentity;

/* Interactive avatar */
window.showInteractiveAvatar =
  showInteractiveAvatar;

window.closeInteractiveAvatar =
  closeInteractiveAvatar;

window.avatarReact =
  avatarReact;

/* Avatar quick actions */
window.avatarGoHome =
  avatarGoHome;

window.avatarGoProfile =
  avatarGoProfile;

window.avatarGoCreate =
  avatarGoCreate;

window.avatarGoTrending =
  avatarGoTrending;

/* Avatar system */
window.initializeVidoraAvatarSystem =
  initializeVidoraAvatarSystem;
