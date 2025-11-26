const jsonEditor = document.getElementById('jsonEditor');
const reloadButton = document.getElementById('reloadJson');
const updateButton = document.getElementById('updateJson');
const downloadButton = document.getElementById('downloadJson');
const statusMessage = document.getElementById('editorStatus');

const sectionOrderList = document.getElementById('sectionOrderList');
const categoryOrderList = document.getElementById('categoryOrderList');
const itemOrderList = document.getElementById('itemOrderList');

const addSectionButton = document.getElementById('addSectionButton');
const addCategoryButton = document.getElementById('addCategoryButton');
const addItemButton = document.getElementById('addItemButton');

const entityModal = document.getElementById('entityModal');
const entityModalTitle = document.getElementById('entityModalTitle');
const entityModalBody = document.getElementById('entityModalBody');
const confirmEntityButton = document.getElementById('confirmEntity');
const cancelEntityButton = document.getElementById('cancelEntity');
const deleteEntityButton = document.getElementById('deleteEntity');

const itemModal = document.getElementById('itemModal');
const itemModalTitle = document.getElementById('itemModalTitle');
const itemModalBody = document.getElementById('itemModalBody');
const confirmItemButton = document.getElementById('confirmItem');
const cancelItemButton = document.getElementById('cancelItem');
const deleteItemButton = document.getElementById('deleteItem');

let resourcesData = null;
let selectedSectionId = null;
let selectedCategoryId = null;

let entityContext = null;
let itemContext = null;

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
  resetSelections();
  renderOrderingLists();
}

function syncEditor() {
  jsonEditor.value = JSON.stringify(resourcesData, null, 2);
}

function resetSelections() {
  const firstSection = resourcesData?.sections?.[0];
  selectedSectionId = firstSection?.id ?? null;
  const firstCategory = firstSection?.categories?.[0];
  selectedCategoryId = firstCategory?.id ?? null;
  updateActionStates();
}

function updateActionStates() {
  const hasSection = Boolean(selectedSectionId);
  const hasCategory = Boolean(selectedCategoryId);
  if (addCategoryButton) addCategoryButton.disabled = !hasSection;
  if (addItemButton) addItemButton.disabled = !hasCategory;
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? '#dc2626' : '#16a34a';
}

jsonEditor.addEventListener('change', () => {
  try {
    const parsed = JSON.parse(jsonEditor.value);
    resourcesData = parsed;
    resetSelections();
    renderOrderingLists();
    setStatus('已從手動編輯更新表單。');
  } catch (error) {
    setStatus('⚠️ JSON 格式錯誤，請檢查後再試。', true);
  }
});

reloadButton.addEventListener('click', fetchJson);

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

function triggerDownload(content, fileName) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function renderSectionOrderList() {
  if (!sectionOrderList) return;
  sectionOrderList.innerHTML = '';

  if (!resourcesData?.sections?.length) {
    sectionOrderList.innerHTML = '<li class="empty-message">No sections yet</li>';
    return;
  }

  resourcesData.sections.forEach((section) => {
    const item = createOrderItem({
      label: `${section.title.zh} / ${section.title.en}`,
      id: section.id,
      isSelected: section.id === selectedSectionId,
      onSelect: () => {
        if (selectedSectionId !== section.id) {
          selectedSectionId = section.id;
          const firstCategory = section.categories?.[0];
          selectedCategoryId = firstCategory?.id ?? null;
          renderOrderingLists();
        }
      },
      onEdit: () => openEntityModal({ type: 'section', mode: 'edit', entityId: section.id }),
    });
    sectionOrderList.appendChild(item);
  });
}

function renderCategoryOrderList() {
  if (!categoryOrderList) return;
  categoryOrderList.innerHTML = '';
  const section = resourcesData?.sections?.find((entry) => entry.id === selectedSectionId);

  if (!section) {
    categoryOrderList.innerHTML = '<li class="empty-message">Select a section to view categories</li>';
    return;
  }

  if (!section.categories?.length) {
    categoryOrderList.innerHTML = '<li class="empty-message">No categories yet</li>';
    return;
  }

  section.categories.forEach((category) => {
    const item = createOrderItem({
      label: `${category.title.zh} / ${category.title.en}`,
      id: category.id,
      isSelected: category.id === selectedCategoryId,
      onSelect: () => {
        if (selectedCategoryId !== category.id) {
          selectedCategoryId = category.id;
          renderOrderingLists();
        }
      },
      onEdit: () => openEntityModal({ type: 'category', mode: 'edit', entityId: category.id }),
    });
    categoryOrderList.appendChild(item);
  });
}

