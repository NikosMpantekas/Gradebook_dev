import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { BarChart3 } from "lucide-react";

export function GradesGraph({ recentGrades }) {
  // Extract available subjects
  const subjects = useMemo(
    () =>
      Array.from(
        new Set(recentGrades.map((g) => g.subject?.name || "Unknown Subject"))
      ),
    [recentGrades]
  );
  const [selectedSubject, setSelectedSubject] = useState(subjects[0] || "");

  // Prepare graph data: separate arrays for all grades and selected subject grades
  const { chartData, subjectChartData } = useMemo(() => {
    if (!recentGrades || recentGrades.length === 0) {
      return { chartData: [], subjectChartData: [] };
    }

    // Sort grades by date (oldest first) so latest grades are on the right
    const sortedGrades = [...recentGrades]
      .filter(grade => grade && grade.value !== undefined)
      .sort((a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date));

    // Get grades for selected subject only
    const selectedSubjectGrades = sortedGrades.filter(
      grade => (grade.subject?.name || "Unknown Subject") === selectedSubject
    );

    // Create chart data for all grades (uses actual indices)
    const allGradesData = sortedGrades.map((grade, index) => ({
      index: index + 1,
      grade: Number(grade.value) || 0,
      subject: grade.subject?.name || "Unknown Subject",
      date: new Date(grade.createdAt || grade.date).toLocaleDateString()
    }));

    // Create chart data for selected subject that spans full width
    let subjectData = [];
    if (selectedSubjectGrades.length > 0) {
      const totalWidth = sortedGrades.length; // Full width based on all grades
      
      if (selectedSubjectGrades.length === 1) {
        // Single point: place it in the middle and create a horizontal line
        const gradeValue = Number(selectedSubjectGrades[0].value) || 0;
        subjectData = [
          { index: 1, selectedSubjectGrade: gradeValue },
          { index: totalWidth, selectedSubjectGrade: gradeValue }
        ];
      } else {
        // Multiple points: distribute them across the full width
        subjectData = selectedSubjectGrades.map((grade, index) => {
          // Calculate position across full width (1 to totalWidth)
          const position = selectedSubjectGrades.length === 1 
            ? Math.ceil(totalWidth / 2) // Center single point
            : 1 + (index * (totalWidth - 1)) / (selectedSubjectGrades.length - 1);
          
          return {
            index: Math.round(position),
            selectedSubjectGrade: Number(grade.value) || 0,
            subject: grade.subject?.name || "Unknown Subject",
            date: new Date(grade.createdAt || grade.date).toLocaleDateString()
          };
        });
      }
    }

    return {
      chartData: allGradesData,
      subjectChartData: subjectData
    };
  }, [recentGrades, selectedSubject]);

  // Update selectedSubject when subjects change
  React.useEffect(() => {
    if (subjects.length > 0 && !subjects.includes(selectedSubject)) {
      setSelectedSubject(subjects[0]);
    }
  }, [subjects, selectedSubject]);

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span>Grade Progress</span>
        </CardTitle>
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((subject) => (
              <SelectItem value={subject} key={subject}>
                {subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {recentGrades && recentGrades.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData.map((point, idx) => {
              // Find if there's a corresponding subject grade at this index
              const subjectPoint = subjectChartData.find(sp => sp.index === point.index);
              return {
                ...point,
                selectedSubjectGrade: subjectPoint ? subjectPoint.selectedSubjectGrade : null,
                subjectGradeDate: subjectPoint ? subjectPoint.date : null,
                subjectGradeSubject: subjectPoint ? subjectPoint.subject : null,
                hasActualSubjectGrade: !!subjectPoint
              };
            })} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="index"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const allGradesPayload = payload.find(p => p.dataKey === 'grade');
                    const subjectGradesPayload = payload.find(p => p.dataKey === 'selectedSubjectGrade');
                    
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-lg min-w-[200px]">
                        <div className="flex flex-col space-y-2">
                          <div className="text-center border-b border-border pb-2">
                            <span className="text-[0.70rem] uppercase text-muted-foreground font-semibold">
                              Position #{data.index}
                            </span>
                          </div>
                          
                          {/* All Grades Information */}
                          {allGradesPayload && (
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-[#8884d8]"></div>
                                <span className="font-semibold text-[#8884d8] text-sm">
                                  All Grades
                                </span>
                              </div>
                              <div className="ml-5 space-y-1">
                                <span className="block text-sm">
                                  <strong>Grade:</strong> {data.grade}/100
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                  <strong>Subject:</strong> {data.subject}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                  <strong>Date:</strong> {data.date}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Selected Subject Information */}
                          {subjectGradesPayload && data.selectedSubjectGrade !== null && (
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-[#82ca9d]"></div>
                                <span className="font-semibold text-[#82ca9d] text-sm">
                                  {selectedSubject}
                                </span>
                                {data.hasActualSubjectGrade && (
                                  <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1 py-0.5 rounded">
                                    Actual
                                  </span>
                                )}
                              </div>
                              <div className="ml-5 space-y-1">
                                <span className="block text-sm">
                                  <strong>Grade:</strong> {data.selectedSubjectGrade.toFixed(1)}/100
                                </span>
                                {data.hasActualSubjectGrade && data.subjectGradeDate ? (
                                  <span className="block text-xs text-muted-foreground">
                                    <strong>Date:</strong> {data.subjectGradeDate}
                                  </span>
                                ) : (
                                  <span className="block text-xs text-muted-foreground">
                                    <strong>Position:</strong> Distributed across full width
                                  </span>
                                )}
                                {!data.hasActualSubjectGrade && (
                                  <span className="block text-xs text-orange-600 dark:text-orange-400 italic">
                                    Interpolated value
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Show message when only one line has data */}
                          {!subjectGradesPayload || data.selectedSubjectGrade === null ? (
                            <div className="text-xs text-muted-foreground italic text-center pt-1 border-t border-border">
                              No {selectedSubject} grade at this position
                            </div>
                          ) : null}
                          
                          {!allGradesPayload ? (
                            <div className="text-xs text-muted-foreground italic text-center pt-1 border-t border-border">
                              No grade data at this position
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="grade"
                stroke="#8884d8"
                strokeWidth={2}
                dot={{ r: 3, fill: "#8884d8" }}
                activeDot={{ r: 5, stroke: "#8884d8", strokeWidth: 2 }}
                name="All Grades"
                connectNulls={true}
              />
              <Line
                type="monotone"
                dataKey="selectedSubjectGrade"
                stroke="#82ca9d"
                strokeWidth={2}
                dot={{ r: 4, fill: "#82ca9d" }}
                activeDot={{ r: 6, stroke: "#82ca9d", strokeWidth: 2 }}
                name={selectedSubject}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No grade data available</p>
              <p className="text-sm">Grades will appear here once they are added</p>
            </div>
          </div>
        )}

        {/* Legend */}
        {recentGrades && recentGrades.length > 0 && (
          <div className="flex justify-center space-x-6 pt-2 border-t border-border">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-[#8884d8]"></div>
              <span className="text-sm text-muted-foreground">All Grades</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-[#82ca9d]"></div>
              <span className="text-sm text-muted-foreground">{selectedSubject}</span>
            </div>
          </div>
        )}
      </CardContent>
    </>
  );
}
