// Side panel JavaScript

let currentEmailData = null;
let selectedTone = 'professional';
let selectedLength = 'medium';
let refreshAttempts = 0;
let autoRefreshInterval = null;

// DOM Elements
const statusIndicator = document.getElementById('statusText');
const emailSection = document.getElementById('emailSection');
const toneSection = document.getElementById('toneSection');
const lengthSection = document.getElementById('lengthSection');
const replySection = document.getElementById('replySection');
const emailFrom = document.getElementById('emailFrom');
const emailSubject = document.getElementById('emailSubject');
const emailBody = document.getElementById('emailBody');
const generateBtn = document.getElementById('generateBtn');
const refreshBtn = document.getElementById('refreshBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const replyContainer = document.getElementById('replyContainer');
const replyText = document.getElementById('replyText');
const copyBtn = document.getElementById('copyBtn');
const editBtn = document.getElementById('editBtn');
const regenerateBtn = document.getElementById('regenerateBtn');
const copySuccess = document.getElementById('copySuccess');
const toneChips = document.querySelectorAll('.tone-chip');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadEmailData();
  setupEventListeners();
  startAutoRefresh();
});

// Load email data from storage
function loadEmailData() {
  chrome.storage.local.get(['currentEmail'], (result) => {
    if (result.currentEmail) {
      displayEmail(result.currentEmail);
      stopAutoRefresh();
    } else {
      // No email detected
      showNoEmailMessage();
    }
  });
}

// Setup event listeners
function setupEventListeners() {
  // Add listeners only if elements exist
  if (generateBtn) generateBtn.addEventListener('click', generateReply);
  if (refreshBtn) refreshBtn.addEventListener('click', refreshEmail);
  if (copyBtn) copyBtn.addEventListener('click', copyToClipboard);
  if (editBtn) editBtn.addEventListener('click', enableEdit);
  if (regenerateBtn) regenerateBtn.addEventListener('click', generateReply);

  // Tone selection
  toneChips.forEach(chip => {
    chip.addEventListener('click', () => {
      // Only toggle within the same group
      if (chip.dataset.tone) {
        document.querySelectorAll('[data-tone]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedTone = chip.dataset.tone;
      } else if (chip.dataset.length) {
        document.querySelectorAll('[data-length]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedLength = chip.dataset.length;
      }
    });
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'EMAIL_UPDATED') {
      displayEmail(request.data);
    }
  });
}

// Display email in side panel
function displayEmail(emailData) {
  currentEmailData = emailData;
  // Hide status when email is loaded
  const statusEl = document.querySelector('.status');
  if (statusEl) statusEl.style.display = 'none';
  
  if (emailFrom) emailFrom.textContent = emailData.from || 'Unknown';
  if (emailSubject) emailSubject.textContent = emailData.subject || 'No Subject';
  if (emailBody) emailBody.textContent = emailData.body || 'No content';
  if (emailSection) emailSection.classList.remove('hidden');
  if (toneSection) toneSection.classList.remove('hidden');
  if (lengthSection) lengthSection.classList.remove('hidden');
  if (replySection) replySection.classList.remove('hidden');
  if (replyContainer) replyContainer.classList.add('hidden');
  if (replyText) replyText.value = '';
  refreshAttempts = 0;
}

// Show no email message
function showNoEmailMessage() {
  if (statusIndicator) statusIndicator.textContent = 'Please select an email to get started';
  const statusEl = document.querySelector('.status');
  if (statusEl) {
    statusEl.style.display = 'flex';
    statusEl.classList.remove('active');
  }
  if (emailSection) emailSection.classList.add('hidden');
  if (toneSection) toneSection.classList.add('hidden');
  if (lengthSection) lengthSection.classList.add('hidden');
  if (replySection) replySection.classList.add('hidden');
}

// Auto-refresh to detect email
function startAutoRefresh() {
  if (autoRefreshInterval) return;
  
  autoRefreshInterval = setInterval(() => {
    if (!currentEmailData && refreshAttempts < 10) {
      refreshAttempts++;
      attemptEmailDetection();
    } else if (refreshAttempts >= 10) {
      stopAutoRefresh();
      if (statusIndicator) statusIndicator.textContent = 'Go back and select an email to continue';
    }
  }, 2000); // Check every 2 seconds
}

// Stop auto-refresh
function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

// Attempt to detect email
function attemptEmailDetection() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'REFRESH' }).catch(() => {
        // Silently fail, content script might not be ready
      });
    }
  });
  
  // Also check storage
  setTimeout(() => loadEmailData(), 500);
}

// Generate reply
async function generateReply() {
  if (!currentEmailData) {
    alert('No email data available. Please open an email first.');
    return;
  }
  if (generateBtn) generateBtn.disabled = true;
  if (loadingIndicator) loadingIndicator.classList.remove('hidden');
  if (replyContainer) replyContainer.classList.add('hidden');
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GENERATE_REPLY',
      emailContent: currentEmailData,
      tone: selectedTone,
      length: selectedLength
    });
    if (response.success) {
      displayReply(response.reply);
    } else {
      throw new Error(response.error || 'Failed to generate reply');
    }
  } catch (error) {
    console.error('Error generating reply:', error);
    alert('Failed to generate reply: ' + error.message);
  } finally {
    if (generateBtn) generateBtn.disabled = false;
    if (loadingIndicator) loadingIndicator.classList.add('hidden');
  }
}

// Display generated reply
function displayReply(reply) {
  if (replyText) {
    replyText.value = reply;
    replyText.disabled = true;
  }
  if (replyContainer) replyContainer.classList.remove('hidden');
  if (copySuccess) copySuccess.classList.add('hidden');
}

// Copy reply to clipboard
async function copyToClipboard() {
  if (!replyText) return;
  try {
    await navigator.clipboard.writeText(replyText.value);
    if (copySuccess) {
      copySuccess.classList.remove('hidden');
      setTimeout(() => copySuccess.classList.add('hidden'), 3000);
    }
  } catch (error) {
    alert('Failed to copy to clipboard');
  }
}

// Enable editing of reply
function enableEdit() {
  if (!replyText) return;
  replyText.disabled = !replyText.disabled;
  const icon = document.getElementById('editIcon');
  if (icon) icon.textContent = replyText.disabled ? '✏️' : '💾';
}

// Refresh email (manual)
function refreshEmail() {
  if (statusIndicator) statusIndicator.textContent = 'Refreshing...';
  const statusEl = document.querySelector('.status');
  if (statusEl) {
    statusEl.style.display = 'flex';
    statusEl.classList.remove('active');
  }
  refreshAttempts = 0;
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'REFRESH' }).catch(() => {
        loadEmailData();
      });
    }
  });
  
  setTimeout(() => {
    loadEmailData();
    startAutoRefresh();
  }, 1000);
}