function renderItemOrderList() {
  if (!itemOrderList) return;
  itemOrderList.innerHTML = '';

  const section = resourcesData?.sections?.find((entry) => entry.id === selectedSectionId);
  const category = section?.categories?.find((entry) => entry.id === selectedCategoryId);

  if (!section || !category) {
    itemOrderList.innerHTML = '<li class="empty-message">Select a category to view items</li>';
    return;
  }

  if (!category.items?.length) {
    itemOrderList.innerHTML = '<li class="empty-message">No items yet</li>';
    return;
  }

  category.items.forEach((item) => {
    const orderItem = createOrderItem({
      label: `${item.name.zh} / ${item.name.en}`,
      id: item.id,
      isSelected: false,
      onSelect: null,
      onEdit: () => openItemModal({ mode: 'edit', itemId: item.id }),
    });
    itemOrderList.appendChild(orderItem);
  });
}

function createOrderItem({ label, id, isSelected, onSelect, onEdit }) {
  const item = document.createElement('li');
  item.className = 'draggable-item order-card';
  item.draggable = true;
  item.dataset.id = id;
  if (isSelected) item.classList.add('selected');

  const handle = document.createElement('span');
  handle.className = 'drag-handle';
  handle.textContent = '☰';

  const text = document.createElement('span');
  text.className = 'order-label';
  text.textContent = label;

  const actionBar = document.createElement('div');
  actionBar.className = 'order-actions';

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'icon-button';
  editButton.setAttribute('aria-label', 'Edit');
  editButton.textContent = '✏️';
  editButton.addEventListener('click', (event) => {
    event.stopPropagation();
    onEdit?.();
  });

  actionBar.appendChild(editButton);
  item.append(handle, text, actionBar);

  if (onSelect) {
    item.addEventListener('click', () => {
      onSelect();
      updateActionStates();
    });
  }

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
    setStatus('✅ 已更新章節順序。');
  } else if (type === 'category') {
    const section = resourcesData.sections.find((entry) => entry.id === selectedSectionId);
    if (!section) return;
    section.categories.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    setStatus('✅ 已更新分類順序。');
  } else if (type === 'item') {
    const section = resourcesData.sections.find((entry) => entry.id === selectedSectionId);
    const category = section?.categories.find((entry) => entry.id === selectedCategoryId);
    if (!category) return;
    category.items.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    setStatus('✅ 已更新項目順序。');
  }

  syncEditor();
  renderOrderingLists();
}

function renderOrderingLists() {
  renderSectionOrderList();
  renderCategoryOrderList();
  renderItemOrderList();
  updateActionStates();
}

function openEntityModal({ type, mode, entityId }) {
  entityContext = { type, mode, entityId };
  entityModalTitle.textContent = `${mode === 'edit' ? '編輯' : '新增'}${type === 'section' ? '章節' : '分類'}`;
  entityModalBody.innerHTML = '';

  if (deleteEntityButton) {
    deleteEntityButton.hidden = mode !== 'edit';
  }

  const nameZhField = createLabeledInput('中文名稱', 'entityNameZh');
  const nameEnField = createLabeledInput('English name', 'entityNameEn');

  const { existingZh, existingEn } = (() => {
    if (mode === 'edit') {
      if (type === 'section') {
        const section = resourcesData.sections.find((entry) => entry.id === entityId);
        return { existingZh: section?.title.zh ?? '', existingEn: section?.title.en ?? '' };
      }
      const section = resourcesData.sections.find((entry) => entry.id === selectedSectionId);
      const category = section?.categories.find((entry) => entry.id === entityId);
      return { existingZh: category?.title.zh ?? '', existingEn: category?.title.en ?? '' };
    }
    return { existingZh: '', existingEn: '' };
  })();

  nameZhField.input.value = existingZh;
  nameEnField.input.value = existingEn;

  entityModalBody.append(nameZhField.wrapper, nameEnField.wrapper);
  entityModal.classList.remove('hidden');
  nameZhField.input.focus();
}

function closeEntityModal() {
  entityContext = null;
  entityModal.classList.add('hidden');
}

