import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Terminal, Copy, Trash, CaretDown, Lightning, Clock, CheckCircle, ChartBar, WarningCircle, X, Funnel, ArrowCounterClockwise } from '@phosphor-icons/react';
import Editor from '@monaco-editor/react';
import api from '../services/api';

const LANGUAGES = [
  { id: 'python', label: 'Python', icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg" alt="Python" className="w-5 h-5 shrink-0 drop-shadow-sm" /> },
  { id: 'javascript', label: 'JavaScript', icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg" alt="JavaScript" className="w-5 h-5 shrink-0 rounded-sm drop-shadow-sm" /> },
  { id: 'java', label: 'Java', icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg" alt="Java" className="w-5 h-5 shrink-0 drop-shadow-sm" /> },
  { id: 'c', label: 'C', icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/c/c-original.svg" alt="C" className="w-5 h-5 shrink-0 drop-shadow-sm" /> },
  { id: 'cpp', label: 'C++', icon: <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cplusplus/cplusplus-original.svg" alt="C++" className="w-5 h-5 shrink-0 drop-shadow-sm" /> },
];

const DEFAULT_TEMPLATES = {
  python: '# Write your Python code here\n\ndef main():\n    print("Hello, World!")\n\nmain()\n',
  javascript: '// Write your JavaScript code here\n\nfunction main() {\n  console.log("Hello, World!");\n}\n\nmain();\n',
  java: 'public class Solution {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
  c: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n'
};

const CodePlayground = ({ navigate, user }) => {
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(DEFAULT_TEMPLATES['python']);
  const [stdin, setStdin] = useState('');
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const [execTime, setExecTime] = useState(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  
  const [showChallengesModal, setShowChallengesModal] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState('');
  
  const [history, setHistory] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeChallenge, setActiveChallenge] = useState(null);
  
  // Resizable Pane State
  const [leftWidth, setLeftWidth] = useState(40); // Initial 40% width for left pane
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      let newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      if (newWidth < 20) newWidth = 20;
      if (newWidth > 80) newWidth = 80;
      setLeftWidth(newWidth);
    };
    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging]);

  const editorRef = useRef(null);

  useEffect(() => {
    fetchChallenges();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficultyFilter]);

  const fetchChallenges = async () => {
    try {
      const res = await api.get('/api/challenges', { params: { difficulty: difficultyFilter, limit: 100 } });
      setChallenges(res.data.data);
    } catch(err) { console.error(err); }
  };
  
  const fetchStats = async () => {
    try {
      const res = await api.get('/api/challenges/stats');
      setStats(res.data);
    } catch(err) { console.error(err); }
  };

  const currentLang = LANGUAGES.find(l => l.id === language);

  const handleLanguageChange = (langId) => {
    setLanguage(langId);
    setCode(DEFAULT_TEMPLATES[langId] || '');
    setOutput(null);
    setExecTime(null);
    setShowLangMenu(false);
  };

  const handleRun = async () => {
    if (!code.trim() || running) return;
    setRunning(true);
    setOutput(null);
    const startTime = Date.now();
    try {
      let data = {};
      if (activeChallenge) {
        const res = await api.post('/api/challenges/submit', {
          code,
          language,
          challenge_id: activeChallenge.id
        });
        data = res.data;
        if(data.success) fetchStats(); 
      } else {
        const res = await api.post('/api/code/execute', {
          code,
          language,
          test_input: stdin,
        });
        data = res.data;
      }

      const elapsed = Date.now() - startTime;
      setExecTime(elapsed);
      const result = data.error && data.exit_code !== 0
        ? `Error:\n${data.error}`
        : data.output || '(no output)';
      
      setOutput(result);
      
      if (!activeChallenge) {
        setHistory(prev => [{
          language,
          code: code.substring(0, 100) + (code.length > 100 ? '...' : ''),
          output: result.substring(0, 80),
          time: elapsed,
          timestamp: new Date().toLocaleTimeString(),
          success: data.exit_code === 0,
        }, ...prev].slice(0, 10));
      }

    } catch (err) {
      setOutput(err.response?.data?.detail || 'Execution failed. Please try again.');
      setExecTime(Date.now() - startTime);
    }
    setRunning(false);
  };

  const handleCopyOutput = () => {
    if (output) navigator.clipboard.writeText(output);
  };

  const handleClearOutput = () => {
    setOutput(null);
    setExecTime(null);
  };

  const handleLoadChallenge = (challenge) => {
    setActiveChallenge(challenge);
    setLanguage(challenge.language || 'python');
    setCode(challenge.template_code || DEFAULT_TEMPLATES[challenge.language || 'python']);
    setOutput(null);
    setExecTime(null);
    setShowChallengesModal(false);
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };

  const dashboardPage = user?.role === 'teacher' ? 'teacher-dashboard' : user?.role === 'admin' ? 'admin-dashboard' : 'student-dashboard';

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC]">
      <header className="glass-header shrink-0">
        <div className="w-full max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button data-testid="back-button" onClick={() => navigate(dashboardPage)}
                className="p-2.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-500 transition-colors" aria-label="Go back">
                <ArrowLeft size={22} weight="duotone" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Terminal size={22} weight="duotone" className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Code Playground</h1>
                  <p className="text-xs font-medium text-slate-400">Practice coding algorithms & data structures</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowInsightsModal(true)}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 !px-4 !py-2.5 text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                <ChartBar size={16} weight="duotone" />
                Insights
              </button>
              <button
                data-testid="challenges-button"
                onClick={() => setShowChallengesModal(true)}
                className="btn-primary !px-4 !py-2.5 text-sm flex items-center gap-2"
              >
                <Lightning size={16} weight="duotone" />
                Problem List
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      {activeChallenge ? (
        // Split-pane layout for selected challenge
        <div className="flex-1 overflow-hidden p-6 flex" ref={containerRef}>
          {/* Left Side: Question Description */}
          <div style={{ width: `calc(${leftWidth}% - 12px)` }} className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 line-clamp-1 flex-1 mr-4">{activeChallenge.title}</h2>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded border font-bold ${activeChallenge.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : activeChallenge.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                  {activeChallenge.difficulty}
                </span>
                <button onClick={() => setActiveChallenge(null)} className="text-sm font-bold text-slate-400 hover:text-slate-600" title="Exit Challenge">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-5 flex-1 overflow-y-auto custom-scrollbar prose prose-sm max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: activeChallenge.description }}></div>
          </div>

          {/* Splitter / Resizer */}
          <div 
            className="w-6 shrink-0 flex flex-col justify-center items-center cursor-col-resize group z-10"
            onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
            title="Drag to resize panels"
          >
            <div className={`h-16 w-1 rounded-full transition-colors ${isDragging ? 'bg-indigo-500' : 'bg-slate-200 group-hover:bg-indigo-300'}`}></div>
          </div>

          {/* Right Side: Code Editor (Top) & Output (Bottom) */}
          <div style={{ width: `calc(${100 - leftWidth}% - 12px)` }} className="flex flex-col h-full gap-6 relative">
            {/* Editor Container */}
            <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[50%]">
              <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center justify-between">
                <div className="relative">
                  <button onClick={() => setShowLangMenu(!showLangMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors font-semibold text-sm text-slate-700">
                    <span className="text-lg leading-none">{currentLang?.icon}</span>
                    {currentLang?.label}
                    <CaretDown size={14} weight="bold" />
                  </button>
                  {showLangMenu && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50 min-w-[160px]">
                      {LANGUAGES.map(lang => (
                        <button key={lang.id} onClick={() => handleLanguageChange(lang.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors text-sm font-medium ${language === lang.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                          <span className="text-lg leading-none">{lang.icon}</span>
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setCode(DEFAULT_TEMPLATES[language] || ''); setOutput(null); }} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors" title="Reset Code">
                    <ArrowCounterClockwise size={18} weight="duotone" />
                  </button>
                  <button onClick={handleRun} disabled={running} className="btn-primary !px-4 !py-1.5 text-sm flex items-center gap-2 disabled:opacity-60 shadow-none">
                    {running ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Play size={16} weight="fill" />}
                    Run
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <Editor
                  height="100%"
                  language={language}
                  value={code}
                  onChange={(val) => setCode(val || '')}
                  onMount={handleEditorMount}
                  theme="vs-light"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 16, bottom: 16 },
                    tabSize: language === 'python' ? 4 : 2,
                    wordWrap: 'on'
                  }}
                />
              </div>
            </div>

            {/* Output Container */}
            <div className="h-1/3 min-h-[200px] shrink-0 flex flex-col bg-slate-900 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-slate-800/80 px-5 py-2.5 flex items-center justify-between border-b border-slate-700/50">
                <div className="flex items-center gap-2 text-slate-300">
                  <Terminal size={18} weight="duotone" />
                  <span className="text-xs font-bold uppercase tracking-wider">Test Results</span>
                </div>
                 <div className="flex items-center gap-2 text-slate-400">
                   {execTime && <span className="text-xs mr-2 border-r border-slate-700 pr-4">{execTime}ms</span>}
                   {output && (
                     <button onClick={handleClearOutput} className="hover:text-white transition-colors" title="Clear console">
                       <span className="text-xs uppercase font-bold tracking-wider">Clear</span>
                     </button>
                   )}
                 </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar text-slate-300 font-mono text-sm layout-console">
                 {running ? (
                    <div className="flex items-center gap-3 animate-pulse">
                       <div className="w-2 h-4 bg-indigo-500 animate-bounce"></div>
                       <span className="text-slate-400">Evaluating your solution against test cases...</span>
                    </div>
                 ) : output !== null ? (
                    <pre className="whitespace-pre-wrap">{output}</pre>
                 ) : (
                    <div className="text-slate-500 italic">Code output will appear here.</div>
                 )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Original layout (Grid) for ad-hoc coding (No challenge active)
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6 lg:h-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-full">
              {/* Left Column: Editor Panel */}
              <div className="lg:col-span-2 flex flex-col space-y-4">
                <div className="soft-card p-3 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <button data-testid="language-selector" onClick={() => setShowLangMenu(!showLangMenu)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors font-bold text-sm text-slate-700">
                        <span className="text-base">{currentLang?.icon}</span>
                        {currentLang?.label}
                        <CaretDown size={14} weight="bold" />
                      </button>
                      {showLangMenu && (
                        <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 min-w-[180px]">
                          {LANGUAGES.map(lang => (
                            <button key={lang.id} onClick={() => handleLanguageChange(lang.id)}
                              className={`w-full text-left px-4 py-2.5 rounded-xl flex items-center gap-3 transition-colors text-sm font-medium ${language === lang.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}>
                              <span className="text-base">{lang.icon}</span>
                              {lang.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setCode(DEFAULT_TEMPLATES[language] || ''); setOutput(null); }}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors" title="Reset to template">
                      <ArrowCounterClockwise size={18} weight="duotone" />
                    </button>
                    <button onClick={handleRun} disabled={running}
                      className="btn-primary !px-5 !py-2.5 text-sm flex items-center gap-2 disabled:opacity-60">
                      {running ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Play size={16} weight="fill" />}
                      {running ? 'Running...' : 'Run Code'}
                    </button>
                  </div>
                </div>

                <div className="soft-card overflow-hidden flex-1 min-h-[400px]">
                  <Editor
                    height="100%"
                    language={language}
                    value={code}
                    onChange={(val) => setCode(val || '')}
                    onMount={handleEditorMount}
                    theme="vs-light"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      padding: { top: 16, bottom: 16 },
                      tabSize: language === 'python' ? 4 : 2,
                      wordWrap: 'on',
                      smoothScrolling: true,
                    }}
                  />
                </div>

                <div className="soft-card p-4 shrink-0">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">Standard Input (stdin)</label>
                  <textarea value={stdin} onChange={(e) => setStdin(e.target.value)}
                    placeholder="Enter input for your program here..."
                    rows="3" className="soft-input w-full resize-none text-sm font-mono" />
                </div>
              </div>

              {/* Right Column: Output & History Panel */}
              <div className="space-y-4 flex flex-col lg:h-full lg:overflow-hidden pb-10 lg:pb-0">
                <div className="soft-card flex flex-col flex-1 min-h-[300px]">
                  <div className="p-5 pb-3 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <Terminal size={18} weight="duotone" className="text-slate-500" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Output</h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {output && (
                        <>
                          <button onClick={handleCopyOutput} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors" title="Copy output">
                            <Copy size={16} weight="duotone" />
                          </button>
                          <button onClick={handleClearOutput} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors" title="Clear output">
                            <Trash size={16} weight="duotone" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="px-5 pb-5 flex-1 overflow-hidden flex flex-col">
                    <div className="bg-slate-900 rounded-2xl p-4 flex-1 overflow-y-auto">
                      {running ? (
                        <div className="flex items-center gap-3 text-slate-400">
                          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm font-medium">Executing code...</span>
                        </div>
                      ) : output !== null ? (
                        <pre className="text-sm text-slate-200 font-mono whitespace-pre-wrap">{output}</pre>
                      ) : (
                        <p className="text-sm text-slate-500 font-medium">Click "Run Code" to see output here</p>
                      )}
                    </div>
                    {execTime !== null && (
                      <div className="flex items-center gap-2 mt-3 text-xs font-medium text-slate-400">
                        <Clock size={14} weight="duotone" />
                        <span>Executed in {execTime}ms</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="soft-card flex flex-col h-[280px] shrink-0">
                  <div className="p-5 pb-3 shrink-0">
                     <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Run History</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2 custom-scrollbar">
                    {history.length === 0 ? (
                      <p className="text-sm text-slate-400 font-medium py-2">No runs yet. Start coding!</p>
                    ) : (
                      history.map((h, i) => (
                        <div key={i} className="p-3 rounded-xl bg-slate-50 flex items-start gap-3">
                          <div className={`mt-0.5 ${h.success ? 'text-emerald-500' : 'text-red-500'}`}>
                            <CheckCircle size={16} weight={h.success ? 'fill' : 'duotone'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-bold text-slate-600">{LANGUAGES.find(l => l.id === h.language)?.label || 'Lang'}</span>
                              <span className="text-xs text-slate-400">{h.timestamp}</span>
                            </div>
                            <p className="text-xs text-slate-500 font-mono truncate">{h.output}</p>
                          </div>
                          <span className="text-xs font-medium text-slate-400 whitespace-nowrap">{h.time}ms</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals Code Omitted for brevity: Challenges Modal & Insights Modal ... */}
      {/* Constraints & Modals */}

      {/* Challenges Modal */}
      {showChallengesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in" onClick={() => setShowChallengesModal(false)}>
          <div className="w-full max-w-4xl max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                   <Lightning size={20} weight="fill" />
                 </div>
                 <h2 className="text-xl font-bold text-slate-800">Problem List</h2>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
                   <Funnel size={16} className="text-slate-400" />
                   <select className="bg-transparent border-none outline-none text-sm font-semibold text-slate-700 cursor-pointer"
                     value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)}>
                     <option value="">All Difficulties</option>
                     <option value="Easy">Easy</option>
                     <option value="Medium">Medium</option>
                     <option value="Hard">Hard</option>
                   </select>
                </div>
                <button onClick={() => setShowChallengesModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
               {challenges.length === 0 ? (
                 <div className="py-20 text-center text-slate-500">
                    Loading problems...
                 </div>
               ) : (
                 <div className="divide-y divide-slate-100">
                   {challenges.map((ch, i) => (
                     <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => handleLoadChallenge(ch)}>
                        <div className="flex-1 pr-6">
                           <div className="flex items-center gap-3 mb-1">
                             <h4 className="text-[15px] font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{ch.title}</h4>
                             <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${ch.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : ch.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                               {ch.difficulty}
                             </span>
                           </div>
                           <div className="flex gap-2 text-xs text-slate-400 mt-2 truncate">
                              {ch.topics?.slice(0, 3).map(t => <span key={t} className="bg-slate-100 px-2 py-0.5 rounded">{t}</span>)}
                           </div>
                        </div>
                        <button className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                           Solve
                        </button>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Insights Modal */}
      {showInsightsModal && stats && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in" onClick={() => setShowInsightsModal(false)}>
           <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
             <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
               <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                 <ChartBar className="text-indigo-500 text-2xl" weight="duotone" />
                 My Insights
               </h2>
               <button onClick={() => setShowInsightsModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                 <X size={24} />
               </button>
             </div>
             <div className="p-8 flex flex-col md:flex-row gap-8">
               <div className="flex-1">
                 <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                   <CheckCircle size={20} weight="fill" className="text-emerald-500" />
                   Overall Progress
                 </h3>
                 <div className="flex items-center gap-6">
                   <div className="relative w-28 h-28 flex items-center justify-center bg-white rounded-full border-8 border-slate-50 shadow-inner">
                     <div className="text-center">
                       <span className="block text-2xl font-black text-indigo-600">{stats.total_solved}</span>
                       <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Solved</span>
                     </div>
                     <svg className="absolute inset-0 w-full h-full -rotate-90">
                       <circle cx="56" cy="56" r="48" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-emerald-500" strokeDasharray="301" strokeDashoffset={301 - (stats.total_solved * 3)} />
                     </svg>
                   </div>
                   <div className="flex-1 space-y-4">
                     {['Easy', 'Medium', 'Hard'].map(diff => (
                       <div key={diff}>
                         <div className="flex justify-between text-xs mb-1 font-bold">
                           <span className={diff === 'Easy' ? 'text-emerald-500' : diff === 'Medium' ? 'text-amber-500' : 'text-rose-500'}>{diff}</span>
                           <span className="text-slate-500">{stats.difficulty[diff] || 0}</span>
                         </div>
                         <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                           <div className={`h-full rounded-full ${diff === 'Easy' ? 'bg-emerald-500' : diff === 'Medium' ? 'bg-amber-500' : 'bg-rose-500'}`} style={{width: `${Math.min(((stats.difficulty[diff] || 0) / 20) * 100, 100)}%`}}></div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
               {stats.topics && Object.keys(stats.topics).length > 0 && (
                 <div className="w-[250px] border-l border-slate-100 pl-8">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Strong Topics</h3>
                   <div className="flex flex-col gap-2">
                     {Object.entries(stats.topics).map(([topic, count]) => (
                       <div key={topic} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                         <span className="text-sm font-semibold text-slate-700">{topic}</span>
                         <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
             </div>
           </div>
         </div>
      )}
    </div>
  );
};

export default CodePlayground;
