import React, { useMemo, useState } from "react";
import { CardHeader, CardTitle, CardContent } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import useReducedMotion from "./hooks/useReducedMotion";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "./ui/chart";

export function GradesGraph({ recentGrades }) {
  const prefersReducedMotion = useReducedMotion();
  
  // Extract available subjects
  const subjects = useMemo(
    () =>
      Array.from(
        new Set(recentGrades.map((g) => g.subject?.name || "Unknown Subject"))
      ),
    [recentGrades]
  );

  const [selectedSubject, setSelectedSubject] = useState(subjects[0] || "");

  // Update selectedSubject when subjects change
  React.useEffect(() => {
    if (subjects.length > 0 && !subjects.includes(selectedSubject)) {
      setSelectedSubject(subjects[0]);
    }
  }, [subjects, selectedSubject]);

  // Prepare graph data
  const { chartData, subjectChartData } = useMemo(() => {
    if (!recentGrades || recentGrades.length === 0) {
      return { chartData: [], subjectChartData: [] };
    }

    const sortedGrades = [...recentGrades]
      .filter(grade => grade && grade.value !== undefined)
      .sort((a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date));

    const selectedSubjectGrades = sortedGrades.filter(
      grade => (grade.subject?.name || "Unknown Subject") === selectedSubject
    );

    const allGradesData = sortedGrades.map((grade, index) => ({
      index: index + 1,
      grade: Number(grade.value) || 0,
      subject: grade.subject?.name || "Unknown Subject",
      date: new Date(grade.createdAt || grade.date).toLocaleDateString()
    }));

    let subjectData = [];
    if (selectedSubjectGrades.length > 0) {
      const totalWidth = sortedGrades.length;

      if (selectedSubjectGrades.length === 1) {
        const gradeValue = Number(selectedSubjectGrades[0].value) || 0;
        subjectData = [
          { index: 1, selectedSubjectGrade: gradeValue },
          { index: totalWidth, selectedSubjectGrade: gradeValue }
        ];
      } else {
        subjectData = selectedSubjectGrades.map((grade, index) => {
          const position = 1 + (index * (totalWidth - 1)) / (selectedSubjectGrades.length - 1);
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

  // Combined data for the chart
  const combinedData = useMemo(() => {
    return chartData.map((point) => {
      const subjectPoint = subjectChartData.find(sp => sp.index === point.index);
      return {
        ...point,
        selectedSubjectGrade: subjectPoint ? subjectPoint.selectedSubjectGrade : undefined,
      };
    });
  }, [chartData, subjectChartData]);

  // Chart configuration for shadcn
  const chartConfig = useMemo(() => ({
    grade: {
      label: "All Grades",
      color: "hsl(var(--chart-1))",
    },
    selectedSubjectGrade: {
      label: selectedSubject || "Subject Grade",
      color: "hsl(var(--chart-2))",
    },
  }), [selectedSubject]);

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
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <LineChart
              accessibilityLayer
              data={combinedData}
              margin={{
                left: 0,
                right: 20,
                top: 10,
                bottom: 5
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="index"
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
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                dataKey="grade"
                type="natural"
                stroke="var(--color-grade)"
                strokeWidth={2}
                dot={{
                  fill: "var(--color-grade)",
                }}
                activeDot={{
                  r: 6,
                }}
                isAnimationActive={!prefersReducedMotion}
              />
              <Line
                key={`line-${selectedSubject}`}
                dataKey="selectedSubjectGrade"
                type="natural"
                stroke="var(--color-selectedSubjectGrade)"
                strokeWidth={2}
                dot={{
                  fill: "var(--color-selectedSubjectGrade)",
                }}
                activeDot={{
                  r: 6,
                }}
                connectNulls={true}
                isAnimationActive={!prefersReducedMotion}
              />
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No grade data available</p>
              <p className="text-sm">Grades will appear here once they are added</p>
            </div>
          </div>
        )}
      </CardContent>
    </>
  );
}
