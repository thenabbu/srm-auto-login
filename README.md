# SRM Auto Login

Automatically logs into the SRM Google account after session timeout, eliminating repeated password entry on desktop and laptop devices. that auto-fills and submits your SRM Google login.

## Download

**[Download latest release →](https://github.com/thenabbu/srm-auto-login/releases/latest)**

## Install

> Takes about 30 seconds. You only do this once.

1. Download the ZIP from the link above and unzip it
2. Open Chrome and go to `chrome://extensions`
3. Turn on **Developer mode** using the toggle in the top right
4. Click **Load unpacked** and select the unzipped folder
5. Congrats! You have installed the extension.
6. Click on it, enter your credentials, hit **Save**
7. Done!

Auto-login is active immediately on the next visit to `accounts.google.com`.

## Privacy

Credentials are stored in `chrome.storage.local` - local to your browser only, never sent anywhere.
The extension only runs on `accounts.google.com`.

## Compatibility

Tested on Google's current login flow. If Google updates their DOM the selectors in `content.js` may need updating.