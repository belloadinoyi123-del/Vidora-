/* =========================================================
   VIDORA APP.JS
   Complete social app controller
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
   AVATARS
========================================================= */

const OLD_AVATARS = [
  {name:"Nova",file:"./nova.png",cat:"Original"},
  {name:"Kai",file:"./kai.png",cat:"Original"},
  {name:"Luna",file:"./luna.png",cat:"Original"},
  {name:"Ivy",file:"./ivy.png",cat:"Original"},
  {name:"Orion",file:"./orion.png",cat:"Original"},
  {name:"Zeno",file:"./zeno.png",cat:"Original"},
  {name:"Sage",file:"./sage.png",cat:"Original"},
  {name:"Rex",file:"./rex.png",cat:"Original"},
  {name:"Pixel",file:"./pixel.png",cat:"Original"},
  {name:"Vexa",file:"./vexa.png",cat:"Original"}
];

const NEW_AVATARS = [
  "Aero","Mika","Juno","Kairo","Nia",
  "Zara","Axel","Riven","Sora","Nyx",
  "Aria","Dax","Milo","Zuri","NovaX",
  "Kira","Echo","Tari","Vio","Onyx",
  "Cleo","Ryo","Asha","Zenith","Kairos",
  "Mira","Jett","Niko","Lumi","Vega"
].map((name,i)=>({
  name,
  file:"./avatars/"+name.toLowerCase()+".png",
  cat:i<10 ? "New" : "Expanded"
}));

const AVATARS = [
  ...OLD_AVATARS,
  ...NEW_AVATARS
];


/* =========================================================
   FILTERS
========================================================= */

const FILTERS = [
  {id:"none",name:"Original",css:"none"},
  {id:"vivid",name:"Vivid",css:"saturate(1.6) contrast(1.1)"},
  {id:"warm",name:"Warm",css:"sepia(.25) saturate(1.3) brightness(1.05)"},
  {id:"cool",name:"Cool",css:"hue-rotate(15deg) saturate(1.2) brightness(1.05)"},
  {id:"noir",name:"Noir",css:"grayscale(1) contrast(1.2)"},
  {id:"vintage",name:"Vintage",css:"sepia(.45) contrast(1.1) brightness(.95)"},
  {id:"fade",name:"Fade",css:"contrast(.85) brightness(1.1) saturate(.8)"},
  {id:"drama",name:"Drama",css:"contrast(1.4) saturate(1.2)"},
  {id:"glow",name:"Glow",css:"brightness(1.15) contrast(1.05) saturate(1.3)"},
  {id:"moon",name:"Moon",css:"grayscale(.4) brightness(1.1) contrast(1.15) hue-rotate(200deg)"},
  {id:"sunset",name:"Sunset",css:"sepia(.35) hue-rotate(-15deg) saturate(1.5)"},
  {id:"arctic",name:"Arctic",css:"hue-rotate(180deg) saturate(.7) brightness(1.1)"},
  {id:"pop",name:"Pop",css:"saturate(2) contrast(1.15)"},
  {id:"soft",name:"Soft",css:"blur(.3px) brightness(1.08) contrast(.92)"},
  {id:"cinema",name:"Cinema",css:"contrast(1.25) saturate(.9) brightness(.95)"},
  {id:"neon",name:"Neon",css:"saturate(1.8) contrast(1.2) hue-rotate(300deg)"},
  {id:"retro",name:"Retro",css:"sepia(.5) contrast(1.2) saturate(1.4)"},
  {id:"mist",name:"Mist",css:"brightness(1.12) contrast(.88)"},
  {id:"fire",name:"Fire",css:"sepia(.3) hue-rotate(-30deg) saturate(1.7) contrast(1.1)"},
  {id:"ice",name:"Ice",css:"hue-rotate(160deg) saturate(.85) brightness(1.12)"}
];


/* =========================================================
   BUILT-IN MUSIC
   These are demo/royalty-friendly sample URLs.
   For production, use audio you own or are licensed to use.
========================================================= */

