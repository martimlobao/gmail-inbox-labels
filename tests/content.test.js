const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

// SOURCE allows the same regression to be run against the previous script.
const source = fs.readFileSync(process.env.SOURCE || 'content.js', 'utf8');

function setup(t, { inboxOnly = true, href = '#label/%E2%80%A2+Newsletters' } = {}) {
  const dom = new JSDOM(`
    <div class="aAw"><span role="heading">Labels</span></div>
    <input aria-label="Search mail">
    <div gh="cl"><div data-tooltip-align="r">
      <div style="margin-left:0px">
        <div class="icon"></div>
        <div><span><a tabindex="0">• Newsletters</a></span></div>
        <div class="pM"><span class="menu-icon">Menu</span></div>
      </div>
    </div></div>`, { url: 'https://mail.google.com/mail/u/0/#inbox', runScripts: 'outside-only' });
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
  return { window, document, link, click, query, writes, nativeClicks: () => nativeClicks };
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
