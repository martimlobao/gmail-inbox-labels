// Function to create the toggle element
function createToggle() {
  const toggleContainer = document.createElement("div");
  toggleContainer.innerHTML = `
    <div class="aAv toggle-content">
      <span class="toggle-label">Inbox only</span>
      <label class="switch">
        <input type="checkbox" id="inboxToggle" title="Adds or removes an inbox filter from the current label or search. Combined mailbox filters may show no results.">
        <span class="slider round"></span>
      </label>
    </div>
  `;
  return toggleContainer;
}

// Function to insert the round slider toggle beside the "Labels" header
function insertToggle() {
  if (document.getElementById("inboxToggle")) {
    return;
  }

  const labelsHeader = document.querySelector('.aAw span[role="heading"]');
  if (labelsHeader) {
    const toggleContainer = createToggle();
    labelsHeader.parentNode.insertBefore(toggleContainer, labelsHeader.nextSibling);
    initializeToggle();
  }
}

// Function to initialize the toggle state and event listeners
function initializeToggle() {
  const toggle = document.getElementById("inboxToggle");
  chrome.storage.sync.get(['inboxOnly'], function(result) {
    toggle.checked = result.inboxOnly !== undefined ? result.inboxOnly : true;
  });

  toggle.addEventListener("change", function () {
    chrome.storage.sync.set({inboxOnly: toggle.checked});
    refreshCurrentView(toggle.checked);
  });
}

function decodeRoute(value) {
  // Gmail uses '+' for spaces, but an encoded %2B is a literal plus sign.
  return decodeURIComponent(value.replace(/\+/g, " "));
}

function labelQuery(labelName) {
  const quotedLabel = labelName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `label:"${quotedLabel}"`;
}

// Split only at top-level spaces; quoted text and grouped expressions are opaque.
function searchTerms(query) {
  const terms = [];
  let term = "";
  let quoted = false;
  let escaped = false;
  const groups = [];
  for (const character of query) {
    if (escaped) {
      term += character;
      escaped = false;
    } else if (character === "\\") {
      term += character;
      escaped = true;
    } else if (character === '"') {
      term += character;
      quoted = !quoted;
    } else if (!quoted && /[({]/.test(character)) {
      groups.push(character);
      term += character;
    } else if (!quoted && /[)}]/.test(character)) {
      if (groups.pop() !== (character === ")" ? "(" : "{")) return null;
      term += character;
    } else if (!quoted && !groups.length && /\s/.test(character)) {
      if (term) terms.push(term);
      term = "";
    } else {
      term += character;
    }
  }
  if (quoted || escaped || groups.length) return null;
  if (term) terms.push(term);
  return terms;
}

let lastInboxSearch = null;

function refreshCurrentView(inboxOnly) {
  const match = window.location.hash.match(/^#(label|search)\/([^/]+)(?:\/p\d+)?$/);
  // Leave folders and open messages in place; refreshed searches start on page 1.
  if (!match) return;

  let query;
  try {
    const value = decodeRoute(match[2]);
    query = match[1] === "label" ? labelQuery(value) : value;
  } catch {
    return;
  }

  const terms = searchTerms(query);
  if (!terms) return;
  const normalized = terms.map(term => term.toLowerCase().replace(/^(-?(?:in|is|label):)"([^"\\]*)"$/, "$1$2"));
  const hasBoolean = normalized.some(term => /^(or|and|not|\|)$/.test(term));
  const hasInbox = normalized.includes("in:inbox");
  let nextQuery;
  if (inboxOnly) {
    if (hasInbox && !hasBoolean) return;
    nextQuery = `${hasBoolean ? `(${query})` : query} in:inbox`;
    lastInboxSearch = { original: query, filtered: nextQuery };
  } else if (lastInboxSearch?.filtered === query) {
    nextQuery = lastInboxSearch.original;
    lastInboxSearch = null;
  } else {
    // Never remove an inbox term from an OR branch or from inside a group.
    if (!hasInbox || hasBoolean) return;
    nextQuery = terms.filter((_, index) => normalized[index] !== "in:inbox").join(" ");
  }
  window.location.hash = nextQuery ? `#search/${encodeURIComponent(nextQuery)}` : "#all";
}

// Intercept before Gmail's label handler can replace the inbox search.
// Delegation also covers rows Gmail inserts or replaces after initialization.
function handleLabelClick(event) {
  const toggle = document.getElementById("inboxToggle");
  if (!toggle?.checked || event.button !== 0 || event.ctrlKey || event.metaKey ||
      event.shiftKey || event.altKey || !(event.target instanceof Element) ||
      event.target.closest(".pM")) {
    return;
  }

  const row = event.target.closest('[gh="cl"] [data-tooltip-align="r"]');
  const link = row?.querySelector('a[href*="#label/"]');
  if (!link) {
    return;
  }

  let labelName;
  try {
    labelName = decodeRoute(link.getAttribute("href").split("#label/")[1]);
  } catch {
    return;
  }
  const searchQuery = `${labelQuery(labelName)} in:inbox`;

  event.preventDefault();
  event.stopImmediatePropagation();
  window.location.hash = `#search/${encodeURIComponent(searchQuery)}`;
}

document.addEventListener("click", handleLabelClick, true);

// Function to initialize the extension
function initExtension() {
  insertToggle();
}

// Create a MutationObserver to observe changes in the DOM
const observer = new MutationObserver(() => {
  if (document.querySelector('.aAw span[role="heading"]')) {
    initExtension();
  }
});

// Start observing the Gmail body or a specific container
observer.observe(document.body, { childList: true, subtree: true });

initExtension();
