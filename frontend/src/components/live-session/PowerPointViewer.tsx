'use client';

import React, { useState, useRef, useEffect } from 'react';

interface PowerPointViewerProps {
  socket: any;
  sessionId: string;
  userRole: 'teacher' | 'student';
  isTeacher: boolean;
}

interface PPTState {
  fileUrl: string | null;
  fileName: string;
  currentSlide: number;
  totalSlides: number;
  isLoading: boolean;
  sharedBy: string;
  slides: string[]; // Array of slide image URLs
}

const PowerPointViewer: React.FC<PowerPointViewerProps> = ({
  socket,
  sessionId,
  userRole,
  isTeacher
}) => {
  const [pptState, setPptState] = useState<PPTState>({
    fileUrl: null,
    fileName: '',
    currentSlide: 1,
    totalSlides: 1,
    isLoading: false,
    sharedBy: '',
    slides: []
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Listen for PowerPoint sharing events
    socket.on('ppt-shared', ({ 
      fileUrl, 
      fileName, 
      sharedBy, 
      slides 
    }: { 
      fileUrl: string; 
      fileName: string; 
      sharedBy: string; 
      slides: string[] 
    }) => {
      setPptState(prev => ({
        ...prev,
        fileUrl,
        fileName,
        sharedBy,
        slides,
        currentSlide: 1,
        totalSlides: slides.length
      }));
    });

    socket.on('ppt-slide-changed', ({ slide }: { slide: number }) => {
      setPptState(prev => ({
        ...prev,
        currentSlide: slide
      }));
    });

    socket.on('ppt-closed', () => {
      setPptState({
        fileUrl: null,
        fileName: '',
        currentSlide: 1,
        totalSlides: 1,
        isLoading: false,
        sharedBy: '',
        slides: []
      });
    });

    return () => {
      socket.off('ppt-shared');
      socket.off('ppt-slide-changed');
      socket.off('ppt-closed');
    };
  }, [socket]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.name.toLowerCase().match(/\.(ppt|pptx)$/)) {
      alert('Please select a PowerPoint file (.ppt or .pptx)');
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('ppt', file);
      formData.append('sessionId', sessionId);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/live-sessions/upload-ppt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update local state
        setPptState(prev => ({
          ...prev,
          fileUrl: result.data.fileUrl,
          fileName: file.name,
          sharedBy: 'You',
          slides: result.data.slides,
          currentSlide: 1,
          totalSlides: result.data.slides.length
        }));

        // Notify other participants
        socket.emit('share-ppt', {
          sessionId,
          fileUrl: result.data.fileUrl,
          fileName: file.name,
          sharedBy: 'Current User', // This should come from user context
          slides: result.data.slides
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('PowerPoint upload error:', error);
      alert('Failed to upload PowerPoint. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const changeSlide = (newSlide: number) => {
    if (newSlide < 1 || newSlide > pptState.totalSlides) return;
    
    setPptState(prev => ({
      ...prev,
      currentSlide: newSlide
    }));

    if (isTeacher) {
      // Only teachers can control slide navigation for all participants
      socket.emit('ppt-slide-change', {
        sessionId,
        slide: newSlide
      });
    }
  };

  const closePPT = () => {
    setPptState({
      fileUrl: null,
      fileName: '',
      currentSlide: 1,
      totalSlides: 1,
      isLoading: false,
      sharedBy: '',
      slides: []
    });

    if (isTeacher) {
      socket.emit('close-ppt', { sessionId });
    }
  };

  const goToSlide = (slideNumber: number) => {
    changeSlide(slideNumber);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          🎯 PowerPoint Viewer
        </h3>
        
        {/* PowerPoint controls */}
        {isTeacher && (
          <div className="flex gap-2">
            {!pptState.fileUrl ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ppt,.pptx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {isUploading ? '⏳ Processing...' : '📤 Upload PPT'}
                </button>
              </div>
            ) : (
              <button
                onClick={closePPT}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                ❌ Close PPT
              </button>
            )}
          </div>
        )}
      </div>

      {/* PowerPoint viewer */}
      {pptState.fileUrl && pptState.slides.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          {/* PPT header */}
          <div className="bg-gray-50 px-4 py-2 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {pptState.fileName}
                </span>
                <span className="text-xs text-gray-500">
                  Shared by {pptState.sharedBy}
                </span>
              </div>
              
              {/* Slide navigation */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => changeSlide(pptState.currentSlide - 1)}
                  disabled={pptState.currentSlide <= 1 || (!isTeacher && userRole === 'student')}
                  className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ◀️ Prev
                </button>
                
                <span className="text-sm text-gray-600">
                  Slide {pptState.currentSlide} of {pptState.totalSlides}
                </span>
                
                <button
                  onClick={() => changeSlide(pptState.currentSlide + 1)}
                  disabled={pptState.currentSlide >= pptState.totalSlides || (!isTeacher && userRole === 'student')}
                  className="px-2 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next ▶️
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex">
            {/* Slide thumbnails (for teachers) */}
            {isTeacher && pptState.slides.length > 1 && (
              <div className="w-48 bg-gray-50 border-r overflow-y-auto" style={{ maxHeight: '600px' }}>
                <div className="p-2">
                  <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                    Slides
                  </h4>
                  <div className="space-y-2">
                    {pptState.slides.map((slideUrl, index) => (
                      <div
                        key={index}
                        onClick={() => goToSlide(index + 1)}
                        className={`cursor-pointer border-2 rounded transition-all ${
                          pptState.currentSlide === index + 1
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={slideUrl}
                          alt={`Slide ${index + 1}`}
                          className="w-full h-20 object-contain bg-white rounded"
                        />
                        <div className="text-xs text-center py-1 text-gray-600">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Main slide view */}
            <div className="flex-1 bg-gray-100 flex items-center justify-center" style={{ height: '600px' }}>
              {pptState.slides[pptState.currentSlide - 1] ? (
                <img
                  src={pptState.slides[pptState.currentSlide - 1]}
                  alt={`Slide ${pptState.currentSlide}`}
                  className="max-w-full max-h-full object-contain bg-white shadow-lg"
                />
              ) : (
                <div className="text-gray-500">
                  <div className="text-4xl mb-2">⏳</div>
                  <p>Loading slide...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-6xl mb-4 opacity-50">🎯</div>
          <h4 className="text-lg font-medium text-gray-700 mb-2">No Presentation Shared</h4>
          <p className="text-sm">
            {isTeacher 
              ? 'Upload a PowerPoint file to share with your students'
              : 'Waiting for teacher to share a presentation...'
            }
          </p>
          {isUploading && (
            <div className="mt-4">
              <div className="text-blue-600">
                <div className="text-2xl mb-2">⏳</div>
                <p>Processing PowerPoint file...</p>
                <p className="text-xs text-gray-500 mt-1">This may take a few moments</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PowerPointViewer;