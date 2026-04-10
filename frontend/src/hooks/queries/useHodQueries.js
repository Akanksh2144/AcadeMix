import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

/**
 * Custom React Query hooks strictly for the HOD Domain.
 */

// ── KEYS ────────────────────────────────────────────────────────────────
export const hodKeys = {
  all: ['hod'],
  dashboard: () => [...hodKeys.all, 'dashboard'],
  atRisk: (threshold) => [...hodKeys.all, 'atRisk', threshold],
  defaulters: (dept, threshold) => [...hodKeys.all, 'defaulters', dept, threshold],
  teachers: () => [...hodKeys.all, 'teachers'],
  leaves: () => [...hodKeys.all, 'leaves'], // Pending leaves
  mentors: () => [...hodKeys.all, 'mentors'],
  classInCharges: () => [...hodKeys.all, 'classInCharges']
};

// ── QUERIES ──────────────────────────────────────────────────────────────

export function useHodDashboard() {
  return useQuery({
    queryKey: hodKeys.dashboard(),
    queryFn: async () => {
      const { data } = await api.get('/api/dashboard/hod');
      return data;
    },
    // Background poll every minute to keep overview stats fresh
    refetchInterval: 60000, 
  });
}

export function useHodAtRiskStudents(threshold = 5.0) {
  return useQuery({
    queryKey: hodKeys.atRisk(threshold),
    queryFn: async () => {
      const { data } = await api.get('/api/hod/at-risk-students', { params: { threshold } });
      return data;
    },
  });
}

export function useHodAttendanceDefaulters(departmentId, threshold = 75) {
  return useQuery({
    queryKey: hodKeys.defaulters(departmentId, threshold),
    queryFn: async () => {
      const { data } = await api.get('/api/hod/attendance/defaulters', { params: { department_id: departmentId, threshold } });
      return data.defaulters || [];
    },
    enabled: !!departmentId, // Only run if departmentId is known
  });
}

export function useHodTeachers() {
  return useQuery({
    queryKey: hodKeys.teachers(),
    queryFn: async () => {
      const { data } = await api.get('/api/faculty/teachers');
      return data;
    },
    staleTime: 5 * 60 * 1000, // Rarely changes
  });
}

export function useHodPendingLeaves() {
  return useQuery({
    queryKey: hodKeys.leaves(),
    queryFn: async () => {
      // Re-using the principal pending leaves logic or specific HOD pending leaves endpoint. 
      // Based on legacy hod leave review api:
      const { data } = await api.get('/api/principal/leave/pending'); // usually shared endpoint or specific to approver
      return data;
    },
    refetchInterval: 30000, // Poll every 30 seconds for live leave workflows
  });
}

export function useHodAssignments() {
  return useQuery({
    queryKey: hodKeys.classInCharges(),
    queryFn: async () => {
      const [cicReq, mentorsReq] = await Promise.all([
        api.get('/api/hod/assignments/class-in-charge'),
        api.get('/api/hod/assignments/mentors')
      ]);
      return {
        classInCharges: cicReq.data,
        mentors: mentorsReq.data 
      };
    }
  });
}

// ── MUTATIONS ────────────────────────────────────────────────────────────

export function useHodReviewLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leaveId, reviewData }) => {
      const { data } = await api.put(`/api/hod/leave/${leaveId}/review`, reviewData);
      return data;
    },
    onSuccess: () => {
      // Force instant refresh of the pending leaves list
      queryClient.invalidateQueries({ queryKey: hodKeys.leaves() });
      // Update dashboard stats too
      queryClient.invalidateQueries({ queryKey: hodKeys.dashboard() });
    },
  });
}

export function useCreateClassInCharge() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assignmentData) => {
      const { data } = await api.post('/api/hod/assignments/class-in-charge', assignmentData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hodKeys.classInCharges() });
    }
  });
}
