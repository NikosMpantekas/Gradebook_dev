import axios from 'axios';
import { API_URL } from '../../config/appConfig';

const API_SCHEDULE = `${API_URL}/api/schedule`;

/**
 * Fetch the schedule for the currently authenticated user.
 * Query params (schoolBranch, teacherId) are only used for admin/teacher roles.
 */
const getSchedule = async (token, queryParams = {}) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: queryParams,
  };

  const response = await axios.get(API_SCHEDULE, config);
  return response.data;
};

const scheduleService = {
  getSchedule,
};

export default scheduleService;
