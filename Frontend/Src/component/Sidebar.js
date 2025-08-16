import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Define navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      {
        path: '/dashboard',
        name: 'Dashboard',
        icon: 'fas fa-tachometer-alt',
        roles: ['admin', 'doctor', 'patient', 'pharmacist']
      },
      {
        path: '/patients',
        name: 'Patients',
        icon: 'fas fa-user-injured',
        roles: ['admin', 'doctor', 'patient']
      },
      {
        path: '/doctors',
        name: 'Doctors',
        icon: 'fas fa-user-md',
        roles: ['admin', 'patient']
      },
      {
        path: '/appointments',
        name: 'Appointments',
        icon: 'fas fa-calendar-alt',
        roles: ['admin', 'doctor', 'patient']
      },
      {
        path: '/medicines',
        name: 'Medicines',
        icon: 'fas fa-pills',
        roles: ['admin', 'pharmacist', 'doctor']
      }
    ];

    // Filter items based on user role
    return baseItems.filter(item => 
      item.roles.includes(user?.role)
    );
  };

  const navigationItems = getNavigationItems();

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="sidebar d-none d-md-block">
        <div className="sidebar-header">
          <h4>
            <i className="fas fa-hospital-alt me-2"></i>
            HMS
          </h4>
          <p className="mb-0 small text-white-50">Hospital Management</p>
        </div>

        <nav className="sidebar-nav">
          {navigationItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <i className={item.icon}></i>
              {item.name}
            </NavLink>
          ))}

          {/* Profile Link */}
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <i className="fas fa-user-circle"></i>
            Profile
          </NavLink>
        </nav>

        {/* User Info at Bottom */}
        <div className="mt-auto p-3" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <div className="text-center text-white-50">
            <small>Logged in as</small>
            <div className="text-white fw-semibold">
              {user?.firstName} {user?.lastName}
            </div>
            <small className="text-white-50 text-capitalize">
              {user?.role}
            </small>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div
        className="offcanvas offcanvas-start d-md-none"
        tabIndex="-1"
        id="mobileSidebar"
        aria-labelledby="mobileSidebarLabel"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <div className="offcanvas-header">
          <h5 className="offcanvas-title text-white" id="mobileSidebarLabel">
            <i className="fas fa-hospital-alt me-2"></i>
            Hospital Management
          </h5>
          <button
            type="button"
            className="btn-close btn-close-white"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          ></button>
        </div>

        <div className="offcanvas-body">
          <nav className="nav flex-column">
            {navigationItems.map((item, index) => (
              <NavLink
                key={index}
                to={item.path}
                className={({ isActive }) =>
                  `nav-link text-white ${isActive ? 'active' : ''}`
                }
                data-bs-dismiss="offcanvas"
                style={{ marginBottom: '8px' }}
              >
                <i className={`${item.icon} me-3`}></i>
                {item.name}
              </NavLink>
            ))}

            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `nav-link text-white ${isActive ? 'active' : ''}`
              }
              data-bs-dismiss="offcanvas"
              style={{ marginBottom: '8px' }}
            >
              <i className="fas fa-user-circle me-3"></i>
              Profile
            </NavLink>
          </nav>

          {/* User Info */}
          <div className="mt-auto">
            <hr className="border-white-50" />
            <div className="text-center text-white">
              <div className="fw-semibold">
                {user?.firstName} {user?.lastName}
              </div>
              <small className="text-white-50 text-capitalize">
                {user?.role}
              </small>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
