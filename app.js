const SUPABASE_URL =
  "https://htnrqgzxkfktwoioscjr.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_JT5rBfXYSX3-3_zyC2cazQ_YXg_ih_h";

const sb =
  supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


/* =========================
   AVATARS
========================= */

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


/* =========================
   STATE
========================= */

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
let assistantHistory = [];
let realtimeChannel = null;


/* =========================
   HELPERS
========================= */

const $ = id =>
  document.getElementById(id);

function toast(msg){
  const el = $("toast");

  if(!el)return;

  el.textContent = msg;
  el.classList.remove("hidden");

  setTimeout(()=>{
    el.classList.add("hidden");
  },2500);
}

function esc(v=""){
  return String(v).replace(
    /[&<>"']/g,
    m=>({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[m])
  );
}

function fallbackAvatar(name="V"){
  return "data:image/svg+xml;charset=UTF-8,"+
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg"
           width="160"
           height="160">

        <defs>
          <linearGradient id="g">
            <stop stop-color="#8b5cf6"/>
            <stop offset="1" stop-color="#ff2d75"/>
          </linearGradient>
        </defs>

        <rect
          width="100%"
          height="100%"
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
    a.startsWith("http") ||
    a.startsWith("data:")
  ){
    return a;
  }

  return a;
}

function showStatus(el,msg,ok=false){
  if(!el)return;

  el.textContent = msg;
  el.className =
    "status " + (ok ? "ok" : "err");
}


/* =========================
   AUTH
========================= */

async function init(){

  try{

    const {
      data:{
        session
      }
    } = await sb.auth.getSession();

    if(session){

      await enterApp(
        session.user
      );

    }else{

      $("authScreen")
        ?.classList.remove("hidden");

    }

  }catch(error){

    console.error(error);

    showStatus(
      $("authStatus"),
      "Unable to connect to Vidora."
    );
  }


  sb.auth.onAuthStateChange(
    async(event,session)=>{

      if(
        (
          event==="SIGNED_IN" ||
          event==="TOKEN_REFRESHED"
        ) &&
        session
      ){

        await enterApp(
          session.user
        );
      }

      if(event==="SIGNED_OUT"){

        user=null;
        profile=null;

        $("app")
          ?.classList.add("hidden");

        $("authScreen")
          ?.classList.remove("hidden");
      }

    }
  );
}


async function enterApp(u){

  user = u;

  $("authScreen")
    ?.classList.add("hidden");

  $("app")
    ?.classList.remove("hidden");

  await loadProfile();

  await loadNotifications();

  await renderView("home");

  subscribeRealtime();
}


async function loadProfile(){

  if(!user)return;

  const {
    data,
    error
  } = await sb
    .from("profiles")
    .select("*")
    .eq("id",user.id)
    .maybeSingle();

  if(error){

    console.error(error);

    toast(error.message);

    return;
  }

  profile = data;
}


/* LOGIN */

async function login(){

  const email =
    $("loginEmail")
      ?.value.trim();

  const password =
    $("loginPassword")
      ?.value;

  if(!email || !password){

    return showStatus(
      $("authStatus"),
      "Enter your email and password."
    );
  }

  const {
    error
  } = await sb.auth.signInWithPassword({
    email,
    password
  });

  if(error){

    showStatus(
      $("authStatus"),
      error.message
    );

    return;
  }

  showStatus(
    $("authStatus"),
    "Login successful.",
    true
  );
}


/* SIGNUP */

async function signup(){

  const displayName =
    $("signupDisplayName")
      ?.value.trim();

  const username =
    $("signupUsername")
      ?.value.trim();

  const age =
    $("signupAge")
      ?.value;

  const email =
    $("signupEmail")
      ?.value.trim();

  const password =
    $("signupPassword")
      ?.value;

  const confirmPassword =
    $("signupPasswordConfirm")
      ?.value;


  if(
    !displayName ||
    !username ||
    !age ||
    !email ||
    !password ||
    !confirmPassword
  ){

    return showStatus(
      $("authStatus"),
      "Complete all signup fields."
    );
  }


  if(Number(age)<13){

    return showStatus(
      $("authStatus"),
      "You must be at least 13 to use Vidora."
    );
  }


  if(password.length<6){

    return showStatus(
      $("authStatus"),
      "Password must be at least 6 characters."
    );
  }


  if(password!==confirmPassword){

    return showStatus(
      $("authStatus"),
      "Passwords do not match."
    );
  }


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

    return showStatus(
      $("authStatus"),
      error.message
    );
  }


  if(data.user){

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

      console.error(
        profileError
      );
    }


    showStatus(
      $("authStatus"),
      data.session
        ?
        "Account created successfully."
        :
        "Account created. Check your email to confirm your account.",
      true
    );
  }
}


/* =========================
   NAVIGATION
========================= */

async function renderView(view){

  currentView = view;

  document
    .querySelectorAll(".nav button")
    .forEach(button=>{

      button.classList.toggle(
        "active",
        button.dataset.view===view
      );

    });


  if(view==="home"){
    return renderHome();
  }

  if(view==="discover"){
    return renderDiscover();
  }

  if(view==="create"){
    return renderCreate();
  }

  if(view==="messages"){
    return renderMessages();
  }

  if(view==="profile"){
    return renderProfile(user.id);
  }
}


/* =========================
   BLOCKS
========================= */

async function blockedIds(){

  const {
    data
  } = await sb
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id",user.id);

  return new Set(
    (data||[])
      .map(x=>x.blocked_id)
  );
}


/* =========================
   HOME
========================= */

