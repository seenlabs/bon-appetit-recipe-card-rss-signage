import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings, Save, Eye } from 'lucide-react';
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
    enplug: {
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

  useEffect(() => {
    // Load Enplug Dashboard SDK
    const script = document.createElement('script');
    script.src = 'https://apps.enplug.com/sdk/v1/dashboard.js';
    script.onload = async () => {
      try {
        window.enplug.dashboard.pageLoading(true);
        
        // Try to load existing config
        const existingAsset = await window.enplug.assets.get();
        if (existingAsset?.data) {
          setConfig(prev => ({ ...prev, ...existingAsset.data }));
        }
        
        setLoading(false);
        window.enplug.dashboard.pageLoading(false);
      } catch (error) {
        console.error('Error loading Enplug SDK:', error);
        setLoading(false);
      }
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await window.enplug.assets.createOrUpdate({
        data: config,
        updatedAt: new Date().toISOString()
      });
      console.log('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving configuration:', error);
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
          <p className="text-gray-600">Loading Enplug Dashboard...</p>
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
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title="Recipe Display Preview"
                />
              </div>
              <div className="p-4 bg-gray-50 text-xs text-gray-600 rounded-b-lg">
                Preview URL: <code className="bg-white px-2 py-1 rounded">{previewUrl}</code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
