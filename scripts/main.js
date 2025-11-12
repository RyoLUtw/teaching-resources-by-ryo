const state = {
  language: 'zh',
  data: null,
};

const languageLabels = {
  zh: {
    navTitle: '資源導覽',
    loadError: '⚠️ 無法載入資源資料。請稍後再試。',
    tutorialPlaceholder: '影片製作中',
    modalClose: '返回',
    modalLaunch: '立即體驗',
    modalAssistant: '開啟小助理',
    categoryPlaceholder: '開發中',
    sectionPlaceholder: '開發中',
  },
  en: {
    navTitle: 'Navigate Resources',
    loadError: '⚠️ Unable to load resources. Please try again later.',
    tutorialPlaceholder: 'Tutorial coming soon',
    modalClose: 'Close',
    modalLaunch: 'Try it',
    modalAssistant: 'Open Assistant',
    categoryPlaceholder: '開發中 (In development)',
    sectionPlaceholder: '開發中 (In development)',
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
const modalAssistant = document.getElementById('modalAssistant');

async function loadResources() {
  try {
    const response = await fetch('data/resources.json');
    state.data = await response.json();
    renderAll();
  } catch (error) {
    console.error('Unable to load resources.json', error);
    state.data = null;
    renderError();
  }
}

function renderAll() {
  if (!state.data) return;
  renderSidebar();
  renderContent();
  updateStaticTexts();
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

    const categories = Array.isArray(section.categories) ? section.categories : [];

    categories.forEach((category) => {
      const categoryLink = document.createElement('a');
      categoryLink.href = `#${section.id}-${category.id}`;
      categoryLink.textContent = category.title[state.language];
      categoryList.appendChild(categoryLink);
    });

    if (categories.length) {
      sectionItem.appendChild(categoryList);
    }
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
    sectionElement.append(heading);

    const labels = languageLabels[state.language];
    let sectionHasItems = false;
    const categories = Array.isArray(section.categories) ? section.categories : [];

    categories.forEach((category) => {
      const categoryElement = document.createElement('article');
      categoryElement.className = 'category';
      categoryElement.id = `${section.id}-${category.id}`;

      const categoryHeading = document.createElement('h3');
      categoryHeading.textContent = category.title[state.language];

      const cardsGrid = document.createElement('div');
      cardsGrid.className = 'cards-grid';

      const items = Array.isArray(category.items) ? category.items : [];

      if (items.length) {
        sectionHasItems = true;
        items.forEach((item) => {
          const card = createItemCard(item, section, category);
          cardsGrid.appendChild(card);
        });
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'placeholder-card';
        placeholder.textContent = labels.categoryPlaceholder;
        cardsGrid.classList.add('is-empty');
        cardsGrid.appendChild(placeholder);
      }

      categoryElement.append(categoryHeading, cardsGrid);
      sectionElement.appendChild(categoryElement);
    });

    if (!sectionHasItems) {
      const sectionPlaceholder = document.createElement('p');
      sectionPlaceholder.className = 'section-placeholder';
      sectionPlaceholder.textContent = labels.sectionPlaceholder;
      sectionElement.appendChild(sectionPlaceholder);
    }

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

  const description = document.createElement('p');
  description.textContent = item.description[state.language];

  card.append(title, description);
  return card;
}

function openModal(item, section, category) {
  modalTitle.textContent = item.name[state.language];
  modalSubtitle.textContent = `${section.title[state.language]} • ${category.title[state.language]}`;
  modalDescription.textContent = item.description[state.language];

  modalTutorial.innerHTML = '';
  if (item.tutorialUrl) {
    const iframe = document.createElement('iframe');
    iframe.src = item.tutorialUrl;
    iframe.title = `${item.name[state.language]} tutorial`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    modalTutorial.appendChild(iframe);
  } else {
    const placeholder = document.createElement('p');
    placeholder.className = 'tutorial-placeholder';
    placeholder.textContent = languageLabels[state.language].tutorialPlaceholder;
    modalTutorial.appendChild(placeholder);
  }

  modalLaunch.href = item.appUrl;
  if (item.assistantChatbotUrl) {
    modalAssistant.href = item.assistantChatbotUrl;
    modalAssistant.classList.remove('is-hidden');
  } else {
    modalAssistant.href = '#';
    modalAssistant.classList.add('is-hidden');
  }
  modalOverlay.classList.add('active');
  modalOverlay.setAttribute('aria-hidden', 'false');
  modalClose.focus();
}

function closeModal() {
  modalOverlay.classList.remove('active');
  modalOverlay.setAttribute('aria-hidden', 'true');
  modalTutorial.innerHTML = '';
}

function updateStaticTexts() {
  const labels = languageLabels[state.language];
  sidebar.querySelector('h2').textContent = labels.navTitle;
  modalClose.textContent = labels.modalClose;
  modalLaunch.textContent = labels.modalLaunch;
  modalAssistant.textContent = labels.modalAssistant;
}

function renderError() {
  const labels = languageLabels[state.language];
  sidebar.querySelector('h2').textContent = labels.navTitle;
  navLinks.innerHTML = '';
  content.innerHTML = `<p>${labels.loadError}</p>`;
  document.documentElement.lang = state.language === 'zh' ? 'zh-Hant' : 'en';
  modalClose.textContent = labels.modalClose;
  modalLaunch.textContent = labels.modalLaunch;
  modalAssistant.textContent = labels.modalAssistant;
  modalAssistant.classList.add('is-hidden');
  modalAssistant.href = '#';
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
    if (state.data) {
      renderAll();
    } else {
      renderError();
    }
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