async function renderHome(){

  $("main").innerHTML = `

    <section class="panel">

      <div class="title">
        Stories
      </div>

      <div
        id="stories"
        class="storybar">

        Loading...

      </div>

    </section>

    <div id="feed">
      Loading feed...
    </div>
  `;


  await renderStories();


  const blocked =
    await blockedIds();


  const {
    data:posts,
    error
  } = await sb
    .from("posts")
    .select(
      "id,user_id,media_url,media_type,caption,created_at,music_id"
    )
    .order(
      "created_at",
      {ascending:false}
    )
    .limit(40);


  if(error){

    $("feed").textContent =
      error.message;

    return;
  }


  const visible =
    (posts||[])
      .filter(
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
        No posts yet.
      </div>
    `;
}


async function renderPost(p){

  const [
    {data:author},
    {count:likes},
    {count:comments},
    {data:liked}
  ] = await Promise.all([

    sb
      .from("profiles")
      .select(
        "username,display_name,avatar_url"
      )
      .eq("id",p.user_id)
      .maybeSingle(),

    sb
      .from("post_likes")
      .select("*",{
        count:"exact",
        head:true
      })
      .eq("post_id",p.id),

    sb
      .from("comments")
      .select("*",{
        count:"exact",
        head:true
      })
      .eq("post_id",p.id),

    sb
      .from("post_likes")
      .select("id")
      .eq("post_id",p.id)
      .eq("user_id",user.id)
      .maybeSingle()

  ]);


  const media =
    p.media_type==="video"
    ?
    `
      <video
        class="post-media"
        controls
        playsinline
        src="${esc(p.media_url)}">
      </video>
    `
    :
    `
      <img
        class="post-media"
        src="${esc(p.media_url)}"
        alt="Vidora post">
    `;


  return `

    <article class="card">

      <div class="row">

        <img
          class="avatar sm"
          src="${avatarSrc(author?.avatar_url)}">

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
          p.user_id===user.id
          ?
          `
            <button
              class="iconbtn"
              onclick="deletePost('${p.id}')">
              🗑
            </button>
          `
          :
          ""
        }

      </div>

      ${media}

      ${
        p.caption
        ?
        `
          <div style="margin-top:9px">
            ${esc(p.caption)}
          </div>
        `
        :
        ""
      }

      <div class="post-actions">

        <button
          class="${liked?"active":""}"
          onclick="toggleLike('${p.id}')">
          ♥ ${likes||0}
        </button>

        <button
          onclick="openComments('${p.id}')">
          💬 ${comments||0}
        </button>

        <button
          onclick="sharePost('${p.id}')">
          ↗ Share
        </button>

      </div>

    </article>
  `;
}


/* =========================
   STORIES
========================= */

async function renderStories(){

  const blocked =
    await blockedIds();


  const {
    data:stories
  } = await sb
    .from("stories")
    .select("*")
    .order(
      "created_at",
      {ascending:false}
    )
    .limit(50);


  storyItems =
    (stories||[])
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
        "id,username,avatar_url"
      )
      .in("id",users);


    (data||[]).forEach(
      x=>profiles[x.id]=x
    );
  }


  const groups = {};


  storyItems.forEach(s=>{

    if(!groups[s.user_id]){
      groups[s.user_id]=[];
    }

    groups[s.user_id].push(s);

  });


  $("stories").innerHTML =

    Object.entries(groups)
      .map(([id])=>{

        const pr =
          profiles[id]||{};

        return `

          <button
            class="storyitem"
            onclick="openStoryUser('${id}')">

            <div class="storyring">

              <img
                src="${avatarSrc(
                  pr.avatar_url
                )}">

            </div>

            <small>
              ${esc(
                pr.username ||
                "Story"
              )}
            </small>

          </button>
        `;
      })
      .join("") ||

      `
        <span class="muted">
          No stories yet.
          Create the first one.
        </span>
      `;
}


async function openStoryUser(id){

  const arr =
    storyItems.filter(
      s=>s.user_id===id
    );

  storyIndex=0;

  window.currentStorySet =
    arr;

  openStory(arr,0);
}


function openStory(arr,i){

  if(!arr || !arr.length)return;

  const s=arr[i];

  if(!s)return;

  window.currentStorySet=arr;

  storyIndex=i;


  const media =
    s.media_type==="video"
    ?
    `
      <video
        class="post-media"
        controls
        autoplay
        playsinline
        src="${esc(s.media_url)}">
      </video>
    `
    :
    `
      <img
        class="post-media"
        src="${esc(s.media_url)}">
    `;


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

    <div
      class="wrap"
      style="margin-top:10px">

      <button
        class="btn"
        onclick="storyMove(${i-1})">
        ← Prev
      </button>

      <button
        class="btn"
        onclick="storyMove(${i+1})">
        Next →
      </button>

      ${
        s.user_id===user.id
        ?
        `
          <button
            class="btn danger"
            onclick="deleteStory('${s.id}')">
            Delete
          </button>
        `
        :
        ""
      }

    </div>
  `;


  $("modal")
    .classList.remove("hidden");
}


function storyMove(i){

  const arr =
    window.currentStorySet||[];

  if(i<0 || i>=arr.length){
    return;
  }

  openStory(arr,i);
}


async function publishStory(){

  const file =
    $("storyFile")?.files[0];


  if(!file){
    return toast(
      "Choose a photo or video."
    );
  }


  if(file.size>50*1024*1024){

    return toast(
      "Maximum file size is 50MB."
    );
  }


  try{

    const url =
      await uploadMedia(
        file,
        "stories"
      );


    const {
      error
    } = await sb
      .from("stories")
      .insert({

        user_id:user.id,

        media_url:url,

        media_type:
          file.type.startsWith("video/")
          ?
          "video"
          :
          "image"

      });


    if(error)throw error;


    toast(
      "Story published."
    );

    await renderView("home");

  }catch(e){

    toast(e.message);
  }
}

