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
    modifyDivLinks(toggle.checked);
  });

  toggle.addEventListener("change", function () {
    chrome.storage.sync.set({inboxOnly: toggle.checked});
    modifyDivLinks(toggle.checked);
  });
}

// Function to perform the search
function performSearch(searchQuery) {
  const searchBox = document.querySelector('input[aria-label="Search mail"]');
  if (searchBox) {
    searchBox.value = searchQuery;
    searchBox.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
      code: "Enter",
      keyCode: 13,
    }));
  }
}

// Function to handle clicks on the entire div
function handleDivClick(event, link, searchQuery) {
  if (!event.target.closest(".pM")) {
    event.preventDefault();
    if (searchQuery) {
      performSearch(searchQuery);
    }
    link.click();
  }
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
      }

      let labelName = decodeURIComponent(href.split("#label/")[1]).replace(/\+/g, " ");
      let searchQuery = `label:${labelName}`;

      if (inboxOnly) {
        if (!searchQuery.includes("in:inbox")) {
          searchQuery += ' in:inbox';
          href += "+in%3Ainbox";
        }
      } else {
        searchQuery = searchQuery.replace(/\s*in:inbox/g, '');
        href = href.replace(/\+in%3Ainbox/g, "");
      }

      // Remove the previous event listener before attaching a new one
      div.removeEventListener('click', div._listener);
      const listener = (event) => handleDivClick(event, link, searchQuery);
      div.addEventListener('click', listener);
      div._listener = listener;

      link.setAttribute("href", href);
    }
  });
}

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

// Re-run modifyDivLinks periodically to catch any dynamically added elements
setInterval(() => {
  const toggle = document.getElementById("inboxToggle");
  if (toggle) {
    modifyDivLinks(toggle.checked);
  }
}, 2000);
