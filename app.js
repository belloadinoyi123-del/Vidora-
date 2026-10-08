/* =========================================================
   VIDORA APP.JS
   Complete controller
   ========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  "https://htnrqgzxkfktwoioscjr.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_JT5rBfXYSX3-3_zyC2cazQ_YXg_ih_h";

const sb = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


/* =========================================================
   HELPERS
========================================================= */

const $ = id => document.getElementById(id);

let user = null;
let profile = null;
let currentView = "home";

let selectedMusic = null;
let selectedStoryMusic = null;

let selectedFilter = "none";
let selectedStoryFilter = "none";

let storyItems = [];
let storyIndex = 0;
let storyAudio = null;

let commentsPost = null;
let chatUser = null;

let realtimeChannel = null;
let authListenerReady = false;
let appStarting = false;

let assistantHistory = [];

let musicCategory = "All";


function toast(message){

  const el = $("toast");

  if(!el) return;

  el.textContent = String(message || "");

  el.classList.remove("hidden");

  clearTimeout(window.__vidoraToast);

  window.__vidoraToast = setTimeout(()=>{
    el.classList.add("hidden");
  },3000);
}


function esc(value = ""){

  return String(value).replace(
    /[&<>"']/g,
    character => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[character])
  );
}


function safeError(error, fallback = "Something went wrong."){

  return (
    error?.message ||
    error?.details ||
    error?.hint ||
    fallback
  );
}


function showStatus(element,message,success=false){

  if(!element) return;

  element.textContent = message || "";

  element.className =
    "status " +
    (success ? "ok" : "err");
}


