import { VercelRequest, VercelResponse } from '@vercel/node';
import { XMLParser } from 'fast-xml-parser';
import fetch from 'node-fetch';

const DEFAULT_FEED_URL = 'https://www.bonappetit.com/feed/rss';
const DEFAULT_CACHE_MINUTES = 15;
const DEFAULT_MAX_ITEMS = 20;

let cache: {
  data: any[];
  timestamp: number;
} | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const feedUrl = (req.query.feed as string) || DEFAULT_FEED_URL;
  const limit = parseInt((req.query.limit as string) || DEFAULT_MAX_ITEMS.toString());
  const cacheMinutes = DEFAULT_CACHE_MINUTES;
  const now = Date.now();

  // Check cache
  if (cache && (now - cache.timestamp) < (cacheMinutes * 60 * 1000)) {
    return res.status(200).json(cache.data.slice(0, limit));
  }

  try {
    const response = await fetch(feedUrl);
    const xmlText = await response.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
    const parsed = parser.parse(xmlText);
    const items = parsed.rss?.channel?.item || [];
    const recipes = items.map((item: any) => {
      // Extract image from media:thumbnail, media:content, or enclosure
      let image = '';
      if (item['media:thumbnail']?.['@_url']) {
        image = item['media:thumbnail']['@_url'];
      } else if (item['media:content']) {
        const mediaContent = Array.isArray(item['media:content'])
          ? item['media:content']
          : [item['media:content']];
        const wideImage = mediaContent.find((media: any) =>
          media['@_width'] === '1280' || media['@_url']?.includes('1280')
        );
        if (wideImage) {
          image = wideImage['@_url'] || '';
        } else if (mediaContent[0]?.['@_url']) {
          image = mediaContent[0]['@_url'];
        }
      }
      if (!image && item.enclosure?.['@_url']) {
        image = item.enclosure['@_url'];
      }
      let description = item.description || '';
      description = description.replace(/<[^>]*>/g, '');
      description = description.length > 160 ? description.substring(0, 160) + '...' : description;
      return {
        title: item.title || 'Untitled Recipe',
        image: image || '/placeholder-recipe.jpg',
        description,
        link: item.link || '#',
        pubDate: item.pubDate || new Date().toISOString()
      };
    }).filter((recipe: any) => recipe.title && recipe.image);
    // Update cache
    cache = {
      data: recipes.slice(0, DEFAULT_MAX_ITEMS),
      timestamp: now
    };
    return res.status(200).json(recipes.slice(0, limit));
  } catch (error) {
    if (cache) {
      return res.status(200).json(cache.data.slice(0, limit));
    }
    return res.status(500).json({ error: 'Failed to fetch RSS feed' });
  }
} 