const jsonEditor = document.getElementById('jsonEditor');
const itemList = document.getElementById('itemList');
const reloadButton = document.getElementById('reloadJson');
const updateButton = document.getElementById('updateJson');
const downloadButton = document.getElementById('downloadJson');
const statusMessage = document.getElementById('editorStatus');
const sectionFilter = document.getElementById('sectionFilter');
const categoryFilter = document.getElementById('categoryFilter');
const addItemButton = document.getElementById('addItem');
const sectionOrderList = document.getElementById('sectionOrderList');
const categoryOrderList = document.getElementById('categoryOrderList');
const addModal = document.getElementById('addModal');
const addModalTitle = document.getElementById('addModalTitle');
const addModalLabel = document.getElementById('addModalLabel');
const addModalInput = document.getElementById('addModalInput');
const addModalCategoryFields = document.getElementById('addModalCategoryFields');
const categoryFieldList = document.getElementById('categoryFieldList');
const addCategoryFieldButton = document.getElementById('addCategoryField');
const confirmAddButton = document.getElementById('confirmAdd');
const cancelAddButton = document.getElementById('cancelAdd');

const ADD_SECTION_VALUE = '__add_section__';
const ADD_CATEGORY_VALUE = '__add_category__';

let addContext = null;

let resourcesData = null;
let selectedSectionId = null;
let selectedCategoryId = null;

if (addItemButton) {
  addItemButton.disabled = true;
  addItemButton.classList.add('disabled');
}

async function fetchJson() {
  try {
    const response = await fetch('data/resources.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(response.statusText);
    const data = await response.json();
    setData(data);
    setStatus('資料已重新載入。');
  } catch (error) {
    console.error('Failed to load JSON:', error);
    setStatus('⚠️ 無法載入資料，請檢查主控台訊息。', true);
  }
}

function setData(data) {
  resourcesData = structuredClone(data);
  syncEditor();
  initializeFilters();
  renderQuickEditor();
  renderOrderingLists();
}

function syncEditor() {
  jsonEditor.value = JSON.stringify(resourcesData, null, 2);
}

function renderQuickEditor() {
  itemList.innerHTML = '';
  if (!resourcesData || !resourcesData.sections?.length) {
    updateAddButtonState(false);
    itemList.innerHTML = '<p>No items available.</p>';
    return;
  }

  const section = resourcesData.sections.find((entry) => entry.id === selectedSectionId);
  if (!section) {
    updateAddButtonState(false);
    itemList.innerHTML = '<p>Select a section to view its resources.</p>';
    return;
  }

  const category = section.categories.find((entry) => entry.id === selectedCategoryId);
  if (!category) {
    updateAddButtonState(false);
    itemList.innerHTML = '<p>This section has no categories.</p>';
    return;
  }

  updateAddButtonState(true);

  if (!category.items?.length) {
    itemList.innerHTML = '<p>此分類暫無項目 (No items found in this category)。請使用上方按鈕新增。</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  category.items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'item-card';

    const heading = document.createElement('h3');
    heading.textContent = `${item.name.zh} / ${item.name.en}`;
    const meta = document.createElement('small');
    meta.textContent = `${section.title.zh} · ${category.title.zh}`;

    const fieldGrid = document.createElement('div');
    fieldGrid.className = 'field-grid';

    fieldGrid.append(
      createField('中文名稱', item.name.zh, (value) => updateItem(item, 'name', 'zh', value)),
      createField('English name', item.name.en, (value) => updateItem(item, 'name', 'en', value)),
      createField('中文描述', item.description.zh, (value) => updateItem(item, 'description', 'zh', value), true),
      createField('English description', item.description.en, (value) => updateItem(item, 'description', 'en', value), true),
      createField('Tutorial URL', item.tutorialUrl, (value) => updateItem(item, 'tutorialUrl', null, value)),
      createField('Web app URL', item.appUrl, (value) => updateItem(item, 'appUrl', null, value)),
      createField('Assistant chatbot URL', item.assistantChatbotUrl, (value) => updateItem(item, 'assistantChatbotUrl', null, value))
    );

    const actions = document.createElement('div');
    actions.className = 'item-actions';
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'danger';
    deleteButton.textContent = 'Delete item';
    deleteButton.addEventListener('click', () => deleteItem(category, item.id));
    actions.appendChild(deleteButton);

    card.append(heading, meta, fieldGrid, actions);
    fragment.appendChild(card);
  });

  itemList.appendChild(fragment);
}

