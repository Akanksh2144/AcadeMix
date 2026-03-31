# College Quiz Portal - Development Style Guide

## 📋 Project Overview

**Repository**: Quiz-and-results  
**Type**: Full-stack College Quiz Platform & Results Portal  
**Tech Stack**: React + FastAPI + MongoDB  
**Design Philosophy**: Smooth, rounded, pastel aesthetic - calm and approachable

---

## 🏗️ Architecture

### Frontend Structure
```
/frontend/src/
├── components/          # Reusable components
│   ├── ui/             # Shadcn UI primitives (accordion, button, card, etc.)
│   └── *.js            # Custom components (StudentResultsSearch)
├── pages/              # Page components (dashboards, quiz pages)
├── services/           # API layer
│   └── api.js          # Axios instance + API endpoints
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── App.js              # Main app with routing logic
└── index.css           # Global styles + Tailwind
```

### Backend Structure
```
/backend/
├── server.py           # Monolithic FastAPI server (1185 lines)
│   ├── App & DB Setup
│   ├── Helper Functions
│   ├── Pydantic Models
│   ├── Auth Routes
│   ├── User Routes
│   ├── Quiz Routes
│   ├── Marks Routes
│   ├── Faculty Routes
│   ├── Exam Cell Routes
│   ├── Dashboard Routes
│   ├── Code Execution
│   └── Seed Data
├── requirements.txt    # Python dependencies
└── tests/             # Pytest test files
```

---

## 🎨 Design System

### Color Palette
```css
Background:      #F8FAFC
Surface:         #FFFFFF
Primary:         #6366F1 (Indigo-500)
Primary Hover:   #4F46E5 (Indigo-600)
Primary Light:   #E0E7FF
Secondary:       #14B8A6 (Teal)
Success:         #10B981 (Emerald)
Warning:         #F59E0B (Amber)
Error:           #EF4444 (Red)
Text Primary:    #0F172A (Slate-900)
Text Secondary:  #64748B (Slate-500)
Border:          #F1F5F9 (Slate-100)
```

### Typography
- **Headings**: Nunito (font-extrabold, font-bold)
- **Body**: DM Sans (font-medium, leading-relaxed)
- **Code**: JetBrains Mono
- **Hierarchy**:
  - H1: `text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900`
  - H2: `text-2xl sm:text-3xl font-bold tracking-tight text-slate-800`
  - H3: `text-xl sm:text-2xl font-bold text-slate-800`
  - H4: `text-lg font-semibold text-slate-700`
  - Body: `text-base font-medium text-slate-600 leading-relaxed`
  - Label: `text-xs font-bold uppercase tracking-widest text-slate-500`

### Icons
- **Library**: @phosphor-icons/react
- **Weight**: duotone
- **Usage**: `<BookOpen size={24} weight="duotone" className="text-indigo-500" />`

### Spacing
- **Card Padding**: `p-6` or `p-8`
- **Grid Gaps**: `gap-6` or `gap-8`
- **Section Spacing**: `py-12` or `py-20`
- **Philosophy**: Generous spacing, let components breathe

### Border Radius
- **Large Cards**: `rounded-3xl`
- **Buttons/Inputs**: `rounded-2xl`
- **Icons/Badges**: `rounded-xl` or `rounded-full`
- **⚠️ NEVER use sharp corners (rounded-none or default)**

### Shadows
```css
/* Soft ambient shadow for cards */
shadow-[0_8px_30px_rgb(0,0,0,0.04)]

/* Hover state shadow */
shadow-[0_20px_40px_rgb(0,0,0,0.08)]

/* Small shadow for buttons */
shadow-sm
```

---

## 💅 CSS Patterns

### Custom Utility Classes (index.css)
```css
.soft-card              /* White card with soft shadow */
.soft-card-hover        /* Card with hover lift effect */
.btn-primary            /* Indigo button */
.btn-secondary          /* Indigo light button */
.btn-ghost              /* Slate light button */
.soft-input             /* Rounded input with focus ring */
.soft-badge             /* Small rounded badge */
.glass-header           /* Frosted glass header */
.pill-tab               /* Pill-style tab button */
.pill-tab-active        /* Active pill tab */
.pill-tab-inactive      /* Inactive pill tab */
```

