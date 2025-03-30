// background.js
import { analyzePrivacySettings, applyRecommendedSetting } from './lib/privacy_analyzer.js';
import { checkCookies } from './lib/cookie_checker.js';
import { analyzeAdCounts } from './lib/ad_counter.js';
import { generateReport } from './lib/report_generator.js';

// Listen for installation events
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
    // Initialize default settings
    chrome.storage.sync.set({
      analyzePrivacy: true,
      checkCookies: true,
      autoScan: false,
      reportHistory: []
    });
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
});

// Check if auto-scan is enabled on page load
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.storage.sync.get(['autoScan'], function (items) {
      if (items.autoScan) {
        console.log('Auto-scanning enabled, analyzing page:', tab.url);
        autoScanPage(tab);
      }
    });
  }
});

// Auto-scan function
async function autoScanPage(tab) {
  try {
    const privacyResults = await analyzePrivacySettings();
    const cookieResults = await checkCookies(tab.url);

    // Generate and save a report
    const report = await generateReport(tab.url, tab.title, privacyResults, cookieResults);
    saveReport(report);

    // Show notification if high severity issues found
    if (privacyResults.summary.riskLevel === 'High' ||
      privacyResults.summary.riskLevel === 'Critical' ||
      cookieResults.severity === 'High' ||
      cookieResults.severity === 'Critical') {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/warning.png',
        title: 'Privacy Alert',
        message: `High privacy risks detected on ${tab.title}. Open the Privacy Checker to see details.`
      });
    }
  } catch (error) {
    console.error('Error during auto-scan:', error);
  }
}

// Save report to history
function saveReport(report) {
  chrome.storage.sync.get(['reportHistory'], function (data) {
    const history = data.reportHistory || [];
    // Add new report to the beginning
    history.unshift(report);
    // Keep only the last 10 reports
    if (history.length > 10) {
      history.pop();
    }
    chrome.storage.sync.set({ reportHistory: history });
  });
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzePrivacy') {
    analyzePrivacySettings().then(sendResponse);
    return true;
  } else if (request.action === 'checkCookies') {
    checkCookies(request.url).then(sendResponse);
    return true;
  } else if (request.action === 'analyzeAds') {
    analyzeAdCounts(request.adCounts).then(sendResponse);
    return true;
  } else if (request.action === 'applySetting') {
    applyRecommendedSetting(request.settingType).then(sendResponse);
    return true;
  } else if (request.action === 'generateReport') {
    generateReport(
      request.url,
      request.title,
      request.privacyResults,
      request.cookieResults
    ).then(sendResponse);
    return true;
  } else if (request.action === 'getReportHistory') {
    chrome.storage.sync.get(['reportHistory'], function (data) {
      sendResponse(data.reportHistory || []);
    });
    return true;
  }
});