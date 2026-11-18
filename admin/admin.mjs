import { AdminApiClient } from "../shared/dust-wave-platform/packages/admin-shell/src/api-client.js";
import { createBlockEditor } from "../shared/dust-wave-platform/packages/admin-shell/src/block-editor.js";
import {
  captureMediaTarget,
  createMediaRemovalControl,
} from "../shared/dust-wave-platform/packages/admin-shell/src/editor-media.js";
import { mountUnsavedChangesGuard } from "../shared/dust-wave-platform/packages/admin-shell/src/unsaved-changes.js";
import { recoverDraftBaseline } from "../shared/dust-wave-platform/packages/admin-shell/src/draft-recovery.js";
import {
  editorElementToMarkdown,
  sanitizeClipboardPayload,
  isSafeEditorHref,
  RICH_TEXT_POLICY,
} from "../shared/dust-wave-platform/packages/admin-shell/src/editor-codec.js";
import {
  blockModel,
  TYPES,
  esc,
  rich,
  slugify,
  validateCatalog,
  parseVideo,
  videoUrl,
  entryPath,
  bioBlocks,
  bioPdf,
  MAX_PDF_BYTES,
  MAX_VIDEO_BYTES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_PIXELS,
  VIDEO_SIZE_MESSAGE,
  validateMp4,
} from "../lib/content.mjs";
const $ = (selector) => document.querySelector(selector),
  api = new AdminApiClient({ baseUrl: location.origin + "/api" }),
  key = "r-barela-recovery-v1";
let data,
  revision,
  publishedRevision,
  saved = "",
  currentId = null,
  view = "projects",
  composer = null,
  busy = false,
  pendingUploads = 0,
  history = [],
  selection = null,
  recovery = null;
const newIds = new Set(),
  mediaGeneration = new WeakMap();
const megabytes = (bytes) => bytes / (1024 * 1024);
const uploadHelp = {
  photo: `JPG/JPEG, PNG or WebP, up to ${megabytes(MAX_IMAGE_BYTES)} MB per image and ${MAX_IMAGE_PIXELS / 1_000_000} megapixels. Recommended: 1600–2400 pixels on the longest edge, original aspect ratio, sRGB color. WebP is a good choice for smaller files; PNG/WebP can preserve transparency. Convert HEIC, TIFF or RAW before uploading.`,
  video: `MP4 (.mp4), up to ${megabytes(MAX_VIDEO_BYTES)} MB. Recommended: 1280 × 720 (720p), original aspect ratio, 24–30 fps; H.264/AVC video (8-bit, 4:2:0) and AAC audio (96–128 kbps stereo), with fast start enabled. Convert MOV, HEVC/H.265 or ProRes before uploading. Prepare larger files separately or use a YouTube/Vimeo link. Playback starts on click and repeats; audio is preserved.`,
  pdf: `PDF (.pdf), up to ${megabytes(MAX_PDF_BYTES)} MB. Letter (8.5 × 11 in) or A4 is recommended. Export searchable text with embedded fonts and images around 150 dpi for a readable, smaller file. Save your draft, then publish to update the public download. Editing the page text does not change the PDF.`,
};
let uploadHelpId = 0;
function describeUpload(control, kind) {
  const hint = document.createElement("p");
  hint.id = `upload-help-${++uploadHelpId}`;
  hint.className = "hint";
  hint.textContent = uploadHelp[kind];
  control.setAttribute("aria-describedby", hint.id);
  control.closest("label").after(hint);
}
const clone = (value) => structuredClone(value),
  current = () => data.entries.find((e) => e.id === currentId),
  dirty = () => !!data && JSON.stringify(data) !== saved;