confirmEntityButton.addEventListener('click', () => {
  if (!entityContext) return;
  const nameZhInput = document.getElementById('entityNameZh');
  const nameEnInput = document.getElementById('entityNameEn');
  const zh = nameZhInput.value.trim();
  const en = nameEnInput.value.trim();

  if (!zh || !en) {
    setStatus('⚠️ 請填寫完整的名稱。', true);
    return;
  }

  if (!resourcesData) {
    resourcesData = { sections: [] };
  }

  if (entityContext.type === 'section') {
    if (entityContext.mode === 'edit') {
      const section = resourcesData.sections.find((entry) => entry.id === entityContext.entityId);
      if (!section) return;
      section.title.zh = zh;
      section.title.en = en;
      setStatus('✅ 已更新章節。');
    } else {
      const newSection = {
        id: generateSectionId(),
        title: { zh, en },
        categories: [],
      };
      resourcesData.sections.push(newSection);
      selectedSectionId = newSection.id;
      selectedCategoryId = null;
      setStatus('✅ 已新增章節。');
    }
  } else {
    const section = resourcesData.sections.find((entry) => entry.id === selectedSectionId);
    if (!section) {
      setStatus('⚠️ 請先選擇章節。', true);
      closeEntityModal();
      return;
    }

    if (entityContext.mode === 'edit') {
      const category = section.categories.find((entry) => entry.id === entityContext.entityId);
      if (!category) return;
      category.title.zh = zh;
      category.title.en = en;
      setStatus('✅ 已更新分類。');
    } else {
      const newCategory = { id: generateCategoryId(section), title: { zh, en }, items: [] };
      section.categories = section.categories ?? [];
      section.categories.push(newCategory);
      selectedCategoryId = newCategory.id;
      setStatus('✅ 已新增分類。');
    }
  }

  syncEditor();
  renderOrderingLists();
  closeEntityModal();
});

cancelEntityButton.addEventListener('click', closeEntityModal);

if (deleteEntityButton) {
  deleteEntityButton.addEventListener('click', () => {
    if (!entityContext || entityContext.mode !== 'edit') return;

    if (entityContext.type === 'section') {
      const sectionIndex = resourcesData.sections.findIndex((entry) => entry.id === entityContext.entityId);
      if (sectionIndex === -1) return;
      resourcesData.sections.splice(sectionIndex, 1);
      selectedSectionId = resourcesData.sections[0]?.id ?? null;
      const nextSection = resourcesData.sections.find((entry) => entry.id === selectedSectionId);
      selectedCategoryId = nextSection?.categories?.[0]?.id ?? null;
      setStatus('🗑️ 已刪除章節。');
    } else {
      const section = resourcesData.sections.find((entry) => entry.id === selectedSectionId);
      const categoryIndex = section?.categories?.findIndex((entry) => entry.id === entityContext.entityId) ?? -1;
      if (!section || categoryIndex === -1) return;
      section.categories.splice(categoryIndex, 1);
      selectedCategoryId = section.categories?.[0]?.id ?? null;
      setStatus('🗑️ 已刪除分類。');
    }

    syncEditor();
    renderOrderingLists();
    closeEntityModal();
  });
}

function openItemModal({ mode, itemId }) {
  const section = resourcesData?.sections?.find((entry) => entry.id === selectedSectionId);
  const category = section?.categories?.find((entry) => entry.id === selectedCategoryId);
  if (!section || !category) {
    setStatus('⚠️ 請先選擇分類。', true);
    return;
  }

  itemContext = { mode, itemId };
  const existingItem = mode === 'edit' ? category.items.find((entry) => entry.id === itemId) : null;
  const draftItem = existingItem
    ? structuredClone(existingItem)
    : {
        id: generateItemId(category),
        name: { zh: '新資源', en: 'New Resource' },
        description: { zh: '', en: '' },
        tutorialUrl: '',
        appUrl: '',
        assistantChatbotUrl: '',
      };

  itemModalTitle.textContent = mode === 'edit' ? '編輯項目' : '新增項目';
  itemModalBody.innerHTML = '';

  if (deleteItemButton) {
    deleteItemButton.hidden = mode !== 'edit';
  }

  const nameZhField = createLabeledInput('中文名稱', 'itemNameZh');
  const nameEnField = createLabeledInput('English name', 'itemNameEn');
  const descZhField = createLabeledTextarea('中文描述', 'itemDescZh');
  const descEnField = createLabeledTextarea('English description', 'itemDescEn');
  const tutorialField = createLabeledInput('Tutorial URL', 'itemTutorial');
  const appField = createLabeledInput('Web app URL', 'itemApp');
  const chatbotField = createLabeledInput('Assistant chatbot URL', 'itemChatbot');

  nameZhField.input.value = draftItem.name.zh ?? '';
  nameEnField.input.value = draftItem.name.en ?? '';
  descZhField.input.value = draftItem.description.zh ?? '';
  descEnField.input.value = draftItem.description.en ?? '';
  tutorialField.input.value = draftItem.tutorialUrl ?? '';
  appField.input.value = draftItem.appUrl ?? '';
  chatbotField.input.value = draftItem.assistantChatbotUrl ?? '';

  itemModalBody.append(
    nameZhField.wrapper,
    nameEnField.wrapper,
    descZhField.wrapper,
    descEnField.wrapper,
    tutorialField.wrapper,
    appField.wrapper,
    chatbotField.wrapper
  );

  itemModal.classList.remove('hidden');
  nameZhField.input.focus();
  itemContext.draft = draftItem;
}

