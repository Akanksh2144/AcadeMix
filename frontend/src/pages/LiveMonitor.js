import React, { useState } from 'react';
import { ArrowLeft, Users, CheckCircle, Clock, Warning, Eye, Camera } from '@phosphor-icons/react';

const LiveMonitor = ({ quiz, navigate }) => {
  const [activeTab, setActiveTab] = useState('active');

  const students = [
    { id: 1, name: 'Rajesh Kumar', rollNo: 'S2024001', status: 'active', progress: 12, totalQuestions: 20, violations: 0, timeElapsed: 25, startTime: '10:05 AM' },
    { id: 2, name: 'Priya Sharma', rollNo: 'S2024101', status: 'active', progress: 15, totalQuestions: 20, violations: 1, timeElapsed: 28, startTime: '10:02 AM' },
    { id: 3, name: 'Amit Patel', rollNo: 'S2024045', status: 'active', progress: 10, totalQuestions: 20, violations: 3, timeElapsed: 22, startTime: '10:08 AM' },
    { id: 4, name: 'Sneha Reddy', rollNo: 'S2024089', status: 'submitted', progress: 20, totalQuestions: 20, violations: 0, timeElapsed: 35, submitTime: '10:35 AM' },
    { id: 5, name: 'Rahul Kumar', rollNo: 'S2024034', status: 'submitted', progress: 20, totalQuestions: 20, violations: 1, timeElapsed: 38, submitTime: '10:38 AM' },
  ];

  const activeStudents = students.filter(s => s.status === 'active');
  const submittedStudents = students.filter(s => s.status === 'submitted');
  const violationStudents = students.filter(s => s.violations > 2);

  const displayStudents = activeTab === 'active' ? activeStudents : activeTab === 'submitted' ? submittedStudents : violationStudents;

  return (
    <div className="min-h-screen bg-[#FDFCF8]">
      {/* Header */}
      <header className="bg-[#FDFCF8] border-b-2 border-[#0A0A0A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                data-testid="back-button"
                onClick={() => navigate('teacher-dashboard')}
                className="neo-button p-2 bg-white"
              >
                <ArrowLeft size={24} weight="bold" />
              </button>
              <div>
                <h1 className="text-3xl font-black tracking-tighter">Live Quiz Monitor</h1>
                <p className="text-sm font-medium text-[#0A0A0A]/60">{quiz?.title || 'Data Structures - Arrays & Linked Lists'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="neo-card px-4 py-2 bg-[#A1E3D8]" data-testid="quiz-status">
                <span className="font-bold text-sm">ACTIVE</span>
              </div>
              <div className="neo-card px-4 py-2" data-testid="time-remaining">
                <Clock size={20} weight="bold" className="inline mr-2" />
                <span className="font-bold">35:00</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="neo-card p-6" data-testid="total-students-stat">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60">Total Students</span>
              <Users size={20} weight="bold" className="text-[#B4D8E7]" />
            </div>
            <p className="text-3xl font-black">{students.length}</p>
          </div>
          <div className="neo-card p-6" data-testid="active-now-stat">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60">Active Now</span>
              <Eye size={20} weight="bold" className="text-[#A1E3D8]" />
            </div>
            <p className="text-3xl font-black">{activeStudents.length}</p>
          </div>
          <div className="neo-card p-6" data-testid="submitted-stat">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60">Submitted</span>
              <CheckCircle size={20} weight="bold" className="text-[#FF9EC6]" />
            </div>
            <p className="text-3xl font-black">{submittedStudents.length}</p>
          </div>
          <div className="neo-card p-6" data-testid="violations-stat">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs tracking-[0.2em] uppercase font-bold text-[#0A0A0A]/60">Violations</span>
              <Warning size={20} weight="bold" className="text-[#FF6B6B]" />
            </div>
            <p className="text-3xl font-black">{violationStudents.length}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            data-testid="active-tab"
            onClick={() => setActiveTab('active')}
            className={`px-6 py-3 border-2 border-[#0A0A0A] font-bold transition-all ${
              activeTab === 'active'
                ? 'bg-[#A1E3D8] shadow-[4px_4px_0px_0px_#0A0A0A]'
                : 'bg-white hover:bg-[#F0EFEB]'
            }`}
          >
            Active ({activeStudents.length})
          </button>
          <button
            data-testid="submitted-tab"
            onClick={() => setActiveTab('submitted')}
            className={`px-6 py-3 border-2 border-[#0A0A0A] font-bold transition-all ${
              activeTab === 'submitted'
                ? 'bg-[#A1E3D8] shadow-[4px_4px_0px_0px_#0A0A0A]'
                : 'bg-white hover:bg-[#F0EFEB]'
            }`}
          >
            Submitted ({submittedStudents.length})
          </button>
          <button
            data-testid="violations-tab"
            onClick={() => setActiveTab('violations')}
            className={`px-6 py-3 border-2 border-[#0A0A0A] font-bold transition-all ${
              activeTab === 'violations'
                ? 'bg-[#FF6B6B] text-white shadow-[4px_4px_0px_0px_#0A0A0A]'
                : 'bg-white hover:bg-[#F0EFEB]'
            }`}
          >
            Violations ({violationStudents.length})
          </button>
        </div>

        {/* Students List */}
        <div className="neo-card p-6">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="students-monitor-table">
              <thead>
                <tr className="border-b-2 border-[#0A0A0A] bg-[#F0EFEB]">
                  <th className="text-left p-4 text-xs tracking-[0.2em] uppercase font-bold">Student</th>
                  <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Progress</th>
                  <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Time</th>
                  <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Violations</th>
                  <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Status</th>
                  <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayStudents.map((student) => (
                  <tr key={student.id} className="border-b border-[#0A0A0A]/20" data-testid={`student-row-${student.id}`}>
                    <td className="p-4">
                      <div>
                        <p className="font-bold">{student.name}</p>
                        <p className="text-sm font-medium text-[#0A0A0A]/60">{student.rollNo}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <span className="font-bold">{student.progress}/{student.totalQuestions}</span>
                        </div>
                        <div className="h-2 bg-[#F0EFEB] border-2 border-[#0A0A0A] max-w-32 mx-auto">
                          <div 
                            className="h-full bg-[#A1E3D8] border-r-2 border-[#0A0A0A]"
                            style={{ width: `${(student.progress / student.totalQuestions) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center p-4">
                      <div className="flex items-center justify-center gap-1">
                        <Clock size={16} weight="bold" />
                        <span className="font-bold">{student.timeElapsed}m</span>
                      </div>
                      <p className="text-xs font-medium text-[#0A0A0A]/60 mt-1">
                        {student.status === 'active' ? `Started ${student.startTime}` : `Done ${student.submitTime}`}
                      </p>
                    </td>
                    <td className="text-center p-4">
                      {student.violations > 0 ? (
                        <span className={`neo-badge ${
                          student.violations > 2 ? 'bg-[#FF6B6B] text-white' : 'bg-[#FDF5A9]'
                        }`}>
                          {student.violations}
                        </span>
                      ) : (
                        <span className="text-[#A1E3D8] font-bold">✓</span>
                      )}
                    </td>
                    <td className="text-center p-4">
                      <span className={`neo-badge ${
                        student.status === 'active' ? 'bg-[#A1E3D8]' : 'bg-[#F0EFEB]'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="text-center p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          data-testid={`view-activity-${student.id}`}
                          className="neo-button px-3 py-1 bg-white text-sm"
                        >
                          View Activity
                        </button>
                        {student.violations > 0 && (
                          <button
                            data-testid={`view-snapshots-${student.id}`}
                            className="neo-button p-2 bg-[#FF9EC6]"
                            title="View Snapshots"
                          >
                            <Camera size={16} weight="bold" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <button
            data-testid="extend-time-button"
            className="neo-button p-6 bg-white text-left flex items-center gap-4"
          >
            <Clock size={32} weight="bold" />
            <div>
              <p className="font-black text-lg">Extend Time</p>
              <p className="text-xs font-medium opacity-70">Add 10 mins for all</p>
            </div>
          </button>
          <button
            data-testid="end-quiz-button"
            className="neo-button p-6 bg-[#FF6B6B] text-white text-left flex items-center gap-4"
          >
            <Warning size={32} weight="bold" />
            <div>
              <p className="font-black text-lg">End Quiz Now</p>
              <p className="text-xs font-medium opacity-70">Force submit all</p>
            </div>
          </button>
          <button
            data-testid="export-activity-button"
            className="neo-button p-6 bg-[#B4D8E7] text-left flex items-center gap-4"
          >
            <Eye size={32} weight="bold" />
            <div>
              <p className="font-black text-lg">Export Log</p>
              <p className="text-xs font-medium opacity-70">Download activity</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitor;