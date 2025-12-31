// Fixed experiment for STROBE (Stroop Task for Repeated Observation of Behavioral Effects)
const experiment = 'strobe';

// Check authentication status on page load
async function checkAuth() {
    try {
        const response = await fetch(`/api/check-auth?experiment=${experiment}`);
        const data = await response.json();

        if (data.authenticated && data.experiment === experiment) {
            // Already authenticated, redirect to experiment page
            window.location.href = `experiment.html?experiment=${experiment}`;
        }
    } catch (error) {
        console.error('Error checking auth:', error);
    }
}

// Display status message
function showStatusMessage(message, type = 'info') {
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.style.display = 'block';
}

// Handle login form submission
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

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
checkAuth();
