# 🚀 Quick Development Reference
## Quiz Portal - Cheat Sheet

---

## 🎨 Styling Quick Reference

### Colors
```jsx
// Backgrounds
bg-[#F8FAFC]           // Page background
bg-white               // Card background

// Primary
bg-indigo-500          // Buttons, primary actions
text-indigo-600        // Primary text
bg-indigo-50           // Light background

// Secondary
bg-teal-500 text-teal-600
bg-emerald-500 text-emerald-600 // Success
bg-amber-500 text-amber-600     // Warning
bg-rose-500 text-rose-600       // Danger

// Text
text-slate-900         // Headings
text-slate-600         // Body
text-slate-400         // Muted
```

### Common Classes
```jsx
// Cards
className="soft-card p-6"
className="soft-card-hover p-6"

// Buttons
className="btn-primary"
className="btn-secondary"
className="btn-ghost"

// Inputs
className="soft-input"

// Header
className="glass-header"

// Tabs
className="pill-tab pill-tab-active"
className="pill-tab pill-tab-inactive"
```

### Spacing
```jsx
p-6 p-8              // Padding
gap-6 gap-8          // Grid gap
py-8 py-12           // Vertical padding
rounded-2xl          // Buttons, inputs
rounded-3xl          // Cards
```

---

## ⚛️ React Patterns

### Page Component
```jsx
import React, { useState, useEffect } from 'react';
import { Icon } from '@phosphor-icons/react';
import { someAPI } from '../services/api';

const PageName = ({ navigate, user, onLogout }) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="glass-header">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-extrabold">QuizPortal</h1>
          <button onClick={onLogout}>Logout</button>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Content */}
      </div>
    </div>
  );
};

export default PageName;
```

### Stat Card
```jsx
<div className="soft-card-hover p-6" data-testid="stat-card">
  <div className="flex items-center justify-between mb-4">
    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
      CGPA
    </span>
    <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl">
      <Trophy size={20} weight="duotone" />
    </div>
  </div>
  <p className="text-3xl font-extrabold tracking-tight text-slate-900">
    9.2
  </p>
</div>
```

### Button Card
```jsx
<button 
  onClick={() => navigate('page-name')} 
  className="soft-card-hover p-6 text-left flex items-center gap-4 group"
  data-testid="navigate-button"
>
  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
    <BookOpen size={24} weight="duotone" className="text-indigo-500" />
  </div>
  <div>
    <p className="font-extrabold text-slate-900">Title</p>
    <p className="text-sm font-medium text-slate-400">Subtitle</p>
  </div>
</button>
```

### Empty State
```jsx
{items.length === 0 && (
  <div className="soft-card p-8 text-center">
    <p className="text-slate-400 font-medium">No items found</p>
  </div>
)}
```

---

## 🔧 Backend Patterns

### Route with Auth
```python
from fastapi import Depends

@app.get("/api/resource")
async def get_resource(
    user: dict = Depends(get_current_user)
):
    # user is available here
    return {"message": "Success"}
```

### Route with Role Check
```python
@app.post("/api/admin/action")
async def admin_action(
    req: RequestModel,
    user: dict = Depends(require_role("admin"))
):
    # Only admins can access
    return {"message": "Success"}
```

### Pydantic Model
```python
from pydantic import BaseModel
from typing import Optional, List

class ResourceCreate(BaseModel):
    title: str
    description: str = ""
    count: int = 0
    active: bool = True
    tags: List[str] = []
```

### MongoDB CRUD
```python
# Create
doc = {"name": "Test", "created_at": datetime.now(timezone.utc)}
result = await db.collection.insert_one(doc)
doc["_id"] = result.inserted_id

# Read One
item = await db.collection.find_one({"_id": ObjectId(id)})

# Read Many
items = await db.collection.find(query).sort("created_at", -1).to_list(100)

# Update
await db.collection.update_one(
    {"_id": ObjectId(id)},
    {"$set": {"name": "New Name"}}
)

# Delete
await db.collection.delete_one({"_id": ObjectId(id)})

# Always serialize before returning
return serialize_doc(item)
```

### Error Handling
```python
# Not Found
if not resource:
    raise HTTPException(status_code=404, detail="Resource not found")

# Bad Request
if not valid:
    raise HTTPException(status_code=400, detail="Invalid input")

# Unauthorized
raise HTTPException(status_code=401, detail="Not authenticated")

# Forbidden
raise HTTPException(status_code=403, detail="Insufficient permissions")
```

---

## 🌐 API Layer

### Add New API Module
```javascript
// In services/api.js

export const newAPI = {
  list: () => api.get('/api/resources'),
  get: (id) => api.get(`/api/resources/${id}`),
  create: (data) => api.post('/api/resources', data),
  update: (id, data) => api.patch(`/api/resources/${id}`, data),
  delete: (id) => api.delete(`/api/resources/${id}`),
};
```

### Use in Component
```javascript
import { newAPI } from '../services/api';

const fetchData = async () => {
  try {
    const { data } = await newAPI.list();
    setItems(data);
  } catch (err) {
    console.error(err);
  }
};
```

---

## 🎯 Common Tasks

### Add a New Page

**1. Create Page Component**
```jsx
// src/pages/NewPage.js
import React from 'react';

const NewPage = ({ navigate, user }) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="glass-header">...</header>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-4xl font-extrabold text-slate-900 mb-6">
          New Page
        </h2>
      </div>
    </div>
  );
};

export default NewPage;
```

**2. Import in App.js**
```jsx
import NewPage from './pages/NewPage';
```

**3. Add Route**
```jsx
case 'new-page': return <NewPage navigate={navigate} user={user} />;
```

**4. Navigate to Page**
```jsx
<button onClick={() => navigate('new-page')}>Go to New Page</button>
```

