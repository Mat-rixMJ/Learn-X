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
    checkAuthAndLoadNotes();
  }, []);

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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading AI Notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🤖 AI Notes with Video Processing
          </h1>
          <p className="text-gray-600 max-w-3xl mx-auto">
            Transform your videos, lectures, and content into intelligent notes using local AI (Ollama). 
            Upload videos, provide URLs, or paste text to generate summaries, key points, questions, and highlights.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-lg">
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
                activeTab === 'notes'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-indigo-500'
              }`}
            >
              📚 My Notes ({aiNotes.length})
            </button>
            <button
              onClick={() => setActiveTab('generate')}
              className={`px-6 py-2 rounded-md font-medium transition-all duration-200 ${
                activeTab === 'generate'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-indigo-500'
              }`}
            >
              🎬 Process Content
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {activeTab === 'notes' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Notes List */}
              <div>
                <div className="mb-6">
                  <input
                    type="text"
                    placeholder="Search notes by title or subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {filteredNotes.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🎥</div>
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        {searchTerm ? 'No matching notes found' : 'No AI notes yet'}
                      </h3>
                      <p className="text-gray-500 mb-6">
                        {searchTerm 
                          ? 'Try adjusting your search terms' 
                          : 'Process your first video or content to generate AI notes'
                        }
                      </p>
                      {!searchTerm && (
                        <button
                          onClick={() => setActiveTab('generate')}
                          className="bg-indigo-500 text-white px-6 py-3 rounded-lg hover:bg-indigo-600 transition-colors"
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
                        className={`bg-white rounded-lg p-4 cursor-pointer transition-all duration-200 border-2 ${
                          selectedNote?.id === note.id
                            ? 'border-indigo-500 shadow-lg'
                            : 'border-transparent shadow-md hover:shadow-lg hover:border-indigo-200'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-800 truncate flex-1">
                            {note.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              note.processing_status === 'completed' ? 'bg-green-100 text-green-800' :
                              note.processing_status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                              note.processing_status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {note.processing_status}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNote(note.id);
                              }}
                              className="text-red-400 hover:text-red-600"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-indigo-600 font-medium mb-2">
                          {note.subject}
                        </p>
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
              <div className="bg-white rounded-lg shadow-lg">
                {selectedNote ? (
                  <div className="p-6 max-h-96 overflow-y-auto">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        {selectedNote.title}
                      </h2>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="bg-indigo-100 text-indigo-800 text-sm px-3 py-1 rounded-full">
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
                        <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                          📋 Summary
                        </h3>
                        <p className="text-gray-700 bg-gray-50 p-4 rounded-lg text-sm">
                          {selectedNote.ai_analysis.summary}
                        </p>
                      </div>

                      {/* Key Points */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                          🎯 Key Points
                        </h3>
                        <ul className="space-y-2">
                          {selectedNote.ai_analysis.key_points.map((point, index) => (
                            <li key={index} className="flex items-start text-sm">
                              <span className="text-indigo-500 font-bold mr-2">•</span>
                              <span className="text-gray-700">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Important Questions */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                          ❓ Important Questions
                        </h3>
                        <ul className="space-y-2">
                          {selectedNote.ai_analysis.important_questions.map((question, index) => (
                            <li key={index} className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400 text-sm">
                              <span className="text-gray-700">{question}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Highlights */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                          ✨ Highlights
                        </h3>
                        <ul className="space-y-2">
                          {selectedNote.ai_analysis.highlights.map((highlight, index) => (
                            <li key={index} className="bg-green-50 p-3 rounded-lg border-l-4 border-green-400 text-sm">
                              <span className="text-gray-700">{highlight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Topics */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                          📚 Topics Covered
                        </h3>
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
                  <div className="p-6 text-center text-gray-500">
                    <div className="text-4xl mb-4">👈</div>
                    <p>Select a note to view AI analysis details</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Process Content Tab */
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center flex items-center justify-center">
                  <span className="mr-2">🎬</span>
                  Process Content with AI (Ollama)
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
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                            ? 'bg-indigo-500 text-white border-indigo-500'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        📁 Upload Video
                      </button>
                      <button
                        onClick={() => setInputMethod('url')}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          inputMethod === 'url'
                            ? 'bg-indigo-500 text-white border-indigo-500'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        🔗 Video URL
                      </button>
                      <button
                        onClick={() => setInputMethod('text')}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          inputMethod === 'text'
                            ? 'bg-indigo-500 text-white border-indigo-500'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        📝 Text Content
                      </button>
                    </div>
                  </div>

                  {/* Content Input */}
                  {inputMethod === 'upload' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Video File *
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
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
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Supports direct video URLs and YouTube links
                      </p>
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
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  )}

                  {/* AI Processing Info */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-medium text-blue-800 mb-2 flex items-center">
                      <span className="mr-2">🧠</span>
                      AI Processing with Ollama
                    </h3>
                    <p className="text-blue-700 text-sm">
                      Your content will be processed locally using Ollama AI to generate:
                    </p>
                    <ul className="text-blue-700 text-sm mt-2 space-y-1">
                      <li>• Intelligent summary and overview</li>
                      <li>• Key points and main concepts</li>
                      <li>• Important questions for review</li>
                      <li>• Highlighted topics and terms</li>
                      <li>• Difficulty assessment and time estimates</li>
                    </ul>
                  </div>

                  {/* Process Button */}
                  <div className="text-center">
                    <button
                      onClick={processVideoWithAI}
                      disabled={processing || !title || (!videoFile && !videoUrl && !textContent)}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-indigo-600 hover:to-purple-700 transition-all duration-200"
                    >
                      {processing ? (
                        <span className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Processing with AI...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          <span className="mr-2">🚀</span>
                          Process with Ollama AI
                        </span>
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