/* =========================
   POSTS / CREATE POST
========================= */

    
async function publishPost(){

  const file =
    $("createFile")?.files[0];

  const caption =
    $("createCaption")
      ?.value.trim();


  console.log("=== VIDORA CREATE POST ===");
  console.log("User:", user);
  console.log("File:", file);
  console.log("Caption:", caption);
  console.log("Selected music:", selectedMusic);


  if(!user){

    return toast(
      "You are not logged in."
    );
  }


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


  if(file.size > 50 * 1024 * 1024){

    return toast(
      "Maximum upload size is 50MB."
    );
  }


  try{

    toast("Uploading media...");


    /* =========================
       UPLOAD MEDIA
    ========================= */

    const url =
      await uploadMedia(
        file,
        "posts"
      );


    console.log(
      "Media uploaded:",
      url
    );


    if(!url){

      throw new Error(
        "Media upload returned no URL."
      );
    }


    /* =========================
       CREATE POST
    ========================= */

    const postData = {

      user_id: user.id,

      media_url: url,

      media_type:
        file.type.startsWith("video/")
        ?
        "video"
        :
        "image",

      caption:
        caption || ""

    };


    /*
      Only add music_id when a track
      was actually selected.
    */

    if(selectedMusic?.id){

      postData.music_id =
        selectedMusic.id;
    }


    console.log(
      "Creating post:",
      postData
    );


    const {
      data:createdPost,
      error
    } = await sb
      .from("posts")
      .insert(postData)
      .select()
      .single();


    if(error){

      console.error(
        "POST INSERT ERROR:",
        error
      );

      throw new Error(
        error.message ||
        "Unable to create post."
      );
    }


    console.log(
      "Post created:",
      createdPost
    );


    /* =========================
       SUCCESS
    ========================= */

    toast(
      "Post published successfully!"
    );


    if($("createFile")){

      $("createFile").value = "";
    }


    if($("createCaption")){

      $("createCaption").value = "";
    }


    selectedMusic = null;


    /*
      Return to Home and reload
      the feed.
    */

    await renderView("home");


  }catch(error){

    console.error(
      "CREATE POST FAILED:",
      error
    );


    toast(
      "Post failed: " +
      (
        error?.message ||
        "Unknown error"
      )
    );
  }
}

    


    
    
  

/* =========================
   LIKES
========================= */

async function toggleLike(postId){

  const {
    data
  } = await sb
    .from("post_likes")
    .select("id")
    .eq("post_id",postId)
    .eq("user_id",user.id)
    .maybeSingle();


  if(data){

    await sb
      .from("post_likes")
      .delete()
      .eq("id",data.id);

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
        error.message
      );
    }


    const {
      data:p
    } = await sb
      .from("posts")
      .select("user_id")
      .eq("id",postId)
      .single();


    if(
      p &&
      p.user_id!==user.id
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


/* =========================
   COMMENTS
========================= */

async function openComments(postId){

  commentsPost=postId;


  const {
    data:comments,
    error
  } = await sb
    .from("comments")
    .select(
      "id,user_id,content,created_at"
    )
    .eq("post_id",postId)
    .order(
      "created_at",
      {ascending:true}
    );


  if(error){

    return toast(
      error.message
    );
  }


  const ids = [
    ...new Set(
      (comments||[])
        .map(c=>c.user_id)
    )
  ];


  const prof={};


  if(ids.length){

    const {
      data
    } = await sb
      .from("profiles")
      .select(
        "id,username,avatar_url"
      )
      .in("id",ids);


    (data||[]).forEach(
      x=>prof[x.id]=x
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
        (comments||[])
          .map(c=>`

            <div class="panel">

              <div class="row">

                <img
                  class="avatar sm"
                  src="${avatarSrc(
                    prof[c.user_id]
                      ?.avatar_url
                  )}">

                <b>
                  @${esc(
                    prof[c.user_id]
                      ?.username ||
                    "user"
                  )}
                </b>

                <span class="spacer"></span>

                ${
                  c.user_id===user.id
                  ?
                  `
                    <button
                      class="iconbtn"
                      onclick="deleteComment('${c.id}')">
                      🗑
                    </button>
                  `
                  :
                  ""
                }

              </div>

              <div style="margin-top:7px">
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
    .classList.remove("hidden");
}


async function addComment(){

  const content =
    $("commentInput")
      ?.value.trim();


  if(!content)return;


  if(content.length>500){

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
      error.message
    );
  }


  const {
    data:p
  } = await sb
    .from("posts")
    .select("user_id")
    .eq("id",commentsPost)
    .single();


  if(
    p &&
    p.user_id!==user.id
  ){

    await sb
      .from("notifications")
      .insert({

        user_id:p.user_id,
        actor_id:user.id,
        type:"comment",
        post_id:commentsPost

      });
  }


  openComments(
    commentsPost
  );
}


async function deleteComment(id){

  const {
    error
  } = await sb
    .from("comments")
    .delete()
    .eq("id",id)
    .eq("user_id",user.id);


  if(error){

    return toast(
      error.message
    );
  }


  openComments(
    commentsPost
  );
}


/* =========================
   SHARE
========================= */

async function sharePost(id){

  const url =
    location.origin +
    location.pathname +
    "?post=" +
    encodeURIComponent(id);


  try{

    if(navigator.share){

      await navigator.share({

        title:"Vidora post",
        url

      });

    }else if(navigator.clipboard){

      await navigator.clipboard.writeText(
        url
      );

      toast(
        "Post link copied."
      );

    }else{

      toast(url);
    }

  }catch(e){

    if(
      e.name!=="AbortError"
    ){

      toast(
        "Unable to share."
      );
    }
  }
}


/* =========================
   CREATE
========================= */

async function renderCreate(){

  $("main").innerHTML = `

    <section class="panel">

      <div class="title">
        Create a post
      </div>

      <input
        id="createFile"
        class="field"
        type="file"
        accept="image/*,video/*">

      <textarea
        id="createCaption"
        class="field"
        maxlength="2000"
        placeholder="Write a caption..."></textarea>

      <div class="muted">
        Maximum upload size: 50MB
      </div>

      <div class="panel">

        <b>Music</b>

        <div class="muted">
          Select music for your post.
        </div>

        <div
          id="musicList"
          class="wrap"
          style="margin-top:8px">

          Loading...

        </div>

      </div>

      <button
        class="btn primary"
        onclick="publishPost()">
        🚀 Publish to Vidora
      </button>

    </section>


    <section class="panel">

      <div class="title">
        Create a story
      </div>

      <input
        id="storyFile"
        class="field"
        type="file"
        accept="image/*,video/*">

      <button
        class="btn primary"
        onclick="publishStory()">
        📖 Publish Story
      </button>

    </section>
  `;


  await loadMusic();
}


async function loadMusic(){

  const {
    data,
    error
  } = await sb
    .from("tracks")
    .select(
      "id,title,artist,audio_url"
    )
    .order(
      "title",
      {ascending:true}
    )
    .limit(100);


  if(error){

    $("musicList").innerHTML =
      `
        <span class="muted">
          Music library unavailable.
        </span>
      `;

    return;
  }


  $("musicList").innerHTML =
    (data||[])
      .map(t=>`

        <button
          class="btn"
          onclick="selectMusic('${t.id}')">

          🎵 ${esc(t.title)}

          ${
            t.artist
            ?
            `— ${esc(t.artist)}`
            :
            ""
          }

        </button>

      `)
      .join("")

    ||

    `
      <span class="muted">
        No tracks added yet.
      </span>
    `;
}


async function selectMusic(id){

  const {
    data
  } = await sb
    .from("tracks")
    .select("*")
    .eq("id",id)
    .maybeSingle();


  selectedMusic =
    data||null;


  toast(
    selectedMusic
    ?
    `Selected ${selectedMusic.title}`
    :
    "Music not found."
  );
}


/* =========================
   DISCOVER
========================= */

async function renderDiscover(){

  $("main").innerHTML = `

    <section class="panel">

      <div class="title">
        Discover
      </div>

      <input
        id="discoverSearch"
        class="field"
        placeholder="Search users..."
        oninput="searchUsers(this.value)">

    </section>

    <div id="discoverResults">

      <div class="panel muted">
        Search for people on Vidora.
      </div>

    </div>
  `;
}


async function searchUsers(q){

  const box =
    $("discoverResults");


  if(
    !q ||
    q.trim().length<2
  ){

    box.innerHTML =
      `
        <div class="panel muted">
          Type at least 2 characters.
        </div>
      `;

    return;
  }


  const term =
    q.trim()
      .replace(/[%_,]/g,"");


  const {
    data,
    error
  } = await sb
    .from("profiles")
    .select(
      "id,username,display_name,avatar_url,bio"
    )
    .or(
      `username.ilike.%${term}%,display_name.ilike.%${term}%`
    )
    .limit(30);


  if(error){

    box.textContent =
      error.message;

    return;
  }


  const blocked =
    await blockedIds();


  const users =
    (data||[])
      .filter(
        p=>p.id!==user.id
      )
      .filter(
        p=>!blocked.has(p.id)
      );


  if(!users.length){

    box.innerHTML =
      `
        <div class="panel muted">
          No users found.
        </div>
      `;

    return;
  }


  const html =
    await Promise.all(
      users.map(
        async p=>{

          const {
            data:follow
          } = await sb
            .from("follows")
            .select("id")
            .eq(
              "follower_id",
              user.id
            )
            .eq(
              "following_id",
              p.id
            )
            .maybeSingle();


          return `

            <div class="card">

              <div class="row">

                <img
                  class="avatar"
                  src="${avatarSrc(
                    p.avatar_url
                  )}">

                <div>

                  <b>
                    ${esc(
                      p.display_name ||
                      p.username ||
                      "User"
                    )}
                  </b>

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
                      <div class="muted">
                        ${esc(p.bio)}
                      </div>
                    `
                    :
                    ""
                  }

                </div>

                <span class="spacer"></span>

                <button
                  class="btn"
                  onclick="toggleFollow('${p.id}')">

                  ${
                    follow
                    ?
                    "Following"
                    :
                    "Follow"
                  }

                </button>

              </div>

            </div>
          `;
        }
      )
    );


  box.innerHTML =
    html.join("");
}