function fallbackAvatar(name="V"){

  return "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg"
           width="160"
           height="160">

        <rect
          width="160"
          height="160"
          rx="80"
          fill="#181824"/>

        <circle
          cx="80"
          cy="60"
          r="30"
          fill="#8b5cf6"/>

        <path
          d="M30 150c8-45 92-45 100 0"
          fill="#ff2d75"/>

        <text
          x="80"
          y="153"
          text-anchor="middle"
          fill="white"
          font-size="15"
          font-family="Arial">
          ${esc(name).slice(0,1)}
        </text>

      </svg>
    `);
}


function avatarSrc(value){

  if(!value){
    return fallbackAvatar("V");
  }

  return String(value);
}


/* =========================================================
   FILTERS
========================================================= */

const FILTERS = [

  {
    id:"none",
    name:"Original",
    css:"none"
  },

  {
    id:"vivid",
    name:"Vivid",
    css:"saturate(1.6) contrast(1.1)"
  },

  {
    id:"warm",
    name:"Warm",
    css:"sepia(.25) saturate(1.3) brightness(1.05)"
  },

  {
    id:"cool",
    name:"Cool",
    css:"hue-rotate(15deg) saturate(1.2) brightness(1.05)"
  },

  {
    id:"noir",
    name:"Noir",
    css:"grayscale(1) contrast(1.2)"
  },

  {
    id:"vintage",
    name:"Vintage",
    css:"sepia(.45) contrast(1.1) brightness(.95)"
  },

  {
    id:"fade",
    name:"Fade",
    css:"contrast(.85) brightness(1.1) saturate(.8)"
  },

  {
    id:"drama",
    name:"Drama",
    css:"contrast(1.4) saturate(1.2)"
  },

  {
    id:"glow",
    name:"Glow",
    css:"brightness(1.15) contrast(1.05) saturate(1.3)"
  },

  {
    id:"cinema",
    name:"Cinema",
    css:"contrast(1.25) saturate(.9) brightness(.95)"
  },

  {
    id:"retro",
    name:"Retro",
    css:"sepia(.5) contrast(1.2) saturate(1.4)"
  },

  {
    id:"neon",
    name:"Neon",
    css:"saturate(1.8) contrast(1.2) hue-rotate(300deg)"
  }

];


function getFilterCss(id){

  return (
    FILTERS.find(
      filter => filter.id === id
    )?.css || "none"
  );
}


/* =========================================================
   BUILT-IN MUSIC
   Use only music you have permission to use in production.
========================================================= */

const BUILTIN_TRACKS = [

  {
    id:"bz1",
    title:"Night Pulse",
    artist:"Vidora Beatz",
    category:"Beatz",
    audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },

  {
    id:"bz2",
    title:"Chrome Drive",
    artist:"Vidora Beatz",
    category:"Beatz",
    audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
  },

  {
    id:"bz3",
    title:"Low Rider",
    artist:"Vidora Beatz",
    category:"Beatz",
    audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
  },

  {
    id:"dr1",
    title:"UK Slide",
    artist:"Vidora Drills",
    category:"Drills",
    audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"
  },

  {
    id:"dr2",
    title:"Dark Lane",
    artist:"Vidora Drills",
    category:"Drills",
    audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"
  },

  {
    id:"dr3",
    title:"Cold Blocks",
    artist:"Vidora Drills",
    category:"Drills",
    audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3"
  },

  {
    id:"fk1",
    title:"Groovy Lane",
    artist:"Vidora Funk",
    category:"Funk",
    audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3"
  },

  {
    id:"fk2",
    title:"Bass Pocket",
    artist:"Vidora Funk",
    category:"Funk",
    audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"
  },

  {
    id:"fk3",
    title:"Electric Soul",
    artist:"Vidora Funk",
    category:"Funk",
    audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  }

];

window._musicTracks = [...BUILTIN_TRACKS];


/* =========================================================
   MEDIA UPLOAD
========================================================= */

async function uploadMedia(file,folder="posts"){

  if(!user){
    throw new Error("You must be logged in.");
  }

  if(!file){
    throw new Error("No file selected.");
  }

  const allowed =
    file.type.startsWith("image/") ||
    file.type.startsWith("video/") ||
    file.type.startsWith("audio/");

  if(!allowed){
    throw new Error("This file type is not supported.");
  }

  const extension =
    file.name?.includes(".")
    ? file.name.split(".").pop().toLowerCase()
    : "bin";

  const path =
    `${folder}/${user.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2,9)}.${extension}`;

  const { data,error } =
    await sb.storage
      .from("media")
      .upload(
        path,
        file,
        {
          cacheControl:"3600",
          upsert:false,
          contentType:file.type || undefined
        }
      );

  if(error){
    throw error;
  }

  const {
    data:publicData
  } =
    sb.storage
      .from("media")
      .getPublicUrl(
        data.path
      );

  if(!publicData?.publicUrl){
    throw new Error(
      "Could not create media URL."
    );
  }

  return publicData.publicUrl;
}


/* =========================================================
   AUTH INITIALIZATION
========================================================= */

async function init(){

  if(authListenerReady){
    return;
  }

  authListenerReady = true;

  console.log(
    "VIDORA: initializing..."
  );

  try{

    const {
      data,
      error
    } =
      await sb.auth.getSession();

    if(error){
      throw error;
    }

    if(data?.session?.user){

      await enterApp(
        data.session.user
      );

    }else{

      $("app")
        ?.classList.add("hidden");

      $("authScreen")
        ?.classList.remove("hidden");
    }

  }catch(error){

    console.error(
      "VIDORA INIT ERROR:",
      error
    );

    $("app")
      ?.classList.add("hidden");

    $("authScreen")
      ?.classList.remove("hidden");

    showStatus(
      $("authStatus"),
      safeError(
        error,
        "Unable to connect to Vidora."
      )
    );
  }


  sb.auth.onAuthStateChange(
    async(event,session)=>{

      console.log(
        "AUTH EVENT:",
        event
      );

      if(
        (
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED"
        ) &&
        session?.user
      ){

        if(
          !user ||
          user.id !== session.user.id
        ){

          await enterApp(
            session.user
          );
        }
      }


      if(event === "SIGNED_OUT"){

        user = null;
        profile = null;

        stopStoryAudio();

        $("app")
          ?.classList.add("hidden");

        $("authScreen")
          ?.classList.remove("hidden");
      }

    }
  );
}


/* =========================================================
   ENTER APP
========================================================= */

async function enterApp(currentUser){

  if(!currentUser){
    return;
  }

  if(
    appStarting &&
    user?.id === currentUser.id
  ){
    return;
  }

  appStarting = true;

  user = currentUser;

  $("authScreen")
    ?.classList.add("hidden");

  $("app")
    ?.classList.remove("hidden");

  try{

    await loadProfile();

    await loadNotifications();

    await renderView("home");

  }catch(error){

    console.error(
      "ENTER APP ERROR:",
      error
    );

    toast(
      safeError(
        error,
        "Unable to load Vidora."
      )
    );

  }finally{

    appStarting = false;

  }
}


/* =========================================================
   PROFILE
========================================================= */

async function loadProfile(){

  if(!user){
    return;
  }

  const {
    data,
    error
  } =
    await sb
      .from("profiles")
      .select("*")
      .eq("id",user.id)
      .maybeSingle();

  if(error){

    console.warn(
      "PROFILE:",
      error
    );

    return;
  }

  profile = data;
}


/* =========================================================
   LOGIN
   IMPORTANT AUTH FUNCTION
========================================================= */

async function login(){

  const emailInput =
    $("loginEmail");

  const passwordInput =
    $("loginPassword");

  const button =
    $("loginBtn");

  const status =
    $("authStatus");

  const email =
    emailInput?.value
      ?.trim() || "";

  const password =
    passwordInput?.value || "";


  if(!email){

    showStatus(
      status,
      "Enter your email."
    );

    return;
  }


  if(!password){

    showStatus(
      status,
      "Enter your password."
    );

    return;
  }


  if(button){

    button.disabled = true;
    button.textContent = "Signing in...";
  }


  showStatus(
    status,
    "Signing in...",
    true
  );


  try{

    const {
      data,
      error
    } =
      await sb.auth.signInWithPassword({
        email,
        password
      });


    if(error){

      console.error(
        "SUPABASE LOGIN ERROR:",
        error
      );

      showStatus(
        status,
        safeError(
          error,
          "Login failed."
        )
      );

      return;
    }


    if(!data?.user){

      throw new Error(
        "Login succeeded but no user was returned."
      );
    }


    showStatus(
      status,
      "Login successful.",
      true
    );


    await enterApp(
      data.user
    );

  }catch(error){

    console.error(
      "LOGIN ERROR:",
      error
    );

    showStatus(
      status,
      safeError(
        error,
        "Unable to login. Check your internet connection."
      )
    );

  }finally{

    if(button){

      button.disabled = false;
      button.textContent = "Login";

    }
  }
}


/* =========================================================
   SIGNUP
========================================================= */

async function signup(){

  const displayName =
    $("signupDisplayName")
      ?.value
      ?.trim() || "";

  const username =
    $("signupUsername")
      ?.value
      ?.trim()
      .toLowerCase() || "";

  const age =
    Number(
      $("signupAge")
        ?.value || 0
    );

  const email =
    $("signupEmail")
      ?.value
      ?.trim() || "";

  const password =
    $("signupPassword")
      ?.value || "";

  const confirmPassword =
    $("signupPasswordConfirm")
      ?.value || "";

  const status =
    $("authStatus");

  const button =
    $("signupBtn");


  if(
    !displayName ||
    !username ||
    !age ||
    !email ||
    !password ||
    !confirmPassword
  ){

    showStatus(
      status,
      "Complete all signup fields."
    );

    return;
  }


  if(age < 13){

    showStatus(
      status,
      "You must be at least 13 to use Vidora."
    );

    return;
  }


  if(password.length < 6){

    showStatus(
      status,
      "Password must be at least 6 characters."
    );

    return;
  }


  if(password !== confirmPassword){

    showStatus(
      status,
      "Passwords do not match."
    );

    return;
  }


  if(button){

    button.disabled = true;
    button.textContent = "Creating...";

  }


  showStatus(
    status,
    "Creating your account...",
    true
  );


  try{

    const {
      data,
      error
    } =
      await sb.auth.signUp({

        email,
        password,

        options:{
          data:{
            username,
            display_name:displayName,
            age
          }
        }

      });


    if(error){

      console.error(
        "SUPABASE SIGNUP ERROR:",
        error
      );

      showStatus(
        status,
        safeError(
          error,
          "Unable to create account."
        )
      );

      return;
    }


    if(!data?.user){

      throw new Error(
        "Account could not be created."
      );
    }


    /*
      Try to create/update profile.
      If a database trigger already does this,
      an error here will NOT destroy signup.
    */

    const {
      error:profileError
    } =
      await sb
        .from("profiles")
        .upsert({
          id:data.user.id,
          username,
          display_name:displayName
        });


    if(profileError){

      console.warn(
        "PROFILE UPSERT:",
        profileError
      );

    }


    if(data.session){

      showStatus(
        status,
        "Account created successfully.",
        true
      );

      await enterApp(
        data.user
      );

    }else{

      showStatus(
        status,
        "Account created. Check your email to confirm your account.",
        true
      );

    }

  }catch(error){

    console.error(
      "SIGNUP ERROR:",
      error
    );

    showStatus(
      status,
      safeError(
        error,
        "Unable to create account."
      )
    );

  }finally{

    if(button){

      button.disabled = false;
      button.textContent = "Create account";

    }
  }
}


/* =========================================================
   NAVIGATION
========================================================= */

async function renderView(view){

  if(!user){
    return;
  }

  currentView =
    view || "home";


  document
    .querySelectorAll(".nav button")
    .forEach(button=>{

      button.classList.toggle(
        "active",
        button.dataset.view === currentView
      );

    });


  if(currentView === "home"){
    return renderHome();
  }

  if(currentView === "discover"){
    return renderDiscover();
  }

  if(currentView === "create"){
    return renderCreate();
  }

  if(currentView === "messages"){
    return renderMessages();
  }

  if(currentView === "profile"){
    return renderProfile(user.id);
  }

  return renderHome();
}


/* =========================================================
   BLOCKS
========================================================= */

async function blockedIds(){

  if(!user){
    return new Set();
  }

  const {
    data,
    error
  } =
    await sb
      .from("blocks")
      .select("blocked_id")
      .eq(
        "blocker_id",
        user.id
      );

  if(error){
    return new Set();
  }

  return new Set(
    (data || [])
      .map(
        item => item.blocked_id
      )
  );
}


/* =========================================================
   HOME
========================================================= */

async function renderHome(){

  const main =
    $("main");

  if(!main){
    return;
  }

  main.innerHTML = `

    <section class="panel">

      <div class="title">
        Stories
      </div>

      <div
        id="stories"
        class="storybar">

        Loading stories...

      </div>

    </section>

    <div id="feed">
      Loading feed...
    </div>

  `;


  await renderStories();


  let posts = [];

  const {
    data,
    error
  } =
    await sb
      .from("posts")
      .select(
        "id,user_id,media_url,media_type,caption,created_at"
      )
      .order(
        "created_at",
        {ascending:false}
      )
      .limit(40);


  if(error){

    console.error(
      "POST LOAD:",
      error
    );

    $("feed").innerHTML = `
      <div class="panel">

        <b>
          Unable to load posts.
        </b>

        <div class="muted">
          ${esc(
            safeError(error)
          )}
        </div>

      </div>
    `;

    return;
  }


  posts = data || [];


  const blocked =
    await blockedIds();


  posts =
    posts.filter(
      post =>
        !blocked.has(
          post.user_id
        )
    );


  const html =
    await Promise.all(
      posts.map(
        renderPost
      )
    );


  $("feed").innerHTML =
    html.join("") ||
    `
      <div class="panel muted">
        No posts yet. Be the first to post.
      </div>
    `;
}


/* =========================================================
   RENDER POST
========================================================= */

async function renderPost(post){

  let author = null;
  let likes = 0;
  let comments = 0;
  let liked = false;
  let track = null;


  const authorResult =
    await sb
      .from("profiles")
      .select(
        "username,display_name,avatar_url"
      )
      .eq(
        "id",
        post.user_id
      )
      .maybeSingle();


  author =
    authorResult.data || null;


  const likeResult =
    await sb
      .from("post_likes")
      .select(
        "*",
        {
          count:"exact",
          head:true
        }
      )
      .eq(
        "post_id",
        post.id
      );


  likes =
    likeResult.count || 0;


  const commentResult =
    await sb
      .from("comments")
      .select(
        "*",
        {
          count:"exact",
          head:true
        }
      )
      .eq(
        "post_id",
        post.id
      );


  comments =
    commentResult.count || 0;


  const likedResult =
    await sb
      .from("post_likes")
      .select("id")
      .eq(
        "post_id",
        post.id
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();


  liked =
    !!likedResult.data;


  /*
    Optional music lookup.
    Failure here must never break the post.
  */

  if(post.music_id){

    try{

      const result =
        await sb
          .from("tracks")
          .select(
            "id,title,artist,audio_url,category"
          )
          .eq(
            "id",
            post.music_id
          )
          .maybeSingle();

      if(!result.error){
        track = result.data;
      }

    }catch(error){}
  }


  const media =
    post.media_type === "video"

    ?

    `
      <video
        class="post-media"
        controls
        playsinline
        preload="metadata"
        src="${esc(post.media_url)}">
      </video>
    `

    :

    `
      <img
        class="post-media"
        loading="lazy"
        src="${esc(post.media_url)}"
        alt="Vidora post">
    `;


  const music =
    track

    ?

    `
      <div class="panel">

        🎵
        <b>
          ${esc(track.title || "Track")}
        </b>

        ${
          track.artist
          ?
          `<div class="muted">
             ${esc(track.artist)}
           </div>`
          :
          ""
        }

        ${
          track.audio_url
          ?
          `
            <audio
              controls
              preload="none"
              style="width:100%;margin-top:7px"
              src="${esc(track.audio_url)}">
            </audio>
          `
          :
          ""
        }

      </div>
    `

    :

    "";


  return `

    <article
      class="card"
      data-post-id="${esc(post.id)}">

      <div class="row">

        <img
          class="avatar sm"
          src="${avatarSrc(
            author?.avatar_url
          )}"
          alt="">

        <div>

          <b>
            ${esc(
              author?.display_name ||
              author?.username ||
              "User"
            )}
          </b>

          <div class="muted">
            @${esc(
              author?.username ||
              "user"
            )}
          </div>

        </div>

        <span class="spacer"></span>

        ${
          post.user_id === user.id
          ?
          `
            <button
              class="iconbtn"
              onclick="deletePost('${esc(post.id)}')">
              🗑
            </button>
          `
          :
          ""
        }

      </div>

      ${media}

      ${music}

      ${
        post.caption
        ?
        `
          <div
            style="
              margin-top:9px;
              white-space:pre-wrap;
              word-break:break-word;
            ">

            ${esc(post.caption)}

          </div>
        `
        :
        ""
      }

      <div class="post-actions">

        <button
          class="${liked ? "active" : ""}"
          onclick="toggleLike('${esc(post.id)}')">

          ♥ ${likes}

        </button>

        <button
          onclick="openComments('${esc(post.id)}')">

          💬 ${comments}

        </button>

        <button
          onclick="sharePost('${esc(post.id)}')">

          ↗ Share

        </button>

      </div>

    </article>
  `;
}


/* =========================================================
   STORIES
========================================================= */

async function renderStories(){

  const box =
    $("stories");

  if(!box){
    return;
  }


  const {
    data,
    error
  } =
    await sb
      .from("stories")
      .select("*")
      .order(
        "created_at",
        {ascending:false}
      )
      .limit(50);


  if(error){

    console.warn(
      "STORIES:",
      error
    );

    box.innerHTML = `
      <span class="muted">
        No stories available.
      </span>
    `;

    return;
  }


  storyItems =
    data || [];


  const users =
    [
      ...new Set(
        storyItems.map(
          story =>
            story.user_id
        )
      )
    ];


  const profiles = {};


  if(users.length){

    const {
      data:profileData
    } =
      await sb
        .from("profiles")
        .select(
          "id,username,display_name,avatar_url"
        )
        .in(
          "id",
          users
        );


    (profileData || [])
      .forEach(
        item=>{
          profiles[item.id] = item;
        }
      );
  }


  const groups = {};


  storyItems.forEach(
    story=>{

      if(!groups[story.user_id]){
        groups[story.user_id] = [];
      }

      groups[story.user_id].push(
        story
      );

    }
  );


  box.innerHTML =
    Object.entries(groups)
      .map(
        ([id])=>{

          const p =
            profiles[id] || {};

          return `

            <button
              class="storyitem"
              onclick="openStoryUser('${esc(id)}')">

              <div class="storyring">

                <img
                  src="${avatarSrc(
                    p.avatar_url
                  )}"
                  alt="">

              </div>

              <small>
                ${esc(
                  p.username ||
                  p.display_name ||
                  "Story"
                )}
              </small>

            </button>

          `;

        }
      )
      .join("") ||

    `
      <span class="muted">
        No stories yet.
      </span>
    `;
}


async function openStoryUser(id){

  const stories =
    storyItems.filter(
      story =>
        story.user_id === id
    );


  if(!stories.length){
    return toast(
      "Story unavailable."
    );
  }


  storyIndex = 0;

  window.currentStorySet =
    stories;

  openStory(
    stories,
    0
  );
}


function stopStoryAudio(){

  if(!storyAudio){
    return;
  }

  try{

    storyAudio.pause();
    storyAudio.currentTime = 0;
    storyAudio.src = "";

  }catch(error){}

  storyAudio = null;
}


function openStory(stories,index){

  if(!stories?.length){
    return;
  }

  const story =
    stories[index];

  if(!story){
    return;
  }


  stopStoryAudio();


  const media =
    story.media_type === "video"

    ?

    `
      <video
        class="post-media story-media"
        controls
        autoplay
        playsinline
        src="${esc(story.media_url)}">
      </video>
    `

    :

    `
      <img
        class="post-media story-media"
        src="${esc(story.media_url)}"
        alt="Story">
    `;


  const track =
    story.music_id
    ? findMusic(story.music_id)
    : null;


  $("sheet").innerHTML = `

    <div class="row">

      <b>
        Story ${index + 1}/${stories.length}
      </b>

      <span class="spacer"></span>

      <button
        class="iconbtn"
        onclick="closeModal()">
        ×
      </button>

    </div>

    ${media}

    ${
      track
      ?
      `
        <div class="panel">

          🎵
          <b>
            ${esc(
              track.title
            )}
          </b>

          <div class="muted">
            ${esc(
              track.artist || ""
            )}
          </div>

        </div>
      `
      :
      ""
    }

    <div class="row wrap">

      <button
        class="btn"
        onclick="storyMove(${index - 1})"
        ${index <= 0 ? "disabled" : ""}>
        ← Prev
      </button>

      <button
        class="btn"
        onclick="storyMove(${index + 1})"
        ${index >= stories.length - 1 ? "disabled" : ""}>
        Next →
      </button>

      ${
        story.user_id === user.id
        ?
        `
          <button
            class="btn danger"
            onclick="deleteStory('${esc(story.id)}')">
            Delete
          </button>
        `
        :
        ""
      }

    </div>
  `;


  $("modal")
    ?.classList.remove("hidden");


  if(track?.audio_url){

    try{

      storyAudio =
        new Audio(
          track.audio_url
        );

      storyAudio.loop = true;
      storyAudio.volume = .85;

      storyAudio
        .play()
        .catch(()=>{});

    }catch(error){}
  }
}


function storyMove(index){

  const stories =
    window.currentStorySet || [];

  if(
    index < 0 ||
    index >= stories.length
  ){
    return;
  }

  storyIndex = index;

  openStory(
    stories,
    index
  );
}


/* =========================================================
   CREATE
========================================================= */

async function renderCreate(){

  $("main").innerHTML = `

    <section class="panel">

      <div class="title">
        Create Post
      </div>

      <input
        id="createFile"
        class="field"
        type="file"
        accept="image/*,video/*">

      <div
        id="createPreview"
        class="hidden">
      </div>

      <textarea
        id="createCaption"
        class="field"
        maxlength="2000"
        placeholder="Write a caption..."></textarea>

      <div class="title">
        Filters
      </div>

      <div class="row wrap">

        ${
          FILTERS.map(
            filter=>`

              <button
                class="btn"
                onclick="selectFilter('${filter.id}')">

                ${esc(filter.name)}

              </button>

            `
          ).join("")
        }

      </div>

      <div class="title">
        Music
      </div>

      <div id="musicList">
        Loading music...
      </div>

      <button
        class="btn primary full"
        onclick="publishPost()">

        🚀 Publish to Vidora

      </button>

    </section>


    <section class="panel">

      <div class="title">
        Create Story
      </div>

      <input
        id="storyFile"
        class="field"
        type="file"
        accept="image/*,video/*">

      <div class="title">
        Story Filters
      </div>

      <div class="row wrap">

        ${
          FILTERS.map(
            filter=>`

              <button
                class="btn"
                onclick="selectStoryFilter('${filter.id}')">

                ${esc(filter.name)}

              </button>

            `
          ).join("")
        }

      </div>

      <div class="title">
        Story Music
      </div>

      <div id="storyMusicList">
        Loading music...
      </div>

      <button
        class="btn primary full"
        onclick="publishStory()">

        📖 Publish Story

      </button>

    </section>
  `;


  await loadMusic();
}


/* =========================================================
   FILTER SELECTION
========================================================= */

function selectFilter(id){

  selectedFilter =
    id || "none";

  toast(
    "Post filter selected."
  );
}


function selectStoryFilter(id){

  selectedStoryFilter =
    id || "none";

  toast(
    "Story filter selected."
  );
}


/* =========================================================
   MUSIC
========================================================= */

async function loadMusic(){

  let tracks =
    [...BUILTIN_TRACKS];


  try{

    const {
      data,
      error
    } =
      await sb
        .from("tracks")
        .select(
          "id,title,artist,audio_url,category"
        )
        .limit(100);


    if(!error && data?.length){

      tracks = [
        ...data,
        ...BUILTIN_TRACKS
      ];

    }

  }catch(error){

    console.warn(
      "TRACKS:",
      error
    );

  }


  window._musicTracks =
    tracks;


  const categories = [
    "All",
    ...new Set(
      tracks.map(
        track =>
          track.category ||
          "Other"
      )
    )
  ];


  function renderMusicList(
    target,
    story=false
  ){

    if(!target){
      return;
    }


    const selectedCategory =
      story
      ? "All"
      : musicCategory;


    const filtered =
      tracks.filter(
        track =>
          selectedCategory === "All" ||
          (
            track.category ||
            "Other"
          ) === selectedCategory
      );


    target.innerHTML = `

      <div class="row wrap">

        ${
          categories.map(
            category=>`

              <button
                class="btn"
                onclick="setMusicCategory('${esc(category)}')">

                ${esc(category)}

              </button>

            `
          ).join("")
        }

      </div>

      ${
        filtered.map(
          track=>`

            <button
              class="panel"
              style="
                width:100%;
                text-align:left;
                cursor:pointer;
                margin-bottom:6px;
              "
              onclick="${
                story
                ? `selectStoryMusic('${esc(track.id)}')`
                : `selectMusic('${esc(track.id)}')`
              }">

              🎵
              <b>
                ${esc(
                  track.title ||
                  "Track"
                )}
              </b>

              <div class="muted">
                ${esc(
                  track.artist ||
                  "Vidora"
                )}
              </div>

            </button>

          `
        ).join("")
      }

    `;
  }


  renderMusicList(
    $("musicList"),
    false
  );


  renderMusicList(
    $("storyMusicList"),
    true
  );
}


function setMusicCategory(category){

  musicCategory =
    category || "All";

  loadMusic();
}


function findMusic(id){

  return (
    window._musicTracks
      ?.find(
        track =>
          String(track.id) ===
          String(id)
      ) ||

    BUILTIN_TRACKS.find(
      track =>
        String(track.id) ===
        String(id)
    ) ||

    null
  );
}


async function selectMusic(id){

  const track =
    findMusic(id);

  if(!track){
    return toast(
      "Track not found."
    );
  }

  selectedMusic =
    track;

  toast(
    "Selected: " +
    (track.title || "Track")
  );
}


async function selectStoryMusic(id){

  const track =
    findMusic(id);

  if(!track){
    return toast(
      "Track not found."
    );
  }

  selectedStoryMusic =
    track;

  toast(
    "Story music selected."
  );
}


/* =========================================================
   CORRECT POST FUNCTION
========================================================= */

async function publishPost(){

  if(!user){

    return toast(
      "You are not logged in."
    );
  }


  const file =
    $("createFile")
      ?.files?.[0];


  const caption =
    $("createCaption")
      ?.value
      ?.trim() || "";


  if(!file){

    return toast(
      "Choose an image or video."
    );
  }


  if(
    !file.type.startsWith("image/") &&
    !file.type.startsWith("video/")
  ){

    return toast(
      "Please choose an image or video."
    );
  }


  if(
    file.size >
    50 * 1024 * 1024
  ){

    return toast(
      "Maximum upload size is 50MB."
    );
  }


  try{

    toast(
      "Uploading post..."
    );


    const mediaUrl =
      await uploadMedia(
        file,
        "posts"
      );


    const mediaType =
      file.type.startsWith("video/")
      ? "video"
      : "image";


    /*
      STEP 1:
      Insert only columns known to exist.
      This protects the post system from optional
      music/filter database columns.
    */

    const basicPost = {

      user_id:user.id,

      media_url:mediaUrl,

      media_type:mediaType,

      caption:caption

    };


    let result =
      await sb
        .from("posts")
        .insert(
          basicPost
        )
        .select()
        .single();


    if(result.error){

      console.error(
        "POST INSERT:",
        result.error
      );

      throw result.error;
    }


    /*
      STEP 2:
      If the database has music_id/filter,
      attempt to add those separately.
      Failure here does NOT delete/break the post.
    */

    if(
      selectedMusic?.id ||
      selectedFilter !== "none"
    ){

      try{

        const optionalUpdate = {};

        if(selectedMusic?.id){
          optionalUpdate.music_id =
            selectedMusic.id;
        }

        if(selectedFilter !== "none"){
          optionalUpdate.filter =
            selectedFilter;
        }

        if(
          Object.keys(
            optionalUpdate
          ).length
        ){

          await sb
            .from("posts")
            .update(
              optionalUpdate
            )
            .eq(
              "id",
              result.data.id
            );

        }

      }catch(error){

        console.warn(
          "Optional post features unavailable:",
          error
        );

      }
    }


    selectedMusic = null;
    selectedFilter = "none";


    if($("createFile")){
      $("createFile").value = "";
    }

    if($("createCaption")){
      $("createCaption").value = "";
    }


    toast(
      "Post published successfully!"
    );


    await renderView(
      "home"
    );


  }catch(error){

    console.error(
      "PUBLISH POST ERROR:",
      error
    );

    toast(
      "Post failed: " +
      safeError(
        error,
        "Unable to publish post."
      )
    );
  }
}


/* =========================================================
   CORRECT STORY FUNCTION
========================================================= */

async function publishStory(){

  if(!user){

    return toast(
      "You are not logged in."
    );
  }


  const file =
    $("storyFile")
      ?.files?.[0];


  if(!file){

    return toast(
      "Choose a photo or video."
    );
  }


  if(
    !file.type.startsWith("image/") &&
    !file.type.startsWith("video/")
  ){

    return toast(
      "Please choose an image or video."
    );
  }


  if(
    file.size >
    50 * 1024 * 1024
  ){

    return toast(
      "Maximum upload size is 50MB."
    );
  }


  try{

    toast(
      "Uploading story..."
    );


    const mediaUrl =
      await uploadMedia(
        file,
        "stories"
      );


    const mediaType =
      file.type.startsWith("video/")
      ? "video"
      : "image";


    /*
      IMPORTANT:
      Start with the original stories schema.
      This prevents missing music/filter columns
      from breaking story uploads.
    */

    const basicStory = {

      user_id:user.id,

      media_url:mediaUrl,

      media_type:mediaType

    };


    let result =
      await sb
        .from("stories")
        .insert(
          basicStory
        )
        .select()
        .single();


    if(result.error){

      console.error(
        "STORY INSERT:",
        result.error
      );

      throw result.error;
    }


    /*
      Add music/filter only if the database supports them.
    */

    if(
      selectedStoryMusic?.id ||
      selectedStoryFilter !== "none"
    ){

      try{

        const optionalStory = {};

        if(selectedStoryMusic?.id){
          optionalStory.music_id =
            selectedStoryMusic.id;
        }

        if(
          selectedStoryFilter !== "none"
        ){
          optionalStory.filter =
            selectedStoryFilter;
        }

        if(
          Object.keys(
            optionalStory
          ).length
        ){

          await sb
            .from("stories")
            .update(
              optionalStory
            )
            .eq(
              "id",
              result.data.id
            );

        }

      }catch(error){

        console.warn(
          "Optional story features unavailable:",
          error
        );

      }
    }


    selectedStoryMusic = null;
    selectedStoryFilter = "none";


    if($("storyFile")){
      $("storyFile").value = "";
    }


    toast(
      "Story published successfully!"
    );


    await renderView(
      "home"
    );


  }catch(error){

    console.error(
      "PUBLISH STORY ERROR:",
      error
    );

    toast(
      "Story failed: " +
      safeError(
        error,
        "Unable to publish story."
      )
    );
  }
}


/* =========================================================
   DELETE POST
========================================================= */

async function deletePost(id){

  if(!user || !id){
    return;
  }


  if(!confirm("Delete this post?")){
    return;
  }


  const {
    error
  } =
    await sb
      .from("posts")
      .delete()
      .eq(
        "id",
        id
      )
      .eq(
        "user_id",
        user.id
      );


  if(error){

    return toast(
      safeError(
        error,
        "Unable to delete post."
      )
    );
  }


  toast(
    "Post deleted."
  );


  await renderView(
    currentView
  );
}


/* =========================================================
   LIKES
========================================================= */

async function toggleLike(postId){

  if(!user){
    return;
  }


  const {
    data,
    error
  } =
    await sb
      .from("post_likes")
      .select("id")
      .eq(
        "post_id",
        postId
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();


  if(error){

    return toast(
      safeError(error)
    );
  }


  if(data){

    const {
      error:deleteError
    } =
      await sb
        .from("post_likes")
        .delete()
        .eq(
          "id",
          data.id
        );


    if(deleteError){
      return toast(
        safeError(deleteError)
      );
    }

  }else{

    const {
      error:insertError
    } =
      await sb
        .from("post_likes")
        .insert({
          post_id:postId,
          user_id:user.id
        });


    if(insertError){
      return toast(
        safeError(insertError)
      );
    }
  }


  await renderView(
    currentView
  );
}


/* =========================================================
   COMMENTS
========================================================= */

async function openComments(postId){

  commentsPost =
    postId;


  const {
    data,
    error
  } =
    await sb
      .from("comments")
      .select(
        "id,user_id,content,created_at"
      )
      .eq(
        "post_id",
        postId
      )
      .order(
        "created_at",
        {ascending:true}
      );


  if(error){

    return toast(
      safeError(error)
    );
  }


  const comments =
    data || [];


  $("sheet").innerHTML = `

    <div class="row">

      <b>
        Comments
      </b>

      <span class="spacer"></span>

      <button
        class="iconbtn"
        onclick="closeModal()">
        ×
      </button>

    </div>

    <div id="commentList">

      ${
        comments.map(
          comment=>`

            <div class="panel">

              <b>
                Comment
              </b>

              <div
                style="
                  margin-top:6px;
                  white-space:pre-wrap;
                  word-break:break-word;
                ">

                ${esc(
                  comment.content
                )}

              </div>

              ${
                comment.user_id === user.id
                ?
                `
                  <button
                    class="iconbtn"
                    onclick="deleteComment('${esc(comment.id)}')">

                    🗑

                  </button>
                `
                :
                ""
              }

            </div>

          `
        ).join("") ||

        `
          <div class="muted">
            No comments yet.
          </div>
        `
      }

    </div>

    <div class="row">

      <input
        id="commentInput"
        class="field"
        maxlength="500"
        placeholder="Write a comment...">

      <button
        class="btn"
        onclick="addComment()">

        Send

      </button>

    </div>

  `;


  $("modal")
    ?.classList.remove(
      "hidden"
    );
}


async function addComment(){

  if(!user || !commentsPost){
    return;
  }


  const input =
    $("commentInput");


  const content =
    input?.value
      ?.trim() || "";


  if(!content){
    return;
  }


  if(content.length > 500){

    return toast(
      "Comment is too long."
    );
  }


  const {
    error
  } =
    await sb
      .from("comments")
      .insert({

        post_id:commentsPost,

        user_id:user.id,

        content:content

      });


  if(error){

    return toast(
      safeError(error)
    );
  }


  await openComments(
    commentsPost
  );
}


async function deleteComment(id){

  if(!user || !id){
    return;
  }


  const {
    error
  } =
    await sb
      .from("comments")
      .delete()
      .eq(
        "id",
        id
      )
      .eq(
        "user_id",
        user.id
      );


  if(error){

    return toast(
      safeError(error)
    );
  }


  await openComments(
    commentsPost
  );
}


/* =========================================================
   SHARE
========================================================= */

async function sharePost(postId){

  const url =
    window.location.href.split("#")[0] +
    "#post-" +
    postId;


  try{

    if(
      navigator.share
    ){

      await navigator.share({
        title:"Vidora",
        text:"Check out this Vidora post.",
        url
      });

    }else if(
      navigator.clipboard
    ){

      await navigator.clipboard.writeText(
        url
      );

      toast(
        "Post link copied."
      );

    }else{

      toast(
        "Sharing is not supported on this browser."
      );
    }

  }catch(error){

    console.log(
      "SHARE:",
      error
    );
  }
}


/* =========================================================
   DISCOVER
========================================================= */

async function renderDiscover(){

  $("main").innerHTML = `

    <section class="panel">

      <div class="title">
        Discover
      </div>

      <input
        id="userSearch"
        class="field"
        placeholder="Search users...">

      <div id="discoverResults">
        Search for users.
      </div>

    </section>
  `;


  $("userSearch")
    ?.addEventListener(
      "input",
      event=>{

        clearTimeout(
          window.__vidoraSearchTimer
        );

        window.__vidoraSearchTimer =
          setTimeout(
            ()=>{
              searchUsers(
                event.target.value
              );
            },
            350
          );

      }
    );
}


async function searchUsers(query){

  const box =
    $("discoverResults");

  if(!box){
    return;
  }


  query =
    String(query || "")
      .trim();


  if(!query){

    box.innerHTML =
      "Search for users.";

    return;
  }


  const {
    data,
    error
  } =
    await sb
      .from("profiles")
      .select(
        "id,username,display_name,avatar_url"
      )
      .or(
        `username.ilike.%${query}%,display_name.ilike.%${query}%`
      )
      .limit(30);


  if(error){

    box.innerHTML =
      esc(
        safeError(error)
      );

    return;
  }


  box.innerHTML =
    (data || [])
      .map(
        person=>`

          <div class="panel row">

            <img
              class="avatar sm"
              src="${avatarSrc(
                person.avatar_url
              )}"
              alt="">

            <div>

              <b>
                ${esc(
                  person.display_name ||
                  person.username ||
                  "User"
                )}
              </b>

              <div class="muted">
                @${esc(
                  person.username ||
                  "user"
                )}
              </div>

            </div>

            <span class="spacer"></span>

            ${
              person.id !== user.id
              ?
              `
                <button
                  class="btn"
                  onclick="toggleFollow('${esc(person.id)}')">

                  Follow

                </button>
              `
              :
              ""
            }

          </div>

        `
      ).join("") ||

    `
      <div class="muted">
        No users found.
      </div>
    `;
}


/* =========================================================
   FOLLOW
========================================================= */

async function toggleFollow(targetId){

  if(!user || !targetId){
    return;
  }


  const {
    data,
    error
  } =
    await sb
      .from("follows")
      .select("id")
      .eq(
        "follower_id",
        user.id
      )
      .eq(
        "following_id",
        targetId
      )
      .maybeSingle();


  if(error){

    return toast(
      safeError(error)
    );
  }


  if(data){

    await sb
      .from("follows")
      .delete()
      .eq(
        "id",
        data.id
      );

    toast(
      "Unfollowed."
    );

  }else{

    const {
      error:followError
    } =
      await sb
        .from("follows")
        .insert({

          follower_id:user.id,

          following_id:targetId

        });


    if(followError){

      return toast(
        safeError(followError)
      );
    }

    toast(
      "Following."
    );
  }
}


/* =========================================================
   PROFILE
========================================================= */

async function renderProfile(id){

  const {
    data,
    error
  } =
    await sb
      .from("profiles")
      .select("*")
      .eq(
        "id",
        id
      )
      .maybeSingle();


  if(error){

    $("main").innerHTML = `
      <div class="panel">
        ${esc(
          safeError(error)
        )}
      </div>
    `;

    return;
  }


  const p =
    data || profile || {};


  $("main").innerHTML = `

    <section class="panel">

      <div style="text-align:center">

        <img
          class="avatar lg"
          src="${avatarSrc(
            p.avatar_url
          )}"
          alt="">

        <h2>
          ${esc(
            p.display_name ||
            p.username ||
            "User"
          )}
        </h2>

        <div class="muted">
          @${esc(
            p.username ||
            "user"
          )}
        </div>

        ${
          p.bio
          ?
          `
            <p class="muted">
              ${esc(p.bio)}
            </p>
          `
          :
          ""
        }

        ${
          id === user.id
          ?
          `
            <button
              class="btn"
              onclick="renderAvatarPicker()">

              Change Avatar

            </button>

            <button
              class="btn danger"
              onclick="logout()">

              Logout

            </button>
          `
          :
          ""
        }

      </div>

    </section>
  `;
}


/* =========================================================
   AVATAR PICKER
========================================================= */

async function renderAvatarPicker(){

  const avatars = [

    "https://api.dicebear.com/9.x/bottts/svg?seed=Nova",

    "https://api.dicebear.com/9.x/bottts/svg?seed=Kai",

    "https://api.dicebear.com/9.x/bottts/svg?seed=Luna",

    "https://api.dicebear.com/9.x/bottts/svg?seed=Rex",

    "https://api.dicebear.com/9.x/bottts/svg?seed=Zara",

    "https://api.dicebear.com/9.x/bottts/svg?seed=Kairo"

  ];


  $("sheet").innerHTML = `

    <div class="row">

      <b>
        Choose Avatar
      </b>

      <span class="spacer"></span>

      <button
        class="iconbtn"
        onclick="closeModal()">

        ×

      </button>

    </div>

    <div class="row wrap">

      ${
        avatars.map(
          url=>`

            <button
              class="panel"
              onclick="saveAvatar('${url}')">

              <img
                class="avatar"
                src="${url}"
                alt="Avatar">

            </button>

          `
        ).join("")
      }

    </div>

  `;


  $("modal")
    ?.classList.remove(
      "hidden"
    );
}


async function saveAvatar(url){

  if(!user){
    return;
  }


  const {
    error
  } =
    await sb
      .from("profiles")
      .update({
        avatar_url:url
      })
      .eq(
        "id",
        user.id
      );


  if(error){

    return toast(
      safeError(
        error,
        "Unable to save avatar."
      )
    );
  }


  if(profile){
    profile.avatar_url =
      url;
  }


  toast(
    "Avatar updated."
  );


  closeModal();


  await renderView(
    currentView
  );
}


/* =========================================================
   MESSAGES
========================================================= */

async function renderMessages(){

  $("main").innerHTML = `

    <section class="panel">

      <div class="title">
        Messages
      </div>

      <div
        id="messageUsers">

        Loading...

      </div>

    </section>
  `;


  const {
    data,
    error
  } =
    await sb
      .from("follows")
      .select(
        "following_id"
      )
      .eq(
        "follower_id",
        user.id
      );


  if(error){

    $("messageUsers").innerHTML =
      `<div class="muted">
        Unable to load followers.
      </div>`;

    return;
  }


  const ids =
    (data || [])
      .map(
        x=>x.following_id
      );


  if(!ids.length){

    $("messageUsers").innerHTML =
      `
        <div class="muted">
          Follow users to start chatting.
        </div>
      `;

    return;
  }


  const {
    data:people
  } =
    await sb
      .from("profiles")
      .select(
        "id,username,display_name,avatar_url"
      )
      .in(
        "id",
        ids
      );


  $("messageUsers").innerHTML =
    (people || [])
      .map(
        person=>`

          <button
            class="panel row"
            style="
              width:100%;
              text-align:left;
            "
            onclick="openChat('${esc(person.id)}')">

            <img
              class="avatar sm"
              src="${avatarSrc(
                person.avatar_url
              )}"
              alt="">

            <div>

              <b>
                ${esc(
                  person.display_name ||
                  person.username ||
                  "User"
                )}
              </b>

              <div class="muted">
                @${esc(
                  person.username ||
                  "user"
                )}
              </div>

            </div>

          </button>

        `
      ).join("");
}


async function openChat(userId){

  const {
    data:person
  } =
    await sb
      .from("profiles")
      .select(
        "id,username,display_name"
      )
      .eq(
        "id",
        userId
      )
      .maybeSingle();


  chatUser =
    person;


  const {
    data:messages,
    error
  } =
    await sb
      .from("messages")
      .select(
        "id,sender_id,receiver_id,content,voice_url,created_at"
      )
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`
      )
      .order(
        "created_at",
        {ascending:true}
      );


  if(error){

    return toast(
      safeError(
        error,
        "Unable to load messages."
      )
    );
  }


  $("sheet").innerHTML = `

    <div class="row">

      <b>
        ${esc(
          person?.display_name ||
          person?.username ||
          "Chat"
        )}
      </b>

      <span class="spacer"></span>

      <button
        class="iconbtn"
        onclick="closeModal()">

        ×

      </button>

    </div>

    <div
      id="chatMessages"
      class="panel">

      ${
        (messages || [])
          .map(
            message=>`

              <div
                class="panel"
                style="
                  margin:5px 0;
                  text-align:${
                    message.sender_id === user.id
                    ? "right"
                    : "left"
                  };
                ">

                ${esc(
                  message.content || ""
                )}

              </div>

            `
          ).join("")
        ||
        `<div class="muted">
          No messages yet.
        </div>`
      }

    </div>

    <div class="row">

      <input
        id="messageInput"
        class="field"
        placeholder="Message...">

      <button
        class="btn primary"
        onclick="sendMessage()">

        Send

      </button>

    </div>

  `;


  $("modal")
    ?.classList.remove(
      "hidden"
    );
}


