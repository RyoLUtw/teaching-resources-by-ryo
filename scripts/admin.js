const jsonEditor = document.getElementById('jsonEditor');
const itemList = document.getElementById('itemList');
const reloadButton = document.getElementById('reloadJson');
const updateButton = document.getElementById('updateJson');
const downloadButton = document.getElementById('downloadJson');
const statusMessage = document.getElementById('editorStatus');
const sectionFilter = document.getElementById('sectionFilter');
const categoryFilter = document.getElementById('categoryFilter');
const addItemButton = document.getElementById('addItem');

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
    return;
  }

  const sections = resourcesData.sections;
  sectionFilter.innerHTML = '';
  sections.forEach((section) => {
    const option = document.createElement('option');
    option.value = section.id;
    option.textContent = `${section.title.zh} / ${section.title.en}`;
    sectionFilter.appendChild(option);
  });

  sectionFilter.disabled = sections.length === 0;

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
    return;
  }

  const section = resourcesData.sections.find((entry) => entry.id === selectedSectionId);
  if (!section || !Array.isArray(section.categories)) {
    categoryFilter.innerHTML = '';
    categoryFilter.disabled = true;
    selectedCategoryId = null;
    return;
  }

  categoryFilter.innerHTML = '';
  section.categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = `${category.title.zh} / ${category.title.en}`;
    categoryFilter.appendChild(option);
  });

  categoryFilter.disabled = section.categories.length === 0;

  if (!selectedCategoryId || !section.categories.some((category) => category.id === selectedCategoryId)) {
    selectedCategoryId = section.categories[0]?.id ?? null;
  }

  if (selectedCategoryId) {
    categoryFilter.value = selectedCategoryId;
  }
}

jsonEditor.addEventListener('change', () => {
  try {
    const parsed = JSON.parse(jsonEditor.value);
    resourcesData = parsed;
    initializeFilters();
    renderQuickEditor();
    setStatus('已從手動編輯更新表單。');
  } catch (error) {
    setStatus('⚠️ JSON 格式錯誤，請檢查後再試。', true);
  }
});

sectionFilter.addEventListener('change', () => {
  selectedSectionId = sectionFilter.value;
  populateCategoryOptions();
  renderQuickEditor();
});

categoryFilter.addEventListener('change', () => {
  selectedCategoryId = categoryFilter.value;
  renderQuickEditor();
});

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

fetchJson();
