# NOMA Coffee / Case Study 01

All 13 original images and the original PDF have already been copied here. No
placement step is needed. Original images are byte-for-byte copies, not PDF
extractions. Replace an asset at the same path to update it without editing a
component; update dimensions in the data object if a replacement changes size.

## Exact asset paths

Relative to this directory:

```text
input/
  NOMA_PACKAGING_ATTACHMENT.png
renders/
  test-01/
    test01-chatgpt.png
    test01-nanobananapro.jpg
    test01-maro-marobrainoff.png
    test01-maro-marobrainon.png
  test-02/
    test02-chatgpt.png
    test02-nanobananapro.jpg
    test02-maro-marobrainoff.png
    test02-maro-marobrainon.png
  test-03/
    test03-chatgpt.png
    test03-nanobananapro.jpg
    test03-maro-marobrainoff.png
    test03-maro-marobrainon.png
evidence/
  maro-casestudy-01.pdf
```

The URL prefix is `/case-studies/noma-coffee/`.

## Verified mapping

| Filename suffix | Setup | Original dimensions |
| --- | --- | --- |
| `chatgpt.png` | ChatGPT / High | 1122 x 1402 |
| `nanobananapro.jpg` | Gemini / Nano Banana Pro | 1686 x 2528 |
| `maro-marobrainoff.png` | maro.al v1 / maroBrain OFF | 1024 x 1536 |
| `maro-marobrainon.png` | maro.al v1 / maroBrain ON | 1024 x 1536 |

`test01` = Product Hero; `test02` = Lifestyle; `test03` = Creative Campaign.
Input dimensions: 1024 x 1536. The supplied one-page PDF was inspected visually
and its prompts extracted as text. All twelve mappings match the filenames.

## Evidence and provenance

The PDF is evidence/content, not a design reference. Its visible contents are
three prompts, one shared product attachment, setup labels, and twelve outputs.
It contains no generation timestamps, seed values, internal model identifiers,
or complete maroBrain form. These are not inferred.

The author supplied the first-generation/no-selection declaration and the
maroBrain summary separately. The UI explicitly records this distinction. The
experiment date remains `null`. The underlying model for maro.al v1 remains
`null`. No scores or winner are assigned.

Put additional reviewed PDFs or screenshots in `evidence/`, e.g.
`test01-chatgpt-settings.png`, then add their local URL, title, and `pdf`/`image`
type to `evidence` in `src/data/case-studies/noma-coffee.ts`. Do not add secrets,
private account details, hidden prompts, or platform configuration. Evidence is
linked only inside the expandable methodology section; it is not preloaded.

## Adding another study

1. Add originals under `public/case-studies/<slug>/` using the same input,
   renders, and evidence convention.
2. Add one `CaseStudy` object under `src/data/case-studies/` with assets,
   dimensions, exact prompts, ordered setups, provenance, and optional date.
3. Register that object in `src/data/case-studies/index.ts`.

The archive, counts, filters, static route, metadata, comparisons, and matrix
render from that registry. Placeholder teasers do not contribute to counts or
load future assets. The current viewer supports image experiments; audio,
video, and interactive web evidence will need media-specific viewers when
actual studies for those modules are added.

## Image behavior

Next Image serves responsive, lazy-loaded display images. Covers and the small
header reference load eagerly. Comparisons preserve full frames with contain,
never crop to disguise aspect ratios. Original files load only when inspected.
The single-image viewer supports actual pixel size with scrolling. The divider
appears only when original width and height match exactly. Missing assets show
an explicit filename placeholder. The archive cover is editorially cropped;
all experimental output displays preserve the full image.

This is a local repository implementation. Nothing is deployed by these files.
