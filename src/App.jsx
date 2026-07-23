import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import RoleGuard from './auth/RoleGuard.jsx';
import { ROUTE_PERMISSIONS } from './auth/permissions.js';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Courses from './pages/Courses.jsx';
import EmployeeProfile from './pages/EmployeeProfile.jsx';
import CalendarDetail from './pages/CalendarDetail.jsx';
import MonthlyScorecards from './pages/MonthlyScorecards.jsx';
import MonthlyReports from './pages/MonthlyReports.jsx';
import DailyReport from './pages/DailyReport.jsx';
import ComingSoon from './pages/ComingSoon.jsx';
import Tuition from './pages/Tuition.jsx';
import Finance from './pages/Finance.jsx';
import CreateAccount from './pages/CreateAccount.jsx';
import Students from './pages/Students.jsx';
import Teachers from './pages/Teachers.jsx';
import Attendance from './pages/Attendance.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Unauthorized from './pages/Unauthorized.jsx';
import styles from './styles/dashboard.module.css';
import { useAuth } from './auth/AuthProvider.jsx';
import { getDefaultRouteForRole, isRouteAllowedForRole } from './auth/roleRoutes.js';

const placeholderRoutes = [
  { path: 'documents', title: 'Tài liệu', allowedRoles: ROUTE_PERMISSIONS.documents },
  { path: 'settings', title: 'Cài đặt', allowedRoles: ROUTE_PERMISSIONS.settings },
];

function PlaceholderPage({ title }) {
  return (
    <div className={styles['placeholder-page']}>
      <h1>{title}</h1>
      <p>Trang đang được phát triển. Vui lòng quay lại sau.</p>
    </div>
  );
}

function RoleHome() {
  const { role } = useAuth();
  if (isRouteAllowedForRole('/', role)) {
    return <Dashboard />;
  }
  return <Navigate to={getDefaultRouteForRole(role)} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardLayout />}>
          <Route
            index
            element={
              <RoleHome />
            }
          />
          <Route
            path="courses"
            element={
              <RoleGuard allowedRoles={ROUTE_PERMISSIONS.courses}>
                <Courses />
              </RoleGuard>
            }
          />
          <Route
            path="students"
            element={
              <RoleGuard allowedRoles={ROUTE_PERMISSIONS.students}>
                <Students />
              </RoleGuard>
            }
          />
          <Route
            path="teachers"
            element={
              <RoleGuard allowedRoles={ROUTE_PERMISSIONS.teachers}>
                <Teachers />
              </RoleGuard>
            }
          />
          <Route
            path="attendance"
            element={
              <RoleGuard allowedRoles={ROUTE_PERMISSIONS.attendance}>
                <Attendance />
              </RoleGuard>
            }
          />
          <Route
            path="employee-profile"
            element={
              <RoleGuard allowedRoles={ROUTE_PERMISSIONS.employeeProfile}>
                <EmployeeProfile />
              </RoleGuard>
            }
          />
          <Route
            path="students/:studentId"
            element={
              <RoleGuard allowedRoles={ROUTE_PERMISSIONS.employeeProfile}>
                <EmployeeProfile />
              </RoleGuard>
            }
          />
          <Route
            path="teachers/:teacherId"
            element={
              <RoleGuard allowedRoles={ROUTE_PERMISSIONS.employeeProfile}>
                <EmployeeProfile />
              </RoleGuard>
            }
          />
          <Route
            path="calendar-detail"
            element={
              <RoleGuard allowedRoles={ROUTE_PERMISSIONS.calendar}>
                <CalendarDetail />
              </RoleGuard>
            }
          />
          <Route
            path="monthly-scorecards"
            element={
              <RoleGuard allowedRoles={ROUTE_PERMISSIONS.monthlyScorecards}>
                <MonthlyScorecards />
              </RoleGuard>
            }
          />
          <Route
            path="monthly-reports"
            element={
              <RoleGuard allowedRoles={ROUTE_PERMISSIONS.monthlyReports}>
                <MonthlyReports />
              </RoleGuard>
            }
          />
          <Route
            path="report-card"
            element={
              <RoleGuard allowedRoles={ROUTE_PERMISSIONS.reportCard}>
                <DailyReport />
              </RoleGuard>
            }
          />
          <Route
            path="truyen-thong"
            element={
              <RoleGuard allowedRoles={ROUTE_PERMISSIONS.media}>
                <ComingSoon />
              </RoleGuard>
            }
          />
          <Route
            path="hoc-phi"
            element={
              <RoleGuard allowedRoles={ROUTE_PERMISSIONS.tuition}>
                <Tuition />
              </RoleGuard>
            }
          />
          <Route
            path="kho-tai-lieu"
            element={
              <RoleGuard allowedRoles={ROUTE_PERMISSIONS.documents}>
                <ComingSoon />
              </RoleGuard>
            }
          />
          <Route
            path="cai-dat"
            element={
              <RoleGuard allowedRoles={ROUTE_PERMISSIONS.settings}>
                <ComingSoon />
              </RoleGuard>
            }
          />
          <Route
            path="accounts/create"
            element={
              <RoleGuard allowedRoles={ROUTE_PERMISSIONS.accounts}>
                <CreateAccount />
              </RoleGuard>
            }
          />
          <Route
            path="finance"
            element={
              <RoleGuard allowedRoles={ROUTE_PERMISSIONS.finance}>
                <Finance />
              </RoleGuard>
            }
          />
          {placeholderRoutes.map(({ path, title, allowedRoles }) => (
            <Route
              key={path}
              path={path}
              element={
                <RoleGuard allowedRoles={allowedRoles}>
                  <PlaceholderPage title={title} />
                </RoleGuard>
              }
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
