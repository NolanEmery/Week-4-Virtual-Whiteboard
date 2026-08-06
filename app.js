// ===== State =====
let ideas = [];
let currentEditId = null;
let nextId = 1;

// ===== AI Category Classifier (keyword-based simulation) =====
const CATEGORY_RULES = [
  { category: "UI / UX Design", keywords: ["ui", "ux", "design", "layout", "theme", "color", "font", "icon", "animation", "responsive", "dark mode", "light mode", "accessibility", "a11y", "wireframe", "mockup", "prototype", "component", "style"] },
  { category: "Backend", keywords: ["api", "backend", "server", "database", "db", "sql", "nosql", "rest", "graphql", "microservice", "cache", "redis", "queue", "worker", "cron", "migration", "schema", "orm", "endpoint"] },
  { category: "Frontend", keywords: ["frontend", "react", "vue", "angular", "svelte", "component", "state", "hook", "routing", "form", "validation", "input", "button", "modal", "dropdown", "table", "list", "grid", "chart"] },
  { category: "DevOps & Infra", keywords: ["deploy", "ci", "cd", "docker", "kubernetes", "k8s", "aws", "azure", "gcp", "terraform", "monitoring", "logging", "pipeline", "container", "serverless", "infra", "hosting"] },
  { category: "Performance", keywords: ["performance", "speed", "optimize", "lazy", "cache", "cdn", "bundle", "minify", "compress", "load time", "latency", "throughput", "benchmark", "profiling"] },
  { category: "Security", keywords: ["security", "auth", "login", "password", "token", "jwt", "oauth", "encryption", "ssl", "https", "vulnerability", "xss", "csrf", "audit", "permission", "role", "access"] },
  { category: "Testing", keywords: ["test", "testing", "unit test", "integration", "e2e", "jest", "cypress", "playwright", "mock", "coverage", "qa", "bug", "regression", "snapshot"] },
  { category: "Analytics & Data", keywords: ["analytics", "data", "dashboard", "report", "metric", "kpi", "tracking", "event", "funnel", "cohort", "visualization", "bi", "insight"] },
  { category: "Mobile", keywords: ["mobile", "ios", "android", "react native", "flutter", "app", "push notification", "native", "pwa", "responsive"] },
  { category: "Collaboration", keywords: ["team", "collaboration", "chat", "comment", "notification", "realtime", "websocket", "share", "invite", "role", "permission", "workspace"] },
  { category: "Documentation", keywords: ["docs", "documentation", "readme", "guide", "tutorial", "wiki", "changelog", "onboarding", "faq", "knowledge base"] },
  { category: "AI / ML", keywords: ["ai", "ml", "machine learning", "model", "neural", "nlp", "gpt", "llm", "prediction", "classification", "training", "dataset", "inference", "embedding"] },
];

function classifyIdea(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (text.includes(keyword)) {
        score += keyword.length; // longer keyword matches = higher confidence
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = rule.category;
    }
  }

  return bestMatch || "General";
}

// ===== Whiteboard =====
const canvas = document.getElementById("whiteboard");
const ctx = canvas.getContext("2d");
let drawing = false;
let currentTool = "pen";
let lastX = 0, lastY = 0;

function resizeCanvas() {
  const container = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = container.clientWidth * dpr;
  canvas.height = container.clientHeight * dpr;
  ctx.scale(dpr, dpr);
  canvas.style.width = container.clientWidth + "px";
  canvas.style.height = container.clientHeight + "px";
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
  const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
  return [x, y];
}

function startDraw(e) {
  drawing = true;
  [lastX, lastY] = getPos(e);
}

function draw(e) {
  if (!drawing) return;
  e.preventDefault();
  const [x, y] = getPos(e);

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);

  if (currentTool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = 20;
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = document.getElementById("strokeColor").value;
    ctx.lineWidth = parseInt(document.getElementById("strokeWidth").value);
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  [lastX, lastY] = [x, y];
}

function stopDraw() { drawing = false; }

canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDraw);
canvas.addEventListener("mouseleave", stopDraw);
canvas.addEventListener("touchstart", (e) => { e.preventDefault(); startDraw(e); });
canvas.addEventListener("touchmove", (e) => { e.preventDefault(); draw(e); });
canvas.addEventListener("touchend", stopDraw);

// Tool buttons
document.querySelectorAll(".tool-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tool = btn.dataset.tool;
    if (tool === "clear") {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    currentTool = tool;
    document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// ===== Tabs =====
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
    if (tab.dataset.tab === "list") renderCategoryList();
  });
});

