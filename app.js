(() => {
  "use strict";

  const SUPABASE_URL = "https://htnrqgzxkfktwoioscjr.supabase.co";
  const SUPABASE_KEY = "sb_publishable_JT5rBfXYSX3-3_zyC2cazQ_YXg_ih_h";
  const VAPID_PUBLIC_KEY = "BNSyI5LHkvoR198feKug9f2VN8t1nZQzlrjg5cWsvenuTQzyOsxfZn1KLHmVwLpNFJhZgyFkm9O3hUtmJuOYEVw";

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  }

  const $ = id => document.getElementById(id);
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  let user = null;
  let profile = null;
  let currentChat = null;
  let chatTimer = null;
  let isSignup = false;
  let signupStep = 1;
  let selectedInterests = new Set();
  let avatarEnergyColor = "#a855f7";

  // ---------- Three.js Avatar state ----------
  let threeScene, threeCamera, threeRenderer, threeAvatar, threeFrame;
  let avatarGroup, head, leftEye, rightEye, holoShell, energyRing, particles;
  let avatarMood = "idle";
  let mouseX = 0, mouseY = 0;
  let targetLookX = 0, targetLookY = 0;
  let isSpeaking = false;
  let danceMode = false;
  let waveMode = false;

  // ---------- Particle background ----------
  function initParticles() {
    const canvas = $("bgCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w, h, pts = [];
    const COUNT = 80;

    function resize() {
      w = canvas.width = innerWidth;
      h = canvas.height = innerHeight;
    }
    function create() {
      pts = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.5 + 0.3,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        a: Math.random() * 0.4 + 0.1
      }));
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)*0.7);
      g.addColorStop(0, "rgba(12,6,30,0.12)");
      g.addColorStop(1, "rgba(5,3,15,0.55)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(168,120,255,${p.a})`;
        ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i+1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          const d = Math.hypot(a.x-b.x, a.y-b.y);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(100,80,200,${0.1*(1-d/100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }
    resize(); create(); draw();
    addEventListener("resize", () => { resize(); create(); });
  }

  // ---------- Helpers ----------
  const sayStatus = (id, text) => { const el = $(id); if (el) el.textContent = text || ""; };
  function escapeHTML(v = "") {
    return String(v).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
  function timeLabel(v) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
  }
  function shortName(v = "V") { return String(v).trim().charAt(0).toUpperCase() || "V"; }
  function displayName(p) { return p?.display_name || p?.username || "Vidora user"; }
  function username(p) { return p?.username ? "@" + p.username : "@user"; }
  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  function setAvatarMood(mood) {
    avatarMood = mood;
    const el = $("avatarMood");
    if (el) el.textContent = mood.charAt(0).toUpperCase() + mood.slice(1);
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    isSpeaking = true;
    setAvatarMood("speaking");
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1; u.pitch = 1.05;
    u.onend = u.onerror = () => {
      isSpeaking = false;
      setAvatarMood("idle");
    };
    window.speechSynthesis.speak(u);
  }

  function greetUser() {
    const name = displayName(profile);
    $("greetingText").textContent = `${greeting()}, ${name}`;
    $("assistantReply").textContent = "Your holographic companion is online. Move your mouse or click the avatar.";
    speak(`${greeting()}, ${name}! Welcome back to Vidora.`);
  }

  function assistantHelp() {
    const msg = "I am your holographic presence. Move the mouse to make me look around. Click Wave or Dance. Use Cast to mirror Vidora to another screen. Chat only works with mutual followers.";
    $("assistantReply").textContent = msg;
    speak(msg);
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
    initInteractiveAvatar();
    loadFeed();
    loadProfile();
    loadNotifications();
  }

  function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.hidden = v.id !== id);
    document.querySelectorAll(".nav-button").forEach(b => b.classList.toggle("active", b.dataset.view === id));
    if (id === "discoverView") loadDiscover();
    if (id === "inboxView") loadInbox();
    if (id === "notificationsView") loadNotifications();
    if (id === "profileView") loadProfile();
    if (id === "homeView") loadFeed();
  }

  // ---------- Signup Wizard ----------
  function setSignupStep(step) {
    signupStep = step;
    document.querySelectorAll(".signup-step").forEach(el => el.hidden = Number(el.dataset.step) !== step);
    document.querySelectorAll(".prog-step").forEach(el => {
      const s = Number(el.dataset.step);
      el.classList.toggle("active", s === step);
      el.classList.toggle("done", s < step);
    });
    $("signupBack").hidden = step === 1;
    $("signupNext").textContent = step === 4 ? "Enter the Network" : "Continue";
    if (step === 4) {
      $("reviewUsername").textContent = "@" + ($("authUsername").value.trim() || "—");
      $("reviewName").textContent = $("authDisplayName").value.trim() || "—";
      $("reviewEmail").textContent = $("authEmail").value.trim() || "—";
      $("reviewInterests").textContent = selectedInterests.size ? [...selectedInterests].join(", ") : "None";
    }
  }

  function updatePasswordStrength() {
    const pass = $("authPassword")?.value || "";
    const fill = document.querySelector(".strength-fill");
    const text = document.querySelector(".strength-text");
    if (!fill || !text) return;
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    const levels = ["Weak","Fair","Good","Strong","Elite"];
    const colors = ["#f87171","#fb923c","#facc15","#4ade80","#22d3ee"];
    fill.style.width = Math.min(100, (score/5)*100) + "%";
    fill.style.background = colors[Math.max(0, score-1)];
    text.textContent = levels[Math.max(0, score-1)];
  }

  function validateSignupStep(step) {
    if (step === 1) {
      const u = $("authUsername").value.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,24}$/.test(u)) { sayStatus("authMessage", "Username must be 3–24 letters, numbers or underscores."); return false; }
      if (!$("authDisplayName").value.trim()) { sayStatus("authMessage", "Please enter a display name."); return false; }
    }
    if (step === 2) {
      const email = $("authEmail").value.trim();
      if (!email || !email.includes("@")) { sayStatus("authMessage", "Enter a valid email."); return false; }
      if (($("authPassword").value || "").length < 8) { sayStatus("authMessage", "Password must be at least 8 characters."); return false; }
    }
    if (step === 4 && !$("authTerms").checked) {
      sayStatus("authMessage", "Please accept the network terms."); return false;
    }
    sayStatus("authMessage", "");
    return true;
  }

  // ---------- Auth ----------
  async function getProfile(id) {
    const { data, error } = await db.from("profiles").select("id,username,display_name,avatar_url,bio,created_at").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function ensureProfile(authUser, meta = {}) {
    let existing = await getProfile(authUser.id);
    if (existing) return existing;
    const emailName = (authUser.email || "vidora_user").split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || "vidora_user";
    const newProfile = {
      id: authUser.id,
      username: meta.username || `${emailName}_${authUser.id.slice(0,5)}`,
      display_name: meta.display_name || emailName,
      bio: meta.bio || null
    };
    const { error } = await db.from("profiles").upsert(newProfile);
    if (error) throw error;
    return await getProfile(authUser.id);
  }

  async function handleAuth(e) {
    e.preventDefault();
    if (!isSignup) {
      const email = $("loginEmail").value.trim();
      const password = $("loginPassword").value;
      const btn = $("authSubmit");
      btn.disabled = true;
      sayStatus("authMessage", "Connecting to the network...");
      try {
        const { data, error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await startSession(data.user);
      } catch (err) {
        sayStatus("authMessage", err.message || "Authentication failed.");
      } finally { btn.disabled = false; }
      return;
    }
    if (signupStep !== 4) return;
    if (!validateSignupStep(4)) return;
    const btn = $("signupNext");
    btn.disabled = true;
    sayStatus("authMessage", "Creating your identity...");
    try {
      const userName = $("authUsername").value.trim().toLowerCase();
      const name = $("authDisplayName").value.trim();
      const email = $("authEmail").value.trim();
      const password = $("authPassword").value;
      const bio = $("authBio")?.value.trim() || "";
      const { data, error } = await db.auth.signUp({
        email, password,
        options: { data: { username: userName, display_name: name || userName, bio, interests: [...selectedInterests], energy_color: avatarEnergyColor } }
      });
      if (error) throw error;
      if (data.session) await startSession(data.session.user);
      else {
        sayStatus("authMessage", "Account created. Check your email to confirm, then log in.");
        $("showLogin").click();
      }
    } catch (err) {
      sayStatus("authMessage", err.message || "Signup failed.");
    } finally { btn.disabled = false; }
  }

  async function startSession(authUser) {
    user = authUser;
    profile = await ensureProfile(authUser, authUser.user_metadata || {});
    if (authUser.user_metadata?.energy_color) avatarEnergyColor = authUser.user_metadata.energy_color;
    showApp();
  }

  async function logout() {
    stopChatPolling();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    await db.auth.signOut();
    user = profile = currentChat = null;
    showAuth();
  }

  async function notify(recipientId, type, message, postId = null) {
    if (!user || !recipientId || recipientId === user.id) return;
    await db.from("notifications").insert({ user_id: recipientId, actor_id: user.id, type, message, post_id: postId });
  }

  // ---------- Feed / Posts / Social (core kept intact) ----------
  async function loadFeed() {
    if (!user) return;
    const feed = $("feed");
    feed.innerHTML = '<p class="muted">Syncing posts...</p>';
    try {
      const { data: posts, error } = await db.from("posts").select("id,user_id,media_url,media_type,caption,created_at").order("created_at", { ascending: false }).limit(40);
      if (error) throw error;
      if (!posts?.length) { feed.innerHTML = '<p class="muted">No posts yet. Be the first.</p>'; return; }
      const userIds = [...new Set(posts.map(p => p.user_id))];
      const { data: people } = await db.from("profiles").select("id,username,display_name,avatar_url").in("id", userIds);
      const peopleMap = Object.fromEntries((people || []).map(p => [p.id, p]));
      const postIds = posts.map(p => p.id);
      const [{ data: likes }, { data: comments }] = await Promise.all([
        db.from("likes").select("post_id,user_id").in("post_id", postIds),
        db.from("comments").select("id,post_id,user_id,content,created_at").in("post_id", postIds).order("created_at", { ascending: true })
      ]);
      feed.innerHTML = posts.map(post => {
        const author = peopleMap[post.user_id] || {};
        const postLikes = (likes || []).filter(l => String(l.post_id) === String(post.id));
        const postComments = (comments || []).filter(c => String(c.post_id) === String(post.id));
        const liked = postLikes.some(l => l.user_id === user.id);
        const own = post.user_id === user.id;
        const media = post.media_type === "video"
          ? `<video class="post-media" src="${escapeHTML(post.media_url)}" controls playsinline preload="metadata"></video>`
          : `<img class="post-media" src="${escapeHTML(post.media_url)}" alt="" loading="lazy">`;
        return `<article class="post-card">
          <div class="post-header">
            <div class="mini-avatar">${escapeHTML(shortName(displayName(author)))}</div>
            <div class="post-user"><strong>${escapeHTML(displayName(author))}</strong><small>${escapeHTML(username(author))} · ${escapeHTML(timeLabel(post.created_at))}</small></div>
            ${own ? `<button class="text-button delete-post" data-id="${escapeHTML(post.id)}">Delete</button>` : ""}
          </div>
          ${media}
          ${post.caption ? `<p class="post-caption">${escapeHTML(post.caption)}</p>` : ""}
          <div class="post-actions">
            <button class="${liked ? "liked" : ""} like-post" data-id="${escapeHTML(post.id)}">${liked ? "♥ Liked" : "♡ Like"} (${postLikes.length})</button>
            <button>💬 ${postComments.length}</button>
            ${!own ? `<button class="follow-button follow-author" data-id="${escapeHTML(author.id || post.user_id)}">Follow</button>` : ""}
          </div>
          <div class="comment-list">${postComments.map(c => {
            const cm = peopleMap[c.user_id] || {};
            return `<div class="comment-item"><strong>${escapeHTML(displayName(cm))}:</strong> ${escapeHTML(c.content)}</div>`;
          }).join("")}</div>
          <form class="comment-form" data-id="${escapeHTML(post.id)}">
            <input name="content" maxlength="500" placeholder="Transmit a comment..." required>
            <button class="btn primary small" type="submit">Send</button>
          </form>
        </article>`;
      }).join("");
    } catch (err) {
      feed.innerHTML = `<p class="message">Could not load feed: ${escapeHTML(err.message)}</p>`;
    }
  }

  async function publishPost(e) {
    e.preventDefault();
    if (!user) return;
    const file = $("createFile").files[0];
    const caption = $("createCaption").value.trim();
    const btn = $("publishBtn");
    if (!file) return sayStatus("createMessage", "Choose a photo or video first.");
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return sayStatus("createMessage", "Choose an image or video.");
    if (file.size > 50*1024*1024) return sayStatus("createMessage", "File must be ≤ 50 MB.");
    btn.disabled = true;
    sayStatus("createMessage", "Uploading...");
    try {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
      const { error: upErr } = await db.storage.from("media").upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = db.storage.from("media").getPublicUrl(path);
      const mediaType = file.type.startsWith("video/") ? "video" : "image";
      const { error: postErr } = await db.from("posts").insert({ user_id: user.id, media_url: urlData.publicUrl, media_type: mediaType, caption });
      if (postErr) { await db.storage.from("media").remove([path]); throw postErr; }
      $("createForm").reset();
      sayStatus("createMessage", "Published!");
      showView("homeView");
    } catch (err) {
      sayStatus("createMessage", "Publish failed: " + err.message);
    } finally { btn.disabled = false; }
  }

  async function toggleLike(postId) {
    try {
      const { data: existing } = await db.from("likes").select("post_id").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
      if (existing) await db.from("likes").delete().eq("post_id", postId).eq("user_id", user.id);
      else {
        await db.from("likes").insert({ post_id: postId, user_id: user.id });
        const { data: post } = await db.from("posts").select("user_id").eq("id", postId).maybeSingle();
        if (post) await notify(post.user_id, "like", `${displayName(profile)} liked your post.`, postId);
      }
      await loadFeed();
    } catch (err) { alert("Like failed: " + err.message); }
  }

  async function addComment(e) {
    e.preventDefault();
    const form = e.target;
    const postId = form.dataset.id;
    const content = new FormData(form).get("content").toString().trim();
    if (!content) return;
    try {
      await db.from("comments").insert({ post_id: postId, user_id: user.id, content });
      const { data: post } = await db.from("posts").select("user_id").eq("id", postId).maybeSingle();
      if (post) await notify(post.user_id, "comment", `${displayName(profile)} commented on your post.`, postId);
      await loadFeed();
    } catch (err) { alert("Comment failed: " + err.message); }
  }

  async function deleteOwnPost(postId) {
    if (!confirm("Delete this post permanently?")) return;
    try {
      const { data: post } = await db.from("posts").select("id,user_id").eq("id", postId).maybeSingle();
      if (!post || post.user_id !== user.id) throw new Error("You can only delete your own posts.");
      await db.from("posts").delete().eq("id", postId).eq("user_id", user.id);
      await loadFeed(); await loadProfile();
    } catch (err) { alert("Delete failed: " + err.message); }
  }

  async function followUser(targetId) {
    if (!targetId || targetId === user.id) return;
    try {
      const { data: existing } = await db.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", targetId).maybeSingle();
      if (existing) await db.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
      else {
        await db.from("follows").insert({ follower_id: user.id, following_id: targetId });
        await notify(targetId, "follow", `${displayName(profile)} followed you.`);
      }
      await loadDiscover(); await loadFeed(); await loadProfile();
    } catch (err) { alert("Follow failed: " + err.message); }
  }

  async function loadDiscover() {
    if (!user) return;
    const box = $("discoverList");
    box.innerHTML = '<p class="muted">Scanning network...</p>';
    try {
      const [{ data: people }, { data: following }] = await Promise.all([
        db.from("profiles").select("id,username,display_name,avatar_url").neq("id", user.id).limit(80),
        db.from("follows").select("following_id").eq("follower_id", user.id)
      ]);
      const set = new Set((following || []).map(f => f.following_id));
      box.innerHTML = (people || []).map(p => `
        <div class="person-row">
          <div class="mini-avatar">${escapeHTML(shortName(displayName(p)))}</div>
          <div class="person-info"><strong>${escapeHTML(displayName(p))}</strong><small>${escapeHTML(username(p))}</small></div>
          <button class="follow-button follow-person" data-id="${escapeHTML(p.id)}">${set.has(p.id) ? "Following · Unfollow" : "Follow"}</button>
        </div>`).join("") || '<p class="muted">No people yet.</p>';
    } catch (err) { box.innerHTML = `<p class="message">${escapeHTML(err.message)}</p>`; }
  }

  async function loadProfile() {
    if (!user) return;
    try {
      profile = await getProfile(user.id) || profile;
      $("profileDisplayName").textContent = displayName(profile);
      $("profileUsername").textContent = username(profile);
      $("profileAvatar").textContent = shortName(displayName(profile));
      const [{ count: pc }, { count: fc }, { count: fg }] = await Promise.all([
        db.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        db.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", user.id),
        db.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", user.id)
      ]);
      $("postCount").textContent = pc ?? 0;
      $("followerCount").textContent = fc ?? 0;
      $("followingCount").textContent = fg ?? 0;
      const { data: posts } = await db.from("posts").select("id,media_url,media_type,caption").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
      $("myPosts").innerHTML = (posts || []).map(p => `
        <article class="post-card">
          ${p.media_type === "video" ? `<video class="post-media" src="${escapeHTML(p.media_url)}" controls playsinline></video>` : `<img class="post-media" src="${escapeHTML(p.media_url)}" loading="lazy">`}
          <p class="post-caption">${escapeHTML(p.caption || "")}</p>
          <div class="post-actions"><button class="text-button delete-post" data-id="${escapeHTML(p.id)}">Delete</button></div>
        </article>`).join("") || '<p class="muted">No posts yet.</p>';
    } catch (err) { console.warn(err); }
  }

  async function loadNotifications() {
    if (!user) return;
    const box = $("notificationList");
    if (!box) return;
    box.innerHTML = '<p class="muted">Loading...</p>';
    try {
      const { data } = await db.from("notifications").select("id,type,message,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
      box.innerHTML = (data || []).map(n => `
        <div class="notification-row">
          <div class="mini-avatar">${escapeHTML(shortName(n.type))}</div>
          <div><p>${escapeHTML(n.message || "New notification")}</p><small>${escapeHTML(timeLabel(n.created_at))}</small></div>
        </div>`).join("") || '<p class="muted">All caught up.</p>';
    } catch (err) { box.innerHTML = `<p class="message">${escapeHTML(err.message)}</p>`; }
  }

  // ---------- Chat (core preserved) ----------
  async function loadInbox() {
    if (!user) return;
    stopChatPolling();
    currentChat = null;
    $("chatPanel").hidden = true;
    $("inboxList").hidden = false;
    $("inboxList").innerHTML = '<p class="muted">Loading channels...</p>';
    try {
      const { data: mine } = await db.from("follows").select("following_id").eq("follower_id", user.id);
      const myFollowing = (mine || []).map(r => r.following_id);
      if (!myFollowing.length) { $("inboxList").innerHTML = '<p class="muted">Follow someone to open a channel.</p>'; return; }
      const { data: theirs } = await db.from("follows").select("follower_id").eq("following_id", user.id);
      const mutual = myFollowing.filter(id => new Set((theirs||[]).map(r=>r.follower_id)).has(id));
      if (!mutual.length) { $("inboxList").innerHTML = '<p class="muted">Chat unlocks on mutual follow.</p>'; return; }
      const { data: people } = await db.from("profiles").select("id,username,display_name").in("id", mutual);
      $("inboxList").innerHTML = (people || []).map(p => `
        <button class="inbox-row open-chat" data-id="${escapeHTML(p.id)}" data-name="${escapeHTML(displayName(p))}">
          <div class="mini-avatar">${escapeHTML(shortName(displayName(p)))}</div>
          <div class="person-info"><strong>${escapeHTML(displayName(p))}</strong><small>${escapeHTML(username(p))} · Secure</small></div>
          <span>›</span>
        </button>`).join("");
    } catch (err) { $("inboxList").innerHTML = `<p class="message">${escapeHTML(err.message)}</p>`; }
  }

  async function openChat(id, name) {
    currentChat = { id, name };
    $("chatName").textContent = name;
    $("chatAvatar").textContent = shortName(name);
    $("chatStatus").textContent = "● Secure channel";
    $("chatPanel").hidden = false;
    $("inboxList").hidden = true;
    await loadMessages();
    startChatPolling();
  }

  async function loadMessages() {
    if (!currentChat || !user) return;
    try {
      const { data } = await db.from("messages").select("id,sender_id,content,created_at")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${currentChat.id}),and(sender_id.eq.${currentChat.id},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true }).limit(100);
      const box = $("chatMessages");
      box.innerHTML = (data || []).map(m => `
        <div class="chat-bubble ${m.sender_id === user.id ? "mine" : "theirs"}">
          <div class="bubble-content">${escapeHTML(m.content)}</div>
          <small>${escapeHTML(timeLabel(m.created_at))}</small>
        </div>`).join("") || '<p class="muted chat-empty">Channel open. Say hello.</p>';
      box.scrollTop = box.scrollHeight;
    } catch (err) { sayStatus("chatMessage", err.message); }
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!user || !currentChat) return;
    const input = $("messageInput");
    const content = input.value.trim();
    if (!content) return;
    try {
      await db.from("messages").insert({ sender_id: user.id, receiver_id: currentChat.id, content });
      input.value = "";
      await notify(currentChat.id, "message", `${displayName(profile)} sent you a message.`);
      await loadMessages();
    } catch (err) { sayStatus("chatMessage", "Failed: " + err.message); }
  }

  function startChatPolling() {
    stopChatPolling();
    chatTimer = setInterval(() => { if (currentChat) loadMessages(); }, 4000);
  }
  function stopChatPolling() {
    if (chatTimer) clearInterval(chatTimer);
    chatTimer = null;
  }

  // ---------- Casting ----------
  function openCastOverlay() { $("castOverlay").hidden = false; sayStatus("castStatus", ""); }
  function closeCastOverlay() { $("castOverlay").hidden = true; }

  async function startPresentationCast() {
    sayStatus("castStatus", "Looking for displays...");
    try {
      if (navigator.presentation?.requestSession) {
        const session = await navigator.presentation.requestSession(location.href + "?cast=1");
        sayStatus("castStatus", "Casting...");
        session.addEventListener("close", () => sayStatus("castStatus", "Cast ended."));
      } else await startFullscreenCast();
    } catch { await startFullscreenCast(); }
  }

  async function startFullscreenCast() {
    try {
      const w = window.open(location.href + "?castMode=1", "_blank", "noopener");
      if (w) sayStatus("castStatus", "Cast view opened. Use AirPlay / Cast on that window.");
      else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        sayStatus("castStatus", "Fullscreen. Use system cast.");
      } else sayStatus("castStatus", "Use system share/cast menu.");
    } catch (err) { sayStatus("castStatus", err.message); }
  }

  // ---------- INTERACTIVE FUTURISTIC AVATAR ----------
  function initInteractiveAvatar() {
    const host = $("avatarCanvas");
    if (!host || !window.THREE || threeRenderer) return;

    const THREE = window.THREE;
    threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color("#070414");

    threeCamera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    threeCamera.position.set(0, 0.2, 5.6);

    threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    threeRenderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    host.appendChild(threeRenderer.domElement);

    // Lights
    threeScene.add(new THREE.AmbientLight(0xb8a0ff, 0.85));
    const key = new THREE.DirectionalLight(0xe9d5ff, 2.2);
    key.position.set(2.5, 3.5, 4);
    threeScene.add(key);
    const rim = new THREE.DirectionalLight(0x22d3ee, 1.4);
    rim.position.set(-3, 1, -2);
    threeScene.add(rim);
    const fill = new THREE.PointLight(0xa855f7, 1.1, 14);
    fill.position.set(0, -1.2, 3);
    threeScene.add(fill);

    avatarGroup = new THREE.Group();

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: "#c4a484", roughness: 0.5, metalness: 0.15, emissive: "#2a1840", emissiveIntensity: 0.1 });
    const hairMat = new THREE.MeshStandardMaterial({ color: "#1a1028", roughness: 0.65, metalness: 0.4, emissive: "#3b1f6e", emissiveIntensity: 0.18 });
    const clothesMat = new THREE.MeshStandardMaterial({ color: "#6d28d9", roughness: 0.3, metalness: 0.55, emissive: "#4c1d95", emissiveIntensity: 0.22 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: "#0a0614", roughness: 0.15, metalness: 0.85, emissive: "#22d3ee", emissiveIntensity: 0.55 });

    // Head
    head = new THREE.Mesh(new THREE.SphereGeometry(0.78, 48, 32), skinMat);
    head.position.y = 0.4;
    avatarGroup.add(head);

    // Hair
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.82, 40, 20, 0, Math.PI*2, 0, Math.PI*0.58), hairMat);
    hair.position.y = 0.6;
    avatarGroup.add(hair);

    // Eyes (will be moved for look-at)
    leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), eyeMat);
    leftEye.position.set(-0.26, 0.44, 0.72);
    avatarGroup.add(leftEye);
    rightEye = leftEye.clone();
    rightEye.position.x = 0.26;
    avatarGroup.add(rightEye);

    // Body
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.74, 40, 28), clothesMat);
    body.scale.set(1.28, 0.82, 0.78);
    body.position.y = -1.0;
    avatarGroup.add(body);

    // Holographic shell
    holoShell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.4, 1),
      new THREE.MeshBasicMaterial({ color: 0xa855f7, wireframe: true, transparent: true, opacity: 0.16 })
    );
    holoShell.position.y = -0.2;
    avatarGroup.add(holoShell);

    // Energy ring
    energyRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.04, 12, 64),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.6 })
    );
    energyRing.rotation.x = Math.PI / 2;
    energyRing.position.y = -1.9;
    avatarGroup.add(energyRing);

    // Floating particles around avatar
    const pGeo = new THREE.BufferGeometry();
    const pCount = 60;
    const positions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const r = 1.6 + Math.random() * 0.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta) - 0.3;
      positions[i*3+2] = r * Math.cos(phi);
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
      color: 0xa855f7, size: 0.04, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending
    }));
    avatarGroup.add(particles);

    threeScene.add(avatarGroup);

    // Resize
    const resize = () => {
      if (!host.clientWidth) return;
      threeCamera.aspect = host.clientWidth / host.clientHeight;
      threeCamera.updateProjectionMatrix();
      threeRenderer.setSize(host.clientWidth, host.clientHeight, false);
    };
    resize();
    addEventListener("resize", resize);

    // Mouse tracking for look-at
    const stage = $("avatarStage");
    stage.addEventListener("pointermove", e => {
      const rect = stage.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    });
    stage.addEventListener("pointerleave", () => { mouseX = 0; mouseY = 0; });

    // Click interactions
    stage.addEventListener("click", () => {
      if (waveMode || danceMode) return;
      waveMode = true;
      setAvatarMood("wave");
      setTimeout(() => { waveMode = false; setAvatarMood("idle"); }, 1800);
    });

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      threeFrame = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Smooth look
      targetLookX += (mouseX * 0.35 - targetLookX) * 0.08;
      targetLookY += (mouseY * 0.25 - targetLookY) * 0.08;

      // Head & eyes follow mouse
      if (head) {
        head.rotation.y = targetLookX;
        head.rotation.x = targetLookY * 0.4;
      }
      if (leftEye && rightEye) {
        leftEye.position.x = -0.26 + targetLookX * 0.04;
        rightEye.position.x = 0.26 + targetLookX * 0.04;
        leftEye.position.y = rightEye.position.y = 0.44 + targetLookY * 0.03;
      }

      // Idle floating
      avatarGroup.position.y = Math.sin(t * 1.2) * 0.06;
      avatarGroup.rotation.y += danceMode ? 0.04 : 0.006;

      // Speaking pulse
      if (isSpeaking && head) {
        head.scale.setScalar(1 + Math.sin(t * 12) * 0.02);
      } else if (head) {
        head.scale.setScalar(1);
      }

      // Wave animation
      if (waveMode) {
        avatarGroup.rotation.z = Math.sin(t * 8) * 0.15;
      } else {
        avatarGroup.rotation.z *= 0.9;
      }

      // Dance
      if (danceMode) {
        avatarGroup.position.y = Math.sin(t * 5) * 0.12;
        holoShell.rotation.x = Math.sin(t * 3) * 0.3;
      }

      // Shell & ring
      holoShell.rotation.y -= 0.005;
      energyRing.rotation.z += 0.014;
      energyRing.scale.setScalar(1 + Math.sin(t * 2.2) * 0.05);

      // Particles orbit
      particles.rotation.y += 0.003;
      particles.rotation.x = Math.sin(t * 0.4) * 0.1;

      // Update energy color live
      const col = new THREE.Color(avatarEnergyColor);
      holoShell.material.color = col;
      particles.material.color = col;
      energyRing.material.color = new THREE.Color(0x22d3ee).lerp(col, 0.4);

      threeRenderer.render(threeScene, threeCamera);
    };
    animate();
  }

  function cycleAvatarColor() {
    const colors = ["#a855f7", "#22d3ee", "#ec4899", "#a3e635", "#f97316", "#eab308"];
    const idx = colors.indexOf(avatarEnergyColor);
    avatarEnergyColor = colors[(idx + 1) % colors.length];
    setAvatarMood("recharging");
    setTimeout(() => setAvatarMood("idle"), 1200);
  }

  // ---------- Event wiring ----------
  $("authForm").addEventListener("submit", handleAuth);

  $("showSignup").addEventListener("click", () => {
    isSignup = true; signupStep = 1; selectedInterests.clear();
    document.querySelectorAll(".interest-chip").forEach(c => c.classList.remove("selected"));
    $("authTitle").textContent = "Create your identity";
    $("signupWizard").hidden = false;
    $("loginFields").hidden = true;
    $("showSignup").hidden = true;
    $("showLogin").hidden = false;
    setSignupStep(1);
    sayStatus("authMessage", "");
  });

  $("showLogin").addEventListener("click", () => {
    isSignup = false;
    $("authTitle").textContent = "Welcome back";
    $("signupWizard").hidden = true;
    $("loginFields").hidden = false;
    $("showSignup").hidden = false;
    $("showLogin").hidden = true;
    sayStatus("authMessage", "");
  });

  $("signupNext").addEventListener("click", () => {
    if (!validateSignupStep(signupStep)) return;
    if (signupStep < 4) setSignupStep(signupStep + 1);
    else $("authForm").requestSubmit();
  });
  $("signupBack").addEventListener("click", () => { if (signupStep > 1) setSignupStep(signupStep - 1); });
  $("authPassword")?.addEventListener("input", updatePasswordStrength);

  document.querySelectorAll(".interest-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const key = chip.dataset.interest;
      if (selectedInterests.has(key)) { selectedInterests.delete(key); chip.classList.remove("selected"); }
      else { selectedInterests.add(key); chip.classList.add("selected"); }
    });
  });

  document.querySelectorAll(".color-swatch").forEach(sw => {
    sw.addEventListener("click", () => {
      document.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
      sw.classList.add("active");
      avatarEnergyColor = sw.dataset.color;
    });
  });

  // Avatar controls
  $("avatarWaveBtn")?.addEventListener("click", () => {
    waveMode = true; setAvatarMood("wave");
    setTimeout(() => { waveMode = false; setAvatarMood("idle"); }, 1800);
  });
  $("avatarDanceBtn")?.addEventListener("click", () => {
    danceMode = !danceMode;
    setAvatarMood(danceMode ? "dancing" : "idle");
  });
  $("avatarColorBtn")?.addEventListener("click", cycleAvatarColor);

  // Cast
  $("castBtn")?.addEventListener("click", openCastOverlay);
  $("castClose")?.addEventListener("click", closeCastOverlay);
  $("castPresentation")?.addEventListener("click", startPresentationCast);
  $("castFullscreen")?.addEventListener("click", startFullscreenCast);
  $("chatCastBtn")?.addEventListener("click", openCastOverlay);

  $("logoutBtn").addEventListener("click", logout);
  $("createForm").addEventListener("submit", publishPost);
  $("refreshFeedBtn").addEventListener("click", loadFeed);
  $("notificationsBtn").addEventListener("click", () => showView("notificationsView"));
  $("backHomeBtn").addEventListener("click", () => showView("homeView"));
  $("messageForm").addEventListener("submit", sendMessage);
  $("backToInboxBtn").addEventListener("click", () => {
    stopChatPolling(); currentChat = null;
    $("chatPanel").hidden = true; $("inboxList").hidden = false;
  });
  $("speakBtn").addEventListener("click", () => speak($("greetingText").textContent + ". " + $("assistantReply").textContent));
  $("assistantHelpBtn").addEventListener("click", assistantHelp);

  $("enablePushBtn").addEventListener("click", async () => {
    const status = $("pushStatus"), btn = $("enablePushBtn");
    if (!user) { status.textContent = "Log in first."; return; }
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      status.textContent = "Push not supported."; return;
    }
    btn.disabled = true; status.textContent = "Setting up...";
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { status.textContent = "Permission denied."; return; }
      await navigator.serviceWorker.register("./sw.js");
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
      await db.from("push_subscriptions").upsert({ user_id: user.id, endpoint: sub.endpoint, subscription: sub.toJSON() }, { onConflict: "endpoint" });
      status.textContent = "Push enabled!";
      btn.textContent = "Notifications on";
    } catch (err) { status.textContent = "Failed: " + err.message; }
    finally { btn.disabled = false; }
  });

  document.querySelectorAll(".nav-button").forEach(b => b.addEventListener("click", () => showView(b.dataset.view)));

  document.addEventListener("click", e => {
    const like = e.target.closest(".like-post"); if (like) return toggleLike(like.dataset.id);
    const del = e.target.closest(".delete-post"); if (del) return deleteOwnPost(del.dataset.id);
    const follow = e.target.closest(".follow-person, .follow-author"); if (follow) return followUser(follow.dataset.id);
    const chat = e.target.closest(".open-chat"); if (chat) return openChat(chat.dataset.id, chat.dataset.name);
  });
  document.addEventListener("submit", e => { if (e.target.matches(".comment-form")) addComment(e); });

  // Boot
  initParticles();
  db.auth.getSession().then(async ({ data, error }) => {
    if (error) { sayStatus("authMessage", error.message); return; }
    if (data.session?.user) {
      try { await startSession(data.session.user); }
      catch (err) { sayStatus("authMessage", "Profile error: " + err.message); showAuth(); }
    } else showAuth();
  });
  db.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) { user = profile = null; showAuth(); }
  });
})();