function updateAddButtonState(isEnabled) {
  if (!addItemButton) return;
  addItemButton.disabled = !isEnabled;
  addItemButton.classList.toggle('disabled', !isEnabled);
}

function createField(labelText, value, onChange, isTextarea = false) {
  const wrapper = document.createElement('div');
  wrapper.className = 'field';

  const label = document.createElement('label');
  label.textContent = labelText;

  const input = document.createElement(isTextarea ? 'textarea' : 'input');
  input.value = value ?? '';
  input.addEventListener('input', () => {
    onChange(input.value);
  });

  wrapper.append(label, input);
  return wrapper;
}

function updateItem(item, key, subKey, value) {
  if (subKey) {
    item[key][subKey] = value;
  } else {
    item[key] = value;
  }
  syncEditor();
}

function deleteItem(category, itemId) {
  if (!Array.isArray(category.items)) {
    category.items = [];
    return;
  }
  const index = category.items.findIndex((entry) => entry.id === itemId);
  if (index === -1) return;
  category.items.splice(index, 1);
  syncEditor();
  renderQuickEditor();
  setStatus('已刪除選定項目。');
}

function initializeFilters() {
  if (!resourcesData || !Array.isArray(resourcesData.sections)) {
    sectionFilter.innerHTML = '';
    sectionFilter.disabled = true;
    categoryFilter.innerHTML = '';
    categoryFilter.disabled = true;
    selectedSectionId = null;
    selectedCategoryId = null;
    renderOrderingLists();
    return;
  }

  const sections = resourcesData.sections;
  sectionFilter.innerHTML = '';
  const sectionFragment = document.createDocumentFragment();
  sections.forEach((section) => {
    const option = document.createElement('option');
    option.value = section.id;
    option.textContent = `${section.title.zh} / ${section.title.en}`;
    sectionFragment.appendChild(option);
  });

  const addSectionOption = document.createElement('option');
  addSectionOption.value = ADD_SECTION_VALUE;
  addSectionOption.textContent = '新增 (Add new)';
  sectionFragment.appendChild(addSectionOption);

  sectionFilter.appendChild(sectionFragment);

  sectionFilter.disabled = false;

  if (!selectedSectionId || !sections.some((section) => section.id === selectedSectionId)) {
    selectedSectionId = sections[0]?.id ?? null;
  }

  if (!selectedSectionId) {
    categoryFilter.innerHTML = '';
    categoryFilter.disabled = true;
    selectedCategoryId = null;
    return;
  }

  sectionFilter.value = selectedSectionId;
  populateCategoryOptions();
}

function populateCategoryOptions() {
  if (!resourcesData || !Array.isArray(resourcesData.sections)) {
    categoryFilter.innerHTML = '';
    categoryFilter.disabled = true;
    selectedCategoryId = null;
    renderOrderingLists();
    return;
  }

  const section = resourcesData.sections.find((entry) => entry.id === selectedSectionId);
  if (!section || !Array.isArray(section.categories)) {
    categoryFilter.innerHTML = '';
    categoryFilter.disabled = true;
    selectedCategoryId = null;
    renderOrderingLists();
    return;
  }

  categoryFilter.innerHTML = '';
  const categoryFragment = document.createDocumentFragment();
  section.categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = `${category.title.zh} / ${category.title.en}`;
    categoryFragment.appendChild(option);
  });

  const addCategoryOption = document.createElement('option');
  addCategoryOption.value = ADD_CATEGORY_VALUE;
  addCategoryOption.textContent = '新增 (Add new)';
  categoryFragment.appendChild(addCategoryOption);

  categoryFilter.appendChild(categoryFragment);

  categoryFilter.disabled = section.categories.length === 0 && !selectedSectionId;

  if (!selectedCategoryId || !section.categories.some((category) => category.id === selectedCategoryId)) {
    selectedCategoryId = section.categories[0]?.id ?? null;
  }

  if (selectedCategoryId) {
    categoryFilter.value = selectedCategoryId;
  }

  renderOrderingLists();
}

