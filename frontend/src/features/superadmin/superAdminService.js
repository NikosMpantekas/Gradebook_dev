import axios from 'axios';
import { API_URL } from '../../config/appConfig';

const API_SUPERADMIN = `${API_URL}/api/superadmin/`;

// Create new school owner
const createSchoolOwner = async (schoolOwnerData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.post(
    API_SUPERADMIN + 'create-school-owner', 
    schoolOwnerData, 
    config
  );

  return response.data;
};

// Get all school owners with user counts and pack info
const getSchoolOwners = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(`${API_URL}/api/users/superadmin/school-owners`, config);

  return response.data;
};

// Update admin pack and pricing
const updateAdminPack = async (adminId, packData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.put(
    `${API_URL}/api/users/superadmin/admin-pack/${adminId}`,
    packData,
    config
  );

  return response.data;
};

// Get school owner by ID
const getSchoolOwnerById = async (ownerId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(API_SUPERADMIN + `school-owners/${ownerId}`, config);

  return response.data;
};

// Update school owner status
const updateSchoolOwnerStatus = async (ownerId, statusData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.put(
    API_SUPERADMIN + `school-owners/${ownerId}/status`,
    statusData,
    config
  );

  return response.data;
};

// Create first superadmin (initializing the system)
const createFirstSuperAdmin = async (superAdminData) => {
  const response = await axios.post(
    API_SUPERADMIN + 'create-first-superadmin',
    superAdminData
  );

  return response.data;
};

const superAdminService = {
  createSchoolOwner,
  getSchoolOwners,
  getSchoolOwnerById,
  updateSchoolOwnerStatus,
  updateAdminPack,
  createFirstSuperAdmin,
};

export default superAdminService;
