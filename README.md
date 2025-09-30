# AI Email Reply Assistant

A full-stack Chrome extension that uses AI to automatically generate contextual email replies with customizable tone and length. Seamlessly integrates with Gmail and Outlook to help you respond to emails faster and more effectively.

## Live Demo

**Try it now:** [https://ai-email-assistant-dev-2025.uc.r.appspot.com/](https://ai-email-assistant-dev-2025.uc.r.appspot.com/)

##  Tech Stack

### Frontend
- **Angular 19** with standalone components
- **TypeScript**
- **Reactive Forms**
- **Signals** for state management

### Backend
- **Java Spring Boot**
- **Spring WebFlux** for reactive programming
- **Maven** for dependency management

### Chrome Extension
- **Manifest V3**
- Content scripts for Gmail/Outlook integration
- Side panel API
- Chrome storage API

### AI & Deployment
- **Google Gemini API** for AI generation
- **Google Cloud Platform App Engine** for hosting
- **CI/CD** ready deployment configuration



## Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/AI-Email-Chat-Assistant.git
cd AI-Email-Chat-Assistant
```

### 2. Backend Setup

Create `src/main/resources/application.properties`:
```properties
gemini.api.key=YOUR_GEMINI_API_KEY
gemini.api.url=https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
server.port=8080
```

Build and run the Spring Boot application:
```bash
mvn clean install
mvn spring-boot:run
```

### 3. Frontend Setup

Navigate to the frontend directory:
```bash
cd frotend
npm install
```

Create environment files:
- `src/environments/environment.ts` (for development)
- `src/environments/environment.prod.ts` (for production)

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080'
};
```

Run the development server:
```bash
npm start
```

Build for production:
```bash
npm run build
```

### 4. Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chrome-extension` directory
5. Update `manifest.json` with your backend API URL
---