jsonEditor.addEventListener('change', () => {
  try {
    const parsed = JSON.parse(jsonEditor.value);
    resourcesData = parsed;
    initializeFilters();
    renderQuickEditor();
    renderOrderingLists();
    setStatus('已從手動編輯更新表單。');
  } catch (error) {
    setStatus('⚠️ JSON 格式錯誤，請檢查後再試。', true);
  }
});

sectionFilter.addEventListener('change', () => {
  if (sectionFilter.value === ADD_SECTION_VALUE) {
    sectionFilter.value = selectedSectionId ?? '';
    openAddModal('section');
    return;
  }

  selectedSectionId = sectionFilter.value;
  populateCategoryOptions();
  renderQuickEditor();
  renderOrderingLists();
});

categoryFilter.addEventListener('change', () => {
  if (categoryFilter.value === ADD_CATEGORY_VALUE) {
    categoryFilter.value = selectedCategoryId ?? '';
    openAddModal('category');
    return;
  }

  selectedCategoryId = categoryFilter.value;
  renderQuickEditor();
  renderOrderingLists();
});

if (addCategoryFieldButton) {
  addCategoryFieldButton.addEventListener('click', () => {
    addCategoryFieldRow();
  });
}

reloadButton.addEventListener('click', () => {
  fetchJson();
});

