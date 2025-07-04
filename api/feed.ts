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

const DEFAULT_FEED_URL = 'https://www.bonappetit.com/feed/rss';
const DEFAULT_CACHE_MINUTES = 15;
const DEFAULT_MAX_ITEMS = 20;

function parseXML(xmlText: string): RecipeItem[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  const items = xmlDoc.querySelectorAll('item');
  
  const recipes: RecipeItem[] = [];
  
  items.forEach((item) => {
    const title = item.querySelector('title')?.textContent || 'Untitled Recipe';
    const description = item.querySelector('description')?.textContent || '';
    const link = item.querySelector('link')?.textContent || '#';
    const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();
    
    // Extract image from media:thumbnail, media:content, or enclosure
    let image = '';
    
    // Try media:thumbnail first (what Bon Appétit uses)
    const mediaThumbnail = item.querySelector('media\\:thumbnail, thumbnail');
    if (mediaThumbnail) {
      image = mediaThumbnail.getAttribute('url') || '';
    }
    
    // Fallback to media:content
    if (!image) {
      const mediaContent = item.querySelector('media\\:content, content');
      if (mediaContent) {
        image = mediaContent.getAttribute('url') || '';
      }
    }
    
    // Fallback to enclosure
    if (!image) {
      const enclosure = item.querySelector('enclosure');
      if (enclosure) {
        image = enclosure.getAttribute('url') || '';
      }
    }
    
    // Clean description - strip HTML and truncate
    const cleanDescription = description.replace(/<[^>]*>/g, ''); // Remove HTML tags
    const finalDescription = cleanDescription.length > 160 ? cleanDescription.substring(0, 160) + '...' : cleanDescription;
    
    if (title && image) {
      recipes.push({
        title,
        image: image || '/placeholder-recipe.jpg',
        description: finalDescription,
        link,
        pubDate
      });
    }
  });
  
  return recipes;
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const feedUrl = url.searchParams.get('feed') || DEFAULT_FEED_URL;
  const limit = parseInt(url.searchParams.get('limit') || DEFAULT_MAX_ITEMS.toString());
  
  const cacheMinutes = DEFAULT_CACHE_MINUTES;
  const now = Date.now();
  
  // Check cache
  if (cache && (now - cache.timestamp) < (cacheMinutes * 60 * 1000)) {
    return new Response(JSON.stringify(cache.data.slice(0, limit)), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log(`Fetching RSS feed: ${feedUrl}`);
    const response = await fetch(feedUrl);
    const xmlText = await response.text();
    
    const recipes = parseXML(xmlText);

    // Update cache
    cache = {
      data: recipes.slice(0, DEFAULT_MAX_ITEMS),
      timestamp: now
    };
    
    console.log(`Successfully parsed ${recipes.length} recipes`);
    
    return new Response(JSON.stringify(recipes.slice(0, limit)), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
    
    // Return cached data if available
    if (cache) {
      return new Response(JSON.stringify(cache.data.slice(0, limit)), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Failed to fetch RSS feed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 