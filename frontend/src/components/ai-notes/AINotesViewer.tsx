'use client';

import React, { useState, useEffect } from 'react';

interface AINotesData {
  segments: Array<{
    start: number;
    end: number;
    text: string;
    confidence: number;
    speaker: string;
    concepts: string[];
  }>;
  analysis: {
    summary: string;
    learningObjectives: string[];
    keyPoints: Array<{
      timestamp: number;
      title: string;
      content: string;
      importance: string;
    }>;
    concepts: Array<{
      name: string;
      definition: string;
      relatedTerms: string[];
      difficulty: string;
    }>;
    questionsAndAnswers: Array<{
      question: string;
      answer: string;
      difficulty: string;
      type: string;
      timestamp: number;
    }>;
    chapters: Array<{
      title: string;
      startTime: number;
      endTime: number;
      summary: string;
      keyTopics: string[];
    }>;
    metadata: {
      overallDifficulty: string;
      estimatedStudyTime: string;
      prerequisites: string[];
      targetAudience: string;
      tags: string[];
      language: string;
      academicLevel: string;
    };
    relatedTopics: string[];
    flashcards: Array<{
      front: string;
      back: string;
    }>;
  };
}

interface AINotesViewerProps {
  lectureId: string;
  lectureTitle: string;
  onSeekToTime?: (time: number) => void;
}

