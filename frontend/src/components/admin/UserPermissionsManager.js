import React, { useState, useEffect } from 'react';
import { adminPhase1API } from '../../services/api';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { useToast } from '../../hooks/use-toast';
import { Search, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const PERMISSION_DEFINITIONS = [
  { key: 'can_create_timetable', label: 'Create Timetable', role: 'hod' },
  { key: 'can_allocate_subjects', label: 'Allocate Subjects', role: 'hod' },
  { key: 'is_subject_expert', label: 'Subject Expert (Question Papers)', role: 'faculty' },
  { key: 'is_mentor', label: 'Student Mentor', role: 'faculty' },
  { key: 'can_enable_course_registration', label: 'Toggle Registration Windows', role: 'exam_cell' },
  { key: 'can_generate_hall_tickets', label: 'Generate Hall Tickets', role: 'exam_cell' },
];

export default function UserPermissionsManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const res = await adminPhase1API.getPermissionsSummary();
      setUsers(res.data);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load permissions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (userId, userFlags, flagKey, currVal) => {
    try {
      const newFlags = { ...userFlags, [flagKey]: !currVal };
      // Optimistic UI update
      setUsers(users.map(u => u.id === userId ? { ...u, flags: newFlags } : u));
      
      await adminPhase1API.updateUserPermissions(userId, newFlags);
      toast({ 
        title: 'Permission Updated', 
        description: `Flag '${flagKey}' updated successfully`,
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      });
    } catch (err) {
      // Revert on error
      toast({ title: 'Error', description: 'Failed to update permission', variant: 'destructive' });
      fetchPermissions();
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
            Permission Matrix
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Dynamically override UI module access with granular JSONB flags.
          </p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users or roles..."
            className="pl-8 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm border-gray-200 dark:border-gray-800"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-gray-200/60 dark:border-gray-800/60 shadow-xl shadow-gray-200/20 dark:shadow-black/20 bg-white/60 dark:bg-gray-950/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-indigo-500" />
            Active Overrides
          </CardTitle>
          <CardDescription>Changes apply instantly but require the user to refresh their session.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden bg-white/50 dark:bg-gray-950/50">
            <Table>
              <TableHeader className="bg-gray-50/50 dark:bg-gray-900/50">
                <TableRow>
                  <TableHead className="w-[200px]">User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Active Flags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8">Loading matrix...</TableCell></TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No users found matching query.</TableCell></TableRow>
                ) : (
                  filteredUsers.map((user, idx) => (
                    <TableRow key={user.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{user.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize bg-white dark:bg-gray-950">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.profile_data?.department || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-3 py-2">
                          {/* We dynamically show relevant toggles based on role to avoid clutter */}
                          {PERMISSION_DEFINITIONS.filter(p => !p.role || p.role === user.role).map((perm) => {
                            const userFlags = user.flags || {};
                            const isActive = !!userFlags[perm.key];
                            return (
                              <div key={perm.key} className="flex flex-row items-center justify-between p-2 rounded-md hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors">
                                <div className="space-y-0.5">
                                  <label className={`text-sm font-medium ${isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-500'}`}>
                                    {perm.label}
                                  </label>
                                  <p className="text-[10px] text-muted-foreground font-mono">{perm.key}</p>
                                </div>
                                <Switch 
                                  checked={isActive} 
                                  onCheckedChange={() => handleToggle(user.id, userFlags, perm.key, isActive)}
                                  className="data-[state=checked]:bg-indigo-500 data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-800"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
