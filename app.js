const STORAGE_KEY = "revision-kb-data-v1";
const FIXED_SECTIONS = [
  { id: "coding", name: "Coding" },
  { id: "hld", name: "HLD" },
  { id: "lld", name: "LLD" }
];

marked.setOptions({ gfm: true, breaks: true });

const state = {
  data: loadData(),
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

render();

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { subSections: [] };
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.subSections)) {
      return { subSections: [] };
    }
    return parsed;
  } catch {
    return { subSections: [] };
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function subSectionsBySection(sectionId) {
  return state.data.subSections
    .filter((sub) => sub.sectionId === sectionId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function findSubSection(id) {
  return state.data.subSections.find((sub) => sub.id === id) ?? null;
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
  refreshPreview();
  renderPanels();
  titleInput.focus();
}

function closeEditor() {
  state.editor = { mode: null, sectionId: null, subSectionId: null };
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

markdownInput.addEventListener("input", refreshPreview);

fileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;

  const text = await file.text();
  markdownInput.value = text;
  refreshPreview();
});

editorForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const markdown = markdownInput.value;

  if (!title || !markdown.trim()) {
    return;
  }

  const now = new Date().toISOString();

  if (state.editor.mode === "create") {
    const subSection = {
      id: crypto.randomUUID(),
      sectionId: state.editor.sectionId,
      title,
      markdown,
      createdAt: now,
      updatedAt: now
    };
    state.data.subSections.push(subSection);
    state.selectedSubSectionId = subSection.id;
  } else if (state.editor.mode === "edit") {
    const sub = findSubSection(state.editor.subSectionId);
    if (!sub) return;
    sub.title = title;
    sub.markdown = markdown;
    sub.updatedAt = now;
    state.selectedSubSectionId = sub.id;
  }

  saveData();
  closeEditor();
  render();
});
