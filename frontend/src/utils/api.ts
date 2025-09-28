import { authenticatedFetch } from './auth';

// API Base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  full_name?: string;
  profile_completed?: boolean;
}

export interface Class {
  id: string;
  title: string;
  description?: string;
  instructor_name: string;
  scheduled_at?: string;
  duration_minutes?: number;
  class_code?: string;
  max_students?: number;
}

export interface Lecture {
  id: string;
  class_id: string;
  title: string;
  description?: string;
  video_url?: string;
  duration_seconds?: number;
  recorded_at?: string;
}

export interface DashboardStats {
  totalClasses: number;
  totalLectures: number;
  totalNotes: number;
  avgScore: number;
}

export interface DashboardData {
  user: User;
  stats: DashboardStats;
  enrolledClasses: Class[];
  notifications: any[];
  recentActivities: any[];
}

// Legacy API helpers (kept for backward compatibility)
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    return response;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
};

export const apiGet = (endpoint: string, token?: string) => {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return apiRequest(endpoint, {
    method: 'GET',
    headers,
  });
};

export const apiPost = (endpoint: string, data: any, token?: string) => {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return apiRequest(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
};

// Modern API Service Class
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  // Helper method for making authenticated requests
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await authenticatedFetch(`${this.baseUrl}${endpoint}`, options);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Authentication APIs
  async login(username: string, password: string): Promise<ApiResponse<{ token: string; user: User }>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: 'Login failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async register(userData: { username: string; email: string; password: string; role: string }): Promise<ApiResponse<{ token: string; user: User }>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: 'Registration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // User APIs
  async getDashboard(): Promise<ApiResponse<DashboardData>> {
    return this.request<DashboardData>('/api/user/dashboard');
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<User>('/api/user/profile');
  }

  async updateProfile(profileData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
  }

  // Classes APIs
  async getClasses(): Promise<ApiResponse<Class[]>> {
    return this.request<Class[]>('/api/classes');
  }

  async getClassById(id: string): Promise<ApiResponse<Class>> {
    return this.request<Class>(`/api/classes/${id}`);
  }

  async createClass(classData: Partial<Class>): Promise<ApiResponse<Class>> {
    return this.request<Class>('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classData)
    });
  }

  async joinClass(classId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/classes/${classId}/join`, {
      method: 'POST'
    });
  }

  // Lectures APIs
  async getLectures(): Promise<ApiResponse<Lecture[]>> {
    return this.request<Lecture[]>('/api/lectures');
  }

  async getLectureById(id: string): Promise<ApiResponse<Lecture>> {
    return this.request<Lecture>(`/api/lectures/${id}`);
  }

  async getLecturesByClass(classId: string): Promise<ApiResponse<Lecture[]>> {
    return this.request<Lecture[]>(`/api/lectures/class/${classId}`);
  }

  async createLecture(lectureData: Partial<Lecture>): Promise<ApiResponse<Lecture>> {
    return this.request<Lecture>('/api/lectures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lectureData)
    });
  }

  // Live Sessions APIs
  async getActiveLiveSessions(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/api/live/active');
  }

  async startLiveSession(sessionData: any): Promise<ApiResponse<any>> {
    return this.request('/api/live/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData)
    });
  }

  async joinLiveSession(sessionId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/live/join/${sessionId}`, {
      method: 'POST'
    });
  }

  async endLiveSession(sessionId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/live/end/${sessionId}`, {
      method: 'POST'
    });
  }

  // AI Notes APIs
  async getAiNotes(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/api/ai-notes');
  }

  async getAiNoteById(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/ai-notes/${id}`);
  }

  async getAiNotesByUser(userId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/api/ai-notes/user/${userId}`);
  }

  async createAiNote(noteData: any): Promise<ApiResponse<any>> {
    return this.request('/api/ai-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData)
    });
  }

  // Profile Completion APIs
  async completeStudentProfile(profileData: any): Promise<ApiResponse<any>> {
    return this.request('/api/profiles/complete-student', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
  }

  async completeTeacherProfile(profileData: any): Promise<ApiResponse<any>> {
    return this.request('/api/profiles/complete-teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
  }

  async checkProfileCompletion(): Promise<ApiResponse<any>> {
    return this.request('/api/profiles/check-completion');
  }

  // Teacher Stats APIs
  async getTeacherStats(): Promise<ApiResponse<any>> {
    return this.request('/api/teacher/stats');
  }

  async getTeacherClasses(): Promise<ApiResponse<Class[]>> {
    return this.request<Class[]>('/api/teacher/classes');
  }

  // Scheduled Classes APIs  
  async getScheduledClasses(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/api/scheduled');
  }

  async getUpcomingClasses(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/api/scheduled/upcoming');
  }

  async createScheduledClass(classData: any): Promise<ApiResponse<any>> {
    return this.request('/api/scheduled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classData)
    });
  }

  // Translation APIs
  async translateText(text: string, targetLanguage: string): Promise<ApiResponse<any>> {
    return this.request('/api/translate/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLanguage })
    });
  }

  async translateCaptions(captions: string, targetLanguage: string): Promise<ApiResponse<any>> {
    return this.request('/api/translate/captions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ captions, targetLanguage })
    });
  }

  // Assignment APIs
  async getAssignments(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/api/assignments');
  }

  async createAssignment(assignmentData: any): Promise<ApiResponse<any>> {
    return this.request('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assignmentData)
    });
  }

  async submitAssignment(assignmentId: string, submissionData: any): Promise<ApiResponse<any>> {
    return this.request(`/api/assignments/${assignmentId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submissionData)
    });
  }

  // Analytics APIs
  async getAnalyticsOverview(): Promise<ApiResponse<any>> {
    return this.request('/api/analytics/overview');
  }

  async getEngagementAnalytics(): Promise<ApiResponse<any>> {
    return this.request('/api/analytics/engagement');
  }

  // Content APIs
  async getContent(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/api/content');
  }

  async uploadContent(formData: FormData): Promise<ApiResponse<any>> {
    try {
      const response = await authenticatedFetch(`${this.baseUrl}/api/content/upload`, {
        method: 'POST',
        body: formData // Don't set Content-Type for FormData
      });
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: 'Upload failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Student Dashboard APIs
  async getStudentDashboard(): Promise<ApiResponse<any>> {
    return this.request('/api/student/dashboard');
  }

  async getStudentCalendar(month?: number, year?: number): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    
    const queryString = params.toString();
    const endpoint = queryString ? `/api/student/calendar?${queryString}` : '/api/student/calendar';
    
    return this.request<any[]>(endpoint);
  }

  async getStudentProgress(classId?: string): Promise<ApiResponse<any>> {
    const endpoint = classId ? `/api/student/progress/${classId}` : '/api/student/progress';
    return this.request(endpoint);
  }

  async updateStudentProfile(profileData: any): Promise<ApiResponse<any>> {
    return this.request('/api/student/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
  }

  async markStudentAttendance(attendanceData: { classId: string; status?: string }): Promise<ApiResponse<any>> {
    return this.request('/api/student/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendanceData)
    });
  }

  async getStudentAnalytics(period?: string): Promise<ApiResponse<any>> {
    const params = period ? `?period=${period}` : '';
    return this.request(`/api/student/analytics${params}`);
  }

  async submitStudentAssignment(assignmentId: string, submissionData: { submissionText?: string; filePath?: string }): Promise<ApiResponse<any>> {
    return this.request(`/api/student/assignments/${assignmentId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submissionData)
    });
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;