# Local logo preview fonts

These nine WOFF2 files are the existing Google Fonts Latin subsets captured from the successful 22 October 2026 production build, using the same families and requested weights as the previous `next/font/google` configuration. Each font includes its upstream SIL Open Font License.

`previewFonts.ts` loads these files through `next/font/local`. This avoids build failures when Google returns a font URL without the extension expected by Next.js's Google font loader. No build-time font downloads are required. The family selection and exported preview class API remain unchanged. Latin includes the Albanian characters ë and ç.

Original upstream sources and licensing: https://github.com/google/fonts/tree/main/ofl (family directories match the corresponding OFL filenames here).
