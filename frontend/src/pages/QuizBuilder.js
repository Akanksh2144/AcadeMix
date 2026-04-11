import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash, Copy, Eye, CalendarBlank, Clock, X, WarningCircle, CaretDown, CaretUp, DownloadSimple, UploadSimple } from '@phosphor-icons/react';
import PageHeader from '../components/PageHeader';
import { facultyAPI, quizzesAPI } from '../services/api';
import * as XLSX from 'xlsx';
import AlertModal from '../components/AlertModal';

const QuizBuilder = ({ navigate, user }) => {
  const [quizTitle, setQuizTitle] = useState('New Quiz');
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  
  const [assignments, setAssignments] = useState([]);
  const [subject, setSubject] = useState('');
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [duration, setDuration] = useState(60);
  
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [negativeMarks, setNegativeMarks] = useState(0.5);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(true);
  const [showAnswersAfter, setShowAnswersAfter] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const importQuizRef = useRef(null);
  const [alertModal, setAlertModal] = useState({ open: false, title: '', message: '', type: 'info', onConfirm: null });
  const showAlert = (title, message, type = 'info') => setAlertModal({ open: true, title, message, type, onConfirm: null });
  const closeAlert = () => setAlertModal(prev => ({ ...prev, open: false }));

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const { data } = await facultyAPI.assignments();
        setAssignments(data || []);
        if (data && data.length > 0) {
          const firstSub = data[0].subject_name;
          setSubject(firstSub);
        }
      } catch (err) {
        console.error('Failed to fetch assignments:', err);
      }
    };
    fetchAssignments();
  }, []);

  const addQuestion = (type) => {
    const baseQuestion = { 
      id: questions.length + 1, 
      type, 
      text: '', 
      marks: 2,
      negativeMarks: 0,
    };
    
    let nq;
    if (type === 'mcq-single' || type === 'mcq-multiple') {
      nq = { ...baseQuestion, options: ['', '', '', ''], correctAnswer: type === 'mcq-single' ? 0 : undefined, correctAnswers: type === 'mcq-multiple' ? [] : undefined };
    } else if (type === 'coding') {
      nq = { ...baseQuestion, language: 'python', starter_code: '', test_input: '', expected_output: '', testCases: '', sampleInput: '', sampleOutput: '' };
    } else {
      nq = { ...baseQuestion };
    }
    
    setQuestions([...questions, nq]);
    setCurrentQuestion(questions.length);
  };

  const deleteQuestion = (index) => {
    const newQs = questions.filter((_, i) => i !== index);
    setQuestions(newQs);
    if (currentQuestion >= newQs.length) {
      setCurrentQuestion(Math.max(0, newQs.length - 1));
    }
  };

  const duplicateQuestion = (index) => {
    setQuestions([...questions, { ...questions[index], id: questions.length + 1 }]);
  };

  // ── Quiz Excel Template Download ───────────────────────
  const handleDownloadQuizTemplate = () => {
    const exampleRows = [
      {
        'Type': 'MCQ-Single',
        'Question': 'Which data structure uses LIFO ordering?',
        'Option A': 'Queue',
        'Option B': 'Stack',
        'Option C': 'Linked List',
        'Option D': 'Tree',
        'Option E': '',
        'Correct Answer(s)': 'B',
        'Marks': 2,
        'Negative Marks': 0.5,
        'Expected Answer / Max Length': '',
      },
      {
        'Type': 'MCQ-Multiple',
        'Question': 'Which of the following are sorting algorithms?',
        'Option A': 'Bubble Sort',
        'Option B': 'Binary Search',
        'Option C': 'Merge Sort',
        'Option D': 'Quick Sort',
        'Option E': 'DFS',
        'Correct Answer(s)': 'A,C,D',
        'Marks': 3,
        'Negative Marks': 1,
        'Expected Answer / Max Length': '',
      },
      {
        'Type': 'Short',
        'Question': 'What is the time complexity of binary search?',
        'Option A': '',
        'Option B': '',
        'Option C': '',
        'Option D': '',
        'Option E': '',
        'Correct Answer(s)': 'O(log n)',
        'Marks': 2,
        'Negative Marks': 0,
        'Expected Answer / Max Length': 200,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(exampleRows);
    ws['!cols'] = [
      { wch: 14 }, { wch: 50 }, { wch: 22 }, { wch: 22 },
      { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 8 }, { wch: 16 }, { wch: 28 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Quiz Questions');
    XLSX.writeFile(wb, `${quizTitle.replace(/\s+/g, '_')}_template.xlsx`);
  };

  // ── Quiz Excel Import ──────────────────────────────
  const handleImportQuizExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (!rows.length) { showAlert('Import Failed', 'The spreadsheet appears to be empty.', 'warning'); return; }

        const imported = [];
        const errors = [];

        rows.forEach((row, idx) => {
          const rowNum = idx + 2;
          const typeRaw = String(row['Type'] || '').trim().toLowerCase();
          const questionText = String(row['Question'] || '').trim();
          const marksVal = parseInt(row['Marks']) || 2;
          const negMarksVal = parseFloat(row['Negative Marks']) || 0;
          const correctRaw = String(row['Correct Answer(s)'] || '').trim().toUpperCase();

          if (!questionText) { errors.push(`Row ${rowNum}: Question text is empty — skipped.`); return; }

          // Dynamically find all "Option X" columns in this row (A, B, C, D, E, F...)
          const optionKeys = Object.keys(row)
            .filter(k => /^Option\s+[A-Z]$/i.test(k.trim()))
            .sort();  // alphabetical sort ensures A < B < C...
          const optionValues = optionKeys.map(k => String(row[k] || '').trim()).filter(o => o !== '');

          // Build letter→index from the option keys that actually had values
          const letterToIdx = {};
          optionKeys.forEach((k, i) => {
            const letter = k.trim().slice(-1).toUpperCase(); // last char, e.g. 'A'
            letterToIdx[letter] = i;
          });

          if (typeRaw === 'mcq-single' || typeRaw === 'mcq single') {
            if (optionValues.length < 2) { errors.push(`Row ${rowNum}: MCQ-Single needs at least 2 options — skipped.`); return; }
            const correctLetter = correctRaw.trim();
            const correctIdx = letterToIdx[correctLetter];
            if (correctIdx === undefined || correctIdx >= optionValues.length) {
              errors.push(`Row ${rowNum}: Invalid correct answer "${correctLetter}" — defaulting to A.`);
            }
            imported.push({
              id: questions.length + imported.length + 1,
              type: 'mcq-single',
              text: questionText,
              options: optionValues,
              correctAnswer: correctIdx ?? 0,
              marks: marksVal,
              negativeMarks: negMarksVal,
            });
          } else if (typeRaw === 'mcq-multiple' || typeRaw === 'mcq multiple') {
            if (optionValues.length < 2) { errors.push(`Row ${rowNum}: MCQ-Multiple needs at least 2 options — skipped.`); return; }
            const correctAnswers = correctRaw.split(',').map(l => letterToIdx[l.trim()]).filter(i => i !== undefined && i < optionValues.length);
            if (!correctAnswers.length) { errors.push(`Row ${rowNum}: No valid correct answers — defaulting to A.`); correctAnswers.push(0); }
            imported.push({
              id: questions.length + imported.length + 1,
              type: 'mcq-multiple',
              text: questionText,
              options: optionValues,
              correctAnswers,
              marks: marksVal,
              negativeMarks: negMarksVal,
            });
          } else if (typeRaw === 'short') {
            const expectedAnswer = String(row['Correct Answer(s)'] || '').trim();
            const maxLen = parseInt(row['Expected Answer / Max Length']) || 500;
            imported.push({
              id: questions.length + imported.length + 1,
              type: 'short',
              text: questionText,
              expectedAnswer,
              maxLength: maxLen,
              marks: marksVal,
              negativeMarks: negMarksVal,
            });
          } else {
            errors.push(`Row ${rowNum}: Unknown type "${row['Type']}" — skipped. Use MCQ-Single, MCQ-Multiple, or Short.`);
          }
        });

        if (!imported.length) { showAlert('Import Failed', 'No valid questions were imported. Check your template.\n\n' + errors.join('\n'), 'warning'); return; }

        setQuestions(prev => [...prev, ...imported]);
        setCurrentQuestion(questions.length); // jump to first imported
        const summary = `✓ Imported ${imported.length} question${imported.length !== 1 ? 's' : ''}.`;
        const warn = errors.length ? `\n\nWarnings:\n${errors.join('\n')}` : '';
        showAlert('Import Successful', summary + warn, 'success');
      } catch (err) {
        console.error(err);
        showAlert('Import Error', 'Failed to read file. Make sure it is a valid .xlsx file.', 'danger');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const addOption = () => {
    const nq = [...questions];
    nq[currentQuestion].options.push('');
    setQuestions(nq);
  };

  const removeOption = (index) => {
    if (questions[currentQuestion].options.length > 2) {
      const nq = [...questions];
      nq[currentQuestion].options.splice(index, 1);
      if (nq[currentQuestion].type === 'mcq-single' && nq[currentQuestion].correctAnswer >= index) {
        nq[currentQuestion].correctAnswer = Math.max(0, nq[currentQuestion].correctAnswer - 1);
      } else if (nq[currentQuestion].type === 'mcq-multiple') {
        nq[currentQuestion].correctAnswers = nq[currentQuestion].correctAnswers.filter(a => a !== index).map(a => a > index ? a - 1 : a);
      }
      setQuestions(nq);
    }
  };

  const toggleMultipleAnswer = (index) => {
    const nq = [...questions];
    const correctAnswers = nq[currentQuestion].correctAnswers || [];
    if (correctAnswers.includes(index)) {
      nq[currentQuestion].correctAnswers = correctAnswers.filter(a => a !== index);
    } else {
      nq[currentQuestion].correctAnswers = [...correctAnswers, index];
    }
    setQuestions(nq);
  };

  const handlePublish = async (isDraft = false) => {
    if (!quizTitle.trim()) { showAlert('Missing Title', 'Please enter a quiz title.', 'warning'); return; }
    if (!subject) { showAlert('Missing Subject', 'Please select a subject.', 'warning'); return; }
    if (!isDraft && questions.length === 0) { showAlert('No Questions', 'Please add at least one question.', 'warning'); return; }
    if (!isDraft && selectedClasses.length === 0) { showAlert('No Classes', 'Please select at least one assigned class.', 'warning'); return; }
    
    if (!isDraft) {
      const emptyQuestions = questions.filter(q => !q.text.trim());
      if (emptyQuestions.length > 0) { showAlert('Incomplete Questions', 'Please fill in all question texts.', 'warning'); return; }
      const mcqQuestions = questions.filter(q => q.type === 'mcq-single' || q.type === 'mcq-multiple');
      for (let q of mcqQuestions) {
        if (q.options.some(o => !o.trim())) { showAlert('Incomplete Options', 'Please fill in all MCQ options.', 'warning'); return; }
        if (q.type === 'mcq-multiple' && (!q.correctAnswers || q.correctAnswers.length === 0)) {
          showAlert('No Correct Answer', 'Select at least one correct answer for multiple choice questions.', 'warning'); return;
        }
      }
      for (let q of questions.filter(q => q.type === 'coding')) {
        if (!q.language) { showAlert('Missing Language', 'Select a language for coding questions.', 'warning'); return; }
      }
    }

    const assigned_classes = selectedClasses.map(id => {
      const a = assignments.find(x => x.id === id);
      return a ? { department: a.department, batch: a.batch, section: a.section } : null;
    }).filter(Boolean);

    const quizData = {
      title: quizTitle,
      subject,
      description: '',
      total_marks: questions.reduce((s, q) => s + (parseInt(q.marks)||0), 0),
      duration_mins: parseInt(duration) || 60,
      negative_marking: negativeMarking,
      negative_marks: negativeMarking ? parseFloat(negativeMarks) : 0,
      randomize_questions: randomizeQuestions,
      randomize_options: randomizeOptions,
      show_answers_after: showAnswersAfter,
      allow_reattempt: false,
      questions,
      assigned_classes,
      scheduledDate: showSchedule ? scheduledDate : null,
      scheduledTime: showSchedule ? scheduledTime : null,
    };
    
    try {
      setSubmitting(true);
      const res = await quizzesAPI.create(quizData);
      
      if (!isDraft && showSchedule) {
        // Publish logic with future status ideally handled backend if we had a dedicated status field in QuizCreate. 
        // Backend overrides create_quiz status to "draft" by default, then we can publish it.
        await quizzesAPI.publish(res.data.id);
        showAlert('Scheduled', 'Quiz scheduled successfully!', 'success');
      } else if (!isDraft) {
        await quizzesAPI.publish(res.data.id);
        showAlert('Published', 'Quiz published successfully!', 'success');
      } else {
        showAlert('Saved', 'Draft saved successfully!', 'success');
      }
      navigate(user?.role === 'hod' ? 'hod-dashboard' : 'teacher-dashboard');
    } catch (err) {
      showAlert('Error', 'Error saving quiz: ' + err.message, 'danger');
      setSubmitting(false);
    }
  };

  const availableSubjects = [...new Set(assignments.map(a => a.subject_name))];
  const classesForSubject = assignments.filter(a => a.subject_name === subject);
  
  const q = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] transition-colors duration-300">
      <PageHeader
        navigate={navigate} user={user} title={quizTitle || 'New Quiz'}
        subtitle="Quiz Builder"
        rightContent={
          <>
            <button onClick={() => setShowSchedule(!showSchedule)}
              className={`btn-ghost !py-2.5 flex items-center gap-2 text-sm ${showSchedule ? 'bg-amber-50 text-amber-600' : ''}`}>
              <CalendarBlank size={18} weight="duotone" /> {showSchedule ? 'Cancel Schedule' : 'Schedule'}
            </button>
            <button onClick={() => handlePublish(true)} disabled={submitting} className="btn-secondary !py-2.5 text-sm">Save Draft</button>
            <button data-testid="publish-quiz-button" onClick={() => handlePublish(false)} disabled={submitting} className="btn-primary !py-2.5 text-sm">
              {submitting ? 'Saving...' : showSchedule ? 'Schedule Quiz' : 'Publish Quiz'}
            </button>
          </>
        }
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="soft-card p-6 mb-8">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Quiz Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Subject</label>
              {availableSubjects.length > 0 ? (
                <select className="soft-input w-full" value={subject} onChange={(e) => { setSubject(e.target.value); setSelectedClasses([]); }}>
                  <option value="" disabled>Select Subject</option>
                  {availableSubjects.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              ) : (
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter subject name (e.g. Machine Learning)" className="soft-input w-full" />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Duration (mins)</label>
              <input type="number" value={duration} onChange={(e)=>setDuration(e.target.value)} min="1" className="soft-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Total Marks</label>
              <input type="number" value={questions.reduce((s, q) => s + (parseInt(q.marks)||0), 0)} readOnly className="soft-input w-full bg-slate-100" />
            </div>
          </div>
          
          {/* Target Classes */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Target Sections</label>
            {classesForSubject.length > 0 ? (
              <div className="relative">
                <div 
                  className="soft-input w-full flex justify-between items-center cursor-pointer min-h-[46px]"
                  onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                >
                  <div className="flex flex-wrap gap-1">
                     {selectedClasses.length === 0 ? (
                        <span className="text-slate-400 font-medium">Select target classes from assignments...</span>
                     ) : (
                        <span className="text-indigo-600 font-bold">{selectedClasses.length} Classes Selected</span>
                     )}
                  </div>
                  {isClassDropdownOpen ? <CaretUp size={16} weight="bold" className="text-indigo-500" /> : <CaretDown size={16} weight="bold" className="text-slate-400" />}
                </div>
                
                {isClassDropdownOpen && (
                  <div className="absolute left-0 right-0 top-[100%] mt-2 bg-white dark:bg-[#1A202C] border border-slate-200 dark:border-slate-700 shadow-xl rounded-xl p-2 max-h-60 overflow-y-auto z-10 flex flex-col gap-1">
                    {classesForSubject.map(cls => {
                      const isSelected = selectedClasses.includes(cls.id);
                      return (
                        <label key={cls.id} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 dark:bg-slate-800/50 border border-transparent'}`}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => {
                              setSelectedClasses(prev => isSelected ? prev.filter(id => id !== cls.id) : [...prev, cls.id]);
                            }}
                            className="w-4 h-4 rounded text-indigo-500 bg-white dark:bg-[#1A202C] border-slate-300 accent-indigo-500 cursor-pointer"
                          />
                          <span className={`text-sm font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-600 dark:text-slate-400'}`}>
                            {cls.department} • {cls.batch} • Sec {cls.section}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">Quiz will be available to all students. To target specific sections, create faculty assignments first.</p>
            )}
          </div>

          {showSchedule && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 bg-amber-50 rounded-2xl">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-amber-600 mb-2"><CalendarBlank size={16} className="inline mr-1" /> Schedule Date</label>
                <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="soft-input w-full" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-amber-600 mb-2"><Clock size={16} className="inline mr-1" /> Schedule Time</label>
                <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} className="soft-input w-full" />
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-8 items-center pt-2">
             <label className="flex items-center gap-2.5 font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                <input type="checkbox" checked={randomizeQuestions} onChange={(e) => setRandomizeQuestions(e.target.checked)} className="w-4 h-4 rounded-md accent-indigo-500" />
                Randomize Questions
             </label>
             <label className="flex items-center gap-2.5 font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                <input type="checkbox" checked={randomizeOptions} onChange={(e) => setRandomizeOptions(e.target.checked)} className="w-4 h-4 rounded-md accent-indigo-500" />
                Shuffle Options
             </label>
             <label className="flex items-center gap-2.5 font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                <input type="checkbox" checked={showAnswersAfter} onChange={(e) => setShowAnswersAfter(e.target.checked)} className="w-4 h-4 rounded-md accent-indigo-500" />
                Show Answers After Submit
             </label>
             <div className="flex items-center gap-4">
                <label className="flex items-center gap-2.5 font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={negativeMarking} onChange={(e) => setNegativeMarking(e.target.checked)} className="w-4 h-4 rounded-md accent-indigo-500" />
                  Negative Marking
                </label>
                {negativeMarking && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400">-</span>
                    <input type="number" step="0.1" min="0" value={negativeMarks} onChange={(e) => setNegativeMarks(e.target.value)} className="soft-input w-20 py-1 px-2 text-sm" placeholder="0.5" />
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400">marks</span>
                    <button
                      type="button"
                      onClick={() => { const val = parseFloat(negativeMarks) || 0; setQuestions(qs => qs.map(q => ({ ...q, negativeMarks: val }))); showAlert('Applied', `Set −${val} negative marks on all ${questions.length} questions.`, 'success'); }}
                      className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Apply to all
                    </button>
                  </div>
                )}
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div>
            <div className="soft-card p-5 sticky top-24">
              <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-3">Questions ({questions.length})</h4>
              <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                {questions.map((qItem, index) => (
                  <button key={qItem.id} onClick={() => setCurrentQuestion(index)}
                    className={`w-full text-left p-3 rounded-xl font-medium transition-all duration-200 ${
                      currentQuestion === index ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Q{index + 1}</span>
                      <span className="text-xs uppercase opacity-70">
                        {qItem.type === 'mcq-single' ? 'MCQ' : qItem.type === 'mcq-multiple' ? 'Multi' : qItem.type === 'coding' ? 'Code' : 'Short'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  { type: 'mcq-single', label: 'MCQ (Single)', color: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/25' },
                  { type: 'mcq-multiple', label: 'MCQ (Multiple)', color: 'bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/25' },
                  { type: 'short', label: 'Short Answer', color: 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/25' },
                  { type: 'coding', label: 'Coding', color: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/25' }
                ].map(b => (
                  <button key={b.type} onClick={() => addQuestion(b.type)}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${b.color}`}>
                    <Plus size={16} weight="bold" />{b.label}
                  </button>
                ))}
              </div>
              {/* Excel Import / Export */}
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Bulk Import</p>
                <button
                  onClick={handleDownloadQuizTemplate}
                  className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/25"
                >
                  <DownloadSimple size={15} weight="bold" /> Template (.xlsx)
                </button>
                <button
                  onClick={() => importQuizRef.current?.click()}
                  className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 hover:bg-indigo-100"
                >
                  <UploadSimple size={15} weight="bold" /> Import Questions
                </button>
                <input
                  ref={importQuizRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportQuizExcel}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Main Question Editor */}
          <div className="lg:col-span-3">
            {questions.length === 0 ? (
              <div className="soft-card p-16 text-center">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus size={32} weight="duotone" className="text-slate-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">No Questions Yet</h3>
                <p className="text-slate-400 mb-8 max-w-sm mx-auto">Start building your quiz by adding a question type below.</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button onClick={() => addQuestion('mcq-single')} className="btn-primary text-sm flex items-center gap-1"><Plus size={14}/> MCQ (Single)</button>
                  <button onClick={() => addQuestion('mcq-multiple')} className="btn-secondary text-sm flex items-center gap-1 !text-purple-600 dark:!text-purple-400 border border-purple-200 dark:border-purple-500/20 hover:bg-purple-50 dark:hover:bg-purple-500/10 !bg-transparent dark:!bg-transparent"><Plus size={14}/> MCQ (Multiple)</button>
                  <button onClick={() => addQuestion('short')} className="btn-secondary text-sm flex items-center gap-1 !text-amber-600 dark:!text-amber-400 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-50 dark:hover:bg-amber-500/10 !bg-transparent dark:!bg-transparent"><Plus size={14}/> Short Answer</button>
                  <button onClick={() => addQuestion('coding')} className="btn-secondary text-sm flex items-center gap-1 !text-emerald-600 dark:!text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 !bg-transparent dark:!bg-transparent"><Plus size={14}/> Coding</button>
                </div>
              </div>
            ) : (
              <div className="soft-card p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Question {currentQuestion + 1} of {questions.length}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`soft-badge text-xs uppercase ${
                        q?.type === 'mcq-single' ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600' :
                        q?.type === 'mcq-multiple' ? 'bg-purple-50 text-purple-600' :
                        q?.type === 'coding' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {q?.type === 'mcq-single' ? 'MCQ (Single)' : q?.type === 'mcq-multiple' ? 'MCQ (Multiple)' : q?.type === 'coding' ? 'Coding' : 'Short Answer'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => duplicateQuestion(currentQuestion)} className="p-2.5 rounded-full bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 text-slate-500 dark:text-slate-400 transition-colors">
                      <Copy size={18} weight="duotone" />
                    </button>
                    <button onClick={() => deleteQuestion(currentQuestion)}
                      className="p-2.5 rounded-full bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                      <Trash size={18} weight="duotone" />
                    </button>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Question</label>
                  <textarea value={q?.text || ''}
                    onChange={(e) => { const nq = [...questions]; nq[currentQuestion].text = e.target.value; setQuestions(nq); }}
                    placeholder="Enter your question here..." rows="4" className="soft-input w-full resize-none" />
                </div>

                {(q?.type === 'mcq-single' || q?.type === 'mcq-multiple') && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                        Options {q.type === 'mcq-multiple' && <span className="text-purple-600">(Select multiple correct answers)</span>}
                      </label>
                      <button onClick={addOption} className="btn-ghost !py-1.5 !px-3 text-xs flex items-center gap-1">
                        <Plus size={14} weight="bold" /> Add Option
                      </button>
                    </div>
                    <div className="space-y-3">
                      {q.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-3">
                          {q.type === 'mcq-single' ? (
                            <input type="radio" name={`correct-${currentQuestion}`} checked={q.correctAnswer === index}
                              onChange={() => { const nq = [...questions]; nq[currentQuestion].correctAnswer = index; setQuestions(nq); }}
                              className="w-5 h-5 accent-indigo-500 cursor-pointer" />
                          ) : (
                            <input type="checkbox" checked={(q.correctAnswers || []).includes(index)}
                              onChange={() => toggleMultipleAnswer(index)}
                              className="w-5 h-5 accent-purple-500 rounded cursor-pointer" />
                          )}
                          <input type="text" value={option}
                            onChange={(e) => { const nq = [...questions]; nq[currentQuestion].options[index] = e.target.value; setQuestions(nq); }}
                            placeholder={`Option ${String.fromCharCode(65 + index)}`} className="soft-input flex-1" />
                          {q.options.length > 2 && (
                            <button onClick={() => removeOption(index)} className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                              <X size={16} weight="bold" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {q?.type === 'coding' && (
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Programming Language</label>
                      <select value={q.language} onChange={(e) => { const nq = [...questions]; nq[currentQuestion].language = e.target.value; setQuestions(nq); }} className="soft-input w-full">
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                        <option value="c">C</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Starter Code <span className="text-slate-300 dark:text-slate-600 normal-case">(pre-filled in editor)</span></label>
                      <textarea value={q.starter_code || ''} onChange={(e) => { const nq = [...questions]; nq[currentQuestion].starter_code = e.target.value; setQuestions(nq); }}
                        placeholder="# Write your solution here" rows="4" className="soft-input w-full resize-none font-mono text-sm" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Test Input <span className="text-slate-300 dark:text-slate-600 normal-case">(stdin)</span></label>
                        <textarea value={q.test_input || ''} onChange={(e) => { const nq = [...questions]; nq[currentQuestion].test_input = e.target.value; setQuestions(nq); }}
                          placeholder="5 3" rows="3" className="soft-input w-full resize-none font-mono text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-emerald-500 mb-2">Expected Output <span className="text-emerald-400/70 normal-case">(auto-grade key)</span></label>
                        <textarea value={q.expected_output || ''} onChange={(e) => { const nq = [...questions]; nq[currentQuestion].expected_output = e.target.value; setQuestions(nq); }}
                          placeholder="8" rows="3" className="soft-input w-full resize-none font-mono text-sm border-emerald-200 dark:border-emerald-800 focus:border-emerald-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Test Cases <span className="text-slate-300 dark:text-slate-600 normal-case">(documentation / reference)</span></label>
                      <textarea value={q.testCases || ''} onChange={(e) => { const nq = [...questions]; nq[currentQuestion].testCases = e.target.value; setQuestions(nq); }}
                        placeholder={'Example:\nInput: [1, 2, 3]\nOutput: 6\n\nInput: [4, 5, 6]\nOutput: 15'} rows="4" className="soft-input w-full resize-none font-mono text-sm" />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Marks</label>
                    <input type="number" value={q?.marks} onChange={(e) => { const nq = [...questions]; nq[currentQuestion].marks = parseInt(e.target.value) || 0; setQuestions(nq); }} min="1" className="soft-input w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Negative Marks</label>
                    <input type="number" step="0.1" min="0" value={q?.negativeMarks ?? 0} onChange={(e) => { const nq = [...questions]; nq[currentQuestion].negativeMarks = parseFloat(e.target.value) || 0; setQuestions(nq); }} className="soft-input w-full" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <AlertModal
        open={alertModal.open}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
        onConfirm={closeAlert}
        onCancel={closeAlert}
      />
    </div>
  );
};

export default QuizBuilder;
