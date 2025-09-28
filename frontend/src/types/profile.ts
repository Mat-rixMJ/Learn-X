export interface Subject {
  id: number;
  name: string;
  class_level: number;
  is_core: boolean;
}

export interface BaseFormData {
  phone: string;
  address: string;
  date_of_birth: string;
  gender: string;
  emergency_contact: string;
  emergency_phone: string;
}

export interface StudentFormData extends BaseFormData {
  student_class: string;
  roll_number: string;
  parent_name: string;
  parent_phone: string;
  previous_school: string;
  subjects: string[];
}

export interface TeacherFormData extends BaseFormData {
  teaching_classes: string[];
  teaching_subjects: string[];
  qualification: string;
  experience_years: string;
  specialization: string;
}

export type ProfileFormData = StudentFormData & TeacherFormData;

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: 'student' | 'teacher' | 'admin';
  profile_completed: boolean;
}