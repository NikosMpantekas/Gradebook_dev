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

  // Prepare graph data: single array with both all grades and selected subject grades
  const chartData = useMemo(() => {
    if (!recentGrades || recentGrades.length === 0) {
      return [];
    }

    // Sort grades by date (oldest first) so latest grades are on the right
    const sortedGrades = [...recentGrades]
      .filter(grade => grade && grade.value !== undefined)
      .sort((a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date));

    // Create array spanning full width with both data points
    // For selected subject, we want a continuous line that extends across the full width
    return sortedGrades.map((grade, index) => {
      const isSelectedSubject = (grade.subject?.name || "Unknown Subject") === selectedSubject;
      return {
        index: index + 1,
        grade: Number(grade.value) || 0,
        selectedSubjectGrade: isSelectedSubject ? (Number(grade.value) || 0) : null,
        subject: grade.subject?.name || "Unknown Subject",
        date: new Date(grade.createdAt || grade.date).toLocaleDateString()
      };
    });
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
            <LineChart data={chartData} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
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
                domain={[0, 20]}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="flex flex-col space-y-1">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Grade #{data.index}
                          </span>
                          <span className="font-bold text-[#8884d8]">
                            Grade: {data.grade}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Subject: {data.subject}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Date: {data.date}
                          </span>
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
                dot={{ r: 3, fill: "#82ca9d" }}
                activeDot={{ r: 5, stroke: "#82ca9d", strokeWidth: 2 }}
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
