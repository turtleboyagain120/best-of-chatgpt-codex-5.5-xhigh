const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
const modeButtons = [...document.querySelectorAll(".mode-button")];
const previewTitle = document.querySelector("#preview-title");
const previewBadge = document.querySelector("#preview-badge");
const mockContent = document.querySelector("#mock-content");
const simulateButton = document.querySelector("#simulate-button");
const ideaInput = document.querySelector("#idea-input");
const promptButtons = [...document.querySelectorAll(".prompt-chip-row button")];
const timelineSteps = [...document.querySelectorAll(".builder-timeline span")];

const modes = {
  website: {
    title: "Neon Website System",
    badge: "Website",
    placeholder: `
      <div class="mock-hero-line"></div>
      <div class="mock-copy-line"></div>
      <div class="mock-card-row">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `,
  },
  chat: {
    title: "Memory Chat Prototype",
    badge: "Chat",
    placeholder: `
      <div class="chat-stack">
        <div class="chat-bubble"></div>
        <div class="chat-bubble"></div>
        <div class="chat-bubble"></div>
      </div>
    `,
  },
  agent: {
    title: "Experimental Agent Map",
    badge: "Agent",
    placeholder: `
      <div class="agent-map">
        <div class="agent-node">Planner Core</div>
        <div class="agent-node">Memory Loop</div>
        <div class="agent-node">Tool Route</div>
        <div class="agent-node">Export Step</div>
      </div>
    `,
  },
};

let activeMode = "website";

function setTimeline(index) {
  timelineSteps.forEach((step, stepIndex) => {
    step.classList.toggle("active", stepIndex <= index);
  });
}

function setMode(mode) {
  activeMode = mode;
  const data = modes[mode];

  previewTitle.textContent = data.title;
  previewBadge.textContent = data.badge;
  mockContent.style.opacity = "0";

  window.setTimeout(() => {
    mockContent.innerHTML = data.placeholder;
    mockContent.style.opacity = "1";
  }, 140);

  modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === mode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  setTimeline(1);
}

function simulateIdea() {
  const idea = ideaInput.value.trim();
  const suffix = idea ? `: ${idea.slice(0, 44)}${idea.length > 44 ? "..." : ""}` : "";
  previewTitle.textContent = `${modes[activeMode].title}${suffix}`;
  setTimeline(3);
  mockContent.animate(
    [
      { transform: "translateY(0)", opacity: 1 },
      { transform: "translateY(-4px)", opacity: 0.8 },
      { transform: "translateY(0)", opacity: 1 },
    ],
    { duration: 280, easing: "ease-out" }
  );
}

navToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

navLinks.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    navLinks.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

promptButtons.forEach((button) => {
  button.addEventListener("click", () => {
    ideaInput.value = button.dataset.prompt;
    ideaInput.focus();
    simulateIdea();
  });
});

simulateButton.addEventListener("click", simulateIdea);
ideaInput.addEventListener("input", () => {
  window.clearTimeout(ideaInput.updateTimer);
  setTimeline(0);
  ideaInput.updateTimer = window.setTimeout(simulateIdea, 280);
});
