'use client';

import React, { useState, useEffect } from 'react';

// Simple SVG Icons
const VideoIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const SignalIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export interface VideoQualitySettings {
  resolution: '480p' | '720p' | '1080p' | '4K';
  frameRate: 15 | 30 | 60;
  bitrate: 'auto' | 'low' | 'medium' | 'high' | 'ultra';
  codec: 'H264' | 'VP8' | 'VP9' | 'AV1';
  adaptiveBitrate: boolean;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
}

interface NetworkStats {
  bandwidth: number;
  latency: number;
  packetLoss: number;
  jitter: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

interface VideoQualityControlsProps {
  currentSettings: VideoQualitySettings;
  networkStats: NetworkStats;
  onSettingsChange: (settings: VideoQualitySettings) => void;
  isHost: boolean;
}

const QUALITY_PRESETS = {
  'Ultra (4K)': {
    resolution: '4K' as const,
    frameRate: 60 as const,
    bitrate: 'ultra' as const,
    codec: 'AV1' as const,
    adaptiveBitrate: true,
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true
  },
  'High (1080p)': {
    resolution: '1080p' as const,
    frameRate: 30 as const,
    bitrate: 'high' as const,
    codec: 'VP9' as const,
    adaptiveBitrate: true,
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true
  },
  'Medium (720p)': {
    resolution: '720p' as const,
    frameRate: 30 as const,
    bitrate: 'medium' as const,
    codec: 'H264' as const,
    adaptiveBitrate: true,
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true
  },
  'Low (480p)': {
    resolution: '480p' as const,
    frameRate: 15 as const,
    bitrate: 'low' as const,
    codec: 'H264' as const,
    adaptiveBitrate: true,
    noiseSuppression: false,
    echoCancellation: true,
    autoGainControl: false
  }
};

const RESOLUTION_BITRATES = {
  '480p': { low: 500, medium: 800, high: 1200, ultra: 1500 },
  '720p': { low: 1200, medium: 2500, high: 4000, ultra: 5000 },
  '1080p': { low: 3000, medium: 6000, high: 8000, ultra: 12000 },
  '4K': { low: 8000, medium: 16000, high: 25000, ultra: 40000 }
};

export default function VideoQualityControls({
  currentSettings,
  networkStats,
  onSettingsChange,
  isHost
}: VideoQualityControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showNetworkStats, setShowNetworkStats] = useState(false);
  const [autoOptimize, setAutoOptimize] = useState(true);

  // Auto-optimize based on network conditions
  useEffect(() => {
    if (!autoOptimize) return;

    const optimizeSettings = () => {
      let newSettings = { ...currentSettings };

      // Adjust based on bandwidth
      if (networkStats.bandwidth < 1000) {
        newSettings = { ...QUALITY_PRESETS['Low (480p)'] };
      } else if (networkStats.bandwidth < 3000) {
        newSettings = { ...QUALITY_PRESETS['Medium (720p)'] };
      } else if (networkStats.bandwidth < 8000) {
        newSettings = { ...QUALITY_PRESETS['High (1080p)'] };
      } else {
        newSettings = { ...QUALITY_PRESETS['Ultra (4K)'] };
      }

      // Adjust for poor network conditions
      if (networkStats.packetLoss > 2 || networkStats.latency > 200) {
        newSettings.frameRate = 15;
        newSettings.bitrate = 'low';
        newSettings.adaptiveBitrate = true;
      }

      // Adjust for very poor conditions
      if (networkStats.quality === 'poor') {
        newSettings.resolution = '480p';
        newSettings.frameRate = 15;
        newSettings.bitrate = 'low';
      }

      onSettingsChange(newSettings);
    };

    const interval = setInterval(optimizeSettings, 5000);
    return () => clearInterval(interval);
  }, [autoOptimize, networkStats, onSettingsChange]);

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getEstimatedBitrate = () => {
    const baseBitrate = RESOLUTION_BITRATES[currentSettings.resolution][
      currentSettings.bitrate === 'auto' ? 'medium' : currentSettings.bitrate
    ];
    
    const frameRateMultiplier = currentSettings.frameRate / 30;
    return Math.round(baseBitrate * frameRateMultiplier);
  };

