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
    // If the click is on the dropdown, do nothing and let Gmail handle it
    return;
  }

  event.preventDefault(); // Prevent the default behavior
  performSearch(searchQuery); // Trigger the search
  link.click(); // Forward the click to the <a> element to maintain the default behavior
}

// Function to modify the behavior based on matching div elements
function modifyDivLinks() {
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

          const searchQuery = `label:${labelName} in:inbox`;
          const modifiedHref = href + "+in%3Ainbox";

          // Set the new href
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
  modifyDivLinks();
});

// Start observing the Gmail body or a specific container
const targetNode = document.body;
observer.observe(targetNode, { childList: true, subtree: true });
