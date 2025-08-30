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
import { useToast } from '../../components/ui/use-toast';
import { Plus, Search, Filter, Calendar, CheckCircle, XCircle, Clock, Download, Users, Lock } from 'lucide-react';
import api from '../../app/axios';
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
    parentId: '',
    studentId: '',
    linkedStudents: [],
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
      console.log('[PAYMENTS] API URL:', api.defaults.baseURL);
      console.log('[PAYMENTS] Request URL:', `/api/payments?${params}`);
      console.log('[PAYMENTS] Frontend response type:', typeof response.data);
      console.log('[PAYMENTS] Frontend response:', response.data);
      
      setPayments(response.data.payments || []);
      setTotalPages(response.data.pagination?.pages || 1);
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

  // Fetch parents with their linked students for dropdown
  const fetchStudents = async () => {
    try {
      console.log('[PAYMENTS] Fetching parents with students...');
      const parentsResponse = await api.get('/api/users?role=parent&limit=1000');
      const studentsResponse = await api.get('/api/users?role=student&limit=1000');
      
      const parents = parentsResponse.data.users || parentsResponse.data || [];
      const allStudents = studentsResponse.data.users || studentsResponse.data || [];
      
      console.log('[PAYMENTS] Parents response:', parents.length);
      console.log('[PAYMENTS] Students response:', allStudents.length);
      
      // Create parent-student mapping for display
      const parentsWithStudents = parents.map(parent => {
        const linkedStudents = allStudents.filter(student => 
          student.parentIds && student.parentIds.includes(parent._id)
        );
        return {
          ...parent,
          linkedStudents,
          displayName: `${parent.name} (${linkedStudents.map(s => s.name).join(', ')})`
        };
      }).filter(parent => parent.linkedStudents.length > 0); // Only show parents with linked students
      
      setStudents(parentsWithStudents);
      console.log('[PAYMENTS] Processed parents with students:', parentsWithStudents.length);
    } catch (error) {
      console.error('Error fetching parents/students:', error);
      setStudents([]);
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
      parentId: '',
      studentId: '',
      linkedStudents: [],
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
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payment Management</h1>
          <p className="text-muted-foreground">Track and manage student monthly payments</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Calendar className="w-4 h-4 mr-2" />
                Generate Monthly
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md">
              <DialogHeader>
                <DialogTitle>Generate Monthly Payments</DialogTitle>
                <DialogDescription>
                  Create payment records for all students for a specific month
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {selectedPayment ? 'Edit Payment' : 'Add Payment Record'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 sm:space-y-4">
                {!selectedPayment && (
                  <>
                    <div>
                      <Label htmlFor="student" className="text-sm">Parent (Students)</Label>
                      <Select value={paymentForm.parentId} onValueChange={(value) => {
                        const selectedParent = students.find(p => p._id === value);
                        setPaymentForm({...paymentForm, parentId: value, linkedStudents: selectedParent?.linkedStudents || []});
                      }}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select parent" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((parent) => (
                            <SelectItem key={parent._id} value={parent._id}>
                              {parent.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {paymentForm.linkedStudents && paymentForm.linkedStudents.length > 0 && (
                      <div>
                        <Label htmlFor="specificStudent" className="text-sm">Select Student</Label>
                        <Select value={paymentForm.studentId} onValueChange={(value) => setPaymentForm({...paymentForm, studentId: value})}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select specific student" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentForm.linkedStudents.map((student) => (
                              <SelectItem key={student._id} value={student._id}>
                                {student.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="period" className="text-sm">Payment Period</Label>
                      <Select value={paymentForm.paymentPeriod} onValueChange={(value) => setPaymentForm({...paymentForm, paymentPeriod: value})}>
                        <SelectTrigger className="mt-1">
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
                  <Label htmlFor="status" className="text-sm">Status</Label>
                  <Select value={paymentForm.status} onValueChange={(value) => setPaymentForm({...paymentForm, status: value})}>
                    <SelectTrigger className="mt-1">
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
                  <Label htmlFor="paymentMethod" className="text-sm">Payment Method</Label>
                  <Select value={paymentForm.paymentMethod} onValueChange={(value) => setPaymentForm({...paymentForm, paymentMethod: value})}>
                    <SelectTrigger className="mt-1">
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
                  <Label htmlFor="notes" className="text-sm">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Optional notes..."
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                    rows={3}
                    className="mt-1"
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border bg-card dark:border-gray-600">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Paid</p>
              <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 rounded-lg border bg-card dark:border-gray-600">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 rounded-lg border bg-card dark:border-gray-600">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 rounded-lg border bg-card dark:border-gray-600">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Total Records</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 mb-6 rounded-lg border bg-card dark:border-gray-600">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3">
            <Label htmlFor="statusFilter" className="text-sm font-medium mb-2 block text-foreground">Status</Label>
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
          
          <div className="md:col-span-3">
            <Label htmlFor="studentFilter" className="text-sm font-medium mb-2 block text-foreground">Student</Label>
            <Select 
              value={filters.student} 
              onValueChange={(value) => setFilters({...filters, student: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="All students" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                {students.map((student) => (
                  <SelectItem key={student._id} value={student._id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="md:col-span-3">
            <Label htmlFor="periodFilter" className="text-sm font-medium mb-2 block text-foreground">Period</Label>
            <Select 
              value={filters.period} 
              onValueChange={(value) => setFilters({...filters, period: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="All periods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Periods</SelectItem>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="md:col-span-3">
            <Label htmlFor="clearFilters" className="text-sm font-medium mb-2 block text-foreground">&nbsp;</Label>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setFilters({ status: 'all', student: '', period: '', search: '' })}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

            {/* Payments Table */}
      <div className="mt-6 rounded-lg border bg-card dark:border-gray-600">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600">
                <th className="text-left p-4 text-foreground font-medium">
                  Student
                </th>
                <th className="text-left p-4 text-foreground font-medium">
                  Period
                </th>
                <th className="text-left p-4 text-foreground font-medium">
                  Status
                </th>
                <th className="text-left p-4 text-foreground font-medium">
                  Due Date
                </th>
                <th className="text-left p-4 text-foreground font-medium">
                  Paid Date
                </th>
                <th className="text-left p-4 text-foreground font-medium">
                  Method
                </th>
                <th className="text-left p-4 text-foreground font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex justify-center items-center gap-3 py-6">
                      <span className="text-base text-foreground">Loading payments...</span>
                    </div>
                  </td>
                </tr>
              ) : (payments || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <span className="text-muted-foreground text-base">No payment records found</span>
                  </td>
                </tr>
              ) : (
                (payments || []).map((payment) => (
                  <tr key={payment._id} className="border-b border-gray-200 dark:border-gray-600 hover:bg-muted/50 dark:hover:bg-gray-800">
                    <td className="p-4">
                      <span className="font-medium text-foreground text-base">
                        {payment.student?.name || 'Unknown Student'}
                      </span>
                    </td>
                    <td className="p-4 text-foreground text-base">
                      {new Date(payment.paymentPeriod + '-01').toLocaleDateString('en-US', { 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="p-4 text-foreground text-base">
                      {new Date(payment.dueDate).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-foreground text-base">
                      {payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4 text-foreground text-base">
                      {payment.paymentMethod ? payment.paymentMethod.replace('_', ' ').toUpperCase() : '-'}
                    </td>
                    <td className="p-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPayment(payment)}
                        className="hover:bg-muted dark:hover:bg-gray-700 px-4 py-2"
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 p-4 border-t border-gray-200 dark:border-gray-600">
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
      </div>
    </div>
  );
};

export default Payments;
