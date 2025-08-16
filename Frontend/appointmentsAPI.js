import api from './apiClient'; // your axios instance

export const appointmentsAPI = {
  getAppointments: (params={}) => api.get('/appointments', { params }),
  bookAppointment: (data) => api.post('/appointments', data), // POST request
  // ...other methods
};
