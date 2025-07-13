const categoriesContainer = document.getElementById('categories');
const defaultCategories = ['Gaming','Study','Work','Entertainment','Other'];
const addCategoryForm = document.getElementById('addCategoryForm');
const newCategoryNameInput = document.getElementById('newCategoryName');
const mainTabList = document.getElementById('mainTabList');
let categories = ['Gaming', 'Study', 'Work', 'Entertainment', 'Other'];
const categoryColors = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5', 'color-6', 'color-7', 'color-8'];
let categoryColorAssignments = {};
let allTabs = new Map();
let isRendering = false;
let autoScrollInterval = null;
let isProcessing = false;
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatResponse = document.getElementById('chatResponse');
const chatHistoryBtn = document.getElementById('chatHistoryBtn');
const chatHistoryScreen = document.getElementById('chatHistoryScreen');
const backToMainBtn = document.getElementById('backToMainBtn');
const chatHistoryList = document.getElementById('chatHistoryList');
const mainContent = document.body;
function loadCategories() {
    chrome.storage.sync.get('categories', function(data) {
        categories = data.categories || defaultCategories;
        categoriesContainer.innerHTML = '';
        categories.forEach(category => {
            const categoryElement = createCategoryElement(category);
            categoriesContainer.appendChild(categoryElement);
        });
    });
}
function saveCategories() {
    chrome.storage.sync.set({
        categories: categories,
        categoryColorAssignments: categoryColorAssignments
    });
}
function renderCategories() {
    categoriesContainer.innerHTML = '';
    categories.forEach(category => {
        const categoryElement = createCategoryElement(category);
        categoriesContainer.appendChild(categoryElement);
    });
    loadCategorizedTabs();
}
function createCategoryElement(category) {
    const categoryElement = document.createElement('div');
    categoryElement.className = 'category';
    categoryElement.setAttribute('data-category', category.toLowerCase());
    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'category-header';
    categoryHeader.classList.add(getCategoryColorClass(category));
    const categoryTitle = document.createElement('div');
    categoryTitle.className = 'category-title';
    categoryTitle.textContent = category;
    const removeButton = document.createElement('span');
    removeButton.textContent = '\u00d7';
    removeButton.className = 'remove-category';
    removeButton.addEventListener('click', () => removeCategory(category));
    categoryTitle.appendChild(removeButton);
    categoryHeader.appendChild(categoryTitle);
    categoryElement.appendChild(categoryHeader);
    const categoryTabs = document.createElement('div');
    categoryTabs.className = 'category-tabs';
    categoryElement.appendChild(categoryTabs);
    categoryElement.addEventListener('dragover', e => e.preventDefault());
    categoryElement.addEventListener('drop', e => handleCategoryDrop(e, category));
    return categoryElement;
}
function getCategoryColorClass(category) {
    const colorClasses = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5', 'color-6', 'color-7', 'color-8'];
    const index = categories.indexOf(category) % colorClasses.length;
    return colorClasses[index];
}
function handleCategoryDrop(e, category) {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const tabId = parseInt(data.tabId);
    saveTabCategory(tabId, category.toLowerCase());
}
function saveTabCategory(tabId, category) {
    chrome.storage.sync.get('categorizedTabs', function(data) {
        let categorizedTabs = data.categorizedTabs || {};
        categorizedTabs[tabId] = { category: category };
        chrome.storage.sync.set({categorizedTabs: categorizedTabs}, function() {
            renderAllTabs();
        });
    });
}
function removeTabFromCategory(tabId) {
    chrome.storage.sync.get('categorizedTabs', function(data) {
        let categorizedTabs = data.categorizedTabs || {};
        delete categorizedTabs[tabId];
        chrome.storage.sync.set({categorizedTabs: categorizedTabs}, function() {
            renderAllTabs();
        });
    });
}
function removeCategory(category) {
    chrome.storage.sync.get(['categories', 'categorizedTabs'], function(data) {
        let categories = data.categories || defaultCategories;
        let categorizedTabs = data.categorizedTabs || {};
        categories = categories.filter(c => c !== category);
        for (let tabId in categorizedTabs) {
            if (categorizedTabs[tabId].category === category.toLowerCase()) {
                delete categorizedTabs[tabId];
            }
        }
        chrome.storage.sync.set({
            categories: categories,
            categorizedTabs: categorizedTabs
        }, function() {
            loadCategories();
            renderAllTabs();
        });
    });
}
function createTabElement(tab, isInCategory = false) {
    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.id = `tab-${tab.id}`;
    tabElement.setAttribute('draggable', true);
    const favicon = document.createElement('img');
    favicon.src = tab.favIconUrl || 'default-favicon.png';
    favicon.className = 'tab-favicon';
    tabElement.appendChild(favicon);
    const title = document.createElement('span');
    title.textContent = tab.title;
    title.className = 'tab-title';
    tabElement.appendChild(title);
    const closeButton = document.createElement('span');
    closeButton.textContent = '\u00d7';
    closeButton.className = 'remove-tab';
    closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isInCategory) {
            removeTabFromCategory(tab.id);
        } else {
            closeTab(tab.id);
        }
    });
    tabElement.appendChild(closeButton);
    tabElement.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', JSON.stringify({
            tabId: tab.id,
            fromCategory: isInCategory
        }));
        document.addEventListener('dragover', handleDragScroll);
    });
    tabElement.addEventListener('dragend', () => {
        document.removeEventListener('dragover', handleDragScroll);
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
            autoScrollInterval = null;
        }
    });
    tabElement.addEventListener('click', () => {
        chrome.tabs.update(tab.id, { active: true }, function(updatedTab) {
        });
    });
    return tabElement;
}
function handleDragScroll(e) {
    const SCROLL_SPEED = 5;
    const SCROLL_ZONE = 50;
    const container = document.querySelector('.popup-content');
    const containerRect = container.getBoundingClientRect();
    const bottomScrollZone = containerRect.bottom - SCROLL_ZONE;
    if (e.clientY > bottomScrollZone) {
        if (!autoScrollInterval) {
            autoScrollInterval = setInterval(() => {
                container.scrollTop += SCROLL_SPEED;
                if (container.scrollTop + container.clientHeight >= container.scrollHeight) {
                    clearInterval(autoScrollInterval);
                    autoScrollInterval = null;
                }
            }, 16);
        }
    } else {
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
            autoScrollInterval = null;
        }
    }
}
function renderMainBar() {
    mainTabList.innerHTML = '';
    chrome.storage.sync.get('categorizedTabs', function(data) {
        const categorizedTabs = data.categorizedTabs || {};
        allTabs.forEach((tab, tabId) => {
            if (!categorizedTabs[tabId]) {
                const tabElement = createTabElement(tab, false);
                mainTabList.appendChild(tabElement);
            }
        });
    });
}
function closeTab(tabId) {
    chrome.tabs.remove(parseInt(tabId), function() {
        if (chrome.runtime.lastError) {
        } else {
            const tabElement = document.getElementById(`tab-${tabId}`);
            if (tabElement) {
                tabElement.remove();
            }
            chrome.storage.sync.get('categorizedTabs', function(data) {
                let categorizedTabs = data.categorizedTabs || {};
                if (categorizedTabs[tabId]) {
                    delete categorizedTabs[tabId];
                    chrome.storage.sync.set({categorizedTabs: categorizedTabs}, function() {
                        renderCategories();
                    });
                }
            });
        }
    });
}
function loadCategorizedTabs() {
    chrome.storage.sync.get('categorizedTabs', function(data) {
        const categorizedTabs = data.categorizedTabs || {};
        document.querySelectorAll('.category-tabs').forEach(categoryTabs => {
            categoryTabs.innerHTML = '';
        });
        chrome.tabs.query({ currentWindow: true }, function(tabs) {
            Object.keys(categorizedTabs).forEach(tabId => {
                const tabInfo = categorizedTabs[tabId];
                const tab = tabs.find(t => t.id === parseInt(tabId));
                if (tab) {
                    const categoryElement = document.querySelector(`.category[data-category="${tabInfo.category}"]`);
                    if (categoryElement) {
                        const tabElement = createTabElement(tab, true);
                        const categoryTabs = categoryElement.querySelector('.category-tabs');
                        if (categoryTabs) {
                            categoryTabs.appendChild(tabElement);
                        }
                    }
                } else {
                    delete categorizedTabs[tabId];
                }
            });
            chrome.storage.sync.set({categorizedTabs: categorizedTabs});
        });
    });
}
function renderAllTabs() {
    if (isProcessing) {
        return;
    }
    isProcessing = true;
    chrome.tabs.query({ currentWindow: true }, function(tabs) {
        chrome.storage.sync.get('categorizedTabs', function(data) {
            const categorizedTabs = data.categorizedTabs || {};
            mainTabList.innerHTML = '';
            document.querySelectorAll('.category-tabs').forEach(categoryTabs => {
                categoryTabs.innerHTML = '';
            });
            tabs.forEach(tab => {
                if (categorizedTabs[tab.id]) {
                    const categoryElement = document.querySelector(
                        `.category[data-category="${categorizedTabs[tab.id].category}"]`
                    );
                    if (categoryElement) {
                        const tabElement = createTabElement(tab, true);
                        const categoryTabs = categoryElement.querySelector('.category-tabs');
                        if (categoryTabs) {
                            categoryTabs.appendChild(tabElement);
                        }
                    }
                } else {
                    const tabElement = createTabElement(tab, false);
                    mainTabList.appendChild(tabElement);
                }
            });
            isProcessing = false;
        });
    });
}
function updateAllTabs(callback) {
    if (isRendering) {
        return;
    }
    isRendering = true;
    chrome.tabs.query({ currentWindow: true }, function(tabs) {
        allTabs.clear();
        tabs.forEach(tab => allTabs.set(tab.id, tab));
        chrome.storage.sync.get('categorizedTabs', function(data) {
            let categorizedTabs = data.categorizedTabs || {};
            let updatedCategorizedTabs = {};
            for (let tabId in categorizedTabs) {
                if (allTabs.has(parseInt(tabId))) {
                    updatedCategorizedTabs[tabId] = categorizedTabs[tabId];
                }
            }
            chrome.storage.sync.set({categorizedTabs: updatedCategorizedTabs}, function() {
                if (callback) callback();
                isRendering = false;
            });
        });
    });
}
function renderCategorizedTabs() {
    document.querySelectorAll('.category-tabs').forEach(categoryTabs => {
        categoryTabs.innerHTML = '';
    });
    chrome.storage.sync.get('categorizedTabs', function(data) {
        const categorizedTabs = data.categorizedTabs || {};
        for (let tabId in categorizedTabs) {
            const tab = allTabs.get(parseInt(tabId));
            if (tab) {
                const categoryElement = document.querySelector(`.category[data-category="${categorizedTabs[tabId].category}"]`);
                if (categoryElement) {
                    const tabElement = createTabElement(tab, true);
                    const categoryTabs = categoryElement.querySelector('.category-tabs');
                    if (categoryTabs) {
                        categoryTabs.appendChild(tabElement);
                    }
                }
            }
        }
    });
}
addCategoryForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const newCategory = newCategoryNameInput.value.trim();
    if (newCategory && !categories.includes(newCategory)) {
        categories.push(newCategory);
        categoryColorAssignments[newCategory] = categoryColors[Object.keys(categoryColorAssignments).length % categoryColors.length];
        saveCategories();
        renderCategories();
        newCategoryNameInput.value = '';
    }
});
document.addEventListener('DOMContentLoaded', function() {
    loadCategories();
    renderAllTabs();
    chrome.tabs.onCreated.addListener(() => {
        renderAllTabs();
    });
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
        if (changeInfo.status === 'complete') {
            renderAllTabs();
        }
    });
    chrome.tabs.onRemoved.addListener((tabId) => {
        renderAllTabs();
    });
    const container = document.querySelector('.popup-content');
    if (container) {
        container.style.overflowY = 'auto';
        container.style.maxHeight = '600px';
    }
});
function handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        chrome.storage.sync.get('categorizedTabs', function(data) {
            let categorizedTabs = data.categorizedTabs || {};
            if (categorizedTabs[tabId]) {
                categorizedTabs[tabId].title = tab.title;
                categorizedTabs[tabId].url = tab.url;
                categorizedTabs[tabId].favIconUrl = tab.favIconUrl;
                chrome.storage.sync.set({categorizedTabs: categorizedTabs}, function() {
                    renderCategories();
                });
            }
        });
    }
}
chrome.tabs.onUpdated.addListener(handleTabUpdate);
function handleTabCreated(tab) {
    renderMainBar();
}
function handleTabUpdated(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        renderMainBar();
    }
}
chrome.tabs.onCreated.addListener(handleTabCreated);
chrome.tabs.onUpdated.addListener(handleTabUpdated);
function handleTabRemoved(tabId, removeInfo) {
    const tabElement = document.getElementById(`tab-${tabId}`);
    if (tabElement) {
        tabElement.remove();
    }
    chrome.storage.sync.get('categorizedTabs', function(data) {
        let categorizedTabs = data.categorizedTabs || {};
        if (categorizedTabs[tabId]) {
            delete categorizedTabs[tabId];
            chrome.storage.sync.set({categorizedTabs: categorizedTabs}, function() {
                renderCategories();
            });
        }
    });
}
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userMsg = chatInput.value.trim();
    if (!userMsg) return;
    chatInput.value = '';
    chrome.tabs.query({}, (tabs) => {
        const activeTab = tabs.find(tab => tab.active && tab.highlighted) || tabs[0];
        const tabUrl = activeTab?.url || '';
        const tabTitle = activeTab?.title || '';
        const tabId = activeTab?.id || null;
        const tabsContext = tabs.map(tab => ({ title: tab.title, url: tab.url, id: tab.id }));
        chrome.runtime.sendMessage({
            type: 'chatWithOpenAI',
            messages: [
                { role: 'user', content: userMsg }
            ],
            tabUrl,
            tabTitle,
            tabId,
            tabsContext
        }, (response) => {
            chatResponse.textContent = response.reply || '';
            chatResponse.scrollTop = chatResponse.scrollHeight;
        });
    });
});
chatHistoryBtn.addEventListener('click', () => {
    document.getElementById('chatContainer').style.display = 'none';
    document.getElementById('mainTabList').style.display = 'none';
    document.getElementById('categories').style.display = 'none';
    chatHistoryScreen.style.display = 'block';
    chatHistoryList.innerHTML = '<div style="color:#aaa;text-align:center;">Loading...</div>';
    chrome.runtime.sendMessage({ type: 'fetchChatHistory' }, (response) => {
        if (response && response.history && response.history.length > 0) {
            chatHistoryList.innerHTML = response.history.map(entry => `
                <div style="margin-bottom:18px;padding-bottom:10px;border-bottom:1px solid #333;">
                    <div style="font-size:13px;color:#7fdaf6;margin-bottom:2px;">Tab: ${entry.tab_title || ''}</div>
                    <div style="margin-bottom:4px;"><span style="color:#f1c40f;">You:</span> ${entry.user_message}</div>
                    <div><span style="color:#5dade2;">AI:</span> ${entry.openai_response}</div>
                </div>
            `).join('');
        } else {
            chatHistoryList.innerHTML = '<div style="color:#aaa;text-align:center;">No chat history found.</div>';
        }
    });
});
backToMainBtn.addEventListener('click', () => {
    chatHistoryScreen.style.display = 'none';
    document.getElementById('chatContainer').style.display = '';
    document.getElementById('mainTabList').style.display = '';
    document.getElementById('categories').style.display = '';
});
