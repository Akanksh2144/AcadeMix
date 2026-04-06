import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import api, { hodPhase2API, facultyAPI, studentsAPI } from '../../services/api';
import AssignmentCardGrid from './AssignmentCardGrid';

const HODMentorTab = ({ departmentId }) => {
  const [students, setStudents] = useState([]);
  const [assignedItems, setAssignedItems] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);

  // Group size per mentor logic
  const targetPerFaculty = 1; // Actually, for students, a student needs 1 mentor. 
  // Wait, the items in the grid for Mentor mapping is Students! So the target is 1 Mentor per Student.
  // The completion strip measures count (1) vs target (1)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all students (or fetch by department to save payload sz)
      const [studRes, facRes, assignRes] = await Promise.all([
        studentsAPI.search('', departmentId), 
        facultyAPI.teachers(),
        hodPhase2API.getMentors()
      ]);
      
      const formattedStudents = studRes.data.map(s => ({
        ...s,
        title: s.name,
        subtitle: `Roll No: ${s.roll_no || s.id} | Batch: ${s.profile_data?.batch || 'N/A'}`
      }));

      setStudents(formattedStudents);
      setFaculty(facRes.data);
      setAssignedItems(assignRes.data);
    } catch (err) {
      toast.error('Failed to load mentor assignments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssign = async (studentItem, facultyId) => {
    try {
      await hodPhase2API.createMentors({
        faculty_id: facultyId,
        student_ids: [studentItem.id]
      });
      toast.success('Assigned mentor successfully');
      fetchData();
    } catch (err) {
      toast.error('Failed to assign mentor');
    }
  };

  const handleRemove = async (assignmentId) => {
    try {
      await hodPhase2API.deactivateMentor(assignmentId);
      toast.success('Mentor session deactivated');
      fetchData();
    } catch (err) {
      toast.error('Failed to deactivate mentor');
    }
  };

  const completionFn = (item, assignments) => {
    const count = assignments.length;
    const target = 1; 
    return {
      count,
      target,
      statusColor: count >= target ? "bg-green-500" : "bg-red-400"
    };
  };

  if (loading) {
     return <div className="p-8 text-center text-gray-500 dark:text-gray-400 animate-pulse">Loading students and mentors...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mentor Allocation</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Assign one faculty mentor to each student. (Showing students in your department scope)
          </p>
        </div>
      </div>

      <AssignmentCardGrid
        items={students}
        assignedItems={assignedItems}
        facultyList={faculty}
        onAssign={handleAssign}
        onRemove={handleRemove}
        pickerType="single"
        completionFn={completionFn}
        titleKey="title"
        subtitleKey="subtitle"
        itemMatchKey="student_id"
      />
    </div>
  );
};

export default HODMentorTab;
