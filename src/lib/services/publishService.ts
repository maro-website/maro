export const PUBLISH_STEPS = [
  "Po e përgatisim website-in",
  "Po e publikojmë",
  "Website-i është live",
];

export function runPublish(onStep: (i: number) => void, onDone: () => void) {
  let i = 0;
  const step = () => {
    onStep(i);
    i++;
    if (i >= PUBLISH_STEPS.length) {
      setTimeout(onDone, 700);
      return;
    }
    setTimeout(step, 900);
  };
  step();
}
