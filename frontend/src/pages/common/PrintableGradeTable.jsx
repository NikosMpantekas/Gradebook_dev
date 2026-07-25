import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Printer, Download, X } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';

const PrintableGradeTable = ({ 
  student, 
  startDate, 
  endDate, 
  grades = [], 
  subjectBreakdown = {},
  classAverages = {},
  onClose 
}) => {
  const [loading, setLoading] = useState(false);
  const printContainerRef = useRef(null);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('el-GR', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveAsPDF = () => {
    window.print();
  };

  const prepareBarChartData = () => {
    if (!grades || grades.length === 0) return [];
    const subjectMap = {};
    
    grades.forEach(grade => {
      if (!subjectMap[grade.subject]) {
        subjectMap[grade.subject] = {
          subject: grade.subject,
          studentAverage: subjectBreakdown[grade.subject]?.average || 0,
          classAverage: classAverages[grade.subject] || 0
        };
      }
    });
    
    return Object.values(subjectMap);
  };

  const prepareLineChartData = () => {
    if (!grades || grades.length === 0) return [];
    const sortedGrades = [...grades].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return sortedGrades.map(grade => ({
      date: new Date(grade.date).toLocaleDateString('el-GR', { month: 'short', day: 'numeric' }),
      grade: grade.grade,
      subject: grade.subject
    }));
  };

  const prepareRadarChartData = () => {
    if (!subjectBreakdown || Object.keys(subjectBreakdown).length === 0) return [];
    
    return Object.entries(subjectBreakdown).map(([subject, stats]) => ({
      subject,
      studentScore: stats.average,
      classAverage: classAverages[subject] || 0,
      fullMark: 100
    }));
  };

  return (
    <div className="bg-slate-100 min-h-screen text-slate-900 dark:bg-slate-900 dark:text-slate-100 print:bg-white print:text-black">
      {/* Controls */}
      <div className="sticky top-0 z-50 bg-primary text-primary-foreground p-4 mb-4 flex items-center justify-between shadow-md print:hidden">
        <h2 className="text-lg font-semibold">Αναφορά Βαθμολογίας</h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Εκτύπωση
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSaveAsPDF}>
            <Download className="mr-2 h-4 w-4" />
            Αποθήκευση ως PDF
          </Button>
          <Button variant="destructive" size="sm" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Κλείσιμο
          </Button>
        </div>
      </div>

      {/* Main Printable Content */}
      <div ref={printContainerRef} className="max-w-[1000px] mx-auto bg-white dark:bg-slate-850 p-8 shadow-sm border rounded-lg print:max-w-none print:w-full print:p-2 print:border-none print:shadow-none print:bg-white print:text-black space-y-6">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold mb-1">
                Ακαδημαϊκή Αναφορά Βαθμολογίας
              </h1>
              <h2 className="text-xl font-semibold mb-1">
                {student?.student?.name || 'Όνομα Μαθητή'}
              </h2>
              <p className="text-sm text-slate-500 mb-1">
                {student?.student?.email || 'Email Μαθητή'}
              </p>
              <p className="text-xs text-slate-500">
                Περίοδος: {formatDate(startDate)} - {formatDate(endDate)}
              </p>
            </div>

            <div className="border-b my-6 print:my-3" />

            {/* Grade Summary */}
            <div className="space-y-2 break-inside-avoid">
              <h3 className="text-base font-bold">Σύνοψη Βαθμολογίας</h3>
              <div className="border rounded-md overflow-hidden bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-bold">Μάθημα</TableHead>
                      <TableHead className="font-bold text-center">Μέσος Όρος</TableHead>
                      <TableHead className="font-bold text-center">Μέσος Όρος Τάξης</TableHead>
                      <TableHead className="font-bold text-center">Διαφορά</TableHead>
                      <TableHead className="font-bold text-center">Πλήθος Βαθμών</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(subjectBreakdown || {}).map(([subject, stats]) => {
                      const classAvg = classAverages[subject] || 0;
                      const difference = stats.average - classAvg;
                      
                      return (
                        <TableRow key={subject}>
                          <TableCell className="font-medium">{subject}</TableCell>
                          <TableCell className="text-center font-semibold">{stats.average.toFixed(1)}</TableCell>
                          <TableCell className="text-center">{classAvg.toFixed(1)}</TableCell>
                          <TableCell className={`text-center font-semibold ${
                            difference > 0 ? 'text-emerald-600' : difference < 0 ? 'text-destructive' : 'text-slate-700'
                          }`}>
                            {difference > 0 ? '+' : ''}{difference.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-center">{stats.count}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Grade Comparison Graph */}
            <div className="space-y-2 break-inside-avoid">
              <h3 className="text-base font-bold">Σύγκριση Βαθμών ανά Μάθημα</h3>
              <div className="border rounded-md p-4 bg-white">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={prepareBarChartData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="studentAverage" name="Μέσος Όρος Μαθητή" fill="#3b82f6" />
                    <Bar dataKey="classAverage" name="Μέσος Όρος Τάξης" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Subject Performance Radar */}
            <div className="space-y-2 break-inside-avoid">
              <h3 className="text-base font-bold">Επισκόπηση Απόδοσης Μαθημάτων</h3>
              <div className="border rounded-md p-4 bg-white">
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={prepareRadarChartData()}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar name="Βαθμός Μαθητή" dataKey="studentScore" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                    <Radar name="Μέσος Όρος Τάξης" dataKey="classAverage" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Grade Progression */}
            <div className="space-y-2 break-inside-avoid">
              <h3 className="text-base font-bold">Πρόοδος Βαθμολογίας στο Χρόνο</h3>
              <div className="border rounded-md p-4 bg-white">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={prepareLineChartData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="grade" name="Βαθμός" stroke="#3b82f6" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Grade List */}
            <div className="space-y-2 break-inside-avoid">
              <h3 className="text-base font-bold">Λεπτομερής Λίστα Βαθμών</h3>
              <div className="border rounded-md overflow-hidden bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-bold">Ημερομηνία</TableHead>
                      <TableHead className="font-bold">Μάθημα</TableHead>
                      <TableHead className="font-bold text-center">Βαθμός</TableHead>
                      <TableHead className="font-bold">Σχόλιο</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(grades || []).map((grade) => (
                      <TableRow key={grade._id}>
                        <TableCell>{new Date(grade.date).toLocaleDateString('el-GR')}</TableCell>
                        <TableCell className="font-medium">{grade.subject}</TableCell>
                        <TableCell className={`text-center font-bold ${
                          grade.grade >= 70 ? 'text-emerald-600' : grade.grade >= 50 ? 'text-amber-600' : 'text-destructive'
                        }`}>
                          {grade.grade}
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs">{grade.comment || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {(!grades || grades.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-slate-500 py-6">
                          Δεν βρέθηκαν βαθμοί για την επιλεγμένη περίοδο
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="border-b my-6 print:my-3" />

            <div className="text-center text-xs text-slate-500 space-y-1">
              <p>
                Η αναφορά δημιουργήθηκε στις {new Date().toLocaleDateString('el-GR')} στις {new Date().toLocaleTimeString('el-GR')}
              </p>
              <p className="text-[10px]">
                Σύστημα Αναφορών GradeBook | Ακαδημαϊκό Έτος 2025
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PrintableGradeTable;
