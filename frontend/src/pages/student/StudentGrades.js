import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Typography, 
  Paper, 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Grid,
  useMediaQuery,
  useTheme,
  Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title } from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';
import { getStudentGrades } from '../../features/grades/gradeSlice';

// Register ChartJS components
ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

const StudentGrades = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
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
    progressOverTime: [],
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
    
    // Calculate progress over time
    // Group grades by month and calculate average
    const sortedGrades = [...grades].sort((a, b) => new Date(a.date) - new Date(b.date));
    const progressData = [];
    
    // Group grades by month for the chart
    const monthlyData = {};
    sortedGrades.forEach(grade => {
      const monthYear = format(new Date(grade.date), 'MMM yyyy');
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = {
          total: grade.value,
          count: 1
        };
      } else {
        monthlyData[monthYear].total += grade.value;
        monthlyData[monthYear].count += 1;
      }
    });
    
    // Calculate monthly averages
    Object.keys(monthlyData).forEach(month => {
      progressData.push({
        month,
        average: monthlyData[month].total / monthlyData[month].count
      });
    });
    
    setGradeStats({
      average: average.toFixed(2),
      highestGrade,
      lowestGrade,
      passingRate: passingRate.toFixed(2),
      gradeDistribution: distribution,
      progressOverTime: progressData,
    });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
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

  // Prepare data for Line chart
  const lineData = {
    labels: gradeStats.progressOverTime ? gradeStats.progressOverTime.map(item => item.month) : [],
    datasets: [
      {
        label: 'Average Grade',
        data: gradeStats.progressOverTime ? gradeStats.progressOverTime.map(item => item.average) : [],
        fill: false,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.4,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
      },
    },
  };

  return (
    <Box sx={{ flexGrow: 1, px: { xs: 1, sm: 2, md: 3 } }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold', textAlign: { xs: 'center', sm: 'left' } }}>
        My Grades
      </Typography>
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      ) : displayedGrades.length === 0 ? (
        <Paper sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">
            No grades found
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            There are no grades available for your account or with the current filters.
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Grade Stats Summary Cards - MOBILE OPTIMIZED */}
          {grades && grades.length > 0 && (
            <Grid container spacing={2} sx={{ mb: 3, justifyContent: 'center' }}>
              <Grid item xs={6} sm={3}>
                <Card sx={{ 
                  height: '100%',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  borderRadius: 2,
                  p: { xs: 1, sm: 2 }, // Smaller padding on mobile
                }}>
                  <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                    <Typography 
                      color="text.secondary" 
                      gutterBottom
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' }, textAlign: 'center' }}
                    >
                      Average
                    </Typography>
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        fontWeight: 'bold', 
                        color: 'primary.main',
                        fontSize: { xs: '1.25rem', sm: '1.5rem' },
                        textAlign: 'center'
                      }}
                    >
                      {gradeStats.average}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Card sx={{ 
                  height: '100%', 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  borderRadius: 2,
                  p: { xs: 1, sm: 2 }, // Smaller padding on mobile
                }}>
                  <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                    <Typography 
                      color="text.secondary" 
                      gutterBottom
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' }, textAlign: 'center' }}
                    >
                      Highest
                    </Typography>
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        fontWeight: 'bold', 
                        color: 'success.main',
                        fontSize: { xs: '1.25rem', sm: '1.5rem' },
                        textAlign: 'center'
                      }}
                    >
                      {gradeStats.highestGrade}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Card sx={{ 
                  height: '100%',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  borderRadius: 2,
                  p: { xs: 1, sm: 2 }, // Smaller padding on mobile
                }}>
                  <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                    <Typography 
                      color="text.secondary" 
                      gutterBottom
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' }, textAlign: 'center' }}
                    >
                      Lowest
                    </Typography>
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        fontWeight: 'bold', 
                        color: 'error.main',
                        fontSize: { xs: '1.25rem', sm: '1.5rem' },
                        textAlign: 'center'
                      }}
                    >
                      {gradeStats.lowestGrade}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Card sx={{ 
                  height: '100%',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  borderRadius: 2,
                  p: { xs: 1, sm: 2 }, // Smaller padding on mobile
                }}>
                  <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                    <Typography 
                      color="text.secondary" 
                      gutterBottom
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.875rem' }, textAlign: 'center' }}
                    >
                      Passing Rate
                    </Typography>
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        fontWeight: 'bold', 
                        color: 'info.main',
                        fontSize: { xs: '1.25rem', sm: '1.5rem' },
                        textAlign: 'center'
                      }}
                    >
                      {gradeStats.passingRate}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
          
          {/* Charts Section - MOBILE OPTIMIZED with better centering */}
          <Grid container spacing={3} sx={{ mb: 3, justifyContent: 'center' }}>
            {/* Grade Distribution Chart */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ 
                p: { xs: 2, sm: 3 }, 
                borderRadius: 2, 
                height: '100%',
                mx: 'auto', // Center horizontally
                width: '100%',
                maxWidth: { xs: '100%', sm: '100%' }
              }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', textAlign: { xs: 'center', sm: 'left' } }}>
                  Grade Distribution
                </Typography>
                <Box sx={{ 
                  height: 280, 
                  display: 'flex', 
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '100%'
                }}>
                  <Pie data={pieData} />
                </Box>
              </Paper>
            </Grid>
            
            {/* Progress Over Time Chart */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ 
                p: { xs: 2, sm: 3 }, 
                borderRadius: 2, 
                height: '100%',
                mx: 'auto', // Center horizontally
                width: '100%',
                maxWidth: { xs: '100%', sm: '100%' }
              }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', textAlign: { xs: 'center', sm: 'left' } }}>
                  Progress Over Time
                </Typography>
                <Box sx={{ 
                  height: 280, 
                  display: 'flex', 
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '100%'
                }}>
                  {gradeStats.progressOverTime && gradeStats.progressOverTime.length > 1 ? (
                    <Line data={lineData} options={lineOptions} />
                  ) : (
                    <Typography variant="body2" color="textSecondary" sx={{ alignSelf: 'center', textAlign: 'center' }}>
                      Not enough data to show progress over time.
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
          
          {/* Filter Controls - Mobile Optimized */}
          <Box sx={{ 
            mb: 3, 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' }, 
            gap: 2,
            width: '100%',
            maxWidth: { xs: '100%', sm: '100%' },
            mx: 'auto' // Center on all screen sizes
          }}>
            <TextField
              label="Search"
              variant="outlined"
              size="small"
              fullWidth
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ flexGrow: 1 }}
            />
          </Box>
          
          {/* Responsive Grades Table - MOBILE FIRST APPROACH */}
          {isMobile ? (
            // Mobile card-based layout
            <Box sx={{ mb: 3 }}>
              {filteredGrades
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((grade) => (
                  <Card 
                    key={grade._id} 
                    sx={{ 
                      mb: 2, 
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <Box sx={{ 
                      bgcolor: 'primary.main', 
                      py: 1, 
                      px: 2, 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center' 
                    }}>
                      <Typography sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        {grade.subject?.name || 'N/A'}
                      </Typography>
                      <Chip
                        label={grade.value}
                        color={
                          grade.value >= 80 ? 'success' :
                          grade.value >= 60 ? 'primary' :
                          grade.value >= 50 ? 'warning' : 'error'
                        }
                        size="small"
                        sx={{ 
                          fontWeight: 'bold',
                          color: 'white',
                          bgcolor: grade.value >= 80 ? 'success.main' :
                                 grade.value >= 60 ? 'primary.main' :
                                 grade.value >= 50 ? 'warning.main' : 'error.main',
                        }}
                      />
                    </Box>
                    <CardContent sx={{ p: 1.5 }}>
                      <Grid container spacing={1}>
                        <Grid item xs={12}>
                          <Typography variant="body2" sx={{ mb: 1, fontSize: '0.8rem' }}>
                            <strong>Description:</strong> {grade.description || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            <strong>Teacher:</strong> {grade.teacher?.name || 'N/A'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                            <strong>Date:</strong> {grade.date ? format(new Date(grade.date), 'MM/dd/yyyy') : 'N/A'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                    <Box sx={{ 
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      p: 1,
                      display: 'flex',
                      justifyContent: 'center'
                    }}>
                      <Button 
                        size="small" 
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewGrade(grade._id)}
                      >
                        View Details
                      </Button>
                    </Box>
                  </Card>
                ))}
            </Box>
          ) : (
            // Desktop table layout
            <TableContainer 
              component={Paper} 
              sx={{ 
                mb: 3, 
                borderRadius: 2, 
                overflow: 'hidden',
                width: '100%',
                mx: 'auto' // Center the table container
              }}
            >
              <Table 
                sx={{ 
                  minWidth: { sm: 650 },
                  width: '100%'
                }} 
                aria-label="grades table"
              >
                <TableHead sx={{ bgcolor: 'primary.main' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Subject</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>Grade</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Description</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Teacher</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredGrades
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((grade) => (
                      <TableRow key={grade._id}>
                        <TableCell component="th" scope="row">
                          {grade.subject?.name || 'N/A'}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Chip
                            label={grade.value}
                            color={
                              grade.value >= 80 ? 'success' :
                              grade.value >= 60 ? 'primary' :
                              grade.value >= 50 ? 'warning' : 'error'
                            }
                            variant="outlined"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                        <TableCell>{grade.description || 'N/A'}</TableCell>
                        <TableCell>{grade.teacher?.name || 'N/A'}</TableCell>
                        <TableCell>
                          {grade.date ? format(new Date(grade.date), 'PPP') : 'N/A'}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleViewGrade(grade._id)}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          {/* Pagination Component - Separated out */}
          <Paper sx={{ borderRadius: 2, overflow: 'hidden', mb: 3 }}>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredGrades.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                  margin: { xs: 0, sm: 'auto' },
                  textAlign: { xs: 'center', sm: 'left' }
                },
                '.MuiTablePagination-toolbar': {
                  flexWrap: { xs: 'wrap', sm: 'nowrap' },
                  justifyContent: 'center'
                }
              }}
            />
          </Paper>
        </>
      )}
    </Box>
  );
};

export default StudentGrades;
