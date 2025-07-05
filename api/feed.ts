import { XMLParser } from 'fast-xml-parser';

interface RecipeItem {
  title: string;
  image: string;
  description: string;
  link: string;
  pubDate: string;
}

interface RSSItem {
  title?: string;
  description?: string;
  link?: string;
  pubDate?: string;
  'media:thumbnail'?: { '@_url'?: string };
  'media:content'?: Array<{ '@_url'?: string; '@_width'?: string }> | { '@_url'?: string; '@_width'?: string };
  enclosure?: { '@_url'?: string };
}

interface MediaContent {
  '@_url'?: string;
  '@_width'?: string;
}

let cache: {
  data: RecipeItem[];
  timestamp: number;
} | null = null;

const DEFAULT_FEED_URL = 'https://www.bonappetit.com/feed/rss';
const DEFAULT_CACHE_MINUTES = 15;
const DEFAULT_MAX_ITEMS = 20;

export default async function handler(req: Request) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const url = new URL(req.url);
  const feedUrl = url.searchParams.get('feed') || DEFAULT_FEED_URL;
  const limit = parseInt(url.searchParams.get('limit') || DEFAULT_MAX_ITEMS.toString());
  
  const cacheMinutes = DEFAULT_CACHE_MINUTES;
  const now = Date.now();
  
  // Check cache
  if (cache && (now - cache.timestamp) < (cacheMinutes * 60 * 1000)) {
    return new Response(JSON.stringify(cache.data.slice(0, limit)), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
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
    
    const recipes: RecipeItem[] = items.map((item: RSSItem) => {
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
        const wideImage = mediaContent.find((media: MediaContent) => 
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
    }).filter((recipe: RecipeItem) => recipe.title && recipe.image);

    // Update cache
    cache = {
      data: recipes.slice(0, DEFAULT_MAX_ITEMS),
      timestamp: now
    };
    
    console.log(`Successfully parsed ${recipes.length} recipes`);
    
    return new Response(JSON.stringify(recipes.slice(0, limit)), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    
    // Return cached data if available
    if (cache) {
      return new Response(JSON.stringify(cache.data.slice(0, limit)), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Failed to fetch RSS feed' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
