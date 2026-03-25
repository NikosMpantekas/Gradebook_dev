import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Spinner } from '../../components/ui/spinner';
import { Printer, FileText, ArrowLeft } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { API_URL } from '../../config/appConfig';
import { useTheme } from '../../contexts/ThemeContext';

const StudentStatsPrint = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [gradesData, setGradesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { getCurrentThemeData, darkMode } = useTheme();
  const themeData = getCurrentThemeData();

  // Get parameters from URL state
  const { selectedStudent, selectedStudentData, startDate, endDate } = location.state || {};

  useEffect(() => {
    if (!selectedStudent || !startDate || !endDate) {
      navigate(-1); // Go back if missing required data
      return;
    }

    fetchGradeAnalysis();
  }, [selectedStudent, startDate, endDate]);

  const fetchGradeAnalysis = async () => {
    try {
      setLoading(true);
      
      // Try multiple token sources
      let token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      // If still no token, try getting from Redux store via user data
      if (!token) {
        const userData = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        token = userData.token;
      }
      
      console.log('[StudentStatsPrint] Token check:', {
        hasToken: !!token,
        tokenLength: token?.length,
        tokenPreview: token ? token.substring(0, 10) + '...' : 'null'
      });
      
      if (!token) {
        console.error('[StudentStatsPrint] No authentication token found');
        navigate('/login');
        return;
      }
      
      console.log('[StudentStatsPrint] Making API request:', {
        url: `${API_URL}/api/grades/student-period-analysis`,
        params: { selectedStudent, startDate, endDate }
      });
      
      const response = await fetch(
        `${API_URL}/api/grades/student-period-analysis?studentId=${selectedStudent}&startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[StudentStatsPrint] API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[StudentStatsPrint] Received grade data:', data);
        setGradesData(data);
      } else {
        const errorText = await response.text();
        console.error('[StudentStatsPrint] API error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        if (response.status === 401) {
          console.error('[StudentStatsPrint] Authentication failed, redirecting to login');
          navigate('/login');
        }
      }
    } catch (error) {
      console.error('[StudentStatsPrint] Error fetching grade analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data for subjects with multiple grades
  const prepareChartData = (subjectGrades) => {
    return subjectGrades.map((grade, index) => ({
      index: index + 1,
      grade: grade.value,
      date: new Date(grade.date).toLocaleDateString(),
      timestamp: new Date(grade.date).getTime()
    })).sort((a, b) => a.timestamp - b.timestamp);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSavePDF = () => {
    // Trigger browser's save as PDF
    window.print();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen" style={{
        backgroundColor: darkMode ? themeData?.darkColors?.background : themeData?.colors?.background
      }}>
        <Spinner size="lg" style={{
          color: darkMode ? themeData?.darkColors?.primary : themeData?.colors?.primary
        }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{
      backgroundColor: darkMode ? themeData?.darkColors?.background : themeData?.colors?.background
    }}>
      {/* Print Controls - Hidden when printing */}
      <div className="no-print border-b p-4 flex justify-between items-center gap-4" style={{
        backgroundColor: darkMode ? themeData?.darkColors?.muted : themeData?.colors?.muted,
        borderColor: darkMode ? themeData?.darkColors?.border : themeData?.colors?.border
      }}>
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Analysis
        </Button>
        
        <div className="flex gap-2">
          <Button
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Printable Content */}
      <div className="p-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-1 print:text-black" style={{
            color: darkMode ? themeData?.darkColors?.foreground : themeData?.colors?.foreground
          }}>
            Student Grade Analysis Report
          </h1>
          <h2 className="text-xl font-semibold mb-2 print:text-black" style={{
            color: darkMode ? themeData?.darkColors?.foreground : themeData?.colors?.foreground
          }}>
            {selectedStudentData?.name || 'Student Name'}
          </h2>
          <p className="text-lg text-muted-foreground mb-2 print:text-gray-600 no-print">
            Period: {formatDate(startDate)} - {formatDate(endDate)}
          </p>
          <p className="text-sm text-muted-foreground print:text-gray-600 no-print">
            Generated on: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Grades by Subject */}
        {gradesData?.subjectAnalysis && Object.keys(gradesData.subjectAnalysis).length > 0 ? (
          Object.entries(gradesData.subjectAnalysis).map(([subjectName, subjectData], index) => (
            <Card key={subjectName} className={`mb-4 print:shadow-none print:border print:border-black ${index > 0 ? 'print:break-before-page' : ''}`} style={{
              backgroundColor: darkMode ? themeData?.darkColors?.card : themeData?.colors?.card,
              borderColor: darkMode ? themeData?.darkColors?.border : themeData?.colors?.border
            }}>
              <CardHeader>
                <CardTitle className="text-xl font-bold border-b-2 pb-2 print:text-black print:border-black" style={{
                  color: darkMode ? themeData?.darkColors?.foreground : themeData?.colors?.foreground,
                  borderColor: darkMode ? themeData?.darkColors?.primary : themeData?.colors?.primary
                }}>
                  {subjectName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Summary */}
                <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center">
                    <p className="text-sm print:text-black" style={{
                      color: darkMode ? themeData?.darkColors?.['muted-foreground'] : themeData?.colors?.['muted-foreground']
                    }}>Student Average:</p>
                    <p className="text-lg font-bold print:text-black" style={{
                      color: darkMode ? themeData?.darkColors?.foreground : themeData?.colors?.foreground
                    }}>
                      {subjectData.studentAverage?.toFixed(1) || 'N/A'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm print:text-black" style={{
                      color: darkMode ? themeData?.darkColors?.['muted-foreground'] : themeData?.colors?.['muted-foreground']
                    }}>Class Average:</p>
                    <p className="text-lg font-bold print:text-black" style={{
                      color: darkMode ? themeData?.darkColors?.foreground : themeData?.colors?.foreground
                    }}>
                      {subjectData.classAverage?.toFixed(1) || 'N/A'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm print:text-black" style={{
                      color: darkMode ? themeData?.darkColors?.['muted-foreground'] : themeData?.colors?.['muted-foreground']
                    }}>Total Grades:</p>
                    <p className="text-lg font-bold print:text-black" style={{
                      color: darkMode ? themeData?.darkColors?.foreground : themeData?.colors?.foreground
                    }}>
                      {subjectData.grades?.length || 0}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm print:text-black" style={{
                      color: darkMode ? themeData?.darkColors?.['muted-foreground'] : themeData?.colors?.['muted-foreground']
                    }}>Performance:</p>
                    <p className="text-lg font-bold print:text-black" style={{
                      color: darkMode ? themeData?.darkColors?.foreground : themeData?.colors?.foreground
                    }}>
                      {subjectData.studentAverage >= subjectData.classAverage ? 'Above Average' : 'Below Average'}
                    </p>
                  </div>
                </div>

                {/* Progress Graph for multiple grades */}
                {subjectData.grades && subjectData.grades.length > 1 && (
                  <div className="mb-4">
                    <h3 className="text-base font-semibold mb-2 text-foreground print:text-black">
                      📈 Grade Progress Over Time
                    </h3>
                    <div className="w-full h-64 mb-3">
                      <ResponsiveContainer>
                        <LineChart data={prepareChartData(subjectData.grades)}>
                          <CartesianGrid strokeDasharray="3 3" stroke={
                            darkMode ? themeData?.darkColors?.border || '#374151' : themeData?.colors?.border || '#e5e7eb'
                          } />
                          <XAxis 
                            dataKey="date" 
                            tick={{ 
                              fontSize: 12, 
                              fill: darkMode ? themeData?.darkColors?.['muted-foreground'] || '#f9fafb' : themeData?.colors?.['muted-foreground'] || '#374151'
                            }}
                          />
                          <YAxis 
                            domain={[0, 20]}
                            tick={{ 
                              fontSize: 12, 
                              fill: darkMode ? themeData?.darkColors?.['muted-foreground'] || '#f9fafb' : themeData?.colors?.['muted-foreground'] || '#374151'
                            }}
                          />
                          <Tooltip 
                            formatter={(value) => [value, 'Grade']}
                            labelFormatter={(label) => `Date: ${label}`}
                            contentStyle={{ 
                              backgroundColor: darkMode ? themeData?.darkColors?.card || '#1f2937' : themeData?.colors?.card || '#f9fafb', 
                              border: `1px solid ${darkMode ? themeData?.darkColors?.border || '#374151' : themeData?.colors?.border || '#e5e7eb'}`,
                              borderRadius: '6px',
                              color: darkMode ? themeData?.darkColors?.['card-foreground'] || '#f9fafb' : themeData?.colors?.['card-foreground'] || '#374151'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="grade" 
                            stroke={darkMode ? themeData?.darkColors?.primary || themeData?.colors?.primary || '#3b82f6' : themeData?.colors?.primary || '#3b82f6'}
                            strokeWidth={3}
                            dot={{ 
                              fill: darkMode ? themeData?.darkColors?.primary || themeData?.colors?.primary || '#3b82f6' : themeData?.colors?.primary || '#3b82f6', 
                              strokeWidth: 2, 
                              r: 6 
                            }}
                            name="Grade"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Grades Table */}
                <div className="mb-4">
                  <Table className="print:border print:border-collapse">
                    <TableHeader>
                      <TableRow className="bg-muted print:bg-gray-100">
                        <TableHead className="font-bold text-foreground print:text-black print:border print:border-black">Date</TableHead>
                        <TableHead className="font-bold text-foreground print:text-black print:border print:border-black">Grade</TableHead>
                        <TableHead className="font-bold text-foreground print:text-black print:border print:border-black">Description</TableHead>
                        <TableHead className="font-bold text-foreground print:text-black print:border print:border-black">Teacher</TableHead>
                        <TableHead className="font-bold text-foreground print:text-black print:border print:border-black">vs Class Avg</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjectData.grades?.map((grade, index) => (
                        <TableRow key={index} className="hover:bg-muted/50">
                          <TableCell className="text-foreground print:text-black print:border print:border-black">
                            {formatDate(grade.date)}
                          </TableCell>
                          <TableCell className="font-bold text-foreground print:text-black print:border print:border-black">
                            {grade.value}
                          </TableCell>
                          <TableCell className="text-foreground print:text-black print:border print:border-black">
                            {grade.description || '-'}
                          </TableCell>
                          <TableCell className="text-foreground print:text-black print:border print:border-black">
                            {grade.teacher?.name || 'Unknown'}
                          </TableCell>
                          <TableCell className="text-foreground print:text-black print:border print:border-black">
                            {grade.value >= subjectData.classAverage ? 'Above' : 'Below'}
                          </TableCell>
                        </TableRow>
                      )) || (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground print:text-black print:border print:border-black">
                            No grades found for this period
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8">
            <h3 className="text-xl font-semibold text-muted-foreground print:text-black">
              No grades found for the selected period
            </h3>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-border text-center print:border-gray-300 no-print">
          <p className="text-sm text-muted-foreground print:text-gray-400">
            GradeBook System - Student Grade Analysis Report
          </p>
        </div>
      </div>

      {/* Print-specific CSS */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          /* Hide all floating elements, notifications, and toggles */
          .fixed, .absolute, [role="dialog"], [role="tooltip"],
          .notification, .toast, .popup, .modal, .overlay,
          button[class*="toggle"], button[class*="notification"],
          .floating, [class*="floating"], [id*="notification"],
          [class*="notification"], .push-toggle, .notification-toggle {
            display: none !important;
            visibility: hidden !important;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            color: black !important;
          }
          
          * {
            box-shadow: none !important;
            color: black !important;
          }
          
          h1, h2, h3, h4, h5, h6, p, span, div, td, th, label {
            color: black !important;
          }
          
          .print\:break-before-page {
            page-break-before: always !important;
            break-before: page !important;
          }
          
          .print\:text-black {
            color: black !important;
          }
          
          .print\:text-gray-800 {
            color: #1f2937 !important;
          }
          
          .print\:text-gray-600 {
            color: #4b5563 !important;
          }
          
          .print\:text-gray-500 {
            color: #6b7280 !important;
          }
          
          .print\:text-gray-400 {
            color: #9ca3af !important;
          }
          
          .print\:border {
            border: 1px solid black !important;
          }
          
          .print\:border-black {
            border-color: black !important;
          }
          
          .print\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          
          .print\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
          
          .print\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\:border-collapse {
            border-collapse: collapse !important;
          }
          
          @page {
            margin: 1cm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentStatsPrint;