/* =========================
   FOLLOW
========================= */

async function toggleFollow(id){

  const {
    data
  } = await sb
    .from("follows")
    .select("id")
    .eq(
      "follower_id",
      user.id
    )
    .eq(
      "following_id",
      id
    )
    .maybeSingle();


  if(data){

    await sb
      .from("follows")
      .delete()
      .eq("id",data.id);

    toast("Unfollowed.");

  }else{

    const {
      error
    } = await sb
      .from("follows")
      .insert({

        follower_id:user.id,
        following_id:id

      });


    if(error){

      return toast(
        error.message
      );
    }


    await sb
      .from("notifications")
      .insert({

        user_id:id,
        actor_id:user.id,
        type:"follow"

      });


    toast("Following.");
  }


  await renderView(
    currentView
  );
}


/* =========================
   PROFILE
========================= */

async function renderProfile(id){

  const {
    data:p,
    error
  } = await sb
    .from("profiles")
    .select("*")
    .eq("id",id)
    .maybeSingle();


  if(error){

    return toast(
      error.message
    );
  }


  if(!p){

    return toast(
      "Profile not found."
    );
  }


  const {
    count:followers
  } = await sb
    .from("follows")
    .select("*",{
      count:"exact",
      head:true
    })
    .eq(
      "following_id",
      id
    );


  const {
    count:following
  } = await sb
    .from("follows")
    .select("*",{
      count:"exact",
      head:true
    })
    .eq(
      "follower_id",
      id
    );


  const isOwn =
    id===user.id;


  $("main").innerHTML = `

    <section class="panel">

      <div class="row">

        <img
          class="avatar lg"
          src="${avatarSrc(
            p.avatar_url
          )}">

        <div>

          <div
            class="title"
            style="margin:0">

            ${esc(
              p.display_name ||
              p.username ||
              "User"
            )}

          </div>

          <div class="muted">
            @${esc(
              p.username ||
              "user"
            )}
          </div>

        </div>

        <span class="spacer"></span>

      </div>


      ${
        p.bio
        ?
        `<p>${esc(p.bio)}</p>`
        :
        ""
      }


      <div class="wrap">

        <span class="btn">
          Followers:
          ${followers||0}
        </span>

        <span class="btn">
          Following:
          ${following||0}
        </span>

      </div>


      <div
        class="wrap"
        style="margin-top:10px">

        ${
          isOwn
          ?
          `

            <button
              class="btn"
              onclick="editProfile()">
              Edit profile
            </button>

            <button
              class="btn"
              onclick="openAvatarPicker()">
              Change avatar
            </button>

            <button
              class="btn"
              onclick="openAssistant()">
              AI Assistant
            </button>

            <button
              class="btn danger"
              onclick="deleteAccount()">
              Delete account
            </button>

            <button
              class="btn"
              onclick="logout()">
              Log out
            </button>

          `
          :
          `

            <button
              class="btn"
              onclick="toggleFollow('${id}')">
              Follow / Unfollow
            </button>

            <button
              class="btn"
              onclick="toggleBlock('${id}')">
              Block / Unblock
            </button>

          `
        }

      </div>

    </section>
  `;
}