const guard = mountUnsavedChangesGuard({
  hasUnsavedChanges: () => dirty() || pendingUploads > 0,
});
function feedback(message, error = false) {
  $("#feedback").textContent = message;
  $("#feedback").classList.toggle("error", error);
}
function update() {
  $("#view").inert = busy;
  $(".sidebar").inert = busy;
  $("#save-state").textContent = busy
    ? "Working…"
    : pendingUploads
      ? "Uploading file…"
      : dirty()
        ? "Unsaved changes"
        : "Draft saved";
  $("#save").disabled = busy || pendingUploads > 0 || !dirty();
  $("#publish").disabled = busy || pendingUploads > 0 || !data;
  $("#preview").disabled =
    busy || pendingUploads > 0 || (!current() && view !== "profile");
  $("#project-count").textContent =
    data?.entries.filter((e) => e.kind === "project").length ?? "";
  $("#post-count").textContent =
    data?.entries.filter((e) => e.kind === "post").length ?? "";
}
function changed() {
  if (data)
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ catalog: data, revision, snapshot: saved }),
      );
    } catch {
      feedback(
        "Browser recovery storage is unavailable. Save your draft to keep this work.",
        true,
      );
    }
  update();
}
async function act(callback) {
  try {
    await callback();
  } catch (error) {
    feedback(error.message, true);
  } finally {
    update();
  }
}
function download(value = data) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "r-barela-recovery.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function load() {
  const result = await api.request("/state");
  data = result.catalog;
  revision = result.revision;
  publishedRevision = result.publishedRevision;
  saved = JSON.stringify(data);
  $("#mode").textContent =
    result.mode === "local"
      ? "Local preview · saves stay on this computer"
      : "Protected portfolio editor";
  $("#public-link").href =
    result.mode === "local"
      ? `${location.protocol}//127.0.0.1:${Number(location.port) - 1}`
      : data.profile.url || "#";
  currentId = null;
  history = [];
  render();
  feedback(
    result.conflict
      ? "A newer publication exists. Download a recovery copy and reconcile the saved draft before publishing."
      : "Ready. Draft saves do not change the public portfolio.",
    !!result.conflict,
  );
  try {
    recovery = JSON.parse(localStorage.getItem(key));
  } catch {
    recovery = null;
  }
  if (recovery?.catalog && JSON.stringify(recovery.catalog) !== saved) {
    const result = recoverDraftBaseline({
      draftRevision: recovery.revision,
      draftSnapshot: recovery.snapshot,
      currentRevision: revision,
      currentSnapshot: saved,
      needsPublishing: true,
      workingRevisionChanged: recovery.revision !== revision,
    });
    $("#recovery-message").textContent = result.conflict
      ? "The saved portfolio changed since this recovery copy. Download the copy to compare your edits; it will not replace the newer saved version."
      : "This browser has edits that were not saved. Restore them to continue, or use the saved version.";
    $("#restore-recovery").hidden = result.conflict;
    $("#recovery-dialog").showModal();
  }
}
function field(
  label,
  value,
  attribute,
  {
    type = "text",
    full = false,
    area = false,
    hint = "",
    readonly = false,
  } = {},
) {
  return `<label class="${full ? "full" : ""}">${label}${area ? `<textarea ${attribute} ${readonly ? "readonly" : ""}>${esc(value)}</textarea>` : `<input type="${type}" value="${esc(value)}" ${attribute} ${readonly ? "readonly" : ""}>`}${hint ? `<span class="hint">${hint}</span>` : ""}</label>`;
}
function render() {
  composer?.destroy();
  composer = null;
  selection = null;
  const root = $("#view");
  document.querySelectorAll("[data-view]").forEach((b) => {
    if (b.dataset.view === view) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  if (currentId && current()) {
    renderEntry(root, current());
    update();
    return;
  }
  currentId = null;
  if (view === "projects" || view === "posts") {
    const kind = view === "posts" ? "post" : "project",
      entries = data.entries.filter((e) => e.kind === kind);
    root.innerHTML = `<div class="view-heading"><h1>${kind === "post" ? "Writing" : "Projects"}</h1><button class="primary" id="new-entry">New ${kind === "post" ? "piece" : "project"} +</button></div><p class="view-description">${kind === "post" ? "A place for essays, notes, or a thought in progress. Write freely with the same editor you use for projects. Published pieces appear newest first by publication date." : "Add your work, arrange its order, and bring the process into view. Changes go live only when you publish."}</p>${entries
      .map(
        (e) =>
          `<article class="entry-row">${e.cover.src ? `<img src="${esc(e.cover.src)}" alt="" loading="lazy">` : "<span></span>"}<div><h2><button class="entry-link" data-edit="${e.id}">${esc(e.title)}</button></h2><p>${e.kind === "post" ? e.date : e.year} · ${
            data.categories
              .filter((t) => e.categories.includes(t.id))
              .map((t) => esc(t.label))
              .join(" / ") || "Uncategorized"
          }</p></div><div class="row-actions"><span class="status-label">${e.status === "published" ? "Included" : "Draft only"}</span>${kind === "project" ? `<button data-order="${e.id}" data-direction="-1" aria-label="Move ${esc(e.title)} up" ${entries[0] === e ? "disabled" : ""}>↑</button><button data-order="${e.id}" data-direction="1" aria-label="Move ${esc(e.title)} down" ${entries.at(-1) === e ? "disabled" : ""}>↓</button>` : ""}<button data-edit="${e.id}">Edit</button></div></article>`,
      )
      .join(
        "",
      )}${!entries.length ? '<div class="empty"><h2>A blank page is a good start.</h2><p>Start with a title and a few words. Images, an introduction, and topics are optional.</p></div>' : ""}`;
    $("#new-entry").onclick = () => {
      const id = "entry-" + crypto.randomUUID().slice(0, 8);
      const e = {
        id,
        slug: id,
        kind,
        status: "draft",
        sample: data.demo,
        title: kind === "post" ? "Untitled piece" : "Untitled project",
        intro: "",
        year: new Date().getFullYear(),
        date: new Date().toISOString().slice(0, 10),
        role: "",
        credits: "",
        categories: [],
        tags: [],
        cover: { src: "", alt: "", caption: "", decorative: false },
        blocks: [blockModel.defaultBlock("text")],
      };
      data.entries.unshift(e);
      newIds.add(id);
      currentId = id;
      history = [];
      changed();
      render();
      $('[data-entry="title"]').select();
    };
    root.querySelectorAll("[data-edit]").forEach(
      (b) =>
        (b.onclick = () => {
          currentId = b.dataset.edit;
          history = [];
          render();
          $("#view").focus();
        }),
    );
    root.querySelectorAll("[data-order]").forEach(
      (b) =>
        (b.onclick = () => {
          const e = data.entries.find((e) => e.id === b.dataset.order),
            same = data.entries.filter((x) => x.kind === e.kind),
            other = same[same.indexOf(e) + Number(b.dataset.direction)];
          if (other) {
            const i = data.entries.indexOf(e),
              j = data.entries.indexOf(other);
            [data.entries[i], data.entries[j]] = [
              data.entries[j],
              data.entries[i],
            ];
            changed();
            render();
          }
        }),
    );
  } else if (view === "taxonomy") renderTaxonomy(root);
  else renderProfile(root);
  update();
}
function contentEditorMarkup(title, description = "") {
  return `<section class="section-rule"><div class="editor-heading"><h2>${title}</h2><button id="undo" ${!history.length ? "disabled" : ""}>Undo block change</button></div><p class="hint">${description}Select a block to format, move or remove it. Type /image, /gallery or /video to insert a block.</p><div id="blocks"></div><div class="block-palette" aria-label="Add a block">${TYPES.map((type) => `<button data-add="${type}">+ ${type[0].toUpperCase() + type.slice(1)}</button>`).join("")}</div></section>`;
}
function renderEntry(root, e) {
  const prose = e.kind === "post";
  const terms = `<div class="fields"><fieldset><legend>${prose ? "Topics (optional)" : "Categories"}</legend><div class="checks">${data.categories.map((t) => `<label class="check"><input type="checkbox" data-term="categories" value="${t.id}" ${e.categories.includes(t.id) ? "checked" : ""}>${esc(t.label)}</label>`).join("")}</div></fieldset><fieldset><legend>Tags${prose ? " (optional)" : ""}</legend><div class="checks">${data.tags.map((t) => `<label class="check"><input type="checkbox" data-term="tags" value="${t.id}" ${e.tags.includes(t.id) ? "checked" : ""}>${esc(t.label)}</label>`).join("")}</div></fieldset><div class="full"><button id="manage-terms" class="quiet">Create or manage categories & tags →</button></div></div>`;
  const visibility = `<div class="entry-visibility"><label class="check"><input id="included" type="checkbox" ${e.status === "published" ? "checked" : ""}>Include this ${prose ? "piece" : "project"} when publishing</label><label class="check"><input id="sample-entry" type="checkbox" ${e.sample ? "checked" : ""}>This is sample content</label></div>`;
  const cover = `<section class="section-rule"><h2>Cover image${prose ? " (optional)" : ""}</h2><p class="hint">${prose ? "Writing works beautifully without an image. " : ""}Web-ready JPG, PNG or WebP, up to 5 MB. Add a useful description for people who cannot see it.</p><div id="cover"></div></section>`;
  const story = contentEditorMarkup(
    prose ? "The writing" : "The story",
    prose ? "Write as much or as little as you like. " : "",
  );
  const credits = `<div class="fields">${field(prose ? "Notes / acknowledgments (optional)" : "Credits / collaborators", e.credits, 'data-entry="credits"', { area: true, full: true })}</div>`;
  const url = field("Page URL", entryPath(e), 'id="entry-url"', {
    readonly: true,
    full: true,
    hint: "The URL stays stable when a saved title changes.",
  });
  root.innerHTML = `<div class="view-heading"><div><button id="back" class="quiet">← ${prose ? "Writing" : "Projects"}</button><h1>${prose ? "Edit writing" : "Edit project"}</h1></div><button id="delete-entry">Delete ${prose ? "piece" : "project"}</button></div><div class="fields">${field("Title", e.title, 'data-entry="title"', { full: true })}${field(prose ? "Introduction (optional)" : "Introduction", e.intro, 'data-entry="intro"', { area: true, full: true })}${prose ? field("Publication date", e.date, 'data-entry="date"', { type: "date" }) : field("Year or range", e.year, 'data-entry="year"', { hint: "For example, 2026 or 2014–2026." }) + field("Role / discipline", e.role, 'data-entry="role"')}${!prose ? url : ""}</div>${prose ? story + visibility + `<details class="writing-options"><summary>Images, topics & page details</summary>${terms}${cover}<div class="fields">${url}</div>${credits}</details>` : terms + visibility + cover + story + credits}`;
  $("#back").onclick = () => {
    currentId = null;
    render();
  };
  $("#manage-terms").onclick = () => {
    currentId = null;
    view = "taxonomy";
    render();
  };
  $("#delete-entry").onclick = () => {
    if (
      !confirm(
        `Delete “${e.title}” from this draft? It stays live until you publish changes.`,
      )
    )
      return;
    data.entries = data.entries.filter((x) => x !== e);
    currentId = null;
    changed();
    render();
  };
  root.querySelectorAll("[data-entry]").forEach(
    (input) =>
      (input.oninput = () => {
        const f = input.dataset.entry;
        e[f] = input.value;
        if (f === "title" && newIds.has(e.id)) {
          e.slug = slugify(e.title) || e.id;
          $("#entry-url").value = entryPath(e);
        }
        changed();
      }),
  );
  root.querySelectorAll("[data-term]").forEach(
    (input) =>
      (input.onchange = () => {
        const kind = input.dataset.term;
        e[kind] = [
          ...root.querySelectorAll(`[data-term="${kind}"]:checked`),
        ].map((n) => n.value);
        changed();
      }),
  );
  $("#included").onchange = (event) => {
    e.status = event.target.checked ? "published" : "draft";
    changed();
  };
  $("#sample-entry").onchange = (event) => {
    e.sample = event.target.checked;
    changed();
  };
  $("#cover").append(
    mediaField(e.cover, {
      entry: e,
      item: e,
      getItems: () => data.entries,
      contains: () => e.cover,
      refresh: () => render(),
    }),
  );
  mountContentEditor(root, e);
}
function mountContentEditor(
  root,
  e,
  {
    notify = changed,
    isAttached = () => data.entries.includes(e),
    isCurrent = () => currentId === e.id,
  } = {},
) {
  const linkSelections = new WeakMap();
  function snapshot() {
    history.push(clone(e.blocks));
    if (history.length > 50) history.shift();
    $("#undo").disabled = false;
  }
  composer = createBlockEditor($("#blocks"), {
    model: blockModel,
    getBlocks: () => e.blocks,
    setBlocks: (value) => {
      e.blocks = value;
    },
    renderBody: (card, block, index) =>
      renderBody(card, block, index, e, snapshot, {
        notify,
        isAttached,
        isCurrent,
      }),
    beforeMutation: snapshot,
    onMutation: () => notify(),
  });
  const format = (command) => (control) => {
    const block = control.closest(".admin-content-block"),
      editable = block?.querySelector("[contenteditable]");
    if (!editable) return;
    const range = selection?.cloneRange();
    snapshot();
    editable.focus();
    if (range && editable.contains(range.commonAncestorContainer)) {
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(range);
    }
    document.execCommand(command, false);
    syncEditable(editable, e, notify);
    rememberSelection();
  };
  composer.bind({
    focus: (event) => {
      composer.activate(event.target);
      if (event.target.closest("[contenteditable]")) rememberSelection();
    },
    selection: (event) => {
      if (event.target.closest("[contenteditable]")) rememberSelection();
    },
    pointer: (event) => {
      if (event.target.closest('button[data-content-action^="format-"]')) {
        rememberSelection();
        event.preventDefault();
      }
      composer.activate(event.target);
    },
    outside: () => {
      selection = null;
      composer.activate(null);
    },
    input: (event) => {
      const input = event.target;
      if (input.matches("[contenteditable]")) {
        snapshot();
        syncEditable(input, e, notify);
      }
    },
    fieldChange: () => {},
    actions: {
      "format-bold": format("bold"),
      "format-italic": format("italic"),
      "format-underline": format("underline"),
      "format-unordered-list": format("insertUnorderedList"),
      "format-ordered-list": format("insertOrderedList"),
      "format-block": (control) => {
        const editable = control
          .closest(".admin-content-block")
          .querySelector("[contenteditable]");
        const range = selection?.cloneRange();
        snapshot();
        editable.focus();
        if (range && editable.contains(range.commonAncestorContainer)) {
          const s = getSelection();
          s.removeAllRanges();
          s.addRange(range);
        }
        document.execCommand("formatBlock", false, control.value);
        syncEditable(editable, e, notify);
      },
      "format-link": (control) => {
        rememberSelection();
        const panel = control
          .closest(".admin-content-block")
          .querySelector("[data-content-link-panel]");
        linkSelections.set(panel, selection?.cloneRange());
        panel.hidden = false;
        panel.querySelector("input").focus();
      },
      "link-apply": (control) => {
        const card = control.closest(".admin-content-block"),
          input = card.querySelector('[data-content-action="link-url"]'),
          editable = card.querySelector("[contenteditable]"),
          panel = card.querySelector("[data-content-link-panel]");
        // Input blur and the Apply click may both request the same change.
        if (panel.hidden) return;
        if (!isSafeEditorHref(input.value)) {
          feedback(
            "Enter a safe https://, mailto: or site-relative link.",
            true,
          );
          return;
        }
        const range = linkSelections.get(panel);
        snapshot();
        panel.hidden = true;
        editable.focus();
        if (range && editable.contains(range.commonAncestorContainer)) {
          const s = getSelection();
          s.removeAllRanges();
          s.addRange(range);
        }
        document.execCommand("createLink", false, input.value);
        syncEditable(editable, e, notify);
        rememberSelection();
      },
      "link-remove": format("unlink"),
    },
    slash: (control) =>
      composer.insertSlash(control, editorElementToMarkdown(control)),
    paste: (event) => {
      if (!event.target.closest("[contenteditable]")) return;
      event.preventDefault();
      const html = sanitizeClipboardPayload(
        {
          html: event.clipboardData.getData("text/html"),
          text: event.clipboardData.getData("text/plain"),
        },
        RICH_TEXT_POLICY,
      );
      document.execCommand("insertHTML", false, html);
      syncEditable(event.target.closest("[contenteditable]"), e, notify);
    },
  });
  composer.render();
  $("#undo").onclick = () => {
    if (!history.length) return;
    e.blocks = history.pop();
    composer.render();
    $("#undo").disabled = !history.length;
    notify();
  };
  root.querySelectorAll("[data-add]").forEach(
    (button) =>
      (button.onclick = () => {
        snapshot();
        e.blocks.push(blockModel.defaultBlock(button.dataset.add));
        composer.render();
        const node = $("#blocks").lastElementChild.previousElementSibling;
        composer.activate(node);
        node.querySelector("[data-content-field],input,textarea")?.focus();
        notify();
      }),
  );
}
function rememberSelection() {
  const s = getSelection();
  if (
    s?.rangeCount &&
    s.anchorNode?.parentElement?.closest("[contenteditable]")
  )
    selection = s.getRangeAt(0).cloneRange();
}
function syncEditable(input, e, notify = changed) {
  const block = e.blocks[Number(input.dataset.contentIndex)];
  if (!block) return;
  block[input.dataset.contentField] = editorElementToMarkdown(
    input,
    RICH_TEXT_POLICY,
  );
  notify();
}
function renderBody(card, b, index, e, snapshot, owner) {
  const { notify } = owner;
  const input = (label, field, { area = false } = {}) => {
    const wrap = document.createElement("div");
    wrap.innerHTML = fieldHtml(label, b[field] || "", area);
    const control = wrap.querySelector("input,textarea");
    control.dataset.contentField = field;
    control.dataset.contentIndex = index;
    control.oninput = () => {
      snapshot();
      b[field] = control.value;
      notify();
    };
    card.append(wrap);
  };
  if (b.type === "text" || b.type === "quote") {
    const editable = document.createElement("div");
    editable.className = "rich-field";
    editable.contentEditable = "true";
    editable.role = "textbox";
    editable.setAttribute("aria-multiline", "true");
    editable.setAttribute(
      "aria-label",
      b.type === "quote" ? "Quote text" : "Block text",
    );
    editable.dataset.contentField = b.type === "text" ? "body" : "text";
    editable.dataset.contentIndex = index;
    editable.dataset.placeholder =
      b.type === "text" ? "Start writing…" : "A few words worth holding onto…";
    editable.innerHTML = rich(b[editable.dataset.contentField]);
    card.append(editable);
    if (b.type === "quote") input("Attribution", "author");
  } else if (b.type === "image")
    card.append(
      mediaField(b, {
        ...owner,
        entry: e,
        item: b,
        getItems: () => e.blocks,
        contains: () => e.blocks.includes(b),
        refresh: () => composer.render(),
        before: snapshot,
      }),
    );
  else if (b.type === "gallery") {
    const layout = document.createElement("label");
    layout.innerHTML = `Gallery layout<select><option value="grid">Grid</option><option value="carousel" ${b.layout === "carousel" ? "selected" : ""}>Horizontal gallery</option></select>`;
    layout.querySelector("select").onchange = (event) => {
      snapshot();
      b.layout = event.target.value;
      notify();
    };
    card.append(layout);
    b.images.forEach((img, i) => {
      const media = mediaField(img, {
        ...owner,
        entry: e,
        item: b,
        getItems: () => e.blocks,
        contains: () => b.images.includes(img),
        refresh: () => composer.render(),
        before: snapshot,
      });
      const controls = document.createElement("div");
      controls.className = "media-actions";
      for (const [label, direction] of [
        ["Move image up", -1],
        ["Move image down", 1],
      ]) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.disabled = i + direction < 0 || i + direction >= b.images.length;
        button.onclick = () => {
          snapshot();
          [b.images[i], b.images[i + direction]] = [
            b.images[i + direction],
            b.images[i],
          ];
          composer.render();
          notify();
        };
        controls.append(button);
      }
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Delete gallery image";
      remove.onclick = () => {
        snapshot();
        b.images.splice(b.images.indexOf(img), 1);
        composer.render();
        notify();
      };
      controls.append(remove);
      media.append(controls);
      card.append(media);
    });
    const add = document.createElement("button");
    add.type = "button";
    add.textContent = "+ Add gallery image";
    add.onclick = () => {
      snapshot();
      b.images.push({ src: "", alt: "", caption: "", decorative: false });
      composer.render();
      notify();
    };
    card.append(add);
    input("Gallery caption", "caption");
  } else if (b.type === "video") {
    const source = document.createElement("label");
    source.innerHTML = 'Video source<select aria-label="Video source"><option value="embed">YouTube / Vimeo</option><option value="local">MP4 video</option></select>';
    const select = source.querySelector("select");
    select.value = b.provider === "local" ? "local" : "embed";
    select.onchange = () => {
      snapshot();
      mediaGeneration.set(b, (mediaGeneration.get(b) || 0) + 1);
      Object.assign(b, { provider: select.value === "local" ? "local" : "youtube", src: "", video_id: "", poster: "" });
      notify();
      composer.render();
    };
    card.append(source);
    if (b.provider === "local") {
      const wrap = document.createElement("label");
      wrap.innerHTML = 'Upload or replace MP4<input aria-label="Upload or replace MP4" type="file" accept="video/mp4,.mp4">';
      const fileInput = wrap.querySelector("input");
      fileInput.onchange = () => act(async () => {
        const file = fileInput.files[0];
        if (!file) return;
        if (file.size > MAX_VIDEO_BYTES) throw new Error(VIDEO_SIZE_MESSAGE);
        const generation = (mediaGeneration.get(b) || 0) + 1;
        mediaGeneration.set(b, generation);
        const isCurrent = () => fileInput.isConnected && owner.isAttached() && owner.isCurrent() &&
          e.blocks.includes(b) && b.provider === "local" && mediaGeneration.get(b) === generation;
        pendingUploads++;
        update();
        try {
          validateMp4(new Uint8Array(await file.arrayBuffer()));
          if (!isCurrent()) return;
          feedback("Uploading video…");
          const result = await api.request("/videos", { method: "POST", body: file, headers: { "content-type": "video/mp4" } });
          if (!isCurrent()) {
            feedback("Video uploaded, but the original block changed. No content was replaced.");
            return;
          }
          snapshot();
          Object.assign(b, { src: result.src, poster: "" });
          notify();
          composer.render();
          feedback("Video uploaded. Save your draft when ready.");
        } finally {
          pendingUploads--;
          update();
        }
      });
      card.append(wrap);
      describeUpload(fileInput, "video");
      const remove = createMediaRemovalControl({
        label: "Remove video",
        hasSelection: () => !!b.src,
        clearSelection: () => {
          snapshot();
          mediaGeneration.set(b, (mediaGeneration.get(b) || 0) + 1);
          Object.assign(b, { src: "", poster: "" });
          notify();
          composer.render();
        },
      });
      card.append(remove.button);
      if (b.src) {
        const preview = document.createElement("video");
        Object.assign(preview, { src: b.src, poster: b.poster || "", controls: true, playsInline: true, loop: true, preload: "none" });
        preview.style.width = "100%";
        preview.setAttribute("aria-label", b.caption || "Video loop");
        card.append(preview);
      }
    } else {
      const wrap = document.createElement("label");
      wrap.innerHTML = `YouTube or Vimeo URL<input type="url" value="${b.video_id ? esc(videoUrl(b)) : ""}" placeholder="https://www.youtube.com/watch?v=…"><span class="hint">YouTube and Vimeo links, including unlisted Vimeo share links.</span>`;
      const control = wrap.querySelector("input");
      control.dataset.contentField = "video-url";
      control.dataset.contentIndex = index;
      control.onchange = () => {
        try {
          snapshot();
          Object.assign(
            b,
            { src: "" },
            control.value ? parseVideo(control.value) : { video_id: "" },
          );
          control.setCustomValidity("");
          notify();
        } catch (error) {
          control.setCustomValidity(error.message);
          control.reportValidity();
          feedback(error.message, true);
        }
      };
      card.append(wrap);
    }
    input("Video caption", "caption");
  } else {
    const hr = document.createElement("hr");
    card.append(hr);
    card.tabIndex = 0;
    card.setAttribute("aria-label", "Divider block");
  }
}
function fieldHtml(label, value, area = false) {
  return `<label>${label}${area ? `<textarea>${esc(value)}</textarea>` : `<input value="${esc(value)}">`}</label>`;
}
function mediaField(
  target,
  {
    entry,
    item,
    getItems,
    contains,
    refresh,
    before = () => {},
    notify = changed,
    isAttached = () => data.entries.includes(entry),
    isCurrent = () => currentId === entry.id,
  },
) {
  const wrap = document.createElement("div");
  wrap.className = "media-controls";
  wrap.innerHTML = `${target.src ? `<img src="${esc(target.src)}" alt="${esc(target.alt)}">` : ""}<label>Choose photo<input type="file" accept="image/jpeg,image/png,image/webp"></label><div class="media-fields">${fieldHtml("Image description", target.alt || "")}${fieldHtml("Caption", target.caption || "")}</div><label class="check"><input type="checkbox" ${target.decorative ? "checked" : ""}>Decorative image (no description needed)</label>`;
  describeUpload(wrap.querySelector("[type=file]"), "photo");
  const fields = wrap.querySelectorAll(".media-fields input");
  fields[0].oninput = () => {
    before();
    target.alt = fields[0].value;
    notify();
  };
  fields[1].oninput = () => {
    before();
    target.caption = fields[1].value;
    notify();
  };
  wrap.querySelector("[type=checkbox]").onchange = (event) => {
    before();
    target.decorative = event.target.checked;
    notify();
  };
  const remove = createMediaRemovalControl({
    label: "Remove photo",
    hasSelection: () => !!target.src,
    clearSelection: () => {
      before();
      mediaGeneration.set(target, (mediaGeneration.get(target) || 0) + 1);
      target.src = "";
      notify();
      refresh();
    },
  });
  wrap.append(remove.button);
  wrap.querySelector("[type=file]").onchange = (event) =>
    act(async () => {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > MAX_IMAGE_BYTES)
        throw new Error(
          "Prepare a web-ready image under 5 MB before uploading.",
        );
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
        throw new Error("Choose a JPG, PNG or WebP photo.");
      const bitmap = await createImageBitmap(file);
      const pixels = bitmap.width * bitmap.height;
      bitmap.close();
      if (pixels > MAX_IMAGE_PIXELS)
        throw new Error("Resize this photo below 40 megapixels.");
      const generation = (mediaGeneration.get(target) || 0) + 1;
      mediaGeneration.set(target, generation);
      const ticket = remove.beginUpload();
      const captured = captureMediaTarget({
        item,
        target,
        getItems,
        isAttached,
        contains,
        isCurrent: () =>
          isCurrent() && mediaGeneration.get(target) === generation,
      });
      pendingUploads++;
      update();
      feedback("Uploading photo…");
      try {
        const result = await api.request("/media", {
          method: "POST",
          body: file,
          headers: { "content-type": file.type },
        });
        if (captured.index() < 0 || !remove.isCurrentUpload(ticket)) {
          feedback(
            "Photo uploaded, but the original image slot changed. No content was replaced.",
          );
          return;
        }
        before();
        target.src = result.src;
        remove.changed();
        notify();
        refresh();
        feedback("Photo uploaded. Add its description, then save your draft.");
      } finally {
        pendingUploads--;
        update();
      }
    });
  return wrap;
}
function renderTaxonomy(root) {
  root.innerHTML =
    '<h1>Categories & tags</h1><p class="view-description">Categories are the main ways into your work. Tags add detail. Rename a label freely; its URL stays the same. Reassign projects before deleting a label.</p>' +
    ["categories", "tags"]
      .map(
        (kind) =>
          `<section><h2>${kind === "categories" ? "Categories" : "Tags"}</h2>${data[
            kind
          ]
            .map((t, i) => {
              const used = data.entries.filter((e) =>
                e[kind].includes(t.id),
              ).length;
              return `<div class="term-row"><label><span class="hint">${used} ${used === 1 ? "entry" : "entries"}</span><input aria-label="${esc(t.label)} label" data-label="${kind}" data-id="${t.id}" value="${esc(t.label)}"><code>/${kind === "categories" ? "category" : "tag"}/${t.slug}/</code></label><div class="row-actions"><button data-term-move="${kind}" data-id="${t.id}" data-step="-1" aria-label="Move ${esc(t.label)} up" ${i === 0 ? "disabled" : ""}>↑</button><button data-term-move="${kind}" data-id="${t.id}" data-step="1" aria-label="Move ${esc(t.label)} down" ${i === data[kind].length - 1 ? "disabled" : ""}>↓</button><button data-term-delete="${kind}" data-id="${t.id}" ${used ? 'disabled title="Reassign entries first"' : ""}>Delete</button></div></div>`;
            })
            .join(
              "",
            )}<form class="new-term" data-new-term="${kind}"><label>New ${kind === "categories" ? "category" : "tag"}<input name="label" maxlength="60" required></label><button type="submit">Add ${kind === "categories" ? "category" : "tag"}</button></form></section>`,
      )
      .join("");
  root.querySelectorAll("[data-label]").forEach(
    (input) =>
      (input.oninput = () => {
        data[input.dataset.label].find((t) => t.id === input.dataset.id).label =
          input.value;
        changed();
      }),
  );
  root.querySelectorAll("[data-term-move]").forEach(
    (button) =>
      (button.onclick = () => {
        const terms = data[button.dataset.termMove],
          i = terms.findIndex((t) => t.id === button.dataset.id),
          j = i + Number(button.dataset.step);
        [terms[i], terms[j]] = [terms[j], terms[i]];
        changed();
        render();
      }),
  );
  root.querySelectorAll("[data-term-delete]").forEach(
    (button) =>
      (button.onclick = () => {
        data[button.dataset.termDelete] = data[
          button.dataset.termDelete
        ].filter((t) => t.id !== button.dataset.id);
        changed();
        render();
      }),
  );
  root.querySelectorAll("[data-new-term]").forEach(
    (form) =>
      (form.onsubmit = (event) => {
        event.preventDefault();
        const kind = form.dataset.newTerm,
          label = form.elements.label.value.trim(),
          slug = slugify(label);
        if (!slug) {
          feedback("Use a category or tag name with letters or numbers.", true);
          return;
        }
        if (data[kind].some((t) => t.slug === slug)) {
          feedback("That label already exists.", true);
          return;
        }
        data[kind].push({ id: slug, slug, label });
        changed();
        render();
        feedback(
          `${label} added. It appears in navigation once it has a published project.`,
        );
      }),
  );
}
function renderProfile(root) {
  const p = data.profile;
  root.innerHTML = `<h1>Bio & contact</h1><p class="view-description">Introduce your practice and give people a direct way to reach you.</p><div class="fields">${field("Name", p.name, 'data-profile="name"', { full: true })}${field("Short introduction", p.intro, 'data-profile="intro"', { full: true, area: true })}</div>`;
  root.insertAdjacentHTML(
    "beforeend",
    '<section class="pdf-upload" aria-labelledby="pdf-title"><h2 id="pdf-title">Downloadable bio & résumé PDF</h2><p><a id="bio-pdf-download" download="R-Barela-Bio-and-Resume.pdf"></a></p><label>Upload or replace PDF<input id="bio-pdf-upload" type="file" accept="application/pdf,.pdf"></label></section>',
  );
  const pdfInput = root.querySelector("#bio-pdf-upload");
  describeUpload(pdfInput, "pdf");
  const refreshPdf = () => {
    const pdf = bioPdf(p), link = root.querySelector("#bio-pdf-download");
    link.href = pdf.src;
    link.textContent = pdf.name;
  };
  refreshPdf();
  let uploadGeneration = 0;
  pdfInput.onchange = () => act(async () => {
    const file = pdfInput.files[0], generation = ++uploadGeneration;
    pdfInput.value = "";
    if (!file) return;
    if (file.size > MAX_PDF_BYTES)
      throw new Error("Choose a PDF no larger than 5 MB.");
    pendingUploads++;
    update();
    feedback("Uploading PDF…");
    try {
      const result = await api.request("/documents", {
        method: "POST",
        body: file,
        headers: { "content-type": "application/pdf" },
      });
      if (!pdfInput.isConnected || data.profile !== p || generation !== uploadGeneration) {
        feedback("PDF uploaded, but the selection changed. No document was replaced.");
        return;
      }
      p.bioPdf = { src: result.src, name: file.name.slice(0, 200) };
      refreshPdf();
      changed();
      feedback("PDF uploaded. Save your draft, then publish to update the public download.");
    } finally {
      pendingUploads--;
      update();
    }
  });
  const editor = { blocks: bioBlocks(p) };
  root.insertAdjacentHTML(
    "beforeend",
    contentEditorMarkup(
      "Biography & résumé",
      "Edit the text and formatting directly. ",
    ),
  );
  root.insertAdjacentHTML(
    "beforeend",
    `<details class="writing-options"><summary>Contact, links & site settings</summary><div class="fields">${field("Public contact email", p.email, 'data-profile="email"', { type: "email" })}${field("Public site URL", p.url, 'data-profile="url"', { type: "url", hint: "Add the real HTTPS domain before launch." })}${field("Instagram", p.instagram, 'data-profile="instagram"', { type: "url" })}${field("IMDb", p.imdb, 'data-profile="imdb"', { type: "url" })}<label class="check full"><input id="sample-site" type="checkbox" ${data.demo ? "checked" : ""}>Sample portfolio — show the preview notice and keep search indexing off</label></div><p class="hint">Production publishing requires real content, the domain and a contact email. Turning off the notice alone does not approve sample projects for production.</p></details>`,
  );
  mountContentEditor(root, editor, {
    notify: () => {
      p.bio = editor.blocks;
      changed();
    },
    isAttached: () => data.profile === p,
    isCurrent: () => view === "profile" && data.profile === p,
  });
  root.querySelectorAll("[data-profile]").forEach(
    (input) =>
      (input.oninput = () => {
        p[input.dataset.profile] = input.value;
        changed();
      }),
  );
  $("#sample-site").onchange = (event) => {
    data.demo = event.target.checked;
    changed();
  };
}
function assertValidFields() {
  const invalid = [
    ...$("#view").querySelectorAll("input,textarea,select"),
  ].find((field) => !field.checkValidity());
  if (invalid) {
    invalid.reportValidity();
    throw new Error(
      invalid.validationMessage || "Check the highlighted field.",
    );
  }
}
async function save() {
  assertValidFields();
  const original = JSON.stringify(data),
    catalog = validateCatalog(data);
  const sent = JSON.stringify(catalog);
  const result = await api.request("/draft", {
    method: "PUT",
    body: { catalog, revision, publishedRevision },
  });
  revision = result.revision;
  publishedRevision = result.publishedRevision;
  saved = sent;
  newIds.clear();
  // Keep typing performed while the request was in flight.
  if (JSON.stringify(data) === original) {
    data = catalog;
    localStorage.removeItem(key);
    if (currentId || view === "profile") render();
  } else changed();
  feedback("Draft saved. The public portfolio is unchanged.");
  update();
  return result;
}
$("#save").onclick = () =>
  act(async () => {
    busy = true;
    update();
    try {
      await save();
    } finally {
      busy = false;
    }
  });
