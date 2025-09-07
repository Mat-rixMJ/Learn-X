'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Lecture {
  id: string;
  title: string;
  teacher: string;
  className: string;
  subject: string;
  date: string;
  duration: string;
  description: string;
  transcript: string;
  summary: string;
  downloadUrl: string;
  audioUrl: string;
  slidesUrl: string;
  fileSize: number;
  isPublic: boolean;
}

export default function RecordedLectures() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLecture, setSelectedLecture] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchLectures();
  }, [searchTerm]);

  const fetchLectures = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const searchQuery = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
      
      const response = await fetch(`${baseUrl}/api/lectures${searchQuery}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setLectures(data.data.lectures);
        setError('');
      } else {
        setError(data.message || 'Failed to fetch lectures');
      }
    } catch (err) {
      console.error('Lectures fetch error:', err);
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (lectureId: string, title: string) => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${baseUrl}/api/lectures/${lectureId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success && data.data.downloadUrl) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = data.data.downloadUrl;
        link.download = `${title}.mp4`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert(data.message || 'Download not available');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download lecture');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredLectures = lectures.filter(lecture =>
    lecture.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lecture.teacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lecture.className && lecture.className.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-center">Loading lectures...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-lg text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchLectures}
            className="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg rounded-2xl p-6 m-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            📹 Recorded Lectures
          </h1>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search lectures, teachers, or classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all duration-200 w-80"
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {filteredLectures.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-sm p-12 rounded-3xl shadow-xl text-center">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Lectures Found</h2>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? `No lectures match your search "${searchTerm}"`
                : "You don't have access to any recorded lectures yet. Enroll in classes to access their recordings."
              }
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Lectures List */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                📋 Available Lectures ({filteredLectures.length})
              </h2>
              {filteredLectures.map((lecture) => (
                <div
                  key={lecture.id}
                  className={`bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border-2 cursor-pointer ${
                    selectedLecture === lecture.id 
                      ? 'border-indigo-500 ring-4 ring-indigo-200' 
                      : 'border-white/20 hover:border-indigo-300'
                  }`}
                  onClick={() => setSelectedLecture(lecture.id)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{lecture.title}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-2">
                        <span className="flex items-center">
                          👨‍🏫 {lecture.teacher}
                        </span>
                        {lecture.className && (
                          <span className="flex items-center">
                            📚 {lecture.className}
                          </span>
                        )}
                        <span className="flex items-center">
                          📅 {formatDate(lecture.date)}
                        </span>
                        <span className="flex items-center">
                          ⏱️ {lecture.duration}
                        </span>
                      </div>
                      {lecture.fileSize && (
                        <p className="text-xs text-gray-500">Size: {formatFileSize(lecture.fileSize)}</p>
                      )}
                    </div>
                    <div className="flex flex-col space-y-2">
                      {lecture.isPublic && (
                        <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
                          Public
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{lecture.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(lecture.id, lecture.title);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full text-sm hover:from-blue-600 hover:to-cyan-600 transition-all duration-200"
                    >
                      📥 Download Video
                    </button>
                    {lecture.audioUrl && (
                      <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full text-sm hover:from-green-600 hover:to-teal-600 transition-all duration-200">
                        🎵 Audio Only
                      </button>
                    )}
                    {lecture.slidesUrl && (
                      <button className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full text-sm hover:from-orange-600 hover:to-red-600 transition-all duration-200">
                        📊 Slides
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Lecture Details */}
            <div className="space-y-6">
              {selectedLecture ? (
                (() => {
                  const lecture = filteredLectures.find(l => l.id === selectedLecture);
                  return lecture ? (
                    <>
                      <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">📝 Lecture Details</h2>
                        <h3 className="text-xl font-semibold text-indigo-600 mb-2">{lecture.title}</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                          <div><strong>Teacher:</strong> {lecture.teacher}</div>
                          <div><strong>Date:</strong> {formatDate(lecture.date)}</div>
                          <div><strong>Duration:</strong> {lecture.duration}</div>
                          {lecture.className && <div><strong>Class:</strong> {lecture.className}</div>}
                        </div>
                        <p className="text-gray-700">{lecture.description}</p>
                      </div>

                      {lecture.summary && (
                        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl">
                          <h2 className="text-2xl font-bold text-gray-800 mb-4">🤖 AI Summary</h2>
                          <p className="text-gray-700 leading-relaxed">{lecture.summary}</p>
                        </div>
                      )}

                      {lecture.transcript && (
                        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-3xl shadow-xl">
                          <h2 className="text-2xl font-bold text-gray-800 mb-4">📜 Transcript</h2>
                          <div className="bg-gray-50 p-4 rounded-xl max-h-96 overflow-y-auto">
                            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                              {lecture.transcript}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : null;
                })()
              ) : (
                <div className="bg-white/70 backdrop-blur-sm p-12 rounded-3xl shadow-xl text-center">
                  <div className="text-6xl mb-4">👆</div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Select a Lecture</h2>
                  <p className="text-gray-600">
                    Click on any lecture from the list to view its details, transcript, and AI summary.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
