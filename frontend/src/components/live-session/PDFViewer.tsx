'use client';

import React, { useState, useRef, useEffect } from 'react';

interface PDFViewerProps {
  socket: any;
  sessionId: string;
  userRole: 'teacher' | 'student';
  isTeacher: boolean;
}

interface PDFState {
  fileUrl: string | null;
  fileName: string;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  sharedBy: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  socket,
  sessionId,
  userRole,
  isTeacher
}) => {
  const [pdfState, setPdfState] = useState<PDFState>({
    fileUrl: null,
    fileName: '',
    currentPage: 1,
    totalPages: 1,
    isLoading: false,
    sharedBy: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Listen for PDF sharing events
    socket.on('pdf-shared', ({ fileUrl, fileName, sharedBy }: { fileUrl: string; fileName: string; sharedBy: string }) => {
      setPdfState(prev => ({
        ...prev,
        fileUrl,
        fileName,
        sharedBy,
        currentPage: 1
      }));
    });

    socket.on('pdf-page-changed', ({ page }: { page: number }) => {
      setPdfState(prev => ({
        ...prev,
        currentPage: page
      }));
    });

    socket.on('pdf-closed', () => {
      setPdfState({
        fileUrl: null,
        fileName: '',
        currentPage: 1,
        totalPages: 1,
        isLoading: false,
        sharedBy: ''
      });
    });

    return () => {
      socket.off('pdf-shared');
      socket.off('pdf-page-changed');
      socket.off('pdf-closed');
    };
  }, [socket]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Please select a PDF file');
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('sessionId', sessionId);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/live-sessions/upload-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update local state
        setPdfState(prev => ({
          ...prev,
          fileUrl: result.data.fileUrl,
          fileName: file.name,
          sharedBy: 'You',
          currentPage: 1
        }));

        // Notify other participants
        socket.emit('share-pdf', {
          sessionId,
          fileUrl: result.data.fileUrl,
          fileName: file.name,
          sharedBy: 'Current User' // This should come from user context
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('PDF upload error:', error);
      alert('Failed to upload PDF. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const changePage = (newPage: number) => {
    if (newPage < 1 || newPage > pdfState.totalPages) return;
    
    setPdfState(prev => ({
      ...prev,
      currentPage: newPage
    }));

    if (isTeacher) {
      // Only teachers can control page navigation for all participants
      socket.emit('pdf-page-change', {
        sessionId,
        page: newPage
      });
    }
  };

  const closePDF = () => {
    setPdfState({
      fileUrl: null,
      fileName: '',
      currentPage: 1,
      totalPages: 1,
      isLoading: false,
      sharedBy: ''
    });

    if (isTeacher) {
      socket.emit('close-pdf', { sessionId });
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          📄 PDF Viewer
        </h3>
        
        {/* PDF controls */}
        {isTeacher && (
          <div className="flex gap-2">
            {!pdfState.fileUrl ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isUploading ? '⏳ Uploading...' : '📤 Upload PDF'}
                </button>
              </div>
            ) : (
              <button
                onClick={closePDF}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                ❌ Close PDF
              </button>
            )}
          </div>
        )}
      </div>

      {/* PDF viewer */}
      {pdfState.fileUrl ? (
        <div className="border rounded-lg overflow-hidden">
          {/* PDF header */}
          <div className="bg-gray-50 px-4 py-2 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {pdfState.fileName}
                </span>
                <span className="text-xs text-gray-500">
                  Shared by {pdfState.sharedBy}
                </span>
              </div>
              
              {/* Page navigation */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => changePage(pdfState.currentPage - 1)}
                  disabled={pdfState.currentPage <= 1 || (!isTeacher && userRole === 'student')}
                  className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ◀️ Prev
                </button>
                
                <span className="text-sm text-gray-600">
                  Page {pdfState.currentPage} of {pdfState.totalPages}
                </span>
                
                <button
                  onClick={() => changePage(pdfState.currentPage + 1)}
                  disabled={pdfState.currentPage >= pdfState.totalPages || (!isTeacher && userRole === 'student')}
                  className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next ▶️
                </button>
              </div>
            </div>
          </div>
          
          {/* PDF content */}
          <div className="bg-gray-100 flex items-center justify-center" style={{ height: '600px' }}>
            <iframe
              src={`${pdfState.fileUrl}#page=${pdfState.currentPage}`}
              className="w-full h-full border-0"
              title={pdfState.fileName}
            />
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-6xl mb-4 opacity-50">📄</div>
          <h4 className="text-lg font-medium text-gray-700 mb-2">No PDF Shared</h4>
          <p className="text-sm">
            {isTeacher 
              ? 'Upload a PDF file to share with your students'
              : 'Waiting for teacher to share a PDF document...'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;