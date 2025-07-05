import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Wifi, WifiOff } from 'lucide-react';
import HomeButton from '@/components/HomeButton';

interface Recipe {
  title: string;
  image: string;
  description: string;
  link: string;
  pubDate: string;
}

interface PlayerConfig {
  feedUrl?: string;
  rotateSeconds?: number;
  maxItems?: number;
}

interface EnplugAsset {
  data?: PlayerConfig;
  updatedAt?: string;
}

const Player = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [config, setConfig] = useState<PlayerConfig>({});
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  const rotateSeconds = config.rotateSeconds || 10;
  const maxItems = config.maxItems || 20;

  // Helper to get the correct API endpoint
  const getApiUrl = () => {
    // Always return an absolute URL
    return `${window.location.origin}/api/feed`;
  };

  // Fetch recipes from API
  const fetchRecipes = useCallback(async () => {
    try {
      const url = new URL(getApiUrl());
      const feedUrl = config.feedUrl || 'https://www.bonappetit.com/feed/rss';
      const limit = config.maxItems || 20;
      
      url.searchParams.set('feed', feedUrl);
      url.searchParams.set('limit', limit.toString());

      console.log('Fetching recipes from:', url.toString());
      const response = await fetch(url.toString());
      const data = await response.json();
      
      console.log('Received data:', data?.length || 0, 'recipes');
      
      if (Array.isArray(data) && data.length > 0) {
        setRecipes(data);
        setOffline(false);
        // Cache the data
        localStorage.setItem('recipes-cache', JSON.stringify({ data, timestamp: Date.now() }));
      } else {
        throw new Error('No recipes found');
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
      
      // Try to load from cache as fallback
      try {
        const cached = localStorage.getItem('recipes-cache');
        if (cached) {
          const { data } = JSON.parse(cached);
          if (Array.isArray(data) && data.length > 0) {
            setRecipes(data);
            setOffline(true);
          }
        }
      } catch (cacheError) {
        console.error('Error loading from cache:', cacheError);
      }
    }
  }, [config.feedUrl, config.maxItems]);

  // Load Enplug Player SDK and configuration
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const preview = urlParams.get('preview') === '1';
    setIsPreview(preview);

    // Override config from URL params for preview
    if (preview) {
      // First try to load from localStorage (saved configuration)
      let savedConfig: PlayerConfig = {};
      try {
        const savedConfigStr = localStorage.getItem('bon-appetit-config');
        if (savedConfigStr) {
          savedConfig = JSON.parse(savedConfigStr);
        }
      } catch (error) {
        console.error('Error loading saved config:', error);
      }

      // Merge saved config with URL params (saved config takes precedence)
      const finalConfig = {
        feedUrl: savedConfig.feedUrl || urlParams.get('feed') || 'https://www.bonappetit.com/feed/rss',
        rotateSeconds: savedConfig.rotateSeconds || parseInt(urlParams.get('rotate') || '') || 10,
        maxItems: savedConfig.maxItems || parseInt(urlParams.get('max') || '') || 20
      };
      
      setConfig(finalConfig);
      setLoading(false);
      return;
    }

    // For non-preview mode, set default config if no Enplug SDK
    const defaultConfig = {
      feedUrl: 'https://www.bonappetit.com/feed/rss',
      rotateSeconds: 10,
      maxItems: 20
    };
    setConfig(defaultConfig);
    setLoading(false);

    // Load Enplug Player SDK
    const script = document.createElement('script');
    script.src = 'https://apps.enplug.com/sdk/v1/player.js';
    script.onload = async () => {
      try {
        const asset = await window.enplug.assets.get();
        if (asset?.data) {
          setConfig(asset.data);
        }
      } catch (error) {
        console.error('Error loading Enplug asset:', error);
      }
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Fetch recipes when config is ready
  useEffect(() => {
    if (!loading) {
      fetchRecipes();
    }
  }, [loading, config.feedUrl, config.maxItems]);

  // Auto-rotation
  useEffect(() => {
    if (recipes.length <= 1 || isPreview) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % recipes.length);
    }, rotateSeconds * 1000);

    return () => clearInterval(interval);
  }, [recipes.length, rotateSeconds, isPreview]);

  // Keyboard navigation for preview mode
  useEffect(() => {
    if (!isPreview) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentIndex(prev => prev === 0 ? recipes.length - 1 : prev - 1);
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex(prev => (prev + 1) % recipes.length);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPreview, recipes.length]);

  // Refresh data on focus regain (debounced)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Debounce the fetch to avoid multiple rapid calls
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          fetchRecipes();
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(timeoutId);
    };
  }, [fetchRecipes]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-xl">Loading delicious recipes...</p>
          <p className="text-sm text-gray-400 mt-2">Config: {JSON.stringify(config)}</p>
        </div>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-2xl mb-4">No recipes available</p>
          <p className="text-gray-400 mb-4">Check your RSS feed configuration</p>
          <div className="text-sm text-gray-500">
            <p>Config: {JSON.stringify(config)}</p>
            <p>Loading: {loading.toString()}</p>
            <p>Recipes count: {recipes.length}</p>
          </div>
          <button 
            onClick={() => fetchRecipes()}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Retry Fetch
          </button>
        </div>
      </div>
    );
  }

  const currentRecipe = recipes[currentIndex];

  return (
    <div className="h-screen relative overflow-hidden bg-black">
      {/* Home Button - Only show in preview mode */}
      {isPreview && <HomeButton />}
      
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out"
        style={{ 
          backgroundImage: `url(${currentRecipe.image})`,
          filter: 'brightness(0.7)'
        }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      
      {/* Content Overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-8 lg:p-16">
        <div className="max-w-4xl">
          {/* Recipe Title */}
          <h1 className="text-4xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 leading-tight">
            {currentRecipe.title}
          </h1>
          
          {/* Description */}
          {currentRecipe.description && (
            <p className="text-xl lg:text-2xl text-gray-200 mb-6 leading-relaxed max-w-3xl">
              {currentRecipe.description}
            </p>
          )}
          
          {/* Bon Appétit Branding */}
          <div className="flex items-center gap-4 text-orange-400">
            <div className="text-lg lg:text-xl font-semibold">BON APPÉTIT</div>
            <div className="h-px bg-orange-400 flex-1 max-w-32"></div>
          </div>
        </div>
      </div>

      {/* Recipe Counter */}
      <div className="absolute top-8 right-8 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 text-white">
        <span className="text-sm font-medium">
          {currentIndex + 1} / {recipes.length}
        </span>
      </div>

      {/* Offline Indicator */}
      {offline && (
        <div className="absolute top-8 left-8 bg-red-500/80 backdrop-blur-sm rounded-full px-4 py-2 text-white flex items-center gap-2">
          <WifiOff size={16} />
          <span className="text-sm font-medium">Offline</span>
        </div>
      )}

      {/* Preview Navigation Controls */}
      {isPreview && recipes.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex(prev => prev === 0 ? recipes.length - 1 : prev - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full p-3 text-white transition-all duration-200"
          >
            <ChevronLeft size={24} />
          </button>
          
          <button
            onClick={() => setCurrentIndex(prev => (prev + 1) % recipes.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full p-3 text-white transition-all duration-200"
          >
            <ChevronRight size={24} />
          </button>

          {/* Preview Indicator */}
          <div className="absolute bottom-8 left-8 bg-blue-500/80 backdrop-blur-sm rounded-full px-4 py-2 text-white">
            <span className="text-sm font-medium">Preview Mode</span>
          </div>
        </>
      )}

      {/* Progress Dots */}
      {recipes.length > 1 && (
        <div className="absolute bottom-8 right-8 flex gap-2">
          {recipes.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex ? 'bg-orange-400' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Player;
