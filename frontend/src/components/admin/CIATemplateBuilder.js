import React, { useState, useEffect } from 'react';
import { adminPhase1API } from '../../services/api';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../ui/table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../../hooks/use-toast';
import { Plus, Trash2, Save, LayoutTemplate, Briefcase } from 'lucide-react';

const COMPONENT_TYPES = ['test', 'assignment', 'attendance', 'practical', 'seminar', 'mini_project', 'viva'];

export default function CIATemplateBuilder() {
  const [templates, setTemplates] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Builder State
  const [builderName, setBuilderName] = useState('');
  const [builderMarks, setBuilderMarks] = useState(25);
  const [components, setComponents] = useState([]);

  // Assignment State
  const [assignSubject, setAssignSubject] = useState('');
  const [assignSemester, setAssignSemester] = useState(1);
  const [assignTemplate, setAssignTemplate] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tplRes, cfgRes] = await Promise.all([
        adminPhase1API.getCiaTemplates(),
        adminPhase1API.getCiaConfigs()
      ]);
      setTemplates(tplRes.data);
      setConfigs(cfgRes.data);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch CIA data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const addComponent = () => {
    setComponents([...components, { type: 'test', name: 'Internal Test', max_marks: 10, count: 1, best_of: 1 }]);
  };

  const removeComponent = (idx) => {
    setComponents(components.filter((_, i) => i !== idx));
  };

  const updateComponent = (idx, field, value) => {
    const newComps = [...components];
    newComps[idx] = { ...newComps[idx], [field]: value };
    setComponents(newComps);
  };

  const handleSaveTemplate = async () => {
    if (!builderName || components.length === 0) {
      toast({ title: 'Validation Error', description: 'Name and at least one component required.', variant: 'destructive' });
      return;
    }
    
    const sum = components.reduce((acc, c) => acc + Number(c.max_marks), 0);
    if (sum !== Number(builderMarks)) {
      toast({ title: 'Validation Error', description: `Component marks sum to ${sum}, but total is set to ${builderMarks}.`, variant: 'destructive' });
      return;
    }

    try {
      await adminPhase1API.createCiaTemplate({
        name: builderName,
        total_marks: Number(builderMarks),
        components
      });
      toast({ title: 'Success', description: 'Template created successfully' });
      setBuilderName('');
      setComponents([]);
      fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.detail || 'Failed to create template', variant: 'destructive' });
    }
  };

  const handleAssign = async () => {
    if (!assignSubject || !assignTemplate) return;
    try {
      await adminPhase1API.createCiaConfig({
        subject_code: assignSubject,
        academic_year: '2024-25', // Hardcoded for prototype
        semester: Number(assignSemester),
        template_id: assignTemplate
      });
      toast({ title: 'Assigned', description: 'Template assigned to subject.' });
      setAssignSubject('');
      fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err.response?.data?.detail || 'Assignment failed', variant: 'destructive' });
    }
  };

  const toggleConsolidation = async (configId) => {
    try {
      await adminPhase1API.toggleConsolidation(configId);
      toast({ title: 'Updated', description: 'Consolidation status toggled.' });
      fetchData();
    } catch (err) {
      toast({ title: 'Error', description: 'Toggle failed', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
          CIA Engine
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Define Internal Assessment rules and assign them to subjects.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Template Builder */}
        <Card className="border-gray-200/60 dark:border-gray-800/60 bg-white/60 dark:bg-gray-950/40 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-emerald-500" />
              Template Builder
            </CardTitle>
            <CardDescription>Construct a new component-based assessment template.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input value={builderName} onChange={(e) => setBuilderName(e.target.value)} placeholder="e.g. CSE Theory 2024" />
              </div>
              <div className="space-y-2">
                <Label>Max Total Marks</Label>
                <Input type="number" value={builderMarks} onChange={(e) => setBuilderMarks(e.target.value)} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Components</Label>
                <Button variant="outline" size="sm" onClick={addComponent}>
                  <Plus className="h-4 w-4 mr-2" /> Add Component
                </Button>
              </div>
              
              {components.map((comp, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 space-y-4 relative group">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-red-500 h-6 w-6"
                    onClick={() => removeComponent(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select value={comp.type} onValueChange={(val) => updateComponent(idx, 'type', val)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {COMPONENT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Component Name</Label>
                      <Input className="h-8 text-sm" value={comp.name} onChange={(e) => updateComponent(idx, 'name', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max Marks</Label>
                      <Input className="h-8 text-sm" type="number" value={comp.max_marks} onChange={(e) => updateComponent(idx, 'max_marks', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">No. of Events</Label>
                      <Input className="h-8 text-sm" type="number" value={comp.count} onChange={(e) => updateComponent(idx, 'count', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
              
              {components.length > 0 && (
                <div className="flex justify-between items-center text-sm font-medium mt-2 px-1">
                  <span>Current Total:</span>
                  <span className={components.reduce((acc, c) => acc + Number(c.max_marks), 0) === Number(builderMarks) ? "text-emerald-500" : "text-amber-500"}>
                    {components.reduce((acc, c) => acc + Number(c.max_marks), 0)} / {builderMarks}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveTemplate}>
              <Save className="h-4 w-4 mr-2" /> Save Template
            </Button>
          </CardFooter>
        </Card>

        {/* Assignments */}
        <div className="space-y-6">
          <Card className="border-gray-200/60 dark:border-gray-800/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-500" />
                Assign to Subject
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subject Code</Label>
                    <Input value={assignSubject} onChange={(e) => setAssignSubject(e.target.value)} placeholder="e.g. CS101" />
                  </div>
                  <div className="space-y-2">
                    <Label>Semester</Label>
                    <Input type="number" value={assignSemester} onChange={(e) => setAssignSemester(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select value={assignTemplate} onValueChange={setAssignTemplate}>
                    <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
                    <SelectContent>
                      {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.total_marks}M)</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAssign}>Assign Schema</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200/60 dark:border-gray-800/60">
            <CardHeader>
              <CardTitle>Active Subjects</CardTitle>
              <CardDescription>Toggle consolidation lock per subject.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sub</TableHead>
                    <TableHead>Sem</TableHead>
                    <TableHead>Consolidated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map(cfg => (
                    <TableRow key={cfg.id}>
                      <TableCell className="font-mono text-xs">{cfg.subject_code}</TableCell>
                      <TableCell>{cfg.semester}</TableCell>
                      <TableCell>
                        <Button 
                          variant={cfg.is_consolidation_enabled ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleConsolidation(cfg.id)}
                          className={cfg.is_consolidation_enabled ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                        >
                          {cfg.is_consolidation_enabled ? "Unlocked" : "Locked"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {configs.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No assigned templates.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