/* =========================
   EDIT PROFILE
========================= */

async function editProfile(){

  const {
    data:p
  } = await sb
    .from("profiles")
    .select("*")
    .eq("id",user.id)
    .maybeSingle();


  $("sheet").innerHTML = `

    <div class="row">

      <b>
        Edit profile
      </b>

      <span class="spacer"></span>

      <button
        class="iconbtn"
        onclick="closeModal()">
        ×
      </button>

    </div>


    <input
      id="editDisplayName"
      class="field"
      value="${esc(
        p?.display_name||""
      )}"
      placeholder="Display name">


    <input
      id="editUsername"
      class="field"
      value="${esc(
        p?.username||""
      )}"
      placeholder="Username">


    <textarea
      id="editBio"
      class="field"
      maxlength="300"
      placeholder="Bio">${esc(
        p?.bio||""
      )}</textarea>


    <button
      class="btn primary"
      onclick="saveProfile()">
      Save profile
    </button>
  `;


  $("modal")
    .classList.remove("hidden");
}


async function saveProfile(){

  const display_name =
    $("editDisplayName")
      ?.value.trim();

  const username =
    $("editUsername")
      ?.value.trim();

  const bio =
    $("editBio")
      ?.value.trim();


  if(!username){

    return toast(
      "Username cannot be empty."
    );
  }


  const {
    error
  } = await sb
    .from("profiles")
    .update({
      display_name,
      username,
      bio
    })
    .eq("id",user.id);


  if(error){

    return toast(
      error.message
    );
  }


  await loadProfile();

  closeModal();

  toast(
    "Profile updated."
  );

  renderProfile(
    user.id
  );
}


/* =========================
   BLOCKING
========================= */

async function toggleBlock(id){

  const {
    data
  } = await sb
    .from("blocks")
    .select("id")
    .eq(
      "blocker_id",
      user.id
    )
    .eq(
      "blocked_id",
      id
    )
    .maybeSingle();


  if(data){

    await sb
      .from("blocks")
      .delete()
      .eq("id",data.id);

    toast(
      "User unblocked."
    );

  }else{

    const {
      error
    } = await sb
      .from("blocks")
      .insert({

        blocker_id:user.id,
        blocked_id:id

      });


    if(error){

      return toast(
        error.message
      );
    }

    toast(
      "User blocked."
    );
  }


  await renderView(
    currentView
  );
}


/* =========================
   AVATARS
========================= */

function openAvatarPicker(){

  selectedAvatar=null;
  uploadedAvatarFile=null;


  $("sheet").innerHTML = `

    <div class="row">

      <b>
        Choose your avatar
      </b>

      <span class="spacer"></span>

      <button
        class="iconbtn"
        onclick="closeModal()">
        ×
      </button>

    </div>


    <div class="panel">

      <b>
        Upload your own photo
      </b>

      <input
        id="avatarUpload"
        class="field"
        type="file"
        accept="image/*"
        onchange="previewAvatarUpload()">

      <div
        id="avatarUploadPreview"
        class="muted"
        style="margin-top:8px">

        You can use your own photo
        as your Vidora avatar.

      </div>

    </div>


    <div class="wrap">

      <button
        class="btn"
        onclick="filterAvatars('All')">
        All
      </button>

      <button
        class="btn"
        onclick="filterAvatars('Original')">
        Original
      </button>

      <button
        class="btn"
        onclick="filterAvatars('New')">
        New
      </button>

      <button
        class="btn"
        onclick="filterAvatars('Expanded')">
        Expanded
      </button>

    </div>


    <input
      id="avatarSearch"
      class="field"
      placeholder="Search avatars..."
      oninput="filterAvatars('search')">


    <div
      id="avatarGrid"
      class="avatar-grid">
    </div>


    <button
      class="btn primary"
      onclick="saveAvatar()">

      Save avatar

    </button>
  `;


  renderAvatarGrid(
    AVATARS
  );


  $("modal")
    .classList.remove("hidden");
}


function renderAvatarGrid(list){

  const grid =
    $("avatarGrid");

  if(!grid)return;


  grid.innerHTML =
    list.map(a=>`

      <button
        class="avatar-choice"
        onclick="selectAvatar('${esc(a.name)}')">

        <img
          src="${esc(a.file)}"
          onerror="this.src='${fallbackAvatar(a.name)}'">

        <span>
          ${esc(a.name)}
        </span>

      </button>

    `)
    .join("");
}


function filterAvatars(category){

  let list =
    AVATARS;


  if(
    category!=="All" &&
    category!=="search"
  ){

    list =
      list.filter(
        a=>a.cat===category
      );
  }


  const search =
    $("avatarSearch")
      ?.value
      .trim()
      .toLowerCase();


  if(search){

    list =
      list.filter(
        a=>
          a.name
            .toLowerCase()
            .includes(search)
      );
  }


  renderAvatarGrid(
    list
  );
}


function selectAvatar(name){

  selectedAvatar =
    AVATARS.find(
      a=>a.name===name
    ) || null;

  uploadedAvatarFile=null;


  document
    .querySelectorAll(
      ".avatar-choice"
    )
    .forEach(btn=>{

      btn.classList.toggle(
        "selected",
        btn.textContent
          .trim()
          .startsWith(name)
      );

    });


  toast(
    selectedAvatar
    ?
    `${selectedAvatar.name} selected. Tap Save avatar.`
    :
    "Avatar not found."
  );
}


function previewAvatarUpload(){

  const file =
    $("avatarUpload")
      ?.files[0];


  if(!file)return;


  if(
    !file.type.startsWith("image/")
  ){

    return toast(
      "Choose an image."
    );
  }


  if(
    file.size>8*1024*1024
  ){

    return toast(
      "Avatar photo must be 8MB or less."
    );
  }


  selectedAvatar=null;

  uploadedAvatarFile=file;


  const url =
    URL.createObjectURL(file);


  const preview =
    $("avatarUploadPreview");


  if(preview){

    preview.innerHTML = `

      <img
        class="avatar lg"
        src="${url}"
        alt="Avatar preview">

    `;
  }


  toast(
    "Photo selected. Tap Save avatar."
  );
}


