import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs, query, orderBy, limit, startAfter, where, doc, deleteDoc } from 'firebase/firestore';
import {
    Bell, Megaphone, GraduationCap, CalendarDays, AlertTriangle,
    Eye, MousePointerClick, Clock, ChevronDown, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_CONFIG = {
    announcement: { icon: Megaphone, className: 'announcement', label: 'Announcement' },
    exam: { icon: GraduationCap, className: 'exam', label: 'Exam' },
    event: { icon: CalendarDays, className: 'event', label: 'Event' },
    emergency: { icon: AlertTriangle, className: 'emergency', label: 'Emergency' },
};

const COURSE_NAMES = {
    MBA: 'MBA', MCA: 'MCA', MCOM: 'M.COM', BBA: 'BBA', BCA: 'BCA',
    BCOMH: 'B.COM (HONS)', BAMASS: 'B.A.HONS (MASS COMM)',
};

export default function NotificationHistoryPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [deleteModal, setDeleteModal] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadNotifications(true);
    }, [filter]);

    const loadNotifications = async (fresh = false) => {
        setLoading(true);
        try {
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

            const q = query(collection(db, 'notifications'), ...constraints);
            const snap = await getDocs(q);

            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

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

    // ── Delete notification ──────────────────────────────────────
    const handleDelete = async (notifId) => {
        setDeleting(true);
        try {
            await deleteDoc(doc(db, 'notifications', notifId));
            setNotifications(prev => prev.filter(n => n.id !== notifId));
            toast.success('Notification deleted');
        } catch (err) {
            console.error('Delete error:', err);
            toast.error('Failed to delete notification');
        } finally {
            setDeleting(false);
            setDeleteModal(null);
        }
    };

    const formatAudience = (notif) => {
        const ta = notif.targetAudience;
        if (!ta) return 'All';
        if (ta.type === 'course' && ta.courses?.length) {
            return ta.courses.map(c => COURSE_NAMES[c] || c).join(', ');
        }
        if (ta.type === 'students') return 'All Students';
        if (ta.type === 'guest') return 'Guests Only';
        return 'All';
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
                                        <span className="badge badge-muted">
                                            {formatAudience(notif)}
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
                                    {/* Delete button */}
                                    <button
                                        className="action-btn danger"
                                        title="Delete notification"
                                        onClick={() => setDeleteModal(notif)}
                                        style={{ marginLeft: 8 }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
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

            {/* Delete Confirmation Modal */}
            {deleteModal && (
                <div className="modal-overlay" onClick={() => setDeleteModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Delete Notification</h3>
                            <button className="btn-icon" onClick={() => setDeleteModal(null)}>✕</button>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                            Are you sure you want to delete <strong>"{deleteModal.title}"</strong>?
                            This will permanently remove it from all students' feeds.
                        </p>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setDeleteModal(null)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                disabled={deleting}
                                onClick={() => handleDelete(deleteModal.id)}
                            >
                                {deleting ? (
                                    <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                ) : (
                                    <>
                                        <Trash2 size={16} /> Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
