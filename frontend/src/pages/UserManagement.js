import React, { useState } from 'react';
import { ArrowLeft, Plus, Upload, MagnifyingGlass, Pencil, Trash, Download } from '@phosphor-icons/react';

const UserManagement = ({ navigate }) => {
  const [activeTab, setActiveTab] = useState('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const students = [
    { id: 1, name: 'Rajesh Kumar', rollNo: 'S2024001', email: 'rajesh@college.edu', department: 'CSE', batch: '2024', cgpa: 8.5, status: 'Active' },
    { id: 2, name: 'Priya Sharma', rollNo: 'S2024101', email: 'priya@college.edu', department: 'CSE', batch: '2024', cgpa: 9.2, status: 'Active' },
    { id: 3, name: 'Amit Patel', rollNo: 'S2024045', email: 'amit@college.edu', department: 'ECE', batch: '2024', cgpa: 8.8, status: 'Active' },
  ];

  const teachers = [
    { id: 1, name: 'Dr. Sarah Johnson', empId: 'T001', email: 'sarah.j@college.edu', department: 'CSE', subjects: 'DBMS, OS', status: 'Active' },
    { id: 2, name: 'Prof. Ravi Kumar', empId: 'T002', email: 'ravi.k@college.edu', department: 'CSE', subjects: 'DSA, Algorithms', status: 'Active' },
  ];

  const displayData = activeTab === 'students' ? students : teachers;

  return (
    <div className="min-h-screen bg-[#FDFCF8]">
      {/* Header */}
      <header className="bg-[#FDFCF8] border-b-2 border-[#0A0A0A] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                data-testid="back-button"
                onClick={() => navigate('admin-dashboard')}
                className="neo-button p-2 bg-white"
              >
                <ArrowLeft size={24} weight="bold" />
              </button>
              <div>
                <h1 className="text-3xl font-black tracking-tighter">User Management</h1>
                <p className="text-sm font-medium text-[#0A0A0A]/60">Manage students and faculty</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Action Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div className="flex gap-3">
            <button
              data-testid="add-single-user-button"
              onClick={() => setShowAddModal(true)}
              className="neo-button px-4 py-3 bg-[#FF9EC6] flex items-center gap-2"
            >
              <Plus size={20} weight="bold" />
              Add User
            </button>
            <button
              data-testid="bulk-upload-button"
              className="neo-button px-4 py-3 bg-[#A1E3D8] flex items-center gap-2"
            >
              <Upload size={20} weight="bold" />
              Bulk Upload CSV
            </button>
            <button
              data-testid="export-users-button"
              className="neo-button px-4 py-3 bg-white flex items-center gap-2"
            >
              <Download size={20} weight="bold" />
              Export
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            data-testid="students-tab"
            onClick={() => setActiveTab('students')}
            className={`px-6 py-3 border-2 border-[#0A0A0A] font-bold transition-all ${
              activeTab === 'students'
                ? 'bg-[#FF9EC6] shadow-[4px_4px_0px_0px_#0A0A0A]'
                : 'bg-white hover:bg-[#F0EFEB]'
            }`}
          >
            Students ({students.length})
          </button>
          <button
            data-testid="teachers-tab"
            onClick={() => setActiveTab('teachers')}
            className={`px-6 py-3 border-2 border-[#0A0A0A] font-bold transition-all ${
              activeTab === 'teachers'
                ? 'bg-[#FF9EC6] shadow-[4px_4px_0px_0px_#0A0A0A]'
                : 'bg-white hover:bg-[#F0EFEB]'
            }`}
          >
            Teachers ({teachers.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="neo-card p-6 mb-6">
          <div className="relative">
            <MagnifyingGlass 
              size={20} 
              weight="bold" 
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0A0A0A]/40"
            />
            <input
              data-testid="search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="neo-input w-full pl-12 pr-4 py-3 font-medium"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="neo-card p-6">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="users-table">
              <thead>
                <tr className="border-b-2 border-[#0A0A0A] bg-[#F0EFEB]">
                  {activeTab === 'students' ? (
                    <>
                      <th className="text-left p-4 text-xs tracking-[0.2em] uppercase font-bold">Student</th>
                      <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Roll No</th>
                      <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Department</th>
                      <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Batch</th>
                      <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">CGPA</th>
                      <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Status</th>
                      <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Actions</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left p-4 text-xs tracking-[0.2em] uppercase font-bold">Teacher</th>
                      <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Emp ID</th>
                      <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Department</th>
                      <th className="text-left p-4 text-xs tracking-[0.2em] uppercase font-bold">Subjects</th>
                      <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Status</th>
                      <th className="text-center p-4 text-xs tracking-[0.2em] uppercase font-bold">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {displayData.map((user, index) => (
                  <tr key={user.id} className="border-b border-[#0A0A0A]/20" data-testid={`user-row-${index}`}>
                    {activeTab === 'students' ? (
                      <>
                        <td className="p-4">
                          <div>
                            <p className="font-bold">{user.name}</p>
                            <p className="text-sm font-medium text-[#0A0A0A]/60">{user.email}</p>
                          </div>
                        </td>
                        <td className="text-center p-4">
                          <p className="font-bold">{user.rollNo}</p>
                        </td>
                        <td className="text-center p-4">
                          <span className="neo-badge bg-[#B4D8E7]">{user.department}</span>
                        </td>
                        <td className="text-center p-4">
                          <p className="font-bold">{user.batch}</p>
                        </td>
                        <td className="text-center p-4">
                          <p className="font-bold text-lg">{user.cgpa}</p>
                        </td>
                        <td className="text-center p-4">
                          <span className="neo-badge bg-[#A1E3D8]">{user.status}</span>
                        </td>
                        <td className="text-center p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              data-testid={`edit-user-${index}`}
                              className="neo-button p-2 bg-white"
                              title="Edit"
                            >
                              <Pencil size={16} weight="bold" />
                            </button>
                            <button
                              data-testid={`delete-user-${index}`}
                              className="neo-button p-2 bg-[#FF6B6B] text-white"
                              title="Delete"
                            >
                              <Trash size={16} weight="bold" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4">
                          <div>
                            <p className="font-bold">{user.name}</p>
                            <p className="text-sm font-medium text-[#0A0A0A]/60">{user.email}</p>
                          </div>
                        </td>
                        <td className="text-center p-4">
                          <p className="font-bold">{user.empId}</p>
                        </td>
                        <td className="text-center p-4">
                          <span className="neo-badge bg-[#B4D8E7]">{user.department}</span>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-sm">{user.subjects}</p>
                        </td>
                        <td className="text-center p-4">
                          <span className="neo-badge bg-[#A1E3D8]">{user.status}</span>
                        </td>
                        <td className="text-center p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              data-testid={`edit-teacher-${index}`}
                              className="neo-button p-2 bg-white"
                              title="Edit"
                            >
                              <Pencil size={16} weight="bold" />
                            </button>
                            <button
                              data-testid={`delete-teacher-${index}`}
                              className="neo-button p-2 bg-[#FF6B6B] text-white"
                              title="Delete"
                            >
                              <Trash size={16} weight="bold" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add User Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-[#0A0A0A]/50 flex items-center justify-center z-50" data-testid="add-user-modal">
            <div className="neo-card p-8 max-w-2xl w-full mx-4">
              <h3 className="text-2xl font-bold mb-6">Add New {activeTab === 'students' ? 'Student' : 'Teacher'}</h3>
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs tracking-[0.2em] uppercase font-bold mb-2">Full Name</label>
                    <input
                      data-testid="name-input"
                      type="text"
                      className="neo-input w-full px-4 py-3 font-medium"
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs tracking-[0.2em] uppercase font-bold mb-2">
                      {activeTab === 'students' ? 'Roll Number' : 'Employee ID'}
                    </label>
                    <input
                      data-testid="id-input"
                      type="text"
                      className="neo-input w-full px-4 py-3 font-medium"
                      placeholder={activeTab === 'students' ? 'S2024XXX' : 'TXXX'}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs tracking-[0.2em] uppercase font-bold mb-2">Email</label>
                  <input
                    data-testid="email-input"
                    type="email"
                    className="neo-input w-full px-4 py-3 font-medium"
                    placeholder="email@college.edu"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs tracking-[0.2em] uppercase font-bold mb-2">Department</label>
                    <select className="neo-input w-full px-4 py-3 font-medium" data-testid="department-select">
                      <option>CSE</option>
                      <option>ECE</option>
                      <option>MECH</option>
                      <option>CIVIL</option>
                    </select>
                  </div>
                  {activeTab === 'students' && (
                    <div>
                      <label className="block text-xs tracking-[0.2em] uppercase font-bold mb-2">Batch</label>
                      <input
                        data-testid="batch-input"
                        type="text"
                        className="neo-input w-full px-4 py-3 font-medium"
                        placeholder="2024"
                      />
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    data-testid="cancel-add-user"
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="neo-button px-6 py-3 bg-white flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    data-testid="submit-add-user"
                    type="submit"
                    className="neo-button px-6 py-3 bg-[#FF9EC6] flex-1"
                  >
                    Add {activeTab === 'students' ? 'Student' : 'Teacher'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;