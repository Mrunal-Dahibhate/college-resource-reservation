import axios from "axios";

const API = "http://65.0.97.6:5001";

const getToken = () => {
  return localStorage.getItem("token");
};

const authConfig = () => ({
  headers: {
    Authorization: `Bearer ${getToken()}`,
  },
});

// ========================
// AUTHENTICATION
// ========================

export const loginUser = (email, password) => {
  return axios.post(`${API}/api/login`, {
    email,
    password,
  });
};

// ========================
// USER APIs
// ========================

export const getResources = () => {
  return axios.get(
    `${API}/api/resources`,
    authConfig()
  );
};

export const createReservation = (
  resourceId,
  startTime,
  endTime
) => {
  return axios.post(
    `${API}/api/reservations`,
    {
      resource_id: Number(resourceId),
      start_time: startTime.replace("T", " "),
      end_time: endTime.replace("T", " "),
    },
    authConfig()
  );
};

export const getMyReservations = () => {
  return axios.get(
    `${API}/api/my-reservations`,
    authConfig()
  );
};

export const getNotifications = () => {
  return axios.get(
    `${API}/api/notifications`,
    authConfig()
  );
};

export const cancelReservation = (id) => {
  return axios.delete(
    `${API}/api/reservations/${id}`,
    authConfig()
  );
};

// ========================
// ADMIN APIs
// ========================

export const getAdminUsers = () => {
  return axios.get(
    `${API}/api/admin/users`,
    authConfig()
  );
};

export const getAdminResources = () => {
  return axios.get(
    `${API}/api/admin/resources`,
    authConfig()
  );
};

export const addAdminResource = (resource) => {
  return axios.post(
    `${API}/api/admin/resources`,
    resource,
    authConfig()
  );
};

export const getAdminReservations = () => {
  return axios.get(
    `${API}/api/admin/reservations`,
    authConfig()
  );
};

export const approveReservation = (id) => {
  return axios.put(
    `${API}/api/admin/reservations/${id}/approve`,
    {},
    authConfig()
  );
};

export const rejectReservation = (id) => {
  return axios.put(
    `${API}/api/admin/reservations/${id}/reject`,
    {},
    authConfig()
  );
};