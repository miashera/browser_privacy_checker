// report_generator.js
export async function generateReport(url, title, privacyResults, cookieResults) {
    const timestamp = new Date().toISOString();
    const report = {
        id: generateReportId(),
        timestamp: timestamp,
        url: url,
        title: title || url,
        overallRiskLevel: calculateOverallRisk(privacyResults, cookieResults),
        summary: {
            privacyIssues: privacyResults ? privacyResults.summary.totalIssues : 0,
            cookieIssues: cookieResults && cookieResults.issues ? cookieResults.issues.length : 0,
            maxCVSS: calculateMaxCVSS(privacyResults, cookieResults)
        },
        privacyResults: privacyResults,
        cookieResults: cookieResults
    };

    return report;
}

// Generate a unique report ID
function generateReportId() {
    return 'report_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Calculate the overall risk level
function calculateOverallRisk(privacyResults, cookieResults) {
    let maxRiskLevel = 'None';

    // Check privacy results
    if (privacyResults && privacyResults.summary && privacyResults.summary.riskLevel) {
        maxRiskLevel = privacyResults.summary.riskLevel;
    }

    // Check cookie results
    if (cookieResults && cookieResults.severity) {
        // Convert severity to numeric value for comparison
        const severityMap = {
            'None': 0,
            'Low': 1,
            'Medium': 2,
            'High': 3,
            'Critical': 4
        };

        const privacySeverity = severityMap[maxRiskLevel] || 0;
        const cookieSeverity = severityMap[cookieResults.severity] || 0;

        // Use the higher severity
        if (cookieSeverity > privacySeverity) {
            maxRiskLevel = cookieResults.severity;
        }
    }

    return maxRiskLevel;
}

// Calculate the maximum CVSS score
function calculateMaxCVSS(privacyResults, cookieResults) {
    let maxCVSS = 0;

    // Check privacy results
    if (privacyResults && privacyResults.summary && privacyResults.summary.maxCVSS) {
        maxCVSS = parseFloat(privacyResults.summary.maxCVSS);
    }

    // Check cookie results
    if (cookieResults && cookieResults.cvssScore) {
        maxCVSS = Math.max(maxCVSS, cookieResults.cvssScore);
    }

    return maxCVSS.toFixed(1);
}

// Generate HTML report for export
export function generateHTMLReport(report) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Report for ${report.title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            color: #2c3e50;
        }
        .report-header {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .report-meta {
            color: #7f8c8d;
            font-size: 0.9em;
        }
        .risk-indicator {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 3px;
            color: white;
            font-weight: bold;
        }
        .risk-None { background-color: #27ae60; }
        .risk-Low { background-color: #2ecc71; }
        .risk-Medium { background-color: #f39c12; }
        .risk-High { background-color: #e74c3c; }
        .risk-Critical { background-color: #c0392b; }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .recommendation {
            background-color: #eef8ff;
            padding: 10px;
            border-left: 3px solid #3498db;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="report-header">
            <h1>Privacy Report</h1>
            <p class="report-meta">Generated on ${new Date(report.timestamp).toLocaleString()}</p>
            <p><strong>URL:</strong> ${report.url}</p>
            <p><strong>Risk Level:</strong> <span class="risk-indicator risk-${report.overallRiskLevel}">${report.overallRiskLevel}</span></p>
            <p><strong>CVSS Score:</strong> ${report.summary.maxCVSS}</p>
        </div>
        
        <h2>Summary</h2>
        <p>This report found ${report.summary.privacyIssues + report.summary.cookieIssues} privacy issues:</p>
        <ul>
            <li>${report.summary.privacyIssues} browser privacy settings issues</li>
            <li>${report.summary.cookieIssues} cookie-related issues</li>
        </ul>
        
        <h2>Browser Privacy Settings</h2>
        ${generatePrivacyResultsHTML(report.privacyResults)}
        
        <h2>Cookie Analysis</h2>
        ${generateCookieResultsHTML(report.cookieResults)}
    </div>
</body>
</html>
    `;

    return html;
}

// Generate HTML for privacy results
function generatePrivacyResultsHTML(privacyResults) {
    if (!privacyResults || !privacyResults.details) {
        return '<p>No privacy settings were analyzed.</p>';
    }

    let html = `
        <table>
            <tr>
                <th>Setting</th>
                <th>Status</th>
                <th>Risk</th>
                <th>Recommendation</th>
            </tr>
    `;

    for (const key in privacyResults.details) {
        const item = privacyResults.details[key];
        const setting = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        let severity = 'None';

        if (item.cvss >= 9.0) {
            severity = 'Critical';
        } else if (item.cvss >= 7.0) {
            severity = 'High';
        } else if (item.cvss >= 4.0) {
            severity = 'Medium';
        } else if (item.cvss > 0) {
            severity = 'Low';
        }

        html += `
            <tr>
                <td>${setting}</td>
                <td>${item.setting ? 'Enabled' : 'Disabled'}</td>
                <td><span class="risk-indicator risk-${severity}">${severity}</span></td>
                <td>${item.recommendation}</td>
            </tr>
        `;
    }

    html += '</table>';
    return html;
}

// Generate HTML for cookie results
function generateCookieResultsHTML(cookieResults) {
    if (!cookieResults || cookieResults.disabled) {
        return '<p>Cookie analysis was not performed.</p>';
    }

    let html = `
        <p><strong>Total cookies:</strong> ${cookieResults.totalCount}</p>
        <p><strong>Secure cookies:</strong> ${cookieResults.secure}/${cookieResults.totalCount}</p>
        <p><strong>HttpOnly cookies:</strong> ${cookieResults.httpOnly}/${cookieResults.totalCount}</p>
        <p><strong>Third-party cookies:</strong> ${cookieResults.thirdParty}/${cookieResults.totalCount}</p>
        
        <h3>Issues Found</h3>
    `;

    if (!cookieResults.issues || cookieResults.issues.length === 0) {
        html += '<p>No cookie issues were found.</p>';
    } else {
        html += '<table><tr><th>Issue</th><th>Severity</th><th>Recommendation</th></tr>';

        cookieResults.issues.forEach(issue => {
            html += `
                <tr>
                    <td>${issue.message} (${issue.count} cookies)</td>
                    <td><span class="risk-indicator risk-${issue.severity}">${issue.severity}</span></td>
                    <td>${issue.recommendation}</td>
                </tr>
            `;
        });

        html += '</table>';
    }

    return html;
}