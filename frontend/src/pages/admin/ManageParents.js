import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { 
  Plus, 
  Edit, 
  Trash2, 
  User, 
  School, 
  Mail, 
  Phone, 
  ChevronDown, 
  Link, 
  Unlink 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Checkbox } from '../../../components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { Spinner } from '../../../components/ui/spinner';
import { API_URL } from '../../config/appConfig';

const ManageParents = () => {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('create'); // 'create', 'edit', 'link'
  const [selectedParent, setSelectedParent] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    mobilePhone: '',
    personalEmail: '',
    emailCredentials: true
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  const { token } = useSelector((state) => state.auth);

  useEffect(() => {
    fetchParents();
    fetchStudents();
  }, []);

  const fetchParents = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users?role=parent`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setParents(data.users || []);
      } else {
        throw new Error('Failed to fetch parents');
      }
    } catch (error) {
      console.error('Error fetching parents:', error);
      setError('Failed to fetch parents');
      toast.error('Failed to fetch parents');
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users?role=student`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.users || []);
      } else {
        throw new Error('Failed to fetch students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to fetch students');
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateParent = async () => {
    if (!selectedStudents.length) {
      toast.error('Please select at least one student');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/users/create-parent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentIds: selectedStudents.map(s => s._id),
          parentName: formData.name,
          parentEmail: formData.email,
          parentPassword: formData.password,
          mobilePhone: formData.mobilePhone,
          personalEmail: formData.personalEmail,
          emailCredentials: formData.emailCredentials
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Parent created successfully');
        setDialogOpen(false);
        resetForm();
        fetchParents();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create parent');
      }
    } catch (error) {
      console.error('Error creating parent:', error);
      toast.error(error.message || 'Failed to create parent');
    }
  };

  const handleEditParent = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/${selectedParent._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Parent updated successfully');
        setDialogOpen(false);
        resetForm();
        fetchParents();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update parent');
      }
    } catch (error) {
      console.error('Error updating parent:', error);
      toast.error(error.message || 'Failed to update parent');
    }
  };

  const handleDeleteParent = async (parentId) => {
    if (!window.confirm('Are you sure you want to delete this parent?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/users/${parentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Parent deleted successfully');
        fetchParents();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete parent');
      }
    } catch (error) {
      console.error('Error deleting parent:', error);
      toast.error(error.message || 'Failed to delete parent');
    }
  };

  const handleLinkStudents = async () => {
    if (!selectedStudents.length) {
      toast.error('Please select at least one student');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/users/${selectedParent._id}/link-students`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentIds: selectedStudents.map(s => s._id)
        })
      });

      if (response.ok) {
        toast.success('Students linked successfully');
        setDialogOpen(false);
        resetForm();
        fetchParents();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to link students');
      }
    } catch (error) {
      console.error('Error linking students:', error);
      toast.error(error.message || 'Failed to link students');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      mobilePhone: '',
      personalEmail: '',
      emailCredentials: true
    });
    setSelectedStudents([]);
    setSelectedParent(null);
  };

  const openDialog = (type, parent = null) => {
    setDialogType(type);
    setSelectedParent(parent);
    if (parent) {
      setFormData({
        name: parent.name || '',
        email: parent.email || '',
        password: '',
        mobilePhone: parent.mobilePhone || '',
        personalEmail: parent.personalEmail || '',
        emailCredentials: parent.emailCredentials !== false
      });
    } else {
    resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    switch (dialogType) {
      case 'create':
        handleCreateParent();
        break;
      case 'edit':
        handleEditParent();
        break;
      case 'link':
        handleLinkStudents();
        break;
      default:
        break;
    }
  };

  const filteredParents = parents.filter(parent =>
    parent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <Spinner className="text-primary" />
        <p className="text-muted-foreground">Loading parents data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Manage Parents</h1>
        <p className="text-muted-foreground">
          Create, edit, and manage parent accounts and their student links
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Button onClick={() => openDialog('create')} className="sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Create New Parent
        </Button>
        <div className="flex-1">
          <Input
            placeholder="Search parents by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredParents.map((parent) => (
          <Card key={parent._id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <User className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{parent.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{parent.email}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDialog('edit', parent)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
        <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDialog('link', parent)}
                  >
                    <Link className="h-4 w-4" />
        </Button>
        <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteParent(parent._id)}
                  >
                    <Trash2 className="h-4 w-4" />
        </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                      {parent.mobilePhone && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{parent.mobilePhone}</span>
                  </div>
                      )}
                      {parent.personalEmail && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{parent.personalEmail}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Badge variant={parent.emailCredentials ? "default" : "secondary"}>
                    {parent.emailCredentials ? "Email Enabled" : "Email Disabled"}
                  </Badge>
                </div>
                {parent.students && parent.students.length > 0 && (
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium mb-2">Linked Students:</p>
                    <div className="space-y-1">
                      {parent.students.map((student) => (
                        <div key={student._id} className="flex items-center space-x-2 text-sm">
                          <School className="h-3 w-3 text-muted-foreground" />
                          <span>{student.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
        <DialogTitle>
              {dialogType === 'create' && 'Create New Parent'}
              {dialogType === 'edit' && 'Edit Parent'}
              {dialogType === 'link' && 'Link Students'}
        </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {dialogType !== 'link' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Parent's full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="parent@example.com"
                  />
                </div>
                
                {dialogType === 'create' && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter password"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="mobilePhone">Mobile Phone</Label>
                  <Input
                    id="mobilePhone"
                    value={formData.mobilePhone}
                    onChange={(e) => setFormData({ ...formData, mobilePhone: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="personalEmail">Personal Email</Label>
                  <Input
                    id="personalEmail"
                    type="email"
                    value={formData.personalEmail}
                    onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                    placeholder="personal@example.com"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                      <Checkbox
                    id="emailCredentials"
                        checked={formData.emailCredentials}
                    onCheckedChange={(checked) => setFormData({ ...formData, emailCredentials: checked })}
                  />
                  <Label htmlFor="emailCredentials" className="text-sm">
                    Enable email notifications
                  </Label>
                </div>
              </>
            )}
            
            {(dialogType === 'create' || dialogType === 'link') && (
              <div className="space-y-2">
                <Label>Select Students *</Label>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-2">
                  {students.map((student) => (
                    <div key={student._id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`student-${student._id}`}
                        checked={selectedStudents.some(s => s._id === student._id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedStudents([...selectedStudents, student]);
                          } else {
                            setSelectedStudents(selectedStudents.filter(s => s._id !== student._id));
                          }
                        }}
                      />
                      <Label htmlFor={`student-${student._id}`} className="text-sm">
                        {student.name} ({student.email})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {dialogType === 'create' && 'Create Parent'}
                {dialogType === 'edit' && 'Update Parent'}
                {dialogType === 'link' && 'Link Students'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageParents;
