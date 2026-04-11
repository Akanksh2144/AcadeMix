import React, { useState, useEffect } from 'react';
import { Plus, Upload, MagnifyingGlass, Pencil, Trash, Spinner } from '@phosphor-icons/react';
import PageHeader from '../components/PageHeader';
import { usersAPI, departmentsAPI, sectionsAPI, rolesAPI } from '../services/api';
import { Toaster, toast } from 'sonner';

const PERMISSION_MODULES = [
  { id: 'students', label: 'Students', actions: ['view', 'create', 'edit', 'deactivate'] },
  { id: 'faculty', label: 'Faculty', actions: ['view', 'create', 'edit', 'deactivate'] },
  { id: 'departments', label: 'Departments', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'sections', label: 'Sections', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'roles', label: 'Roles', actions: ['view', 'manage'] },
  { id: 'quizzes', label: 'Quizzes', actions: ['view', 'create', 'assign', 'grade'] },
  { id: 'timetable', label: 'Timetable', actions: ['view', 'manage'] },
  { id: 'attendance', label: 'Attendance', actions: ['view', 'upload', 'approve'] },
  { id: 'proctoring', label: 'Proctoring', actions: ['view_logs', 'review_appeals', 'configure'] },
  { id: 'metrics', label: 'Metrics', actions: ['view_dept', 'view_college'] },
];

