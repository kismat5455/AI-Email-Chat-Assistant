// Background service worker for Chrome extension

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EMAIL_CONTENT') {
    // Store email content and forward to side panel
    chrome.storage.local.set({ 
      currentEmail: request.data,
      timestamp: Date.now()
    }, () => {
      // Notify side panel that new email data is available
      chrome.runtime.sendMessage({ 
        type: 'EMAIL_UPDATED',
        data: request.data 
      }).catch(() => {
        // Side panel might not be open, that's okay
      });
    });
    sendResponse({ success: true });
  } else if (request.type === 'GENERATE_REPLY') {
    // Generate reply using AI (you can integrate OpenAI API here)
    generateReply(request.emailContent, request.tone, request.length)
      .then(reply => sendResponse({ success: true, reply }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
});

// AI Reply Generation Function
async function generateReply(emailContent, tone = 'professional', length = 'medium') {
  // Try backend API first
  try {
    return await generateBackendReply(emailContent, tone, length);
  } catch (error) {
    console.error('Backend API failed, falling back to templates:', error);
    return generateTemplateReply(emailContent, tone, length);
  }
}

// Backend API Integration (Spring Boot + Gemini)
async function generateBackendReply(emailContent, tone, length) {
  const backendUrl = 'http://localhost:8080/api/email/generate';
  
  const requestBody = {
    emailContent: `From: ${emailContent.from}\nSubject: ${emailContent.subject}\n\n${emailContent.body}`,
    tone: tone,
    length: length
  };
  
  const response = await fetch(backendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    throw new Error(`Backend API returned ${response.status}`);
  }
  
  return await response.text();
}

// OpenAI API Integration
async function generateOpenAIReply(emailContent, tone, apiKey) {
  const toneInstructions = {
    professional: 'Generate a professional, polished email reply.',
    friendly: 'Generate a warm, friendly email reply.',
    casual: 'Generate a casual, relaxed email reply.',
    formal: 'Generate a very formal, business-appropriate email reply.',
    brief: 'Generate a brief, concise email reply (2-3 sentences max).',
    rude: 'Generate a rude, blunt, and dismissive email reply.',
    sarcastic: 'Generate a sarcastic, witty email reply with subtle mockery.',
    nervous: 'Generate a nervous, apologetic, and overly cautious email reply.'
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an email assistant. ${toneInstructions[tone]} Be natural and context-aware.`
        },
        {
          role: 'user',
          content: `Reply to this email:\n\nFrom: ${emailContent.from}\nSubject: ${emailContent.subject}\n\n${emailContent.body}`
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    })
  });
  
  if (!response.ok) {
    throw new Error('OpenAI API request failed');
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// Template-based reply generation (works without external API)
function generateTemplateReply(emailContent, tone = 'professional', length = 'medium') {
  const bodyLower = emailContent.body.toLowerCase();
  const subjectLower = emailContent.subject.toLowerCase();
  
  // Detect email type
  let emailType = 'default';
  if (bodyLower.includes('meeting') || bodyLower.includes('schedule') || bodyLower.includes('calendar')) {
    emailType = 'meeting';
  } else if (bodyLower.includes('question') || bodyLower.includes('how') || bodyLower.includes('what') || bodyLower.includes('could you')) {
    emailType = 'question';
  } else if (bodyLower.includes('thank') || bodyLower.includes('received')) {
    emailType = 'acknowledgment';
  }
  
  // Generate reply based on tone and email type
  const templates = {
    professional: {
      meeting: `Thank you for your email regarding ${emailContent.subject}.\n\nI'd be happy to discuss this further. Please let me know what times work best for you, and I'll do my best to accommodate.\n\nLooking forward to connecting.\n\nBest regards`,
      question: `Thank you for reaching out.\n\nI've reviewed your inquiry about ${emailContent.subject}. I'll need to look into this further and will get back to you with a detailed response within 24-48 hours.\n\nIf this is urgent, please don't hesitate to follow up.\n\nBest regards`,
      acknowledgment: `Thank you for your email.\n\nI've received your message regarding ${emailContent.subject} and wanted to acknowledge receipt. I'll review the details and respond accordingly.\n\nBest regards`,
      default: `Thank you for your email about ${emailContent.subject}.\n\nI appreciate you reaching out. I'll review this and get back to you shortly.\n\nBest regards`
    },
    friendly: {
      meeting: `Hi! Thanks for reaching out about ${emailContent.subject}.\n\nI'd love to chat! Just let me know what times work for you and we'll figure something out.\n\nLooking forward to it!\n\nCheers`,
      question: `Hey! Thanks for your question about ${emailContent.subject}.\n\nLet me look into this and I'll get back to you soon with more details. Should have an answer for you in the next day or two.\n\nTalk soon!`,
      acknowledgment: `Hi! Got your message about ${emailContent.subject}.\n\nThanks for sending this over! I'll take a look and get back to you.\n\nCheers`,
      default: `Hi! Thanks for your email about ${emailContent.subject}.\n\nI'll take a look at this and get back to you soon.\n\nThanks!`
    },
    casual: {
      meeting: `Hey! Thanks for the email.\n\nYeah, I'm down to meet. Just shoot me some times that work for you.\n\nTalk soon`,
      question: `Hey,\n\nGot your question. Let me check on this and I'll hit you back.\n\nCheers`,
      acknowledgment: `Hey,\n\nGot it, thanks! I'll check this out.\n\nTalk soon`,
      default: `Hey,\n\nThanks for the email. I'll take a look at this.\n\nCheers`
    },
    formal: {
      meeting: `Dear ${emailContent.from},\n\nThank you for your correspondence regarding ${emailContent.subject}.\n\nI would be pleased to arrange a meeting at your convenience. Please advise me of suitable times, and I will endeavor to accommodate your schedule.\n\nI look forward to our discussion.\n\nYours sincerely`,
      question: `Dear ${emailContent.from},\n\nThank you for your inquiry concerning ${emailContent.subject}.\n\nI have noted your question and will conduct a thorough review. I anticipate providing you with a comprehensive response within the next 24-48 hours.\n\nShould you require immediate assistance, please do not hesitate to contact me.\n\nYours sincerely`,
      acknowledgment: `Dear ${emailContent.from},\n\nI acknowledge receipt of your correspondence regarding ${emailContent.subject}.\n\nI will review the matter and respond in due course.\n\nYours sincerely`,
      default: `Dear ${emailContent.from},\n\nThank you for your correspondence regarding ${emailContent.subject}.\n\nI will review your message and respond accordingly.\n\nYours sincerely`
    },
    brief: {
      meeting: `Thanks! Please send available times and I'll confirm.`,
      question: `Thanks for your question. I'll review and respond within 24-48 hours.`,
      acknowledgment: `Received, thanks. Will review and respond soon.`,
      default: `Thanks for your email. Will review and respond shortly.`
    },
    rude: {
      meeting: `I guess we can meet if you absolutely insist. Send me times, I'll see if I can be bothered.`,
      question: `Seriously? This again? Fine, I'll look into it when I have time.`,
      acknowledgment: `Yeah, I got it. What do you want, a medal?`,
      default: `I received your email. Happy now?`
    },
    sarcastic: {
      meeting: `Oh wow, another meeting! I can barely contain my excitement. Sure, send me times and I'll pencil you into my incredibly busy schedule.`,
      question: `What a fascinating question. Let me consult my crystal ball and get back to you with an answer that will surely change your life.`,
      acknowledgment: `Oh thank you SO much for this email. I was just sitting here hoping someone would send me more work.`,
      default: `Your email has been received with the utmost enthusiasm. I'll get right on that... eventually.`
    },
    nervous: {
      meeting: `Oh! Um, yes, I think I could maybe meet? If that's okay with you? I'm so sorry if my schedule is inconvenient! Please let me know what works for you and I'll try my absolute best to accommodate!\n\nSorry for any trouble!`,
      question: `Oh no, I'm so sorry! I hope I can answer this correctly! I'll look into this right away and get back to you as soon as possible. I really hope this helps and I'm sorry if I miss anything!\n\nPlease let me know if you need anything else!`,
      acknowledgment: `Thank you so much for your email! I really appreciate you taking the time! I've received it and will review everything carefully. I'm sorry if I'm slow to respond!\n\nThank you again!`,
      default: `Thank you so much for your email! I'm sorry for any delays! I'll review this as quickly as possible and get back to you! I really appreciate your patience!\n\nApologies in advance if I mess anything up!`
    }
  };
  
  let reply = templates[tone][emailType];
  
  // Adjust reply length
  if (length === 'short') {
    // For short emails, reduce to essential content only
    const lines = reply.split('\n').filter(line => line.trim());
    if (lines.length > 3) {
      reply = lines.slice(0, 2).join('\n');
    }
  } else if (length === 'long') {
    // For long emails, add more detail and elaboration
    reply = expandReply(reply, emailContent, tone, emailType);
  }
  
  return reply;
}

