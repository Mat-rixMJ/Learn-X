// Class management types
export interface Class {
  id: string;
  teacher_id: string;
  title: string;
  description: string;
  start_date: Date;
  end_date: Date;
  schedule_days: number[];
  start_time: string;
  end_time: string;
  max_students: number;
  current_students: number;
  enrollment_status: 'open' | 'closed' | 'archived';
  created_at: Date;
  updated_at: Date;
}

export interface ClassEnrollment {
  id: string;
  class_id: string;
  student_id: string;
  status: 'active' | 'completed' | 'dropped';
  enrolled_at: Date;
  completed_at?: Date;
}

export interface ClassSession {
  id: string;
  class_id: string;
  session_type: 'regular' | 'extra' | 'makeup' | 'cancelled';
  start_time: Date;
  end_time: Date;
  topic?: string;
  created_at: Date;
}

export interface ClassAttendance {
  id: string;
  class_id: string;
  session_id: string;
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  marked_by: string;
  marked_at: Date;
  notes?: string;
}

export interface ClassResource {
  id: string;
  class_id: string;
  title: string;
  description?: string;
  type: 'document' | 'video' | 'audio' | 'link' | 'other';
  file_path?: string;
  uploaded_by: string;
  uploaded_at: Date;
  status: 'active' | 'archived' | 'deleted';
}

// API response types
export interface EnrolledClassesResponse {
  success: boolean;
  data?: {
    id: string;
    title: string;
    teacher_name: string;
    enrolled_at: Date;
    enrollment_status: string;
    attendance_count: number;
    total_sessions: number;
  }[];
  message?: string;
}

export interface UpcomingClassesResponse {
  success: boolean;
  data?: {
    id: string;
    title: string;
    teacher_name: string;
    start_time: Date;
    end_time: Date;
    session_type: string;
    enrollment_status?: string;
  }[];
  message?: string;
}

export interface ClassResourcesResponse {
  success: boolean;
  data?: (ClassResource & {
    uploaded_by_name: string;
  })[];
  message?: string;
}