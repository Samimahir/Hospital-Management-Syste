import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { appointmentsAPI, patientsAPI, medicinesAPI, doctorsAPI } from '../utils/api';
import { formatDate } from '../utils/api';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    appointments: { todayCount: 0, totalCount: 0 },
    patients: { totalCount: 0 },
    doctors: { totalCount: 0 },
    medicines: { totalCount: 0, lowStockCount: 0 }
  });
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch stats based on user role
      const promises = [];

      if (['admin', 'doctor'].includes(user.role)) {
        promises.push(appointmentsAPI.getStats());
      }

      if (['admin'].includes(user.role)) {
        promises.push(patientsAPI.getPatients({ limit: 1 }));
        promises.push(doctorsAPI.getDoctors({ limit: 1 }));
        promises.push(medicinesAPI.getStats());
      }

      // Fetch recent appointments
      promises.push(appointmentsAPI.getAppointments({ limit: 5 }));

      const results = await Promise.allSettled(promises);

      let statsIndex = 0;

      if (['admin', 'doctor'].includes(user.role)) {
        if (results[statsIndex].status === 'fulfilled') {
          setStats(prev => ({
            ...prev,
            appointments: results[statsIndex].value.data
          }));
        }
        statsIndex++;
      }

      if (['admin'].includes(user.role)) {
        if (results[statsIndex].status === 'fulfilled') {
          setStats(prev => ({
            ...prev,
            patients: { totalCount: results[statsIndex].value.data.pagination.total }
          }));
        }
        statsIndex++;

        if (results[statsIndex].status === 'fulfilled') {
          setStats(prev => ({
            ...prev,
            doctors: { totalCount: results[statsIndex].value.data.pagination.total }
          }));
        }
        statsIndex++;

        if (results[statsIndex].status === 'fulfilled') {
          setStats(prev => ({
            ...prev,
            medicines: results[statsIndex].value.data
          }));
        }
        statsIndex++;
      }

      // Recent appointments
      if (results[statsIndex].status === 'fulfilled') {
        setRecentAppointments(results[statsIndex].value.data.appointments);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
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
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-4">
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <div className="row align-items-center">
              <div className="col">
                <h1 className="mb-2">
                  {getGreeting()}, {user.firstName}! 👋
                </h1>
                <p className="text-muted mb-0">
                  Welcome to your hospital management dashboard. Here's what's happening today.
                </p>
              </div>
              <div className="col-auto">
                <div className="text-end">
                  <div className="text-muted small">Today's Date</div>
                  <div className="fw-semibold">{formatDate(new Date())}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        {/* Today's Appointments */}
        {['admin', 'doctor'].includes(user.role) && (
          <div className="col-md-6 col-xl-3 mb-3">
            <div className="card stat-card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="stat-number">{stats.appointments.todayCount}</div>
                    <div className="stat-label">Today's Appointments</div>
                  </div>
                  <div className="stat-icon">
                    <i className="fas fa-calendar-day fa-2x opacity-50"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Total Appointments */}
        {['admin', 'doctor'].includes(user.role) && (
          <div className="col-md-6 col-xl-3 mb-3">
            <div className="card stat-card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="stat-number">{stats.appointments.totalCount}</div>
                    <div className="stat-label">Total Appointments</div>
                  </div>
                  <div className="stat-icon">
                    <i className="fas fa-calendar-alt fa-2x opacity-50"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Total Patients */}
        {['admin'].includes(user.role) && (
          <div className="col-md-6 col-xl-3 mb-3">
            <div className="card stat-card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="stat-number">{stats.patients.totalCount}</div>
                    <div className="stat-label">Total Patients</div>
                  </div>
                  <div className="stat-icon">
                    <i className="fas fa-user-injured fa-2x opacity-50"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Total Doctors */}
        {['admin'].includes(user.role) && (
          <div className="col-md-6 col-xl-3 mb-3">
            <div className="card stat-card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="stat-number">{stats.doctors.totalCount}</div>
                    <div className="stat-label">Total Doctors</div>
                  </div>
                  <div className="stat-icon">
                    <i className="fas fa-user-md fa-2x opacity-50"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Total Medicines */}
        {['admin', 'pharmacist'].includes(user.role) && (
          <div className="col-md-6 col-xl-3 mb-3">
            <div className="card stat-card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="stat-number">{stats.medicines.totalCount}</div>
                    <div className="stat-label">Total Medicines</div>
                  </div>
                  <div className="stat-icon">
                    <i className="fas fa-pills fa-2x opacity-50"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Low Stock Medicines */}
        {['admin', 'pharmacist'].includes(user.role) && (
          <div className="col-md-6 col-xl-3 mb-3">
            <div className="card stat-card h-100" style={{ background: stats.medicines.lowStockCount > 0 ? 'linear-gradient(135deg, #dc3545 0%, #fd7e14 100%)' : undefined }}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div className="stat-number">{stats.medicines.lowStockCount}</div>
                    <div className="stat-label">Low Stock Alerts</div>
                  </div>
                  <div className="stat-icon">
                    <i className="fas fa-exclamation-triangle fa-2x opacity-50"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="row">
        {/* Recent Appointments */}
        <div className="col-lg-8 mb-4">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="fas fa-clock me-2"></i>
                Recent Appointments
              </h5>
              <a href="/appointments" className="btn btn-sm btn-outline-primary">
                View All
              </a>
            </div>
            <div className="card-body">
              {recentAppointments.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Patient</th>
                        {user.role !== 'patient' && <th>Doctor</th>}
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAppointments.map((appointment) => (
                        <tr key={appointment._id}>
                          <td>{formatDate(appointment.appointmentDate)}</td>
                          <td>{appointment.appointmentTime}</td>
                          <td>
                            {appointment.patient?.user?.firstName} {appointment.patient?.user?.lastName}
                            <br />
                            <small className="text-muted">ID: {appointment.patient?.patientId}</small>
                          </td>
                          {user.role !== 'patient' && (
                            <td>
                              Dr. {appointment.doctor?.user?.firstName} {appointment.doctor?.user?.lastName}
                              <br />
                              <small className="text-muted">{appointment.doctor?.specialization}</small>
                            </td>
                          )}
                          <td>
                            <span className={`badge ${getStatusBadgeClass(appointment.status)}`}>
                              {appointment.status.replace('-', ' ').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                  <p className="text-muted">No recent appointments found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-lg-4 mb-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-bolt me-2"></i>
                Quick Actions
              </h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                {user.role === 'patient' && (
                  <>
                    <a href="/appointments" className="btn btn-primary">
                      <i className="fas fa-plus me-2"></i>
                      Book Appointment
                    </a>
                    <a href="/doctors" className="btn btn-outline-primary">
                      <i className="fas fa-search me-2"></i>
                      Find Doctors
                    </a>
                  </>
                )}

                {user.role === 'doctor' && (
                  <>
                    <a href="/appointments" className="btn btn-primary">
                      <i className="fas fa-calendar-alt me-2"></i>
                      View Appointments
                    </a>
                    <a href="/patients" className="btn btn-outline-primary">
                      <i className="fas fa-users me-2"></i>
                      Manage Patients
                    </a>
                  </>
                )}

                {user.role === 'admin' && (
                  <>
                    <a href="/patients" className="btn btn-primary">
                      <i className="fas fa-user-plus me-2"></i>
                      Add Patient
                    </a>
                    <a href="/doctors" className="btn btn-outline-primary">
                      <i className="fas fa-user-md me-2"></i>
                      Manage Doctors
                    </a>
                    <a href="/medicines" className="btn btn-outline-warning">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      Check Low Stock
                    </a>
                  </>
                )}

                {user.role === 'pharmacist' && (
                  <>
                    <a href="/medicines" className="btn btn-primary">
                      <i className="fas fa-pills me-2"></i>
                      Manage Medicines
                    </a>
                    <a href="/medicines" className="btn btn-outline-warning">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      Low Stock Alerts
                    </a>
                  </>
                )}

                <hr />
                <a href="/profile" className="btn btn-outline-secondary">
                  <i className="fas fa-user-cog me-2"></i>
                  Update Profile
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role-specific Tips */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h6 className="card-title">
                <i className="fas fa-lightbulb me-2"></i>
                Tips for {user.role.charAt(0).toUpperCase() + user.role.slice(1)}s
              </h6>
              <div className="row">
                {user.role === 'patient' && (
                  <>
                    <div className="col-md-4">
                      <div className="d-flex align-items-start">
                        <i className="fas fa-check-circle text-success me-2 mt-1"></i>
                        <small>Keep your medical history updated for better treatment</small>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="d-flex align-items-start">
                        <i className="fas fa-check-circle text-success me-2 mt-1"></i>
                        <small>Book appointments in advance to avoid waiting</small>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="d-flex align-items-start">
                        <i className="fas fa-check-circle text-success me-2 mt-1"></i>
                        <small>Always carry your patient ID for quick identification</small>
                      </div>
                    </div>
                  </>
                )}

                {user.role === 'doctor' && (
                  <>
                    <div className="col-md-4">
                      <div className="d-flex align-items-start">
                        <i className="fas fa-check-circle text-success me-2 mt-1"></i>
                        <small>Update your availability regularly for better scheduling</small>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="d-flex align-items-start">
                        <i className="fas fa-check-circle text-success me-2 mt-1"></i>
                        <small>Complete patient records after each consultation</small>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="d-flex align-items-start">
                        <i className="fas fa-check-circle text-success me-2 mt-1"></i>
                        <small>Review patient history before appointments</small>
                      </div>
                    </div>
                  </>
                )}

                {user.role === 'admin' && (
                  <>
                    <div className="col-md-4">
                      <div className="d-flex align-items-start">
                        <i className="fas fa-check-circle text-success me-2 mt-1"></i>
                        <small>Regularly monitor system performance and user feedback</small>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="d-flex align-items-start">
                        <i className="fas fa-check-circle text-success me-2 mt-1"></i>
                        <small>Keep staff information updated for smooth operations</small>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="d-flex align-items-start">
                        <i className="fas fa-check-circle text-success me-2 mt-1"></i>
                        <small>Review low stock alerts and maintain inventory</small>
                      </div>
                    </div>
                  </>
                )}

                {user.role === 'pharmacist' && (
                  <>
                    <div className="col-md-4">
                      <div className="d-flex align-items-start">
                        <i className="fas fa-check-circle text-success me-2 mt-1"></i>
                        <small>Monitor expiry dates and rotate stock accordingly</small>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="d-flex align-items-start">
                        <i className="fas fa-check-circle text-success me-2 mt-1"></i>
                        <small>Maintain accurate inventory records</small>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="d-flex align-items-start">
                        <i className="fas fa-check-circle text-success me-2 mt-1"></i>
                        <small>Report any discrepancies in medicine stock immediately</small>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
