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

## Deployment on Render

This project is configured for deployment on Render with both static hosting and API services.

### Quick Deploy

1. **Fork this repository** to your GitHub account
2. **Connect to Render**:
   - Go to [render.com](https://render.com)
   - Click "New +" → "Blueprint"
   - Connect your GitHub account
   - Select this repository
3. **Deploy**: Render will automatically detect the `render.yaml` configuration and deploy both services

### Manual Deployment

#### Frontend (Static Site)
1. Create a new **Static Site** on Render
2. Connect your GitHub repository
3. Set build command: `npm run build`
4. Set publish directory: `dist`

#### API Service
1. Create a new **Web Service** on Render
2. Connect your GitHub repository
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Set environment variable: `NODE_ENV=production`

## Technologies Used
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Express (for API server)
- Render (for hosting)

## API Endpoints

- `GET /api/feed` - Fetch RSS feed data
- `GET /api/test` - Test API endpoint

---

Built with React, TypeScript, and Tailwind CSS for Enplug digital signage platforms.
