const state = {
  language: 'zh',
  data: null,
};

const languageLabels = {
  zh: {
    navTitle: '資源導覽',
    sectionSubheading: '雙語介紹',
  },
  en: {
    navTitle: 'Navigate Resources',
    sectionSubheading: 'Bilingual Overview',
  },
};

const sidebar = document.querySelector('.sidebar');
const navLinks = document.querySelector('.nav-links');
const content = document.getElementById('content');
const sidebarToggle = document.querySelector('.sidebar-toggle');
const languageButtons = document.querySelectorAll('.language-toggle button');
const modalOverlay = document.querySelector('.modal-overlay');
const modalTitle = document.getElementById('modalTitle');
const modalSubtitle = document.getElementById('modalSubtitle');
const modalDescription = document.getElementById('modalDescription');
const modalTutorial = document.getElementById('modalTutorial');
const modalClose = document.getElementById('modalClose');
const modalLaunch = document.getElementById('modalLaunch');

async function loadResources() {
  try {
    const response = await fetch('data/resources.json');
    state.data = await response.json();
    renderAll();
  } catch (error) {
    console.error('Unable to load resources.json', error);
    content.innerHTML = `<p>⚠️ 無法載入資源資料。請稍後再試。</p>`;
  }
}

function renderAll() {
  if (!state.data) return;
  renderSidebar();
  renderContent();
  document.documentElement.lang = state.language === 'zh' ? 'zh-Hant' : 'en';
}

function renderSidebar() {
  const { sections } = state.data;
  const labels = languageLabels[state.language];
  sidebar.querySelector('h2').textContent = labels.navTitle;
  navLinks.innerHTML = '';

  sections.forEach((section) => {
    const sectionItem = document.createElement('li');
    const sectionLink = document.createElement('a');
    sectionLink.href = `#${section.id}`;
    sectionLink.textContent = section.title[state.language];
    sectionItem.appendChild(sectionLink);

    const categoryList = document.createElement('div');
    categoryList.className = 'category-list';

    section.categories.forEach((category) => {
      const categoryLink = document.createElement('a');
      categoryLink.href = `#${section.id}-${category.id}`;
      categoryLink.textContent = category.title[state.language];
      categoryList.appendChild(categoryLink);
    });

    sectionItem.appendChild(categoryList);
    navLinks.appendChild(sectionItem);
  });
}

function renderContent() {
  const { sections } = state.data;
  content.innerHTML = '';

  sections.forEach((section) => {
    const sectionElement = document.createElement('section');
    sectionElement.className = 'section';
    sectionElement.id = section.id;

    const heading = document.createElement('h2');
    heading.textContent = section.title[state.language];

    const subheading = document.createElement('p');
    subheading.className = 'section-subtitle';
    const otherLanguage = state.language === 'zh' ? 'en' : 'zh';
    subheading.textContent = section.title[otherLanguage];

    sectionElement.append(heading, subheading);

    section.categories.forEach((category) => {
      const categoryElement = document.createElement('article');
      categoryElement.className = 'category';
      categoryElement.id = `${section.id}-${category.id}`;

      const categoryHeading = document.createElement('h3');
      categoryHeading.textContent = category.title[state.language];
      const categorySubheading = document.createElement('p');
      categorySubheading.className = 'section-subtitle';
      categorySubheading.textContent = category.title[state.language === 'zh' ? 'en' : 'zh'];

      const cardsGrid = document.createElement('div');
      cardsGrid.className = 'cards-grid';

      category.items.forEach((item) => {
        const card = createItemCard(item, section, category);
        cardsGrid.appendChild(card);
      });

      categoryElement.append(categoryHeading, categorySubheading, cardsGrid);
      sectionElement.appendChild(categoryElement);
    });

    content.appendChild(sectionElement);
  });
}

function createItemCard(item, section, category) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'item-card';
  card.setAttribute('data-item-id', item.id);
  card.addEventListener('click', () => openModal(item, section, category));

  const title = document.createElement('h4');
  title.textContent = item.name[state.language];
  const subtitle = document.createElement('span');
  subtitle.className = 'item-subtitle';
  subtitle.textContent = item.name[state.language === 'zh' ? 'en' : 'zh'];

  const description = document.createElement('p');
  description.textContent = item.description[state.language];

  card.append(title, subtitle, description);
  return card;
}

function openModal(item, section, category) {
  modalTitle.textContent = item.name[state.language];
  modalSubtitle.textContent = `${section.title[state.language]} • ${category.title[state.language]}`;
  modalDescription.textContent = item.description[state.language];

  modalTutorial.innerHTML = '';
  if (item.tutorialUrl && item.tutorialUrl !== '影片製作中') {
    const iframe = document.createElement('iframe');
    iframe.src = item.tutorialUrl;
    iframe.title = `${item.name[state.language]} tutorial`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    modalTutorial.appendChild(iframe);
  } else {
    const placeholder = document.createElement('p');
    placeholder.className = 'tutorial-placeholder';
    placeholder.textContent = '影片製作中';
    modalTutorial.appendChild(placeholder);
  }

  modalLaunch.href = item.appUrl;
  modalOverlay.classList.add('active');
  modalOverlay.setAttribute('aria-hidden', 'false');
  modalClose.focus();
}

function closeModal() {
  modalOverlay.classList.remove('active');
  modalOverlay.setAttribute('aria-hidden', 'true');
  modalTutorial.innerHTML = '';
}

sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

languageButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const chosenLang = button.dataset.lang;
    if (state.language === chosenLang) return;
    state.language = chosenLang;
    languageButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
    renderAll();
  });
});

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (event) => {
  if (event.target === modalOverlay) {
    closeModal();
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modalOverlay.classList.contains('active')) {
    closeModal();
  }
});

loadResources();