### Common Patterns
```jsx
// Card with hover effect
<div className="soft-card-hover p-6">...</div>

// Primary button
<button className="btn-primary">Click Me</button>

// Glass header (sticky top navigation)
<header className="glass-header">...</header>

// Stats card with icon
<div className="soft-card-hover p-6">
  <div className="flex items-center justify-between mb-4">
    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
      Label
    </span>
    <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl">
      <Icon size={20} weight="duotone" />
    </div>
  </div>
  <p className="text-3xl font-extrabold tracking-tight text-slate-900">
    Value
  </p>
</div>

// Progress bar
<div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
  <div className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 rounded-full" 
       style={{ width: '75%' }}>
  </div>
</div>

// Badge
<span className="soft-badge bg-indigo-50 text-indigo-600">Active</span>
```

---

## ⚛️ Frontend Code Style

### Component Structure
```jsx
import React, { useState, useEffect } from 'react';
import { Icon1, Icon2 } from '@phosphor-icons/react';
import { someAPI } from '../services/api';

const ComponentName = ({ navigate, user, onLogout }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await someAPI.fetch();
        setData(data);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Early return for loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="glass-header">...</header>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">...</div>
    </div>
  );
};

export default ComponentName;
```

### Naming Conventions
- **Components**: PascalCase (`StudentDashboard.js`)
- **Variables/Functions**: camelCase (`fetchData`, `userName`)
- **Constants**: UPPER_SNAKE_CASE (`ROLE_DASHBOARD`)
- **CSS Classes**: kebab-case (`soft-card-hover`)
- **Data Attributes**: kebab-case (`data-testid="login-button"`)

### State Management
- Use `useState` for local component state
- Props drilling for navigation and user data
- API calls in `useEffect` with try-catch
- Store auth token in localStorage
- No Redux/Context (uses simple prop passing)

### Navigation Pattern
```jsx
// App.js maintains currentPage state
const [currentPage, setCurrentPage] = useState('login');

// Navigate function passed to all pages
const navigate = (page, data = null) => {
  setCurrentPage(page);
  if (data) setSelectedData(data);
};

// Usage in components
<button onClick={() => navigate('quiz-attempt', quizData)}>
  Start Quiz
</button>
```

### Testing Attributes
**ALWAYS add `data-testid` to interactive elements:**
```jsx
<button data-testid="login-button" onClick={handleLogin}>Login</button>
<div data-testid="stat-card-cgpa">...</div>
<input data-testid="college-id-input" />
```

---

## 🔧 Backend Code Style

### FastAPI Patterns

#### Route Structure
```python
@app.post("/api/resource")
async def create_resource(
    req: RequestModel, 
    user: dict = Depends(get_current_user)
):
    # Validation
    # Business logic
    # Database operations
    return serialize_doc(result)
```

#### Role-Based Protection
```python
# Single role
@app.get("/api/admin/stats")
async def admin_stats(user: dict = Depends(require_role("admin"))):
    ...

# Multiple roles
@app.get("/api/users")
async def list_users(
    user: dict = Depends(require_role("admin", "teacher"))
):
    ...
```

#### Error Handling
```python
# Not found
if not user:
    raise HTTPException(status_code=404, detail="User not found")

# Validation error
if len(req.code) > 10000:
    raise HTTPException(status_code=400, detail="Code too long")

# Unauthorized
if user["role"] not in roles:
    raise HTTPException(status_code=403, detail="Insufficient permissions")
```

#### MongoDB Patterns
```python
# Find one
user = await db.users.find_one({"college_id": college_id})

# Insert
result = await db.users.insert_one(doc)

# Update
await db.users.update_one(
    {"_id": ObjectId(user_id)}, 
    {"$set": {"name": new_name}}
)

# Delete
await db.users.delete_one({"_id": ObjectId(user_id)})

# List with filter
users = await db.users.find(query).sort("created_at", -1).to_list(100)

# Serialize before returning
return [serialize_doc(u) for u in users]
```

