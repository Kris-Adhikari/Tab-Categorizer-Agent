// Function to get the most frequent words on the page
function getMostFrequentWords(text, numWords = 5) {
    const words = text.toLowerCase().match(/\b\w+\b/g);
    const wordCounts = {};
    
    words.forEach(word => {
        if (word.length > 3) { // Ignore short words
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
    });

    return Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, numWords)
        .map(entry => entry[0]);
}

// Extract page information
const pageInfo = {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || '',
    url: window.location.href,
    frequentWords: getMostFrequentWords(document.body.innerText)
};

// Send the information to the background script
chrome.runtime.sendMessage({
    action: "pageInfo",
    data: pageInfo
});

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPageInfo") {
        sendResponse(pageInfo);
    }
});

let sidebarOpen = false;

function toggleSidebar() {
    if (sidebarOpen) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

function openSidebar() {
    if (!document.getElementById('tab-categorizer-sidebar')) {
        const sidebar = document.createElement('iframe');
        sidebar.id = 'tab-categorizer-sidebar';
        sidebar.src = chrome.runtime.getURL('sidebar.html');
        sidebar.style.cssText = 'position: fixed; top: 0; right: 0; width: 300px; height: 100%; z-index: 9999; border: none; box-shadow: -2px 0 5px rgba(0,0,0,0.2);';
        document.body.appendChild(sidebar);
        document.body.style.marginRight = '300px';
    }
    sidebarOpen = true;
}

function closeSidebar() {
    const sidebar = document.getElementById('tab-categorizer-sidebar');
    if (sidebar) {
        sidebar.remove();
        document.body.style.marginRight = '0';
    }
    sidebarOpen = false;
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message received in content script:", request);
    if (request.action === 'updateSidebar') {
        // Forward the message to the sidebar
        const sidebar = document.getElementById('tab-categorizer-sidebar');
        if (sidebar) {
            sidebar.contentWindow.postMessage(request, '*');
            console.log("Message forwarded to sidebar");
        } else {
            console.log("Sidebar not found, attempting to inject");
            injectSidebar();
        }
    }
    if (request.action === 'toggleSidebar') {
        toggleSidebar();
    }
});

console.log("Content script loaded");