function closeItemModal() {
  itemContext = null;
  itemModal.classList.add('hidden');
}

confirmItemButton.addEventListener('click', () => {
  if (!itemContext) return;
  const section = resourcesData?.sections?.find((entry) => entry.id === selectedSectionId);
  const category = section?.categories?.find((entry) => entry.id === selectedCategoryId);
  if (!section || !category) return;

  const draft = itemContext.draft;
  const nameZh = document.getElementById('itemNameZh').value.trim();
  const nameEn = document.getElementById('itemNameEn').value.trim();

  if (!nameZh || !nameEn) {
    setStatus('⚠️ 請填寫項目名稱。', true);
    return;
  }

  draft.name.zh = nameZh;
  draft.name.en = nameEn;
  draft.description.zh = document.getElementById('itemDescZh').value;
  draft.description.en = document.getElementById('itemDescEn').value;
  draft.tutorialUrl = document.getElementById('itemTutorial').value;
  draft.appUrl = document.getElementById('itemApp').value;
  draft.assistantChatbotUrl = document.getElementById('itemChatbot').value;

  if (itemContext.mode === 'edit') {
    const target = category.items.find((entry) => entry.id === itemContext.itemId);
    if (!target) return;
    Object.assign(target, draft);
    setStatus('✅ 已更新項目。');
  } else {
    category.items = category.items ?? [];
    category.items.push(draft);
    setStatus('✅ 已新增項目。');
  }

  syncEditor();
  renderOrderingLists();
  closeItemModal();
});

cancelItemButton.addEventListener('click', closeItemModal);

if (deleteItemButton) {
  deleteItemButton.addEventListener('click', () => {
    if (!itemContext || itemContext.mode !== 'edit') return;

    const section = resourcesData?.sections?.find((entry) => entry.id === selectedSectionId);
    const category = section?.categories?.find((entry) => entry.id === selectedCategoryId);
    if (!section || !category) return;

    const itemIndex = category.items?.findIndex((entry) => entry.id === itemContext.itemId) ?? -1;
    if (itemIndex === -1) return;

    category.items.splice(itemIndex, 1);
    setStatus('🗑️ 已刪除項目。');

    syncEditor();
    renderOrderingLists();
    closeItemModal();
  });
}

function createLabeledInput(labelText, id) {
  const wrapper = document.createElement('label');
  wrapper.className = 'field';

  const label = document.createElement('span');
  label.textContent = labelText;

  const input = document.createElement('input');
  input.id = id;
  input.type = 'text';

  wrapper.append(label, input);
  return { wrapper, input };
}

function createLabeledTextarea(labelText, id) {
  const wrapper = document.createElement('label');
  wrapper.className = 'field';

  const label = document.createElement('span');
  label.textContent = labelText;

  const textarea = document.createElement('textarea');
  textarea.id = id;
  wrapper.append(label, textarea);
  return { wrapper, input: textarea };
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

if (addSectionButton) {
  addSectionButton.addEventListener('click', () => openEntityModal({ type: 'section', mode: 'create' }));
}

if (addCategoryButton) {
  addCategoryButton.addEventListener('click', () => openEntityModal({ type: 'category', mode: 'create' }));
}

if (addItemButton) {
  addItemButton.addEventListener('click', () => openItemModal({ mode: 'create' }));
}

enableDragSorting(sectionOrderList, 'section');
enableDragSorting(categoryOrderList, 'category');
enableDragSorting(itemOrderList, 'item');

fetchJson();
