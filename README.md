# Hospital-Management-System
Hospital Management System is a comprehensive web application designed to digitize and streamline the operations of hospitals, clinics, and healthcare centers. Built with the modern MERN stack (MongoDB, Express, React, and Node.js), it offers robust features for managing patients, appointments, medical records, and pharmacy inventory.

Key Features:

User Authentication & Roles: Secure login system supports multiple user roles including Admin, Doctor, Patient, and Pharmacist. Role-based access control ensures users see only functionalities relevant to their permissions.

Patient Management: Patients can register, update profiles, book appointments online, and view their past and upcoming visits from a personalized dashboard.

Doctor Dashboard: Doctors are able to view their appointment schedules, access patient histories, and provide notes or prescriptions directly in the system.

Appointment Scheduling: The system facilitates appointment bookings with available doctors, allowing patients to select date and time slots. Notifications inform relevant parties upon scheduling.

Pharmacy Module: Pharmacists have access to a medicine inventory dashboard where they can add, update, and track medicines. Patients can browse medicines and place requests.

Admin Controls: Administrators have oversight of the entire system—managing users, appointments, and inventory while viewing operational metrics and system health.

Security & Session Management: The backend API uses JWT-based authentication for secure data transactions and session handling, including inactivity timeouts and token refresh.

Responsive Design: The frontend is fully responsive, using Bootstrap for consistent styling across devices.

Deployment Instructions:

Clone the repository and navigate to the backend folder. Run npm install to install dependencies.

Set up your MongoDB connection and environment variables.

Start the backend server with npm start.

Repeat steps 1-3 for the frontend folder.

Access the frontend via http://localhost:3000.

This project is ideal for healthcare providers seeking to modernize their administrative processes. It improves patient experiences while optimizing internal workflows with a secure, scalable, and user-friendly interface.