async function saveAvatar(){

  try{

    let url=null;


    if(uploadedAvatarFile){

      url =
        await uploadMedia(
          uploadedAvatarFile,
          "avatars"
        );

    }else if(selectedAvatar){

      url =
        selectedAvatar.file;

    }else{

      return toast(
        "Choose an avatar or photo."
      );
    }


    const {
      error
    } = await sb
      .from("profiles")
      .update({
        avatar_url:url
      })
      .eq(
        "id",
        user.id
      );


    if(error)throw error;


    await loadProfile();

    closeModal();

    toast(
      "Avatar saved!"
    );

    renderProfile(
      user.id
    );

  }catch(e){

    toast(
      e.message
    );
  }
}


/* =========================
   MESSAGES
========================= */

async function renderMessages(){

  const {
    data:follows
  } = await sb
    .from("follows")
    .select("following_id")
    .eq(
      "follower_id",
      user.id
    );


  const ids =
    (follows||[])
      .map(
        x=>x.following_id
      );


  let users=[];


  if(ids.length){

    const {
      data
    } = await sb
      .from("profiles")
      .select(
        "id,username,display_name,avatar_url"
      )
      .in("id",ids);

    users =
      data||[];
  }


  const blocked =
    await blockedIds();


  users =
    users.filter(
      x=>!blocked.has(x.id)
    );


  $("main").innerHTML = `

    <section class="panel">

      <div class="title">
        Messages
      </div>

      <div class="muted">
        Chat is available with accounts
        you follow.
      </div>

    </section>


    ${
      users.map(p=>`

        <button
          class="card row"
          style="
            width:100%;
            text-align:left;
            color:inherit;
          "
          onclick="openChat('${p.id}')">

          <img
            class="avatar"
            src="${avatarSrc(
              p.avatar_url
            )}">

          <div>

            <b>
              ${esc(
                p.display_name ||
                p.username
              )}
            </b>

            <div class="muted">
              @${esc(p.username)}
            </div>

          </div>

        </button>

      `)
      .join("")

      ||

      `
        <div class="panel muted">
          Follow someone to start a chat.
        </div>
      `
    }
  `;
}


async function openChat(id){

  chatUser=id;


  const {
    data:p
  } = await sb
    .from("profiles")
    .select("*")
    .eq("id",id)
    .single();


  if(!p){

    return toast(
      "User not found."
    );
  }


  const {
    data:msgs,
    error
  } = await sb
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`
    )
    .order(
      "created_at",
      {ascending:true}
    )
    .limit(100);


  if(error){

    return toast(
      error.message
    );
  }


  $("sheet").innerHTML = `

    <div class="row">

      <img
        class="avatar sm"
        src="${avatarSrc(
          p.avatar_url
        )}">

      <b>
        ${esc(
          p.display_name ||
          p.username
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
      id="chatList"
      class="chat-list">

      ${
        (msgs||[])
          .map(messageHtml)
          .join("")
      }

    </div>


    <div class="row">

      <input
        id="chatInput"
        class="field"
        placeholder="Message...">

      <button
        class="btn"
        onclick="sendMessage()">
        Send
      </button>

      <button
        class="btn"
        onclick="recordVoice()">
        🎙
      </button>

    </div>


    <div
      id="voiceStatus"
      class="muted">
    </div>
  `;


  $("modal")
    .classList.remove("hidden");


  const chatList =
    $("chatList");


  if(chatList){

    chatList.scrollTop =
      chatList.scrollHeight;
  }
}


function messageHtml(m){

  return `

    <div
      class="msg ${
        m.sender_id===user.id
        ?
        "mine"
        :
        ""
      }">

      ${
        m.voice_url
        ?
        `
          🎙

          <audio
            controls
            src="${esc(
              m.voice_url
            )}">
          </audio>
        `
        :
        esc(
          m.content||""
        )
      }

    </div>
  `;
}


async function sendMessage(){

  const content =
    $("chatInput")
      ?.value.trim();


  if(
    !content ||
    !chatUser
  ){
    return;
  }


  const {
    error
  } = await sb
    .from("messages")
    .insert({

      sender_id:user.id,
      receiver_id:chatUser,
      content

    });


  if(error){

    return toast(
      error.message
    );
  }


  await sb
    .from("notifications")
    .insert({

      user_id:chatUser,
      actor_id:user.id,
      type:"message"

    });


  $("chatInput").value="";


  openChat(
    chatUser
  );
}


async function recordVoice(){

  if(
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ){

    return toast(
      "Voice recording is not supported here."
    );
  }


  if(
    window._voiceRec &&
    window._voiceRec.state==="recording"
  ){

    window._voiceRec.stop();

    const status =
      $("voiceStatus");

    if(status){

      status.textContent =
        "Uploading voice note...";
    }

    return;
  }


  try{

    const stream =
      await navigator.mediaDevices
        .getUserMedia({
          audio:true
        });


    const rec =
      new MediaRecorder(
        stream
      );


    const chunks=[];


    rec.ondataavailable =
      e=>{

        if(e.data.size){

          chunks.push(
            e.data
          );
        }
      };


    rec.onstop =
      async()=>{

        stream
          .getTracks()
          .forEach(
            t=>t.stop()
          );


        const blob =
          new Blob(
            chunks,
            {
              type:
                rec.mimeType ||
                "audio/webm"
            }
          );


        const file =
          new File(
            [blob],
            "voice.webm",
            {
              type:blob.type
            }
          );


        try{

          const url =
            await uploadMedia(
              file,
              "voice"
            );


          const {
            error
          } = await sb
            .from("messages")
            .insert({

              sender_id:user.id,
              receiver_id:chatUser,
              voice_url:url

            });


          if(error)throw error;


          await sb
            .from("notifications")
            .insert({

              user_id:chatUser,
              actor_id:user.id,
              type:"message"

            });


          openChat(
            chatUser
          );

        }catch(e){

          toast(
            e.message
          );
        }


        window._voiceRec=null;
      };


    window._voiceRec=rec;

    rec.start();


    const status =
      $("voiceStatus");


    if(status){

      status.textContent =
        "Recording... tap 🎙 again to stop.";
    }

  }catch(e){

    toast(
      e.message
    );
  }
}


/* =========================
   NOTIFICATIONS
========================= */

async function loadNotifications(){

  if(!user)return;


  const {
    count
  } = await sb
    .from("notifications")
    .select("*",{
      count:"exact",
      head:true
    })
    .eq(
      "user_id",
      user.id
    )
    .eq(
      "read",
      false
    );


  const el =
    $("notifCount");


  if(el){

    el.textContent =
      count
      ?
      `(${count})`
      :
      "";
  }
}


async function showNotifications(){

  const {
    data,
    error
  } = await sb
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
    .limit(50);


  if(error){

    return toast(
      error.message
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
      (data||[])
        .map(n=>`

          <div class="panel">

            <b>
              ${esc(n.type)}
            </b>

            <div class="muted">
              ${new Date(
                n.created_at
              ).toLocaleString()}
            </div>

          </div>

        `)
        .join("")

      ||

      `
        <p class="muted">
          No notifications.
        </p>
      `
    }
  `;


  $("modal")
    .classList.remove("hidden");


  await sb
    .from("notifications")
    .update({
      read:true
    })
    .eq(
      "user_id",
      user.id
    );


  loadNotifications();
}