$("#publish").onclick = () =>
  act(async () => {
    const included = data.entries.filter((e) => e.status === "published");
    if (
      !confirm(
        `Publish all saved changes, including ${included.filter((e) => e.kind === "project").length} projects and ${included.filter((e) => e.kind === "post").length} pieces of writing? Draft-only entries stay private. Categories and profile changes are included.`,
      )
    )
      return;
    busy = true;
    update();
    try {
      if (dirty()) await save();
      const result = await api.request("/publish", {
        method: "POST",
        body: { revision, publishedRevision },
      });
      publishedRevision = result.publishedRevision || publishedRevision;
      revision = result.revision || revision;
      if (result.status === "live") {
        feedback(
          "Published to the local preview. The public pages now reflect this saved draft.",
        );
        return;
      }
      feedback(
        `Publishing commit ${result.commit.slice(0, 8)}. The previous site stays live until the build passes.`,
      );
      let status = result;
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        status = await api.request(`/status?revision=${result.commit}`);
        if (status.status === "live" || status.status === "failed") break;
      }
      feedback(
        status.status === "live"
          ? `Live — commit ${result.commit.slice(0, 8)}.`
          : status.status === "failed"
            ? "The release failed. The previous site is still live and your draft is saved."
            : "The release is still queued. Check the repository’s Pages workflow for this commit.",
        status.status === "failed",
      );
    } finally {
      busy = false;
    }
  });
