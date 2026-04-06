import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { hodPhase2API, studentsAPI } from '../../services/api';
import { Plus, Trash, FileText } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

const progressionSchema = {
  higher_studies: ['transition', 'institution', 'program'],
  competitive_exam: ['exam', 'score', 'percentile'],
  employment: ['company', 'designation', 'package'],
  co_curricular: ['event', 'level', 'position', 'remarks']
};

const labels = {
  higher_studies: "Higher Studies",
  competitive_exam: "Competitive Exam",
  employment: "Employment",
  co_curricular: "Co-Curricular"
};

const HODProgressionTab = ({ departmentId }) => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  
  const [activeType, setActiveType] = useState('employment');
  const [formData, setFormData] = useState({});

  const fetchStudents = useCallback(async () => {
    try {
      const res = await studentsAPI.search('', departmentId);
      setStudents(res.data);
    } catch (err) {
      toast.error("Failed to load students");
    }
  }, [departmentId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const loadProgression = async (studentId) => {
    setLoading(true);
    setSelectedStudent(studentId);
    try {
      const res = await hodPhase2API.getProgression(studentId);
      setRecords(res.data);
    } catch (err) {
      toast.error("Failed to load progression records");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    
    // basic validation
    for (let f of progressionSchema[activeType]) {
      if (!formData[f]) {
         toast.error(`Please fill out ${f}`);
         return;
      }
    }

    try {
      await hodPhase2API.createProgression({
        student_id: selectedStudent,
        progression_type: activeType,
        details: formData
      });
      toast.success("Record created successfully");
      setFormData({});
      loadProgression(selectedStudent);
    } catch (err) {
      toast.error("Failed to create record");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this progression record?")) return;
    try {
      await hodPhase2API.deleteProgression(id);
      toast.success("Record deleted");
      loadProgression(selectedStudent);
    } catch (err) {
      toast.error("Failed to delete record");
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.roll_no || s.id).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-12rem)] border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-800">
      {/* Sidebar: Students */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <input 
            type="text" 
            placeholder="Search students..." 
            className="w-full text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 outline-none dark:text-white"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
          {filteredStudents.map(s => (
            <button
              key={s.id}
              onClick={() => loadProgression(s.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${selectedStudent === s.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-800 dark:text-gray-200'}`}
            >
              <div className="font-medium text-sm">{s.name}</div>
              <div className="text-xs text-gray-500">{s.roll_no || s.id}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Panel: Records & Forms */}
      <div className="w-2/3 flex flex-col bg-gray-50 dark:bg-gray-900/50">
        {!selectedStudent ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <FileText size={48} className="mb-4 opacity-50" />
            <p>Select a student to view or add NAAC progression data.</p>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 animate-pulse">Loading...</div>
        ) : (
          <>
            {/* Record List */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Student Progression History</h3>
              <div className="space-y-4">
                <AnimatePresence>
                  {records.length === 0 && (
                    <p className="text-gray-500 italic">No records found for this student.</p>
                  )}
                  {records.map(rec => (
                    <motion.div key={rec.id} layout initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm relative">
                      <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
                        <span className="inline-flex px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 text-xs font-semibold rounded-md uppercase tracking-wider">{labels[rec.progression_type]}</span>
                        <span className="text-xs text-gray-400">{new Date(rec.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        {Object.entries(rec.details).map(([k, v]) => (
                          <div key={k}>
                            <span className="block text-xs font-medium text-gray-500 uppercase">{k}</span>
                            <span className="text-gray-800 dark:text-gray-200">{v}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => handleDelete(rec.id)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash size={16} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Entry Form */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <h4 className="font-semibold text-gray-800 dark:text-white mb-4">Add New Record</h4>
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1 custom-scrollbar">
                {Object.keys(progressionSchema).map(type => (
                  <button
                    key={type}
                    onClick={() => { setActiveType(type); setFormData({}); }}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-md text-sm transition-colors ${activeType === type ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                  >
                    {labels[type]}
                  </button>
                ))}
              </div>
              <form onSubmit={handleSubmit} className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {progressionSchema[activeType].map(field => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 capitalize">{field.replace('_', ' ')}</label>
                    <input 
                      type="text" 
                      required
                      value={formData[field] || ''}
                      onChange={e => handleInputChange(field, e.target.value)}
                      className="w-full text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-white transition-shadow"
                    />
                  </div>
                ))}
                <div className="col-span-full pt-2 flex justify-end">
                  <button type="submit" className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                    <Plus size={16} />
                    <span>Save {labels[activeType]} Record</span>
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default HODProgressionTab;
