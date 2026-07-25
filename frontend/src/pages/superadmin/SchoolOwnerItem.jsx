import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { CheckCircle2, Ban, Pencil, GraduationCap, Mail } from 'lucide-react';
import { updateSchoolOwnerStatus } from '../../features/superadmin/superAdminSlice';

function SchoolOwnerItem({ schoolOwner }) {
  const dispatch = useDispatch();
  const [isUpdating, setIsUpdating] = useState(false);

  const schoolName = schoolOwner.school ? 
    (typeof schoolOwner.school === 'object' ? schoolOwner.school.name : 'Unknown School') 
    : 'No School Assigned';
  
  const toggleStatus = () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    
    dispatch(updateSchoolOwnerStatus({
      id: schoolOwner._id,
      statusData: { active: !schoolOwner.active }
    }))
      .unwrap()
      .then(() => {
        toast.success(`School owner ${schoolOwner.active ? 'disabled' : 'enabled'} successfully`);
        setIsUpdating(false);
      })
      .catch((error) => {
        toast.error(`Error: ${error}`);
        setIsUpdating(false);
      });
  };

  return (
    <div className={`school-owner-card ${!schoolOwner.active ? 'disabled' : ''}`}>
      <div className="owner-header">
        <h3>{schoolOwner.name}</h3>
        <span className={`status-badge ${schoolOwner.active ? 'active' : 'inactive'}`}>
          {schoolOwner.active ? 'Active' : 'Disabled'}
        </span>
      </div>
      <div className="owner-details">
        <p className="flex items-center gap-1.5">
          <Mail className="h-4 w-4" /> {schoolOwner.email}
        </p>
        <p className="flex items-center gap-1.5">
          <GraduationCap className="h-4 w-4" /> {schoolName}
        </p>
      </div>
      <div className="owner-actions">
        <button 
          className={`btn btn-sm ${schoolOwner.active ? 'btn-danger' : 'btn-success'}`}
          onClick={toggleStatus}
          disabled={isUpdating}
        >
          {schoolOwner.active ? (
            <>
              <Ban className="h-4 w-4 inline mr-1" /> Disable
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 inline mr-1" /> Enable
            </>
          )}
        </button>
        <button 
          className="btn btn-sm"
          onClick={() => window.location.href = `/superadmin/school-owner/${schoolOwner._id}`}
        >
          <Pencil className="h-4 w-4 inline mr-1" /> Details
        </button>
      </div>
    </div>
  );
}

export default SchoolOwnerItem;