$("#preview").onclick = () =>
  act(async () => {
    assertValidFields();
    busy = true;
    update();
    try {
      const result = await api.request("/preview", {
        method: "POST",
        body: {
          catalog: data,
          ...(view === "profile" && !current()
            ? { page: "bio" }
            : { id: currentId }),
        },
      });
      const previewTitle =
        view === "profile" && !current()
          ? "Bio preview"
          : current().kind === "post"
            ? "Writing preview"
            : "Project preview";
      $("#preview-title").textContent = previewTitle;
      $("#preview-dialog iframe").title = previewTitle;
      $("#preview-dialog iframe").srcdoc = result.html;
      $("#preview-dialog").showModal();
    } finally {
      busy = false;
    }
  });
$("#close-preview").onclick = () => $("#preview-dialog").close();
$("#preview-dialog").addEventListener("close", () => {
  $("#preview-dialog iframe").srcdoc = "";
});
$("#download").onclick = () => download();
$("#reload").onclick = () =>
  act(async () => {
    if (
      guard.confirmTransition(
        "Reload the saved version and discard unsaved edits? Download a recovery copy first if needed.",
      )
    ) {
      localStorage.removeItem(key);
      await load();
    }
  });
$("#restore-recovery").onclick = () => {
  data = validateCatalog(recovery.catalog);
  $("#recovery-dialog").close();
  changed();
  render();
  feedback("Recovered edits. Review them, then save your draft.");
};
$("#download-recovery").onclick = () => download(recovery.catalog);
$("#dismiss-recovery").onclick = () => {
  localStorage.removeItem(key);
  $("#recovery-dialog").close();
};
for (const button of document.querySelectorAll("[data-view]"))
  button.onclick = () => {
    view = button.dataset.view;
    currentId = null;
    history = [];
    render();
  };
await act(load);