// ===== Ideas CRUD =====
function addIdea(title, description) {
  if (!title.trim()) return;

  const category = classifyIdea(title, description || "");
  const idea = {
    id: nextId++,
    title: title.trim(),
    description: (description || "").trim(),
    category,
    contributors: [],
    priority: "medium",
    createdAt: new Date().toISOString(),
  };

  ideas.unshift(idea);
  renderIdeas();
  return idea;
}

function deleteIdea(id) {
  ideas = ideas.filter(i => i.id !== id);
  renderIdeas();
}

function updateIdea(id, updates) {
  const idx = ideas.findIndex(i => i.id === id);
  if (idx !== -1) {
    ideas[idx] = { ...ideas[idx], ...updates };
    renderIdeas();
  }
}

// ===== Render Ideas Grid =====
function renderIdeas() {
  const grid = document.getElementById("ideasGrid");
  const count = document.getElementById("ideaCount");
  count.textContent = `${ideas.length} idea${ideas.length !== 1 ? "s" : ""}`;

  if (ideas.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="23" stroke="#d4d4d4" stroke-width="2" stroke-dasharray="6 4"/>
          <path d="M18 24H30M24 18V30" stroke="#a3a3a3" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <h3>No ideas yet</h3>
        <p>Add your first creative idea above to get started</p>
      </div>`;
    return;
  }

  grid.innerHTML = ideas.map(idea => `
    <div class="idea-card" draggable="true" data-id="${idea.id}">
      <div class="card-header">
        <div class="card-title">${escapeHtml(idea.title)}</div>
        <div class="priority-dot ${idea.priority}" title="${idea.priority} priority"></div>
      </div>
      ${idea.description ? `<div class="card-description">${escapeHtml(idea.description)}</div>` : ""}
      <div class="card-category">
        ${escapeHtml(idea.category)}
        <span class="ai-tag">AI</span>
      </div>
      <div class="card-contributors">
        ${idea.contributors.map(c => `
          <span class="contributor-chip">
            <span class="chip-avatar">${c.charAt(0).toUpperCase()}</span>
            ${escapeHtml(c)}
          </span>
        `).join("")}
        <span class="contributors-add" onclick="openModal(${idea.id})">+ Add</span>
      </div>
    </div>
  `).join("");

  // Click to open modal
  grid.querySelectorAll(".idea-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("contributors-add") || e.target.closest(".contributors-add")) return;
      openModal(parseInt(card.dataset.id));
    });
  });

  setupDragAndDrop();
}

// ===== Drag and Drop =====
let draggedCard = null;

function setupDragAndDrop() {
  const cards = document.querySelectorAll(".idea-card");

  cards.forEach(card => {
    card.addEventListener("dragstart", (e) => {
      draggedCard = card;
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", card.dataset.id);
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
      document.querySelectorAll(".idea-card").forEach(c => c.classList.remove("drag-over"));
      draggedCard = null;
    });

    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (card !== draggedCard) {
        card.classList.add("drag-over");
      }
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("drag-over");
    });

    card.addEventListener("drop", (e) => {
      e.preventDefault();
      card.classList.remove("drag-over");
      if (!draggedCard || card === draggedCard) return;

      const dragId = parseInt(draggedCard.dataset.id);
      const dropId = parseInt(card.dataset.id);
      const dragIdx = ideas.findIndex(i => i.id === dragId);
      const dropIdx = ideas.findIndex(i => i.id === dropId);

      if (dragIdx !== -1 && dropIdx !== -1) {
        const [moved] = ideas.splice(dragIdx, 1);
        ideas.splice(dropIdx, 0, moved);
        renderIdeas();
      }
    });
  });
}

// ===== Send Button =====
document.getElementById("sendBtn").addEventListener("click", () => {
  const titleEl = document.getElementById("ideaTitle");
  const descEl = document.getElementById("ideaDescription");
  const idea = addIdea(titleEl.value, descEl.value);
  if (idea) {
    titleEl.value = "";
    descEl.value = "";
    titleEl.focus();
  }
});

// Enter key to submit
document.getElementById("ideaTitle").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("sendBtn").click();
});

// ===== Modal =====
function openModal(id) {
  const idea = ideas.find(i => i.id === id);
  if (!idea) return;

  currentEditId = id;
  document.getElementById("modalTitle").textContent = idea.title;
  document.getElementById("modalCategory").innerHTML = `${escapeHtml(idea.category)} <span class="ai-tag" style="font-size:9px;background:#000;color:#fff;padding:1px 5px;border-radius:8px;font-weight:600;margin-left:6px;">AI</span>`;
  document.getElementById("modalDescription").textContent = idea.description || "No description provided.";
  document.getElementById("modalPriority").value = idea.priority;
  renderModalContributors(idea);

  document.getElementById("modalOverlay").classList.add("active");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("active");
  currentEditId = null;
}

function renderModalContributors(idea) {
  const container = document.getElementById("modalContributors");
  container.innerHTML = idea.contributors.map((c, i) => `
    <span class="contributor-chip" style="cursor:pointer" onclick="removeContributor(${idea.id}, ${i})" title="Click to remove">
      <span class="chip-avatar">${c.charAt(0).toUpperCase()}</span>
      ${escapeHtml(c)} &times;
    </span>
  `).join("") || '<span style="font-size:13px;color:#a3a3a3">No contributors yet</span>';
}

document.getElementById("addContributorBtn").addEventListener("click", () => {
  const input = document.getElementById("newContributor");
  const name = input.value.trim();
  if (!name || !currentEditId) return;

  const idea = ideas.find(i => i.id === currentEditId);
  if (idea) {
    idea.contributors.push(name);
    renderModalContributors(idea);
    input.value = "";
  }
});

document.getElementById("newContributor").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("addContributorBtn").click();
});

window.removeContributor = function(id, idx) {
  const idea = ideas.find(i => i.id === id);
  if (idea) {
    idea.contributors.splice(idx, 1);
    renderModalContributors(idea);
  }
};

document.getElementById("modalClose").addEventListener("click", closeModal);
document.getElementById("modalOverlay").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeModal();
});

document.getElementById("modalSave").addEventListener("click", () => {
  if (!currentEditId) return;
  updateIdea(currentEditId, {
    priority: document.getElementById("modalPriority").value,
  });
  closeModal();
});

document.getElementById("modalDelete").addEventListener("click", () => {
  if (currentEditId) {
    deleteIdea(currentEditId);
    closeModal();
  }
});

// ===== Category List (Tab 2) =====
function renderCategoryList() {
  const container = document.getElementById("categoryList");

  // Group by category
  const grouped = {};
  ideas.forEach(idea => {
    if (!grouped[idea.category]) grouped[idea.category] = [];
    grouped[idea.category].push(idea);
  });

  const sortedCategories = Object.keys(grouped).sort();

  if (sortedCategories.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="23" stroke="#d4d4d4" stroke-width="2" stroke-dasharray="6 4"/>
          <path d="M16 20H32M16 28H26" stroke="#a3a3a3" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <h3>No categorized ideas</h3>
        <p>Add ideas on the Board tab — AI will categorize them automatically</p>
      </div>`;
    return;
  }

  container.innerHTML = sortedCategories.map(cat => `
    <div class="category-section">
      <div class="category-header">
        <span class="category-name">${escapeHtml(cat)}</span>
        <span class="category-count">${grouped[cat].length}</span>
      </div>
      <div class="category-items">
        ${grouped[cat].map(idea => `
          <div class="list-item" onclick="openModal(${idea.id})">
            <div class="list-item-priority ${idea.priority}"></div>
            <div class="list-item-content">
              <div class="list-item-title">${escapeHtml(idea.title)}</div>
              <div class="list-item-desc">${escapeHtml(idea.description || "No description")}</div>
            </div>
            <div class="list-item-meta">
              <div class="list-item-contributors">
                ${idea.contributors.slice(0, 3).map(c => `
                  <span class="contributor-chip">
                    <span class="chip-avatar">${c.charAt(0).toUpperCase()}</span>
                    ${escapeHtml(c)}
                  </span>
                `).join("")}
                ${idea.contributors.length > 3 ? `<span class="contributor-chip">+${idea.contributors.length - 3}</span>` : ""}
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");
}

// ===== Utility =====
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ===== Initial render =====
renderIdeas();

// ===== Seed demo data =====
function seedDemoData() {
  const demos = [
    { title: "Dark mode toggle for dashboard", desc: "Add a theme switcher that persists user preference across sessions" },
    { title: "GraphQL API for user profiles", desc: "Replace REST endpoints with a GraphQL schema for better flexibility" },
    { title: "E2E tests for checkout flow", desc: "Write Playwright tests covering the full purchase journey" },
    { title: "Real-time collaboration cursor", desc: "Show other team members cursors on the whiteboard in real-time" },
    { title: "AI-powered code review bot", desc: "Use LLM to automatically review pull requests and suggest improvements" },
    { title: "Docker compose for local dev", desc: "Simplify local development setup with a single docker-compose file" },
  ];

  demos.forEach(d => addIdea(d.title, d.desc));

  // Add some contributors to demo ideas
  if (ideas.length >= 3) {
    ideas[0].contributors = ["Alice", "Bob"];
    ideas[1].contributors = ["Charlie"];
    ideas[2].contributors = ["Alice", "Diana", "Eve"];
  }
  renderIdeas();
}

seedDemoData();
