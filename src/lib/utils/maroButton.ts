// Playful, ever-changing label for the "+ maro" button. A different one shows
// on each refresh for a bit of brand personality.
export const MARO_BUTTON_LABELS = [
  "maro naj web",
  "maro naj logo",
  "maro naj reklam",
  "maro naj muzik",
  "maro naj video",
  "maro diqka",
  "maro sot",
  "maro sa se kan maru",
  "maro pak",
  "maro shume",
  "maro naj brend",
  "maro naj app",
  "maro naj dizajn",
  "maro naj Foto",
  "maro",
];

export function randomMaroLabel(): string {
  return MARO_BUTTON_LABELS[Math.floor(Math.random() * MARO_BUTTON_LABELS.length)];
}
