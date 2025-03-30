import { analyzePrivacySettings } from './lib/privacy_analyzer.js';
import { checkCookies } from './lib/cookie_checker.js';
import { analyzeAdCounts } from './lib/ad_counter.js';

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
  } else if (request.action === 'analyzeAds') {
    analyzeAdCounts(request.adCounts).then(sendResponse);
    return true;
  }
});