"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
}

interface AINote {
  id: number;
  user_id: number;
  title: string;
  subject: string;
  summary: string;
  key_points: string[];
  ai_analysis: {
    summary: string;
    key_points: string[];
    important_questions: string[];
    highlights: string[];
    topics: string[];
    difficulty_level: string;
    estimated_time: string;
  };
  processing_status: "pending" | "processing" | "completed" | "failed";
  processing_method: "video" | "text" | "pdf";
  created_at: string;
  updated_at: string;
}

export default function AINotesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"notes" | "generate" | "pdf">(
    "notes",
  );
  const [aiNotes, setAiNotes] = useState<AINote[]>([]);
  const [selectedNote, setSelectedNote] = useState<AINote | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Form states for video processing
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [inputMethod, setInputMethod] = useState<"upload" | "url" | "text">(
    "upload",
  );
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [processing, setProcessing] = useState(false);

  // PDF form states
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfSubject, setPdfSubject] = useState("");
  const [generateStudyGuide, setGenerateStudyGuide] = useState(false);
  const [pdfProcessing, setPdfProcessing] = useState(false);

  const checkAuthAndLoadData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");

      if (!token) {
        alert("Please log in first to access AI Notes");
        router.push("/login");
        return;
      }

      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setUserRole(parsedUser.role);
        await loadAiNotes();
        return;
      }

      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${baseUrl}/api/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        const userData = {
          id: data.data.id,
          name: data.data.name || data.data.username,
          username: data.data.username,
          role: data.data.role,
        };
        setUser(userData);
        setUserRole(userData.role);
        await loadAiNotes();
      } else {
        const cachedUser = localStorage.getItem("user");
        if (cachedUser) {
          const parsedUser = JSON.parse(cachedUser);
          setUser(parsedUser);
          setUserRole(parsedUser.role);
          await loadAiNotes();
        } else {
          alert("Session expired. Please log in again.");
          router.push("/login");
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      const cachedUser = localStorage.getItem("user");
      if (cachedUser) {
        const parsedUser = JSON.parse(cachedUser);
        setUser(parsedUser);
        setUserRole(parsedUser.role);
        await loadAiNotes();
      } else {
        alert("Connection error. Please log in again.");
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAuthAndLoadData();
  }, [checkAuthAndLoadData]);

  const loadAiNotes = async () => {
    try {
      if (!user) {
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = localStorage.getItem("token");

      const response = await fetch(`${apiUrl}/api/ai-notes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        setAiNotes(getMockAINotes());
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setAiNotes(data.notes || []);
      } else {
        setAiNotes(getMockAINotes());
      }
    } catch (error) {
      console.error("AI Notes fetch error:", error);
      setAiNotes(getMockAINotes());
    }
  };

  const getMockAINotes = () => {
    return [
      {
        id: 1,
        user_id: parseInt(user?.id || "1"),
        title: "Machine Learning Basics",
        subject: "Computer Science",
        summary:
          "This note covers fundamental machine learning concepts including supervised learning, unsupervised learning, and neural networks.",
        key_points: [
          "Supervised vs Unsupervised Learning",
          "Neural Networks Basics",
          "Training and Testing Data",
          "Overfitting Prevention",
        ],
        ai_analysis: {
          summary:
            "Comprehensive overview of machine learning fundamentals with practical examples and key concepts.",
          key_points: [
            "Supervised vs Unsupervised Learning",
            "Neural Networks Basics",
            "Training and Testing Data",
            "Overfitting Prevention",
          ],
          important_questions: [
            "What is the difference between supervised and unsupervised learning?",
            "How do neural networks work?",
            "What is overfitting and how to prevent it?",
          ],
          highlights: [
            "Machine Learning Definition",
            "Algorithm Types",
            "Practical Applications",
          ],
          topics: ["ML Algorithms", "Data Science", "AI Fundamentals"],
          difficulty_level: "Intermediate",
          estimated_time: "45 minutes",
        },
        processing_status: "completed" as const,
        processing_method: "video" as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        user_id: parseInt(user?.id || "1"),
        title: "React Hooks Deep Dive",
        subject: "Web Development",
        summary:
          "Detailed exploration of React Hooks with practical examples and best practices.",
        key_points: [
          "useState Hook",
          "useEffect Hook",
          "Custom Hooks",
          "Hook Rules",
        ],
        ai_analysis: {
          summary:
            "In-depth coverage of React Hooks with practical examples and common patterns.",
          key_points: [
            "useState Hook",
            "useEffect Hook",
            "Custom Hooks",
            "Hook Rules",
          ],
          important_questions: [
            "When to use useEffect?",
            "How to create custom hooks?",
            "What are the rules of hooks?",
          ],
          highlights: [
            "Hook Basics",
            "Custom Hook Creation",
            "Performance Optimization",
          ],
          topics: ["React", "JavaScript", "Frontend Development"],
          difficulty_level: "Advanced",
          estimated_time: "60 minutes",
        },
        processing_status: "completed" as const,
        processing_method: "text" as const,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  };

  // Form handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !subject) {
      alert("Please fill in all required fields");
      return;
    }

    if (inputMethod === "upload" && !videoFile) {
      alert("Please select a video file");
      return;
    }

    if (inputMethod === "url" && !videoUrl) {
      alert("Please enter a video URL");
      return;
    }

    if (inputMethod === "text" && !textContent) {
      alert("Please enter text content");
      return;
    }

    setProcessing(true);

    try {
      // Here you would typically send the data to your AI processing API
      console.log("Processing video with AI:", {
        title,
        subject,
        inputMethod,
        videoFile: videoFile?.name,
        videoUrl,
        textContent: textContent.length,
      });

      // Simulate API processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Reset form
      setTitle("");
      setSubject("");
      setVideoFile(null);
      setVideoUrl("");
      setTextContent("");
      setInputMethod("upload");

      alert("AI Notes generated successfully!");
      setActiveTab("notes"); // Switch to notes tab to show results
      await loadAiNotes(); // Refresh notes list
    } catch (error) {
      console.error("Error processing video:", error);
      alert("Error processing video. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handlePdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pdfTitle || !pdfSubject || !pdfFile) {
      alert("Please fill in all required fields and select a PDF file");
      return;
    }

    setPdfProcessing(true);

    try {
      // Here you would typically send the PDF to your AI processing API
      console.log("Processing PDF with AI:", {
        title: pdfTitle,
        subject: pdfSubject,
        fileName: pdfFile.name,
        fileSize: pdfFile.size,
        generateStudyGuide,
      });

      // Simulate API processing
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // Reset form
      setPdfTitle("");
      setPdfSubject("");
      setPdfFile(null);
      setGenerateStudyGuide(false);

      alert("PDF processed successfully!");
      setActiveTab("notes"); // Switch to notes tab to show results
      await loadAiNotes(); // Refresh notes list
    } catch (error) {
      console.error("Error processing PDF:", error);
      alert("Error processing PDF. Please try again.");
    } finally {
      setPdfProcessing(false);
    }
  };

  const filteredNotes = aiNotes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.subject.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-purple-500 mx-auto"></div>
          <p className="text-white mt-4 text-xl">Loading AI Notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="mb-6">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent mb-4">
              🤖 AI Notes Studio
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mx-auto mb-6"></div>
          </div>
          <p className="text-gray-300 text-lg max-w-4xl mx-auto leading-relaxed">
            Transform your videos, lectures, and content into intelligent notes
            using cutting-edge AI. Upload videos, provide URLs, or paste text to
            generate comprehensive summaries, key points, questions, and
            highlights.
          </p>
          {userRole && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-400/30 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-purple-200 capitalize">
                Connected as {userRole}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-center mb-12">
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-2 border border-gray-700/50 shadow-2xl">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab("notes")}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                  activeTab === "notes"
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105"
                    : "text-gray-300 hover:text-white hover:bg-gray-700/50"
                }`}
              >
                <span className="text-lg">📚</span>
                <span>My Notes</span>
                <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
                  {aiNotes.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("generate")}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                  activeTab === "generate"
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105"
                    : "text-gray-300 hover:text-white hover:bg-gray-700/50"
                }`}
              >
                <span className="text-lg">🎬</span>
                <span>Process Video</span>
              </button>
              <button
                onClick={() => setActiveTab("pdf")}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                  activeTab === "pdf"
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105"
                    : "text-gray-300 hover:text-white hover:bg-gray-700/50"
                }`}
              >
                <span className="text-lg">📄</span>
                <span>Process PDF</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {activeTab === "notes" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gray-800/30 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="text-3xl">📚</span>
                    <span>Your AI Notes</span>
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {aiNotes.length}
                    </span>
                  </h2>
                </div>

                <div className="mb-6">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search notes by title or subject..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-3 pl-12 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 backdrop-blur-sm transition-all duration-200"
                    />
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                      🔍
                    </div>
                  </div>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {filteredNotes.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-8xl mb-6 opacity-50">🎥</div>
                      <h3 className="text-2xl font-bold text-white mb-3">
                        {searchTerm
                          ? "No matching notes found"
                          : "No AI notes yet"}
                      </h3>
                      <p className="text-gray-400 mb-8 text-lg">
                        {searchTerm
                          ? "Try adjusting your search terms"
                          : "Process your first video or content to generate AI notes"}
                      </p>
                      {!searchTerm && (
                        <button
                          onClick={() => setActiveTab("generate")}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                        >
                          <span className="flex items-center gap-2">
                            <span>🚀</span>
                            Process First Content
                          </span>
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredNotes.map((note) => (
                      <div
                        key={note.id}
                        onClick={() => setSelectedNote(note)}
                        className={`bg-gray-700/30 backdrop-blur-sm rounded-xl p-6 cursor-pointer transition-all duration-300 border ${
                          selectedNote?.id === note.id
                            ? "border-purple-400 shadow-xl shadow-purple-500/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10"
                            : "border-gray-600/30 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10 hover:bg-gray-700/50"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-bold text-white text-lg truncate flex-1">
                            {note.title}
                          </h3>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ml-2 ${
                              note.processing_status === "completed"
                                ? "bg-green-500/20 text-green-300"
                                : note.processing_status === "processing"
                                  ? "bg-yellow-500/20 text-yellow-300"
                                  : note.processing_status === "failed"
                                    ? "bg-red-500/20 text-red-300"
                                    : "bg-gray-500/20 text-gray-300"
                            }`}
                          >
                            {note.processing_status}
                          </span>
                        </div>
                        <div className="mb-3">
                          <span className="bg-purple-500/20 text-purple-300 text-sm px-3 py-1 rounded-full border border-purple-500/30">
                            📚 {note.subject}
                          </span>
                        </div>
                        <p className="text-gray-300 line-clamp-2 mb-4 leading-relaxed">
                          {note.ai_analysis.summary}
                        </p>
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-4">
                            <span className="text-purple-300">
                              💡 {note.ai_analysis.key_points.length} key points
                            </span>
                            <span className="text-gray-400">
                              ⏱️ {note.ai_analysis.estimated_time || "30 min"}
                            </span>
                          </div>
                          <span className="text-gray-400">
                            {new Date(note.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-gray-800/30 backdrop-blur-lg rounded-2xl border border-gray-700/50 shadow-2xl">
                {selectedNote ? (
                  <div className="p-8">
                    <div className="mb-8">
                      <h2 className="text-3xl font-bold text-white mb-4">
                        {selectedNote.title}
                      </h2>
                      <div className="flex flex-wrap gap-3 mb-6">
                        <span className="bg-purple-500/20 text-purple-300 text-sm px-4 py-2 rounded-full border border-purple-500/30">
                          📚 {selectedNote.subject}
                        </span>
                        <span className="bg-green-500/20 text-green-300 text-sm px-4 py-2 rounded-full border border-green-500/30">
                          📊 {selectedNote.ai_analysis.difficulty_level}
                        </span>
                        <span className="bg-blue-500/20 text-blue-300 text-sm px-4 py-2 rounded-full border border-blue-500/30">
                          ⏱️ {selectedNote.ai_analysis.estimated_time}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-8 max-h-96 overflow-y-auto pr-2">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                          <span className="text-2xl">📋</span>
                          Summary
                        </h3>
                        <div className="bg-gray-700/30 p-6 rounded-xl border border-gray-600/30">
                          <p className="text-gray-300 leading-relaxed">
                            {selectedNote.ai_analysis.summary}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                          <span className="text-2xl">🎯</span>
                          Key Points
                        </h3>
                        <div className="bg-gray-700/30 p-6 rounded-xl border border-gray-600/30">
                          <ul className="space-y-3">
                            {selectedNote.ai_analysis.key_points.map(
                              (point, index) => (
                                <li
                                  key={index}
                                  className="flex items-start gap-3"
                                >
                                  <span className="text-purple-400 font-bold">
                                    •
                                  </span>
                                  <span className="text-gray-300">{point}</span>
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center text-gray-400">
                      <div className="text-6xl mb-6 opacity-50">👈</div>
                      <p className="text-xl">
                        Select a note to view AI analysis details
                      </p>
                      <p className="text-sm mt-2 opacity-75">
                        Choose from your AI notes on the left
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "generate" && (
            <div className="bg-gray-800/30 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4 flex items-center justify-center gap-3">
                  <span className="text-4xl">🎬</span>
                  Generate AI Notes
                </h2>
                <p className="text-gray-300 text-lg">
                  Upload videos, provide YouTube URLs, or paste text content to
                  generate intelligent notes
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      📝 Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 backdrop-blur-sm transition-all duration-200"
                      placeholder="Enter note title..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      📚 Subject *
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 backdrop-blur-sm transition-all duration-200"
                      placeholder="e.g., Mathematics, Science, History..."
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-4">
                    📥 Input Method
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => setInputMethod("upload")}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        inputMethod === "upload"
                          ? "border-purple-500 bg-purple-500/10 text-purple-300"
                          : "border-gray-600/50 bg-gray-700/30 text-gray-300 hover:border-purple-400/50"
                      }`}
                    >
                      <div className="text-3xl mb-2">📁</div>
                      <div className="font-medium">Upload Video</div>
                      <div className="text-sm opacity-75">Local video file</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInputMethod("url")}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        inputMethod === "url"
                          ? "border-purple-500 bg-purple-500/10 text-purple-300"
                          : "border-gray-600/50 bg-gray-700/30 text-gray-300 hover:border-purple-400/50"
                      }`}
                    >
                      <div className="text-3xl mb-2">🔗</div>
                      <div className="font-medium">Video URL</div>
                      <div className="text-sm opacity-75">
                        YouTube, Vimeo, etc.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInputMethod("text")}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        inputMethod === "text"
                          ? "border-purple-500 bg-purple-500/10 text-purple-300"
                          : "border-gray-600/50 bg-gray-700/30 text-gray-300 hover:border-purple-400/50"
                      }`}
                    >
                      <div className="text-3xl mb-2">📝</div>
                      <div className="font-medium">Text Content</div>
                      <div className="text-sm opacity-75">Paste or type</div>
                    </button>
                  </div>
                </div>

                {inputMethod === "upload" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      🎥 Video File
                    </label>
                    <div className="border-2 border-dashed border-gray-600/50 rounded-xl p-8 text-center bg-gray-700/20 hover:border-purple-400/50 transition-colors duration-200">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) =>
                          setVideoFile(e.target.files?.[0] || null)
                        }
                        className="hidden"
                        id="video-upload"
                      />
                      <label htmlFor="video-upload" className="cursor-pointer">
                        <div className="text-6xl mb-4 opacity-50">🎬</div>
                        <p className="text-gray-300 text-lg mb-2">
                          {videoFile
                            ? videoFile.name
                            : "Click to upload video file"}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Supports MP4, MOV, AVI, and other video formats
                        </p>
                      </label>
                    </div>
                  </div>
                )}

                {inputMethod === "url" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      🔗 Video URL
                    </label>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 backdrop-blur-sm transition-all duration-200"
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                )}

                {inputMethod === "text" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      📝 Text Content
                    </label>
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      rows={12}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 backdrop-blur-sm transition-all duration-200 resize-none"
                      placeholder="Paste your lecture notes, article content, or any text you want to analyze..."
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-400">
                        {textContent.length} characters
                      </span>
                      <span className="text-sm text-gray-400">
                        Recommended: 500+ characters for better analysis
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-center">
                  <button
                    type="submit"
                    disabled={processing || !title || !subject}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-12 py-4 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {processing ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                        Processing with AI...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <span className="mr-2">🚀</span>
                        Generate AI Notes
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "pdf" && (
            <div className="bg-gray-800/30 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4 flex items-center justify-center gap-3">
                  <span className="text-4xl">📄</span>
                  Process PDF Documents
                </h2>
                <p className="text-gray-300 text-lg">
                  Upload PDF files to extract content and generate comprehensive
                  AI notes
                </p>
              </div>

              <form onSubmit={handlePdfSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      📝 Title *
                    </label>
                    <input
                      type="text"
                      value={pdfTitle}
                      onChange={(e) => setPdfTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 backdrop-blur-sm transition-all duration-200"
                      placeholder="Enter document title..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      📚 Subject *
                    </label>
                    <input
                      type="text"
                      value={pdfSubject}
                      onChange={(e) => setPdfSubject(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 backdrop-blur-sm transition-all duration-200"
                      placeholder="e.g., Research Paper, Textbook, Manual..."
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    📁 PDF Document
                  </label>
                  <div className="border-2 border-dashed border-gray-600/50 rounded-xl p-8 text-center bg-gray-700/20 hover:border-purple-400/50 transition-colors duration-200">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label htmlFor="pdf-upload" className="cursor-pointer">
                      <div className="text-6xl mb-4 opacity-50">📄</div>
                      <p className="text-gray-300 text-lg mb-2">
                        {pdfFile ? pdfFile.name : "Click to upload PDF file"}
                      </p>
                      <p className="text-gray-400 text-sm">
                        Supports PDF documents up to 50MB
                      </p>
                    </label>
                  </div>
                  {pdfFile && (
                    <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-green-400">✓</span>
                        <div>
                          <p className="text-green-300 font-medium">
                            {pdfFile.name}
                          </p>
                          <p className="text-green-400/80 text-sm">
                            {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="generate-study-guide"
                      checked={generateStudyGuide}
                      onChange={(e) => setGenerateStudyGuide(e.target.checked)}
                      className="w-5 h-5 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <label
                      htmlFor="generate-study-guide"
                      className="text-gray-300 font-medium"
                    >
                      📚 Generate downloadable study guide
                    </label>
                  </div>
                  <p className="text-gray-400 text-sm ml-8">
                    Creates a formatted PDF study guide with summaries, key
                    points, and practice questions
                  </p>
                </div>

                <div className="flex justify-center">
                  <button
                    type="submit"
                    disabled={
                      pdfProcessing || !pdfTitle || !pdfSubject || !pdfFile
                    }
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-12 py-4 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {pdfProcessing ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                        Processing PDF...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <span className="mr-2">🚀</span>
                        Process PDF with AI
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
