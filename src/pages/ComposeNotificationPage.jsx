import { useState, useRef, useEffect } from 'react';
import { db, auth, storage } from '../config/firebase';
import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Send, AlertCircle, CheckCircle2, Paperclip, X, Image, FileText, Film, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { COURSES } from '../config/constants';

const TYPES = [
    { value: 'announcement', label: '📢 Announcement' },
    { value: 'exam', label: '📝 Exam' },
    { value: 'event', label: '🎉 Event' },
    { value: 'emergency', label: '🚨 Emergency' },
];

const PRIORITIES = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
];

// Audience options
const AUDIENCE_TYPES = [
    { value: 'all', label: '🌍 All (students + guests)' },
    { value: 'students', label: '🎓 All Students (no guests)' },
    { value: 'course', label: '🎯 Specific Course(s)' },
    { value: 'batch', label: '📅 Specific Batch(es)' },
    { value: 'guest', label: '👤 Guests Only' },
];

// Detect media type from MIME type
function detectType(file) {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'file';
}

// Media icon
function MediaIcon({ type, size = 16 }) {
    if (type === 'image') return <Image size={size} />;
    if (type === 'video') return <Film size={size} />;
    return <FileText size={size} />;
}

export default function ComposeNotificationPage() {
    const [form, setForm] = useState({
        title: '',
        body: '',
        type: 'announcement',
        priority: 'medium',
        audienceType: 'all',
        courses: [],
        batches: [],
    });
    const [attachments, setAttachments] = useState([]); // [{file, type, preview}]
    const [uploadProgress, setUploadProgress] = useState(null); // 0-100
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const fileInputRef = useRef(null);
    const [availableBatches, setAvailableBatches] = useState([]);

    useEffect(() => {
        const fetchBatches = async () => {
            try {
                const snap = await getDocs(query(collection(db, 'users')));
                const batchesSet = new Set();
                snap.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.entranceYear && data.passOutYear) {
                        batchesSet.add(`${data.entranceYear}-${data.passOutYear}`);
                    }
                });
                setAvailableBatches(Array.from(batchesSet).sort().reverse());
            } catch (err) {
                console.error('Error fetching batches:', err);
            }
        };
        fetchBatches();
    }, []);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setResult(null);
    };

    const toggleCourse = (courseId) => {
        setForm(prev => ({
            ...prev,
            courses: prev.courses.includes(courseId)
                ? prev.courses.filter(c => c !== courseId)
                : [...prev.courses, courseId],
        }));
    };

    const toggleBatch = (batchId) => {
        setForm(prev => ({
            ...prev,
            batches: prev.batches.includes(batchId)
                ? prev.batches.filter(b => b !== batchId)
                : [...prev.batches, batchId],
        }));
    };

    // ── File picker ───────────────────────────────────────────
    const handleFilePick = (e) => {
        const files = Array.from(e.target.files || []);
        const newAttachments = files.map(file => ({
            file,
            type: detectType(file),
            preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        }));
        setAttachments(prev => [...prev, ...newAttachments].slice(0, 5)); // max 5
        e.target.value = ''; // reset picker
    };

    const removeAttachment = (index) => {
        setAttachments(prev => {
            const copy = [...prev];
            if (copy[index].preview) URL.revokeObjectURL(copy[index].preview);
            copy.splice(index, 1);
            return copy;
        });
    };

    // ── Upload one file to Firebase Storage ──────────────────
    const uploadFile = (attachment) => {
        return new Promise((resolve, reject) => {
            const { file } = attachment;
            const path = `notifications/${Date.now()}_${file.name}`;

            let storageRef;
            try {
                storageRef = ref(storage, path);
            } catch (err) {
                console.error('Storage init error:', err);
                reject(new Error('Firebase Storage is not configured. Please enable Storage in Firebase Console first.'));
                return;
            }

            const task = uploadBytesResumable(storageRef, file);

            // Timeout after 30 seconds
            const timeout = setTimeout(() => {
                task.cancel();
                reject(new Error('Upload timed out. Please check your internet connection or enable Firebase Storage in Firebase Console → Storage → Get Started.'));
            }, 30000);

            task.on('state_changed',
                (snap) => {
                    const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
                    setUploadProgress(pct);
                },
                (err) => {
                    clearTimeout(timeout);
                    if (err.code === 'storage/unauthorized') {
                        reject(new Error('Storage permission denied. Go to Firebase Console → Storage → Get Started to enable it, then try again.'));
                    } else if (err.code === 'storage/canceled') {
                        reject(new Error('Upload was cancelled.'));
                    } else {
                        reject(err);
                    }
                },
                async () => {
                    clearTimeout(timeout);
                    const url = await getDownloadURL(task.snapshot.ref);
                    resolve({ type: attachment.type, url, name: file.name });
                }
            );
        });
    };

    // ── Validate then show confirm modal ─────────────────────
    const handleFormSubmit = (e) => {
        e.preventDefault();

        if (!form.title.trim() || !form.body.trim()) {
            toast.error('Title and body are required');
            return;
        }
        if (form.audienceType === 'course' && form.courses.length === 0) {
            toast.error('Please select at least one course');
            return;
        }
        if (form.audienceType === 'batch' && form.batches.length === 0) {
            toast.error('Please select at least one batch');
            return;
        }
        setShowConfirm(true);
    };

    const audienceLabel = () => {
        if (form.audienceType === 'all') return 'Everyone (students + guests)';
        if (form.audienceType === 'students') return 'All Students';
        if (form.audienceType === 'guest') return 'Guests Only';
        if (form.audienceType === 'course') return form.courses.map(c => COURSES.find(x => x.id === c)?.name || c).join(', ');
        if (form.audienceType === 'batch') return form.batches.join(', ');
        return 'All';
    };

    // ── Actual send ──────────────────────────────────────────
    const handleSend = async () => {
        setShowConfirm(false);

        setSending(true);
        setResult(null);

        try {
            // 1️⃣ Upload attachments
            const uploadedMedia = [];
            for (const att of attachments) {
                const uploaded = await uploadFile(att);
                uploadedMedia.push(uploaded);
            }
            setUploadProgress(null);

            // 2️⃣ Count target recipients
            let usersQ = query(collection(db, 'users'), where('status', '==', 'active'));
            const usersSnap = await getDocs(usersQ);
            let targetUsers = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }));

            if (form.audienceType === 'students' || form.audienceType === 'course' || form.audienceType === 'batch') {
                targetUsers = targetUsers.filter(u => u.role === 'student');
            }
            if (form.audienceType === 'course' && form.courses.length > 0) {
                targetUsers = targetUsers.filter(u => form.courses.includes(u.course));
            }
            if (form.audienceType === 'batch' && form.batches.length > 0) {
                targetUsers = targetUsers.filter(u => {
                    if (!u.entranceYear || !u.passOutYear) return false;
                    return form.batches.includes(`${u.entranceYear}-${u.passOutYear}`);
                });
            }
            if (form.audienceType === 'guest') {
                targetUsers = targetUsers.filter(u => u.role === 'guest');
            }

            // 3️⃣ Build targetAudience object
            const targetAudience = {
                type: form.audienceType,
                ...(form.audienceType === 'course' && { courses: form.courses }),
                ...(form.audienceType === 'batch' && { batches: form.batches }),
            };

            // 4️⃣ Save to Firestore
            const notifRef = await addDoc(collection(db, 'notifications'), {
                title: form.title,
                body: form.body,
                type: form.type,
                priority: form.priority,
                targetAudience,
                media: uploadedMedia,
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

            setResult({ notificationId: notifRef.id, totalRecipients: targetUsers.length });
            toast.success(`Notification saved — ${targetUsers.length} recipient(s) targeted.`);

            // Reset form
            setForm({ title: '', body: '', type: 'announcement', priority: 'medium', audienceType: 'all', courses: [], batches: [] });
            setAttachments([]);
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Failed to send notification');
            setUploadProgress(null);
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
                <form className="card compose-form" onSubmit={handleFormSubmit}>

                    {/* Result banner */}
                    {result && (
                        <div style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.2)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <CheckCircle2 size={20} color="#00e676" />
                            <div>
                                <p style={{ fontWeight: 600, fontSize: 14, color: '#00e676' }}>Notification saved successfully!</p>
                                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>
                                    {result.totalRecipients} recipient(s) targeted. Visible in student app immediately.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    <div style={{ background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                        💡 Notifications are saved to Firestore and instantly visible in the student app. Push alerts require Cloud Functions (Blaze plan).
                    </div>

                    {/* Title */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="notif-title">Notification Title</label>
                        <input id="notif-title" type="text" className="form-input"
                            placeholder="Enter a clear, concise title..."
                            value={form.title} onChange={e => handleChange('title', e.target.value)}
                            maxLength={120} required />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'flex-end' }}>{form.title.length}/120</span>
                    </div>

                    {/* Body */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="notif-body">Message Body</label>
                        <textarea id="notif-body" className="form-textarea"
                            placeholder="Write the full notification message here..."
                            value={form.body} onChange={e => handleChange('body', e.target.value)}
                            required />
                    </div>

                    {/* Type & Priority */}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="notif-type">Type</label>
                            <select id="notif-type" className="form-select" value={form.type} onChange={e => handleChange('type', e.target.value)}>
                                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="notif-priority">Priority</label>
                            <select id="notif-priority" className="form-select" value={form.priority} onChange={e => handleChange('priority', e.target.value)}>
                                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Audience */}
                    <div className="form-group">
                        <label className="form-label">Target Audience</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                            {AUDIENCE_TYPES.map(a => (
                                <label key={a.value} className={`checkbox-chip ${form.audienceType === a.value ? 'selected' : ''}`}>
                                    <input type="radio" name="audience" checked={form.audienceType === a.value}
                                        onChange={() => handleChange('audienceType', a.value)} />
                                    {a.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Course picker (shown only for 'course' audience) */}
                    {form.audienceType === 'course' && (
                        <div className="form-group">
                            <label className="form-label">Select Course(s)</label>
                            <div className="checkbox-group">
                                {COURSES.map(c => (
                                    <label key={c.id} className={`checkbox-chip ${form.courses.includes(c.id) ? 'selected' : ''}`}>
                                        <input type="checkbox" checked={form.courses.includes(c.id)}
                                            onChange={() => toggleCourse(c.id)} />
                                        {c.name}
                                    </label>
                                ))}
                            </div>
                            {form.courses.length === 0 && (
                                <p style={{ fontSize: 12, color: 'var(--error)', marginTop: 6 }}>
                                    ⚠ Please select at least one course.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Batch picker (shown only for 'batch' audience) */}
                    {form.audienceType === 'batch' && (
                        <div className="form-group">
                            <label className="form-label">Select Batch(es)</label>
                            {availableBatches.length > 0 ? (
                                <div className="checkbox-group">
                                    {availableBatches.map(b => (
                                        <label key={b} className={`checkbox-chip ${form.batches.includes(b) ? 'selected' : ''}`}>
                                            <input type="checkbox" checked={form.batches.includes(b)}
                                                onChange={() => toggleBatch(b)} />
                                            {b}
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                    No batches found. Students must have entrance & pass-out years updated.
                                </p>
                            )}
                            {form.batches.length === 0 && availableBatches.length > 0 && (
                                <p style={{ fontSize: 12, color: 'var(--error)', marginTop: 6 }}>
                                    ⚠ Please select at least one batch.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Media Attachments */}
                    <div className="form-group">
                        <label className="form-label">
                            <Paperclip size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                            Attachments (optional, max 5)
                        </label>

                        {/* Attachment previews */}
                        {attachments.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                                {attachments.map((att, i) => (
                                    <div key={i} style={{
                                        position: 'relative', borderRadius: 10, overflow: 'hidden',
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        width: att.type === 'image' ? 100 : 'auto',
                                        minWidth: att.type !== 'image' ? 160 : undefined,
                                        padding: att.type !== 'image' ? '10px 12px' : 0,
                                    }}>
                                        {att.type === 'image' ? (
                                            <img src={att.preview} alt={att.file.name}
                                                style={{ width: 100, height: 100, objectFit: 'cover', display: 'block' }} />
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <MediaIcon type={att.type} size={18} />
                                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {att.file.name}
                                                </span>
                                            </div>
                                        )}
                                        {/* Remove button */}
                                        <button type="button" onClick={() => removeAttachment(i)}
                                            style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* File picker button */}
                        {attachments.length < 5 && (
                            <>
                                <input ref={fileInputRef} type="file" multiple hidden
                                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                                    onChange={handleFilePick} />
                                <button type="button" className="btn btn-ghost"
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{ border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Upload size={14} /> Choose Images / Videos / Files
                                </button>
                            </>
                        )}

                        {/* Upload progress */}
                        {uploadProgress !== null && (
                            <div style={{ marginTop: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                                    <span>Uploading…</span><span>{uploadProgress}%</span>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, height: 4 }}>
                                    <div style={{ background: 'var(--primary)', borderRadius: 4, height: 4, width: `${uploadProgress}%`, transition: 'width 0.3s' }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Send button */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                        <button type="submit" className="btn btn-primary" disabled={sending}
                            style={{ flex: 1, padding: '16px 24px' }}>
                            {sending ? (
                                <><span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> {uploadProgress !== null ? 'Uploading…' : 'Saving…'}</>
                            ) : (
                                <><Send size={18} /> Send Notification</>
                            )}
                        </button>
                    </div>

                    {/* Emergency warning */}
                    {form.type === 'emergency' && (
                        <div style={{ background: 'rgba(255,82,82,0.08)', border: '1px solid rgba(255,82,82,0.2)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--error)' }}>
                            <AlertCircle size={18} />
                            Emergency notifications are shown with highest priority to all targeted users.
                        </div>
                    )}
                </form>
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Confirm Notification</h3>
                            <button className="btn-icon" onClick={() => setShowConfirm(false)}>✕</button>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
                                Are you sure you want to send this notification? It will be instantly visible in the student app.
                            </p>

                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{ fontSize: 13, marginBottom: 8 }}>
                                    <span style={{ color: 'var(--text-tertiary)', display: 'inline-block', width: 70 }}>Title:</span>
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{form.title}</span>
                                </div>
                                <div style={{ fontSize: 13, marginBottom: 8 }}>
                                    <span style={{ color: 'var(--text-tertiary)', display: 'inline-block', width: 70 }}>Audience:</span>
                                    <span style={{ color: 'var(--accent)' }}>{audienceLabel()}</span>
                                </div>
                                <div style={{ fontSize: 13 }}>
                                    <span style={{ color: 'var(--text-tertiary)', display: 'inline-block', width: 70 }}>Type:</span>
                                    <span style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{form.type}</span>
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSend}
                            >
                                <Send size={16} /> Send Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
