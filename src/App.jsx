import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import styles from './styles/dashboard.module.css';

const placeholderRoutes = [
  { path: 'courses', title: 'Khóa học' },
  { path: 'students', title: 'Học viên' },
  { path: 'teachers', title: 'Giảng viên' },
  { path: 'finance', title: 'Doanh thu' },
  { path: 'settings', title: 'Cài đặt' },
];

function PlaceholderPage({ title }) {
  return (
    <div className={styles['placeholder-page']}>
      <h1>{title}</h1>
      <p>Trang đang được phát triển. Vui lòng quay lại sau.</p>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        {placeholderRoutes.map(({ path, title }) => (
          <Route key={path} path={path} element={<PlaceholderPage title={title} />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
