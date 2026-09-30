const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

// SOURCE allows the same regression to be run against the previous script.
const source = fs.readFileSync(process.env.SOURCE || 'content.js', 'utf8');

function setup(t, { inboxOnly = true, href = '#label/%E2%80%A2+Newsletters', hash = '#inbox' } = {}) {
  const dom = new JSDOM(`
    <div class="aAw"><span role="heading">Labels</span></div>
    <input aria-label="Search mail">
    <div gh="cl"><div data-tooltip-align="r">
      <div style="margin-left:0px">
        <div class="icon"></div>
        <div><span><a tabindex="0">• Newsletters</a></span></div>
        <div class="pM"><span class="menu-icon">Menu</span></div>
      </div>
    </div></div>`, { url: `https://mail.google.com/mail/u/0/${hash}`, runScripts: 'outside-only' });
  t.after(() => {
    // Flush/disconnect the script observer before jsdom destroys its document.
    dom.window.disconnectObserver();
    dom.window.close();
  });
  const { window } = dom;
  const { document } = window;
  const link = document.querySelector('a');
  link.setAttribute('href', href);
  const writes = [];
  window.chrome = { storage: { sync: {
    get: (_keys, callback) => callback({ inboxOnly }),
    set: value => writes.push(value),
  } } };
  let nativeClicks = 0;
  // Gmail consumes label clicks and canonicalizes the search field itself.
  document.querySelector('[gh="cl"]').addEventListener('click', event => {
    if (event.target.closest('.pM')) return;
    event.preventDefault();
    nativeClicks++;
    window.location.hash = '#label/%E2%80%A2+Newsletters';
    document.querySelector('input[aria-label]').value = 'label:•-newsletters';
  });
  window.eval(source + '\nwindow.disconnectObserver = () => observer.disconnect();');
  window.initExtension();
  const click = (target = link, options = {}) => {
    const event = new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...options });
    target.dispatchEvent(event);
    return event;
  };
  const query = () => decodeURIComponent(window.location.hash.slice('#search/'.length));
  const toggle = checked => {
    document.getElementById('inboxToggle').checked = checked;
    document.getElementById('inboxToggle').dispatchEvent(new window.Event('change'));
  };
  return { window, document, link, click, query, toggle, writes, nativeClicks: () => nativeClicks };
}

test('spaced Unicode label stays an inbox search instead of reverting to native label navigation', t => {
  const page = setup(t);
  page.click();
  assert.equal(page.window.location.hash.startsWith('#search/'), true);
  assert.equal(page.query(), 'label:"• Newsletters" in:inbox');
  assert.equal(page.nativeClicks(), 0);
});

test('repeated clicks never mutate the label URL or accumulate inbox terms', t => {
  const page = setup(t);
  for (let i = 0; i < 5; i++) page.click();
  assert.equal(page.query(), 'label:"• Newsletters" in:inbox');
  assert.equal(page.link.getAttribute('href'), '#label/%E2%80%A2+Newsletters');
});

for (const [route, label] of [
  ['%E2%80%A2%20Mare%20Nostrum%20Funds', '• Mare Nostrum Funds'],
  ['Projects%2FClient+A', 'Projects/Client A'],
  ['C%2B%2B+News', 'C++ News'],
  ['Finance%26Tax', 'Finance&Tax'],
  ['Updates%E2%80%8B', 'Updates\u200b'],
  ['Inbox+in%3Ainbox', 'Inbox in:inbox'],
  ['Quotes%22+and+%5Cslashes', 'Quotes\\" and \\\\slashes'],
]) {
  test(`preserves label characters: ${route}`, t => {
    const page = setup(t, { href: `https://mail.google.com/mail/u/1/#label/${route}` });
    page.click();
    assert.equal(page.query(), `label:"${label}" in:inbox`);
  });
}

test('icon and row whitespace clicks use the same inbox search', t => {
  const page = setup(t);
  page.click(page.document.querySelector('.icon'));
  assert.equal(page.query(), 'label:"• Newsletters" in:inbox');
  page.click(page.document.querySelector('[data-tooltip-align]'));
  assert.equal(page.nativeClicks(), 0);
});

test('newly inserted label rows work immediately', t => {
  const page = setup(t);
  const row = page.document.querySelector('[data-tooltip-align]').cloneNode(true);
  row.querySelector('a').setAttribute('href', '#label/New+Label');
  page.document.querySelector('[gh="cl"]').append(row);
  page.click(row.querySelector('a'));
  assert.equal(page.query(), 'label:"New Label" in:inbox');
});

test('disabled toggle preserves Gmail navigation; changes persist and enable interception', t => {
  const page = setup(t, { inboxOnly: false });
  page.click();
  assert.equal(page.nativeClicks(), 1);
  const toggle = page.document.getElementById('inboxToggle');
  toggle.checked = true;
  toggle.dispatchEvent(new page.window.Event('change'));
  assert.equal(page.writes[0].inboxOnly, true);
  page.click();
  assert.equal(page.nativeClicks(), 1);
  assert.equal(page.query(), 'label:"• Newsletters" in:inbox');
});

test('label menu clicks are not intercepted', t => {
  const page = setup(t);
  const event = page.click(page.document.querySelector('.menu-icon'));
  assert.equal(event.defaultPrevented, false);
  assert.equal(page.window.location.hash, '#inbox');
});

for (const options of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
  test(`modified clicks reach Gmail: ${JSON.stringify(options)}`, t => {
    const page = setup(t);
    page.click(page.link, options);
    assert.equal(page.nativeClicks(), 1);
  });
}

