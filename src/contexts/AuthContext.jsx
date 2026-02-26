import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [adminData, setAdminData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
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
            } else {
                setUser(null);
                setAdminData(null);
            }
            setLoading(false);
        });
        return unsub;
    }, []);

    const login = async (email, password) => {
        setError(null);
        setLoading(true);
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            let userDoc;
            try {
                userDoc = await getDoc(doc(db, 'users', cred.user.uid));
            } catch (firestoreErr) {
                // Firestore permission error or missing collection
                console.error('Firestore read error:', firestoreErr);
                await signOut(auth);
                throw new Error(
                    'Unable to verify admin access. Please make sure your admin user document exists in the Firestore "users" collection with role: "admin".'
                );
            }
            if (!userDoc.exists()) {
                await signOut(auth);
                throw new Error(
                    'Admin profile not found. Please create a user document in Firestore with your UID (' +
                    cred.user.uid +
                    ') and set role to "admin".'
                );
            }
            if (userDoc.data().role !== 'admin') {
                await signOut(auth);
                throw new Error('Access denied. This account does not have admin privileges.');
            }
            setUser(cred.user);
            setAdminData({ id: userDoc.id, ...userDoc.data() });
        } catch (err) {
            let message = err.message;
            // Map Firebase error codes to friendly messages
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                message = 'Invalid email or password.';
            } else if (err.code === 'auth/too-many-requests') {
                message = 'Too many login attempts. Please try again later.';
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
        <AuthContext.Provider value={{ user, adminData, loading, error, login, logout, setError }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