/* =========================
   AI ASSISTANT
========================= */

function openAssistant(){

  const box =
    $("assistantBox");


  if(!box)return;


  box.classList.remove(
    "hidden"
  );


  if(
    $("assistantMessages") &&
    !$("assistantMessages")
      .children.length
  ){

    assistantSay(
      "Hi! I'm your Vidora AI assistant. Ask me general questions, weather questions, theme commands, music questions, or questions about Vidora."
    );
  }
}


function assistantSay(text){

  const box =
    $("assistantMessages");


  if(!box)return;


  const d =
    document.createElement(
      "div"
    );


  d.className="msg";

  d.textContent=text;


  box.appendChild(d);

  box.scrollTop =
    box.scrollHeight;
}


async function assistantSend(){

  const input =
    $("assistantInput");


  const q =
    input?.value.trim();


  if(!q)return;


  input.value="";


  const messages =
    $("assistantMessages");


  if(messages){

    const d =
      document.createElement(
        "div"
      );


    d.className =
      "msg mine";

    d.textContent=q;


    messages.appendChild(d);

    messages.scrollTop =
      messages.scrollHeight;
  }


  const low =
    q.toLowerCase();


  /* THEME */

  if(low.includes("theme")){

    if(
      low.includes("light") ||
      low.includes("white")
    ){

      setTheme("light");

    }else if(
      low.includes("purple")
    ){

      setTheme("purple");

    }else{

      setTheme("dark");
    }


    assistantSay(
      "I changed the Vidora theme."
    );

    return;
  }


  /* WEATHER */

  if(low.includes("weather")){

    assistantSay(
      "I can check the weather if you allow location access."
    );


    if(!navigator.geolocation){

      assistantSay(
        "Location services are not available on this device."
      );

      return;
    }


    navigator.geolocation
      .getCurrentPosition(

        async pos=>{

          try{

            const url =
              `https://api.open-meteo.com/v1/forecast`+
              `?latitude=${pos.coords.latitude}`+
              `&longitude=${pos.coords.longitude}`+
              `&current=temperature_2m,weather_code`;


            const response =
              await fetch(url);


            if(!response.ok){

              throw new Error(
                "Weather request failed."
              );
            }


            const data =
              await response.json();


            const temp =
              data.current
                ?.temperature_2m;


            const code =
              data.current
                ?.weather_code;


            assistantSay(
              `Current temperature: ${
                temp??"unknown"
              }°C. Weather code: ${
                code??"unknown"
              }.`
            );

          }catch(e){

            assistantSay(
              "I couldn't retrieve the weather right now."
            );
          }
        },

        ()=>{
          assistantSay(
            "Location permission was not granted."
          );
        }
      );


    return;
  }


  /* MUSIC */

  if(
    low.includes("music") ||
    low.includes("song") ||
    low.includes("beat") ||
    low.includes("drill") ||
    low.includes("funk")
  ){

    assistantSay(
      "You can use the Music section when creating a post. Available tracks are loaded from Vidora's tracks table."
    );
  }


  /* GENERAL AI */

  assistantHistory.push({

    role:"user",
    content:q

  });


  try{

    const {
      data,
      error
    } =
      await sb.functions.invoke(
        "vidora-avatar",
        {
          body:{
            messages:
              assistantHistory
                .slice(-12)
          }
        }
      );


    if(error)throw error;


    const answer =
      data?.answer ||
      "I couldn't answer that right now.";


    assistantHistory.push({

      role:"assistant",
      content:answer

    });


    assistantSay(
      answer
    );

  }catch(e){

    console.error(e);


    assistantSay(
      "The AI assistant isn't connected yet. Make sure the vidora-avatar Supabase Edge Function is deployed and configured."
    );
  }
}


/* =========================
   THEMES
========================= */

function setTheme(t){

  if(t==="light"){

    document.documentElement
      .style.setProperty(
        "--bg",
        "#f4f4f7"
      );

    document.documentElement
      .style.setProperty(
        "--surface",
        "#ffffff"
      );

    document.documentElement
      .style.setProperty(
        "--surface2",
        "#eeeef4"
      );

    document.documentElement
      .style.setProperty(
        "--text",
        "#111111"
      );

    document.documentElement
      .style.setProperty(
        "--muted",
        "#666666"
      );

  }else if(t==="purple"){

    document.documentElement
      .style.setProperty(
        "--bg",
        "#0e0718"
      );

    document.documentElement
      .style.setProperty(
        "--surface",
        "#171025"
      );

    document.documentElement
      .style.setProperty(
        "--surface2",
        "#211535"
      );

    document.documentElement
      .style.setProperty(
        "--text",
        "#ffffff"
      );

    document.documentElement
      .style.setProperty(
        "--muted",
        "#b7a7c7"
      );

  }else{

    const values=[
      "#08080d",
      "#11111a",
      "#181824",
      "#ffffff",
      "#9b9baa"
    ];


    [
      "--bg",
      "--surface",
      "--surface2",
      "--text",
      "--muted"
    ].forEach(
      (key,i)=>{

        document.documentElement
          .style.setProperty(
            key,
            values[i]
          );
      }
    );
  }


  localStorage.setItem(
    "vidoraTheme",
    t
  );
}


