# SRM Auto Login

Automatically logs into SRM Google accounts after session timeout, eliminating repeated password entry on desktop and laptop devices.

## Download

**[Download latest release →](https://github.com/thenabbu/srm-auto-login/releases/latest)**

## Install

Manual install is the only supported install method for now.

### Chrome / Chromium

Works with Chrome, Edge, Brave, and other Chromium-based browsers.

1. Download the ZIP from the link above and unzip it
2. Open your browser and go to `chrome://extensions`
3. Turn on **Developer mode** using the toggle in the top right
4. Click **Load unpacked** and select the unzipped folder
5. Congrats! You have installed the extension.
6. Click on it, enter your SRM email and password, hit **Save account**
7. Done!

### Firefox / Firefox-Based Browsers

1. Download and unzip the latest release
2. Open Firefox and go to `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select `manifest.json` from the unzipped folder
5. Save one or more SRM accounts from the extension popup


> Auto-login is active immediately on the next visit to `accounts.google.com`.

## Accounts

You can save multiple SRM accounts. Passwords are visible only while you are typing or replacing them. After saving, the popup only shows the email address; a saved password can be deleted or replaced, but not viewed.

## Privacy

Credentials are stored in extension local storage - local to your browser only, never sent anywhere.
The extension only runs on `accounts.google.com`.

## Compatibility

Supports Chromium browsers and Firefox-based browsers. Tested on Google's current login flow. If Google updates their DOM the selectors in `content.js` may need updating.
