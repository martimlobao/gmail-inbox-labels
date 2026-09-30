// Function to create the toggle element
function createToggle() {
  const toggleContainer = document.createElement("div");
  toggleContainer.innerHTML = `
    <div class="aAv toggle-content">
      <span class="toggle-label">Inbox only</span>
      <label class="switch">
        <input type="checkbox" id="inboxToggle">
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
  });
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
    // Decode route separators before percent escapes so a literal %2B stays '+'.
    labelName = decodeURIComponent(link.getAttribute("href").split("#label/")[1].replace(/\+/g, " "));
  } catch {
    return;
  }
  const quotedLabel = labelName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const searchQuery = `label:"${quotedLabel}" in:inbox`;

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
