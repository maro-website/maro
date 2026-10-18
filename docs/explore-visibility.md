# Temporary Explore visibility

`src/lib/explore/visibility.ts` controls all Explore entry points. `EXPLORE_VISIBLE` is temporarily `false` for the October 18, 2026 release.

Desktop/mobile navigation, publishing on generation results and creation lightboxes, the public profile link, library publications and saved community feed are hidden. Existing `category=published` library links show personal creations. Explore, creation permalink (`/c`) and creator profile (`/u`) pages temporarily redirect to Hub with HTTP 307. Stored Explore remix drafts are not consumed while hidden. Personal favourites remain available.

To restore the feature, set `EXPLORE_VISIBLE` to `true`, validate and deploy WEB. All Explore pages, components, API handlers, stored publications and database schema are retained. This release performs no data migration or deletion.