const UserManagement = ({ navigate, user }) => {
  const [activeTab, setActiveTab] = useState('students');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [data, setData] = useState({ students: [], teachers: [], departments: [], sections: [], roles: [] });
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes, secRes, rolRes] = await Promise.all([
        usersAPI.list(),
        departmentsAPI.list(),
        sectionsAPI.list(),
        rolesAPI.list()
      ]);
      const allUsers = usersRes.data || [];
      setData({
        students: allUsers.filter(u => u.role === 'student'),
        teachers: allUsers.filter(u => u.role !== 'student' && u.role !== 'admin'),
        departments: deptsRes.data || [],
        sections: secRes.data || [],
        roles: rolRes.data || []
      });
    } catch (err) {
      toast.error('Failed to load institution data. Please try again.');
    }
    setLoading(false);
  };

  const getDisplayData = () => {
    let list = data[activeTab] || [];
    if (searchQuery) {
      list = list.filter(item => 
        (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.college_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.code || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return list;
  };

  const openAddModal = () => {
    setModalMode('add');
    setEditItem(null);
    let initialData = {};
    if (activeTab === 'teachers') {
       initialData.password = Math.random().toString(36).slice(-8);
    } else if (activeTab === 'roles') {
       initialData.permissions = {};
    }
    setFormData(initialData);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setModalMode('edit');
    setEditItem(item);
    setFormData(item);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    try {
      if (activeTab === 'departments') await departmentsAPI.delete(id);
      else if (activeTab === 'sections') await sectionsAPI.delete(id);
      else if (activeTab === 'roles') await rolesAPI.delete(id);
      else await usersAPI.delete(id);
      
      toast.success('Record successfully deleted.');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete. Resource may be protected.');
    }
  };

  // Smart Auto-generation effects for forms
  useEffect(() => {
    if (modalMode !== 'add') return;
    
    let newData = { ...formData };
    let changed = false;

    if (activeTab === 'students') {
      const year = newData.batch || new Date().getFullYear();
      const dept = newData.department || 'GEN';
      const sec = newData.section || 'A';
      
      // Auto Roll Number
      if (!newData.college_id || newData._auto_generated_id) {
        newData.college_id = `${year}${dept}${sec}${Math.floor(Math.random() * 900) + 100}`;
        newData._auto_generated_id = true;
        changed = true;
      }
      
      // Auto Email
      if (newData.college_id && (!newData.email || newData._auto_generated_email)) {
         newData.email = `${newData.college_id.toLowerCase()}@gnitc.edu`;
         newData._auto_generated_email = true;
         changed = true;
      }
      
      // Auto Password mapping
      if (!newData.password || newData._auto_generated_pwd) {
         newData.password = newData.college_id ? newData.college_id.toUpperCase() : '';
         newData._auto_generated_pwd = true;
         changed = true;
      }
    } else if (activeTab === 'teachers') {
      const dept = newData.department || 'FAC';
      
      // Auto Employee ID
      if (!newData.college_id || newData._auto_generated_id) {
        newData.college_id = `T${dept}${Math.floor(Math.random() * 900) + 100}`;
        newData._auto_generated_id = true;
        changed = true;
      }
      
      // Auto Email based on name
      if (newData.name && (!newData.email || newData._auto_generated_email)) {
        const cleanlyName = newData.name.replace(/[^a-zA-Z]/g, '').toLowerCase();
        newData.email = `${cleanlyName || 'faculty'}@gnitc.edu`;
        newData._auto_generated_email = true;
        changed = true;
      }
    }

    if (changed) {
      setFormData(newData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.department, formData.section, formData.batch, formData.name, activeTab, modalMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      if (activeTab === 'departments') {
        if (modalMode === 'add') await departmentsAPI.create(formData);
        else await departmentsAPI.update(editItem.id, formData);
      } else if (activeTab === 'sections') {
        if (modalMode === 'add') await sectionsAPI.create(formData);
        else await sectionsAPI.update(editItem.id, formData);
      } else if (activeTab === 'roles') {
         if (modalMode === 'add') await rolesAPI.create(formData);
         else await rolesAPI.update(editItem.id, formData);
      } else {
        const payload = { ...formData };
        delete payload._auto_generated_id;
        delete payload._auto_generated_email;
        delete payload._auto_generated_pwd;
        
        if (activeTab === 'students') payload.role = 'student';
        else payload.role = payload.role || 'teacher';
        
        if (modalMode === 'add') {
          payload.password = payload.password || "password123";
          await usersAPI.create(payload);
        } else await usersAPI.update(editItem.id, payload);
      }
      setShowModal(false);
      toast.success('Successfully saved changes.');
      fetchData();
    } catch (err) {
      toast.error('Operation failed! Ensure IDs/Codes are unique and fields are valid.');
    }
    setSubmitLoading(false);
  };

  const displayData = getDisplayData();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <Toaster position="top-right" richColors />
      <PageHeader
        navigate={navigate} user={user} title="Institute Management"
        subtitle="Manage structure, staff, and students automatically."
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div className="flex gap-3">
            <button data-testid="add-single-item-button" onClick={openAddModal} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={18} weight="bold" /> Add {activeTab === 'departments' ? 'Department' : activeTab === 'sections' ? 'Section' : activeTab === 'roles' ? 'Role' : activeTab === 'students' ? 'Student' : 'Faculty Member'}
            </button>
            {(activeTab === 'students' || activeTab === 'teachers') && (
              <button data-testid="bulk-upload-button" className="btn-secondary flex items-center gap-2 text-sm"><Upload size={18} weight="duotone" /> Batch Import</button>
            )}
          </div>
        </div>

        <div className="bg-slate-100 dark:bg-white/[0.04] rounded-xl p-1.5 inline-flex flex-wrap gap-1 mb-6">
          <button onClick={() => setActiveTab('students')} className={`pill-tab ${activeTab === 'students' ? 'pill-tab-active' : 'pill-tab-inactive'}`}>Students ({data.students.length})</button>
          <button onClick={() => setActiveTab('teachers')} className={`pill-tab ${activeTab === 'teachers' ? 'pill-tab-active' : 'pill-tab-inactive'}`}>Faculty ({data.teachers.length})</button>
          <button onClick={() => setActiveTab('departments')} className={`pill-tab ${activeTab === 'departments' ? 'pill-tab-active' : 'pill-tab-inactive'}`}>Departments ({data.departments.length})</button>
          <button onClick={() => setActiveTab('sections')} className={`pill-tab ${activeTab === 'sections' ? 'pill-tab-active' : 'pill-tab-inactive'}`}>Sections ({data.sections.length})</button>
          <button onClick={() => setActiveTab('roles')} className={`pill-tab ${activeTab === 'roles' ? 'pill-tab-active' : 'pill-tab-inactive'}`}>Roles ({data.roles.length})</button>
        </div>

        <div className="soft-card p-4 mb-6">
          <div className="relative">
            <MagnifyingGlass size={20} weight="duotone" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`} className="soft-input w-full pl-12 pr-4" />
          </div>
        </div>

        <div className="soft-card p-6">
          {loading ? (
             <div className="flex items-center justify-center py-12"><Spinner className="animate-spin text-indigo-500" size={32} /></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  {activeTab === 'departments' ? (
                    <>
                      <th className="text-left p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Department Name</th>
                      <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Code</th>
                      <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Actions</th>
                    </>
                  ) : activeTab === 'sections' ? (
                    <>
                      <th className="text-left p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Section Name</th>
                      <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Housed Within</th>
                      <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Actions</th>
                    </>
                  ) : activeTab === 'roles' ? (
                    <>
                      <th className="text-left p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Custom Role</th>
                      <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">System Permissions</th>
                      <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Actions</th>
                    </>
                  ) : activeTab === 'students' ? (
                    <>
                      <th className="text-left p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Student Info</th>
                      <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Roll No</th>
                      <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Dept</th>
                      <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Section</th>
                      <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Actions</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Faculty Member</th>
                      <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Role Designation</th>
                      <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Emp ID</th>
                      <th className="text-center p-4 text-xs font-bold uppercase tracking-widest text-slate-400">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {displayData.map((item) => {
                  let mappedDept = data.departments.find(d => d.id === item.department_id)?.name || 'Unknown';
                  return (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 dark:bg-slate-800/50 transition-colors">
                    {activeTab === 'departments' ? (
                      <>
                        <td className="p-4"><p className="font-bold text-slate-800 dark:text-slate-100">{item.name}</p></td>
                        <td className="text-center p-4"><span className="soft-badge bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600">{item.code}</span></td>
                        <td className="text-center p-4">
                          <button onClick={() => openEditModal(item)} className="p-2 mx-1 rounded-full hover:bg-slate-100 text-slate-500"><Pencil size={16} weight="duotone" /></button>
                          <button onClick={() => { if(window.confirm('Delete this item?')) handleDelete(item.id); }} className="p-2 mx-1 rounded-full hover:bg-red-100 text-red-500"><Trash size={16} weight="duotone" /></button>
                        </td>
                      </>
                    ) : activeTab === 'sections' ? (
                      <>
                        <td className="p-4"><p className="font-bold text-slate-800 dark:text-slate-100">{item.name}</p></td>
                        <td className="text-center p-4"><span className="soft-badge bg-rose-50 text-rose-600">{mappedDept}</span></td>
                        <td className="text-center p-4">
                          <button onClick={() => openEditModal(item)} className="p-2 mx-1 rounded-full hover:bg-slate-100 text-slate-500"><Pencil size={16} weight="duotone" /></button>
                          <button onClick={() => { if(window.confirm('Delete this item?')) handleDelete(item.id); }} className="p-2 mx-1 rounded-full hover:bg-red-100 text-red-500"><Trash size={16} weight="duotone" /></button>
                        </td>
                      </>
                    ) : activeTab === 'roles' ? (
                      <>
                        <td className="p-4"><p className="font-bold text-slate-800 dark:text-slate-100">{item.name}</p></td>
                        <td className="text-center p-4">
                          <span className="soft-badge bg-teal-50 text-teal-600">
                            {Object.keys(item.permissions || {}).length} Modules Granted
                          </span>
                        </td>
                        <td className="text-center p-4">
                          <button onClick={() => openEditModal(item)} className="p-2 mx-1 rounded-full hover:bg-slate-100 text-slate-500"><Pencil size={16} weight="duotone" /></button>
                          <button onClick={() => { if(window.confirm('Delete this item?')) handleDelete(item.id); }} className="p-2 mx-1 rounded-full hover:bg-red-100 text-red-500"><Trash size={16} weight="duotone" /></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4"><p className="font-bold text-slate-800 dark:text-slate-100">{item.name}</p><p className="text-sm font-medium text-slate-400">{item.email}</p></td>
                        {activeTab === 'teachers' && (
                          <td className="text-center p-4">
                            <span className={`soft-badge ${item.role === 'hod' ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {item.role.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                        )}
                        <td className="text-center p-4"><p className="font-bold text-slate-700 dark:text-slate-300">{item.college_id}</p></td>
                        {activeTab === 'students' && (
                          <>
                             <td className="text-center p-4"><span className="soft-badge bg-indigo-50 text-indigo-600">{item.department || '-'}</span></td>
                             <td className="text-center p-4"><p className="font-bold text-slate-700 dark:text-slate-300">{item.section || '-'}</p></td>
                          </>
                        )}
                        <td className="text-center p-4">
                          <button onClick={() => openEditModal(item)} className="p-2 mx-1 rounded-full hover:bg-slate-100 text-slate-500"><Pencil size={16} weight="duotone" /></button>
                          <button onClick={() => { if(window.confirm('Delete this item?')) handleDelete(item.id); }} className="p-2 mx-1 rounded-full hover:bg-red-100 text-red-500"><Trash size={16} weight="duotone" /></button>
                        </td>
                      </>
                    )}
                  </tr>
                )}
                )}
              </tbody>
            </table>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="soft-card p-8 max-w-2xl w-full mx-4 shadow-2xl">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">{modalMode === 'add' ? 'Add' : 'Edit'} {activeTab.slice(0, -1)}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {activeTab === 'departments' && (
                   <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Department Name</label><input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} type="text" className="soft-input w-full" placeholder="Computer Science" /></div>
                      <div><label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Code</label><input required value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} type="text" className="soft-input w-full" placeholder="CSE" /></div>
                   </div>
                )}

                {activeTab === 'sections' && (
                   <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Section Name</label><input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} type="text" className="soft-input w-full" placeholder="A" /></div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Housed Within Dept</label>
                        <select required className="soft-input w-full" value={formData.department_id || ''} onChange={e => setFormData({...formData, department_id: e.target.value})}>
                          <option value="">Select Department...</option>
                          {data.departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                        </select>
                      </div>
                   </div>
                )}
                
                {activeTab === 'roles' && (
                   <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Custom Role Name</label>
                        <input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} type="text" className="soft-input w-full" placeholder="e.g. Lab Assistant" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Configure Permission Matrix</label>
                        <div className="border border-slate-100 dark:border-slate-700 rounded-xl max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                          {PERMISSION_MODULES.map(module => (
                            <div key={module.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">{module.label}</p>
                              <div className="flex flex-wrap gap-4">
                                {module.actions.map(action => (
                                  <label key={action} className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-slate-300 text-indigo-500 focus:ring-indigo-500"
                                      checked={formData.permissions?.[module.id]?.includes(action) || false}
                                      onChange={(e) => {
                                        const currentPerms = formData.permissions || {};
                                        const modulePerms = currentPerms[module.id] || [];
                                        let updatedModulePerms;
                                        if (e.target.checked) updatedModulePerms = [...modulePerms, action];
                                        else updatedModulePerms = modulePerms.filter(a => a !== action);
                                        
                                        setFormData({
                                          ...formData, 
                                          permissions: { ...currentPerms, [module.id]: updatedModulePerms }
                                        });
                                      }}
                                    />
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 capitalize">{action.replace('_', ' ')}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                   </div>
                )}

                {(activeTab === 'students' || activeTab === 'teachers') && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Full Name</label>
                         <input required value={formData.name || ''} onChange={e => {
                            setFormData({...formData, name: e.target.value, _auto_generated_email: false});
                         }} type="text" className="soft-input w-full" placeholder="Enter name" />
                      </div>
                      <div>
                         <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">{activeTab === 'students' ? 'Roll Number (Auto-Generation)' : 'Employee ID (Auto-Generation)'}</label>
                         <input required value={formData.college_id || ''} onChange={e => setFormData({...formData, college_id: e.target.value, _auto_generated_id: false})} type="text" className="soft-input w-full" />
                      </div>
                    </div>
                    <div>
                       <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Email Address</label>
                       <input required value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value, _auto_generated_email: false})} type="email" className="soft-input w-full" />
                    </div>
                    {activeTab === 'teachers' && modalMode === 'add' && (
                       <div><label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Auto-Generated Initial Password</label><input required value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} type="text" className="soft-input w-full text-indigo-600 bg-indigo-50" /></div>
                    )}
                    {activeTab === 'students' && modalMode === 'add' && (
                       <div className="mb-4 text-xs font-semibold text-emerald-600 p-3 bg-emerald-50 rounded-xl">Notice: Student password defaults to their Roll Number.</div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Department</label>
                        <select className="soft-input w-full" value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value, _auto_generated_id: false})}>
                          <option value="">Select Department...</option>
                          {data.departments.map(d => <option key={d.id} value={d.code}>{d.name} ({d.code})</option>)}
                        </select>
                      </div>
                      
                      {activeTab === 'students' ? (
                        <>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Section (Cascading)</label>
                            <select className="soft-input w-full" value={formData.section || ''} onChange={e => setFormData({...formData, section: e.target.value, _auto_generated_id: false})}>
                              <option value="">Select Section...</option>
                              {data.sections
                                .filter(s => {
                                   const parentDept = data.departments.find(d => d.id === s.department_id);
                                   return parentDept && parentDept.code === formData.department;
                                })
                                .map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                              }
                            </select>
                          </div>
                        </>
                      ) : (
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Role Designation</label>
                          <select className="soft-input w-full" value={formData.role || 'teacher'} onChange={e => setFormData({...formData, role: e.target.value})}>
                            <option value="teacher">Teacher / Undefined</option>
                            <option value="hod">HOD (System Action)</option>
                            {data.roles.map(r => <option key={r.id} value={r.name}>{r.name} (Mapped to {r.system_role})</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-ghost flex-1">Scrap Edit</button>
                  <button type="submit" disabled={submitLoading} className="btn-primary flex-1">{submitLoading ? "Processing changes..." : "Save Validations"}</button>
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
