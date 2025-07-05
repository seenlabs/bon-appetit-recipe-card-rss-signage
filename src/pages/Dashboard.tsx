import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings, Save, Eye, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import HomeButton from '@/components/HomeButton';

interface DashboardConfig {
  feedUrl: string;
  rotateSeconds: number;
  maxItems: number;
}

interface EnplugAsset {
  data?: DashboardConfig;
  updatedAt?: string;
}

declare global {
  interface Window {
    enplug?: {
      dashboard: {
        pageLoading: (loading: boolean) => void;
      };
      assets: {
        createOrUpdate: (asset: EnplugAsset) => Promise<void>;
        get: () => Promise<EnplugAsset>;
      };
    };
  }
}

const Dashboard = () => {
  const [config, setConfig] = useState<DashboardConfig>({
    feedUrl: 'https://www.bonappetit.com/feed/rss',
    rotateSeconds: 10,
    maxItems: 20
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isEnplugEnvironment, setIsEnplugEnvironment] = useState(false);

  useEffect(() => {
    // Check if we're in Enplug environment
    const checkEnplugEnvironment = () => {
      const hasEnplug = typeof window !== 'undefined' && window.enplug;
      setIsEnplugEnvironment(!!hasEnplug);
      
      if (hasEnplug) {
        // Load Enplug Dashboard SDK
        const script = document.createElement('script');
        script.src = 'https://apps.enplug.com/sdk/v1/dashboard.js';
        script.onload = async () => {
          try {
            window.enplug!.dashboard.pageLoading(true);
            
            // Try to load existing config
            const existingAsset = await window.enplug!.assets.get();
            if (existingAsset?.data) {
              setConfig(prev => ({ ...prev, ...existingAsset.data }));
            }
            
            setLoading(false);
            window.enplug!.dashboard.pageLoading(false);
          } catch (error) {
            console.error('Error loading Enplug SDK:', error);
            setLoading(false);
          }
        };
        document.head.appendChild(script);
      } else {
        // Load from localStorage for local development
        try {
          const savedConfig = localStorage.getItem('bon-appetit-config');
          if (savedConfig) {
            const parsedConfig = JSON.parse(savedConfig);
            setConfig(prev => ({ ...prev, ...parsedConfig }));
          }
        } catch (error) {
          console.error('Error loading from localStorage:', error);
        }
        setLoading(false);
      }
    };

    checkEnplugEnvironment();
  }, []);

  // Auto-save config to localStorage in local mode
  React.useEffect(() => {
    if (!isEnplugEnvironment && !loading) {
      localStorage.setItem('bon-appetit-config', JSON.stringify(config));
    }
  }, [config, isEnplugEnvironment, loading]);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    
    try {
      if (isEnplugEnvironment && window.enplug) {
        // Save to Enplug
        await window.enplug.assets.createOrUpdate({
          data: config,
          updatedAt: new Date().toISOString()
        });
        console.log('Configuration saved to Enplug successfully');
      } else {
        // Save to localStorage for local development
        localStorage.setItem('bon-appetit-config', JSON.stringify(config));
        console.log('Configuration saved to localStorage successfully');
      }
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000); // Clear success message after 3 seconds
    } catch (error) {
      console.error('Error saving configuration:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000); // Clear error message after 5 seconds
    } finally {
      setSaving(false);
    }
  };

  const previewUrl = `${window.location.origin}/player?preview=1&feed=${encodeURIComponent(config.feedUrl)}&rotate=${config.rotateSeconds}&max=${config.maxItems}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-6">
      <HomeButton />
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
            <Settings className="text-orange-500" />
            Bon Appétit Recipe Signage
          </h1>
          <p className="text-gray-600">Configure your digital recipe display</p>
          {!isEnplugEnvironment && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg inline-block">
              <p className="text-sm text-blue-700">
                🖥️ Running in local mode - configuration will be saved to browser storage
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <Card className="shadow-xl border-0">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Settings size={20} />
                Display Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="feedUrl" className="text-sm font-medium text-gray-700">
                  RSS Feed URL
                </Label>
                <Input
                  id="feedUrl"
                  type="url"
                  value={config.feedUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, feedUrl: e.target.value }))}
                  placeholder="https://www.bonappetit.com/feed/rss"
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Any valid RSS feed URL (defaults to Bon Appétit RSS)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rotateSeconds" className="text-sm font-medium text-gray-700">
                    Rotation Time (seconds)
                  </Label>
                  <Input
                    id="rotateSeconds"
                    type="number"
                    min="5"
                    max="60"
                    value={config.rotateSeconds}
                    onChange={(e) => setConfig(prev => ({ ...prev, rotateSeconds: parseInt(e.target.value) || 10 }))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxItems" className="text-sm font-medium text-gray-700">
                    Max Recipes
                  </Label>
                  <Input
                    id="maxItems"
                    type="number"
                    min="1"
                    max="50"
                    value={config.maxItems}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxItems: parseInt(e.target.value) || 20 }))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Save Status Messages */}
              {saveStatus === 'success' && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="text-green-500" size={16} />
                  <span className="text-sm text-green-700">Configuration saved successfully!</span>
                </div>
              )}
              
              {saveStatus === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="text-red-500" size={16} />
                  <span className="text-sm text-red-700">Failed to save configuration. Please try again.</span>
                </div>
              )}

              <Button 
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium py-2"
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save size={16} />
                    Save Configuration
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card className="shadow-xl border-0">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Eye size={20} />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="aspect-video bg-black rounded-b-lg overflow-hidden">
                <iframe
                  key={`${config.feedUrl}-${config.rotateSeconds}-${config.maxItems}`}
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title="Recipe Display Preview"
                />
              </div>
              <div className="p-4 bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Preview URL:</span>
                  <Button
                    onClick={() => window.open(previewUrl, '_blank')}
                    variant="outline"
                    size="sm"
                    className="text-xs bg-white hover:bg-gray-50"
                  >
                    <ExternalLink size={12} className="mr-1" />
                    Full Preview
                  </Button>
                </div>
                <code className="block bg-white px-2 py-1 rounded text-xs text-gray-600 break-all">
                  {previewUrl}
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