updateButton.addEventListener('click', async () => {
  try {
    const parsed = JSON.parse(jsonEditor.value);
    const jsonString = JSON.stringify(parsed, null, 2);

    if ('showSaveFilePicker' in window) {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'resources.json',
        types: [
          {
            description: 'JSON file',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(jsonString);
      await writable.close();
      setStatus('✅ 已更新 JSON 檔案。');
    } else {
      triggerDownload(jsonString, 'resources.json');
      setStatus('⚠️ 瀏覽器不支援直接覆寫，已改為下載檔案。');
    }
  } catch (error) {
    console.error(error);
    setStatus('⚠️ 無法更新，請確認 JSON 格式無誤。', true);
  }
});

downloadButton.addEventListener('click', () => {
  try {
    const parsed = JSON.parse(jsonEditor.value);
    const jsonString = JSON.stringify(parsed, null, 2);
    triggerDownload(jsonString, `resources-${new Date().toISOString().slice(0, 10)}.json`);
    setStatus('✅ 新 JSON 檔案已準備下載。');
  } catch (error) {
    setStatus('⚠️ 下載失敗，請確認 JSON 格式。', true);
  }
});

if (addItemButton) {
  addItemButton.addEventListener('click', addNewItem);
}

function triggerDownload(content, fileName) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? '#dc2626' : '#16a34a';
}

function addNewItem() {
  if (!resourcesData) {
    setStatus('⚠️ 請先載入資料。', true);
    return;
  }

  const section = resourcesData.sections?.find((entry) => entry.id === selectedSectionId);
  if (!section) {
    setStatus('⚠️ 請先選擇章節。', true);
    return;
  }

  const category = section.categories?.find((entry) => entry.id === selectedCategoryId);
  if (!category) {
    setStatus('⚠️ 請先選擇分類。', true);
    return;
  }

  if (!Array.isArray(category.items)) {
    category.items = [];
  }

  const newItem = {
    id: generateItemId(category),
    name: { zh: '新資源', en: 'New Resource' },
    description: { zh: '', en: '' },
    tutorialUrl: '',
    appUrl: '',
    assistantChatbotUrl: '',
  };

  category.items.push(newItem);
  syncEditor();
  renderQuickEditor();
  setStatus('✅ 已新增新項目，請更新內容。');
}

function generateItemId(category) {
  const existingIds = new Set((category.items ?? []).map((item) => item.id));
  const base = `item-${Date.now().toString(36)}`;
  let candidate = base;
  let counter = 1;
  while (existingIds.has(candidate)) {
    candidate = `${base}-${counter++}`;
  }
  return candidate;
}

function generateSectionId() {
  const base = `section-${Date.now().toString(36)}`;
  const existingIds = new Set((resourcesData?.sections ?? []).map((section) => section.id));
  let candidate = base;
  let counter = 1;
  while (existingIds.has(candidate)) {
    candidate = `${base}-${counter++}`;
  }
  return candidate;
}

function generateCategoryId(section) {
  const base = `category-${Date.now().toString(36)}`;
  const existingIds = new Set((section.categories ?? []).map((category) => category.id));
  let candidate = base;
  let counter = 1;
  while (existingIds.has(candidate)) {
    candidate = `${base}-${counter++}`;
  }
  return candidate;
}

function addCategoryFieldRow(value = '') {
  if (!categoryFieldList) return;
  const row = document.createElement('div');
  row.className = 'category-field-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Category name';
  input.value = value;

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'tertiary';
  removeButton.textContent = 'Remove';
  removeButton.addEventListener('click', () => {
    row.remove();
  });

  row.append(input, removeButton);
  categoryFieldList.appendChild(row);
}

function resetCategoryFieldList() {
  if (!categoryFieldList) return;
  categoryFieldList.innerHTML = '';
  addCategoryFieldRow();
}

function openAddModal(type) {
  addContext = type;
  addModalTitle.textContent = type === 'section' ? '新增章節' : '新增分類';
  addModalLabel.textContent = type === 'section' ? '章節名稱' : '分類名稱';
  addModalInput.value = '';
  if (addModalCategoryFields) {
    addModalCategoryFields.classList.toggle('hidden', type !== 'section');
  }
  if (type === 'section') {
    resetCategoryFieldList();
  }
  addModal.classList.remove('hidden');
  addModalInput.focus();
}

function closeAddModal() {
  addContext = null;
  addModal.classList.add('hidden');
}

confirmAddButton.addEventListener('click', () => {
  const name = addModalInput.value.trim();
  if (!name) {
    setStatus('⚠️ 請輸入名稱。', true);
    return;
  }

  if (!resourcesData) {
    resourcesData = { sections: [] };
  }

  if (addContext === 'section') {
    const categoryNames = categoryFieldList
      ? [...categoryFieldList.querySelectorAll('input')]
          .map((input) => input.value.trim())
          .filter(Boolean)
      : [];

    const newSection = {
      id: generateSectionId(),
      title: { zh: name, en: name },
      categories: [],
    };
    categoryNames.forEach((categoryName) => {
      const newCategory = {
        id: generateCategoryId(newSection),
        title: { zh: categoryName, en: categoryName },
        items: [],
      };
      newSection.categories.push(newCategory);
    });
    resourcesData.sections = resourcesData.sections ?? [];
    resourcesData.sections.push(newSection);
    selectedSectionId = newSection.id;
    selectedCategoryId = newSection.categories[0]?.id ?? null;
    setStatus('✅ 已新增章節。');
  } else if (addContext === 'category') {
    const section = resourcesData.sections?.find((entry) => entry.id === selectedSectionId);
    if (!section) {
      setStatus('⚠️ 請先選擇章節。', true);
      closeAddModal();
      return;
    }
    section.categories = section.categories ?? [];
    const newCategory = {
      id: generateCategoryId(section),
      title: { zh: name, en: name },
      items: [],
    };
    section.categories.push(newCategory);
    selectedCategoryId = newCategory.id;
    setStatus('✅ 已新增分類。');
  }

  syncEditor();
  initializeFilters();
  renderQuickEditor();
  renderOrderingLists();
  closeAddModal();
});

cancelAddButton.addEventListener('click', () => {
  closeAddModal();
});

function renderSectionOrderList() {
  if (!sectionOrderList) return;
  sectionOrderList.innerHTML = '';

  if (!resourcesData?.sections?.length) {
    sectionOrderList.innerHTML = '<li class="empty-message">No sections yet</li>';
    return;
  }

  resourcesData.sections.forEach((section) => {
    const item = createDraggableItem(`${section.title.zh} / ${section.title.en}`, section.id);
    sectionOrderList.appendChild(item);
  });
}

function renderCategoryOrderList() {
  if (!categoryOrderList) return;
  categoryOrderList.innerHTML = '';

  const section = resourcesData?.sections?.find((entry) => entry.id === selectedSectionId);
  if (!section) {
    categoryOrderList.innerHTML = '<li class="empty-message">Select a section to reorder categories</li>';
    return;
  }

  if (!section.categories?.length) {
    categoryOrderList.innerHTML = '<li class="empty-message">No categories yet</li>';
    return;
  }

  section.categories.forEach((category) => {
    const item = createDraggableItem(`${category.title.zh} / ${category.title.en}`, category.id);
    categoryOrderList.appendChild(item);
  });
}

function createDraggableItem(label, id) {
  const item = document.createElement('li');
  item.className = 'draggable-item';
  item.draggable = true;
  item.dataset.id = id;

  const handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.textContent = '☰';

  const text = document.createElement('span');
  text.textContent = label;

  item.append(handle, text);
  return item;
}

function enableDragSorting(listElement, type) {
  if (!listElement) return;

  listElement.addEventListener('dragstart', (event) => {
    if (!(event.target instanceof HTMLElement) || !event.target.classList.contains('draggable-item')) return;
    event.target.classList.add('dragging');
    event.dataTransfer?.setData('text/plain', event.target.dataset.id ?? '');
  });

  listElement.addEventListener('dragend', (event) => {
    if (!(event.target instanceof HTMLElement) || !event.target.classList.contains('draggable-item')) return;
    event.target.classList.remove('dragging');
    persistOrder(listElement, type);
  });

  listElement.addEventListener('dragover', (event) => {
    event.preventDefault();
    const dragging = listElement.querySelector('.dragging');
    if (!dragging) return;

    const afterElement = getDragAfterElement(listElement, event.clientY);
    if (!afterElement) {
      listElement.appendChild(dragging);
    } else {
      listElement.insertBefore(dragging, afterElement);
    }
  });
}

function getDragAfterElement(listElement, y) {
  const items = [...listElement.querySelectorAll('.draggable-item:not(.dragging)')];
  return items.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

function persistOrder(listElement, type) {
  const ids = [...listElement.querySelectorAll('.draggable-item[data-id]')].map((item) => item.dataset.id);
  if (!resourcesData) return;

  if (type === 'section') {
    resourcesData.sections.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    syncEditor();
    initializeFilters();
    renderQuickEditor();
    setStatus('✅ 已更新章節順序。');
  } else if (type === 'category') {
    const section = resourcesData.sections.find((entry) => entry.id === selectedSectionId);
    if (!section) return;
    section.categories.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    syncEditor();
    populateCategoryOptions();
    renderQuickEditor();
    setStatus('✅ 已更新分類順序。');
  }
  renderOrderingLists();
}

function renderOrderingLists() {
  renderSectionOrderList();
  renderCategoryOrderList();
}

enableDragSorting(sectionOrderList, 'section');
enableDragSorting(categoryOrderList, 'category');

fetchJson();
