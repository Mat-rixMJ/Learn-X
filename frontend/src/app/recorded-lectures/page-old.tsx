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
    lecture.className.toLowerCase().includes(searchTerm.toLowerCase())
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
    lecture.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = (type: string, lectureId: number) => {
    // Simulate download
    alert(`Downloading ${type} for lecture ${lectureId}`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-indigo-600">Recorded Lectures</h1>
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search lectures..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Lectures List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Lectures</h2>
            {filteredLectures.map((lecture) => (
              <div
                key={lecture.id}
                className={`bg-white p-6 rounded-lg shadow-md cursor-pointer transition-all ${
                  selectedLecture === lecture.id ? 'ring-2 ring-indigo-500' : 'hover:shadow-lg'
                }`}
                onClick={() => setSelectedLecture(lecture.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">{lecture.title}</h3>
                  <span className="text-sm text-gray-500">{lecture.duration}</span>
                </div>
                <p className="text-gray-600 mb-2">{lecture.teacher}</p>
                <p className="text-sm text-gray-500 mb-3">{lecture.date}</p>
                <p className="text-gray-700 text-sm">{lecture.description}</p>
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload('audio', lecture.id);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    🎧 Download Audio
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload('slides', lecture.id);
                    }}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                  >
                    📊 Download Slides
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Lecture Details */}
          <div className="space-y-6">
            {selectedLecture ? (
              <>
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Lecture Details</h2>
                  {(() => {
                    const lecture = lectures.find(l => l.id === selectedLecture);
                    return lecture ? (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">{lecture.title}</h3>
                        <p className="text-gray-600 mb-1">Teacher: {lecture.teacher}</p>
                        <p className="text-gray-600 mb-1">Date: {lecture.date}</p>
                        <p className="text-gray-600 mb-4">Duration: {lecture.duration}</p>
                        <p className="text-gray-700">{lecture.description}</p>
                      </div>
                    ) : null;
                  })()}
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">📝 AI Summary</h3>
                  {(() => {
                    const lecture = lectures.find(l => l.id === selectedLecture);
                    return lecture ? (
                      <p className="text-gray-700">{lecture.summary}</p>
                    ) : null;
                  })()}
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">📄 Full Transcript</h3>
                  <div className="max-h-96 overflow-y-auto">
                    {(() => {
                      const lecture = lectures.find(l => l.id === selectedLecture);
                      return lecture ? (
                        <p className="text-gray-700 text-sm leading-relaxed">{lecture.transcript}</p>
                      ) : null;
                    })()}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Select a Lecture</h3>
                <p className="text-gray-600">Click on a lecture from the list to view its details, transcript, and summary.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
