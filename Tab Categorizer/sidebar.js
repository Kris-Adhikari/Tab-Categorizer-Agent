function updateTabTree(categorizedTabs) {
    const tabTree = document.getElementById('tabTree');
    tabTree.innerHTML = '';

    const categories = {};
    for (const [tabId, tabInfo] of Object.entries(categorizedTabs)) {
        if (!categories[tabInfo.category]) {
            categories[tabInfo.category] = [];
        }
        categories[tabInfo.category].push(tabInfo);
    }

    for (const [category, tabs] of Object.entries(categories)) {
        const categoryEl = document.createElement('div');
        categoryEl.className = 'category';
        categoryEl.textContent = category;
        tabTree.appendChild(categoryEl);

        const tabList = document.createElement('ul');
        tabs.forEach(tab => {
            const tabEl = document.createElement('li');
            tabEl.textContent = tab.title;
            tabList.appendChild(tabEl);
        });
        tabTree.appendChild(tabList);
    }
}

window.addEventListener('message', function(event) {
    if (event.data.action === 'updateSidebar') {
        updateTabTree(event.data.categorizedTabs);
    }
});


document.addEventListener('DOMContentLoaded', function() {
    const categorizeButton = document.getElementById('categorize');
    const resultDiv = document.getElementById('result');
    const categorizedTabsDiv = document.getElementById('categorizedTabs');

    function updateCategorizedTabs() {
        chrome.storage.sync.get('categorizedTabs', function(data) {
            const categorizedTabs = data.categorizedTabs || {};
            let result = '';
            const categories = {};

            for (let tabId in categorizedTabs) {
                const tab = categorizedTabs[tabId];
                if (!categories[tab.category]) {
                    categories[tab.category] = [];
                }
                categories[tab.category].push(tab);
            }

            for (let category in categories) {
                result += `<div class="category">${category}</div>`;
                categories[category].forEach(tab => {
                    result += `<div class="tab-item">${tab.title}</div>`;
                });
            }

            categorizedTabsDiv.innerHTML = result || 'No categorized tabs yet.';
        });
    }

    categorizeButton.addEventListener('click', function() {
        const category = document.getElementById('category').value;
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const currentTab = tabs[0];
            chrome.runtime.sendMessage({
                action: "categorizeTab",
                tabId: currentTab.id,
                url: currentTab.url,
                title: currentTab.title,
                category: category
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError.message);
                    resultDiv.textContent = 'Error categorizing tab.';
                } else {
                    resultDiv.textContent = 'Tab categorized successfully!';
                    updateCategorizedTabs();
                }
            });
        });
    });

    // Initial load of categorized tabs
    updateCategorizedTabs();

    // Listen for updates from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updateSidebar') {
            updateCategorizedTabs();
        }
    });
});