export default function AINotesViewer({ lectureId, lectureTitle, onSeekToTime }: AINotesViewerProps) {
  const [notesData, setNotesData] = useState<AINotesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [currentFlashcard, setCurrentFlashcard] = useState(0);

  const processAINotes = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/ai-notes/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          lectureId,
          features: {
            comprehensiveAnalysis: true,
            questionGeneration: true,
            conceptMapping: true,
            flashcardGeneration: true
          }
        })
      });

      const data = await response.json();
      if (data.success) {
        setNotesData(data.data);
      }
    } catch (error) {
      console.error('Failed to process AI notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredQuestions = notesData?.analysis?.questionsAndAnswers?.filter(
    (qa: any) => selectedDifficulty === 'all' || qa.difficulty === selectedDifficulty
  ) || [];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing AI Notes</h3>
            <p className="text-gray-600">Analyzing lecture content and generating comprehensive study materials...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!notesData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">AI Notes Generator</h3>
          <p className="text-gray-600 mb-6">Generate comprehensive study materials from your lecture using AI</p>
          <button
            onClick={processAINotes}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105"
          >
            🚀 Generate AI Notes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mb-6 text-white">
        <h1 className="text-2xl font-bold mb-2">🤖 AI-Generated Study Notes</h1>
        <h2 className="text-lg opacity-90">{lectureTitle}</h2>
        <div className="flex flex-wrap gap-2 mt-4">
          <span className={`px-3 py-1 rounded-full text-xs ${getDifficultyColor(notesData?.analysis?.metadata?.overallDifficulty || 'beginner')}`}>
            {notesData?.analysis?.metadata?.overallDifficulty || 'beginner'} level
          </span>
          <span className="px-3 py-1 rounded-full text-xs bg-white bg-opacity-20">
            ⏱️ {notesData?.analysis?.metadata?.estimatedStudyTime || '5 minutes'}
          </span>
          <span className="px-3 py-1 rounded-full text-xs bg-white bg-opacity-20">
            🎯 {notesData?.analysis?.metadata?.academicLevel || 'General'}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-lg mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'summary', label: '📋 Summary', icon: '📋' },
              { id: 'concepts', label: '🧠 Concepts', icon: '🧠' },
              { id: 'questions', label: '❓ Q&A', icon: '❓' },
              { id: 'timeline', label: '⏰ Timeline', icon: '⏰' },
              { id: 'flashcards', label: '📚 Flashcards', icon: '📚' },
              { id: 'export', label: '📤 Export', icon: '📤' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Executive Summary */}
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">📝 Executive Summary</h3>
                <p className="text-blue-800 leading-relaxed">{notesData.analysis.summary}</p>
              </div>

              {/* Learning Objectives */}
              <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                <h3 className="text-lg font-semibold text-green-900 mb-3">🎯 Learning Objectives</h3>
                <ul className="space-y-2">
                  {notesData.analysis.learningObjectives.map((objective, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-600 mr-2 mt-1">✓</span>
                      <span className="text-green-800">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Key Points */}
              <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                <h3 className="text-lg font-semibold text-purple-900 mb-4">🔑 Key Points</h3>
                <div className="space-y-4">
                  {notesData.analysis.keyPoints.map((point, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-purple-900">{point.title}</h4>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            point.importance === 'high' ? 'bg-red-100 text-red-800' :
                            point.importance === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {point.importance}
                          </span>
                          {onSeekToTime && (
                            <button
                              onClick={() => onSeekToTime(point.timestamp)}
                              className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                            >
                              ⏰ {formatTime(point.timestamp)}
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-purple-700 text-sm">{point.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prerequisites and Related Topics */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-2">📚 Prerequisites</h4>
                  <ul className="text-sm text-orange-800 space-y-1">
                    {(notesData?.analysis?.metadata?.prerequisites || []).map((prereq: string, index: number) => (
                      <li key={index}>• {prereq}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
                  <h4 className="font-semibold text-teal-900 mb-2">🔗 Related Topics</h4>
                  <div className="flex flex-wrap gap-1">
                    {notesData.analysis.relatedTopics.map((topic, index) => (
                      <span key={index} className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Concepts Tab */}
          {activeTab === 'concepts' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">🧠 Key Concepts Dictionary</h3>
              {notesData.analysis.concepts.map((concept, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{concept.name}</h4>
                    <span className={`px-2 py-1 rounded text-xs ${getDifficultyColor(concept.difficulty)}`}>
                      {concept.difficulty}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">{concept.definition}</p>
                  <div className="flex flex-wrap gap-1">
                    {concept.relatedTerms.map((term, termIndex) => (
                      <span key={termIndex} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Questions Tab */}
          {activeTab === 'questions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">❓ Study Questions & Answers</h3>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All Difficulties</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              
              {filteredQuestions.map((qa: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2 py-1 rounded text-xs ${getDifficultyColor(qa.difficulty)}`}>
                      {qa.difficulty}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                        {qa.type}
                      </span>
                      {onSeekToTime && qa.timestamp > 0 && (
                        <button
                          onClick={() => onSeekToTime(qa.timestamp)}
                          className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                        >
                          ⏰ {formatTime(qa.timestamp)}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mb-3">
                    <h4 className="font-medium text-gray-900 mb-2">Q: {qa.question}</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded">A: {qa.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">⏰ Lecture Timeline</h3>
              {notesData.analysis.chapters.map((chapter, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{chapter.title}</h4>
                    <div className="flex items-center space-x-2">
                      {onSeekToTime && (
                        <button
                          onClick={() => onSeekToTime(chapter.startTime)}
                          className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded hover:bg-blue-200"
                        >
                          ▶️ {formatTime(chapter.startTime)} - {formatTime(chapter.endTime)}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-700 mb-2">{chapter.summary}</p>
                  <div className="flex flex-wrap gap-1">
                    {chapter.keyTopics.map((topic, topicIndex) => (
                      <span key={topicIndex} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Flashcards Tab */}
          {activeTab === 'flashcards' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">📚 Study Flashcards</h3>
                <div className="text-sm text-gray-600">
                  {currentFlashcard + 1} of {notesData.analysis.flashcards.length}
                </div>
              </div>
              
              {notesData.analysis.flashcards.length > 0 && (
                <div className="bg-white border-2 border-gray-300 rounded-lg p-8 min-h-64 flex items-center justify-center">
                  <div className={`text-center transition-transform duration-300 ${showFlashcards ? 'scale-100' : 'scale-95'}`}>
                    <div className="text-lg font-medium mb-4">
                      {showFlashcards ? '💡 Answer' : '❓ Question'}
                    </div>
                    <div className="text-xl mb-6">
                      {showFlashcards 
                        ? notesData.analysis.flashcards[currentFlashcard]?.back
                        : notesData.analysis.flashcards[currentFlashcard]?.front
                      }
                    </div>
                    <button
                      onClick={() => setShowFlashcards(!showFlashcards)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {showFlashcards ? '🔄 Show Question' : '🔍 Show Answer'}
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    setCurrentFlashcard(Math.max(0, currentFlashcard - 1));
                    setShowFlashcards(false);
                  }}
                  disabled={currentFlashcard === 0}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
                >
                  ← Previous
                </button>
                <span className="text-sm text-gray-600">
                  Card {currentFlashcard + 1} of {notesData.analysis.flashcards.length}
                </span>
                <button
                  onClick={() => {
                    setCurrentFlashcard(Math.min(notesData.analysis.flashcards.length - 1, currentFlashcard + 1));
                    setShowFlashcards(false);
                  }}
                  disabled={currentFlashcard === notesData.analysis.flashcards.length - 1}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">📤 Export Study Materials</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <button className="p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <div className="text-center">
                    <div className="text-2xl mb-2">📄</div>
                    <div className="font-medium">Export as PDF</div>
                    <div className="text-sm text-gray-600">Complete study guide</div>
                  </div>
                </button>
                <button className="p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
                  <div className="text-center">
                    <div className="text-2xl mb-2">📝</div>
                    <div className="font-medium">Export as Markdown</div>
                    <div className="text-sm text-gray-600">Plain text format</div>
                  </div>
                </button>
                <button className="p-4 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
                  <div className="text-center">
                    <div className="text-2xl mb-2">🃏</div>
                    <div className="font-medium">Export Flashcards</div>
                    <div className="text-sm text-gray-600">Anki format</div>
                  </div>
                </button>
                <button className="p-4 border-2 border-dashed border-orange-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors">
                  <div className="text-center">
                    <div className="text-2xl mb-2">📊</div>
                    <div className="font-medium">Export Quiz</div>
                    <div className="text-sm text-gray-600">Question bank</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}