// Enhanced privacy_analyzer.js
export async function analyzePrivacySettings() {
    // First get user preferences
    const preferences = await getUserPreferences();

    // Only analyze settings the user has enabled
    const results = {
        timestamp: new Date().toISOString(),
        summary: {
            riskLevel: "Unknown",
            totalIssues: 0,
            criticalIssues: 0,
            highIssues: 0,
            mediumIssues: 0,
            lowIssues: 0
        },
        details: {}
    };

    // Run enabled checks
    if (preferences.analyzePrivacy) {
        results.details.thirdPartyCookies = await checkThirdPartyCookies();
        results.details.doNotTrack = await checkDoNotTrack();
        results.details.javascriptEnabled = await checkJavascriptEnabled();
        results.details.contentSettings = await checkContentSettings();

        // Calculate CVSS scores and count issues
        calculateCVSSScores(results);
    }

    return results;
}

// Get user preferences from storage
async function getUserPreferences() {
    return new Promise((resolve) => {
        chrome.storage.sync.get({
            analyzePrivacy: true,
            checkCookies: true,
            autoScan: false
        }, function (items) {
            resolve(items);
        });
    });
}

// Add new privacy checks
async function checkJavascriptEnabled() {
    return new Promise((resolve) => {
        chrome.privacy.websites.javascriptEnabled.get({}, function (details) {
            resolve({
                setting: details.value,
                recommendation: details.value ?
                    'Consider disabling JavaScript for untrusted sites' :
                    'JavaScript is disabled. Note this may break functionality on many sites.',
                cvss: details.value ? 3.4 : 0, // Medium severity if enabled
                canApply: true,
                applyAction: 'disableJavascript'
            });
        });
    });
}

async function checkContentSettings() {
    return new Promise((resolve) => {
        chrome.privacy.websites.hyperlinkAuditingEnabled.get({}, function (details) {
            resolve({
                setting: details.value,
                recommendation: details.value ?
                    'Consider disabling hyperlink auditing for better privacy' :
                    'Good: Hyperlink auditing is disabled',
                cvss: details.value ? 2.1 : 0, // Low severity if enabled
                canApply: true,
                applyAction: 'disableHyperlinkAuditing'
            });
        });
    });
}

// Add CVSS score to existing checks
async function checkThirdPartyCookies() {
    return new Promise((resolve) => {
        chrome.privacy.websites.thirdPartyCookiesAllowed.get({}, function (details) {
            resolve({
                setting: details.value,
                recommendation: details.value ?
                    'Consider disabling third-party cookies for better privacy' :
                    'Good: Third-party cookies are disabled',
                cvss: details.value ? 6.5 : 0, // High severity if enabled
                canApply: true,
                applyAction: 'disableThirdPartyCookies'
            });
        });
    });
}

async function checkDoNotTrack() {
    return new Promise((resolve) => {
        chrome.privacy.websites.doNotTrackEnabled.get({}, function (details) {
            resolve({
                setting: details.value,
                recommendation: details.value ?
                    'Good: Do Not Track is enabled' :
                    'Consider enabling Do Not Track for better privacy',
                cvss: details.value ? 0 : 2.8, // Low-Medium severity if disabled
                canApply: true,
                applyAction: 'enableDoNotTrack'
            });
        });
    });
}

// Calculate overall CVSS scores
function calculateCVSSScores(results) {
    let maxCVSS = 0;
    let totalIssues = 0;
    let criticalIssues = 0;
    let highIssues = 0;
    let mediumIssues = 0;
    let lowIssues = 0;

    // Analyze all details
    for (const key in results.details) {
        const item = results.details[key];
        if (item.cvss > 0) {
            totalIssues++;
            if (item.cvss >= 9.0) {
                criticalIssues++;
            } else if (item.cvss >= 7.0) {
                highIssues++;
            } else if (item.cvss >= 4.0) {
                mediumIssues++;
            } else {
                lowIssues++;
            }

            if (item.cvss > maxCVSS) {
                maxCVSS = item.cvss;
            }
        }
    }

    // Determine overall risk level
    let riskLevel = "Low";
    if (maxCVSS >= 9.0) {
        riskLevel = "Critical";
    } else if (maxCVSS >= 7.0) {
        riskLevel = "High";
    } else if (maxCVSS >= 4.0) {
        riskLevel = "Medium";
    }

    // Update summary
    results.summary.riskLevel = riskLevel;
    results.summary.totalIssues = totalIssues;
    results.summary.criticalIssues = criticalIssues;
    results.summary.highIssues = highIssues;
    results.summary.mediumIssues = mediumIssues;
    results.summary.lowIssues = lowIssues;
    results.summary.maxCVSS = maxCVSS.toFixed(1);
}

// Apply recommended settings functions
export async function applyRecommendedSetting(settingType) {
    switch (settingType) {
        case 'disableThirdPartyCookies':
            return setThirdPartyCookies(false);
        case 'enableDoNotTrack':
            return setDoNotTrack(true);
        case 'disableJavascript':
            return setJavascriptEnabled(false);
        case 'disableHyperlinkAuditing':
            return setHyperlinkAuditing(false);
        default:
            return { success: false, message: 'Unknown setting type' };
    }
}

// Helper functions to apply settings
async function setThirdPartyCookies(value) {
    return new Promise((resolve) => {
        chrome.privacy.websites.thirdPartyCookiesAllowed.set({ value: value }, function () {
            if (chrome.runtime.lastError) {
                resolve({ success: false, message: chrome.runtime.lastError.message });
            } else {
                resolve({ success: true, message: 'Setting updated successfully' });
            }
        });
    });
}

async function setDoNotTrack(value) {
    return new Promise((resolve) => {
        chrome.privacy.websites.doNotTrackEnabled.set({ value: value }, function () {
            if (chrome.runtime.lastError) {
                resolve({ success: false, message: chrome.runtime.lastError.message });
            } else {
                resolve({ success: true, message: 'Setting updated successfully' });
            }
        });
    });
}

async function setJavascriptEnabled(value) {
    return new Promise((resolve) => {
        chrome.privacy.websites.javascriptEnabled.set({ value: value }, function () {
            if (chrome.runtime.lastError) {
                resolve({ success: false, message: chrome.runtime.lastError.message });
            } else {
                resolve({ success: true, message: 'Setting updated successfully' });
            }
        });
    });
}

async function setHyperlinkAuditing(value) {
    return new Promise((resolve) => {
        chrome.privacy.websites.hyperlinkAuditingEnabled.set({ value: value }, function () {
            if (chrome.runtime.lastError) {
                resolve({ success: false, message: chrome.runtime.lastError.message });
            } else {
                resolve({ success: true, message: 'Setting updated successfully' });
            }
        });
    });
}