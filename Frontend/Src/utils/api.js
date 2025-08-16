import axios from 'axios';
import toast from 'react-hot-toast';

// Set base URL for all requests
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';

    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Don't show toast for expected errors that components handle
    if (!error.config?.hideErrorToast) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

// API functions
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  changePassword: (passwordData) => api.post('/auth/change-password', passwordData),
};

export const patientsAPI = {
  getPatients: (params) => api.get('/patients', { params }),
  getPatient: (id) => api.get(`/patients/${id}`),
  createPatient: (patientData) => api.post('/patients', patientData),
  updatePatient: (id, patientData) => api.put(`/patients/${id}`, patientData),
  deletePatient: (id) => api.delete(`/patients/${id}`),
  addMedicalHistory: (id, historyData) => api.post(`/patients/${id}/medical-history`, historyData),
  addVisit: (id, visitData) => api.post(`/patients/${id}/visit`, visitData),
};

export const doctorsAPI = {
  getDoctors: (params) => api.get('/doctors', { params }),
  getDoctor: (id) => api.get(`/doctors/${id}`),
  createDoctor: (doctorData) => api.post('/doctors', doctorData),
  updateDoctor: (id, doctorData) => api.put(`/doctors/${id}`, doctorData),
  deleteDoctor: (id) => api.delete(`/doctors/${id}`),
  getSpecializations: () => api.get('/doctors/specializations'),
  checkAvailability: (id, date) => api.get(`/doctors/${id}/availability/${date}`),
};

export const appointmentsAPI = {
  getAppointments: (params) => api.get('/appointments', { params }),
  getAppointment: (id) => api.get(`/appointments/${id}`),
  createAppointment: (appointmentData) => api.post('/appointments', appointmentData),
  updateAppointment: (id, appointmentData) => api.put(`/appointments/${id}`, appointmentData),
  deleteAppointment: (id) => api.delete(`/appointments/${id}`),
  getStats: () => api.get('/appointments/stats/dashboard'),
};

export const medicinesAPI = {
  getMedicines: (params) => api.get('/medicines', { params }),
  getMedicine: (id) => api.get(`/medicines/${id}`),
  createMedicine: (medicineData) => api.post('/medicines', medicineData),
  updateMedicine: (id, medicineData) => api.put(`/medicines/${id}`, medicineData),
  deleteMedicine: (id) => api.delete(`/medicines/${id}`),
  updateStock: (id, stockData) => api.put(`/medicines/${id}/stock`, stockData),
  getCategories: () => api.get('/medicines/categories'),
  getLowStock: () => api.get('/medicines/low-stock'),
  getExpiring: (days) => api.get('/medicines/expiring', { params: { days } }),
  getStats: () => api.get('/medicines/stats/dashboard'),
};

// Helper functions
export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const getStatusBadgeClass = (status) => {
  const statusClasses = {
    scheduled: 'bg-info',
    confirmed: 'bg-success',
    'in-progress': 'bg-warning',
    completed: 'bg-primary',
    cancelled: 'bg-danger',
    'no-show': 'bg-secondary',
    active: 'bg-success',
    resolved: 'bg-info',
    chronic: 'bg-warning',
    'in-stock': 'bg-success',
    'low-stock': 'bg-warning',
    'out-of-stock': 'bg-danger',
    pending: 'bg-warning',
    paid: 'bg-success',
    partial: 'bg-info',
    refunded: 'bg-secondary',
  };
  return statusClasses[status] || 'bg-secondary';
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePhone = (phone) => {
  const re = /^\d{10}$/;
  return re.test(phone);
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export default api;
