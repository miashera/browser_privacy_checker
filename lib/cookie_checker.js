// Enhanced cookie_checker.js
export async function checkCookies(url) {
    // First get user preferences
    const preferences = await getUserPreferences();

    if (!preferences.checkCookies) {
        return { disabled: true, message: "Cookie checking is disabled in preferences" };
    }

    return new Promise((resolve) => {
        chrome.cookies.getAll({ url: url }, function (cookies) {
            const analysis = analyzeCookies(cookies, url);
            resolve(analysis);
        });
    });
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

function analyzeCookies(cookies, url) {
    let analysis = {
        timestamp: new Date().toISOString(),
        url: url,
        totalCount: cookies.length,
        secure: 0,
        httpOnly: 0,
        thirdParty: 0,
        sameSite: 0,
        longExpiry: 0,
        issues: [],
        cvssScore: 0
    };

    // Calculate expiry date threshold (30 days from now)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    cookies.forEach(cookie => {
        if (cookie.secure) analysis.secure++;
        if (cookie.httpOnly) analysis.httpOnly++;
        if (cookie.domain && cookie.domain.charAt(0) === '.') analysis.thirdParty++;
        if (cookie.sameSite && cookie.sameSite !== "no_restriction") analysis.sameSite++;

        // Check for cookies with long expiry times
        if (cookie.expirationDate && new Date(cookie.expirationDate * 1000) > thirtyDaysFromNow) {
            analysis.longExpiry++;
        }
    });

    // Generate issues with CVSS scores
    if (analysis.totalCount > 20) {
        analysis.issues.push({
            type: 'excessive_cookies',
            message: 'High number of cookies detected',
            count: analysis.totalCount,
            recommendation: 'Consider reviewing and removing unnecessary cookies',
            cvss: 3.5, // Medium severity
            severity: 'Medium'
        });
    }

    if (analysis.secure < analysis.totalCount) {
        const insecureCount = analysis.totalCount - analysis.secure;
        analysis.issues.push({
            type: 'insecure_cookies',
            message: 'Not all cookies use secure flag',
            count: insecureCount,
            recommendation: 'Use HTTPS to secure all cookies',
            cvss: 6.8, // High severity
            severity: 'High'
        });
    }

    if (analysis.httpOnly < analysis.totalCount) {
        const nonHttpOnlyCount = analysis.totalCount - analysis.httpOnly;
        analysis.issues.push({
            type: 'non_httponly_cookies',
            message: 'Some cookies are accessible via JavaScript',
            count: nonHttpOnlyCount,
            recommendation: 'Use HttpOnly flag for cookies that don\'t need JavaScript access',
            cvss: 5.4, // Medium severity
            severity: 'Medium'
        });
    }

    if (analysis.thirdParty > 0) {
        analysis.issues.push({
            type: 'third_party_cookies',
            message: 'Third-party cookies detected',
            count: analysis.thirdParty,
            recommendation: 'Review third-party cookies for potential privacy concerns',
            cvss: 6.5, // High severity
            severity: 'High'
        });
    }

    if (analysis.longExpiry > 0) {
        analysis.issues.push({
            type: 'long_expiry_cookies',
            message: 'Cookies with long expiration detected',
            count: analysis.longExpiry,
            recommendation: 'Consider using session cookies or shorter expiry times',
            cvss: 2.8, // Low severity
            severity: 'Low'
        });
    }

    // Calculate max CVSS score
    if (analysis.issues.length > 0) {
        analysis.cvssScore = Math.max(...analysis.issues.map(issue => issue.cvss));

        // Determine overall severity
        if (analysis.cvssScore >= 9.0) {
            analysis.severity = 'Critical';
        } else if (analysis.cvssScore >= 7.0) {
            analysis.severity = 'High';
        } else if (analysis.cvssScore >= 4.0) {
            analysis.severity = 'Medium';
        } else {
            analysis.severity = 'Low';
        }
    } else {
        analysis.severity = 'None';
    }

    return analysis;
}