  const getRecommendedSettings = () => {
    if (networkStats.bandwidth < 1000) return 'Low (480p)';
    if (networkStats.bandwidth < 3000) return 'Medium (720p)';
    if (networkStats.bandwidth < 8000) return 'High (1080p)';
    return 'Ultra (4K)';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <VideoIcon />
          <h3 className="text-lg font-semibold">Video Quality</h3>
        </div>
        <div className={`px-2 py-1 rounded text-sm font-medium ${getQualityColor(networkStats.quality)}`}>
          {networkStats.quality.toUpperCase()}
        </div>
      </div>

      {/* Auto Optimize Toggle */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
        <div>
          <div className="font-medium text-sm">Auto Optimize</div>
          <div className="text-xs text-gray-600">Adjust quality based on network</div>
        </div>
        <button
          onClick={() => setAutoOptimize(!autoOptimize)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            autoOptimize ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              autoOptimize ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Quality Presets */}
      <div className="space-y-2 mb-4">
        <label className="text-sm font-medium text-gray-700">Quality Preset</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(QUALITY_PRESETS).map(([name, preset]) => (
            <button
              key={name}
              onClick={() => onSettingsChange(preset)}
              disabled={autoOptimize}
              className={`p-2 text-sm rounded border transition-colors ${
                JSON.stringify(currentSettings) === JSON.stringify(preset)
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              } ${autoOptimize ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {name}
              {name === getRecommendedSettings() && (
                <div className="text-xs text-green-600 font-medium">Recommended</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Current Settings Display */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600">Resolution:</span>
            <span className="ml-1 font-medium">{currentSettings.resolution}</span>
          </div>
          <div>
            <span className="text-gray-600">FPS:</span>
            <span className="ml-1 font-medium">{currentSettings.frameRate}</span>
          </div>
          <div>
            <span className="text-gray-600">Bitrate:</span>
            <span className="ml-1 font-medium">{getEstimatedBitrate()}k</span>
          </div>
          <div>
            <span className="text-gray-600">Codec:</span>
            <span className="ml-1 font-medium">{currentSettings.codec}</span>
          </div>
        </div>
      </div>

      {/* Network Stats Toggle */}
      <button
        onClick={() => setShowNetworkStats(!showNetworkStats)}
        className="flex items-center justify-between w-full p-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <SignalIcon />
          <span>Network Statistics</span>
        </div>
        {showNetworkStats ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </button>

      {/* Network Stats */}
      {showNetworkStats && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Bandwidth:</span>
              <span className="ml-1 font-medium">{networkStats.bandwidth} kbps</span>
            </div>
            <div>
              <span className="text-gray-600">Latency:</span>
              <span className="ml-1 font-medium">{networkStats.latency} ms</span>
            </div>
            <div>
              <span className="text-gray-600">Packet Loss:</span>
              <span className="ml-1 font-medium">{networkStats.packetLoss}%</span>
            </div>
            <div>
              <span className="text-gray-600">Jitter:</span>
              <span className="ml-1 font-medium">{networkStats.jitter} ms</span>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Settings Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center justify-between w-full p-2 mt-3 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <SettingsIcon />
          <span>Advanced Settings</span>
        </div>
        {showAdvanced ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="mt-3 space-y-3">
          {/* Audio Processing */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Audio Processing</h4>
            <div className="space-y-2">
              {[
                { key: 'noiseSuppression', label: 'Noise Suppression' },
                { key: 'echoCancellation', label: 'Echo Cancellation' },
                { key: 'autoGainControl', label: 'Auto Gain Control' },
                { key: 'adaptiveBitrate', label: 'Adaptive Bitrate' }
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{label}</span>
                  <button
                    onClick={() => onSettingsChange({
                      ...currentSettings,
                      [key]: !currentSettings[key as keyof VideoQualitySettings]
                    })}
                    disabled={autoOptimize}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      currentSettings[key as keyof VideoQualitySettings] ? 'bg-blue-600' : 'bg-gray-200'
                    } ${autoOptimize ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        currentSettings[key as keyof VideoQualitySettings] ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Manual Settings */}
          {!autoOptimize && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Manual Settings</h4>
              
              {/* Resolution */}
              <div className="mb-3">
                <label className="block text-sm text-gray-700 mb-1">Resolution</label>
                <select
                  value={currentSettings.resolution}
                  onChange={(e) => onSettingsChange({
                    ...currentSettings,
                    resolution: e.target.value as VideoQualitySettings['resolution']
                  })}
                  className="w-full p-2 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="480p">480p (SD)</option>
                  <option value="720p">720p (HD)</option>
                  <option value="1080p">1080p (Full HD)</option>
                  <option value="4K">4K (Ultra HD)</option>
                </select>
              </div>

              {/* Frame Rate */}
              <div className="mb-3">
                <label className="block text-sm text-gray-700 mb-1">Frame Rate</label>
                <select
                  value={currentSettings.frameRate}
                  onChange={(e) => onSettingsChange({
                    ...currentSettings,
                    frameRate: parseInt(e.target.value) as VideoQualitySettings['frameRate']
                  })}
                  className="w-full p-2 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={15}>15 FPS</option>
                  <option value={30}>30 FPS</option>
                  <option value={60}>60 FPS</option>
                </select>
              </div>

              {/* Bitrate */}
              <div className="mb-3">
                <label className="block text-sm text-gray-700 mb-1">Bitrate</label>
                <select
                  value={currentSettings.bitrate}
                  onChange={(e) => onSettingsChange({
                    ...currentSettings,
                    bitrate: e.target.value as VideoQualitySettings['bitrate']
                  })}
                  className="w-full p-2 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="auto">Auto</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="ultra">Ultra</option>
                </select>
              </div>

              {/* Codec */}
              <div>
                <label className="block text-sm text-gray-700 mb-1">Video Codec</label>
                <select
                  value={currentSettings.codec}
                  onChange={(e) => onSettingsChange({
                    ...currentSettings,
                    codec: e.target.value as VideoQualitySettings['codec']
                  })}
                  className="w-full p-2 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="H264">H.264 (Compatible)</option>
                  <option value="VP8">VP8 (WebRTC)</option>
                  <option value="VP9">VP9 (Efficient)</option>
                  <option value="AV1">AV1 (Modern)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Host Only Features */}
      {isHost && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Host Controls</h4>
          <div className="space-y-2">
            <button className="w-full p-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
              Set Quality for All Participants
            </button>
            <button className="w-full p-2 text-sm bg-white text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors">
              Enable Low-Bandwidth Mode
            </button>
          </div>
        </div>
      )}
    </div>
  );
}