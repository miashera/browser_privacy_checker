document.addEventListener('DOMContentLoaded', function() {
    const analyzePrivacyBtn = document.getElementById('analyzePrivacy');
    const checkCookiesBtn = document.getElementById('checkCookies');
    const resultsDiv = document.getElementById('results');

    analyzePrivacyBtn.addEventListener('click', function() {
        chrome.runtime.sendMessage({action: 'analyzePrivacy'}, function(response) {
            resultsDiv.innerHTML = `<h2>Privacy Analysis:</h2><pre>${JSON.stringify(response, null, 2)}</pre>`;
        });
    });

    checkCookiesBtn.addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.runtime.sendMessage({action: 'checkCookies', url: tabs[0].url}, function(response) {
                resultsDiv.innerHTML = `<h2>Cookie Analysis:</h2><pre>${JSON.stringify(response, null, 2)}</pre>`;
            });
        });
    });
});