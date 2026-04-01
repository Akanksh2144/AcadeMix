import React, { useState, useRef } from 'react';
import { ArrowLeft, Play, Terminal, Copy, Trash, CaretDown, Lightning, Clock, CheckCircle } from '@phosphor-icons/react';
import Editor from '@monaco-editor/react';
import api from '../services/api';

const LANGUAGES = [
  { id: 'python', label: 'Python', icon: '🐍', template: '# Write your Python code here\n\ndef main():\n    print("Hello, World!")\n\nmain()\n' },
  { id: 'javascript', label: 'JavaScript', icon: 'JS', template: '// Write your JavaScript code here\n\nfunction main() {\n  console.log("Hello, World!");\n}\n\nmain();\n' },
  { id: 'java', label: 'Java', icon: '☕', template: 'public class Solution {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n' },
  { id: 'c', label: 'C', icon: 'C', template: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n' },
  { id: 'cpp', label: 'C++', icon: 'C+', template: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n' },
];

const CHALLENGES = [
  { title: 'Two Sum', difficulty: 'Easy', language: 'python',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    code: '# Two Sum\n# Input: nums = [2, 7, 11, 15], target = 9\n# Output: [0, 1] (because nums[0] + nums[1] == 9)\n\ndef two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n    return []\n\nprint(two_sum([2, 7, 11, 15], 9))\n' },
  { title: 'Reverse String', difficulty: 'Easy', language: 'python',
    description: 'Write a function that reverses a string. The input string is given as an array of characters.',
    code: '# Reverse String\n# Input: s = "hello"\n# Output: "olleh"\n\ndef reverse_string(s):\n    # Write your solution here\n    pass\n\nprint(reverse_string("hello"))\n' },
  { title: 'FizzBuzz', difficulty: 'Easy', language: 'python',
    description: 'Print numbers 1 to n. For multiples of 3 print "Fizz", for multiples of 5 print "Buzz", for both print "FizzBuzz".',
    code: '# FizzBuzz\n# Print 1 to 20 with FizzBuzz rules\n\ndef fizzbuzz(n):\n    for i in range(1, n + 1):\n        if i % 15 == 0:\n            print("FizzBuzz")\n        elif i % 3 == 0:\n            print("Fizz")\n        elif i % 5 == 0:\n            print("Buzz")\n        else:\n            print(i)\n\nfizzbuzz(20)\n' },
  { title: 'Palindrome Check', difficulty: 'Easy', language: 'python',
    description: 'Check if a given string is a palindrome, ignoring case and non-alphanumeric characters.',
    code: '# Palindrome Check\n# Input: "A man, a plan, a canal: Panama"\n# Output: True\n\ndef is_palindrome(s):\n    # Write your solution here\n    pass\n\nprint(is_palindrome("A man, a plan, a canal: Panama"))\n' },
  { title: 'Fibonacci Sequence', difficulty: 'Medium', language: 'python',
    description: 'Generate the first n Fibonacci numbers.',
    code: '# Fibonacci Sequence\n# Generate first 10 Fibonacci numbers\n\ndef fibonacci(n):\n    # Write your solution here\n    pass\n\nprint(fibonacci(10))\n' },
  { title: 'Binary Search', difficulty: 'Medium', language: 'python',
    description: 'Implement binary search to find the index of a target value in a sorted array.',
    code: '# Binary Search\n# Input: nums = [1, 3, 5, 7, 9, 11], target = 7\n# Output: 3\n\ndef binary_search(nums, target):\n    # Write your solution here\n    pass\n\nprint(binary_search([1, 3, 5, 7, 9, 11], 7))\n' },
];

const CodePlayground = ({ navigate, user }) => {
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(LANGUAGES[0].template);
  const [stdin, setStdin] = useState('');
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const [execTime, setExecTime] = useState(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showChallenges, setShowChallenges] = useState(false);
  const [history, setHistory] = useState([]);
  const editorRef = useRef(null);

  const currentLang = LANGUAGES.find(l => l.id === language);

  const handleLanguageChange = (langId) => {
    setLanguage(langId);
    const lang = LANGUAGES.find(l => l.id === langId);
    setCode(lang.template);
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
      const { data } = await api.post('/api/code/execute', {
        code,
        language,
        test_input: stdin,
      });
      const elapsed = Date.now() - startTime;
      setExecTime(elapsed);
      const result = data.error && data.exit_code !== 0
        ? `Error:\n${data.error}`
        : data.output || '(no output)';
      setOutput(result);
      setHistory(prev => [{
        language,
        code: code.substring(0, 100) + (code.length > 100 ? '...' : ''),
        output: result.substring(0, 80),
        time: elapsed,
        timestamp: new Date().toLocaleTimeString(),
        success: data.exit_code === 0,
      }, ...prev].slice(0, 10));
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
    setLanguage(challenge.language);
    setCode(challenge.code);
    setOutput(null);
    setExecTime(null);
    setShowChallenges(false);
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };

  const dashboardPage = user?.role === 'teacher' ? 'teacher-dashboard' : user?.role === 'admin' ? 'admin-dashboard' : 'student-dashboard';

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="glass-header">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
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
                  <p className="text-xs font-medium text-slate-400">Practice coding in Python, JavaScript, Java, C & C++</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                data-testid="challenges-button"
                onClick={() => setShowChallenges(!showChallenges)}
                className="btn-secondary !px-4 !py-2.5 text-sm flex items-center gap-2"
              >
                <Lightning size={16} weight="duotone" />
                Challenges
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Challenges Panel */}
        {showChallenges && (
          <div className="mb-6 soft-card p-6" data-testid="challenges-panel">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Practice Challenges</h3>
              <button onClick={() => setShowChallenges(false)} className="text-sm font-bold text-slate-400 hover:text-slate-600">Close</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CHALLENGES.map((ch, i) => (
                <button key={i} data-testid={`challenge-${i}`}
                  onClick={() => handleLoadChallenge(ch)}
                  className="text-left p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{ch.title}</h4>
                    <span className={`soft-badge ${ch.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {ch.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2">{ch.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor Panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Toolbar */}
            <div className="soft-card p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Language Selector */}
                <div className="relative">
                  <button
                    data-testid="language-selector"
                    onClick={() => setShowLangMenu(!showLangMenu)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors font-bold text-sm text-slate-700"
                  >
                    <span className="text-base">{currentLang?.icon}</span>
                    {currentLang?.label}
                    <CaretDown size={14} weight="bold" />
                  </button>
                  {showLangMenu && (
                    <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 min-w-[180px]" data-testid="language-dropdown">
                      {LANGUAGES.map(lang => (
                        <button key={lang.id} data-testid={`lang-option-${lang.id}`}
                          onClick={() => handleLanguageChange(lang.id)}
                          className={`w-full text-left px-4 py-2.5 rounded-xl flex items-center gap-3 transition-colors text-sm font-medium ${
                            language === lang.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="text-base">{lang.icon}</span>
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  data-testid="clear-code-button"
                  onClick={() => { setCode(currentLang.template); setOutput(null); }}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"
                  title="Reset to template"
                >
                  <Trash size={18} weight="duotone" />
                </button>
                <button
                  data-testid="run-code-button"
                  onClick={handleRun}
                  disabled={running}
                  className="btn-primary !px-5 !py-2.5 text-sm flex items-center gap-2 disabled:opacity-60"
                >
                  {running ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Play size={16} weight="fill" />
                  )}
                  {running ? 'Running...' : 'Run Code'}
                </button>
              </div>
            </div>

            {/* Monaco Editor */}
            <div className="soft-card overflow-hidden" data-testid="code-editor">
              <Editor
                height="460px"
                language={language}
                value={code}
                onChange={(val) => setCode(val || '')}
                onMount={handleEditorMount}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 16, bottom: 16 },
                  tabSize: language === 'python' ? 4 : 2,
                  wordWrap: 'on',
                  renderLineHighlight: 'all',
                  cursorBlinking: 'smooth',
                  smoothScrolling: true,
                }}
              />
            </div>

            {/* Stdin Input */}
            <div className="soft-card p-4">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">Standard Input (stdin)</label>
              <textarea
                data-testid="stdin-input"
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Enter input for your program here..."
                rows="3"
                className="soft-input w-full resize-none text-sm font-mono"
              />
            </div>
          </div>

          {/* Output & History Panel */}
          <div className="space-y-4">
            {/* Output */}
            <div className="soft-card p-5" data-testid="output-panel">
              <div className="flex items-center justify-between mb-3">
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
              <div className="bg-slate-900 rounded-2xl p-4 min-h-[200px] max-h-[400px] overflow-y-auto" data-testid="output-display">
                {running ? (
                  <div className="flex items-center gap-3 text-slate-400">
                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium">Executing...</span>
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

            {/* Run History */}
            <div className="soft-card p-5" data-testid="history-panel">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-3">Run History</h3>
              {history.length === 0 ? (
                <p className="text-sm text-slate-400 font-medium">No runs yet. Start coding!</p>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {history.map((h, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 flex items-start gap-3" data-testid={`history-item-${i}`}>
                      <div className={`mt-0.5 ${h.success ? 'text-emerald-500' : 'text-red-500'}`}>
                        <CheckCircle size={16} weight={h.success ? 'fill' : 'duotone'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-slate-600">{LANGUAGES.find(l => l.id === h.language)?.label}</span>
                          <span className="text-xs text-slate-400">{h.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono truncate">{h.output}</p>
                      </div>
                      <span className="text-xs font-medium text-slate-400 whitespace-nowrap">{h.time}ms</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodePlayground;
