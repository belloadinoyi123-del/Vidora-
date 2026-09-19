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
  const button = getElement("logoutBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Logging out...";
  }

  try {
    const { error } =
      await supabaseClient.auth.signOut();

    if (error) {
      console.error("LOGOUT ERROR:", error);

      alert(error.message || "Unable to log out.");

      return;
    }

    currentUser = null;

    showPublicFeed();

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


/* =========================================================
   7. SHOW AUTH SCREEN
   ========================================================= */

function showAuthScreen() {
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

  await loadFeed();

  appInitialized = true;
}


/* =========================================================
   9. LOAD PROFILE
   ========================================================= */

async function loadProfile() {
  if (!currentUser) {
    return;
  }

  const usernameElement =
    getElement("profileUsername");

  const emailElement =
    getElement("profileEmail");

  if (emailElement) {
    emailElement.textContent =
      currentUser.email || "No email";
  }

  let username = "Vidora User";

  /*
    Try the profiles table if it exists.
    If it doesn't exist yet, Vidora still works.
  */

  try {
    const { data, error } =
      await supabaseClient
        .from("profiles")
        .select("username")
        .eq("id", currentUser.id)
        .maybeSingle();

    if (!error && data && data.username) {
      username = data.username;
    }
  } catch (error) {
    console.log("Profiles table not available yet.");
  }

  if (usernameElement) {
    usernameElement.textContent = username;
  }

  const avatar =
    document.querySelector(".profileAvatar");

  if (avatar) {
    avatar.textContent =
      username.charAt(0).toUpperCase();
  }
}


/* =========================================================
   10. VALIDATE MEDIA FILE
   ========================================================= */

function validateMediaFile(file) {
  if (!file) {
    return {
      valid: false,
      message: "Please choose an image or video."
    };
  }

  if (!file.type.startsWith("image/") &&
      !file.type.startsWith("video/")) {
    return {
      valid: false,
      message: "Only images and videos are supported."
    };
  }

  /*
    50 MB maximum for this application.
    This is separate from JavaScript size.
  */

  const MAX_SIZE = 50 * 1024 * 1024;

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      message: "File is too large. Maximum size is 50 MB."
    };
  }

  return {
    valid: true,
    message: ""
  };
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
  const feed = getElement("feed");

  if (!feed) {
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
      console.error(
        "LOAD FEED ERROR:",
        error
      );

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
      const element =
        await createPostElement(post);

      feed.appendChild(element);
    }

  } catch (error) {
    console.error(
      "LOAD FEED EXCEPTION:",
      error
    );

    feed.innerHTML = `
      <div class="loading">
        Something went wrong while loading Vidora.
      </div>
    `;
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
          "id,user_id,content,created_at"
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

    data.forEach(function(comment) {
      const item =
        document.createElement("div");

      item.className = "comment";

      item.innerHTML = `
        <strong>Vidora User</strong>
        <span>
          ${escapeHTML(comment.content)}
        </span>
      `;

      commentsList.appendChild(item);
    });

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

  if (page === "home") {
    loadFeed();
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
    profile: 4
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

      if (
        event === "SIGNED_IN" ||
        event === "INITIAL_SESSION"
      ) {
        await showApp();
      }

    } else {

      currentUser = null;

      // Visitors can watch Vidora without an account
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


/* =========================================================
   29. VIDORA READY MESSAGE
   ========================================================= */

console.log(
  "Vidora app.js initialized."
);
