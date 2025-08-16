import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { appointmentsAPI } from '../utils/api';
import { formatDate } from '../utils/api';

const Appointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const response = await appointmentsAPI.getAppointments(params);
      setAppointments(response.data.appointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      'scheduled': 'bg-info',
      'confirmed': 'bg-success',
      'in-progress': 'bg-warning',
      'completed': 'bg-primary',
      'cancelled': 'bg-danger',
      'no-show': 'bg-secondary'
    };
    return classes[status] || 'bg-secondary';
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <i className="fas fa-calendar-alt me-2"></i>
          Appointments
        </h2>
        {user.role === 'patient' && (
          <button className="btn btn-primary">
            <i className="fas fa-plus me-2"></i>
            Book New Appointment
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="row align-items-center">
            <div className="col">
              <h5 className="mb-0">
                {user.role === 'patient' ? 'My Appointments' : 
                 user.role === 'doctor' ? 'My Scheduled Appointments' : 
                 'All Appointments'}
              </h5>
            </div>
            <div className="col-auto">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
        <div className="card-body">
          {appointments.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    {user.role !== 'patient' && <th>Patient</th>}
                    {user.role !== 'doctor' && <th>Doctor</th>}
                    <th>Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment._id}>
                      <td>{formatDate(appointment.appointmentDate)}</td>
                      <td className="fw-semibold">{appointment.appointmentTime}</td>
                      {user.role !== 'patient' && (
                        <td>
                          {appointment.patient?.user?.firstName} {appointment.patient?.user?.lastName}
                          <br />
                          <small className="text-muted">ID: {appointment.patient?.patientId}</small>
                        </td>
                      )}
                      {user.role !== 'doctor' && (
                        <td>
                          Dr. {appointment.doctor?.user?.firstName} {appointment.doctor?.user?.lastName}
                          <br />
                          <small className="text-muted">{appointment.doctor?.specialization}</small>
                        </td>
                      )}
                      <td>
                        <span className="badge bg-light text-dark">
                          {appointment.type?.replace('-', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(appointment.status)}`}>
                          {appointment.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group" role="group">
                          <button className="btn btn-sm btn-outline-primary">
                            <i className="fas fa-eye"></i>
                          </button>
                          {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
                            <button className="btn btn-sm btn-outline-secondary">
                              <i className="fas fa-edit"></i>
                            </button>
                          )}
                          {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                            <button className="btn btn-sm btn-outline-danger">
                              <i className="fas fa-times"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">
              <i className="fas fa-calendar-times fa-3x text-muted mb-3"></i>
              <p className="text-muted">No appointments found</p>
              {user.role === 'patient' && (
                <button className="btn btn-primary">
                  <i className="fas fa-plus me-2"></i>
                  Book Your First Appointment
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Appointments;