// Expand reply for long emails
function expandReply(reply, emailContent, tone, emailType) {
  const expansions = {
    professional: {
      meeting: `\n\nI believe this discussion will be valuable for both of us. I'm available most days this week and next, with some flexibility in my schedule. Please feel free to suggest a few time slots that work best for you, and I'll confirm my availability.\n\nIf you'd like to discuss any specific topics or agenda items beforehand, please don't hesitate to share them. This will help ensure our meeting is as productive as possible.\n\nI look forward to our conversation.`,
      question: `\n\nI want to make sure I provide you with the most accurate and helpful information. I'll conduct a comprehensive review and consult with any relevant team members if necessary to ensure I give you a complete response.\n\nIn the meantime, if you have any additional context or specific details you'd like me to consider, please feel free to send them over. This will help me provide a more tailored response to your inquiry.\n\nI appreciate your patience as I work on this for you.`,
      acknowledgment: `\n\nI want to ensure I give this the attention it deserves. I'll carefully review all the information you've provided and will reach out if I have any questions or need clarification on any points.\n\nPlease know that I'm here to help, and if there's anything urgent or if you have additional information to share in the meantime, don't hesitate to reach out.\n\nThank you for your communication.`,
      default: `\n\nI appreciate you taking the time to reach out and share this information with me. I want to ensure I give this matter the proper attention and consideration it deserves.\n\nI'll review everything thoroughly and will get back to you with a comprehensive response. If I need any additional information or clarification, I'll be sure to let you know.\n\nThank you for your patience and understanding.`
    },
    friendly: {
      meeting: `\n\nI'm really flexible with my schedule, so whatever works best for you should work for me too! Morning, afternoon, or even a coffee chat - I'm down for whatever.\n\nIf there's anything specific you want to cover or discuss, just let me know ahead of time. Always good to be prepared, right?\n\nReally looking forward to connecting!`,
      question: `\n\nI want to make sure I get you the right info, so I'm going to dig into this properly. Might take a day or so, but I'd rather give you a solid answer than rush it.\n\nIf you think of anything else that might be helpful for me to know, just shoot it over. The more context I have, the better I can help!\n\nThanks for being patient with me on this!`,
      acknowledgment: `\n\nI really appreciate you sending this over! I'll give it a proper look and make sure everything's covered. If I spot anything that needs clarification, I'll definitely reach out.\n\nFeel free to ping me if you need anything else in the meantime!\n\nThanks again!`,
      default: `\n\nReally appreciate you reaching out! I want to make sure I handle this properly, so I'm going to take some time to look everything over carefully.\n\nIf anything else comes up or if you remember anything you want to add, just send it my way. Always happy to hear from you!\n\nTalk soon!`
    },
    casual: {
      meeting: `\n\nPretty flexible on my end, so just let me know what works. We can do a quick call, grab coffee, or whatever you prefer.\n\nIf there's stuff you want to talk about specifically, give me a heads up and I'll make sure I'm prepared.\n\nCatch you soon!`,
      question: `\n\nI'll dig into this and get back to you properly. Rather take a bit longer and give you a decent answer than rush it.\n\nIf you've got more info that might help, feel free to send it over.\n\nCheers!`,
      acknowledgment: `\n\nGot it all. I'll take a proper look and see if I need anything else from you.\n\nHit me up if you need anything else.\n\nThanks!`,
      default: `\n\nI'll take a proper look at this and get back to you. If I need anything else, I'll let you know.\n\nCatch you later!`
    }
  };
  
  // For tones without expansions (rude, sarcastic, nervous), keep original
  if (!expansions[tone]) {
    return reply + '\n\n' + reply; // Just double it as a simple expansion
  }
  
  return reply + expansions[tone][emailType];
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Email Reply Assistant installed');
});
