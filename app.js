const FIXED_SECTIONS = [
  { id: "coding", name: "Coding" },
  { id: "hld", name: "HLD" },
  { id: "lld", name: "LLD" }
];

marked.setOptions({ gfm: true, breaks: true });

const state = {
  data: { subSections: [] },
  selectedSubSectionId: null,
  editor: {
    mode: null,
    sectionId: null,
    subSectionId: null
  }
};

const sectionTree = document.getElementById("sectionTree");
const emptyState = document.getElementById("emptyState");
const viewer = document.getElementById("viewer");
const editor = document.getElementById("editor");
const currentPath = document.getElementById("currentPath");
const currentTitle = document.getElementById("currentTitle");
const renderedMarkdown = document.getElementById("renderedMarkdown");
const editBtn = document.getElementById("editBtn");
const editorHeading = document.getElementById("editorHeading");
const editorForm = document.getElementById("editorForm");
const titleInput = document.getElementById("titleInput");
const fileInput = document.getElementById("fileInput");
const markdownInput = document.getElementById("markdownInput");
const previewMarkdown = document.getElementById("previewMarkdown");
const cancelBtn = document.getElementById("cancelBtn");
const sectionTemplate = document.getElementById("sectionTemplate");
const formMessage = document.getElementById("formMessage");

init();

async function init() {
  await loadData();
  render();
}

async function loadData() {
  try {
    const response = await fetch("/api/subsections");
    if (!response.ok) {
      throw new Error("Unable to load data.");
    }

    const subSections = await response.json();
    state.data = { subSections: Array.isArray(subSections) ? subSections : [] };
  } catch {
    setFormMessage("Unable to connect to storage API. Start server with npm start.");
  }
}

function subSectionsBySection(sectionId) {
  return state.data.subSections
    .filter((sub) => sub.sectionId === sectionId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function findSubSection(id) {
  return state.data.subSections.find((sub) => sub.id === id) ?? null;
}

function setFormMessage(message = "", isSuccess = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle("success", Boolean(message) && isSuccess);
}

function render() {
  renderSidebar();
  renderPanels();
}

function renderSidebar() {
  sectionTree.innerHTML = "";

  FIXED_SECTIONS.forEach((section) => {
    const fragment = sectionTemplate.content.cloneNode(true);
    const sectionEl = fragment.querySelector(".section-block");
    const sectionTitle = fragment.querySelector("h3");
    const addBtn = fragment.querySelector(".small");
    const list = fragment.querySelector(".subsection-list");

    sectionTitle.textContent = section.name;

    addBtn.addEventListener("click", () => {
      openCreateEditor(section.id);
    });

    const subSections = subSectionsBySection(section.id);

    if (subSections.length === 0) {
      const li = document.createElement("li");
      li.textContent = "No sub-sections yet";
      li.style.color = "#6b7280";
      li.style.padding = "0.35rem";
      list.appendChild(li);
    } else {
      subSections.forEach((sub) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = sub.title;
        if (state.selectedSubSectionId === sub.id) {
          btn.classList.add("active");
        }
        btn.addEventListener("click", () => {
          state.selectedSubSectionId = sub.id;
          closeEditor();
          render();
        });

        li.appendChild(btn);
        list.appendChild(li);
      });
    }

    sectionTree.appendChild(sectionEl);
  });
}

function renderPanels() {
  const sub = findSubSection(state.selectedSubSectionId);

  if (!sub && state.editor.mode !== "create") {
    emptyState.classList.remove("hidden");
    viewer.classList.add("hidden");
  } else if (sub) {
    emptyState.classList.add("hidden");
    viewer.classList.remove("hidden");

    const section = FIXED_SECTIONS.find((s) => s.id === sub.sectionId);
    currentPath.textContent = `${section?.name ?? "Unknown"} / Sub-section`;
    currentTitle.textContent = sub.title;
    renderedMarkdown.innerHTML = marked.parse(sub.markdown || "");
  }

  if (state.editor.mode) {
    editor.classList.remove("hidden");
    viewer.classList.add("hidden");
    emptyState.classList.add("hidden");
  } else {
    editor.classList.add("hidden");
  }
}

function openCreateEditor(sectionId) {
  state.editor = {
    mode: "create",
    sectionId,
    subSectionId: null
  };

  const section = FIXED_SECTIONS.find((s) => s.id === sectionId);
  editorHeading.textContent = `Create Sub-section (${section?.name ?? "Section"})`;
  titleInput.value = "";
  markdownInput.value = "";
  fileInput.value = "";
  setFormMessage();
  refreshPreview();
  renderPanels();
  titleInput.focus();
}

function openEditEditor(subSectionId) {
  const sub = findSubSection(subSectionId);
  if (!sub) return;

  state.editor = {
    mode: "edit",
    sectionId: sub.sectionId,
    subSectionId: sub.id
  };

  editorHeading.textContent = `Edit Sub-section (${sub.title})`;
  titleInput.value = sub.title;
  markdownInput.value = sub.markdown;
  fileInput.value = "";
  setFormMessage();
  refreshPreview();
  renderPanels();
  titleInput.focus();
}

function closeEditor() {
  state.editor = { mode: null, sectionId: null, subSectionId: null };
  setFormMessage();
  renderPanels();
}

function refreshPreview() {
  previewMarkdown.innerHTML = marked.parse(markdownInput.value || "");
}

editBtn.addEventListener("click", () => {
  if (state.selectedSubSectionId) {
    openEditEditor(state.selectedSubSectionId);
  }
});

cancelBtn.addEventListener("click", () => {
  closeEditor();
});

markdownInput.addEventListener("input", () => {
  if (formMessage.textContent) {
    setFormMessage();
  }
  refreshPreview();
});

titleInput.addEventListener("input", () => {
  if (formMessage.textContent) {
    setFormMessage();
  }
});

fileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;

  const text = await file.text();
  markdownInput.value = text;
  setFormMessage();
  refreshPreview();
});

editorForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const markdown = markdownInput.value;

  if (!title) {
    setFormMessage("Title is required.");
    titleInput.focus();
    return;
  }

  if (!markdown.trim()) {
    setFormMessage("Markdown content is required.");
    markdownInput.focus();
    return;
  }

  try {
    if (state.editor.mode === "create") {
      const response = await fetch("/api/subsections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: state.editor.sectionId,
          title,
          markdown
        })
      });

      if (!response.ok) {
        throw new Error("Failed to save new sub-section.");
      }

      const created = await response.json();
      state.data.subSections.push(created);
      state.selectedSubSectionId = created.id;
    } else if (state.editor.mode === "edit") {
      const response = await fetch(`/api/subsections/${state.editor.subSectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, markdown })
      });

      if (!response.ok) {
        throw new Error("Failed to update sub-section.");
      }

      const updated = await response.json();
      const idx = state.data.subSections.findIndex((sub) => sub.id === updated.id);
      if (idx !== -1) {
        state.data.subSections[idx] = updated;
      }
      state.selectedSubSectionId = updated.id;
    }

    closeEditor();
    render();
  } catch (error) {
    setFormMessage(error.message || "Save failed.");
  }
});
