// Function to check cookies for a given URL
export async function checkCookies(url) {
    return new Promise((resolve) => {
        chrome.cookies.getAll({url: url}, function(cookies) {
            const analysis = analyzeCookies(cookies);
            resolve(analysis);
        });
    });
}

function analyzeCookies(cookies) {
    let analysis = {
        totalCount: cookies.length,
        secure: 0,
        httpOnly: 0,
        thirdParty: 0,
        recommendations: []
    };

    cookies.forEach(cookie => {
        if (cookie.secure) analysis.secure++;
        if (cookie.httpOnly) analysis.httpOnly++;
        if (cookie.domain.charAt(0) === '.') analysis.thirdParty++;
    });

    // Generate recommendations
    if (analysis.totalCount > 20) {
        analysis.recommendations.push('High number of cookies detected. Consider reviewing and removing unnecessary cookies.');
    }
    if (analysis.secure < analysis.totalCount) {
        analysis.recommendations.push('Not all cookies are secure. Consider using HTTPS to secure all cookies.');
    }
    if (analysis.thirdParty > 0) {
        analysis.recommendations.push('Third-party cookies detected. Review these for potential privacy concerns.');
    }

    return analysis;
}