import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { ChartLineUp, ChartBar, UsersThree } from '@phosphor-icons/react';

const genPassFail = () => ['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6'].map((s,i) => ({
  semester: s, passRate: Math.min(98, 85+Math.random()*12+i*0.5),
  avgCGPA: +(7.2+Math.random()*1.2+i*0.05).toFixed(2),
  distinctionRate: 15+Math.random()*20+i*2,
}));

const genSubjects = () => [
  {name:'Automata Theory',code:'22PC0DS17'},{name:'Machine Learning',code:'22PC0DS18'},
  {name:'Big Data Analytics',code:'22PC0DS19'},{name:'Operating Systems',code:'22CSE201'},
  {name:'Computer Networks',code:'22CSE301'},{name:'VLSI Design',code:'22ECE401'},
  {name:'Data Structures',code:'22DS0201'},{name:'Deep Learning',code:'22DS0401'},
].map(s => ({...s, failRate: Math.round(3+Math.random()*25), avgMarks: Math.round(55+Math.random()*30)}))
 .sort((a,b) => b.failRate-a.failRate);

const genFaculty = () => [
  {name:'Dr. Sarah Johnson',short:'S. Johnson'},
  {name:'Prof. Ravi Kumar',short:'R. Kumar'},
  {name:'Dr. Priya Verma',short:'P. Verma'},
].map(f => ({...f, avgScore: Math.round(65+Math.random()*25), passRate: Math.round(85+Math.random()*14), satisfaction: Math.round(70+Math.random()*28)}));

const COLORS = ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#06b6d4'];

const Tip = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  return (<div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-3 shadow-xl">
    <p className="font-bold text-sm text-slate-800 mb-1">{label}</p>
    {payload.map((it,i) => <p key={i} className="text-xs" style={{color:it.color}}>{it.name}: <strong>{typeof it.value==='number'?it.value.toFixed(1):it.value}</strong></p>)}
  </div>);
};

export default function AnalyticsDashboard() {
  const pf = genPassFail(), sd = genSubjects(), fc = genFaculty();
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6"><ChartLineUp size={22} weight="duotone" className="text-emerald-500" /><h4 className="text-lg font-bold text-slate-800">Pass/Fail Trend Analysis</h4></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div><h5 className="text-sm font-semibold text-slate-600 mb-3">Pass Rate Trend (%)</h5>
            <ResponsiveContainer width="100%" height={260}><LineChart data={pf}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="semester" tick={{fontSize:12}} stroke="#94a3b8"/><YAxis domain={[70,100]} tick={{fontSize:12}} stroke="#94a3b8"/><Tooltip content={<Tip/>}/><Legend iconType="circle"/><Line type="monotone" dataKey="passRate" name="Pass Rate" stroke="#10b981" strokeWidth={3} dot={{fill:'#10b981',r:5}}/><Line type="monotone" dataKey="distinctionRate" name="Distinction Rate" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={{fill:'#6366f1',r:4}}/></LineChart></ResponsiveContainer></div>
          <div><h5 className="text-sm font-semibold text-slate-600 mb-3">Average CGPA Trend</h5>
            <ResponsiveContainer width="100%" height={260}><BarChart data={pf}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="semester" tick={{fontSize:12}} stroke="#94a3b8"/><YAxis domain={[6,10]} tick={{fontSize:12}} stroke="#94a3b8"/><Tooltip content={<Tip/>}/><Bar dataKey="avgCGPA" name="Avg CGPA" radius={[8,8,0,0]} fill="#6366f1">{pf.map((_,i)=><Cell key={i} fill={`hsl(${230+i*8},70%,${55+i*3}%)`}/>)}</Bar></BarChart></ResponsiveContainer></div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6"><ChartBar size={22} weight="duotone" className="text-amber-500"/><h4 className="text-lg font-bold text-slate-800">Subject Difficulty Ranking</h4><span className="text-xs text-slate-400 ml-2">(by failure rate)</span></div>
        <ResponsiveContainer width="100%" height={320}><BarChart data={sd} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis type="number" domain={[0,35]} tick={{fontSize:12}} stroke="#94a3b8" unit="%"/><YAxis dataKey="name" type="category" width={150} tick={{fontSize:11}} stroke="#94a3b8"/><Tooltip content={<Tip/>}/><Bar dataKey="failRate" name="Fail Rate" radius={[0,8,8,0]} barSize={24}>{sd.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar></BarChart></ResponsiveContainer>
        <div className="mt-4 grid grid-cols-4 gap-3">{sd.slice(0,4).map((s,i)=>(<div key={s.code} className={`p-3 rounded-xl ${i===0?'bg-red-50 border-red-200':'bg-slate-50 border-slate-200'} border`}><div className="text-xs text-slate-500 truncate">{s.name}</div><div className={`text-lg font-black ${i===0?'text-red-600':'text-slate-700'}`}>{s.failRate}%</div><div className="text-xs text-slate-400">fail rate</div></div>))}</div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6"><UsersThree size={22} weight="duotone" className="text-indigo-500"/><h4 className="text-lg font-bold text-slate-800">Faculty Performance Comparison</h4></div>
        <ResponsiveContainer width="100%" height={280}><BarChart data={fc}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="short" tick={{fontSize:12}} stroke="#94a3b8"/><YAxis domain={[0,100]} tick={{fontSize:12}} stroke="#94a3b8"/><Tooltip content={<Tip/>}/><Legend iconType="circle"/><Bar dataKey="avgScore" name="Avg Score" fill="#6366f1" radius={[6,6,0,0]} barSize={28}/><Bar dataKey="passRate" name="Pass Rate" fill="#10b981" radius={[6,6,0,0]} barSize={28}/><Bar dataKey="satisfaction" name="Satisfaction" fill="#f59e0b" radius={[6,6,0,0]} barSize={28}/></BarChart></ResponsiveContainer>
        <div className="grid grid-cols-3 gap-4 mt-6">{fc.map((f,i)=>(<div key={i} className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 p-4"><div className="font-bold text-sm text-slate-700 mb-3">{f.name}</div><div className="space-y-2"><div className="flex justify-between text-xs"><span className="text-slate-500">Avg Score</span><span className="font-bold text-indigo-600">{f.avgScore}%</span></div><div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full" style={{width:`${f.avgScore}%`}}></div></div><div className="flex justify-between text-xs"><span className="text-slate-500">Pass Rate</span><span className="font-bold text-emerald-600">{f.passRate}%</span></div><div className="w-full bg-slate-100 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full" style={{width:`${f.passRate}%`}}></div></div></div></div>))}</div>
      </div>
    </div>
  );
}
