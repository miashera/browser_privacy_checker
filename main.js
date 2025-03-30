// Import necessary modules
import { analyzePrivacySettings } from './lib/privacy_analyzer.js';
import { checkCookies } from './lib/cookie_checker.js';

// Set up background script
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzePrivacy') {
    analyzePrivacySettings().then(sendResponse);
    return true;
  } else if (request.action === 'checkCookies') {
    checkCookies(sender.tab.url).then(sendResponse);
    return true;
  }
});

// Popup functionality
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    const analyzePrivacyBtn = document.getElementById('analyzePrivacy');
    const checkCookiesBtn = document.getElementById('checkCookies');
    const resultsDiv = document.getElementById('results');

    analyzePrivacyBtn.addEventListener('click', function () {
      chrome.runtime.sendMessage({ action: 'analyzePrivacy' }, function (response) {
        resultsDiv.innerHTML = `<h2>Privacy Analysis:</h2><pre>${JSON.stringify(response, null, 2)}</pre>`;
      });
    });

    checkCookiesBtn.addEventListener('click', function () {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.runtime.sendMessage({ action: 'checkCookies', url: tabs[0].url }, function (response) {
          resultsDiv.innerHTML = `<h2>Cookie Analysis:</h2><pre>${JSON.stringify(response, null, 2)}</pre>`;
        });
      });
    });
  });
}