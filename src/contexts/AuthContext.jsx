import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [adminData, setAdminData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (userDoc.exists() && userDoc.data().role === 'admin') {
                        setUser(firebaseUser);
                        setAdminData({ id: userDoc.id, ...userDoc.data() });
                    } else {
                        await signOut(auth);
                        setUser(null);
                        setAdminData(null);
                        setError('Access denied. Admin privileges required.');
                    }
                } catch (err) {
                    console.error('Auth state check error:', err);
                    await signOut(auth);
                    setUser(null);
                    setAdminData(null);
                }
            } else {
                setUser(null);
                setAdminData(null);
            }
            setLoading(false);
        });
        return unsub;
    }, []);

    // ── Sign in existing admin ────────────────────────────────
    const login = async (email, password) => {
        setError(null);
        setLoading(true);
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            let userDoc;
            try {
                userDoc = await getDoc(doc(db, 'users', cred.user.uid));
            } catch (firestoreErr) {
                console.error('Firestore read error:', firestoreErr);
                await signOut(auth);
                throw new Error('Unable to verify admin access. Check Firestore rules.');
            }
            if (!userDoc.exists()) {
                await signOut(auth);
                throw new Error('Admin profile not found. Please create your account first using the "Create Account" tab.');
            }
            if (userDoc.data().role !== 'admin') {
                await signOut(auth);
                throw new Error('Access denied. This account does not have admin privileges.');
            }
            setUser(cred.user);
            setAdminData({ id: userDoc.id, ...userDoc.data() });
        } catch (err) {
            let message = err.message;
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                message = 'Invalid email or password.';
            } else if (err.code === 'auth/too-many-requests') {
                message = 'Too many attempts. Please try again later.';
            } else if (err.code === 'auth/invalid-email') {
                message = 'Please enter a valid email address.';
            }
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // ── Create a new admin account ────────────────────────────
    const createAdmin = async (name, email, password) => {
        setError(null);
        setLoading(true);
        try {
            // 1. Create Firebase Auth user
            const cred = await createUserWithEmailAndPassword(auth, email, password);

            // 2. Create Firestore admin document
            await setDoc(doc(db, 'users', cred.user.uid), {
                uid: cred.user.uid,
                name: name,
                email: email,
                role: 'admin',
                status: 'active',
                fcmTokens: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            // 3. Set local state (auto-logged-in)
            setUser(cred.user);
            setAdminData({
                id: cred.user.uid,
                uid: cred.user.uid,
                name,
                email,
                role: 'admin',
                status: 'active',
            });
        } catch (err) {
            let message = err.message;
            if (err.code === 'auth/email-already-in-use') {
                message = 'This email is already registered. Please sign in instead.';
            } else if (err.code === 'auth/weak-password') {
                message = 'Password must be at least 6 characters.';
            } else if (err.code === 'auth/invalid-email') {
                message = 'Please enter a valid email address.';
            }
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        await signOut(auth);
        setUser(null);
        setAdminData(null);
    };

    return (
        <AuthContext.Provider value={{ user, adminData, loading, error, login, createAdmin, logout, setError }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
