/* VIDORA TALKING AVATAR
   Local speech prototype — no API key required.
   Keeps the existing ten avatar names.
*/
(() => {
  "use strict";

  const AVATARS = [
    "Nova", "Kai", "Luna", "Ivy", "Orion",
    "Zeno", "Sage", "Rex", "Pixel", "Vexa"
  ];

  const $ = (id) => document.getElementById(id);

  function mountTalkingAvatar() {
    if ($("vidoraTalkingAvatar")) return;

    const panel = document.createElement("section");
    panel.id = "vidoraTalkingAvatar";
    panel.className = "vidora-talking-avatar";

    panel.innerHTML = `
      <h3>✨ Create your talking avatar</h3>
      <p>Choose an existing Vidora avatar and make it speak.</p>

      <div class="vidora-avatar-preview" id="vidoraAvatarPreview">
        N
      </div>

      <label for="vidoraAvatarChoice">Choose your avatar</label>
      <select id="vidoraAvatarChoice">
        ${AVATARS.map(name =>
          `<option value="${name}">${name}</option>`
        ).join("")}
      </select>

      <label for="vidoraAvatarMessage">What should it say?</label>
      <textarea
        id="vidoraAvatarMessage"
        maxlength="500"
        rows="3"
        placeholder="Hello! Welcome to Vidora."
      ></textarea>

      <label for="vidoraAvatarVoice">Voice preference</label>
      <select id="vidoraAvatarVoice">
        <option value="default">Default voice</option>
        <option value="female">Female-sounding voice</option>
        <option value="male">Male-sounding voice</option>
      </select>

      <div class="vidora-avatar-buttons">
        <button type="button" id="vidoraAvatarSpeak">▶ Speak</button>
        <button type="button" id="vidoraAvatarStop">■ Stop</button>
      </div>

      <p id="vidoraAvatarStatus" aria-live="polite">
        Your avatar is ready.
      </p>
    `;

    // Attach to the existing assistant panel if available.
    // Otherwise, keep it hidden until the user opens the assistant.
    const assistant = $("assistantBox");

    if (assistant) {
      const messages = $("assistantMessages");
      if (messages) {
        messages.insertAdjacentElement("afterend", panel);
      } else {
        assistant.appendChild(panel);
      }
    } else {
      document.body.appendChild(panel);
    }

    const saved = localStorage.getItem("vidoraPremiumAvatar");
    const initial = AVATARS.includes(saved) ? saved : "Nova";

    $("vidoraAvatarChoice").value = initial;
    updatePreview(initial);

    $("vidoraAvatarChoice").addEventListener("change", (event) => {
      const name = event.target.value;
      updatePreview(name);

      // Preserve the existing Vidora avatar preference key.
      localStorage.setItem("vidoraPremiumAvatar", name);
    });

    $("vidoraAvatarSpeak").addEventListener("click", speak);
    $("vidoraAvatarStop").addEventListener("click", stop);
  }

  function updatePreview(name) {
    const preview = $("vidoraAvatarPreview");
    if (!preview) return;

    preview.textContent = name.charAt(0);
    preview.setAttribute("aria-label", name + " avatar");
    preview.dataset.avatar = name;
  }

  function speak() {
    const message = $("vidoraAvatarMessage").value.trim();
    const status = $("vidoraAvatarStatus");

    if (!message) {
      status.textContent = "Type a message first.";
      return;
    }

    if (!("speechSynthesis" in window)) {
      status.textContent =
        "Speech is unavailable in this browser. Try Chrome.";
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    const preference = $("vidoraAvatarVoice").value;
    const voices = window.speechSynthesis.getVoices();

    if (preference !== "default") {
      const patterns = preference === "female"
        ? /female|woman|jenny|aria|samantha/i
        : /male|man|david|guy|mark/i;

      const voice = voices.find(v =>
        /^en/i.test(v.lang) && patterns.test(v.name)
      );

      if (voice) utterance.voice = voice;
    }

    const preview = $("vidoraAvatarPreview");
    const button = $("vidoraAvatarSpeak");

    utterance.onstart = () => {
      status.textContent =
        $("vidoraAvatarChoice").value + " is speaking…";
      preview.classList.add("is-speaking");
      button.disabled = true;
    };

    utterance.onend = () => {
      preview.classList.remove("is-speaking");
      button.disabled = false;
      status.textContent = "Finished speaking.";
    };

    utterance.onerror = () => {
      preview.classList.remove("is-speaking");
      button.disabled = false;
      status.textContent = "Could not play speech. Try again.";
    };

    window.speechSynthesis.speak(utterance);
  }

  function stop() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const preview = $("vidoraAvatarPreview");
    const button = $("vidoraAvatarSpeak");

    if (preview) preview.classList.remove("is-speaking");
    if (button) button.disabled = false;

    const status = $("vidoraAvatarStatus");
    if (status) status.textContent = "Speech stopped.";
  }

  // Wait until the page is ready.
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      mountTalkingAvatar,
      { once: true }
    );
  } else {
    mountTalkingAvatar();
  }
})();
