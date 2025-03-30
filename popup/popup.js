document.addEventListener('DOMContentLoaded', function () {
    // Tab navigation
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));

            // Add active class to clicked tab
            this.classList.add('active');

            // Show corresponding tab content
            const tabId = this.id.replace('tab', '');
            document.getElementById(tabId + 'Tab').classList.add('active');
        });
    });

    // Button references
    const analyzePrivacyBtn = document.getElementById('analyzePrivacy');
    const checkCookiesBtn = document.getElementById('checkCookies');
    const generateReportBtn = document.getElementById('generateReport');
    const exportReportBtn = document.getElementById('exportReport');
    const openOptionsBtn = document.getElementById('openOptions');

    // Results containers
    const resultsDiv = document.getElementById('results');
    const recommendationsListDiv = document.getElementById('recommendationsList');
    const reportHistoryDiv = document.getElementById('reportHistory');

    // Current state
    let currentPrivacyResults = null;
    let currentCookieResults = null;
    let currentUrl = '';
    let currentTitle = '';
    let currentReport = null;

    // Initialize
    loadRecommendations();
    loadReportHistory();

    // Get current tab info
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        currentUrl = tabs[0].url;
        currentTitle = tabs[0].title;
    });

    // Privacy analysis button
    analyzePrivacyBtn.addEventListener('click', function () {
        resultsDiv.innerHTML = '<p>Analyzing privacy settings...</p>';

        chrome.runtime.sendMessage({ action: 'analyzePrivacy' }, function (response) {
            currentPrivacyResults = response;
            displayPrivacyResults(response);
            loadRecommendations();
        });
    });

    // Cookie check button
    checkCookiesBtn.addEventListener('click', function () {
        resultsDiv.innerHTML = '<p>Checking cookies...</p>';

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            currentUrl = tabs[0].url;
            currentTitle = tabs[0].title;

            chrome.runtime.sendMessage(
                { action: 'checkCookies', url: tabs[0].url },
                function (response) {
                    currentCookieResults = response;
                    displayCookieResults(response);
                }
            );
        });
    });

    // Generate report button
    generateReportBtn.addEventListener('click', function () {
        if (!currentPrivacyResults && !currentCookieResults) {
            // We need to run analysis first
            analyzePrivacyBtn.click();

            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.runtime.sendMessage(
                    { action: 'checkCookies', url: tabs[0].url },
                    function (cookieResponse) {
                        currentCookieResults = cookieResponse;

                        // Once both analyses are done, generate report
                        generateReport();
                    }
                );
            });
        } else {
            generateReport();
        }
    });

    // Generate and display report
    function generateReport() {
        chrome.runtime.sendMessage({
            action: 'generateReport',
            url: currentUrl,
            title: currentTitle,
            privacyResults: currentPrivacyResults,
            cookieResults: currentCookieResults
        }, function (report) {
            currentReport = report;
            exportReportBtn.disabled = false;

            // Switch to the reports tab
            document.getElementById('tabReports').click();

            // Show report
            displayReport(report);

            // Refresh report history
            loadReportHistory();
        });
    }

    // Export report button
    exportReportBtn.addEventListener('click', function () {
        if (!currentReport) return;

        chrome.runtime.sendMessage({
            action: 'generateHTMLReport',
            report: currentReport
        }, function (htmlReport) {
            // Create a blob with the HTML report
            const blob = new Blob([htmlReport], { type: 'text/html' });
            const url = URL.createObjectURL(blob);

            // Create a link to download it
            const a = document.createElement('a');
            a.href = url;
            a.download = `privacy-report-${new Date().toISOString().slice(0, 10)}.html`;
            document.body.appendChild(a);
            a.click();

            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
        });
    });

    // Open options button
    openOptionsBtn.addEventListener('click', function () {
        chrome.runtime.openOptionsPage();
    });

    // Display privacy analysis results
    function displayPrivacyResults(results) {
        if (!results || results.error) {
            resultsDiv.innerHTML = '<p>Error analyzing privacy settings.</p>';
            return;
        }

        let html = '<h2>Privacy Analysis Results</h2>';

        // Overall risk level
        html += `<p><strong>Risk Level:</strong> 
            <span class="cvss cvss-${getSeverityClass(results.summary.riskLevel)}">${results.summary.riskLevel}</span>
        </p>`;

        html += `<p><strong>Issues found:</strong> ${results.summary.totalIssues}</p>`;

        // Details for each privacy setting
        if (results.details) {
            html += '<h3>Privacy Settings:</h3><ul>';

            for (const key in results.details) {
                const setting = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                const item = results.details[key];
                const severity = getCVSSSeverity(item.cvss);

                html += `<li>
                    <strong>${setting}:</strong> ${item.setting ? 'Enabled' : 'Disabled'}
                    ${item.cvss > 0 ?
                        `<span class="cvss cvss-${getSeverityClass(severity)}">${item.cvss} (${severity})</span>` :
                        ''}
                    <br><em>${item.recommendation}</em>
                </li>`;
            }

            html += '</ul>';
        }

        resultsDiv.innerHTML = html;
    }

    // Display cookie analysis results
    function displayCookieResults(results) {
        if (!results || results.error) {
            resultsDiv.innerHTML = '<p>Error checking cookies.</p>';
            return;
        }

        if (results.disabled) {
            resultsDiv.innerHTML = '<p>Cookie checking is disabled in preferences.</p>';
            return;
        }

        let html = '<h2>Cookie Analysis Results</h2>';

        html += `<p><strong>URL:</strong> ${results.url}</p>`;

        // Overall stats
        html += `<p>
            <strong>Total cookies:</strong> ${results.totalCount}<br>
            <strong>Secure cookies:</strong> ${results.secure}/${results.totalCount}<br>
            <strong>HttpOnly cookies:</strong> ${results.httpOnly}/${results.totalCount}<br>
            <strong>Third-party cookies:</strong> ${results.thirdParty}/${results.totalCount}
        </p>`;

        // Issues
        if (results.issues && results.issues.length > 0) {
            html += `<h3>Issues (${results.issues.length}):</h3><ul>`;

            results.issues.forEach(issue => {
                html += `<li>
                    <strong>${issue.message}</strong> 
                    <span class="cvss cvss-${getSeverityClass(issue.severity)}">${issue.cvss} (${issue.severity})</span>
                    <br><em>${issue.recommendation}</em>
                </li>`;
            });

            html += '</ul>';
        } else {
            html += '<p>No cookie issues found.</p>';
        }

        resultsDiv.innerHTML = html;
    }

    // Load and display recommendations
    function loadRecommendations() {
        chrome.runtime.sendMessage({ action: 'analyzePrivacy' }, function (results) {
            if (!results || !results.details) {
                recommendationsListDiv.innerHTML = '<p>No recommendations available.</p>';
                return;
            }

            let html = '';
            let hasRecommendations = false;

            for (const key in results.details) {
                const setting = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                const item = results.details[key];

                // Only show recommendations for issues
                if (item.cvss > 0 && item.canApply) {
                    hasRecommendations = true;
                    const severity = getCVSSSeverity(item.cvss);

                    html += `
                        <div class="recommendation-item">
                            <div class="recommendation-header">
                                <strong>${setting}</strong>
                                <span class="cvss cvss-${getSeverityClass(severity)}">${item.cvss} (${severity})</span>
                            </div>
                            <p>${item.recommendation}</p>
                            <button class="apply-btn" data-setting="${item.applyAction}">Apply Recommendation</button>
                        </div>
                    `;
                }
            }

            if (!hasRecommendations) {
                html = '<p>No recommendations available.</p>';
            }

            recommendationsListDiv.innerHTML = html;

            // Add event listeners to apply buttons
            document.querySelectorAll('.apply-btn').forEach(button => {
                button.addEventListener('click', function () {
                    const settingType = this.getAttribute('data-setting');
                    this.textContent = 'Applying...';
                    this.disabled = true;

                    chrome.runtime.sendMessage(
                        { action: 'applySetting', settingType: settingType },
                        (response) => {
                            if (response.success) {
                                this.textContent = 'Applied ✓';
                                // Reload recommendations after a delay
                                setTimeout(loadRecommendations, 2000);
                            } else {
                                this.textContent = 'Failed ✗';
                                this.disabled = false;
                            }
                        }
                    );
                });
            });
        });
    }

    // Load report history
    function loadReportHistory() {
        chrome.runtime.sendMessage({ action: 'getReportHistory' }, function (reports) {
            if (!reports || reports.length === 0) {
                reportHistoryDiv.innerHTML = '<p>No reports available.</p>';
                return;
            }

            let html = '';

            reports.forEach(report => {
                const date = new Date(report.timestamp).toLocaleString();

                html += `
                    <div class="report-item" data-report-id="${report.id}">
                        <div class="report-title">${report.title}</div>
                        <div class="report-meta">${date}</div>
                        <div>
                            <span class="report-risk cvss-${getSeverityClass(report.overallRiskLevel)}">${report.overallRiskLevel}</span>
                            <span>Issues: ${report.summary.privacyIssues + report.summary.cookieIssues}</span>
                        </div>
                    </div>
                `;
            });

            reportHistoryDiv.innerHTML = html;

            // Add event listeners for report items
            document.querySelectorAll('.report-item').forEach(item => {
                item.addEventListener('click', function () {
                    const reportId = this.getAttribute('data-report-id');
                    // Find the report
                    const report = reports.find(r => r.id === reportId);
                    if (report) {
                        currentReport = report;
                        exportReportBtn.disabled = false;
                        displayReport(report);
                    }
                });
            });
        });
    }

    // Display a specific report
    function displayReport(report) {
        let html = '<h2>Report Details</h2>';

        html += `
            <p><strong>URL:</strong> ${report.url}</p>
            <p><strong>Generated:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
            <p><strong>Risk Level:</strong> 
                <span class="cvss cvss-${getSeverityClass(report.overallRiskLevel)}">${report.overallRiskLevel}</span>
            </p>
            <p><strong>CVSS Score:</strong> ${report.summary.maxCVSS}</p>
            <p><strong>Total Issues:</strong> ${report.summary.privacyIssues + report.summary.cookieIssues}</p>
        `;

        // Add privacy details if available
        if (report.privacyResults && report.privacyResults.summary) {
            html += `<h3>Privacy Issues: ${report.privacyResults.summary.totalIssues}</h3>`;

            if (report.privacyResults.summary.totalIssues > 0) {
                html += '<ul>';

                for (const key in report.privacyResults.details) {
                    const item = report.privacyResults.details[key];
                    if (item.cvss > 0) {
                        const setting = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                        html += `<li><strong>${setting}:</strong> ${item.recommendation}</li>`;
                    }
                }

                html += '</ul>';
            } else {
                html += '<p>No privacy issues found.</p>';
            }
        }

        // Add cookie details if available
        if (report.cookieResults && report.cookieResults.issues) {
            html += `<h3>Cookie Issues: ${report.cookieResults.issues.length}</h3>`;

            if (report.cookieResults.issues.length > 0) {
                html += '<ul>';

                report.cookieResults.issues.forEach(issue => {
                    html += `<li><strong>${issue.message}:</strong> ${issue.recommendation}</li>`;
                });

                html += '</ul>';
            } else {
                html += '<p>No cookie issues found.</p>';
            }
        }

        resultsDiv.innerHTML = html;
        // Switch to first tab to show results
        document.getElementById('tabAnalysis').click();
    }

    // Helper to get CSS class based on severity
    function getSeverityClass(severity) {
        switch (severity) {
            case 'Critical': return 'critical';
            case 'High': return 'high';
            case 'Medium': return 'medium';
            case 'Low':
            case 'None':
            default: return 'low';
        }
    }

    // Helper to convert CVSS score to severity label
    function getCVSSSeverity(score) {
        if (score >= 9.0) return 'Critical';
        if (score >= 7.0) return 'High';
        if (score >= 4.0) return 'Medium';
        if (score > 0) return 'Low';
        return 'None';
    }
});