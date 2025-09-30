// Content script to extract email content from Gmail/Outlook

let currentEmailData = null;
let extensionValid = true;

// Detect which email service we're on
const isGmail = window.location.hostname.includes('mail.google.com');
const isOutlook = window.location.hostname.includes('outlook');

console.log('AI Email Reply Assistant: Content script loaded');

// Check if extension is still valid
function checkExtensionValid() {
  if (!chrome.runtime?.id) {
    extensionValid = false;
    return false;
  }
  return true;
}

// Extract email content based on email service
function extractEmailContent() {
  try {
    if (isGmail) {
      return extractGmailContent();
    } else if (isOutlook) {
      return extractOutlookContent();
    }
    return null;
  } catch (error) {
    console.error('Error extracting email content:', error);
    return null;
  }
}

// Gmail email extraction
function extractGmailContent() {
  console.log('Attempting to extract Gmail content...');
  
  // Check if we're viewing an email (not inbox list)
  const emailView = document.querySelector('[role="main"]');
  if (!emailView) {
    console.log('No email view found');
    return null;
  }

  // Try multiple selectors for subject
  let subjectElement = document.querySelector('h2.hP') || 
                       document.querySelector('h2[data-legacy-thread-id]') ||
                       document.querySelector('.hP');
  const subject = subjectElement ? subjectElement.textContent.trim() : 'No Subject';
  console.log('Subject:', subject);

  // Try multiple selectors for sender
  let senderElement = document.querySelector('span.gD') || 
                      document.querySelector('.gD') ||
                      document.querySelector('[email]');
  const senderEmail = senderElement ? senderElement.getAttribute('email') : '';
  const senderName = senderElement ? (senderElement.getAttribute('name') || senderElement.textContent || senderEmail) : 'Unknown';
  console.log('From:', senderName);

  // Try multiple selectors for email body - be more flexible
  let bodyElement = document.querySelector('div.a3s.aiL') ||
                    document.querySelector('div.a3s') ||
                    document.querySelector('[data-message-id] .a3s') ||
                    document.querySelector('.ii.gt');
  
  let body = '';
  if (bodyElement) {
    body = bodyElement.innerText.trim();
  } else {
    // Fallback: get all text from email container
    const msgBody = document.querySelector('.adn.ads') || document.querySelector('.gs');
    if (msgBody) {
      body = msgBody.innerText.trim();
    }
  }
  
  console.log('Body length:', body.length);

  // Extract date
  const dateElement = document.querySelector('span.g3') || document.querySelector('.g3');
  const date = dateElement ? (dateElement.getAttribute('title') || dateElement.textContent) : '';

  if (!body || body.length < 10) {
    console.log('No valid body content found');
    return null;
  }

  console.log('✓ Successfully extracted email content');
  return {
    service: 'gmail',
    subject,
    from: senderName,
    fromEmail: senderEmail,
    body,
    date,
    url: window.location.href
  };
}

// Outlook email extraction
function extractOutlookContent() {
  // Check if we're viewing an email
  const emailView = document.querySelector('[role="region"][aria-label*="message"]');
  if (!emailView) return null;

  // Extract subject
  const subjectElement = document.querySelector('[role="heading"]');
  const subject = subjectElement ? subjectElement.textContent.trim() : 'No Subject';

  // Extract sender
  const senderElement = document.querySelector('[role="heading"] + div');
  const from = senderElement ? senderElement.textContent.trim() : 'Unknown';

  // Extract email body
  const bodyElement = document.querySelector('[role="document"]');
  const body = bodyElement ? bodyElement.innerText.trim() : '';

  if (!body) return null;

  return {
    service: 'outlook',
    subject,
    from,
    body,
    url: window.location.href
  };
}

// Send email content to background script
function sendEmailContent(emailData) {
  if (emailData && JSON.stringify(emailData) !== JSON.stringify(currentEmailData)) {
    currentEmailData = emailData;
    
    // Check if extension context is valid
    if (!checkExtensionValid()) {
      return;
    }
    
    try {
      chrome.runtime.sendMessage({
        type: 'EMAIL_CONTENT',
        data: emailData
      }).catch(error => {
        // Silently handle context invalidation
        if (error.message?.includes('Extension context invalidated')) {
          extensionValid = false;
          console.log('Extension was reloaded. Please refresh Gmail page.');
        } else {
          console.error('Error sending email content:', error);
        }
      });
    } catch (error) {
      extensionValid = false;
      console.log('Cannot communicate with extension. Refresh page if needed.');
    }
  }
}

// Monitor for email changes
function monitorEmailChanges() {
  // Skip if extension context is invalid
  if (!extensionValid) return;
  
  console.log('Monitoring email changes...');
  const emailData = extractEmailContent();
  if (emailData) {
    console.log('Email data extracted:', emailData.subject);
    sendEmailContent(emailData);
  } else {
    console.log('No email data found');
  }
}

// Set up observers for dynamic content
const observer = new MutationObserver(() => {
  monitorEmailChanges();
});

// Start observing
if (isGmail) {
  const targetNode = document.querySelector('[role="main"]');
  if (targetNode) {
    observer.observe(targetNode, { childList: true, subtree: true });
  }
} else if (isOutlook) {
  observer.observe(document.body, { childList: true, subtree: true });
}

// Initial check with multiple attempts
setTimeout(() => {
  console.log('Initial email check (2s)');
  monitorEmailChanges();
}, 2000);

setTimeout(() => {
  console.log('Second email check (4s)');
  monitorEmailChanges();
}, 4000);

setTimeout(() => {
  console.log('Third email check (6s)');
  monitorEmailChanges();
}, 6000);

// Listen for URL changes (for single-page apps)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(() => {
      monitorEmailChanges();
    }, 1000);
  }
}).observe(document, { subtree: true, childList: true });

// Keyboard shortcut to manually trigger extraction (Ctrl+Shift+E)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'E') {
    console.log('==== MANUAL EXTRACTION TRIGGERED ====');
    console.log('URL:', window.location.href);
    console.log('Is Gmail:', isGmail);
    console.log('Extension valid:', extensionValid);
    
    // Test selectors
    console.log('Testing selectors:');
    console.log('- [role="main"]:', !!document.querySelector('[role="main"]'));
    console.log('- h2.hP:', !!document.querySelector('h2.hP'));
    console.log('- .gD:', !!document.querySelector('.gD'));
    console.log('- .a3s:', !!document.querySelector('.a3s'));
    console.log('- .ii.gt:', !!document.querySelector('.ii.gt'));
    
    monitorEmailChanges();
    console.log('==== END MANUAL EXTRACTION ====');
  }
});
