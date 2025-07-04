import { XMLParser } from 'fast-xml-parser';
import { writeFile, readFile } from 'fs/promises';

interface RecipeItem {
  title: string;
  image: string;
  description: string;
  link: string;
  pubDate: string;
}

let cache: {
  data: RecipeItem[];
  timestamp: number;
} | null = null;

// Defaults come from environment variables with sensible fallbacks
const DEFAULT_FEED_URL =
  process.env.FEED_URL || 'https://www.bonappetit.com/feed/latest';
const DEFAULT_CACHE_MINUTES = parseInt(process.env.CACHE_MINUTES || '15');
const DEFAULT_MAX_ITEMS = parseInt(process.env.MAX_ITEMS || '20');

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

    type RSSItem = Record<string, unknown>;

    const recipes: RecipeItem[] = (items as RSSItem[]).map((item) => {
      // Extract image from media:thumbnail, media:content, or enclosure
      let image = '';
      
      // Try media:thumbnail first (what Bon Appétit uses)
      if (item['media:thumbnail']?.['@_url']) {
        image = item['media:thumbnail']['@_url'];
      }
      // Fallback to media:content
      else if (item['media:content']) {
        const mediaContent = Array.isArray(item['media:content'])
          ? (item['media:content'] as RSSItem[])
          : [item['media:content'] as RSSItem];
        
        // Prefer 1280-wide images
        const wideImage = mediaContent.find((media) =>
          (media as RSSItem)['@_width'] === '1280' ||
          String((media as RSSItem)['@_url'] ?? '').includes('1280')
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

    // Update in-memory cache and persist to /tmp
    cache = {
      data: recipes.slice(0, DEFAULT_MAX_ITEMS),
      timestamp: now
    };
    await writeFile('/tmp/last.json', JSON.stringify(cache.data), 'utf-8');
    
    console.log(`Successfully parsed ${recipes.length} recipes`);
    
    return new Response(JSON.stringify(recipes.slice(0, limit)), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    
    // Return cached in-memory data if available
    if (cache) {
      return new Response(JSON.stringify(cache.data.slice(0, limit)), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Try last-good payload from disk
    try {
      const last = await readFile('/tmp/last.json', 'utf-8');
      const data: RecipeItem[] = JSON.parse(last);
      return new Response(JSON.stringify(data.slice(0, limit)), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to fetch RSS feed' }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
}
