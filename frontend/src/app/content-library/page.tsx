'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authenticatedFetch } from '@/utils/auth';

interface ContentFile {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  description: string;
  is_shared: boolean;
  class_name: string;
  download_count: number;
  uploaded_at: string;
}

interface Class {
  id: string;
  name: string;
}

export default function ContentLibraryPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<ContentFile[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const router = useRouter();

  const [uploadData, setUploadData] = useState({
    class_id: '',
    description: '',
    is_shared: true
  });

  useEffect(() => {
    // Check authentication and role
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role !== 'teacher') {
        router.push('/login');
        return;
      }
      setUser(parsedUser);
      fetchData();
    } catch (error) {
      router.push('/login');
      return;
    }

    setLoading(false);
  }, [router]);

  const fetchData = async () => {
    try {
      const [filesRes, classesRes] = await Promise.all([
        authenticatedFetch(`/api/content${selectedClass ? `?class_id=${selectedClass}` : ''}${selectedFileType ? `&file_type=${selectedFileType}` : ''}`),
        authenticatedFetch('/api/classes')
      ]);

      if (filesRes.ok) {
        const filesData = await filesRes.json();
        setFiles(filesData.data || []);
      }

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [selectedClass, selectedFileType, user]);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const formElement = e.target as HTMLFormElement;
    const fileInput = formElement.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (!fileInput?.files?.[0]) {
      alert('Please select a file');
      return;
    }

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('class_id', uploadData.class_id);
    formData.append('description', uploadData.description);
    formData.append('is_shared', uploadData.is_shared.toString());

    try {
      const response = await authenticatedFetch('/api/content/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setShowUploadForm(false);
        setUploadData({
          class_id: '',
          description: '',
          is_shared: true
        });
        fetchData();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setUploadLoading(false);
    }
  };

  const toggleShareStatus = async (fileId: string, currentStatus: boolean) => {
    try {
      const response = await authenticatedFetch(`/api/content/${fileId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_shared: !currentStatus }),
      });

      if (response.ok) {
        fetchData();
      } else {
        alert('Failed to update file');
      }
    } catch (error) {
      console.error('Error updating file:', error);
      alert('Failed to update file');
    }
  };

  const downloadFile = async (fileId: string, filename: string) => {
    try {
      const response = await authenticatedFetch(`/api/content/${fileId}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        fetchData(); // Refresh to update download count
      } else {
        alert('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/content/${fileId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
      } else {
        alert('Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'document':
        return '📄';
      case 'spreadsheet':
        return '📊';
      case 'presentation':
        return '📋';
      case 'image':
        return '🖼️';
      case 'video':
        return '🎥';
      case 'audio':
        return '🎵';
      case 'archive':
        return '📦';
      default:
        return '📁';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center pt-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-500 mx-auto mb-6"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-20">
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">📚 Content Library</h1>
              <p className="text-gray-300 text-lg">Upload and manage course materials and resources</p>
            </div>
            <div className="mt-4 lg:mt-0 flex gap-4">
              <button
                onClick={() => setShowUploadForm(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200"
              >
                📤 Upload File
              </button>
              <Link 
                href="/teacher-dashboard"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="text-white font-medium mr-2">Filter by Class:</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-white/10 text-white border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id} className="bg-gray-800">
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-white font-medium mr-2">Filter by Type:</label>
              <select
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value)}
                className="bg-white/10 text-white border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Types</option>
                <option value="document" className="bg-gray-800">Documents</option>
                <option value="spreadsheet" className="bg-gray-800">Spreadsheets</option>
                <option value="presentation" className="bg-gray-800">Presentations</option>
                <option value="image" className="bg-gray-800">Images</option>
                <option value="video" className="bg-gray-800">Videos</option>
                <option value="audio" className="bg-gray-800">Audio</option>
                <option value="archive" className="bg-gray-800">Archives</option>
              </select>
            </div>
          </div>
        </div>

        {/* Files Grid */}
        <div className="grid gap-4">
          {files.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-center">
              <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Files Yet</h3>
              <p className="text-gray-400">Upload your first file to get started!</p>
            </div>
          ) : (
            files.map((file) => (
              <div key={file.id} className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="text-4xl">
                      {getFileIcon(file.file_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{file.original_filename}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          file.is_shared 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}>
                          {file.is_shared ? 'Shared' : 'Private'}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {file.file_type}
                        </span>
                      </div>
                      {file.description && (
                        <p className="text-gray-300 mb-3">{file.description}</p>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Class:</span>
                          <p className="text-white font-medium">{file.class_name || 'All Classes'}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Size:</span>
                          <p className="text-white font-medium">{formatFileSize(file.file_size)}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Downloads:</span>
                          <p className="text-white font-medium">{file.download_count}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Uploaded:</span>
                          <p className="text-white font-medium">
                            {new Date(file.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => downloadFile(file.id, file.original_filename)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      📥 Download
                    </button>
                    <button
                      onClick={() => toggleShareStatus(file.id, file.is_shared)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        file.is_shared
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {file.is_shared ? '🔒 Make Private' : '🔓 Share'}
                    </button>
                    <button
                      onClick={() => deleteFile(file.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Upload Modal */}
        {showUploadForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-xl p-8 max-w-lg w-full mx-4">
              <h2 className="text-2xl font-bold text-white mb-6">Upload File</h2>
              <form onSubmit={handleFileUpload}>
                <div className="grid gap-4">
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">File *</label>
                    <input
                      type="file"
                      className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Class (Optional)</label>
                    <select
                      value={uploadData.class_id}
                      onChange={(e) => setUploadData({ ...uploadData, class_id: e.target.value })}
                      className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="" className="bg-gray-800">All Classes</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id} className="bg-gray-800">
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 font-medium mb-2">Description</label>
                    <textarea
                      value={uploadData.description}
                      onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                      className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={3}
                      placeholder="Optional description of the file..."
                    />
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={uploadData.is_shared}
                        onChange={(e) => setUploadData({ ...uploadData, is_shared: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-gray-300">Share with students</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    type="submit"
                    disabled={uploadLoading}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    {uploadLoading ? 'Uploading...' : '📤 Upload File'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUploadForm(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}