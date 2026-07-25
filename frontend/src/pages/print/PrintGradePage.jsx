import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getStudentDetailedStats } from '../../api/studentStatsAPI';
import PrintGradeLayout from './PrintGradeLayout';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PrintGradePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [classAverages, setClassAverages] = useState({});
  
  useEffect(() => {
    window.debugPrintPage = () => {
      console.log('Print Page Debug Info:', {
        studentData,
        classAverages
      });
    };
    
    return () => {
      delete window.debugPrintPage;
    };
  }, [studentData, classAverages]);
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const studentId = params.get('studentId');
    const studentName = params.get('studentName');
    const studentEmail = params.get('studentEmail');
    const startDate = params.get('startDate');
    const endDate = params.get('endDate');
    
    if (!studentId) {
      setError('No student ID provided');
      setLoading(false);
      return;
    }
    
    const loadData = async () => {
      try {
        let data;
        const savedData = localStorage.getItem('printGradeData');
        
        if (savedData) {
          try {
            data = JSON.parse(savedData);
            if (data && data.student && Array.isArray(data.grades)) {
              const studentObj = data.student;
              
              const processedData = {
                student: {
                  _id: studentId || studentObj?._id,
                  name: studentName || studentObj?.name || 'Student Name',
                  email: studentEmail || studentObj?.email || ''
                },
                grades: data.grades || [],
                subjectBreakdown: data.subjectBreakdown || {},
                totalAverage: data.totalAverage || 0,
                totalGrades: data.totalGrades || 0,
                startDate,
                endDate
              };
              
              setStudentData(processedData);
              generateMockClassAverages(data.subjectBreakdown || {});
              localStorage.removeItem('printGradeData');
              
              if (processedData.grades.length > 0) {
                setLoading(false);
                return;
              }
            }
          } catch (parseError) {
            console.error('[PrintGradePage] Error parsing localStorage data:', parseError);
          }
        }
        
        const queryParams = [];
        if (startDate) queryParams.push(`startDate=${startDate}`);
        if (endDate) queryParams.push(`endDate=${endDate}`);
        const queryString = queryParams.length > 0 ? queryParams.join('&') : '';
        
        try {
          const apiData = await getStudentDetailedStats(studentId, queryString);
          
          const processedApiData = {
            student: {
              _id: studentId,
              name: studentName || 'Student Name',
              email: studentEmail || ''
            },
            grades: apiData.recentGrades || [],
            subjectBreakdown: apiData.subjectBreakdown || {},
            totalAverage: apiData.overview?.averageGrade || 0,
            totalGrades: apiData.overview?.gradeCount || 0,
            startDate,
            endDate
          };
          
          setStudentData(processedApiData);
          generateMockClassAverages(apiData.subjectBreakdown || {});
        } catch (apiError) {
          console.error('[PrintGradePage] API fetch error:', apiError);
          throw apiError;
        }
      } catch (err) {
        console.error('[PrintGradePage] Error loading data:', err);
        setError(err.message || 'Failed to load student data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [location.search]);
  
  const generateMockClassAverages = (subjectBreakdown) => {
    const mockAverages = {};
    
    Object.entries(subjectBreakdown).forEach(([subject, stats]) => {
      let studentAvg = 0;
      if (typeof stats === 'object' && stats !== null) {
        if (typeof stats.average === 'number') studentAvg = stats.average;
        else if (typeof stats.averageGrade === 'number') studentAvg = stats.averageGrade;
        else if (typeof stats.grade === 'number') studentAvg = stats.grade;
      }
      
      const variance = Math.random() * 20 - 10;
      mockAverages[subject] = Math.min(100, Math.max(0, studentAvg + variance));
    });
    
    setClassAverages(mockAverages);
  };
  
  const handleClose = () => {
    window.close();
    navigate(-1);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  
  if (error || !studentData) {
    return (
      <div className="p-6">
        <div className="p-4 rounded-md bg-destructive/15 text-destructive text-sm font-medium">
          {error || 'No student data available'}
        </div>
      </div>
    );
  }
  
  return (
    <PrintGradeLayout
      studentName={studentData.student.name}
      studentEmail={studentData.student.email}
      startDate={studentData.startDate}
      endDate={studentData.endDate}
      onClose={handleClose}
    >
      <div className="mb-8 print:mb-4">
        <h3 className="text-lg font-bold mb-3">Βαθμοί και Μέσοι Όροι Τάξης</h3>
        <div className="border rounded-md overflow-hidden bg-white dark:bg-slate-900">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800">
                <TableHead className="font-bold">Μάθημα</TableHead>
                <TableHead className="font-bold">Ημερομηνία</TableHead>
                <TableHead className="font-bold text-center">Βαθμός</TableHead>
                <TableHead className="font-bold text-center">Μέσος Όρος Τάξης</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentData.grades && studentData.grades.length > 0 ? (
                studentData.grades.map((grade) => {
                  let classAvg = 0;
                  try {
                    const rawValue = classAverages[grade.subject];
                    if (typeof rawValue === 'number' && !isNaN(rawValue)) {
                      classAvg = rawValue;
                    } else if (rawValue && typeof rawValue === 'object' && !isNaN(Number(rawValue.average))) {
                      classAvg = Number(rawValue.average);
                    }
                  } catch (err) {
                    console.error('[PrintGradePage] Error processing class average:', err);
                  }
                  
                  const safeSubject = typeof grade.subject === 'string' ? grade.subject : 
                                    (typeof grade.subject === 'object' && grade.subject !== null) ? 
                                      (grade.subject.name || JSON.stringify(grade.subject)) : 
                                      String(grade.subject || 'Unknown');
                    
                  let safeDate = 'Άγνωστο';
                  try {
                    if (grade.date) {
                      const dateObj = new Date(grade.date);
                      if (!isNaN(dateObj.getTime())) {
                        safeDate = dateObj.toLocaleDateString('el-GR');
                      }
                    }
                  } catch (err) {
                    console.error('[PrintGradePage] Error formatting date:', err);
                  }
                  
                  let safeGrade = 0;
                  try {
                    if (typeof grade.grade === 'number') safeGrade = grade.grade;
                    else if (typeof grade.grade === 'object' && grade.grade !== null) {
                      if ('value' in grade.grade && typeof grade.grade.value === 'number') safeGrade = grade.grade.value;
                      else if ('grade' in grade.grade && typeof grade.grade.grade === 'number') safeGrade = grade.grade.grade;
                    } else if (typeof grade.value === 'number') safeGrade = grade.value;
                    else if (typeof grade.grade === 'string') {
                      const parsed = parseFloat(grade.grade);
                      if (!isNaN(parsed)) safeGrade = parsed;
                    }
                    if (safeGrade === 0) safeGrade = grade.grade || grade.value || 0;
                  } catch (err) {
                    console.error('[PrintGradePage] Error extracting grade value:', err);
                  }
                  
                  const gradeColorClass = safeGrade >= 70 ? 'text-emerald-600 font-bold' : 
                                         safeGrade >= 50 ? 'text-amber-600 font-bold' : 'text-destructive font-bold';
                  
                  return (
                    <TableRow key={grade._id || `grade-${safeSubject}-${grade.date}`}>
                      <TableCell className="font-medium">{safeSubject}</TableCell>
                      <TableCell>{safeDate}</TableCell>
                      <TableCell className={`text-center ${gradeColorClass}`}>
                        {typeof safeGrade === 'number' ? safeGrade : '0'}
                      </TableCell>
                      <TableCell className="text-center">
                        {typeof classAvg === 'number' && !isNaN(classAvg) ? classAvg.toFixed(1) : 'N/A'}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-destructive py-6 font-medium">
                    Δεν βρέθηκαν βαθμοί για την επιλεγμένη περίοδο.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </PrintGradeLayout>
  );
};

export default PrintGradePage;