test('malformed routes and system links fall through safely', t => {
  const page = setup(t, { href: '#label/%ZZ' });
  page.click();
  assert.equal(page.nativeClicks(), 1);
  page.link.setAttribute('href', '#inbox');
  page.click();
  assert.equal(page.nativeClicks(), 2);
});

test('turning on refreshes a native label view; turning off removes its inbox filter', t => {
  const page = setup(t, { inboxOnly: false, hash: '#label/%E2%80%A2+Newsletters' });
  page.toggle(true);
  assert.equal(page.query(), 'label:"• Newsletters" in:inbox');
  page.toggle(false);
  assert.equal(page.query(), 'label:"• Newsletters"');
  page.toggle(true);
  assert.equal(page.query(), 'label:"• Newsletters" in:inbox');
});

test('compatible manual searches preserve their other filters and quoted text', t => {
  const query = 'label:"C++ News" from:example.com subject:"in:inbox (weekly)" is:unread';
  const page = setup(t, { inboxOnly: false, hash: `#search/${encodeURIComponent(query)}` });
  page.toggle(true);
  assert.equal(page.query(), `${query} in:inbox`);
  page.toggle(false);
  assert.equal(page.query(), query);
});

test('removes only positive standalone inbox operators, including duplicates and quoted values', t => {
  const page = setup(t, { hash: `#search/${encodeURIComponent('"in:inbox" label:"Inbox in:inbox" IN:INBOX in:"inbox" -in:trash')}` });
  page.toggle(false);
  assert.equal(page.query(), '"in:inbox" label:"Inbox in:inbox" -in:trash');
});

for (const query of [
  'in:spam', 'in:"spam" label:Newsletters', 'IN:TRASH', 'in:sent', 'in:anywhere',
  'is:spam', 'label:trash', '-in:inbox is:unread', '-in:"inbox"',
  '{label:A label:B}', '(from:a from:b)',
]) {
  test(`adds a global inbox intersection and restores the original search: ${query}`, t => {
    const hash = `#search/${encodeURIComponent(query)}`;
    const page = setup(t, { inboxOnly: false, hash });
    page.toggle(true);
    assert.equal(page.query(), `${query} in:inbox`);
    assert.equal(page.writes[0].inboxOnly, true);
    page.toggle(false);
    assert.equal(page.window.location.hash, hash);
  });
}

for (const query of ['from:a OR from:b', 'in:inbox OR in:spam', 'from:a AND from:b', 'from:a | from:b']) {
  test(`groups Boolean search before applying the inbox filter: ${query}`, t => {
    const page = setup(t, { inboxOnly: false, hash: `#search/${encodeURIComponent(query)}` });
    page.toggle(true);
    assert.equal(page.query(), `(${query}) in:inbox`);
    page.toggle(false);
    assert.equal(page.query(), query);
  });
}

test('date filters remain intact when toggling', t => {
  const query = 'after:2026/09/01 before:2026/10/01 label:"• Newsletters"';
  const page = setup(t, { inboxOnly: false, hash: `#search/${encodeURIComponent(query)}` });
  page.toggle(true);
  assert.equal(page.query(), `${query} in:inbox`);
  page.toggle(false);
  assert.equal(page.query(), query);
});

test('after reload only the outer inbox constraint is removed from a grouped search', t => {
  const page = setup(t, { hash: `#search/${encodeURIComponent('(in:inbox OR in:spam) in:inbox')}` });
  page.toggle(false);
  assert.equal(page.query(), '(in:inbox OR in:spam)');
});

test('an inbox term inside an OR branch is left intact when turning off', t => {
  const query = 'in:inbox OR from:a';
  const page = setup(t, { hash: `#search/${encodeURIComponent(query)}` });
  page.toggle(false);
  assert.equal(page.query(), query);
});

test('manual edits after enabling are preserved when turning off', t => {
  const page = setup(t, { inboxOnly: false, hash: '#search/label%3ANewsletters' });
  page.toggle(true);
  page.window.location.hash = `#search/${encodeURIComponent('from:a in:inbox after:2026/09/01')}`;
  page.toggle(false);
  assert.equal(page.query(), 'from:a after:2026/09/01');
});

for (const query of ['subject:"unfinished', '(from:a OR from:b', '{from:a)', 'from:a\\']) {
  test(`malformed search is left unchanged: ${query}`, t => {
    const hash = `#search/${encodeURIComponent(query)}`;
    const page = setup(t, { inboxOnly: false, hash });
    page.toggle(true);
    assert.equal(page.window.location.hash, hash);
  });
}

for (const hash of ['#inbox', '#spam', '#trash', '#sent', '#all', '#label/Newsletters/0123456789abcdef', '#search/hello/0123456789abcdef', '#search/%ZZ']) {
  test(`keeps folder, open message or malformed route: ${hash}`, t => {
    const page = setup(t, { inboxOnly: false, hash });
    page.toggle(true);
    assert.equal(page.window.location.hash, hash);
    page.toggle(false);
    assert.equal(page.window.location.hash, hash);
  });
}

test('refreshing a paginated search resets to its first page', t => {
  const page = setup(t, { inboxOnly: false, hash: '#search/label%3ANewsletters/p2' });
  page.toggle(true);
  assert.equal(page.query(), 'label:Newsletters in:inbox');
});

test('removing the sole inbox search term opens All Mail', t => {
  const page = setup(t, { hash: '#search/in%3Ainbox' });
  page.toggle(false);
  assert.equal(page.window.location.hash, '#all');
});

test('stored setting initializes without changing the current view', t => {
  const page = setup(t, { inboxOnly: true, hash: '#label/Newsletters' });
  assert.equal(page.document.getElementById('inboxToggle').checked, true);
  assert.equal(page.window.location.hash, '#label/Newsletters');
});
