import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { useToast } from '../../hooks/use-toast';
import { Plus, Search, Filter, Calendar, CheckCircle, XCircle, Clock, Download, Users, Lock } from 'lucide-react';
import api from '../../api/api';
import { useFeatureToggles } from '../../context/FeatureToggleContext';

const Payments = () => {
  const { toast } = useToast();
  const { isFeatureEnabled, loading: featureLoading } = useFeatureToggles();
  
  // State management
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ paid: 0, pending: 0, overdue: 0, total: 0 });
  
  // Filters and pagination
  const [filters, setFilters] = useState({
    status: 'all',
    student: '',
    period: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  
  // Form states
  const [paymentForm, setPaymentForm] = useState({
    studentId: '',
    paymentPeriod: '',
    status: 'pending',
    paymentMethod: '',
    notes: ''
  });
  const [generateForm, setGenerateForm] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });

  // Load data on component mount
  useEffect(() => {
    fetchPayments();
    fetchStudents();
    fetchStats();
  }, [filters, currentPage]);

  // Fetch payments with filters
  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        ...filters
      });
      
      const response = await api.get(`/api/payments?${params}`);
      setPayments(response.data.payments);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch payments',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch students for dropdown
  const fetchStudents = async () => {
    try {
      const response = await api.get('/api/users?role=student&limit=1000');
      setStudents(response.data.users || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  // Fetch payment statistics
  const fetchStats = async () => {
    try {
      const response = await api.get('/api/payments/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Handle payment creation/update
  const handleSavePayment = async () => {
    try {
      if (selectedPayment) {
        // Update existing payment
        await api.put(`/api/payments/${selectedPayment._id}`, {
          status: paymentForm.status,
          paymentMethod: paymentForm.paymentMethod,
          notes: paymentForm.notes
        });
        toast({ title: 'Success', description: 'Payment updated successfully' });
      } else {
        // Create new payment
        await api.post('/api/payments', paymentForm);
        toast({ title: 'Success', description: 'Payment created successfully' });
      }
      
      setIsCreateModalOpen(false);
      setSelectedPayment(null);
      resetPaymentForm();
      fetchPayments();
      fetchStats();
    } catch (error) {
      console.error('Error saving payment:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save payment',
        variant: 'destructive'
      });
    }
  };

  // Handle monthly payment generation
  const handleGeneratePayments = async () => {
    try {
      const response = await api.post('/api/payments/generate', generateForm);
      toast({
        title: 'Success',
        description: response.data.message
      });
      setIsGenerateModalOpen(false);
      fetchPayments();
      fetchStats();
    } catch (error) {
      console.error('Error generating payments:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to generate payments',
        variant: 'destructive'
      });
    }
  };

  // Reset form
  const resetPaymentForm = () => {
    setPaymentForm({
      studentId: '',
      paymentPeriod: '',
      status: 'pending',
      paymentMethod: '',
      notes: ''
    });
  };

  // Open edit modal
  const handleEditPayment = (payment) => {
    setSelectedPayment(payment);
    setPaymentForm({
      studentId: payment.student._id,
      paymentPeriod: payment.paymentPeriod,
      status: payment.status,
      paymentMethod: payment.paymentMethod || '',
      notes: payment.notes || ''
    });
    setIsCreateModalOpen(true);
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    const variants = {
      paid: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      overdue: { color: 'bg-red-100 text-red-800', icon: XCircle }
    };
    
    const variant = variants[status] || variants.pending;
    const Icon = variant.icon;
    
    return (
      <Badge className={variant.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Generate period options for current and next few months
  const generatePeriodOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    for (let i = -2; i <= 6; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const period = `${year}-${month.toString().padStart(2, '0')}`;
      const display = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value: period, label: display });
    }
    
    return options;
  };

  const periodOptions = generatePeriodOptions();

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
          <h1 className="text-3xl font-bold">Payment Management</h1>
          <p className="text-gray-600">Track and manage student monthly payments</p>
        </div>
        
        <Card className="text-center py-12">
          <CardContent>
            <Lock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Feature Disabled</h3>
            <p className="text-gray-600 mb-4">
              The payment management feature is currently disabled for your school. 
            </p>
            <p className="text-sm text-gray-500">
              Contact your system administrator to enable this feature.
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
          <h1 className="text-3xl font-bold">Payment Management</h1>
          <p className="text-gray-600">Track and manage student monthly payments</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Generate Monthly
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Monthly Payments</DialogTitle>
                <DialogDescription>
                  Create payment records for all students for a specific month
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={generateForm.year}
                    onChange={(e) => setGenerateForm({...generateForm, year: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="month">Month</Label>
                  <Select 
                    value={generateForm.month.toString()} 
                    onValueChange={(value) => setGenerateForm({...generateForm, month: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({length: 12}, (_, i) => (
                        <SelectItem key={i+1} value={(i+1).toString()}>
                          {new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsGenerateModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleGeneratePayments}>
                  Generate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {selectedPayment ? 'Edit Payment' : 'Add Payment Record'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {!selectedPayment && (
                  <>
                    <div>
                      <Label htmlFor="student">Student</Label>
                      <Select value={paymentForm.studentId} onValueChange={(value) => setPaymentForm({...paymentForm, studentId: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((student) => (
                            <SelectItem key={student._id} value={student._id}>
                              {student.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="period">Payment Period</Label>
                      <Select value={paymentForm.paymentPeriod} onValueChange={(value) => setPaymentForm({...paymentForm, paymentPeriod: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          {periodOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={paymentForm.status} onValueChange={(value) => setPaymentForm({...paymentForm, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={paymentForm.paymentMethod} onValueChange={(value) => setPaymentForm({...paymentForm, paymentMethod: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Optional notes..."
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsCreateModalOpen(false);
                  setSelectedPayment(null);
                  resetPaymentForm();
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSavePayment}>
                  {selectedPayment ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="statusFilter">Status</Label>
              <Select 
                value={filters.status} 
                onValueChange={(value) => setFilters({...filters, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="studentFilter">Student</Label>
              <Select 
                value={filters.student} 
                onValueChange={(value) => setFilters({...filters, student: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Students</SelectItem>
                  {students.map((student) => (
                    <SelectItem key={student._id} value={student._id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="periodFilter">Period</Label>
              <Select 
                value={filters.period} 
                onValueChange={(value) => setFilters({...filters, period: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All periods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Periods</SelectItem>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>&nbsp;</Label>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setFilters({ status: 'all', student: '', period: '', search: '' })}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading payments...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No payment records found
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment._id}>
                      <TableCell className="font-medium">
                        {payment.student?.name || 'Unknown Student'}
                      </TableCell>
                      <TableCell>
                        {new Date(payment.paymentPeriod + '-01').toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.status)}
                      </TableCell>
                      <TableCell>
                        {new Date(payment.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        {payment.paymentMethod ? payment.paymentMethod.replace('_', ' ').toUpperCase() : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPayment(payment)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-4">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Payments;
