import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { API_URL } from '../../config/appConfig';
import axios from 'axios';

// Shadcn UI components
import { Button } from "src/components/ui/button";
import { Card, CardContent, CardFooter } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Spinner } from "src/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "src/components/ui/alert-dialog";

// Lucide React icons
import {
  ArrowLeft,
  Check,
  X,
  Trash2,
  Building2,
  Crown,
  Sun
} from "lucide-react";

function SchoolOwnerDetails() {
  const [schoolOwner, setSchoolOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const fetchSchoolOwner = async () => {
      try {
        setLoading(true);
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        };
        
        const response = await axios.get(`${API_URL}/api/superadmin/school-owners/${id}`, config);
        setSchoolOwner(response.data);
        
        setLoading(false);
      } catch (error) {
        setError('Error fetching school owner details: ' + 
          (error.response?.data?.message || error.message));
        setLoading(false);
        toast.error('Failed to load school owner details');
      }
    };

    fetchSchoolOwner();
  }, [id, user.token]);

  const handleToggleStatus = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      };
      
      const response = await axios.put(
        `${API_URL}/api/superadmin/school-owners/${id}/status`,
        { active: !schoolOwner.active },
        config
      );
      
      setSchoolOwner(response.data);
      toast.success(`School owner ${response.data.active ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      toast.error('Failed to update school owner status: ' + 
        (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      };
      
      await axios.delete(`${API_URL}/api/superadmin/school-owners/${id}`, config);
      toast.success('School owner deleted successfully');
      navigate('/superadmin/dashboard');
    } catch (error) {
      toast.error('Failed to delete school owner: ' + 
        (error.response?.data?.message || error.message));
    } finally {
      setDeleteDialogOpen(false);
    }
  };



  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-xl font-semibold text-destructive mb-4">{error}</p>
        <Button 
          onClick={() => navigate('/superadmin/dashboard')}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!schoolOwner) {
    return (
      <div className="p-6">
        <p className="text-xl font-semibold mb-4">School owner not found</p>
        <Button 
          onClick={() => navigate('/superadmin/dashboard')}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Button 
        variant="outline" 
        onClick={() => navigate('/superadmin/dashboard')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>
      
      <Card className={`mb-6 ${schoolOwner.active ? 'border-l-[5px] border-l-green-500' : 'border-l-[5px] border-l-red-500'}`}>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8">
              <h2 className="text-2xl font-bold mb-2">
                {schoolOwner.name}
              </h2>
              <p className="text-muted-foreground mb-4">
                Email: {schoolOwner.email}
              </p>
              {schoolOwner.school && (
                <div className="space-y-2">
                  <p className="text-base">
                    <span className="font-semibold">School Cluster:</span> {schoolOwner.school.name}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Address:</span> {schoolOwner.school.address}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Email Domain:</span> {schoolOwner.school.emailDomain}
                  </p>
                </div>
              )}
            </div>
            <div className="sm:col-span-4 flex flex-col items-end">
              <Badge 
                variant={schoolOwner.active ? "default" : "destructive"}
                className={`mb-4 ${schoolOwner.active ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-red-100 text-red-800 hover:bg-red-100'}`}
              >
                Status: {schoolOwner.active ? 'Active' : 'Inactive'}
              </Badge>
              
              <Button 
                variant="outline" 
                className={`mb-2 ${schoolOwner.active ? 'text-red-500 border-red-500 hover:bg-red-50' : 'text-green-500 border-green-500 hover:bg-green-50'}`}
                onClick={handleToggleStatus}
              >
                {schoolOwner.active ? <X className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
                {schoolOwner.active ? 'Deactivate' : 'Activate'}
              </Button>
              
              <Button 
                variant="outline" 
                className="text-red-500 border-red-500 hover:bg-red-50"
                onClick={handleDeleteClick}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
          
          <hr className="my-4" />
          
          <p className="text-base mb-2">
            <span className="font-semibold">Created At:</span> {new Date(schoolOwner.createdAt).toLocaleString()}
          </p>
          <p className="text-base mb-2">
            <span className="font-semibold">Last Updated:</span> {new Date(schoolOwner.updatedAt).toLocaleString()}
          </p>
          
          <hr className="my-4" />
          
          <h3 className="text-xl font-semibold mt-6 mb-2">
            Subscription Plan
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Current subscription plan for this school owner
          </p>
          
          <div className="bg-card rounded-lg border shadow-sm p-6 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div>
                <div className="flex items-center mb-2">
                  {/* Display subscription pack - defaulting to 'pro' if not specified */}
                  {(schoolOwner.subscriptionPlan || 'pro') === 'pro' ? (
                    <>
                      <Crown className="mr-4 h-8 w-8 text-primary" />
                      <div>
                        <h4 className="text-lg font-semibold text-primary">
                          Pro Pack
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Full feature access with premium support
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Sun className="mr-4 h-8 w-8 text-amber-500" />
                      <div>
                        <h4 className="text-lg font-semibold text-amber-500">
                          Light Pack
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Basic features with limited access
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-muted-foreground">
                  Plan Status: <span className="font-semibold">Active</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Billing: <span className="font-semibold">Monthly</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this school owner? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SchoolOwnerDetails;
