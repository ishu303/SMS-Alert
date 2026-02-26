import { useState } from 'react';
import { db, auth } from '../config/firebase';
import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const BRANCHES = [
    'Computer Science', 'Information Technology', 'Electronics',
    'Mechanical', 'Civil', 'Electrical', 'Chemical', 'Biotechnology',
];

const YEARS = [2024, 2025, 2026, 2027];

const TYPES = [
    { value: 'announcement', label: '📢 Announcement', color: 'primary' },
    { value: 'exam', label: '📝 Exam', color: 'accent' },
    { value: 'event', label: '🎉 Event', color: 'warning' },
    { value: 'emergency', label: '🚨 Emergency', color: 'error' },
];

const PRIORITIES = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
];

export default function ComposeNotificationPage() {
    const [form, setForm] = useState({
        title: '',
        body: '',
        type: 'announcement',
        priority: 'medium',
        audienceType: 'all',
        branches: [],
        years: [],
    });
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setResult(null);
    };

    const toggleBranch = (branch) => {
        setForm(prev => ({
            ...prev,
            branches: prev.branches.includes(branch)
                ? prev.branches.filter(b => b !== branch)
                : [...prev.branches, branch],
        }));
    };

    const toggleYear = (year) => {
        setForm(prev => ({
            ...prev,
            years: prev.years.includes(year)
                ? prev.years.filter(y => y !== year)
                : [...prev.years, year],
        }));
    };

    const handleSend = async (e) => {
        e.preventDefault();

        if (!form.title.trim() || !form.body.trim()) {
            toast.error('Title and body are required');
            return;
        }

        setSending(true);
        setResult(null);

        try {
            // Count target recipients
            let usersQuery = query(
                collection(db, 'users'),
                where('status', '==', 'active')
            );

            const usersSnap = await getDocs(usersQuery);
            let targetUsers = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

            // Filter by role (students only)
            targetUsers = targetUsers.filter(u => u.role === 'student');

            // Filter by branches/years if specific targeting
            if (form.audienceType === 'specific') {
                if (form.branches.length > 0) {
                    targetUsers = targetUsers.filter(u => form.branches.includes(u.branch));
                }
                if (form.years.length > 0) {
                    targetUsers = targetUsers.filter(u => form.years.includes(u.year));
                }
            }

            const targetAudience = {
                type: form.audienceType,
                ...(form.audienceType === 'specific' && {
                    branches: form.branches,
                    years: form.years,
                }),
            };

            // Save notification directly to Firestore
            const notifRef = await addDoc(collection(db, 'notifications'), {
                title: form.title,
                body: form.body,
                type: form.type,
                priority: form.priority,
                targetAudience,
                imageUrl: null,
                sentBy: auth.currentUser.uid,
                sentAt: Timestamp.fromDate(new Date()),
                status: 'sent',
                analytics: {
                    totalRecipients: targetUsers.length,
                    delivered: 0,
                    opened: 0,
                    clicked: 0,
                },
            });

            const resultData = {
                success: true,
                notificationId: notifRef.id,
                totalRecipients: targetUsers.length,
                delivered: 0,
                message: targetUsers.length > 0
                    ? 'Notification saved! Push delivery requires Cloud Functions (Blaze plan).'
                    : 'Notification saved, but no matching students found.',
            };

            setResult(resultData);
            toast.success(`Notification saved! ${targetUsers.length} student(s) targeted.`);

            // Reset form
            setForm({
                title: '',
                body: '',
                type: 'announcement',
                priority: 'medium',
                audienceType: 'all',
                branches: [],
                years: [],
            });
        } catch (err) {
            console.error('Send error:', err);
            toast.error(err.message || 'Failed to send notification');
        } finally {
            setSending(false);
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Compose Notification</h1>
                    <p className="page-subtitle">Create and send notifications to students</p>
                </div>
            </div>

            <div className="compose-container">
                <form className="card compose-form" onSubmit={handleSend}>
                    {/* Success Result */}
                    {result && (
                        <div style={{
                            background: 'rgba(0, 230, 118, 0.08)',
                            border: '1px solid rgba(0, 230, 118, 0.2)',
                            borderRadius: 12,
                            padding: '16px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                        }}>
                            <CheckCircle2 size={20} color="#00e676" />
                            <div>
                                <p style={{ fontWeight: 600, fontSize: 14, color: '#00e676' }}>
                                    Notification saved successfully!
                                </p>
                                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>
                                    {result.totalRecipients} student(s) targeted. {result.message}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Info banner */}
                    <div style={{
                        background: 'rgba(108, 99, 255, 0.08)',
                        border: '1px solid rgba(108, 99, 255, 0.2)',
                        borderRadius: 12,
                        padding: '12px 16px',
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                    }}>
                        💡 Notifications are saved to Firestore and visible in the student app.
                        For push notifications (FCM), deploy Cloud Functions on the Blaze plan.
                    </div>

                    {/* Title */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="notif-title">Notification Title</label>
                        <input
                            id="notif-title"
                            type="text"
                            className="form-input"
                            placeholder="Enter a clear, concise title..."
                            value={form.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            maxLength={120}
                            required
                        />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'flex-end' }}>
                            {form.title.length}/120
                        </span>
                    </div>

                    {/* Body */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="notif-body">Message Body</label>
                        <textarea
                            id="notif-body"
                            className="form-textarea"
                            placeholder="Write the full notification message here..."
                            value={form.body}
                            onChange={(e) => handleChange('body', e.target.value)}
                            required
                        />
                    </div>

                    {/* Type & Priority */}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="notif-type">Type</label>
                            <select
                                id="notif-type"
                                className="form-select"
                                value={form.type}
                                onChange={(e) => handleChange('type', e.target.value)}
                            >
                                {TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="notif-priority">Priority</label>
                            <select
                                id="notif-priority"
                                className="form-select"
                                value={form.priority}
                                onChange={(e) => handleChange('priority', e.target.value)}
                            >
                                {PRIORITIES.map(p => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Audience */}
                    <div className="form-group">
                        <label className="form-label">Target Audience</label>
                        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                            <label className={`checkbox-chip ${form.audienceType === 'all' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="audience"
                                    checked={form.audienceType === 'all'}
                                    onChange={() => handleChange('audienceType', 'all')}
                                />
                                🌍 All Students
                            </label>
                            <label className={`checkbox-chip ${form.audienceType === 'specific' ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="audience"
                                    checked={form.audienceType === 'specific'}
                                    onChange={() => handleChange('audienceType', 'specific')}
                                />
                                🎯 Specific Groups
                            </label>
                        </div>
                    </div>

                    {/* Specific targeting */}
                    {form.audienceType === 'specific' && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Select Branches</label>
                                <div className="checkbox-group">
                                    {BRANCHES.map(branch => (
                                        <label
                                            key={branch}
                                            className={`checkbox-chip ${form.branches.includes(branch) ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={form.branches.includes(branch)}
                                                onChange={() => toggleBranch(branch)}
                                            />
                                            {branch}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Select Years</label>
                                <div className="checkbox-group">
                                    {YEARS.map(year => (
                                        <label
                                            key={year}
                                            className={`checkbox-chip ${form.years.includes(year) ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={form.years.includes(year)}
                                                onChange={() => toggleYear(year)}
                                            />
                                            {year}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Send */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={sending}
                            style={{ flex: 1, padding: '16px 24px' }}
                        >
                            {sending ? (
                                <>
                                    <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    Send Notification
                                </>
                            )}
                        </button>
                    </div>

                    {/* Warning for emergency */}
                    {form.type === 'emergency' && (
                        <div style={{
                            background: 'rgba(255, 82, 82, 0.08)',
                            border: '1px solid rgba(255, 82, 82, 0.2)',
                            borderRadius: 12,
                            padding: '12px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            fontSize: 13,
                            color: 'var(--error)',
                        }}>
                            <AlertCircle size={18} />
                            Emergency notifications will be sent with highest priority and may trigger critical alerts on student devices.
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
