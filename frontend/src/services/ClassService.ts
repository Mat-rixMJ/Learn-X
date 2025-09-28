import axios from 'axios';
import { ClassResource, EnrolledClassesResponse, UpcomingClassesResponse } from '@/types/class';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ClassService {
  // Get enrolled classes for current user
  static async getEnrolledClasses(): Promise<EnrolledClassesResponse> {
    try {
      const response = await axios.get(`${API_URL}/api/classes/enrolled`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching enrolled classes:', error);
      throw error;
    }
  }

  // Join a class
  static async joinClass(classId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.post(
        `${API_URL}/api/classes/join/${classId}`,
        {},
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error('Error joining class:', error);
      throw error;
    }
  }

  // Get upcoming classes calendar
  static async getUpcomingClasses(): Promise<UpcomingClassesResponse> {
    try {
      const response = await axios.get(`${API_URL}/api/classes/upcoming`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching upcoming classes:', error);
      throw error;
    }
  }

  // Mark attendance for a class session
  static async markAttendance(
    classId: string,
    sessionId: string,
    studentIds: string[],
    status: 'present' | 'absent' | 'late' | 'excused'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.post(
        `${API_URL}/api/classes/${classId}/attendance`,
        {
          sessionId,
          studentIds,
          status
        },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error('Error marking attendance:', error);
      throw error;
    }
  }

  // Share a resource with class
  static async shareResource(
    classId: string,
    data: FormData
  ): Promise<{ success: boolean; data?: ClassResource; message?: string }> {
    try {
      const response = await axios.post(
        `${API_URL}/api/classes/${classId}/resources`,
        data,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error sharing resource:', error);
      throw error;
    }
  }

  // Get class resources
  static async getResources(
    classId: string
  ): Promise<{ success: boolean; data?: ClassResource[]; message?: string }> {
    try {
      const response = await axios.get(`${API_URL}/api/classes/${classId}/resources`, {
        withCredentials: true
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching class resources:', error);
      throw error;
    }
  }
}