const BUILTIN_TRACKS = [
  {id:"bz1",title:"Night Pulse",artist:"Vidora Beatz",category:"Beatz",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"},
  {id:"bz2",title:"Chrome Drive",artist:"Vidora Beatz",category:"Beatz",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"},
  {id:"bz3",title:"Low Rider",artist:"Vidora Beatz",category:"Beatz",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"},
  {id:"bz4",title:"Skyline",artist:"Vidora Beatz",category:"Beatz",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"},
  {id:"bz5",title:"Velvet Knock",artist:"Vidora Beatz",category:"Beatz",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"},
  {id:"bz6",title:"Midnight Grid",artist:"Vidora Beatz",category:"Beatz",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3"},
  {id:"bz7",title:"Soft Thunder",artist:"Vidora Beatz",category:"Beatz",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3"},
  {id:"bz8",title:"Neon Walk",artist:"Vidora Beatz",category:"Beatz",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"},

  {id:"dr1",title:"UK Slide",artist:"Vidora Drills",category:"Drills",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3"},
  {id:"dr2",title:"Dark Lane",artist:"Vidora Drills",category:"Drills",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3"},
  {id:"dr3",title:"Cold Blocks",artist:"Vidora Drills",category:"Drills",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3"},
  {id:"dr4",title:"Rapid Fire",artist:"Vidora Drills",category:"Drills",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3"},
  {id:"dr5",title:"Shadow Step",artist:"Vidora Drills",category:"Drills",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3"},
  {id:"dr6",title:"Street Clock",artist:"Vidora Drills",category:"Drills",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3"},
  {id:"dr7",title:"Iron Tempo",artist:"Vidora Drills",category:"Drills",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3"},
  {id:"dr8",title:"Frost Drill",artist:"Vidora Drills",category:"Drills",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3"},

  {id:"fk1",title:"Groovy Lane",artist:"Vidora Funk",category:"Funk",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"},
  {id:"fk2",title:"Bass Pocket",artist:"Vidora Funk",category:"Funk",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"},
  {id:"fk3",title:"Saturday Glow",artist:"Vidora Funk",category:"Funk",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"},
  {id:"fk4",title:"Electric Soul",artist:"Vidora Funk",category:"Funk",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"},
  {id:"fk5",title:"Disco Heat",artist:"Vidora Funk",category:"Funk",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"},
  {id:"fk6",title:"Funky Horizon",artist:"Vidora Funk",category:"Funk",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3"},
  {id:"fk7",title:"Rhythm Room",artist:"Vidora Funk",category:"Funk",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3"},
  {id:"fk8",title:"Gold Step",artist:"Vidora Funk",category:"Funk",audio_url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"}
];


/* =========================================================
   STATE
========================================================= */

let user = null;
let profile = null;
let currentView = "home";

let selectedAvatar = null;
let uploadedAvatarFile = null;

let storyItems = [];
let storyIndex = 0;

let commentsPost = null;
let chatUser = null;

let selectedMusic = null;
let selectedStoryMusic = null;

let selectedFilter = "none";
let selectedStoryFilter = "none";

let musicCategory = "All";
let storyMusicCategory = "All";

let assistantHistory = [];
let realtimeChannel = null;
let storyAudio = null;

let appStarting = false;
let authListenerReady = false;


/* =========================================================
   HELPERS
========================================================= */

const $ = id => document.getElementById(id);


function toast(msg){

  const el = $("toast");

  if(!el) return;

  el.textContent = String(msg || "");

  el.classList.remove("hidden");

  clearTimeout(window.__vidoraToastTimer);

  window.__vidoraToastTimer = setTimeout(()=>{
    el.classList.add("hidden");
  },3000);
}


function esc(v=""){

  return String(v).replace(
    /[&<>"']/g,
    m => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[m])
  );
}


function fallbackAvatar(name="V"){

  return "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg"
           width="160"
           height="160"
           viewBox="0 0 160 160">

        <defs>
          <linearGradient id="g">
            <stop offset="0%" stop-color="#8b5cf6"/>
            <stop offset="100%" stop-color="#ff2d75"/>
          </linearGradient>
        </defs>

        <rect
          width="160"
          height="160"
          rx="80"
          fill="#181824"/>

        <circle
          cx="80"
          cy="62"
          r="30"
          fill="url(#g)"/>

        <path
          d="M30 145c8-43 92-43 100 0"
          fill="url(#g)"/>

        <text
          x="80"
          y="153"
          text-anchor="middle"
          fill="white"
          font-size="14"
          font-family="Arial">
          ${esc(name).slice(0,1)}
        </text>

      </svg>
    `);
}


function avatarSrc(a){

  if(!a){
    return fallbackAvatar("V");
  }

  if(
    String(a).startsWith("http") ||
    String(a).startsWith("data:")
  ){
    return a;
  }

  return a;
}


function showStatus(el,msg,ok=false){

  if(!el) return;

  el.textContent = msg || "";

  el.className =
    "status " + (ok ? "ok" : "err");
}


function safeError(error,fallback="Something went wrong."){

  return error?.message ||
         error?.details ||
         error?.hint ||
         fallback;
}


function isColumnMissing(error,column){

  const msg =
    String(error?.message || "").toLowerCase();

  return (
    msg.includes("column") &&
    msg.includes(String(column).toLowerCase())
  );
}


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

  const ext =
    file.name && file.name.includes(".")
    ? file.name.split(".").pop().toLowerCase()
    : (
        file.type.startsWith("video/")
        ? "mp4"
        : file.type.startsWith("audio/")
        ? "webm"
        : "jpg"
      );

  const path =
    `${folder}/${user.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2,9)}.${ext}`;

  const {data,error} =
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
    throw new Error(
      safeError(error,"Media upload failed.")
    );
  }

  const {data:publicData} =
    sb.storage
      .from("media")
      .getPublicUrl(
        data?.path || path
      );

  if(!publicData?.publicUrl){
    throw new Error(
      "Could not create the media URL."
    );
  }

  return publicData.publicUrl;
}


/* =========================================================
   AUTH
========================================================= */

async function init(){

  if(authListenerReady){
    return;
  }

  authListenerReady = true;

  try{

    const {
      data:{
        session
      }
    } = await sb.auth.getSession();

    if(session?.user){

      await enterApp(
        session.user
      );

    }else{

      $("app")?.classList.add("hidden");

      $("authScreen")
        ?.classList.remove("hidden");
    }

  }catch(error){

    console.error(
      "VIDORA INIT ERROR:",
      error
    );

    $("app")?.classList.add("hidden");

    $("authScreen")
      ?.classList.remove("hidden");

    showStatus(
      $("authStatus"),
      "Unable to connect to Vidora. Check your internet connection."
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

        /*
          Do not initialize the application again if
          the same account is already open.
        */
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

        if(realtimeChannel){

          try{
            await sb.removeChannel(
              realtimeChannel
            );
          }catch(e){}

          realtimeChannel = null;
        }

        stopStoryAudio();

        $("app")
          ?.classList.add("hidden");

        $("authScreen")
          ?.classList.remove("hidden");

        $("loginPassword")
          && ($("loginPassword").value = "");
      }

    }
  );
}


async function enterApp(u){

  if(!u){
    return;
  }

  if(
    appStarting &&
    user?.id === u.id
  ){
    return;
  }

  appStarting = true;

  user = u;

  $("authScreen")
    ?.classList.add("hidden");

  $("app")
    ?.classList.remove("hidden");

  try{

    await loadProfile();

    await loadNotifications();

    await renderView("home");

    subscribeRealtime();

  }catch(error){

    console.error(
      "ENTER APP ERROR:",
      error
    );

    toast(
      safeError(
        error,
        "Vidora could not load your account."
      )
    );

  }finally{

    appStarting = false;
  }
}


async function loadProfile(){

  if(!user){
    return;
  }

  const {
    data,
    error
  } = await sb
    .from("profiles")
    .select("*")
    .eq("id",user.id)
    .maybeSingle();

  if(error){

    console.error(
      "PROFILE LOAD:",
      error
    );

    return;
  }

  profile = data;
}


/* =========================================================
   LOGIN
========================================================= */

async function login(){

  const btn = $("loginBtn");
  const statusEl = $("authStatus");

  const email =
    $("loginEmail")
      ?.value
      .trim();

  const password =
    $("loginPassword")
      ?.value || "";

  if(!email || !password){

    showStatus(
      statusEl,
      "Enter your email and password."
    );

    return;
  }

  if(btn){

    btn.disabled = true;
    btn.textContent = "Signing in...";
  }

  showStatus(
    statusEl,
    "Signing in...",
    true
  );

  try{

    const {
      data,
      error
    } = await sb.auth.signInWithPassword({
      email,
      password
    });

    if(error){

      console.error(
        "LOGIN ERROR:",
        error
      );

      showStatus(
        statusEl,
        safeError(
          error,
          "Login failed."
        )
      );

      return;
    }

    showStatus(
      statusEl,
      "Login successful.",
      true
    );

    /*
      Supabase's SIGNED_IN event normally calls enterApp.
      This fallback only calls it if the listener hasn't
      already opened the app.
    */
    if(
      data?.user &&
      (!user || user.id !== data.user.id)
    ){

      await enterApp(
        data.user
      );
    }

  }catch(error){

    console.error(
      "LOGIN EXCEPTION:",
      error
    );

    showStatus(
      statusEl,
      safeError(
        error,
        "Network error. Please try again."
      )
    );

  }finally{

    if(btn){

      btn.disabled = false;
      btn.textContent = "Login";
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
      .trim();

  const username =
    $("signupUsername")
      ?.value
      .trim();

  const age =
    $("signupAge")
      ?.value;

  const email =
    $("signupEmail")
      ?.value
      .trim();

  const password =
    $("signupPassword")
      ?.value || "";

  const confirmPassword =
    $("signupPasswordConfirm")
      ?.value || "";

  const statusEl =
    $("authStatus");


  if(
    !displayName ||
    !username ||
    !age ||
    !email ||
    !password ||
    !confirmPassword
  ){

    showStatus(
      statusEl,
      "Complete all signup fields."
    );

    return;
  }


  if(Number(age) < 13){

    showStatus(
      statusEl,
      "You must be at least 13 to use Vidora."
    );

    return;
  }


  if(password.length < 6){

    showStatus(
      statusEl,
      "Password must be at least 6 characters."
    );

    return;
  }


  if(password !== confirmPassword){

    showStatus(
      statusEl,
      "Passwords do not match."
    );

    return;
  }


  const signupBtn =
    $("signupBtn");

  if(signupBtn){

    signupBtn.disabled = true;
    signupBtn.textContent = "Creating...";
  }


  try{

    const {
      data,
      error
    } = await sb.auth.signUp({

      email,
      password,

      options:{
        data:{
          username,
          display_name:displayName,
          age:Number(age)
        }
      }

    });


    if(error){

      showStatus(
        statusEl,
        safeError(
          error,
          "Unable to create account."
        )
      );

      return;
    }


    if(data?.user){

      /*
        Some projects already have a trigger that creates
        the profile. Upsert is safe for both setups.
      */
      const {
        error:profileError
      } = await sb
        .from("profiles")
        .upsert({
          id:data.user.id,
          username,
          display_name:displayName
        });

      if(profileError){

        console.warn(
          "PROFILE SIGNUP UPSERT:",
          profileError
        );
      }


      if(data.session){

        showStatus(
          statusEl,
          "Account created successfully.",
          true
        );

      }else{

        showStatus(
          statusEl,
          "Account created. Check your email to confirm your account.",
          true
        );
      }
    }

  }catch(error){

    showStatus(
      statusEl,
      safeError(
        error,
        "Signup failed."
      )
    );

  }finally{

    if(signupBtn){

      signupBtn.disabled = false;
      signupBtn.textContent = "Create account";
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
  } = await sb
    .from("blocks")
    .select("blocked_id")
    .eq(
      "blocker_id",
      user.id
    );

  if(error){

    console.warn(
      "BLOCKS:",
      error
    );

    return new Set();
  }

  return new Set(
    (data || [])
      .map(x=>x.blocked_id)
  );
}


/* =========================================================
   HOME
========================================================= */

async function renderHome(){

  if(!$("main")){
    return;
  }

  $("main").innerHTML = `

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


  const blocked =
    await blockedIds();


  /*
    IMPORTANT:
    First query only the original columns that your
    existing Vidora database is known to have.

    This prevents a missing music_id/filter column
    from breaking the entire home feed.
  */
  let posts = [];
  let error = null;

  const basicResult =
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

  posts = basicResult.data || [];
  error = basicResult.error;


  if(error){

    console.error(
      "POST LOAD:",
      error
    );

    $("feed").innerHTML = `
      <div class="panel">
        <b>Unable to load posts.</b>
        <div class="muted">
          ${esc(
            safeError(
              error,
              "Please try again."
            )
          )}
        </div>
      </div>
    `;

    return;
  }


  /*
    Try optional columns separately.
    If they don't exist, the feed continues normally.
  */
  if(posts.length){

    const ids =
      posts.map(p=>p.id);

    try{

      const optional =
        await sb
          .from("posts")
          .select(
            "id,music_id,filter"
          )
          .in(
            "id",
            ids
          );

      if(!optional.error){

        const map = {};

        (optional.data || [])
          .forEach(p=>{
            map[p.id] = p;
          });

        posts = posts.map(p=>({
          ...p,
          music_id:
            map[p.id]?.music_id || null,
          filter:
            map[p.id]?.filter || "none"
        }));

      }else{

        posts = posts.map(p=>({
          ...p,
          music_id:null,
          filter:"none"
        }));
      }

    }catch(e){

      posts = posts.map(p=>({
        ...p,
        music_id:null,
        filter:"none"
      }));
    }
  }


  const visible =
    posts.filter(
      p=>!blocked.has(p.user_id)
    );


  const html =
    await Promise.all(
      visible.map(renderPost)
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

async function renderPost(p){

  let author = null;
  let likes = 0;
  let comments = 0;
  let liked = null;
  let track = null;


  const authorResult =
    await sb
      .from("profiles")
      .select(
        "username,display_name,avatar_url"
      )
      .eq(
        "id",
        p.user_id
      )
      .maybeSingle();

  author =
    authorResult.data || null;


  const likesResult =
    await sb
      .from("post_likes")
      .select("*",{
        count:"exact",
        head:true
      })
      .eq(
        "post_id",
        p.id
      );

  likes =
    likesResult.count || 0;


  const commentsResult =
    await sb
      .from("comments")
      .select("*",{
        count:"exact",
        head:true
      })
      .eq(
        "post_id",
        p.id
      );

  comments =
    commentsResult.count || 0;


  const likedResult =
    await sb
      .from("post_likes")
      .select("id")
      .eq(
        "post_id",
        p.id
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

  liked =
    likedResult.data;


  /*
    Music is optional.
    A missing tracks table must NOT break posts.
  */
  if(p.music_id){

    try{

      const result =
        await sb
          .from("tracks")
          .select(
            "id,title,artist,audio_url,category"
          )
          .eq(
            "id",
            p.music_id
          )
          .maybeSingle();

      if(!result.error){
        track = result.data;
      }

    }catch(e){}
  }


  const filterCss =
    getFilterCss(
      p.filter || "none"
    );


  const media =
    p.media_type === "video"
    ?
    `
      <video
        class="post-media"
        controls
        playsinline
        preload="metadata"
        style="filter:${filterCss}"
        src="${esc(p.media_url)}">
      </video>
    `
    :
    `
      <img
        class="post-media"
        loading="lazy"
        style="filter:${filterCss}"
        src="${esc(p.media_url)}"
        alt="Vidora post">
    `;


  const musicHtml =
    track
    ?
    `
      <div
        class="panel"
        style="
          margin-top:8px;
          padding:9px 10px;
        ">

        <div
          class="row"
          style="
            gap:8px;
            align-items:center;
          ">

          <span>🎵</span>

          <div
            style="
              flex:1;
              min-width:0;
            ">

            <b>
              ${esc(
                track.title ||
                "Track"
              )}
            </b>

            ${
              track.artist
              ?
              `
                <div class="muted">
                  ${esc(track.artist)}
                </div>
              `
              :
              ""
            }

          </div>

        </div>

        ${
          track.audio_url
          ?
          `
            <audio
              controls
              preload="none"
              style="
                width:100%;
                margin-top:6px;
              "
              src="${esc(
                track.audio_url
              )}">
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
      data-post-id="${esc(p.id)}">

      <div class="row">

        <img
          class="avatar sm"
          loading="lazy"
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
          p.user_id === user.id
          ?
          `
            <button
              class="iconbtn"
              onclick="deletePost('${esc(p.id)}')"
              title="Delete post">
              🗑
            </button>
          `
          :
          ""
        }

      </div>

      ${media}

      ${musicHtml}

      ${
        p.caption
        ?
        `
          <div
            style="
              margin-top:9px;
              white-space:pre-wrap;
              word-break:break-word;
            ">
            ${esc(p.caption)}
          </div>
        `
        :
        ""
      }

      <div class="post-actions">

        <button
          class="${liked ? "active" : ""}"
          onclick="toggleLike('${esc(p.id)}')">
          ♥ ${likes}
        </button>

        <button
          onclick="openComments('${esc(p.id)}')">
          💬 ${comments}
        </button>

        <button
          onclick="sharePost('${esc(p.id)}')">
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


  const blocked =
    await blockedIds();


  const {
    data:stories,
    error
  } = await sb
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

    storyItems = [];

    box.innerHTML = `
      <span class="muted">
        Stories are unavailable right now.
      </span>
    `;

    return;
  }


  storyItems =
    (stories || [])
      .filter(
        s=>!blocked.has(s.user_id)
      );


  const users = [
    ...new Set(
      storyItems.map(
        s=>s.user_id
      )
    )
  ];


  const profiles = {};


  if(users.length){

    const {
      data
    } = await sb
      .from("profiles")
      .select(
        "id,username,display_name,avatar_url"
      )
      .in(
        "id",
        users
      );


    (data || []).forEach(
      x=>{
        profiles[x.id] = x;
      }
    );
  }


  const groups = {};


  storyItems.forEach(s=>{

    if(!groups[s.user_id]){
      groups[s.user_id] = [];
    }

    groups[s.user_id].push(s);

  });


  box.innerHTML =

    Object.entries(groups)
      .map(([id])=>{

        const pr =
          profiles[id] || {};

        return `

          <button
            class="storyitem"
            onclick="openStoryUser('${esc(id)}')">

            <div class="storyring">

              <img
                loading="lazy"
                src="${avatarSrc(
                  pr.avatar_url
                )}"
                alt="">

            </div>

            <small>
              ${esc(
                pr.username ||
                pr.display_name ||
                "Story"
              )}
            </small>

          </button>
        `;
      })
      .join("") ||

      `
        <span class="muted">
          No stories yet. Create the first one.
        </span>
      `;
}


async function openStoryUser(id){

  const arr =
    storyItems.filter(
      s=>s.user_id === id
    );

  if(!arr.length){
    return toast("Story unavailable.");
  }

  storyIndex = 0;

  window.currentStorySet = arr;

  openStory(
    arr,
    0
  );
}


function stopStoryAudio(){

  if(storyAudio){

    try{

      storyAudio.pause();
      storyAudio.currentTime = 0;
      storyAudio.src = "";

    }catch(e){}

    storyAudio = null;
  }
}


function getFilterCss(id){

  const f =
    FILTERS.find(
      x=>x.id === id
    );

  return f
    ? f.css
    : "none";
}


function findMusic(id){

  if(!id){
    return null;
  }

  return (
    (window._musicTracks || [])
      .find(t=>String(t.id) === String(id))
    ||
    BUILTIN_TRACKS
      .find(t=>String(t.id) === String(id))
    ||
    null
  );
}


function openStory(arr,i){

  if(!arr || !arr.length){
    return;
  }

  const s = arr[i];

  if(!s){
    return;
  }

  window.currentStorySet = arr;
  storyIndex = i;

  stopStoryAudio();


  const filterCss =
    getFilterCss(
      s.filter || "none"
    );


  const media =
    s.media_type === "video"
    ?
    `
      <video
        class="post-media story-media"
        controls
        autoplay
        playsinline
        style="filter:${filterCss}"
        src="${esc(s.media_url)}">
      </video>
    `
    :
    `
      <img
        class="post-media story-media"
        style="filter:${filterCss}"
        src="${esc(s.media_url)}"
        alt="Story">
    `;


  const musicId =
    s.music_id ||
    s.musicId ||
    null;


  const track =
    findMusic(musicId);


  const musicBar =
    track
    ?
    `
      <div
        class="story-music-bar">

        <span
          class="story-music-icon">
          🎵
        </span>

        <div
          class="story-music-info">

          <b>
            ${esc(
              track.title ||
              "Track"
            )}
          </b>

          <div class="muted">
            ${esc(
              track.artist ||
              track.category ||
              ""
            )}
          </div>

        </div>

      </div>
    `
    :
    "";


  $("sheet").innerHTML = `

    <div class="row">

      <b>
        Story ${i+1}/${arr.length}
      </b>

      <span class="spacer"></span>

      <button
        class="iconbtn"
        onclick="closeModal()">
        ×
      </button>

    </div>

    ${media}

    ${musicBar}

    <div
      class="wrap"
      style="margin-top:10px">

      <button
        class="btn"
        onclick="storyMove(${i-1})"
        ${i <= 0 ? "disabled" : ""}>
        ← Prev
      </button>

      <button
        class="btn"
        onclick="storyMove(${i+1})"
        ${i >= arr.length-1 ? "disabled" : ""}>
        Next →
      </button>

      ${
        s.user_id === user.id
        ?
        `
          <button
            class="btn danger"
            onclick="deleteStory('${esc(s.id)}')">
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


  /*
    Browser autoplay policies may block audio.
    We attempt playback, but the user can interact
    with the story if the browser blocks autoplay.
  */
  if(
    track &&
    track.audio_url
  ){

    try{

      storyAudio =
        new Audio(
          track.audio_url
        );

      storyAudio.loop = true;
      storyAudio.volume = 0.85;

      storyAudio
        .play()
        .catch(()=>{
          console.log(
            "Story audio autoplay was blocked by browser."
          );
        });

    }catch(e){}
  }
}


function storyMove(i){

  const arr =
    window.currentStorySet || [];

  if(
    i < 0 ||
    i >= arr.length
  ){

    return;
  }

  openStory(
    arr,
    i
  );
}


/* =========================================================
   DELETE STORY
========================================================= */

async function deleteStory(id){

  if(!user || !id){
    return;
  }

  const story =
    storyItems.find(
      s=>String(s.id) === String(id)
    );


  if(
    !confirm(
      "Delete this story?"
    )
  ){
    return;
  }


  try{

    /*
      Delete database record first.
    */
    const {
      error
    } = await sb
      .from("stories")
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
      throw error;
    }


    stopStoryAudio();

    toast(
      "Story deleted."
    );

    closeModal();

    await renderView(
      currentView === "home"
      ? "home"
      : currentView
    );

  }catch(error){

    console.error(
      "DELETE STORY:",
      error
    );

    toast(
      safeError(
        error,
        "Unable to delete story."
      )
    );
  }
}


/* =========================================================
   PUBLISH STORY
========================================================= */

async function publishStory(){

  if(!user){
    return toast(
      "You are not logged in."
    );
  }


  const file =
    $("storyFile")
      ?.files[0];


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


    const url =
      await uploadMedia(
        file,
        "stories"
      );


    const mediaType =
      file.type.startsWith("video/")
      ?
      "video"
      :
      "image";


    /*
      Start with the original schema that
      definitely exists in the project.
    */
    const basicPayload = {

      user_id:user.id,
      media_url:url,
      media_type:mediaType

    };


    /*
      Try the enhanced version first.
    */
    const enhancedPayload = {

      ...basicPayload,

      music_id:
        selectedStoryMusic?.id || null,

      filter:
        selectedStoryFilter || "none"
    };


    let result =
      await sb
        .from("stories")
        .insert(
          enhancedPayload
        );


    /*
      If the new optional columns do not exist,
      automatically fall back to the old schema.
    */
    if(
      result.error &&
      (
        isColumnMissing(
          result.error,
          "music_id"
        ) ||
        isColumnMissing(
          result.error,
          "filter"
        )
      )
    ){

      console.warn(
        "Optional story columns unavailable. Using basic story schema."
      );

      result =
        await sb
          .from("stories")
          .insert(
            basicPayload
          );
    }


    if(result.error){

      throw result.error;
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
      "STORY PUBLISH:",
      error
    );

    toast(
      "Story failed: " +
      safeError(
        error,
        "Please try again."
      )
    );
  }
}


/* =========================================================
   POSTS / CREATE POST
========================================================= */

async function publishPost(){

  if(!user){

    return toast(
      "You are not logged in."
    );
  }


  const file =
    $("createFile")
      ?.files[0];


  const caption =
    $("createCaption")
      ?.value
      .trim() || "";


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
      "Uploading media..."
    );


    const url =
      await uploadMedia(
        file,
        "posts"
      );


    if(!url){

      throw new Error(
        "Media upload returned no URL."
      );
    }


    const mediaType =
      file.type.startsWith("video/")
      ?
      "video"
      :
      "image";


    /*
      This is the IMPORTANT part.

      We first create the post using the columns
      that your existing database already has.
    */
    const basicPost = {

      user_id:user.id,

      media_url:url,

      media_type:mediaType,

      caption

    };


    /*
      Enhanced version adds music and filter.
      If either optional column is missing,
      the code automatically falls back.
    */
    const enhancedPost = {

      ...basicPost,

      music_id:
        selectedMusic?.id || null,

      filter:
        selectedFilter || "none"

    };


    console.log(
      "VIDORA POST:",
      enhancedPost
    );


    let result =
      await sb
        .from("posts")
        .insert(
          enhancedPost
        )
        .select()
        .single();


    /*
      Fallback 1:
      remove filter if the filter column doesn't exist.
    */
    if(
      result.error &&
      isColumnMissing(
        result.error,
        "filter"
      )
    ){

      const withoutFilter = {

        ...basicPost,

        music_id:
          selectedMusic?.id || null

      };


      result =
        await sb
          .from("posts")
          .insert(
            withoutFilter
          )
          .select()
          .single();
    }


    /*
      Fallback 2:
      remove music_id too if that column doesn't exist.
    */
    if(
      result.error &&
      isColumnMissing(
        result.error,
        "music_id"
      )
    ){

      result =
        await sb
          .from("posts")
          .insert(
            basicPost
          )
          .select()
          .single();
    }


    if(result.error){

      console.error(
        "POST INSERT ERROR:",
        result.error
      );

      throw result.error;
    }


    /*
      Reset create form.
    */
    if($("createFile")){
      $("createFile").value = "";
    }

    if($("createCaption")){
      $("createCaption").value = "";
    }

    if($("createPreview")){

      $("createPreview")
        .classList.add("hidden");

      $("createPreview")
        .innerHTML = "";
    }


    selectedMusic = null;
    selectedFilter = "none";


    toast(
      "Post published successfully!"
    );


    await renderView(
      "home"
    );


  }catch(error){

    console.error(
      "CREATE POST FAILED:",
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
   DELETE POST
========================================================= */

async function deletePost(id){

  if(!user || !id){
    return;
  }


  if(
    !confirm(
      "Delete this post?"
    )
  ){
    return;
  }


  try{

    const {
      error
    } = await sb
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
      throw error;
    }


    toast(
      "Post deleted."
    );


    await renderView(
      currentView
    );


  }catch(error){

    console.error(
      "DELETE POST:",
      error
    );

    toast(
      safeError(
        error,
        "Unable to delete post."
      )
    );
  }
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
    error:checkError
  } = await sb
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


  if(checkError){

    return toast(
      safeError(
        checkError,
        "Unable to check like."
      )
    );
  }


  if(data){

    const {
      error
    } = await sb
      .from("post_likes")
      .delete()
      .eq(
        "id",
        data.id
      );

    if(error){
      return toast(
        safeError(error)
      );
    }

  }else{

    const {
      error
    } = await sb
      .from("post_likes")
      .insert({
        post_id:postId,
        user_id:user.id
      });


    if(error){

      return toast(
        safeError(error)
      );
    }


    const {
      data:p
    } = await sb
      .from("posts")
      .select("user_id")
      .eq(
        "id",
        postId
      )
      .maybeSingle();


    if(
      p &&
      p.user_id !== user.id
    ){

      await sb
        .from("notifications")
        .insert({

          user_id:p.user_id,
          actor_id:user.id,
          type:"like",
          post_id:postId

        });
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

  commentsPost = postId;


  const {
    data:comments,
    error
  } = await sb
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


  const ids = [
    ...new Set(
      (comments || [])
        .map(
          c=>c.user_id
        )
    )
  ];


  const prof = {};


  if(ids.length){

    const {
      data
    } = await sb
      .from("profiles")
      .select(
        "id,username,avatar_url"
      )
      .in(
        "id",
        ids
      );


    (data || [])
      .forEach(
        x=>{
          prof[x.id] = x;
        }
      );
  }


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
        (comments || [])
          .map(c=>`

            <div class="panel">

              <div class="row">

                <img
                  class="avatar sm"
                  src="${avatarSrc(
                    prof[c.user_id]
                      ?.avatar_url
                  )}"
                  alt="">

                <b>
                  @${esc(
                    prof[c.user_id]
                      ?.username ||
                    "user"
                  )}
                </b>

                <span class="spacer"></span>

                ${
                  c.user_id === user.id
                  ?
                  `
                    <button
                      class="iconbtn"
                      onclick="deleteComment('${esc(c.id)}')">
                      🗑
                    </button>
                  `
                  :
                  ""
                }

              </div>

              <div
                style="
                  margin-top:7px;
                  white-space:pre-wrap;
                  word-break:break-word;
                ">
                ${esc(c.content)}
              </div>

            </div>

          `)
          .join("")

        ||

        `
          <p class="muted">
            No comments yet.
          </p>
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

  const content =
    $("commentInput")
      ?.value
      .trim();


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
  } = await sb
    .from("comments")
    .insert({

      post_id:commentsPost,
      user_id:user.id,
      content

    });


  if(error){

    return toast(
      safeError(error)
    );
  }


  const {
    data:p
  } = await sb
    .from("posts")
    .select("user_id")
    .eq(
      "id",
      commentsPost
    )
    .maybeSingle();


  if(
    p &&
    p.user_id !== user.id
  ){

    await sb
      .from("notifications")
      .insert({

        user
