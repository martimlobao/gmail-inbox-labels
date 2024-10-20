// Function to insert the round slider toggle beside the "Labels" header
function insertToggle() {
  if (document.getElementById("inboxToggle")) {
    return;
  }

  const labelsHeader = document.querySelector('.aAw span[role="heading"]');

  if (labelsHeader) {
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

    labelsHeader.parentNode.insertBefore(
      toggleContainer,
      labelsHeader.nextSibling
    );

    const toggle = document.getElementById("inboxToggle");

    // Load the saved state
    chrome.storage.sync.get(['inboxOnly'], function(result) {
      toggle.checked = result.inboxOnly !== undefined ? result.inboxOnly : true;
      modifyDivLinks(toggle.checked);
    });

    toggle.addEventListener("change", function () {
      // Save the new state
      chrome.storage.sync.set({inboxOnly: toggle.checked});
      modifyDivLinks(toggle.checked);
    });
  }
}

// Function to programmatically trigger the search by injecting the query
function performSearch(searchQuery) {
  const searchBox = document.querySelector('input[aria-label="Search mail"]');
  if (searchBox) {
    searchBox.value = searchQuery;

    const enterKeyEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      code: "Enter",
      keyCode: 13,
    });
    searchBox.dispatchEvent(enterKeyEvent);
  }
}

// Function to handle clicks on the entire div and trigger the <a> click behavior
function handleDivClick(event, link, searchQuery) {
  if (event.target.closest(".pM")) {
    return;
  }

  event.preventDefault();
  if (searchQuery) {
    performSearch(searchQuery);
  }
  link.click(); // Forward the click to the <a> element to maintain the default behavior
}

// Function to modify the behavior based on the toggle state
function modifyDivLinks(inboxOnly) {
  const divs = document.querySelectorAll(
    '[gh="cl"] [data-tooltip-align="r"] [style]:has([tabindex="0"])'
  );

  divs.forEach((div) => {
    const link = div.querySelector("div > div > span > a");

    if (link) {
      let href = link.getAttribute("href");
      if (!href || !href.includes("#label/")) {
        return;
      }  // Skip if no label href

      let labelName = href.split("#label/")[1];
      labelName = decodeURIComponent(labelName).replace(/\+/g, " ");

      let searchQuery = `label:${labelName}`; // Base query

      if (inboxOnly) {
        if (!searchQuery.includes("in:inbox")) {
          // Add "in:inbox" when inbox-only mode is enabled
          searchQuery += ' in:inbox';
          href += "+in%3Ainbox";  // Update href
        }
      } else {
        // Remove "in:inbox" if inbox-only mode is off
        searchQuery = searchQuery.replace(/\s*in:inbox/g, '');
        href = href.replace(/\+in%3Ainbox/g, "");  // Clean href
      }

      // Remove the previous event listener before attaching a new one
      div.removeEventListener('click', div._listener);

      // Create a new listener and attach it to the div
      const listener = (event) => handleDivClick(event, link, searchQuery);
      div.addEventListener('click', listener);

      // Store the listener so it can be removed next time
      div._listener = listener;

      // Update the link's href
      link.setAttribute("href", href);
    }
  });
}

// Function to initialize the extension
function initExtension() {
  insertToggle();
  const toggle = document.getElementById("inboxToggle");
  if (toggle) {
    chrome.storage.sync.get(['inboxOnly'], function(result) {
      const inboxOnly = result.inboxOnly !== undefined ? result.inboxOnly : true;
      toggle.checked = inboxOnly;
      modifyDivLinks(inboxOnly);
    });
  }
}

// Create a MutationObserver to observe changes in the DOM
const observer = new MutationObserver(() => {
  const labelsSection = document.querySelector('.aAw span[role="heading"]');
  if (labelsSection) {
    initExtension();
  }
});

// Start observing the Gmail body or a specific container
const targetNode = document.body;
observer.observe(targetNode, { childList: true, subtree: true });

// Re-run modifyDivLinks periodically to catch any dynamically added elements
setInterval(() => {
  const toggle = document.getElementById("inboxToggle");
  if (toggle) {
    modifyDivLinks(toggle.checked);
  }
}, 2000);
