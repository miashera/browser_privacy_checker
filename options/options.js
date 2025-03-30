// Saves options to chrome.storage
function saveOptions(e) {
    e.preventDefault();
    chrome.storage.sync.set({
        analyzePrivacy: document.getElementById('analyzePrivacy').checked,
        checkCookies: document.getElementById('checkCookies').checked,
        autoScan: document.getElementById('autoScan').checked,
        showNotifications: document.getElementById('showNotifications').checked
    }, function () {
        // Update status to let user know options were saved.
        const status = document.createElement('div');
        status.textContent = 'Options saved.';
        status.className = 'status status-success';
        document.getElementById('optionsForm').appendChild(status);
        setTimeout(function () {
            status.remove();
        }, 2000);
    });
}

// Clear report history
function clearHistory() {
    if (confirm('Are you sure you want to clear all report history?')) {
        chrome.storage.sync.set({ reportHistory: [] }, function () {
            // Show confirmation
            const status = document.createElement('div');
            status.textContent = 'Report history cleared.';
            status.className = 'status status-success';
            document.querySelector('.section:nth-child(3)').appendChild(status);
            setTimeout(function () {
                status.remove();
            }, 2000);
        });
    }
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
    chrome.storage.sync.get({
        analyzePrivacy: true,
        checkCookies: true,
        autoScan: false,
        showNotifications: true
    }, function (items) {
        document.getElementById('analyzePrivacy').checked = items.analyzePrivacy;
        document.getElementById('checkCookies').checked = items.checkCookies;
        document.getElementById('autoScan').checked = items.autoScan;
        document.getElementById('showNotifications').checked = items.showNotifications;
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('optionsForm').addEventListener('submit', saveOptions);
document.getElementById('clearHistory').addEventListener('click', clearHistory);