import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { 
  Save, 
  Trash2,
  Plus,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { API_URL } from '../config/appConfig';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
// Import ReactMarkdown properly
import ReactMarkdown from 'react-markdown';

const PatchNoteEditor = forwardRef(({ user, onPatchNotesChanged }, ref) => {
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    _id: null,
    title: '',
    content: '',
    version: '',
    type: 'release',
    isActive: true
  });
  
  const resetForm = () => {
    setFormData({
      _id: null,
      title: '',
      content: '',
      version: '',
      type: 'release',
      isActive: true
    });
    setIsEditing(false);
    setPreviewMode(false);
  };
  
  const handleOpen = () => {
    setOpen(true);
  };
  
  const handleClose = () => {
    setOpen(false);
    resetForm();
  };
  
  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'isActive' ? checked : value
    });
  };
  
  const handleEdit = (patchNote) => {
    setFormData({
      _id: patchNote._id,
      title: patchNote.title,
      content: patchNote.content,
      version: patchNote.version,
      type: patchNote.type,
      isActive: patchNote.isActive
    });
    setIsEditing(true);
    setOpen(true);
  };
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    handleEdit
  }));
  
  const togglePreviewMode = () => {
    setPreviewMode(!previewMode);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    
    try {
      const endpoint = isEditing 
        ? `${API_URL}/api/patch-notes/${formData._id}`
        : `${API_URL}/api/patch-notes`;
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await axios({
        method,
        url: endpoint,
        data: formData,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        }
      });
      
      toast.success(isEditing ? 'Patch note updated successfully!' : 'Patch note created successfully!');
      
      if (onPatchNotesChanged) {
        onPatchNotesChanged();
      }
      
      handleClose();
    } catch (error) {
      console.error('Error saving patch note:', error);
      toast.error(error.response?.data?.message || 'Failed to save patch note');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!formData._id) return;
    
    setLoading(true);
    
    try {
      await axios.delete(`${API_URL}/api/patch-notes/${formData._id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      
      toast.success('Patch note deleted successfully!');
      
      if (onPatchNotesChanged) {
        onPatchNotesChanged();
      }
      
      setConfirmDelete(false);
      handleClose();
    } catch (error) {
      console.error('Error deleting patch note:', error);
      toast.error(error.response?.data?.message || 'Failed to delete patch note');
    } finally {
      setLoading(false);
    }
  };
  
  const getTypeColor = (type) => {
    switch (type) {
      case 'release':
        return 'bg-blue-100 text-blue-800';
      case 'bugfix':
        return 'bg-yellow-100 text-yellow-800';
      case 'feature':
        return 'bg-green-100 text-green-800';
      case 'improvement':
        return 'bg-purple-100 text-purple-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getTypeLabel = (type) => {
    switch (type) {
      case 'release':
        return 'Release';
      case 'bugfix':
        return 'Bug Fix';
      case 'feature':
        return 'New Feature';
      case 'improvement':
        return 'Improvement';
      case 'critical':
        return 'Critical Update';
      default:
        return type;
    }
  };

  return (
    <TooltipProvider>
      <div>
        <Button onClick={handleOpen} className="mb-4">
          <Plus className="mr-2 h-4 w-4" />
          Create Patch Note
        </Button>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>
                  {isEditing ? 'Edit Patch Note' : 'Create New Patch Note'}
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <DialogDescription>
                {isEditing ? 'Update the patch note details below.' : 'Fill in the details for the new patch note.'}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Enter patch note title"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    name="version"
                    value={formData.version}
                    onChange={handleChange}
                    placeholder="e.g., 1.2.0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="release">Release</SelectItem>
                      <SelectItem value="bugfix">Bug Fix</SelectItem>
                      <SelectItem value="feature">New Feature</SelectItem>
                      <SelectItem value="improvement">Improvement</SelectItem>
                      <SelectItem value="critical">Critical Update</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="isActive">Active</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                    />
                    <Label htmlFor="isActive" className="text-sm">
                      {formData.isActive ? 'Active' : 'Inactive'}
                    </Label>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content">Content *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={togglePreviewMode}
                  >
                    {previewMode ? (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" />
                        Hide Preview
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Show Preview
                      </>
                    )}
                  </Button>
                </div>
                
                {previewMode ? (
                  <Card className="p-4">
                    <div className="mb-2">
                      <Badge className={getTypeColor(formData.type)}>
                        {getTypeLabel(formData.type)}
                      </Badge>
                      {formData.version && (
                        <Badge variant="outline" className="ml-2">
                          v{formData.version}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{formData.title}</h3>
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{formData.content}</ReactMarkdown>
                    </div>
                  </Card>
                ) : (
                  <Textarea
                    id="content"
                    name="content"
                    value={formData.content}
                    onChange={handleChange}
                    placeholder="Enter patch note content (Markdown supported)"
                    rows={12}
                    required
                  />
                )}
              </div>
              
              <Separator />
              
              <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0">
                {isEditing && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setConfirmDelete(true)}
                    disabled={loading}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                )}
                
                <div className="flex space-x-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={loading}
                    className="flex-1 sm:flex-none"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 sm:flex-none"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {isEditing ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {isEditing ? 'Update' : 'Create'}
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this patch note? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0">
              <Button
                variant="outline"
                onClick={() => setConfirmDelete(false)}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
});

PatchNoteEditor.displayName = 'PatchNoteEditor';

export default PatchNoteEditor;
