# LaunchPad Privacy Policy

**Effective date:** July 25, 2026

LaunchPad is a browser extension that provides a customizable new tab page, global search, search-engine shortcuts, bookmark search, quick links, and wallpaper features. This policy explains what information LaunchPad processes, why it is processed, and when it is sent to third-party services.

## Summary

- LaunchPad does not sell user data or use it for advertising.
- Most preferences and caches are stored locally in the browser.
- LaunchPad does not collect webpage content for analytics or tracking.
- Some features send data to the third-party service selected by the user. These features are described below.

## Information Processed Locally

LaunchPad stores the following data in the browser's extension storage to provide its features:

- Display preferences, including clock, color, background, and wallpaper settings.
- Search-engine configuration, shortcuts, and the selected default engine.
- Quick links, groups, and favorite wallpaper entries.
- Website favicon and wallpaper caches.
- Configuration files selected by the user for import or generated for export.
- Bookmark titles and URLs needed for bookmark search and quick-link recommendations.
- Browser top sites used to offer optional quick-link recommendations.

This locally stored data remains in the browser until it is changed, cleared, or the extension is removed. LaunchPad does not send bookmarks, top sites, or locally stored settings to the developer for analytics or advertising.

## Data Sent to Third-Party Services

LaunchPad makes network requests only when a user uses a corresponding feature. The selected provider may receive the request data and standard network metadata, such as the user's IP address, under that provider's own privacy policy.

### Search and AI Services

When a user searches, LaunchPad opens the selected search engine with the entered query. When search suggestions are enabled, the entered query may be sent to Baidu, Google, or Bing to retrieve suggestions.

When a user selects a supported AI service, LaunchPad opens that service with the entered prompt. For compatible AI websites, LaunchPad may place the prompt into the chat input and, where the user has enabled it, attempt to send the prompt. LaunchPad does not send AI prompts to the developer.

### Online Wallpapers and Recommendations

When a user selects an online wallpaper source, LaunchPad requests wallpaper data or images from the selected provider, such as Bing, Picsum, or Wallhaven. Wallhaven search keywords and an optional Wallhaven API key are sent to Wallhaven only when that source is used.

LaunchPad can also request its quick-link recommendation list from GitHub and optional trending links from Hacker News. These requests do not include the user's bookmarks or browsing history.

### Custom Wallpaper Uploads

If a user explicitly chooses a local image and uses the custom wallpaper upload feature, the image file is uploaded to Tencent Cloud Object Storage (COS) so it can be used as a wallpaper URL. Do not upload sensitive, private, or confidential images.

Removing a wallpaper from LaunchPad removes the local reference and cache. It does not necessarily delete a previously uploaded file from Tencent Cloud Object Storage. Users who need an uploaded image removed should contact the project through the support channel below.

## Website Access

LaunchPad uses a packaged content script on web pages to make the `Alt + S` global search overlay available. The script does not collect webpage text, images, form contents, browsing activity, clicks, or keystrokes for tracking.

On supported AI websites, LaunchPad accesses the relevant chat input only after the user has chosen that AI service and submitted a query through LaunchPad. This access is used solely to fill the user's requested prompt.

## Data Sharing and Sale

LaunchPad does not sell personal data. LaunchPad does not use or transfer user data for advertising, profiling, creditworthiness, lending, or purposes unrelated to the extension's features.

Data is shared only with the third-party services necessary to carry out a feature the user chooses, such as a search engine, AI service, wallpaper provider, or Tencent Cloud Object Storage for a user-requested image upload.

## Security

LaunchPad uses HTTPS for its network requests where supported by the service provider. No method of electronic storage or transmission is completely secure. Users should avoid entering sensitive information into search queries, AI prompts, or uploaded wallpaper images.

## Changes to This Policy

We may update this policy when LaunchPad's data practices change. The effective date at the top of this page will be updated when changes are made.

## Contact

For privacy questions or deletion requests related to custom wallpaper uploads, open an issue at:

https://github.com/rururunu/init-tab/issues
