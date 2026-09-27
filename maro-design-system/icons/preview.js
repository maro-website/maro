const icons = window.MARO_ICONS || [];
const grid = document.querySelector('#icon-grid');
const search = document.querySelector('#icon-search');
const resultCount = document.querySelector('#result-count');
const totalCount = document.querySelector('#total-count');
const emptyState = document.querySelector('#empty-state');
const toast = document.querySelector('.toast');
const categoryButtons = [...document.querySelectorAll('[data-category]')];
const toneButtons = [...document.querySelectorAll('[data-tone]')];

let activeCategory = 'all';
let activeTone = 'ink';
let toastTimer;

totalCount.textContent = icons.length;
document.querySelector('[data-category="all"] span').textContent = icons.length;

function normalize(value) {
  return value.toLocaleLowerCase('sq').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function filteredIcons() {
  const query = normalize(search.value.trim());
  return icons.filter((icon) => {
    const inCategory = activeCategory === 'all' || icon.category === activeCategory;
    const aliases = Array.isArray(icon.aliases) ? icon.aliases : icon.aliases ? [icon.aliases] : [];
    const terms = [icon.name, icon.category, ...aliases].map(normalize);
    const matchesQuery = !query || terms.some((term) => term.includes(query));
    return inCategory && matchesQuery;
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 1600);
}

async function copyPath(icon) {
  const path = `icons/${icon.file}`;
  try {
    await navigator.clipboard.writeText(path);
    showToast(`Copied ${path}`);
  } catch {
    showToast(path);
  }
}

function makeCard(icon) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'icon-card';
  card.dataset.category = icon.category;
  card.setAttribute('aria-label', `Copy path for ${icon.name}`);
  card.innerHTML = `
    <span class="icon-stage">
      <span class="icon-glyph" style="--icon: url('./${icon.file}')" aria-hidden="true"></span>
    </span>
    <span class="icon-meta">
      <strong>${icon.name}</strong>
      <span>${icon.category} · ${icon.source}</span>
    </span>
    <span class="copy-mark" aria-hidden="true">↗</span>
  `;
  card.addEventListener('click', () => copyPath(icon));
  return card;
}

function render() {
  const matches = filteredIcons();
  grid.replaceChildren(...matches.map(makeCard));
  grid.dataset.tone = activeTone;
  resultCount.textContent = `${matches.length} ${matches.length === 1 ? 'icon' : 'icons'}`;
  emptyState.hidden = matches.length !== 0;
}

search.addEventListener('input', render);

categoryButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeCategory = button.dataset.category;
    categoryButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    render();
  });
});

toneButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeTone = button.dataset.tone;
    toneButtons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    render();
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === '/' && document.activeElement !== search) {
    event.preventDefault();
    search.focus();
  }
  if (event.key === 'Escape' && document.activeElement === search) {
    search.value = '';
    search.blur();
    render();
  }
});

render();
