# Bon Appétit Recipe Card RSS Signage

Transform any RSS feed into stunning digital signage for Enplug displays. This app auto-rotates recipe cards with beautiful typography, seamless content management, and a professional display.

## Features & Capabilities

- **RSS Integration**: Automatically pulls from Bon Appétit's RSS feed (or any custom feed) with smart image extraction and content caching for reliable display.
- **Easy Configuration**: Intuitive dashboard with live preview, custom RSS feeds, rotation timing, and maximum item controls.
- **Beautiful Display**: Full-screen hero images, elegant typography, smooth transitions, and responsive design for any screen size.
- **Enplug Integration**: Built for Enplug's CMS platform with professional digital signage support.

## Dashboard Features
- Custom RSS feed URL configuration
- Adjustable rotation timing (5-60 seconds)
- Maximum items limit control
- Live preview with iframe integration

## Player Features
- Full-screen recipe card display
- Automatic content rotation
- Offline mode with cached content
- Keyboard navigation in preview mode

## Getting Started

### Prerequisites
- Node.js & npm installed ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

### Installation & Development

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd bon-appetit-recipe-card-rss-signage

# Install dependencies
npm install

# Start the API server (for development)
npm run dev:api

# In a separate terminal, start the main app
npm run dev
```

Open your browser to the local server URL (usually http://localhost:8080) to view the app.

### Building for Production

```sh
# Build the project
npm run build

# Preview the production build
npm run preview
```

## Technologies Used
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Express (for local API dev server)

## Deployment

This project is configured for deployment on Vercel with serverless API functions. The API automatically handles RSS feed fetching and caching in production.

---

Built with React, TypeScript, and Tailwind CSS for Enplug digital signage platforms.