---

### Add a New API Endpoint

**1. Backend Route**
```python
# In server.py

class ItemCreate(BaseModel):
    name: str
    description: str = ""

@app.post("/api/items")
async def create_item(
    req: ItemCreate,
    user: dict = Depends(get_current_user)
):
    doc = {
        "name": req.name,
        "description": req.description,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.items.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)

@app.get("/api/items")
async def list_items(user: dict = Depends(get_current_user)):
    items = await db.items.find({}).to_list(100)
    return [serialize_doc(i) for i in items]
```

**2. Frontend API**
```javascript
// In services/api.js

export const itemsAPI = {
  list: () => api.get('/api/items'),
  create: (data) => api.post('/api/items', data),
};
```

**3. Use in Component**
```jsx
const [items, setItems] = useState([]);

const fetchItems = async () => {
  const { data } = await itemsAPI.list();
  setItems(data);
};

const createItem = async () => {
  await itemsAPI.create({ name: "New Item" });
  fetchItems();
};
```

---

## 🗄️ Database Collections

```javascript
users              // User accounts
quizzes            // Quiz definitions
quiz_attempts      // Student attempts
semester_results   // Academic results
faculty_assignments // Teacher assignments
mark_entries       // Mid-term marks
endterm_entries    // End-term marks
```

---

## 🔐 User Roles

```javascript
student      // Take quizzes, view results
teacher      // Create quizzes, enter marks
admin        // User management, system overview
hod          // Faculty management, approve marks
exam_cell    // Upload end-term marks, publish results
```

### Test Credentials
```
Admin:     A001 / admin123
Teacher:   T001 / teacher123
Student:   22WJ8A6745 / student123
HOD:       HOD001 / hod123
Exam Cell: EC001 / exam123
```

---

## 🎨 Icons

```jsx
import { 
  BookOpen, Trophy, ChartLine, Fire, 
  Calendar, Target, SignOut, Terminal,
  Clock, Users, Check, X
} from '@phosphor-icons/react';

<BookOpen size={24} weight="duotone" className="text-indigo-500" />
```

---

## 📝 Form Patterns

### Input
```jsx
<input
  type="text"
  placeholder="Enter value"
  className="soft-input w-full"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  data-testid="input-field"
/>
```

### Button
```jsx
<button 
  onClick={handleSubmit} 
  className="btn-primary w-full"
  data-testid="submit-button"
>
  Submit
</button>
```

### Select
```jsx
<select className="soft-input w-full" value={selected} onChange={(e) => setSelected(e.target.value)}>
  <option value="">Select...</option>
  <option value="1">Option 1</option>
</select>
```

---

## 🔄 Loading & Error States

### Loading Spinner
```jsx
if (loading) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
```

### Inline Spinner
```jsx
{loading && (
  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
)}
```

### Error Message
```jsx
{error && (
  <div className="soft-card p-4 bg-rose-50 border-rose-200">
    <p className="text-rose-600 font-medium">{error}</p>
  </div>
)}
```

---

## 🎯 Grid Layouts

### 2 Columns
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div>Column 1</div>
  <div>Column 2</div>
</div>
```

### 3 Columns
```jsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div>Column 1</div>
  <div>Column 2</div>
  <div>Column 3</div>
</div>
```

### 4 Columns (Stats)
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {stats.map(stat => <StatCard key={stat.label} {...stat} />)}
</div>
```

---

## 🚀 Development Commands

```bash
# Frontend
cd frontend
yarn install
yarn start          # http://localhost:3000

# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# MongoDB
mongosh             # Connect to local MongoDB
use quizportal      # Switch to database
db.users.find()     # Query users
```

---

## 🔍 Debugging Tips

### Backend Logs
```python
print(f"Debug: {variable}")  # Quick debug
import logging
logging.info("Info message")
logging.error("Error message")
```

### Frontend Logs
```javascript
console.log('Debug:', data);
console.error('Error:', err);
```

### Check API Response
```javascript
try {
  const { data } = await someAPI.fetch();
  console.log('Response:', data);
} catch (err) {
  console.error('Error:', err.response?.data);
}
```

---

## 📊 Testing

### Add data-testid
```jsx
<button data-testid="login-button">Login</button>
<div data-testid="stat-card-cgpa">9.2</div>
<input data-testid="college-id-input" />
```

### Backend Test
```python
# In backend/tests/test_feature.py
import pytest
from httpx import AsyncClient
from server import app

@pytest.mark.asyncio
async def test_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
```

---

## 🎨 Badge Variants

```jsx
// Status
<span className="soft-badge bg-emerald-50 text-emerald-600">Active</span>
<span className="soft-badge bg-amber-50 text-amber-600">Pending</span>
<span className="soft-badge bg-rose-50 text-rose-600">Inactive</span>

// Role
<span className="soft-badge bg-indigo-50 text-indigo-600">Student</span>
<span className="soft-badge bg-purple-50 text-purple-600">Teacher</span>

// Count
<span className="soft-badge bg-slate-50 text-slate-600">12 Items</span>
```

---

## 🔧 Environment Variables

### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=quizportal
JWT_SECRET=your-secret-key-here
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=*
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## 📦 Add Dependencies

### Frontend
```bash
cd frontend
yarn add package-name
```

### Backend
```bash
cd backend
pip install package-name
# Add to requirements.txt
echo "package-name==version" >> requirements.txt
```

---

## 🎯 Navigation Examples

```jsx
// Simple navigation
navigate('quiz-results')

// With data
navigate('quiz-attempt', quizData)

// Back to dashboard
navigate(ROLE_DASHBOARD[user.role])

// Logout
onLogout()
```

---

*Last Updated: March 30, 2025*
