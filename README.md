# Gmail Inbox Labels Chrome Extension

<!-- markdownlint-disable-next-line no-inline-html -->
<p align="center"><img src="images/demo.gif" alt="Extension demo"/></p>

**Bring Back Inbox's Best Feature to Gmail!**

This Chrome extension replicates a beloved feature from Google's now-deprecated Inbox app: when you click a label in Gmail's sidebar, you'll only see emails that are both in the inbox and have that label. This makes it easy to process your inbox by label, just like you could in Inbox.

The motivation behind this extension is to help users sort through emails more efficiently by allowing them to go through each bundle of inbox emails separately. With this extension, you can filter emails by label while ensuring that only inbox emails are displayed, helping you prioritize and organize more effectively.

## Manual Installation

To install the extension without using the Chrome Web Store, you can manually install it as a `.crx` file. Alternatively, you can download this repo and load the extension as an "unpacked extension" directly.

### 1. Download the `.crx` File

Download the extension's `.crx` file from [here](https://github.com/martimlobao/gmail-inbox-labels/releases).

### 2. Enable Developer Mode in Chrome

1. Open Google Chrome.
2. Go to `chrome://extensions/`.
3. Enable **Developer Mode** by toggling the switch in the top-right corner.

### 3. Install the Extension

1. Drag and drop the `.crx` file you downloaded into the `chrome://extensions/` page.
2. You may see a confirmation dialog. Click **Add Extension** to complete the installation.

The extension should now be installed and ready to use.

## Development

### Prerequisites

- Node.js (v18 or higher)
- A Chrome extension PEM key for signing

### Local Development

1. Clone the repository:

   ```bash
   git clone https://github.com/martimlobao/gmail-inbox-labels.git
   cd gmail-inbox-labels
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Load the extension in Chrome
   - Open `chrome://extensions/`
   - Enable Developer Mode
   - Click "Load unpacked" and select the project directory

### Version Management

Update version in both `manifest.json` and `package.json`:

```bash
npm run version 1.2.3
```

### Local Build

Build with your PEM key:

```bash
./scripts/build.sh /path/to/your/key.pem
```

### Release Process

1. **Update version:**

   ```bash
   npm run version 1.2.3
   ```

2. **Commit and tag:**

   ```bash
   git add .
   git commit -m "Bump version to 1.2.3"
   git tag v1.2.3
   git push origin main
   git push origin v1.2.3
   ```

3. **GitHub Actions will automatically:**
   - Build the extension
   - Create a release
   - Upload `.crx` and `.zip` files

### GitHub Actions Setup

1. Add your PEM key as a repository secret:
   - Go to Settings → Secrets and variables → Actions
   - Create secret: `EXTENSION_PEM_KEY`
   - Paste your PEM key content

2. The workflow triggers on:
   - Version tags (e.g., `v1.2.3`)
   - Manual workflow dispatch

## File Structure

```text
gmail-inbox-labels/
├── .github/workflows/    # GitHub Actions workflows
├── scripts/              # Build scripts
│   ├── build.sh          # Local build script
│   └── version.js        # Version management script
├── images/               # Extension icons
├── content.js            # Main extension logic
├── styles.css            # Extension styles
├── manifest.json         # Extension manifest
└── package.json          # Project configuration
```
