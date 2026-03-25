import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTheme } from '../../components/theme-provider';
import { 
  Search,
  Eye,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BookOpen,
  Calendar,
  User,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { getStudentGrades } from '../../features/grades/gradeSlice';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { TooltipProvider } from '../../components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { Spinner } from '../../components/ui/spinner';

// Import mobile detection and utilities
import { useIsMobile } from '../../components/hooks/use-mobile';
import { cn } from '../../lib/utils';

// Register ChartJS components
ChartJS.register(ArcElement, ChartTooltip, Legend);

const StudentGrades = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { darkMode } = useTheme();
  const isMobile = useIsMobile();
  
  const { user } = useSelector((state) => state.auth);
  const { grades, isLoading } = useSelector((state) => state.grades);
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredGrades, setFilteredGrades] = useState([]);
  const [displayedGrades, setDisplayedGrades] = useState([]);
  const [gradeStats, setGradeStats] = useState({
    average: 0,
    highestGrade: 0,
    lowestGrade: 0,
    passingRate: 0,
    gradeDistribution: {},
  });

  useEffect(() => {
    dispatch(getStudentGrades(user._id));
  }, [dispatch, user._id]);

  useEffect(() => {
    if (grades && grades.length > 0) {
      applyFilters();
      calculateStats();
    }
  }, [grades, searchTerm]);

  const applyFilters = () => {
    if (!grades) return;
    
    let filtered = [...grades];
    
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((grade) => 
        (grade.subject && grade.subject.name && grade.subject.name.toLowerCase().includes(search)) ||
        (grade.description && grade.description.toLowerCase().includes(search)) ||
        (grade.teacher && grade.teacher.name && grade.teacher.name.toLowerCase().includes(search))
      );
    }
    
    setFilteredGrades(filtered);
    setDisplayedGrades(filtered);
  };

  const calculateStats = () => {
    if (!grades || grades.length === 0) return;

    // Calculate average grade
    const sum = grades.reduce((acc, grade) => acc + grade.value, 0);
    const average = sum / grades.length;
    
    // Calculate highest and lowest grades
    const highestGrade = Math.max(...grades.map(grade => grade.value));
    const lowestGrade = Math.min(...grades.map(grade => grade.value));
    
    // Calculate passing rate (grades >= 50)
    const passingGrades = grades.filter(grade => grade.value >= 50).length;
    const passingRate = (passingGrades / grades.length) * 100;
    
    // Calculate grade distribution
    const distribution = {
      'A (90-100)': grades.filter(grade => grade.value >= 90).length,
      'B (80-89)': grades.filter(grade => grade.value >= 80 && grade.value < 90).length,
      'C (70-79)': grades.filter(grade => grade.value >= 70 && grade.value < 80).length,
      'D (60-69)': grades.filter(grade => grade.value >= 60 && grade.value < 70).length,
      'E (50-59)': grades.filter(grade => grade.value >= 50 && grade.value < 60).length,
      'F (0-49)': grades.filter(grade => grade.value < 50).length,
    };

    setGradeStats({
      average: average.toFixed(2),
      highestGrade,
      lowestGrade,
      passingRate: passingRate.toFixed(2),
      gradeDistribution: distribution,
    });
  };

  const handleChangePage = (newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (newRowsPerPage) => {
    setRowsPerPage(parseInt(newRowsPerPage, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleViewGrade = (id) => {
    navigate(`/app/grades/${id}`);
  };

  // Prepare data for Pie chart
  const pieData = {
    labels: Object.keys(gradeStats.gradeDistribution || {}),
    datasets: [
      {
        label: 'Grade Distribution',
        data: Object.values(gradeStats.gradeDistribution || {}),
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 205, 86, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(255, 99, 132, 0.6)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const getGradeColor = (grade) => {
    if (grade >= 80) return 'text-white font-semibold' + ' ' + 'bg-[hsl(var(--success))]';
    if (grade >= 60) return 'text-white font-semibold' + ' ' + 'bg-[hsl(var(--info))]';
    if (grade >= 50) return 'text-white font-semibold' + ' ' + 'bg-[hsl(var(--warning))]';
    return 'text-white font-semibold' + ' ' + 'bg-[hsl(var(--error))]';
  };

  // Mobile card layout for grades
  const renderMobileContent = () => {
    const paginatedGrades = filteredGrades.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    
    if (paginatedGrades.length === 0) {
      return (
        <div className="text-center py-8">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('student.noGradesAvailable')}</h3>
          <p className="text-muted-foreground">
            {!grades || grades.length === 0 ? t('student.noGradesYet') : t('student.noGradesMatch')}
          </p>
        </div>
      );
    }

    return (
      <div className="px-1 sm:px-2">
        {paginatedGrades.map((grade) => (
          <Card
            key={grade._id}
            className="mb-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 dark:border-gray-600 dark:hover:shadow-gray-800/50"
          >
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg overflow-hidden text-ellipsis whitespace-nowrap text-foreground">
                      {grade.subject?.name || 'N/A'}
                    </h3>
                    <Badge className={getGradeColor(grade.value) + ' text-sm'}>
                      {grade.value}
                    </Badge>
                  </div>
                  
                  {grade.teacher?.name && (
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {grade.teacher.name}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {grade.date ? format(new Date(grade.date), 'PPP') : 'N/A'}
                    </span>
                  </div>
                  
                  {grade.description && (
                    <div className="mb-2">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {grade.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action button */}
              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewGrade(grade._id)}
                  title={t('student.viewDetails')}
                  className="hover:bg-muted dark:hover:bg-gray-700 gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {t('student.viewDetails')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Desktop table layout
  const renderDesktopContent = () => {
    return (
      <div className="rounded-lg border bg-card dark:border-gray-600">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200 dark:border-gray-600">
                <TableHead className="text-left p-4 text-foreground font-medium">{t('student.subject')}</TableHead>
                <TableHead className="text-center p-4 text-foreground font-medium">{t('student.grade')}</TableHead>
                <TableHead className="text-left p-4 text-foreground font-medium">{t('student.description')}</TableHead>
                <TableHead className="text-left p-4 text-foreground font-medium">{t('student.teacher')}</TableHead>
                <TableHead className="text-left p-4 text-foreground font-medium">{t('student.date')}</TableHead>
                <TableHead className="text-center p-4 text-foreground font-medium">{t('student.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGrades
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .length > 0 ? (
                filteredGrades
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((grade) => (
                    <TableRow key={grade._id} className="border-b border-gray-200 dark:border-gray-600 hover:bg-muted/50 dark:hover:bg-gray-800">
                      <TableCell className="p-4 font-medium text-foreground text-base">
                        {grade.subject?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="p-4 text-center">
                        <Badge className={getGradeColor(grade.value)}>
                          {grade.value}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-4 text-foreground text-base max-w-xs truncate">
                        {grade.description || 'N/A'}
                      </TableCell>
                      <TableCell className="p-4 text-foreground text-base">
                        {grade.teacher?.name || 'N/A'}
                      </TableCell>
                      <TableCell className="p-4 text-foreground text-base">
                        {grade.date ? format(new Date(grade.date), 'PPP') : 'N/A'}
                      </TableCell>
                      <TableCell className="p-4 text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewGrade(grade._id)}
                              title={t('student.viewDetails')}
                              className="hover:bg-muted dark:hover:bg-gray-700 px-4 py-2"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('student.viewDetails')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="text-center">
                      <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">{t('student.noGradesAvailable')}</h3>
                      <p className="text-muted-foreground">
                        {!grades || grades.length === 0 ? t('student.noGradesYet') : t('student.noGradesMatch')}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Spinner>
          <Loader2 className="h-12 w-12 text-primary" />
        </Spinner>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('student.myGrades')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('student.viewAndTrack')}
            </p>
          </div>
        </div>

        {grades && grades.length > 0 ? (
          <>
            {/* Stats Cards and Grade Distribution Chart - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Average Grade */}
                <Card>
                  <CardContent className="p-4 text-center flex flex-col items-center justify-center h-full">
                    <div className="flex items-center justify-center mb-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{t('student.average')}</p>
                    <p className="text-2xl font-bold text-primary">{gradeStats.average}</p>
                  </CardContent>
                </Card>

                {/* Highest Grade */}
                <Card>
                  <CardContent className="p-4 text-center flex flex-col items-center justify-center h-full">
                    <div className="flex items-center justify-center mb-2">
                      <Award className="h-5 w-5" style={{color: 'hsl(var(--success))'}} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{t('student.highest')}</p>
                    <p className="text-2xl font-bold" style={{color: 'hsl(var(--success))'}}>{gradeStats.highestGrade}</p>
                  </CardContent>
                </Card>

                {/* Lowest Grade */}
                <Card>
                  <CardContent className="p-4 text-center flex flex-col items-center justify-center h-full">
                    <div className="flex items-center justify-center mb-2">
                      <AlertTriangle className="h-5 w-5" style={{color: 'hsl(var(--error))'}} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{t('student.lowest')}</p>
                    <p className="text-2xl font-bold" style={{color: 'hsl(var(--error))'}}>{gradeStats.lowestGrade}</p>
                  </CardContent>
                </Card>

                {/* Passing Rate */}
                <Card>
                  <CardContent className="p-4 text-center flex flex-col items-center justify-center h-full">
                    <div className="flex items-center justify-center mb-2">
                      <CheckCircle className="h-5 w-5" style={{color: 'hsl(var(--info))'}} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{t('student.passingRate')}</p>
                    <p className="text-2xl font-bold" style={{color: 'hsl(var(--info))'}}>{gradeStats.passingRate}%</p>
                  </CardContent>
                </Card>
              </div>

              {/* Grade Distribution Chart */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      {t('student.gradeDistribution')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-80 flex justify-center items-center relative">
                      {isLoading ? (
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Loader2 className="h-8 w-8 animate-spin mb-2" />
                          <p className="text-sm">{t('student.loadingChart')}</p>
                        </div>
                      ) : !grades || grades.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <BookOpen className="h-12 w-12 mb-2 opacity-50" />
                          <p className="text-sm">{t('student.noGradesForChart')}</p>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Pie 
                            data={pieData} 
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              animation: {
                                duration: 1000,
                                easing: 'easeInOutQuart'
                              },
                              plugins: {
                                legend: {
                                  position: 'bottom',
                                  labels: {
                                    usePointStyle: true,
                                    padding: 20
                                  }
                                }
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('student.searchGrades')}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Grades List */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                {t('student.grades')}
              </h2>
              
              {/* Responsive layout */}
              {isMobile ? renderMobileContent() : renderDesktopContent()}
              
              {/* Pagination */}
              {filteredGrades.length > 0 && (
                <div className="flex items-center justify-between space-x-2 py-4 mt-4">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-muted-foreground">{t('student.rowsPerPage')}</p>
                    <Select value={rowsPerPage.toString()} onValueChange={handleChangeRowsPerPage}>
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-muted-foreground">
                      {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, filteredGrades.length)} of {filteredGrades.length}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleChangePage(page - 1)}
                      disabled={page === 0}
                    >
                      {t('student.previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleChangePage(page + 1)}
                      disabled={(page + 1) * rowsPerPage >= filteredGrades.length}
                    >
                      {t('student.next')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">{t('student.noGradesAvailable')}</h3>
              <p className="text-muted-foreground text-center">
                {t('student.noGradesYet')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};

export default StudentGrades;