async function sendMessage(){

  if(
    !user ||
    !chatUser
  ){
    return;
  }


  const input =
    $("messageInput");


  const content =
    input?.value
      ?.trim() || "";


  if(!content){
    return;
  }


  const {
    error
  } =
    await sb
      .from("messages")
      .insert({

        sender_id:user.id,

        receiver_id:chatUser.id,

        content

      });


  if(error){

    return toast(
      safeError(
        error,
        "Unable to send message."
      )
    );
  }


  input.value = "";

  await openChat(
    chatUser.id
  );
}


/* =========================================================
   NOTIFICATIONS
========================================================= */

async function loadNotifications(){

  if(!user){
    return;
  }


  const {
    count
  } =
    await sb
      .from("notifications")
      .select(
        "*",
        {
          count:"exact",
          head:true
        }
      )
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "read",
        false
      );


  const badge =
    $("notifCount");


  if(badge){

    badge.textContent =
      count > 0
      ? String(count)
      : "";

  }
}


async function renderNotifications(){

  if(!user){
    return;
  }


  const {
    data,
    error
  } =
    await sb
      .from("notifications")
      .select("*")
      .eq(
        "user_id",
        user.id
      )
      .order(
        "created_at",
        {ascending:false}
      )
      .limit(30);


  if(error){

    return toast(
      safeError(
        error,
        "Unable to load notifications."
      )
    );
  }


  $("sheet").innerHTML = `

    <div class="row">

      <b>
        Notifications
      </b>

      <span class="spacer"></span>

      <button
        class="iconbtn"
        onclick="closeModal()">

        ×

      </button>

    </div>

    ${
      (data || [])
        .map(
          notification=>`

            <div class="panel">

              <b>
                ${esc(
                  notification.type ||
                  "Notification"
                )}
              </b>

            </div>

          `
        ).join("")
      ||
      `
        <div class="muted">
          No notifications.
        </div>
      `
    }

  `;


  $("modal")
    ?.classList.remove(
      "hidden"
    );
}


