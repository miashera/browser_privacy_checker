// Saves options to chrome.storage
function saveOptions(e) {
    e.preventDefault();
    chrome.storage.sync.set({
        analyzePrivacy: document.getElementById('analyzePrivacy').checked,
        checkCookies: document.getElementById('checkCookies').checked,
        autoScan: document.getElementById('autoScan').checked
    }, function() {
        // Update status to let user know options were saved.
        var status = document.createElement('div');
        status.textContent = 'Options saved.';
        status.style.marginTop = '15px';
        status.style.color = 'green';
        document.getElementById('optionsForm').appendChild(status);
        setTimeout(function() {
            status.remove();
        }, 2000);
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
    chrome.storage.sync.get({
        analyzePrivacy: true,
        checkCookies: true,
        autoScan: false
    }, function(items) {
        document.getElementById('analyzePrivacy').checked = items.analyzePrivacy;
        document.getElementById('checkCookies').checked = items.checkCookies;
        document.getElementById('autoScan').checked = items.autoScan;
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('optionsForm').addEventListener('submit', saveOptions);