'use client';

import React, { useState, useRef } from 'react';

export default function TestPythonServicesPage() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null);
  const [translationText, setTranslationText] = useState('');
  const [translationResult, setTranslationResult] = useState<any>(null);
  const [captionText, setCaptionText] = useState('');
  const [captionResult, setCaptionResult] = useState<any>(null);
  const [serviceStatus, setServiceStatus] = useState<any>(null);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Test service health
  const testServiceHealth = async () => {
    setLoading(prev => ({ ...prev, health: true }));
    try {
      const response = await fetch('/api/python-services/health');
      const data = await response.json();
      setServiceStatus(data);
    } catch (error) {
      console.error('Health check failed:', error);
      setServiceStatus({ error: 'Failed to connect to Python services' });
    } finally {
      setLoading(prev => ({ ...prev, health: false }));
    }
  };

  // Test audio transcription
  const testAudioTranscription = async () => {
    if (!audioFile) {
      alert('Please select an audio file first');
      return;
    }

    setLoading(prev => ({ ...prev, transcribe: true }));
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('language', 'en');
      formData.append('word_timestamps', 'true');

      const response = await fetch('/api/python-services/audio/transcribe', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      setTranscriptionResult(data);
    } catch (error) {
      console.error('Transcription failed:', error);
      setTranscriptionResult({ error: 'Transcription failed' });
    } finally {
      setLoading(prev => ({ ...prev, transcribe: false }));
    }
  };

  // Test translation
  const testTranslation = async () => {
    if (!translationText.trim()) {
      alert('Please enter text to translate');
      return;
    }

    setLoading(prev => ({ ...prev, translate: true }));
    try {
      const response = await fetch('/api/python-services/translate/instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: translationText,
          targetLanguage: 'hi-IN',
          sourceLanguage: 'en-US'
        })
      });

      const data = await response.json();
      setTranslationResult(data);
    } catch (error) {
      console.error('Translation failed:', error);
      setTranslationResult({ error: 'Translation failed' });
    } finally {
      setLoading(prev => ({ ...prev, translate: false }));
    }
  };

  // Test caption generation
  const testCaptionGeneration = async () => {
    if (!captionText.trim()) {
      alert('Please enter text for caption generation');
      return;
    }

    setLoading(prev => ({ ...prev, caption: true }));
    try {
      const response = await fetch('/api/python-services/caption/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{
          text: captionText,
          start_time: 0,
          end_time: 5,
          language: 'en'
        }])
      });

      const data = await response.json();
      setCaptionResult(data);
    } catch (error) {
      console.error('Caption generation failed:', error);
      setCaptionResult({ error: 'Caption generation failed' });
    } finally {
      setLoading(prev => ({ ...prev, caption: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Python Microservices Test Interface
          </h1>
          <p className="text-lg text-gray-600">
            Test and interact with the Python-based AI services for audio processing, translation, and captions
          </p>
        </div>

        {/* Service Health Check */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Service Health Status</h2>
            <button
              onClick={testServiceHealth}
              disabled={loading.health}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading.health ? 'Checking...' : 'Check Status'}
            </button>
          </div>
          
          {serviceStatus && (
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-auto">
                {JSON.stringify(serviceStatus, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Audio Transcription Test */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Audio Transcription Service</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Audio File (.wav, .mp3, .m4a)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          
          <button
            onClick={testAudioTranscription}
            disabled={loading.transcribe || !audioFile}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 mb-4"
          >
            {loading.transcribe ? 'Transcribing...' : 'Test Transcription'}
          </button>

          {transcriptionResult && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium mb-2">Transcription Result:</h3>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-auto max-h-64">
                {JSON.stringify(transcriptionResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Translation Test */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Translation Service</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter text to translate (English to Hindi)
            </label>
            <textarea
              value={translationText}
              onChange={(e) => setTranslationText(e.target.value)}
              placeholder="Enter text to translate..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>
          
          <button
            onClick={testTranslation}
            disabled={loading.translate || !translationText.trim()}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 mb-4"
          >
            {loading.translate ? 'Translating...' : 'Test Translation'}
          </button>

          {translationResult && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium mb-2">Translation Result:</h3>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-auto">
                {JSON.stringify(translationResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Caption Generation Test */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Caption Generation Service</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter text for caption processing
            </label>
            <textarea
              value={captionText}
              onChange={(e) => setCaptionText(e.target.value)}
              placeholder="Enter text to generate captions..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>
          
          <button
            onClick={testCaptionGeneration}
            disabled={loading.caption || !captionText.trim()}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 mb-4"
          >
            {loading.caption ? 'Processing...' : 'Test Caption Generation'}
          </button>

          {captionResult && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium mb-2">Caption Result:</h3>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-auto">
                {JSON.stringify(captionResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Service URLs */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Python Service URLs</h3>
          <div className="space-y-2 text-blue-800">
            <p><strong>Audio Service:</strong> <a href="http://localhost:8001" target="_blank" className="underline">http://localhost:8001</a></p>
            <p><strong>Translation Service:</strong> <a href="http://localhost:8002" target="_blank" className="underline">http://localhost:8002</a></p>
            <p><strong>Caption Service:</strong> <a href="http://localhost:8003" target="_blank" className="underline">http://localhost:8003</a></p>
            <p><strong>Backend Proxy:</strong> <a href="http://localhost:5000/api/python-services/health" target="_blank" className="underline">http://localhost:5000/api/python-services/health</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}