#### Pydantic Models
```python
class ResourceCreate(BaseModel):
    title: str
    description: str = ""
    count: int = 0
    active: bool = True
    tags: list = []
```

### Helper Functions
```python
# ObjectId to string conversion
def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id"))
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            doc[k] = str(v)
        elif isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc

# Password hashing
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
```

---

## 📡 API Layer (services/api.js)

### Structure
```javascript
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Token management
let authToken = null;

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export const setAuthToken = (token) => { authToken = token; };
export const clearAuthToken = () => { authToken = null; };

// API modules
export const authAPI = {
  login: (college_id, password) => api.post('/api/auth/login', { college_id, password }),
  me: () => api.get('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
};

export const quizzesAPI = {
  list: (status) => api.get('/api/quizzes', { params: status ? { status } : {} }),
  get: (id) => api.get(`/api/quizzes/${id}`),
  create: (data) => api.post('/api/quizzes', data),
};
```

### Usage Pattern
```javascript
// In component
import { quizzesAPI } from '../services/api';

const fetchQuizzes = async () => {
  try {
    const { data } = await quizzesAPI.list('active');
    setQuizzes(data);
  } catch (err) {
    console.error(err);
  }
};
```

---

## 🎯 Key Features & Patterns

### Authentication Flow
1. Login → Store token in localStorage + set as cookie
2. App.js checks auth on mount via `/api/auth/me`
3. Navigate to role-specific dashboard
4. Logout → Clear token + cookies + redirect to login

### Role-Based Routing
```javascript
const ROLE_DASHBOARD = {
  student: 'student-dashboard',
  teacher: 'teacher-dashboard',
  admin: 'admin-dashboard',
  hod: 'hod-dashboard',
  exam_cell: 'examcell-dashboard',
};
```

### Loading States
```jsx
if (loading) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
```

### Empty States
```jsx
{items.length === 0 && (
  <div className="soft-card p-8 text-center">
    <p className="text-slate-400 font-medium">No items found</p>
  </div>
)}
```

### Code Execution (Backend)
```python
# Supports Python, JavaScript, Java
# Uses subprocess with timeout (10s)
# Temporary directory for execution
# Returns { output, error, exit_code }
```

### Anti-Cheat Features
- Tab-switch detection (`visibilitychange` event)
- Fullscreen lock (`requestFullscreen`)
- Webcam monitoring (`getUserMedia`)
- Violation tracking in database

---

## 📦 Dependencies

### Frontend (package.json)
```json
{
  "react": "^19.0.0",
  "axios": "^1.14.0",
  "@phosphor-icons/react": "^2.1.10",
  "@monaco-editor/react": "^4.7.0",
  "@radix-ui/*": "Various shadcn primitives",
  "recharts": "^3.8.1",
  "react-router-dom": "^7.5.1",
  "tailwindcss": "^3.4.17"
}
```

### Backend (requirements.txt)
```txt
fastapi==0.110.1
motor==3.3.1 (MongoDB async driver)
bcrypt==4.1.3
PyJWT==2.12.1
python-dotenv==1.2.2
python-multipart==0.0.22
openpyxl==3.1.5 (Excel files)
pandas==3.0.1
```

---

## 🌍 Environment Variables

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=quizportal
JWT_SECRET=your-secret-key-here
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=*
ADMIN_COLLEGE_ID=A001
ADMIN_PASSWORD=admin123
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## ✅ Code Quality Rules

### DO:
- ✅ Use `soft-card-hover` for interactive cards
- ✅ Add `data-testid` to all buttons, inputs, cards
- ✅ Use `rounded-2xl` or `rounded-3xl` (never sharp corners)
- ✅ Use Phosphor icons in duotone weight
- ✅ Apply generous spacing (p-6, gap-6, py-8)
- ✅ Use `async/await` for all async operations
- ✅ Serialize MongoDB docs before returning
- ✅ Use `useEffect` cleanup for subscriptions
- ✅ Handle loading and error states
- ✅ Use `try-catch` in async functions
- ✅ Validate user input with Pydantic
- ✅ Use role-based access control
- ✅ Store sensitive data in environment variables

