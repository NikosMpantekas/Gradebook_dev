import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Link, Unlink, Users, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Spinner } from '../ui/spinner';
import { API_URL } from '../../config/appConfig';

const ParentLinkingSection = ({ userId, userRole, userName, token }) => {
  const [linkedParents, setLinkedParents] = useState([]);
  const [linkedStudents, setLinkedStudents] = useState([]);
  const [availableParents, setAvailableParents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (!userId || !token) return;
    if (userRole === 'student') fetchLinkedParents();
    if (userRole === 'parent') fetchLinkedStudents();
  }, [userId, userRole, token]);

  const fetchLinkedParents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/users/student/${userId}/parents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLinkedParents(data.parents || []);
      } else {
        console.error('[ParentLinking] Failed to fetch linked parents');
      }
    } catch (err) {
      console.error('[ParentLinking] Error fetching linked parents:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkedStudents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/users/parent/${userId}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLinkedStudents(data.students || []);
      } else {
        console.error('[ParentLinking] Failed to fetch linked students');
      }
    } catch (err) {
      console.error('[ParentLinking] Error fetching linked students:', err);
    } finally {
      setLoading(false);
    }
  };

  const openLinkDialog = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/available-parents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableParents(data.parents || []);
      }
    } catch (err) {
      console.error('[ParentLinking] Error fetching available parents:', err);
    }
    setDialogOpen(true);
  };

  const handleLinkParent = async () => {
    if (!selectedParentId) return;
    try {
      setLinking(true);
      const res = await fetch(`${API_URL}/api/users/link-parent`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: selectedParentId, studentId: userId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Parent linked successfully');
        setDialogOpen(false);
        setSelectedParentId('');
        fetchLinkedParents();
      } else {
        toast.error(data.message || 'Failed to link parent');
      }
    } catch (err) {
      toast.error('Error linking parent');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkParent = async (parentId) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/users/unlink-parent`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId, studentId: userId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Parent unlinked');
        fetchLinkedParents();
      } else {
        toast.error(data.message || 'Failed to unlink parent');
      }
    } catch (err) {
      toast.error('Error unlinking parent');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlinkStudent = async (studentId) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/users/unlink-parent`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: userId, studentId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Student unlinked');
        fetchLinkedStudents();
      } else {
        toast.error(data.message || 'Failed to unlink student');
      }
    } catch (err) {
      toast.error('Error unlinking student');
    } finally {
      setLoading(false);
    }
  };

  const unlinkedParents = availableParents.filter(
    (p) => !linkedParents.some((lp) => lp._id?.toString() === p._id?.toString())
  );

  if (userRole === 'student') {
    return (
      <>
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Linked Parents</h3>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={openLinkDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Link Parent
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-2">
                <Spinner size="sm" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : linkedParents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No parents linked to this student.</p>
            ) : (
              <div className="space-y-2">
                {linkedParents.map((parent) => (
                  <div key={parent._id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{parent.name}</p>
                      <p className="text-xs text-muted-foreground">{parent.email}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlinkParent(parent._id)}
                      className="text-destructive hover:text-destructive gap-1"
                    >
                      <Unlink className="h-3.5 w-3.5" />
                      Unlink
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Parent to {userName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Select an existing parent account to link.</p>
              {unlinkedParents.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No available parents to link (all are already linked or none exist).</p>
              ) : (
                <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a parent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unlinkedParents.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.name} — {p.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setDialogOpen(false); setSelectedParentId(''); }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLinkParent}
                disabled={!selectedParentId || linking}
                className="gap-2"
              >
                {linking ? <Spinner size="sm" /> : <Link className="h-4 w-4" />}
                Link Parent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (userRole === 'parent') {
    return (
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Linked Students</h3>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-2">
              <Spinner size="sm" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : linkedStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students linked to this parent.</p>
          ) : (
            <div className="space-y-2">
              {linkedStudents.map((student) => (
                <div key={student._id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.email}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnlinkStudent(student._id)}
                    className="text-destructive hover:text-destructive gap-1"
                  >
                    <Unlink className="h-3.5 w-3.5" />
                    Unlink
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default ParentLinkingSection;