/* =========================================================
   AI ASSISTANT
========================================================= */

function openAssistant(){

  $("assistantBox")
    ?.classList.remove(
      "hidden"
    );
}


function closeAssistant(){

  $("assistantBox")
    ?.classList.add(
      "hidden"
    );
}


function assistantSay(
  message,
  from="ai"
){

  const box =
    $("assistantMessages");

  if(!box){
    return;
  }


  const div =
    document.createElement("div");

  div.className =
    "panel";


  div.innerHTML =
    `<b>${
      from === "user"
      ? "You"
      : "Vidora AI"
    }</b><div style="margin-top:5px">
      ${esc(message)}
    </div>`;


  box.appendChild(div);

  box.scrollTop =
    box.scrollHeight;
}


async function assistantSend(){

  const input =
    $("assistantInput");

  const message =
    input?.value
      ?.trim() || "";


  if(!message){
    return;
  }


  input.value = "";

  assistantSay(
    message,
    "user"
  );


  assistantHistory.push({
    role:"user",
    content:message
  });


  const lower =
    message.toLowerCase();


  if(
    lower.includes("logout")
  ){

    assistantSay(
      "You can logout from your Profile."
    );

    return;
  }


  if(
    lower.includes("post") ||
    lower.includes("upload")
  ){

    assistantSay(
      "Open Create from the bottom navigation to upload a photo or video."
    );

    return;
  }


  if(
    lower.includes("story")
  ){

    assistantSay(
      "Open Create and use the Create Story section to upload a story."
    );

    return;
  }


  if(
    lower.includes("music")
  ){

    assistantSay(
      "Vidora supports music selection for posts and stories when the database has the required music columns."
    );

    return;
  }


  if(
    lower.includes("avatar")
  ){

    assistantSay(
      "Open the avatar button at the top of Vidora to choose an avatar."
    );

    return;
  }


  assistantSay(
    "I'm Vidora AI. I can help you understand and use Vidora features such as posts, stories, music, profiles, messages and navigation."
  );
}


