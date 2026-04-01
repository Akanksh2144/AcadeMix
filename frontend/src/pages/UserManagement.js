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
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button data-testid="back-button" onClick={() => navigate('admin-dashboard')} className="p-2.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-500 transition-colors" aria-label="Go back">
              <ArrowLeft size={22} weight="duotone" />
            </button>
            <div><h1 className="text-2xl font-extrabold tracking-tight text-slate-900">User Management</h1><p className="text-sm font-medium text-slate-400">Manage students and faculty</p></div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div className="flex gap-3">
            <button data-testid="add-single-user-button" onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2 text-sm"><Plus size={18} weight="bold" /> Add User</button>
            <button data-testid="bulk-upload-button" className="btn-secondary flex items-center gap-2 text-sm"><Upload size={18} weight="duotone" /> Bulk Upload CSV</button>
            <button data-testid="export-users-button" className="btn-ghost flex items-center gap-2 text-sm"><Download size={18} weight="duotone" /> Export</button>
          </div>
        </div>

        <div className="bg-slate-100 rounded-full p-1 inline-flex gap-1 mb-6">
          <button data-testid="students-tab" onClick={() => setActiveTab('students')} className={`pill-tab ${activeTab === 'students' ? 'pill-tab-active' : 'pill-tab-inactive'}`}>Students ({students.length})</button>
          <button data-testid="teachers-tab" onClick={() => setActiveTab('teachers')} className={`pill-tab ${activeTab === 'teachers' ? 'pill-tab-active' : 'pill-tab-inactive'}`}>Teachers ({teachers.length})</button>
        </div>

        <div className="soft-card p-4 mb-6">
          <div className="relative">
            <MagnifyingGlass size={20} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input data-testid="search-input" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`} className="soft-input w-full pl-12 pr-4" />
          </div>
        </div>

        <div className="soft-card p-6">
          <table className="w-full" data-testid="users-table">
            <thead>
              <tr className="border-b border-slate-100">
                {activeTab === 'students' ? (
                  <>
                    <th className="text-left p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Student</th>
                    <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Roll No</th>
                    <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Department</th>
                    <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Batch</th>
                    <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">CGPA</th>
                    <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Status</th>
                    <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Actions</th>
                  </>
                ) : (
                  <>
                    <th className="text-left p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Teacher</th>
                    <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Emp ID</th>
                    <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Department</th>
                    <th className="text-left p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Subjects</th>
                    <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Status</th>
                    <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {displayData.map((user, index) => (
                <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors" data-testid={`user-row-${index}`}>
                  {activeTab === 'students' ? (
                    <>
                      <td className="p-4"><p className="font-bold text-slate-800">{user.name}</p><p className="text-sm font-medium text-slate-400">{user.email}</p></td>
                      <td className="text-center p-4"><p className="font-bold text-slate-700">{user.rollNo}</p></td>
                      <td className="text-center p-4"><span className="soft-badge bg-indigo-50 text-indigo-600">{user.department}</span></td>
                      <td className="text-center p-4"><p className="font-bold text-slate-700">{user.batch}</p></td>
                      <td className="text-center p-4"><p className="font-bold text-lg text-slate-900">{user.cgpa}</p></td>
                      <td className="text-center p-4"><span className="soft-badge bg-emerald-50 text-emerald-600">{user.status}</span></td>
                      <td className="text-center p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button data-testid={`edit-user-${index}`} className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"><Pencil size={16} weight="duotone" /></button>
                          <button data-testid={`delete-user-${index}`} className="p-2 rounded-full bg-red-50 hover:bg-red-100 text-red-500 transition-colors"><Trash size={16} weight="duotone" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-4"><p className="font-bold text-slate-800">{user.name}</p><p className="text-sm font-medium text-slate-400">{user.email}</p></td>
                      <td className="text-center p-4"><p className="font-bold text-slate-700">{user.empId}</p></td>
                      <td className="text-center p-4"><span className="soft-badge bg-indigo-50 text-indigo-600">{user.department}</span></td>
                      <td className="p-4"><p className="font-medium text-sm text-slate-600">{user.subjects}</p></td>
                      <td className="text-center p-4"><span className="soft-badge bg-emerald-50 text-emerald-600">{user.status}</span></td>
                      <td className="text-center p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button data-testid={`edit-teacher-${index}`} className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"><Pencil size={16} weight="duotone" /></button>
                          <button data-testid={`delete-teacher-${index}`} className="p-2 rounded-full bg-red-50 hover:bg-red-100 text-red-500 transition-colors"><Trash size={16} weight="duotone" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50" data-testid="add-user-modal">
            <div className="soft-card p-8 max-w-2xl w-full mx-4">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Add New {activeTab === 'students' ? 'Student' : 'Teacher'}</h3>
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Full Name</label><input data-testid="name-input" type="text" className="soft-input w-full" placeholder="Enter name" /></div>
                  <div><label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">{activeTab === 'students' ? 'Roll Number' : 'Employee ID'}</label><input data-testid="id-input" type="text" className="soft-input w-full" placeholder={activeTab === 'students' ? 'S2024XXX' : 'TXXX'} /></div>
                </div>
                <div><label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Email</label><input data-testid="email-input" type="email" className="soft-input w-full" placeholder="email@college.edu" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Department</label>
                    <select className="soft-input w-full" data-testid="department-select"><option>CSE</option><option>ECE</option><option>MECH</option><option>CIVIL</option></select></div>
                  {activeTab === 'students' && <div><label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Batch</label><input data-testid="batch-input" type="text" className="soft-input w-full" placeholder="2024" /></div>}
                </div>
                <div className="flex gap-3 pt-4">
                  <button data-testid="cancel-add-user" type="button" onClick={() => setShowAddModal(false)} className="btn-ghost flex-1">Cancel</button>
                  <button data-testid="submit-add-user" type="submit" className="btn-primary flex-1">Add {activeTab === 'students' ? 'Student' : 'Teacher'}</button>
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
