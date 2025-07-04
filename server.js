const express = require('express');
const cors = require('cors');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

// Cache for RSS data
let cache = null;
const DEFAULT_FEED_URL = 'https://www.bonappetit.com/feed/rss';
const DEFAULT_CACHE_MINUTES = 15;
const DEFAULT_MAX_ITEMS = 20;

// API endpoint for RSS feed
app.get('/api/feed', async (req, res) => {
  const feedUrl = req.query.feed || DEFAULT_FEED_URL;
  const limit = parseInt(req.query.limit || DEFAULT_MAX_ITEMS.toString());
  
  const cacheMinutes = DEFAULT_CACHE_MINUTES;
  const now = Date.now();
  
  // Check cache
  if (cache && (now - cache.timestamp) < (cacheMinutes * 60 * 1000)) {
    return res.json(cache.data.slice(0, limit));
  }

  try {
    console.log(`Fetching RSS feed: ${feedUrl}`);
    const response = await fetch(feedUrl);
    const xmlText = await response.text();
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
    
    const parsed = parser.parse(xmlText);
    const items = parsed.rss?.channel?.item || [];
    
    const recipes = items.map((item) => {
      // Extract image from media:thumbnail, media:content, or enclosure
      let image = '';
      
      // Try media:thumbnail first (what Bon Appétit uses)
      if (item['media:thumbnail']?.['@_url']) {
        image = item['media:thumbnail']['@_url'];
      }
      // Fallback to media:content
      else if (item['media:content']) {
        const mediaContent = Array.isArray(item['media:content']) 
          ? item['media:content'] 
          : [item['media:content']];
        
        // Prefer 1280-wide images
        const wideImage = mediaContent.find((media) => 
          media['@_width'] === '1280' || media['@_url']?.includes('1280')
        );
        
        if (wideImage) {
          image = wideImage['@_url'] || '';
        } else if (mediaContent[0]?.['@_url']) {
          image = mediaContent[0]['@_url'];
        }
      }
      
      // Fallback to enclosure or other image sources
      if (!image && item.enclosure?.['@_url']) {
        image = item.enclosure['@_url'];
      }
      
      // Clean description - strip HTML and truncate
      let description = item.description || '';
      description = description.replace(/<[^>]*>/g, ''); // Remove HTML tags
      description = description.length > 160 ? description.substring(0, 160) + '...' : description;
      
      return {
        title: item.title || 'Untitled Recipe',
        image: image || '/placeholder-recipe.jpg',
        description,
        link: item.link || '#',
        pubDate: item.pubDate || new Date().toISOString()
      };
    }).filter((recipe) => recipe.title && recipe.image);

    // Update cache
    cache = {
      data: recipes.slice(0, DEFAULT_MAX_ITEMS),
      timestamp: now
    };
    
    console.log(`Successfully parsed ${recipes.length} recipes`);
    
    res.json(recipes.slice(0, limit));
    
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    
    // Return cached data if available
    if (cache) {
      return res.json(cache.data.slice(0, limit));
    }
    
    res.status(500).json({ error: 'Failed to fetch RSS feed' });
  }
});

// Test API endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working on Render!',
    timestamp: new Date().toISOString()
  });
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 