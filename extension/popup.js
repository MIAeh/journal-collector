// DOM Elements
const setupScreen = document.getElementById('setupScreen');
const formScreen = document.getElementById('formScreen');
const apiUrlInput = document.getElementById('apiUrl');
const tokenInput = document.getElementById('token');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const setupStatus = document.getElementById('setupStatus');

const urlInput = document.getElementById('url');
const titleInput = document.getElementById('title');
const tagsInput = document.getElementById('tags');
const commentInput = document.getElementById('comment');
const saveItemBtn = document.getElementById('saveItemBtn');
const formStatus = document.getElementById('formStatus');

// State
let config = null;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  config = await loadConfig();

  if (!config || !config.apiUrl || !config.token) {
    showSetupScreen();
  } else {
    await showFormScreen();
  }
}

function showSetupScreen() {
  setupScreen.classList.remove('hidden');
  formScreen.classList.add('hidden');
  saveConfigBtn.addEventListener('click', saveConfig);
}

async function showFormScreen() {
  setupScreen.classList.add('hidden');
  formScreen.classList.remove('hidden');
  saveItemBtn.addEventListener('click', saveItem);

  await populateFormFromTab();
}

async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiUrl', 'token'], (result) => {
      resolve(result);
    });
  });
}

function saveConfig() {
  const apiUrl = apiUrlInput.value.trim();
  const token = tokenInput.value.trim();

  if (!apiUrl || !token) {
    showStatus(setupStatus, 'Please fill in all fields', 'error');
    return;
  }

  chrome.storage.local.set({ apiUrl, token }, () => {
    config = { apiUrl, token };
    showStatus(setupStatus, 'Saved! Reloading...', 'success');
    setTimeout(() => {
      init();
    }, 1000);
  });
}

async function populateFormFromTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tabs.length > 0) {
    const tab = tabs[0];
    urlInput.value = tab.url || '';
    titleInput.value = tab.title || '';
  }
}

async function saveItem() {
  const url = urlInput.value.trim();
  const title = titleInput.value.trim();
  const tagsRaw = tagsInput.value.trim();
  const comment = commentInput.value.trim();

  if (!url || !title) {
    showStatus(formStatus, 'URL and title are required', 'error');
    return;
  }

  const tags = tagsRaw
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);

  const payload = {
    url,
    title,
    tags,
    comment
  };

  saveItemBtn.disabled = true;
  saveItemBtn.textContent = 'Saving...';

  try {
    const response = await fetch(`${config.apiUrl}/api/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    showStatus(formStatus, 'Saved!', 'success');
    setTimeout(() => {
      window.close();
    }, 1000);

  } catch (error) {
    showStatus(formStatus, `Error: ${error.message}`, 'error');
    saveItemBtn.disabled = false;
    saveItemBtn.textContent = 'Save';
  }
}

function showStatus(element, message, type) {
  element.textContent = message;
  element.className = `status ${type}`;
}
