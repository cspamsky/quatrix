import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Settings from './pages/Settings';
import Files from './pages/Files';
import Rcon from './pages/Rcon';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import { useAuthStore } from './store/useAuthStore';

function App() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    return (
        <div className="app">
            <Routes>
                {/* Public Routes */}
                <Route
                    path="/login"
                    element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />}
                />
                <Route
                    path="/register"
                    element={!isAuthenticated ? <Register /> : <Navigate to="/" replace />}
                />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/files" element={<Files />} />
                        {/* More routes can be added here */}
                        <Route path="/servers" element={<Dashboard />} />
                        <Route path="/rcon" element={<Rcon />} />
                    </Route>
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

export default App;
