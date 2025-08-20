import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../components/ui/use-toast';
import { CheckCircle, XCircle, Clock, Calendar, User, AlertTriangle, Download, Lock } from 'lucide-react';
import api from '../../app/axios';
import { useFeatureToggles } from '../../context/FeatureToggleContext';

const ParentPayments = () => {
  const { toast } = useToast();
  const { user } = useSelector((state) => state.auth);
  const { isFeatureEnabled, loading: featureLoading } = useFeatureToggles();
  
  // State management
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Load data on component mount
  useEffect(() => {
    fetchLinkedStudents();
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      fetchPayments();
    }
  }, [selectedStudent, selectedYear, students]);

  // Fetch linked students for this parent
  const fetchLinkedStudents = async () => {
    try {
      const response = await api.get('/api/users/me');
      const parentData = response.data;
      
      if (parentData.linkedStudents && parentData.linkedStudents.length > 0) {
        setStudents(parentData.linkedStudents);
      } else {
        // Fallback: fetch students where parent is linked
        const studentsResponse = await api.get('/api/users?role=student');
        const linkedStudents = studentsResponse.data.users?.filter(student => 
          student.parentIds?.includes(user._id)
        ) || [];
        setStudents(linkedStudents);
      }
    } catch (error) {
      console.error('Error fetching linked students:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch linked students',
        variant: 'destructive'
      });
    }
  };

  // Fetch payments for selected student(s)
  const fetchPayments = async () => {
    try {
      setLoading(true);
      let allPayments = [];

      if (selectedStudent === 'all') {
        // Fetch payments for all linked students
        const paymentPromises = students.map(student => 
          api.get(`/api/payments/student/${student._id}?year=${selectedYear}`)
        );
        const responses = await Promise.all(paymentPromises);
        allPayments = responses.flatMap(response => response.data);
      } else {
        // Fetch payments for specific student
        const response = await api.get(`/api/payments/student/${selectedStudent}?year=${selectedYear}`);
        allPayments = response.data;
      }

      // Sort by payment period (newest first)
      allPayments.sort((a, b) => b.paymentPeriod.localeCompare(a.paymentPeriod));
      setPayments(allPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch payment history',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Get status badge with appropriate styling
  const getStatusBadge = (status) => {
    const variants = {
      paid: { 
        color: 'bg-green-100 text-green-800 border-green-200', 
        icon: CheckCircle,
        label: 'Paid'
      },
      pending: { 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        icon: Clock,
        label: 'Pending'
      },
      overdue: { 
        color: 'bg-red-100 text-red-800 border-red-200', 
        icon: XCircle,
        label: 'Overdue'
      }
    };
    
    const variant = variants[status] || variants.pending;
    const Icon = variant.icon;
    
    return (
      <Badge className={`${variant.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {variant.label}
      </Badge>
    );
  };

  // Get payment statistics
  const getPaymentStats = () => {
    const stats = payments.reduce(
      (acc, payment) => {
        acc[payment.status] = (acc[payment.status] || 0) + 1;
        acc.total++;
        return acc;
      },
      { paid: 0, pending: 0, overdue: 0, total: 0 }
    );
    return stats;
  };

  const stats = getPaymentStats();

  // Format payment period for display
  const formatPaymentPeriod = (period) => {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get student name by ID
  const getStudentName = (studentId) => {
    const student = students.find(s => s._id === studentId);
    return student ? student.name : 'Unknown Student';
  };

  // Generate year options (current year and previous 2 years)
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 3 }, (_, i) => currentYear - i);
  };

  const yearOptions = generateYearOptions();

  // Check if payments feature is enabled
  if (featureLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (!isFeatureEnabled('enablePayments')) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Payment History</h1>
          <p className="text-gray-600">View your children's payment records</p>
        </div>
        
        <Card className="text-center py-12">
          <CardContent>
            <Lock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Feature Disabled</h3>
            <p className="text-gray-600 mb-4">
              The payment tracking feature is currently disabled for your school.
            </p>
            <p className="text-sm text-gray-500">
              Contact your school administrator for more information.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (students.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Payment History</h1>
          <p className="text-gray-600">View your children's payment records</p>
        </div>
        
        <Card className="text-center py-12">
          <CardContent>
            <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Linked</h3>
            <p className="text-gray-600">
              You don't have any students linked to your parent account. Please contact the school administrator to link your children to your account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Payment History</h1>
          <p className="text-gray-600">Track your children's monthly payment records</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="studentFilter">Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All My Children</SelectItem>
                  {students.map((student) => (
                    <SelectItem key={student._id} value={student._id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="yearFilter">Year</Label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Button variant="outline" onClick={fetchPayments} disabled={loading}>
                <Calendar className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Paid</p>
                <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Payment Records for {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading payment history...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment Records</h3>
              <p className="text-gray-600">
                No payment records found for the selected student(s) and year.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {selectedStudent === 'all' && <TableHead>Student</TableHead>}
                  <TableHead>Payment Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment._id}>
                    {selectedStudent === 'all' && (
                      <TableCell className="font-medium">
                        {getStudentName(payment.student)}
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      {formatPaymentPeriod(payment.paymentPeriod)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {new Date(payment.dueDate).toLocaleDateString()}
                        {payment.status === 'overdue' && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {payment.paidDate ? (
                        <span className="text-green-600 font-medium">
                          {new Date(payment.paidDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not paid yet</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {payment.paymentMethod ? (
                        <Badge variant="outline">
                          {payment.paymentMethod.replace('_', ' ').toUpperCase()}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {payment.notes ? (
                        <span className="text-sm text-gray-600" title={payment.notes}>
                          {payment.notes.length > 30 
                            ? `${payment.notes.substring(0, 30)}...` 
                            : payment.notes
                          }
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Payment Information
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <ul className="space-y-2 text-sm">
            <li>• <strong>Pending:</strong> Payment has not been received yet</li>
            <li>• <strong>Paid:</strong> Payment has been confirmed by the school</li>
            <li>• <strong>Overdue:</strong> Payment is past the due date (15th of each month)</li>
            <li>• Contact the school office if you believe there's an error in the payment records</li>
            <li>• Payment methods and dates are recorded when payments are processed by the school</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParentPayments;