/* =========================================================
   MODAL
========================================================= */

function closeModal(){

  stopStoryAudio();

  $("modal")
    ?.classList.add(
      "hidden"
    );
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout(){

  try{

    const {
      error
    } =
      await sb.auth.signOut();

    if(error){
      throw error;
    }

  }catch(error){

    toast(
      safeError(
        error,
        "Unable to logout."
      )
    );
  }
}


/* =========================================================
   GLOBAL FUNCTIONS
========================================================= */

window.login =
  login;

window.signup =
  signup;

window.publishPost =
  publishPost;

window.publishStory =
  publishStory;

window.deletePost =
  deletePost;

window.deleteComment =
  deleteComment;

window.toggleLike =
  toggleLike;

window.openComments =
  openComments;

window.addComment =
  addComment;

window.openStoryUser =
  openStoryUser;

window.storyMove =
  storyMove;

window.selectMusic =
  selectMusic;

window.selectStoryMusic =
  selectStoryMusic;

window.setMusicCategory =
  setMusicCategory;

window.selectFilter =
  selectFilter;

window.selectStoryFilter =
  selectStoryFilter;

window.toggleFollow =
  toggleFollow;

window.sharePost =
  sharePost;

window.openChat =
  openChat;

window.sendMessage =
  sendMessage;

window.renderNotifications =
  renderNotifications;

window.renderAvatarPicker =
  renderAvatarPicker;

window.saveAvatar =
  saveAvatar;

window.closeModal =
  closeModal;

window.logout =
  logout;


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  ()=>{

    console.log(
      "VIDORA APP.JS LOADED"
    );


    /*
      LOGIN
    */

    $("loginBtn")
      ?.addEventListener(
        "click",
        login
      );


    /*
      SIGNUP
    */

    $("signupBtn")
      ?.addEventListener(
        "click",
        signup
      );


    /*
      SWITCH TO SIGNUP
    */

    $("showSignupBtn")
      ?.addEventListener(
        "click",
        ()=>{
          
          $("loginForm")
            ?.classList.add(
              "hidden"
            );

          $("signupForm")
            ?.classList.remove(
              "hidden"
            );

          showStatus(
            $("authStatus"),
            ""
          );
        }
      );


    /*
      SWITCH TO LOGIN
    */

    $("showLoginBtn")
      ?.addEventListener(
        "click",
        ()=>{

          $("signupForm")
            ?.classList.add(
              "hidden"
            );

          $("loginForm")
            ?.classList.remove(
              "hidden"
            );

          showStatus(
            $("authStatus"),
            ""
          );
        }
      );


    /*
      BOTTOM NAVIGATION
    */

    document
      .querySelectorAll(
        ".nav button"
      )
      .forEach(
        button=>{

          button.addEventListener(
            "click",
            ()=>{

              renderView(
                button.dataset.view
              );

            }
          );

        }
      );


    /*
      NOTIFICATIONS
    */

    $("openNotificationsBtn")
      ?.addEventListener(
        "click",
        renderNotifications
      );


    /*
      AVATAR
    */

    $("openAvatarBtn")
      ?.addEventListener(
        "click",
        renderAvatarPicker
      );


    /*
      AI
    */

    $("assistantFab")
      ?.addEventListener(
        "click",
        openAssistant
      );


    $("closeAssistant")
      ?.addEventListener(
        "click",
        closeAssistant
      );


    $("assistantSend")
      ?.addEventListener(
        "click",
        assistantSend
      );


    $("assistantInput")
      ?.addEventListener(
        "keydown",
        event=>{

          if(event.key === "Enter"){
            assistantSend();
          }

        }
      );


    /*
      MODAL BACKDROP
    */

    $("modal")
      ?.addEventListener(
        "click",
        event=>{

          if(
            event.target ===
            $("modal")
          ){

            closeModal();

          }

        }
      );


    /*
      START AUTH
    */

    init();

  }
);
