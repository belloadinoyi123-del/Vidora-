(() => {
  "use strict";

 const SUPABASE_URL = "https://htnrqgzxkfktwoioscjr.supabase.co";
const SUPABASE_KEY = "sb_publishable_JT5rBfXYSX3-3_zyC2cazQ_YXg_ih_h";

// Browser push notifications

const VAPID_PUBLIC_KEY = "BNSyI5LHkvoR198feKug9f2VN8t1nZQzlrjg5cWsvenuTQzyOsxfZn1KLHmVwLpNFJhZgyFkm9O3hUtmJuOYEVw";
  const $ = (id) => document.getElementById(id);
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  let user = null;
  let profile = null;
  let currentChat = null;
  let chatTimer = null;
  let threeScene = null;
  let threeCamera = null;
  let threeRenderer = null;
  let threeAvatar = null;
  let threeFrame = null;
  let isSignup = false;

  const sayStatus = (id, text) => {
    const el = $(id);
    if (el) el.textContent = text || "";
  };

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    })[ch]);
  }

  function timeLabel(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
  }

  function shortName(value = "V") {
    return String(value).trim().charAt(0).toUpperCase() || "V";
  }

  function displayName(p) {
    return p?.display_name || p?.username || "Vidora user";
  }

  function username(p) {
    return p?.username ? "@" + p.username : "@user";
  }

  function greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  function greetUser() {
    const name = displayName(profile);
    $("greetingText").textContent = `${greeting()}, ${name}!`;
    $("assistantReply").textContent =
      "Welcome to Vidora. Watch, share, discover and connect.";

    speak(`${greeting()}, ${name}! Welcome back to Vidora.`);
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) {
      sayStatus("assistantReply", "Speech is not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  }

  function assistantHelp() {
    const message =
      "Welcome to Vidora. Use Home to watch posts, Discover to find people, " +
      "Create to publish, Inbox to chat with mutual followers, and the " +
      "bell to check notifications. You can delete your own posts from your feed.";
    $("assistantReply").textContent = message;
    speak(message);
  }

  function showAuth() {
    $("authScreen").hidden = false;
    $("appShell").hidden = true;
    stopChatPolling();
  }

  function showApp() {
    $("authScreen").hidden = true;
    $("appShell").hidden = false;
    showView("homeView");
    greetUser();
    initThreeAvatar();
    loadFeed();
    loadProfile();
    loadNotifications();
  }

  function showView(viewId) {
    document.querySelectorAll(".view").forEach((view) => {
      view.hidden = view.id !== viewId;
    });

    document.querySelectorAll(".nav-button").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === viewId);
    });

    if (viewId === "discoverView") loadDiscover();
    if (viewId === "inboxView") loadInbox();
    if (viewId === "notificationsView") loadNotifications();
    if (viewId === "profileView") loadProfile();
    if (viewId === "homeView") loadFeed();
  }

  async function getProfile(userId) {
    const { data, error } = await db
      .from("profiles")
      .select("id,username,display_name,avatar_url,bio,created_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async function ensureProfile(authUser, metadata = {}) {
    let existing = await getProfile(authUser.id);
    if (existing) return existing;

    const emailName = (authUser.email || "vidora_user")
      .split("@")[0]
      .replace(/[^a-zA-Z0-9_]/g, "")
      .slice(0, 20) || "vidora_user";

    const newProfile = {
      id: authUser.id,
      username: metadata.username || `${emailName}_${authUser.id.slice(0, 5)}`,
      display_name: metadata.display_name || emailName
    };

    const { error } = await db.from("profiles").upsert(newProfile);
    if (error) throw error;

    return await getProfile(authUser.id);
  }

  async function handleAuth(event) {
    event.preventDefault();
    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;
    const button = $("authSubmit");

    button.disabled = true;
    sayStatus("authMessage", "Please wait...");

    try {
      if (isSignup) {
        const userName = $("authUsername").value.trim().toLowerCase();
        const name = $("authDisplayName").value.trim();

        if (!/^[a-z0-9_]{3,24}$/.test(userName)) {
          throw new Error("Username must be 3–24 letters, numbers or underscores.");
        }

        const { data, error } = await db.auth.signUp({
          email,
          password,
          options: {
            data: { username: userName, display_name: name || userName }
          }
        });

        if (error) throw error;

        if (data.session) {
          await startSession(data.session.user);
        } else {
          sayStatus(
            "authMessage",
            "Account created. Check your email to confirm it, then log in."
          );
        }
      } else {
        const { data, error } = await db.auth.signInWithPassword({
          email, password
        });
        if (error) throw error;
        await startSession(data.user);
      }
    } catch (error) {
      sayStatus("authMessage", error.message || "Authentication failed.");
    } finally {
      button.disabled = false;
    }
  }

  async function startSession(authUser) {
    user = authUser;
    profile = await ensureProfile(authUser, authUser.user_metadata || {});
    showApp();
  }

  async function logout() {
    stopChatPolling();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    const { error } = await db.auth.signOut();
    if (error) {
      alert("Logout failed: " + error.message);
      return;
    }
    user = null;
    profile = null;
    currentChat = null;
    showAuth();
  }

  async function notify(recipientId, type, message, postId = null) {
  if (!user || !recipientId || recipientId === user.id) return;

  const { error } = await db.from("notifications").insert({
    user_id: recipientId,
    actor_id: user.id,
    type,
    message,
    post_id: postId
  });

  

    if (error) console.warn("Notification was not saved:", error.message);
  }

  async function loadFeed() {
    if (!user) return;
    const feed = $("feed");
    feed.innerHTML = '<p class="muted">Loading posts...</p>';

    try {
      const { data: posts, error } = await db
        .from("posts")
        .select("id,user_id,media_url,media_type,caption,created_at")
        .order("created_at", { ascending: false })
        .limit(40);

      if (error) throw error;
      if (!posts?.length) {
        feed.innerHTML = '<p class="muted">No posts yet. Be the first to publish!</p>';
        return;
      }

      const userIds = [...new Set(posts.map((post) => post.user_id))];
      const { data: people, error: peopleError } = await db
        .from("profiles")
        .select("id,username,display_name,avatar_url")
        .in("id", userIds);

      if (peopleError) throw peopleError;

      const peopleMap = Object.fromEntries(
        (people || []).map((person) => [person.id, person])
      );

      const postIds = posts.map((post) => post.id);
      const [{ data: likes }, { data: comments }] = await Promise.all([
        db.from("likes").select("post_id,user_id").in("post_id", postIds),
        db.from("comments")
          .select("id,post_id,user_id,content,created_at")
          .in("post_id", postIds)
          .order("created_at", { ascending: true })
      ]);

      feed.innerHTML = posts.map((post) => {
        const author = peopleMap[post.user_id] || {};
        const postLikes = (likes || []).filter((like) => String(like.post_id) === String(post.id));
        const postComments = (comments || []).filter(
          (comment) => String(comment.post_id) === String(post.id)
        );
        const liked = postLikes.some((like) => like.user_id === user.id);
        const ownPost = post.user_id === user.id;
        const media = post.media_type === "video"
          ? `<video class="post-media" src="${escapeHTML(post.media_url)}"
               controls playsinline preload="metadata"></video>`
          : `<img class="post-media" src="${escapeHTML(post.media_url)}"
               alt="Post by ${escapeHTML(displayName(author))}" loading="lazy">`;

        return `
          <article class="post-card" data-post-id="${escapeHTML(post.id)}">
            <div class="post-header">
              <div class="mini-avatar">${escapeHTML(shortName(displayName(author)))}</div>
              <div class="post-user">
                <strong>${escapeHTML(displayName(author))}</strong>
                <small>${escapeHTML(username(author))} · ${escapeHTML(timeLabel(post.created_at))}</small>
              </div>
              ${ownPost ? `<button class="text-button delete-post" data-id="${escapeHTML(post.id)}">Delete</button>` : ""}
            </div>
            ${media}
            ${post.caption ? `<p class="post-caption">${escapeHTML(post.caption)}</p>` : ""}
            <div class="post-actions">
              <button class="${liked ? "liked" : ""} like-post" data-id="${escapeHTML(post.id)}">
                ${liked ? "♥ Liked" : "♡ Like"} (${postLikes.length})
              </button>
              <button class="focus-comments" data-id="${escapeHTML(post.id)}">
                💬 Comments (${postComments.length})
              </button>
              ${!ownPost ? `<button class="follow-button follow-author" data-id="${escapeHTML(author.id || post.user_id)}">Follow</button>` : ""}
            </div>
            <div class="comment-list">
              ${postComments.map((comment) => {
                const commenter = peopleMap[comment.user_id] || {};
                return `<div class="comment-item"><strong>${escapeHTML(displayName(commenter))}:</strong> ${escapeHTML(comment.content)}</div>`;
              }).join("")}
            </div>
            <form class="comment-form" data-id="${escapeHTML(post.id)}">
              <input name="content" maxlength="500" placeholder="Write a comment..." required>
              <button class="primary" type="submit">Send</button>
            </form>
          </article>`;
      }).join("");
    } catch (error) {
      feed.innerHTML = `<p class="message">Could not load feed: ${escapeHTML(error.message)}</p>`;
    }
  }

  async function publishPost(event) {
    event.preventDefault();
    if (!user) return;

    const file = $("createFile").files[0];
    const caption = $("createCaption").value.trim();
    const button = $("publishBtn");

    if (!file) return sayStatus("createMessage", "Choose a photo or video first.");
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      return sayStatus("createMessage", "Choose an image or video file.");
    }
    if (file.size > 50 * 1024 * 1024) {
      return sayStatus("createMessage", "File must be 50 MB or smaller.");
    }

    button.disabled = true;
    sayStatus("createMessage", "Uploading media...");

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await db.storage
        .from("media")
        .upload(path, file, { upsert: false, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = db.storage.from("media").getPublicUrl(path);
      const mediaType = file.type.startsWith("video/") ? "video" : "image";

      const { error: postError } = await db.from("posts").insert({
        user_id: user.id,
        media_url: urlData.publicUrl,
        media_type: mediaType,
        caption
      });

      if (postError) {
        await db.storage.from("media").remove([path]);
        throw postError;
      }

      $("createForm").reset();
      sayStatus("createMessage", "Post published!");
      showView("homeView");
    } catch (error) {
      sayStatus("createMessage", "Publish failed: " + error.message);
    } finally {
      button.disabled = false;
    }
  }

  async function toggleLike(postId) {
    try {
      const { data: existing, error: findError } = await db
        .from("likes")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (findError) throw findError;

      if (existing) {
        const { error } = await db.from("likes")
          .delete().eq("post_id", postId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("likes")
          .insert({ post_id: postId, user_id: user.id });
        if (error) throw error;

        const { data: post } = await db.from("posts")
          .select("user_id").eq("id", postId).maybeSingle();

        if (post) await notify(post.user_id, "like", `${displayName(profile)} liked your post.`, postId);
      }

      await loadFeed();
    } catch (error) {
      alert("Like action failed: " + error.message);
    }
  }

  async function addComment(event) {
    event.preventDefault();
    const form = event.target;
    const postId = form.dataset.id;
    const content = new FormData(form).get("content").toString().trim();
    if (!content) return;

    try {
      const { error } = await db.from("comments").insert({
        post_id: postId, user_id: user.id, content
      });
      if (error) throw error;

      const { data: post } = await db.from("posts")
        .select("user_id").eq("id", postId).maybeSingle();

      if (post) {
        await notify(post.user_id, "comment",
          `${displayName(profile)} commented on your post.`, postId);
      }

      await loadFeed();
    } catch (error) {
      alert("Comment failed: " + error.message);
    }
  }

  async function deleteOwnPost(postId) {
    if (!confirm("Delete this post permanently?")) return;

    try {
      const { data: post, error: readError } = await db.from("posts")
        .select("id,user_id,media_url").eq("id", postId).maybeSingle();

      if (readError) throw readError;
      if (!post || post.user_id !== user.id) {
        throw new Error("You can only delete your own posts.");
      }

      const { error } = await db.from("posts")
        .delete().eq("id", postId).eq("user_id", user.id);

      if (error) throw error;

      // The database delete policy must also enforce post ownership.
      // This does not remove media if its storage path is unknown.
      await loadFeed();
      await loadProfile();
    } catch (error) {
      alert("Could not delete post: " + error.message);
    }
  }

  async function followUser(targetId) {
    if (!targetId || targetId === user.id) return;

    try {
      const { data: existing, error: lookupError } = await db.from("follows")
        .select("follower_id")
        .eq("follower_id", user.id)
        .eq("following_id", targetId)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existing) {
        const { error } = await db.from("follows").delete()
          .eq("follower_id", user.id).eq("following_id", targetId);
        if (error) throw error;
      } else {
        const { error } = await db.from("follows").insert({
          follower_id: user.id, following_id: targetId
        });
        if (error) throw error;

        await notify(targetId, "follow", `${displayName(profile)} followed you.`);
      }

      await loadDiscover();
      await loadFeed();
      await loadProfile();
    } catch (error) {
      alert("Follow action failed: " + error.message);
    }
  }

  async function loadDiscover() {
    if (!user) return;
    const box = $("discoverList");
    box.innerHTML = '<p class="muted">Loading people...</p>';

    try {
      const [{ data: people, error: peopleError }, { data: following, error: followError }] =
        await Promise.all([
          db.from("profiles")
            .select("id,username,display_name,avatar_url")
            .neq("id", user.id).limit(80),
          db.from("follows").select("following_id").eq("follower_id", user.id)
        ]);

      if (peopleError) throw peopleError;
      if (followError) throw followError;

      const followingSet = new Set((following || []).map((f) => f.following_id));
      box.innerHTML = (people || []).map((person) => `
        <div class="person-row">
          <div class="mini-avatar">${escapeHTML(shortName(displayName(person)))}</div>
          <div class="person-info">
            <strong>${escapeHTML(displayName(person))}</strong>
            <small>${escapeHTML(username(person))}</small>
          </div>
          <button class="follow-button follow-person" data-id="${escapeHTML(person.id)}">
            ${followingSet.has(person.id) ? "Following · Unfollow" : "Follow"}
          </button>
        </div>
      `).join("") || '<p class="muted">No people to show yet.</p>';
    } catch (error) {
      box.innerHTML = `<p class="message">${escapeHTML(error.message)}</p>`;
    }
  }

  async function loadProfile() {
    if (!user) return;

    try {
      profile = await getProfile(user.id) || profile;
      $("profileDisplayName").textContent = displayName(profile);
      $("profileUsername").textContent = username(profile);
      $("profileAvatar").textContent = shortName(displayName(profile));

      const [{ count: postsCount }, { count: followersCount }, { count: followingCount }] =
        await Promise.all([
          db.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          db.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", user.id),
          db.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", user.id)
        ]);

      $("postCount").textContent = postsCount ?? 0;
      $("followerCount").textContent = followersCount ?? 0;
      $("followingCount").textContent = followingCount ?? 0;

      const { data: posts, error } = await db.from("posts")
        .select("id,user_id,media_url,media_type,caption,created_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);

      if (error) throw error;

      $("myPosts").innerHTML = (posts || []).map((post) => `
        <article class="post-card">
          ${post.media_type === "video"
            ? `<video class="post-media" src="${escapeHTML(post.media_url)}" controls playsinline></video>`
            : `<img class="post-media" src="${escapeHTML(post.media_url)}" alt="Your post" loading="lazy">`}
          <p class="post-caption">${escapeHTML(post.caption || "")}</p>
          <div class="post-actions">
            <button class="text-button delete-post" data-id="${escapeHTML(post.id)}">Delete my post</button>
          </div>
        </article>
      `).join("") || '<p class="muted">You have not published anything yet.</p>';
    } catch (error) {
      console.warn("Profile load issue:", error.message);
    }
  }

  async function loadNotifications() {
  if (!user) return;

  const box = $("notificationList");
  if (!box) return;

  box.innerHTML = '<p class="muted">Loading notifications...</p>';

  try {
    const { data, error } = await db
      .from("notifications")
      .select("id,user_id,actor_id,type,message,post_id,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    box.innerHTML = (data || []).map((n) => `
      <div class="notification-row">
        <div class="mini-avatar">
          ${escapeHTML(shortName(n.type))}
        </div>
        <div>
          <p>${escapeHTML(
            n.message || "You have a new notification."
          )}</p>
          <small>${escapeHTML(timeLabel(n.created_at))}</small>
        </div>
      </div>
    `).join("") || '<p class="muted">You are all caught up.</p>';

  } catch (error) {
    box.innerHTML =
      `<p class="message">Notifications: ${escapeHTML(error.message)}</p>`;
  }
}

  async function loadInbox() {
    if (!user) return;
    stopChatPolling();
    currentChat = null;
    $("chatPanel").hidden = true;
    $("inboxList").hidden = false;
    $("inboxList").innerHTML = '<p class="muted">Loading chats...</p>';

    try {
      const { data: mine, error: mineError } = await db.from("follows")
        .select("following_id").eq("follower_id", user.id);
      if (mineError) throw mineError;

      const myFollowing = (mine || []).map((row) => row.following_id);
      if (!myFollowing.length) {
        $("inboxList").innerHTML = '<p class="muted">Follow someone to start connecting.</p>';
        return;
      }

      const { data: theirs, error: theirsError } = await db.from("follows")
        .select("follower_id").eq("following_id", user.id);
      if (theirsError) throw theirsError;

      const followsMe = new Set((theirs || []).map((row) => row.follower_id));
      const mutualIds = myFollowing.filter((id) => followsMe.has(id));

      if (!mutualIds.length) {
        $("inboxList").innerHTML = '<p class="muted">Chat becomes available when you follow each other.</p>';
        return;
      }

      const { data: people, error: peopleError } = await db.from("profiles")
        .select("id,username,display_name")
        .in("id", mutualIds);
      if (peopleError) throw peopleError;

      $("inboxList").innerHTML = (people || []).map((person) => `
        <button class="inbox-row open-chat" data-id="${escapeHTML(person.id)}"
          data-name="${escapeHTML(displayName(person))}">
          <div class="mini-avatar">${escapeHTML(shortName(displayName(person)))}</div>
          <div class="person-info">
            <strong>${escapeHTML(displayName(person))}</strong>
            <small>${escapeHTML(username(person))}</small>
          </div>
          <span>›</span>
        </button>
      `).join("");
    } catch (error) {
      $("inboxList").innerHTML =
        `<p class="message">Could not load inbox: ${escapeHTML(error.message)}</p>`;
    }
  }

  async function openChat(targetId, targetName) {
    currentChat = { id: targetId, name: targetName };
    $("chatName").textContent = targetName;
    $("chatPanel").hidden = false;
    $("inboxList").hidden = true;
    await loadMessages();
    startChatPolling();
  }

  async function loadMessages() {
    if (!currentChat || !user) return;

    try {
      const { data, error } = await db.from("messages")
        .select("id,sender_id,receiver_id,content,created_at")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${currentChat.id}),` +
          `and(sender_id.eq.${currentChat.id},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      const box = $("chatMessages");
      box.innerHTML = (data || []).map((message) => `
        <div class="chat-bubble ${message.sender_id === user.id ? "mine" : ""}">
          ${escapeHTML(message.content)}
          <small>${escapeHTML(timeLabel(message.created_at))}</small>
        </div>
      `).join("") || '<p class="muted">Say hello to start chatting.</p>';

      box.scrollTop = box.scrollHeight;
      sayStatus("chatMessage", "");
    } catch (error) {
      sayStatus("chatMessage", "Could not load messages: " + error.message);
    }
  }

  async function sendMessage(event) {
  event.preventDefault();

  if (!user || !currentChat) return;

  const input = $("messageInput");
  const content = input.value.trim();

  if (!content) return;

  try {
    const { error } = await db.from("messages").insert({
      sender_id: user.id,
      receiver_id: currentChat.id,
      content
    });

    if (error) throw error;

    input.value = "";

    // Save a notification for the message recipient.
    await notify(
      currentChat.id,
      "message",
      `${displayName(profile)} sent you a message.`
    );

    await loadMessages();

  } catch (error) {
    sayStatus(
      "chatMessage",
      "Message failed: " + error.message
    );
  }
}

  function startChatPolling() {
    stopChatPolling();
    chatTimer = setInterval(() => {
      if (currentChat) loadMessages();
    }, 5000);
  }

  function stopChatPolling() {
    if (chatTimer) clearInterval(chatTimer);
    chatTimer = null;
  }

  function initThreeAvatar() {
    const host = $("avatarCanvas");
    if (!host || !window.THREE || threeRenderer) return;

    try {
      const THREE = window.THREE;
      threeScene = new THREE.Scene();
      threeScene.background = new THREE.Color("#100d20");

      threeCamera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      threeCamera.position.z = 5;

      threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      host.appendChild(threeRenderer.domElement);

      threeScene.add(new THREE.AmbientLight(0xffffff, 1.8));

      const light = new THREE.DirectionalLight(0xffffff, 2);
      light.position.set(2, 3, 5);
      threeScene.add(light);

      threeAvatar = new THREE.Group();

      const skin = new THREE.MeshStandardMaterial({ color: "#dca57f", roughness: .75 });
      const hair = new THREE.MeshStandardMaterial({ color: "#30203d", roughness: .9 });
      const clothes = new THREE.MeshStandardMaterial({ color: "#8b5cf6", roughness: .55 });
      const eyes = new THREE.MeshStandardMaterial({ color: "#171323" });

      const head = new THREE.Mesh(new THREE.SphereGeometry(.76, 32, 24), skin);
      head.position.y = .35;
      threeAvatar.add(head);

      const hairCap = new THREE.Mesh(
        new THREE.SphereGeometry(.78, 32, 16, 0, Math.PI * 2, 0, Math.PI * .55),
        hair
      );
      hairCap.position.y = .55;
      threeAvatar.add(hairCap);

      [-.25, .25].forEach((x) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 12), eyes);
        eye.position.set(x, .4, .69);
        threeAvatar.add(eye);
      });

      const body = new THREE.Mesh(
        new THREE.SphereGeometry(.72, 32, 24),
        clothes
      );
      body.scale.set(1.25, .8, .75);
      body.position.y = -1;
      threeAvatar.add(body);

      threeScene.add(threeAvatar);

      const resize = () => {
        if (!host.clientWidth || !host.clientHeight) return;
        threeCamera.aspect = host.clientWidth / host.clientHeight;
        threeCamera.updateProjectionMatrix();
        threeRenderer.setSize(host.clientWidth, host.clientHeight, false);
      };

      resize();
      window.addEventListener("resize", resize);

      const animate = () => {
        if (!threeRenderer) return;
        threeFrame = requestAnimationFrame(animate);
        threeAvatar.rotation.y += 0.008;
        threeAvatar.position.y = Math.sin(Date.now() * 0.0015) * 0.06;
        threeRenderer.render(threeScene, threeCamera);
      };
      animate();
    } catch (error) {
      console.warn("3D avatar could not start:", error);
      host.textContent = "Vi";
    }
  }

  // Authentication controls
  $("authForm").addEventListener("submit", handleAuth);

  $("showSignup").addEventListener("click", () => {
    isSignup = true;
    $("authTitle").textContent = "Create your account";
    $("signupFields").hidden = false;
    $("authSubmit").textContent = "Sign up";
    $("showSignup").hidden = true;
    $("showLogin").hidden = false;
    $("authPassword").autocomplete = "new-password";
    sayStatus("authMessage", "");
  });

  $("showLogin").addEventListener("click", () => {
    isSignup = false;
    $("authTitle").textContent = "Welcome back";
    $("signupFields").hidden = true;
    $("authSubmit").textContent = "Log in";
    $("showSignup").hidden = false;
    $("showLogin").hidden = true;
    $("authPassword").autocomplete = "current-password";
    sayStatus("authMessage", "");
  });

  $("logoutBtn").addEventListener("click", logout);
  $("createForm").addEventListener("submit", publishPost);
  $("refreshFeedBtn").addEventListener("click", loadFeed);
  $("notificationsBtn").addEventListener("click", () => showView("notificationsView"));
  $("enablePushBtn").addEventListener("click", async () => {
  const status = $("pushStatus");
  const button = $("enablePushBtn");

  if (!("Notification" in window)) {
    status.textContent =
      "Browser notifications are not supported on this device.";
    return;
  }

  if (!("serviceWorker" in navigator)) {
    status.textContent =
      "Service workers are not supported in this browser.";
    return;
  }

  button.disabled = true;
  status.textContent = "Enabling notifications...";

  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      status.textContent =
        "Notifications were not allowed. Check your browser site settings.";
      return;
    }

    const registration =
      await navigator.serviceWorker.register("./sw.js");

    await navigator.serviceWorker.ready;

    status.textContent =
      "Browser notifications enabled! Vidora is ready for push setup.";

    button.textContent = "Notifications enabled";

    // Test a local notification while Vidora is open.
    await registration.showNotification("Vidora", {
      body: "Browser notifications are working!",
      icon: "./favicon.ico",
      data: { url: "./" }
    });

  } catch (error) {
    status.textContent =
      "Could not enable notifications: " + error.message;
  } finally {
    button.disabled = false;
  }
});
  $("backHomeBtn").addEventListener("click", () => showView("homeView"));
  $("messageForm").addEventListener("submit", sendMessage);
  $("backToInboxBtn").addEventListener("click", () => {
    stopChatPolling();
    currentChat = null;
    $("chatPanel").hidden = true;
    $("inboxList").hidden = false;
  });
  $("speakBtn").addEventListener("click", () => speak(
    $("greetingText").textContent + " " + $("assistantReply").textContent
  ));
  $("assistantHelpBtn").addEventListener("click", assistantHelp);

  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  document.addEventListener("click", async (event) => {
    const like = event.target.closest(".like-post");
    if (like) return toggleLike(like.dataset.id);

    const deleteButton = event.target.closest(".delete-post");
    if (deleteButton) return deleteOwnPost(deleteButton.dataset.id);

    const follow = event.target.closest(".follow-person, .follow-author");
    if (follow) return followUser(follow.dataset.id);

    const chat = event.target.closest(".open-chat");
    if (chat) return openChat(chat.dataset.id, chat.dataset.name);
  });

  document.addEventListener("submit", (event) => {
    if (event.target.matches(".comment-form")) addComment(event);
  });

  db.auth.getSession().then(async ({ data, error }) => {
    if (error) {
      sayStatus("authMessage", error.message);
      return;
    }
    if (data.session?.user) {
      try {
        await startSession(data.session.user);
      } catch (err) {
        sayStatus("authMessage", "Could not load your profile: " + err.message);
        showAuth();
      }
    } else {
      showAuth();
    }
  });

  db.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      user = null;
      profile = null;
      showAuth();
    }
  });
})();
