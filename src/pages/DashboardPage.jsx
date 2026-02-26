import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import {
    Users, Bell, Eye, MousePointerClick,
    TrendingUp, TrendingDown, ArrowUpRight
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#6c63ff', '#00d2ff', '#ff6b6b', '#ffab40', '#00e676', '#9c27b0', '#e91e63', '#795548'];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: '#1e2340',
            border: '1px solid #2a3052',
            borderRadius: 12,
            padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}>
            <p style={{ color: '#b0bec5', fontSize: 12, marginBottom: 6 }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>
                    {p.name}: {p.value}
                </p>
            ))}
        </div>
    );
};

export default function DashboardPage() {
    const [stats, setStats] = useState({
        totalStudents: 0,
        activeStudents: 0,
        blockedStudents: 0,
        totalNotifications: 0,
        totalDelivered: 0,
        totalOpened: 0,
        totalClicked: 0,
    });
    const [branchData, setBranchData] = useState([]);
    const [notifTrends, setNotifTrends] = useState([]);
    const [recentNotifications, setRecentNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            // Load users
            const usersSnap = await getDocs(collection(db, 'users'));
            let totalStudents = 0, activeStudents = 0, blockedStudents = 0;
            const branches = {};

            usersSnap.forEach(doc => {
                const user = doc.data();
                if (user.role === 'student' || user.role === 'guest') {
                    totalStudents++;
                    if (user.status === 'active') activeStudents++;
                    if (user.status === 'blocked') blockedStudents++;
                    if (user.branch) {
                        branches[user.branch] = (branches[user.branch] || 0) + 1;
                    }
                }
            });

            setBranchData(
                Object.entries(branches).map(([name, value]) => ({ name, value }))
            );

            // Load notifications (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const notifsSnap = await getDocs(
                query(
                    collection(db, 'notifications'),
                    where('sentAt', '>=', Timestamp.fromDate(thirtyDaysAgo)),
                    orderBy('sentAt', 'desc')
                )
            );

            let totalNotifications = 0, totalDelivered = 0, totalOpened = 0, totalClicked = 0;
            const dailyStats = {};
            const recent = [];

            notifsSnap.forEach(doc => {
                const notif = doc.data();
                totalNotifications++;
                if (notif.analytics) {
                    totalDelivered += notif.analytics.delivered || 0;
                    totalOpened += notif.analytics.opened || 0;
                    totalClicked += notif.analytics.clicked || 0;
                }

                if (notif.sentAt) {
                    const date = notif.sentAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    if (!dailyStats[date]) {
                        dailyStats[date] = { date, sent: 0, opened: 0 };
                    }
                    dailyStats[date].sent++;
                    dailyStats[date].opened += notif.analytics?.opened || 0;
                }

                if (recent.length < 5) {
                    recent.push({ id: doc.id, ...notif });
                }
            });

            setNotifTrends(Object.values(dailyStats).reverse().slice(-14));
            setRecentNotifications(recent);
            setStats({
                totalStudents, activeStudents, blockedStudents,
                totalNotifications, totalDelivered, totalOpened, totalClicked,
            });
        } catch (err) {
            console.error('Dashboard load error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-screen" style={{ minHeight: 'auto', paddingTop: 120 }}>
                <div className="loading-spinner" />
                <p>Loading analytics...</p>
            </div>
        );
    }

    const avgOpenRate = stats.totalDelivered > 0
        ? ((stats.totalOpened / stats.totalDelivered) * 100).toFixed(1)
        : 0;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">Overview of your notification system</p>
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card primary">
                    <div className="stat-icon primary"><Users /></div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.totalStudents}</div>
                        <div className="stat-label">Total Students</div>
                        <span className="stat-change up">
                            <TrendingUp size={12} /> {stats.activeStudents} active
                        </span>
                    </div>
                </div>

                <div className="stat-card accent">
                    <div className="stat-icon accent"><Bell /></div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.totalNotifications}</div>
                        <div className="stat-label">Notifications Sent</div>
                        <span className="stat-change up">
                            <ArrowUpRight size={12} /> Last 30 days
                        </span>
                    </div>
                </div>

                <div className="stat-card success">
                    <div className="stat-icon success"><Eye /></div>
                    <div className="stat-info">
                        <div className="stat-value">{avgOpenRate}%</div>
                        <div className="stat-label">Avg Open Rate</div>
                        <span className="stat-change up">
                            <TrendingUp size={12} /> {stats.totalOpened} total opens
                        </span>
                    </div>
                </div>

                <div className="stat-card warning">
                    <div className="stat-icon warning"><MousePointerClick /></div>
                    <div className="stat-info">
                        <div className="stat-value">{stats.totalClicked}</div>
                        <div className="stat-label">Total Clicks</div>
                        <span className="stat-change up">
                            <TrendingUp size={12} /> Engagement
                        </span>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="dashboard-grid">
                {/* Notification Trends */}
                <div className="card">
                    <div className="chart-header">
                        <h3 className="chart-title">Notification Trends</h3>
                        <span className="badge badge-muted">Last 14 days</span>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={notifTrends}>
                                <defs>
                                    <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradOpened" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00e676" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#00e676" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a3052" />
                                <XAxis dataKey="date" stroke="#546e7a" fontSize={12} tickLine={false} />
                                <YAxis stroke="#546e7a" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Area type="monotone" dataKey="sent" stroke="#6c63ff" fill="url(#gradSent)" strokeWidth={2} name="Sent" />
                                <Area type="monotone" dataKey="opened" stroke="#00e676" fill="url(#gradOpened)" strokeWidth={2} name="Opened" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Branch Distribution */}
                <div className="card">
                    <div className="chart-header">
                        <h3 className="chart-title">Branch Distribution</h3>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={branchData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {branchData.map((_, index) => (
                                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    formatter={(value) => <span style={{ color: '#b0bec5', fontSize: 12 }}>{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Notifications */}
            <div className="card" style={{ marginTop: 24 }}>
                <div className="chart-header">
                    <h3 className="chart-title">Recent Notifications</h3>
                    <span className="badge badge-primary">Last 5</span>
                </div>
                {recentNotifications.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon"><Bell /></div>
                        <h3>No notifications yet</h3>
                        <p>Send your first notification to see analytics here.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Type</th>
                                    <th>Recipients</th>
                                    <th>Delivered</th>
                                    <th>Opened</th>
                                    <th>Sent At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentNotifications.map(n => (
                                    <tr key={n.id}>
                                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{n.title}</td>
                                        <td>
                                            <span className={`badge badge-${n.type === 'emergency' ? 'error' : n.type === 'exam' ? 'accent' : 'primary'}`}>
                                                <span className="badge-dot" />
                                                {n.type}
                                            </span>
                                        </td>
                                        <td>{n.analytics?.totalRecipients || 0}</td>
                                        <td>{n.analytics?.delivered || 0}</td>
                                        <td>{n.analytics?.opened || 0}</td>
                                        <td>{n.sentAt?.toDate?.().toLocaleDateString() || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
