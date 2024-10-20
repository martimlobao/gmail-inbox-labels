// Function to insert the round slider toggle beside the "Labels" header
function insertToggle() {
  // Avoid inserting the toggle multiple times by checking if it already exists
  if (document.getElementById("inboxToggle")) {
    return;
  }

  const labelsHeader = document.querySelector('.aAw span[role="heading"]');

  if (labelsHeader) {
    // Create the round slider switch HTML
    const toggleContainer = document.createElement("div");
    // toggleContainer.classList.add('TO');  // Parent class matching the Gmail style

    toggleContainer.innerHTML = `
      <div class="aAv toggle-content">
        <span class="toggle-label">Inbox only</span>
        <label class="switch">
          <input type="checkbox" id="inboxToggle" checked>
          <span class="slider round"></span>
        </label>
      </div>
    `;

    // Insert the toggle switch beside the "Labels" header
    labelsHeader.parentNode.insertBefore(
      toggleContainer,
      labelsHeader.nextSibling
    );

    // Add event listener to handle toggle state
    const toggle = document.getElementById("inboxToggle");
    toggle.addEventListener("change", function () {
      if (toggle.checked) {
        modifyDivLinks(true); // Inbox only
      } else {
        modifyDivLinks(false); // Show all emails
      }
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
  // Check if the click is on the label dropdown settings (three dots)
  if (event.target.closest(".pM")) {
    return;
  }

  event.preventDefault();
  performSearch(searchQuery);
  link.click(); // Forward the click to the <a> element to maintain the default behavior
}

// Function to modify the behavior based on the toggle state
function modifyDivLinks(inboxOnly = true) {
  const divs = document.querySelectorAll(
    '[gh="cl"] [data-tooltip-align="r"] [style]:has([tabindex="0"])'
  );

  if (divs.length > 0) {
    divs.forEach((div) => {
      const link = div.querySelector("div > div > span > a");

      if (link) {
        let href = link.getAttribute("href");

        if (href && href.includes("#label/") && !href.includes("in%3Ainbox")) {
          let labelName = href.split("#label/")[1];
          labelName = decodeURIComponent(labelName).replace(/\+/g, " ");

          const searchQuery =
            `label:${labelName}` + (inboxOnly ? " in:inbox" : "");
          const modifiedHref = inboxOnly
            ? href + "+in%3Ainbox"
            : href.replace("+in%3Ainbox", "");

          link.setAttribute("href", modifiedHref);

          // Attach the click event listener to the entire <div>
          div.addEventListener("click", function (event) {
            handleDivClick(event, link, searchQuery);
          });
        }
      }
    });
  }
}

// Create a MutationObserver to observe changes in the DOM
const observer = new MutationObserver(() => {
  const labelsSection = document.querySelector('.aAw span[role="heading"]');
  if (labelsSection) {
    insertToggle(); // Insert the toggle when the labels section is found
    modifyDivLinks(); // Default to inbox-only emails on first load
  }
});

// Start observing the Gmail body or a specific container
const targetNode = document.body;
observer.observe(targetNode, { childList: true, subtree: true });
