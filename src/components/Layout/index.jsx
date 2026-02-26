import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    LayoutDashboard,
    Send,
    History,
    Users,
    Bell,
    LogOut
} from 'lucide-react';

export default function Layout() {
    const { adminData, logout } = useAuth();

    const getInitials = (name) => {
        if (!name) return 'AD';
        const parts = name.split(' ');
        return parts.length >= 2
            ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
            : name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="layout">
            {/* Sidebar */}
            <aside className="sidebar">
                {/* Logo */}
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <Bell />
                    </div>
                    <div className="sidebar-brand">
                        <h2>SMS Notify</h2>
                        <span>Admin Panel</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    <span className="sidebar-section-title">Main</span>

                    <NavLink
                        to="/"
                        end
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <LayoutDashboard />
                        <span>Dashboard</span>
                    </NavLink>

                    <NavLink
                        to="/compose"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <Send />
                        <span>Compose</span>
                    </NavLink>

                    <span className="sidebar-section-title">Management</span>

                    <NavLink
                        to="/history"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <History />
                        <span>Notification History</span>
                    </NavLink>

                    <NavLink
                        to="/students"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <Users />
                        <span>Student Management</span>
                    </NavLink>
                </nav>

                {/* User footer */}
                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-avatar">
                            {getInitials(adminData?.name)}
                        </div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{adminData?.name || 'Admin'}</div>
                            <div className="sidebar-user-role">Administrator</div>
                        </div>
                        <button className="logout-btn" onClick={logout} title="Sign Out">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
