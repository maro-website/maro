const menuButton = document.querySelector('.mobile-menu');
const navigation = document.querySelector('.guide-aside');
const navLinks = [...document.querySelectorAll('.guide-aside a[href^="#"]')];
const sections = [...document.querySelectorAll('main section[id]')];
const copyButton = document.querySelector('.copy-button');
const prompt = document.querySelector('#starter-prompt');

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  navigation?.classList.toggle('is-open', !isOpen);
});

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    navigation?.classList.remove('is-open');
  });
});

const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navLinks.forEach((link) => {
      const active = link.getAttribute('href') === `#${visible.target.id}`;
      link.toggleAttribute('aria-current', active);
    });
  },
  { rootMargin: '-20% 0px -65% 0px', threshold: [0, 0.25, 0.6] }
);

sections.forEach((section) => observer.observe(section));

copyButton?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(prompt.textContent.trim());
    copyButton.textContent = 'Copied';
    setTimeout(() => { copyButton.textContent = 'Copy'; }, 1600);
  } catch {
    copyButton.textContent = 'Select text';
    const range = document.createRange();
    range.selectNodeContents(prompt);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  }
});
