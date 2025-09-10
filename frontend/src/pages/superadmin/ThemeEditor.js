import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Plus,
  Edit2,
  Trash2,
  Star,
  StarOff,
  Save,
  X,
  Palette,
  Eye
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { API_URL } from '../../config/appConfig';

// Color Picker Component
const ColorPicker = ({ label, value, onChange, placeholder }) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const validateColor = (color) => {
    // Check if it's a valid hex color
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    // Check if it's a valid RGB color
    const rgbRegex = /^rgb\(\s*([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\s*,\s*([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\s*,\s*([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\s*\)$/;
    
    return hexRegex.test(color) || rgbRegex.test(color);
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (newValue === '' || validateColor(newValue)) {
      setIsValid(true);
      onChange(newValue);
    } else {
      setIsValid(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="flex gap-2">
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`flex-1 ${!isValid ? 'border-red-500' : ''}`}
        />
        <Input
          type="color"
          value={inputValue.startsWith('#') ? inputValue : '#000000'}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsValid(true);
            onChange(e.target.value);
          }}
          className="w-16 h-10 p-1 rounded cursor-pointer"
        />
        {inputValue && isValid && (
          <div 
            className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600"
            style={{ backgroundColor: inputValue }}
            title={`Preview: ${inputValue}`}
          />
        )}
      </div>
      {!isValid && (
        <p className="text-sm text-red-500">
          Please enter a valid hex color (#RRGGBB) or RGB color (rgb(r,g,b))
        </p>
      )}
    </div>
  );
};

const ThemeEditor = () => {
  const { t } = useTranslation();
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    primaryColor: '',
    secondaryColor: ''
  });

  // Fetch themes from API
  const fetchThemes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/themes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setThemes(data);
        console.log('🎨 Themes fetched:', data.length, 'themes');
      } else {
        throw new Error('Failed to fetch themes');
      }
    } catch (error) {
      console.error('❌ Error fetching themes:', error);
      toast.error('Failed to load themes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThemes();
  }, []);

  const handleOpenDialog = (theme = null) => {
    if (theme) {
      setEditingTheme(theme);
      setFormData({
        name: theme.name,
        description: theme.description,
        primaryColor: theme.primaryColor,
        secondaryColor: theme.secondaryColor
      });
    } else {
      setEditingTheme(null);
      setFormData({
        name: '',
        description: '',
        primaryColor: '',
        secondaryColor: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTheme(null);
    setFormData({
      name: '',
      description: '',
      primaryColor: '',
      secondaryColor: ''
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    // Validate form data
    if (!formData.name.trim()) {
      toast.error('Theme name is required');
      return;
    }

    if (!formData.primaryColor || !formData.secondaryColor) {
      toast.error('Both primary and secondary colors are required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingTheme 
        ? `${API_URL}/api/themes/${editingTheme._id}`
        : `${API_URL}/api/themes`;
      
      const method = editingTheme ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const message = editingTheme ? 'Theme updated successfully' : 'Theme created successfully';
        toast.success(message);
        handleCloseDialog();
        fetchThemes(); // Refresh the themes list
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save theme');
      }
    } catch (error) {
      console.error('❌ Error saving theme:', error);
      toast.error(error.message || 'Failed to save theme');
    }
  };

  const handleDelete = async () => {
    if (!themeToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/themes/${themeToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Theme deleted successfully');
        setThemeToDelete(null);
        fetchThemes(); // Refresh the themes list
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete theme');
      }
    } catch (error) {
      console.error('❌ Error deleting theme:', error);
      toast.error(error.message || 'Failed to delete theme');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetDefault = async (themeId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/themes/${themeId}/default`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Default theme updated successfully');
        fetchThemes(); // Refresh the themes list
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to set default theme');
      }
    } catch (error) {
      console.error('❌ Error setting default theme:', error);
      toast.error(error.message || 'Failed to set default theme');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading themes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Palette className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('themeEditor.title', 'Theme Editor')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('themeEditor.subtitle', 'Manage application themes and color schemes')}
            </p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t('themeEditor.addNew', 'Add New Theme')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Themes</CardTitle>
            <Palette className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{themes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Themes</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{themes.filter(t => t.isActive).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Default Theme</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {themes.find(t => t.isDefault)?.name || 'None'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Themes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Themes</CardTitle>
          <CardDescription>
            Manage your application themes. Click edit to modify or use the color preview to see the theme colors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Colors</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {themes.map((theme) => (
                <TableRow key={theme._id}>
                  <TableCell className="font-medium">{theme.name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {theme.description}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                        style={{ backgroundColor: theme.primaryColor }}
                        title={`Primary: ${theme.primaryColor}`}
                      />
                      <div 
                        className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                        style={{ backgroundColor: theme.secondaryColor }}
                        title={`Secondary: ${theme.secondaryColor}`}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {theme.isDefault && (
                        <Badge variant="default">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                      <Badge variant={theme.isActive ? "default" : "secondary"}>
                        {theme.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(theme.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!theme.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(theme._id)}
                          title="Set as default"
                        >
                          <StarOff className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(theme)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setThemeToDelete(theme);
                          setIsDeleting(true);
                        }}
                        disabled={theme.isDefault}
                        title={theme.isDefault ? "Cannot delete default theme" : "Delete theme"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Theme Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTheme ? 'Edit Theme' : 'Add New Theme'}
            </DialogTitle>
            <DialogDescription>
              {editingTheme 
                ? 'Update the theme details and colors below.'
                : 'Create a new theme by providing a name, description, and color scheme.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Theme Name
              </label>
              <Input
                placeholder="Enter theme name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <Textarea
                placeholder="Enter theme description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <Separator />

            <ColorPicker
              label="Primary Color"
              value={formData.primaryColor}
              onChange={(value) => handleInputChange('primaryColor', value)}
              placeholder="#000000 or rgb(0,0,0)"
            />

            <ColorPicker
              label="Secondary Color"
              value={formData.secondaryColor}
              onChange={(value) => handleInputChange('secondaryColor', value)}
              placeholder="#ffffff or rgb(255,255,255)"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="h-4 w-4 mr-2" />
              {editingTheme ? 'Update' : 'Create'} Theme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Theme</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the theme "{themeToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleting(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Theme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ThemeEditor;