/* Restore theme */

const savedTheme =
  localStorage.getItem(
    "vidoraTheme"
  );


if(savedTheme){

  setTheme(
    savedTheme
  );
}


/* =========================
   ACCOUNT
========================= */

async function logout(){

  await sb.auth.signOut();
}


async function deleteAccount(){

  if(
    !confirm(
      "Delete your Vidora account? This cannot be undone."
    )
  ){

    return;
  }


  try{

    const {
      data,
      error
    } =
      await sb.functions.invoke(
        "delete-account"
      );


    if(error){

      return toast(
        error.message
      );
    }


    await sb.auth.signOut();


    toast(
      data?.message ||
      "Account deleted."
    );

  }catch(e){

    toast(
      e.message
    );
  }
}


/* =========================
   MODAL
========================= */

function closeModal(){

  $("modal")
    ?.classList.add(
      "hidden"
    );
}


/* =========================
   REALTIME
========================= */

function subscribeRealtime(){

  if(realtimeChannel){

    try{

      sb.removeChannel(
        realtimeChannel
      );

    }catch(e){}
  }


  realtimeChannel =
    sb.channel(
      "vidora-live-"+user.id
    );


  realtimeChannel

    .on(
      "postgres_changes",
      {
        event:"*",
        schema:"public",
        table:"notifications",
        filter:
          `user_id=eq.${user.id}`
      },
      ()=>{
        loadNotifications();
      }
    )

    .on(
      "postgres_changes",
      {
        event:"*",
        schema:"public",
        table:"messages",
        filter:
          `receiver_id=eq.${user.id}`
      },
      ()=>{

        if(
          chatUser &&
          $("modal") &&
          !$("modal")
            .classList
            .contains("hidden")
        ){

          openChat(
            chatUser
          );
        }
      }
    )

    .subscribe();
}


/* =========================
   GLOBAL FUNCTIONS
========================= */

window.openAvatarPicker =
  openAvatarPicker;

window.filterAvatars =
  filterAvatars;

window.selectAvatar =
  selectAvatar;

window.previewAvatarUpload =
  previewAvatarUpload;

window.saveAvatar =
  saveAvatar;

window.renderProfile =
  renderProfile;

window.toggleFollow =
  toggleFollow;

window.toggleBlock =
  toggleBlock;

window.editProfile =
  editProfile;

window.saveProfile =
  saveProfile;

window.logout =
  logout;

window.deleteAccount =
  deleteAccount;

window.publishPost =
  publishPost;

window.publishStory =
  publishStory;

window.selectMusic =
  selectMusic;

window.deletePost =
  deletePost;

window.deleteStory =
  deleteStory;

window.toggleLike =
  toggleLike;

window.openComments =
  openComments;

window.addComment =
  addComment;

window.deleteComment =
  deleteComment;

window.sharePost =
  sharePost;

window.closeModal =
  closeModal;

window.openStoryUser =
  openStoryUser;

window.storyMove =
  storyMove;

window.openChat =
  openChat;

window.sendMessage =
  sendMessage;

window.recordVoice =
  recordVoice;

window.openAssistant =
  openAssistant;

window.setTheme =
  setTheme;

window.searchUsers =
  searchUsers;


/* =========================
   DOM EVENTS
========================= */

document.addEventListener(
  "DOMContentLoaded",
  ()=>{

    /* LOGIN */

    const loginBtn =
      $("loginBtn");


    if(loginBtn){

      loginBtn.onclick =
        login;
    }


    /* SIGNUP */

    const signupBtn =
      $("signupBtn");


    if(signupBtn){

      signupBtn.onclick =
        signup;
    }


    /* AUTH SWITCH */

    const showSignup =
      $("showSignupBtn");


    if(showSignup){

      showSignup.onclick =
        ()=>{

          $("loginForm")
            ?.classList.add(
              "hidden"
            );

          $("signupForm")
            ?.classList.remove(
              "hidden"
            );

          $("authStatus")
            .textContent="";
        };
    }


    const showLogin =
      $("showLoginBtn");


    if(showLogin){

      showLogin.onclick =
        ()=>{

          $("signupForm")
            ?.classList.add(
              "hidden"
            );

          $("loginForm")
            ?.classList.remove(
              "hidden"
            );

          $("authStatus")
            .textContent="";
        };
    }


    /* NAV */

    document
      .querySelectorAll(
        ".nav button"
      )
      .forEach(button=>{

        button.onclick =
          ()=>{

            renderView(
              button.dataset.view
            );
          };
      });


    /* NOTIFICATIONS */

    const notifications =
      $("openNotificationsBtn");


    if(notifications){

      notifications.onclick =
        showNotifications;
    }


    /* AVATAR */

    const avatarBtn =
      $("openAvatarBtn");


    if(avatarBtn){

      avatarBtn.onclick =
        openAvatarPicker;
    }


    /* AI */

    const assistantFab =
      $("assistantFab");


    if(assistantFab){

      assistantFab.onclick =
        openAssistant;
    }


    const closeAssistant =
      $("closeAssistant");


    if(closeAssistant){

      closeAssistant.onclick =
        ()=>{

          $("assistantBox")
            ?.classList.add(
              "hidden"
            );
        };
    }


    const assistantSendBtn =
      $("assistantSend");


    if(assistantSendBtn){

      assistantSendBtn.onclick =
        assistantSend;
    }


    const assistantInput =
      $("assistantInput");


    if(assistantInput){

      assistantInput.addEventListener(
        "keydown",
        e=>{

          if(e.key==="Enter"){

            e.preventDefault();

            assistantSend();
          }
        }
      );
    }


    /* MODAL */

    const modal =
      $("modal");


    if(modal){

      modal.addEventListener(
        "click",
        e=>{

          if(
            e.target===modal
          ){

            closeModal();
          }
        }
      );
    }


    /* START */

    init();

  }
);
