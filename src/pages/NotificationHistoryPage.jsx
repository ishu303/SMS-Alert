import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs, query, orderBy, limit, startAfter, where } from 'firebase/firestore';
import {
    Bell, Megaphone, GraduationCap, CalendarDays, AlertTriangle,
    Users, Eye, MousePointerClick, Clock, ChevronDown
} from 'lucide-react';

const TYPE_CONFIG = {
    announcement: { icon: Megaphone, className: 'announcement', label: 'Announcement' },
    exam: { icon: GraduationCap, className: 'exam', label: 'Exam' },
    event: { icon: CalendarDays, className: 'event', label: 'Event' },
    emergency: { icon: AlertTriangle, className: 'emergency', label: 'Emergency' },
};

export default function NotificationHistoryPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        loadNotifications(true);
    }, [filter]);

    const loadNotifications = async (fresh = false) => {
        setLoading(true);
        try {
            let q;
            const constraints = [
                orderBy('sentAt', 'desc'),
                limit(15),
            ];

            if (filter !== 'all') {
                constraints.unshift(where('type', '==', filter));
            }

            if (!fresh && lastDoc) {
                constraints.push(startAfter(lastDoc));
            }

            q = query(collection(db, 'notifications'), ...constraints);
            const snap = await getDocs(q);

            const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (fresh) {
                setNotifications(items);
            } else {
                setNotifications(prev => [...prev, ...items]);
            }

            setLastDoc(snap.docs[snap.docs.length - 1] || null);
            setHasMore(snap.docs.length >= 15);
        } catch (err) {
            console.error('Error loading notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp?.toDate) return '—';
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const timeAgo = (timestamp) => {
        if (!timestamp?.toDate) return '';
        const diff = Date.now() - timestamp.toDate().getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Notification History</h1>
                    <p className="page-subtitle">View all sent notifications and their analytics</p>
                </div>
            </div>

            {/* Filters */}
            <div className="toolbar">
                <div className="toolbar-left">
                    <select
                        className="filter-select"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">All Types</option>
                        <option value="announcement">📢 Announcements</option>
                        <option value="exam">📝 Exams</option>
                        <option value="event">🎉 Events</option>
                        <option value="emergency">🚨 Emergency</option>
                    </select>
                </div>
                <span className="badge badge-muted">{notifications.length} notifications</span>
            </div>

            {/* Notification List */}
            {loading && notifications.length === 0 ? (
                <div className="loading-screen" style={{ minHeight: 'auto', paddingTop: 80 }}>
                    <div className="loading-spinner" />
                    <p>Loading notifications...</p>
                </div>
            ) : notifications.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon"><Bell /></div>
                        <h3>No notifications found</h3>
                        <p>No notifications match the selected filter.</p>
                    </div>
                </div>
            ) : (
                <div className="notification-list">
                    {notifications.map(notif => {
                        const typeConfig = TYPE_CONFIG[notif.type] || TYPE_CONFIG.announcement;
                        const TypeIcon = typeConfig.icon;

                        return (
                            <div key={notif.id} className="notification-history-card">
                                <div className={`notif-type-icon ${typeConfig.className}`}>
                                    <TypeIcon />
                                </div>

                                <div className="notif-content">
                                    <div className="notif-title">{notif.title}</div>
                                    <div className="notif-body">{notif.body}</div>
                                    <div className="notif-meta">
                                        <span className={`badge badge-${notif.type === 'emergency' ? 'error' : notif.type === 'exam' ? 'accent' : notif.type === 'event' ? 'warning' : 'primary'}`}>
                                            <span className="badge-dot" />
                                            {typeConfig.label}
                                        </span>
                                        <span className={`badge badge-${notif.priority === 'urgent' ? 'error' : notif.priority === 'high' ? 'warning' : 'muted'}`}>
                                            {notif.priority}
                                        </span>
                                        <span className="notif-meta-item">
                                            <Clock size={14} /> {timeAgo(notif.sentAt)}
                                        </span>
                                    </div>
                                </div>

                                <div className="notif-stats">
                                    <div className="notif-stat">
                                        <div className="notif-stat-value" style={{ color: 'var(--primary)' }}>
                                            {notif.analytics?.totalRecipients || 0}
                                        </div>
                                        <div className="notif-stat-label">Sent</div>
                                    </div>
                                    <div className="notif-stat">
                                        <div className="notif-stat-value" style={{ color: 'var(--success)' }}>
                                            {notif.analytics?.delivered || 0}
                                        </div>
                                        <div className="notif-stat-label">Delivered</div>
                                    </div>
                                    <div className="notif-stat">
                                        <div className="notif-stat-value" style={{ color: 'var(--accent)' }}>
                                            {notif.analytics?.opened || 0}
                                        </div>
                                        <div className="notif-stat-label">Opened</div>
                                    </div>
                                    <div className="notif-stat">
                                        <div className="notif-stat-value" style={{ color: 'var(--warning)' }}>
                                            {notif.analytics?.clicked || 0}
                                        </div>
                                        <div className="notif-stat-label">Clicked</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Load More */}
                    {hasMore && (
                        <div style={{ textAlign: 'center', padding: '16px 0' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => loadNotifications(false)}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown size={16} />
                                        Load More
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