### DON'T:
- ❌ Use hard/sharp borders (no `border-2` without rounded corners)
- ❌ Use generic Inter font for headings (use Nunito)
- ❌ Return ObjectId directly from API (always serialize)
- ❌ Hardcode URLs or ports (use env variables)
- ❌ Skip loading states
- ❌ Ignore error handling
- ❌ Use inline styles for complex styling (use Tailwind)
- ❌ Create new utility classes without checking existing ones
- ❌ Mix synchronous and asynchronous patterns
- ❌ Expose password hashes in API responses

---

## 🧪 Testing

### Testing Protocol (test_result.md)
- Track backend and frontend tasks separately
- Mark tasks as implemented/working/stuck
- Use priority levels (high/medium/low)
- Log status history for debugging
- Testing agent uses this file for test planning

### Backend Testing
```bash
pytest backend/tests/
```

### Frontend Testing
- Uses data-testid attributes
- Playwright for E2E testing
- Test reports in /test_reports/

---

## 📁 Database Schema

### Collections
```javascript
users {
  _id: ObjectId,
  name: string,
  college_id: string (unique, uppercase),
  email: string,
  password_hash: string,
  role: 'student' | 'teacher' | 'admin' | 'hod' | 'exam_cell',
  department: string,
  batch: string,
  section: string,
  created_at: datetime
}

quizzes {
  _id: ObjectId,
  title: string,
  subject: string,
  total_marks: number,
  duration_mins: number,
  questions: array,
  status: 'draft' | 'active',
  created_by: string (user_id),
  ...
}

quiz_attempts {
  _id: ObjectId,
  quiz_id: string,
  student_id: string,
  answers: array,
  score: number,
  submitted_at: datetime,
  ...
}

semester_results {
  _id: ObjectId,
  student_id: string,
  semester: number,
  sgpa: float,
  cgpa: float,
  subjects: array,
  ...
}

faculty_assignments {
  _id: ObjectId,
  teacher_id: string,
  subject_code: string,
  department: string,
  batch: string,
  section: string,
  ...
}

mark_entries {
  _id: ObjectId,
  assignment_id: string,
  exam_type: 'mid1' | 'mid2',
  entries: array,
  status: 'draft' | 'submitted' | 'approved' | 'rejected',
  ...
}

endterm_entries {
  _id: ObjectId,
  subject_code: string,
  entries: array,
  status: 'draft' | 'published',
  ...
}
```

---

## 🚀 Quick Reference

### Start Development
```bash
# Frontend
cd frontend
yarn install
yarn start

# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

### Common Commands
```bash
# Add Tailwind class
className="soft-card-hover p-6"

# Create API endpoint
export const newAPI = {
  list: () => api.get('/api/resource'),
  create: (data) => api.post('/api/resource', data),
};

# Protect route
@app.get("/api/protected")
async def protected(user: dict = Depends(require_role("admin"))):
    ...
```

### Color Quick Picks
```jsx
// Icon backgrounds
bg-indigo-50 text-indigo-600   // Primary
bg-teal-50 text-teal-500        // Secondary
bg-amber-50 text-amber-600      // Warning
bg-emerald-50 text-emerald-600  // Success
bg-rose-50 text-rose-600        // Danger
bg-purple-50 text-purple-600    // Special
```

---

## 📚 Resources

- **Design Guidelines**: `/app/design_guidelines.json`
- **PRD**: `/app/memory/PRD.md`
- **Test Protocol**: `/app/test_result.md`
- **API Docs**: FastAPI auto-docs at `/docs`

---

## 🎓 Development Philosophy

> **"Smooth, rounded, and approachable"**

Every design decision should prioritize:
1. **Visual Softness**: No harsh lines, generous spacing
2. **User Comfort**: Calm colors, clear hierarchy
3. **Consistency**: Same patterns across all pages
4. **Accessibility**: Clear labels, good contrast
5. **Performance**: Async patterns, loading states

---

*Last Updated: Based on commit 5928b9c*
