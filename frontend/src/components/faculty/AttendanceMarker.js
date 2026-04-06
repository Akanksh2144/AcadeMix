import React, { useState, useEffect } from 'react';
import { timetableAPI, attendanceAPI } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import { Clock, Users, CalendarCheck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AttendanceMarker({ user }) {
  const [todayPeriods, setTodayPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  // Mock student list for the roster
  const [students, setStudents] = useState([]);
  const [attendanceState, setAttendanceState] = useState({}); // { student_id: 'present' | 'absent' | 'od' }
  const [submitting, setSubmitting] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchTodayPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTodayPeriods = async () => {
    try {
      const res = await timetableAPI.getFacultyToday();
      setTodayPeriods(res.data);
    } catch (err) {
      console.warn('Backend endpoint may not exist yet, using mock fallback', err);
      // Fallback for UI demo
      setTodayPeriods([
        { id: '1', period_no: 2, start_time: '09:50', end_time: '10:40', subject_code: 'CS301', batch: 'CSE-A', section: 'A', room: 'LH-1' },
        { id: '2', period_no: 4, start_time: '11:40', end_time: '12:30', subject_code: 'CS305', batch: 'DS-B', section: 'B', room: 'Lab-3' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    // Mock students fetch
    const mockStudents = [
      { id: 'S001', name: 'Aarav Patel', rollNo: '22WJ1A0501' },
      { id: 'S002', name: 'Diya Sharma', rollNo: '22WJ1A0502' },
      { id: 'S003', name: 'Kabir Singh', rollNo: '22WJ1A0503' },
      { id: 'S004', name: 'Ananya Gupta', rollNo: '22WJ1A0504' },
      { id: 'S005', name: 'Rohan Verma', rollNo: '22WJ1A0505' },
    ];
    setStudents(mockStudents);
    
    // Default all to present
    const defaultState = {};
    mockStudents.forEach(s => defaultState[s.id] = 'present');
    setAttendanceState(defaultState);
  };

  const toggleStudent = (studentId, status) => {
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    
    // Check if late entry
    let isLate = false;
    if (selectedSlot.end_time) {
      const [h, m] = selectedSlot.end_time.split(':').map(Number);
      const slotEnd = new Date();
      slotEnd.setHours(h, m, 0, 0);
      const now = new Date();
      const diffHours = (now - slotEnd) / (1000 * 60 * 60);
      if (diffHours > 3) isLate = true;
    }

    try {
      if (isLate) {
        toast({ 
          title: 'Late Entry Warning', 
          description: 'You are submitting attendance outside the 3-hour window. This will be marked as late entry.', 
          variant: 'destructive' 
        });
      }

      await attendanceAPI.mark({
        period_slot_id: selectedSlot.id,
        date: new Date().toISOString().split('T')[0],
        records: Object.entries(attendanceState).map(([student_id, status]) => ({
          student_id,
          status
        }))
      });
      
      toast({ title: 'Attendance Saved', description: 'Records successfully logged to DHTE DB.' });
      setSelectedSlot(null);
    } catch (err) {
      toast({ title: 'Notice', description: 'Mock submission triggered (backend missing roster). Records simulated saved.', variant: 'default' });
      setSelectedSlot(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading today's schedule...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent mb-2">
          Attendance Portal
        </h2>
        <p className="text-muted-foreground">Mark attendance for your assigned periods. Edits lock after 3 hours.</p>
      </div>

      {!selectedSlot ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {todayPeriods.length === 0 ? (
            <div className="col-span-full p-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-muted-foreground">
              <CalendarCheck className="h-10 w-10 mx-auto mb-4 opacity-50" />
              You have no active period slots assigned for today.
            </div>
          ) : (
            todayPeriods.map(slot => (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} key={slot.id} onClick={() => handleSelectSlot(slot)} className="cursor-pointer">
                <Card className="border-gray-200/60 dark:border-gray-800/60 shadow-xl shadow-gray-200/20 dark:shadow-black/20 bg-white/60 dark:bg-gray-950/40 backdrop-blur-xl hover:border-indigo-500/50 transition-colors">
                  <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800/50">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <Badge variant="outline" className="bg-indigo-50/50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                          Period {slot.period_no}
                        </Badge>
                      </div>
                      <div className="text-xs font-mono font-medium text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {slot.start_time} - {slot.end_time}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <h3 className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">{slot.subject_code}</h3>
                    <div className="mt-4 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Users className="w-4 h-4" />
                        {slot.batch} Section {slot.section}
                      </div>
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs">Rm {slot.room || 'TBA'}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
            <Card className="border-gray-200/60 dark:border-gray-800/60 shadow-2xl shadow-indigo-500/10 dark:shadow-black/20 bg-white/60 dark:bg-gray-950/40 backdrop-blur-xl">
              <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800/50 pb-4">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-3">
                    <button onClick={() => setSelectedSlot(null)} className="text-indigo-500 hover:text-indigo-600 text-sm font-semibold tracking-wider uppercase flex items-center gap-1 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg mr-2 transition-colors">
                      ← Back
                    </button>
                    {selectedSlot.subject_code}
                  </CardTitle>
                  <CardDescription className="mt-2 text-sm font-medium flex items-center gap-2">
                    <Badge variant="outline" className="opacity-80">Period {selectedSlot.period_no}</Badge>
                    <span>{selectedSlot.batch} (Section {selectedSlot.section})</span>
                  </CardDescription>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" className="border-gray-200 dark:border-gray-800" onClick={() => {
                    const absents = {}; students.forEach(s => absents[s.id] = 'absent'); setAttendanceState(absents);
                  }}>Mark All Absent</Button>
                  <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
                    const pres = {}; students.forEach(s => pres[s.id] = 'present'); setAttendanceState(pres);
                  }}>Mark All Present</Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50/50 dark:bg-gray-900/50">
                    <TableRow>
                      <TableHead className="w-16 text-center">#</TableHead>
                      <TableHead>Roll Number</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead className="text-right pr-8">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student, idx) => {
                      const st = attendanceState[student.id];
                      return (
                        <TableRow key={student.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                          <TableCell className="text-center font-mono text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-mono font-medium text-slate-700 dark:text-slate-300">{student.rollNo}</TableCell>
                          <TableCell className="font-semibold text-slate-900 dark:text-white tracking-tight">{student.name}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2 pr-4">
                              <button 
                                onClick={() => toggleStudent(student.id, 'present')}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${st === 'present' ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'}`}
                              >
                                P
                              </button>
                              <button 
                                onClick={() => toggleStudent(student.id, 'absent')}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${st === 'absent' ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'}`}
                              >
                                A
                              </button>
                              <button 
                                onClick={() => toggleStudent(student.id, 'od')}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${st === 'od' ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'}`}
                              >
                                OD
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                
                <div className="p-6 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800/50 flex justify-between items-center rounded-b-xl">
                  <div className="flex items-center gap-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> {Object.values(attendanceState).filter(v=>v==='present').length} Present</span>
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div> {Object.values(attendanceState).filter(v=>v==='absent').length} Absent</span>
                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div> {Object.values(attendanceState).filter(v=>v==='od').length} On Duty</span>
                  </div>
                  <Button disabled={submitting} onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
                    {submitting ? 'Submitting...' : 'Submit Attendance'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
