import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, getDocs, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
    Search, UserPlus, Shield, ShieldOff, UserX,
    MoreVertical, Filter, Users
} from 'lucide-react';
import toast from 'react-hot-toast';

const GRAD_CLASSES = ['grad-1', 'grad-2', 'grad-3', 'grad-4'];

export default function StudentManagementPage() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCourse, setFilterCourse] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showModal, setShowModal] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadStudents();
    }, []);

    const loadStudents = async () => {
        try {
            const snap = await getDocs(
                query(collection(db, 'users'), orderBy('createdAt', 'desc'))
            );
            setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error('Error loading students:', err);
            toast.error('Failed to load students');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, role) => {
        setActionLoading(true);
        try {
            await updateDoc(doc(db, 'users', userId), {
                role,
                updatedAt: serverTimestamp(),
            });
            toast.success(`Role updated to ${role}`);
            await loadStudents();
        } catch (err) {
            console.error('Role change error:', err);
            toast.error('Failed to update role. Check Firestore rules.');
        } finally {
            setActionLoading(false);
            setShowModal(null);
        }
    };

    const handleStatusChange = async (userId, status) => {
        setActionLoading(true);
        try {
            await updateDoc(doc(db, 'users', userId), {
                status,
                updatedAt: serverTimestamp(),
            });
            toast.success(`User ${status === 'blocked' ? 'blocked' : status === 'active' ? 'unblocked' : 'removed'}`);
            await loadStudents();
        } catch (err) {
            console.error('Status change error:', err);
            toast.error('Failed to update status. Check Firestore rules.');
        } finally {
            setActionLoading(false);
            setShowModal(null);
        }
    };

    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.split(' ');
        return parts.length >= 2
            ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
            : name.substring(0, 2).toUpperCase();
    };

    // Filter students
    const filteredStudents = students.filter(s => {
        const matchesSearch = searchQuery === '' ||
            s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCourse = filterCourse === 'all' || s.course === filterCourse;
        const matchesStatus = filterStatus === 'all' || s.status === filterStatus;

        return matchesSearch && matchesCourse && matchesStatus;
    });

    const COURSES = [
        { id: 'MBA', name: 'MBA' },
        { id: 'MCA', name: 'MCA' },
        { id: 'MCOM', name: 'M.COM' },
        { id: 'BBA', name: 'BBA' },
        { id: 'BCA', name: 'BCA' },
        { id: 'BCOMH', name: 'B.COM (HONS)' },
        { id: 'BAMASS', name: 'B.A.HONS (MASS COMM)' },
    ];
    const courseNameMap = Object.fromEntries(COURSES.map(c => [c.id, c.name]));

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Student Management</h1>
                    <p className="page-subtitle">Manage student accounts, roles, and access</p>
                </div>
                <span className="badge badge-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
                    <Users size={16} /> {students.length} total students
                </span>
            </div>

            {/* Toolbar */}
            <div className="toolbar">
                <div className="toolbar-left">
                    <div className="search-input">
                        <Search />
                        <input
                            type="text"
                            placeholder="Search by name, email, or roll number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="filter-select"
                        value={filterCourse}
                        onChange={(e) => setFilterCourse(e.target.value)}
                    >
                        <option value="all">All Courses</option>
                        {COURSES.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <select
                        className="filter-select"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="blocked">Blocked</option>
                        <option value="removed">Removed</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="loading-screen" style={{ minHeight: 'auto', paddingTop: 80 }}>
                    <div className="loading-spinner" />
                    <p>Loading students...</p>
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon"><Users /></div>
                        <h3>No students found</h3>
                        <p>Try adjusting your search or filters.</p>
                    </div>
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Roll Number</th>
                                    <th>Course</th>
                                    <th>Batch</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student, idx) => (
                                    <tr key={student.id}>
                                        <td>
                                            <div className="user-cell">
                                                <div className={`user-avatar ${GRAD_CLASSES[idx % GRAD_CLASSES.length]}`}>
                                                    {getInitials(student.name)}
                                                </div>
                                                <div>
                                                    <div className="user-name">{student.name || 'Unnamed'}</div>
                                                    <div className="user-email">{student.email || '—'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ fontFamily: 'monospace', letterSpacing: 0.5 }}>
                                            {student.rollNumber || '—'}
                                        </td>
                                        <td>{courseNameMap[student.course] || student.course || '—'}</td>
                                        <td>{student.entranceYear && student.passOutYear ? `${student.entranceYear}–${student.passOutYear}` : '—'}</td>
                                        <td>
                                            <span className={`badge ${student.role === 'admin' ? 'badge-warning' : student.role === 'student' ? 'badge-primary' : 'badge-muted'}`}>
                                                {student.role || 'guest'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${student.status === 'active' ? 'badge-success' : student.status === 'blocked' ? 'badge-error' : 'badge-muted'}`}>
                                                <span className="badge-dot" />
                                                {student.status || 'unknown'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-btns">
                                                {student.role !== 'admin' && (
                                                    <>
                                                        <button
                                                            className="action-btn"
                                                            title="Make Admin"
                                                            onClick={() => setShowModal({ type: 'role', student, targetRole: 'admin' })}
                                                        >
                                                            <Shield size={16} />
                                                        </button>
                                                        {student.status === 'active' ? (
                                                            <button
                                                                className="action-btn danger"
                                                                title="Block User"
                                                                onClick={() => setShowModal({ type: 'block', student })}
                                                            >
                                                                <ShieldOff size={16} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="action-btn"
                                                                title="Unblock User"
                                                                onClick={() => handleStatusChange(student.id, 'active')}
                                                            >
                                                                <Shield size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            className="action-btn danger"
                                                            title="Remove User"
                                                            onClick={() => setShowModal({ type: 'remove', student })}
                                                        >
                                                            <UserX size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {showModal.type === 'role' && 'Assign Admin Role'}
                                {showModal.type === 'block' && 'Block Student'}
                                {showModal.type === 'remove' && 'Remove Student'}
                            </h3>
                            <button className="btn-icon" onClick={() => setShowModal(null)}>✕</button>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                            {showModal.type === 'role' && (
                                <>Are you sure you want to make <strong>{showModal.student.name}</strong> an admin? They will have full access to the admin dashboard.</>
                            )}
                            {showModal.type === 'block' && (
                                <>Are you sure you want to block <strong>{showModal.student.name}</strong>? They will be unable to access the app.</>
                            )}
                            {showModal.type === 'remove' && (
                                <>Are you sure you want to remove <strong>{showModal.student.name}</strong>? This action can be reversed by changing their status back to active.</>
                            )}
                        </p>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowModal(null)}>
                                Cancel
                            </button>
                            <button
                                className={`btn ${showModal.type === 'role' ? 'btn-primary' : 'btn-danger'}`}
                                disabled={actionLoading}
                                onClick={() => {
                                    if (showModal.type === 'role') {
                                        handleRoleChange(showModal.student.id, showModal.targetRole);
                                    } else if (showModal.type === 'block') {
                                        handleStatusChange(showModal.student.id, 'blocked');
                                    } else if (showModal.type === 'remove') {
                                        handleStatusChange(showModal.student.id, 'removed');
                                    }
                                }}
                            >
                                {actionLoading ? (
                                    <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                ) : (
                                    <>
                                        {showModal.type === 'role' && 'Confirm'}
                                        {showModal.type === 'block' && 'Block'}
                                        {showModal.type === 'remove' && 'Remove'}
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
