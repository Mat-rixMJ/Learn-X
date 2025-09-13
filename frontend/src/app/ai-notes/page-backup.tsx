'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AINote {
  id: number;
  user_id: number;
  title: string;
  subject: string;
  video_file?: File;
  video_url?: string;
  transcript: string;
  ai_analysis: {
    summary: string;
    key_points: string[];
    important_questions: string[];
    highlights: string[];
    topics: string[];
    difficulty_level: string;
    estimated_time: string;
  };
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export default function AINotesPage() {
  const router = useRouter();
  const [aiNotes, setAiNotes] = useState<AINote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notes' | 'generate'>('notes');
  const [processing, setProcessing] = useState(false);
  const [selectedNote, setSelectedNote] = useState<AINote | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form states
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [inputMethod, setInputMethod] = useState<'upload' | 'url' | 'text'>('upload');
  const [textContent, setTextContent] = useState('');

  useEffect(() => {
    const loadAiNotes = async () => {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        
        const response = await fetch(`${apiUrl}/api/ai-notes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setAiNotes(data.notes || []);
        } else if (response.status === 401) {
          router.push('/login');
        }
      } catch (error) {
        console.error('Error loading AI notes:', error);
      } finally {
        setLoading(false);
      }
    };

    const checkAuthAndLoadNotes = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }
        await loadAiNotes();
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      }
    };
    
    checkAuthAndLoadNotes();
  }, [router]);

  const processVideoWithAI = async () => {
    if (!title || (!videoFile && !videoUrl && !textContent)) {
      alert('Please provide a title and either upload a video, provide a URL, or enter text content');
      return;
    }

    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const formData = new FormData();
      formData.append('title', title);
      formData.append('subject', subject);
      formData.append('input_method', inputMethod);
      
      if (inputMethod === 'upload' && videoFile) {
        formData.append('video', videoFile);
      } else if (inputMethod === 'url' && videoUrl) {
        formData.append('video_url', videoUrl);
      } else if (inputMethod === 'text' && textContent) {
        formData.append('text_content', textContent);
      }

      const response = await fetch(`${apiUrl}/api/ai-notes/process-video`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add the new note to the list
        setAiNotes(prev => [data.note, ...prev]);
        
        // Reset form
        setTitle('');
        setSubject('');
        setVideoFile(null);
        setVideoUrl('');
        setTextContent('');
        setActiveTab('notes');
        
        alert('AI notes generated successfully from your content!');
      } else {
        const errorData = await response.json();
        alert(`Failed to process content: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error processing content:', error);
      alert('Failed to process content. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const deleteNote = async (noteId: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const response = await fetch(`${apiUrl}/api/ai-notes/${noteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setAiNotes(prev => prev.filter(note => note.id !== noteId));
        if (selectedNote?.id === noteId) setSelectedNote(null);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const filteredNotes = aiNotes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-sm mb-4">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading AI Notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                AI Notes
              </h1>
              <p className="text-gray-600 max-w-2xl">
                Transform your videos, lectures, and content into intelligent notes using AI. 
                Upload videos, provide URLs, or paste text to generate summaries and insights.
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Dashboard</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex-1 py-2.5 px-4 rounded-md font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                  activeTab === 'notes'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>My Notes ({aiNotes.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('generate')}
                className={`flex-1 py-2.5 px-4 rounded-md font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                  activeTab === 'generate'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Process Content</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {activeTab === 'notes' ? (
            <>
              {/* Notes List */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-medium text-gray-900">AI Notes</h2>
                </div>

                <div className="mb-6">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search notes by title or subject..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredNotes.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchTerm ? 'No matching notes found' : 'No AI notes yet'}
                      </h3>
                      <p className="text-gray-500 text-sm mb-6">
                        {searchTerm 
                          ? 'Try adjusting your search terms' 
                          : 'Process your first video or content to generate AI notes'
                        }
                      </p>
                      {!searchTerm && (
                        <button
                          onClick={() => setActiveTab('generate')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          Process First Content
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredNotes.map((note) => (
                      <div
                        key={note.id}
                        onClick={() => setSelectedNote(note)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                          selectedNote?.id === note.id
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-medium text-gray-900 truncate flex-1 pr-3">
                            {note.title}
                          </h3>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              note.processing_status === 'completed' ? 'bg-green-100 text-green-700' :
                              note.processing_status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                              note.processing_status === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {note.processing_status}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNote(note.id);
                              }}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                            {note.subject}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {note.ai_analysis.summary}
                        </p>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>{note.ai_analysis.key_points.length} key points</span>
                          <span>{new Date(note.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Note Details */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {selectedNote ? (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900 mb-4">
                        {selectedNote.title}
                      </h2>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full font-medium">
                          {selectedNote.subject}
                        </span>
                        <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                          {selectedNote.ai_analysis.difficulty_level}
                        </span>
                        <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                          {selectedNote.ai_analysis.estimated_time}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Summary */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Summary</h3>
                        <p className="text-gray-700 bg-gray-50 p-4 rounded-lg text-sm">
                          {selectedNote.ai_analysis.summary}
                        </p>
                      </div>

                      {/* Key Points */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Key Points</h3>
                        <ul className="space-y-2">
                          {selectedNote.ai_analysis.key_points.map((point, index) => (
                            <li key={index} className="flex items-start text-sm">
                              <span className="text-blue-500 font-bold mr-2">•</span>
                              <span className="text-gray-700">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Topics */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Topics Covered</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedNote.ai_analysis.topics.map((topic, index) => (
                            <span key={index} className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.121 2.122" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-medium text-gray-900 mb-2">Select a Note</h2>
                    <p className="text-gray-500 text-sm">
                      Click on any note from the list to view its AI analysis and details.
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Process Content Tab */
            <div className="col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Process Content with AI
                </h2>
                
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Machine Learning Basics"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g., Computer Science"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Input Method Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      Content Input Method
                    </label>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => setInputMethod('upload')}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          inputMethod === 'upload'
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        Upload Video
                      </button>
                      <button
                        onClick={() => setInputMethod('url')}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          inputMethod === 'url'
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        Video URL
                      </button>
                      <button
                        onClick={() => setInputMethod('text')}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          inputMethod === 'text'
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        Text Content
                      </button>
                    </div>
                  </div>

                  {/* Content Input */}
                  {inputMethod === 'upload' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Video File *
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="video-upload"
                        />
                        <label htmlFor="video-upload" className="cursor-pointer">
                          <div className="text-4xl mb-2">🎥</div>
                          <p className="text-gray-600">
                            {videoFile ? videoFile.name : 'Click to upload video file'}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Supports MP4, AVI, MOV, etc.
                          </p>
                        </label>
                      </div>
                    </div>
                  )}

                  {inputMethod === 'url' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Video URL *
                      </label>
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://example.com/video.mp4 or YouTube URL"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  {inputMethod === 'text' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Text Content *
                      </label>
                      <textarea
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        placeholder="Paste your lecture transcript, notes, or any text content here..."
                        rows={8}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  {/* Process Button */}
                  <div className="text-center">
                    <button
                      onClick={processVideoWithAI}
                      disabled={processing || !title || (!videoFile && !videoUrl && !textContent)}
                      className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                    >
                      {processing ? (
                        <span className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Processing with AI...
                        </span>
                      ) : (
                        'Process with AI'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}