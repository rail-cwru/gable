// Get experiment from URL parameter
function getExperimentFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('experiment');
}

// Get experiment display name
function getExperimentDisplayName(experiment) {
    // Always return STROBE as the display name
    return 'STROBE - Stroop Task for Repeated Observation of Behavioral Effects';
}

// Display experiment name
function displayExperimentName() {
    const experiment = getExperimentFromURL();
    if (experiment) {
        const displayName = getExperimentDisplayName(experiment);
        const experimentEl = document.getElementById('experiment-display');
        if (experimentEl) {
            experimentEl.textContent = displayName;
        }
    } else {
        // Redirect to home if no experiment specified
        window.location.href = '/';
    }
}

// Check authentication status on page load
async function checkAuth() {
    const experiment = getExperimentFromURL();
    if (!experiment) {
        window.location.href = '/';
        return;
    }

    try {
        const response = await fetch(`/api/check-auth?experiment=${experiment}`);
        const data = await response.json();

        if (data.authenticated && data.experiment === experiment) {
            // Already authenticated, redirect to experiment page
            window.location.href = `experiment.html?experiment=${experiment}`;
        } else {
            showLoginState();
        }
    } catch (error) {
        console.error('Error checking auth:', error);
        showLoginState();
    }
}

// Show login form
function showLoginState() {
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('logged-in-section').style.display = 'none';
    clearStatusMessage();
}



// Display status message
function showStatusMessage(message, type = 'info') {
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.style.display = 'block';
}

// Clear status message
function clearStatusMessage() {
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = '';
    statusEl.className = 'status-message';
    statusEl.style.display = 'none';
}

// Handle login form submission
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const experiment = getExperimentFromURL();
    if (!experiment) {
        showStatusMessage('Invalid experiment', 'error');
        return;
    }

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, experiment })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Redirect to experiment page after successful login
            window.location.href = `experiment.html?experiment=${experiment}`;
        } else {
            showStatusMessage(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showStatusMessage('An error occurred during login', 'error');
    }
});



// Handle "Use Default Login" button
const useDefaultBtn = document.getElementById('use-default-btn');
if (useDefaultBtn) {
    useDefaultBtn.addEventListener('click', () => {
        document.getElementById('username').value = 'P11153a751d';
        document.getElementById('password').value = '1234';
    });
}

// Initialize on page load
displayExperimentName();
checkAuth();

