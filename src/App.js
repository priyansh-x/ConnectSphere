import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Search, QrCode, User, Briefcase, Sparkles, X, LogOut, CheckCircle } from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDdfKDOOk_J-i5bY-YS51FGtIfIz7epEsM",
  authDomain: "connectsphere-d20d6.firebaseapp.com",
  projectId: "connectsphere-d20d6",
  storageBucket: "connectsphere-d20d6.firebasestorage.app",
  messagingSenderId: "552425659975",
  appId: "1:552425659975:web:340bf11b02dd68440e5b62",
  measurementId: "G-6KDN0NR47C"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const appId = 'connect-sphere-app';
const eventId = 'mixer-2025'; // A unique ID for your event

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('loading'); // loading, setup, dashboard

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const profileRef = doc(db, 'artifacts', appId, 'public', 'data', 'events', eventId, 'attendees', currentUser.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setUserProfile(profileSnap.data());
          setView('dashboard');
        } else {
          setView('setup');
        }
      } else {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Firebase Auth Error: ", error);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleProfileCreated = (profile) => {
    setUserProfile(profile);
    setView('dashboard');
  };
  
  const handleSignOut = async () => {
    if (user) {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'events', eventId, 'attendees', user.uid);
      await setDoc(userRef, { status: 'inactive' }, { merge: true });
      // Note: Firebase anonymous auth is persistent. For a full sign-out, you'd re-auth.
      // For this app, we just set status to inactive.
      setUserProfile(prev => ({...prev, status: 'inactive'}));
    }
  };

  if (loading || view === 'loading') {
    return <LoadingScreen />;
  }

  if (view === 'setup') {
    return <ProfileSetupScreen user={user} onProfileCreated={handleProfileCreated} />;
  }

  if (view === 'dashboard' && userProfile) {
    return <EventDashboard user={user} userProfile={userProfile} onSignOut={handleSignOut} />;
  }
  
  return <LoadingScreen />; // Fallback
}

// --- Screens & Components ---

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-cyan-400">ConnectSphere</h1>
        <p className="mt-2 text-gray-400">Loading your event experience...</p>
      </div>
    </div>
  );
}

function ProfileSetupScreen({ user, onProfileCreated }) {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [interests, setInterests] = useState('');
  const [bio, setBio] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const interestsArray = interests.split(',').map(item => item.trim()).filter(Boolean);
    const profileData = {
      userId: user.uid,
      name,
      industry,
      interests: interestsArray,
      bio,
      status: 'active', // Check-in user automatically
      createdAt: new Date(),
    };

    try {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'events', eventId, 'attendees', user.uid);
      await setDoc(userRef, profileData);
      onProfileCreated(profileData);
    } catch (error) {
      console.error("Error creating profile: ", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-2xl p-8 shadow-2xl shadow-cyan-500/10">
        <h2 className="text-3xl font-bold text-center text-cyan-400 mb-2">Create Your Profile</h2>
        <p className="text-center text-gray-400 mb-6">Let others know who you are.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Industry / Field</label>
            <input type="text" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g., Software Engineering" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Interests (comma-separated)</label>
            <input type="text" value={interests} onChange={e => setInterests(e.target.value)} placeholder="e.g., AI, Hiking, Startups" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Bio / Looking for...</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows="3" placeholder="A brief intro or what you're hoping to find." className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500"></textarea>
          </div>
          <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 rounded-lg transition-colors duration-300">
            Check-in & Join Event
          </button>
        </form>
      </div>
    </div>
  );
}

function EventDashboard({ user, userProfile, onSignOut }) {
  const [attendees, setAttendees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('directory'); // directory, my_profile
  const [selectedAttendee, setSelectedAttendee] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'events', eventId, 'attendees'), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const attendeesData = [];
      querySnapshot.forEach((doc) => {
        attendeesData.push(doc.data());
      });
      setAttendees(attendeesData);
    }, (error) => {
        console.error("Firestore Snapshot Error: ", error);
    });
    return () => unsubscribe();
  }, []);
  
  const filteredAttendees = useMemo(() => {
    if (!searchTerm) {
      return attendees.filter(a => a.userId !== user.uid);
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return attendees.filter(attendee => {
      if (attendee.userId === user.uid) return false;
      const inName = attendee.name.toLowerCase().includes(lowercasedTerm);
      const inIndustry = attendee.industry.toLowerCase().includes(lowercasedTerm);
      const inInterests = attendee.interests.some(interest => interest.toLowerCase().includes(lowercasedTerm));
      const inBio = attendee.bio.toLowerCase().includes(lowercasedTerm);
      return inName || inIndustry || inInterests || inBio;
    });
  }, [attendees, searchTerm, user.uid]);

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <div className="container mx-auto p-4 max-w-4xl">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-cyan-400">ConnectSphere</h1>
          <button onClick={onSignOut} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-300">
            <LogOut size={18} />
            <span>Check-out</span>
          </button>
        </header>
        
        {userProfile.status === 'inactive' && (
             <div className="bg-yellow-900/50 border border-yellow-600 text-yellow-300 px-4 py-3 rounded-lg mb-4 text-center">
                You are currently checked-out. Others cannot see you in the directory.
                <button 
                  onClick={async () => {
                     const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'events', eventId, 'attendees', user.uid);
                     await setDoc(userRef, { status: 'active' }, { merge: true });
                     window.location.reload(); // Quick way to refresh state
                  }}
                  className="ml-4 font-bold underline hover:text-yellow-200"
                >
                  Re-Check-in
                </button>
            </div>
        )}

        <div className="flex border-b border-gray-700 mb-4">
          <button onClick={() => setActiveTab('directory')} className={`py-2 px-4 font-semibold ${activeTab === 'directory' ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-gray-400'}`}>Directory</button>
          <button onClick={() => setActiveTab('my_profile')} className={`py-2 px-4 font-semibold ${activeTab === 'my_profile' ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-gray-400'}`}>My Profile & QR</button>
        </div>

        {activeTab === 'directory' && (
          <div>
            <div className="relative mb-6">
              <input 
                type="text" 
                placeholder="Search by name, industry, interest..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 focus:ring-cyan-500 focus:border-cyan-500"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAttendees.map(attendee => (
                <AttendeeCard key={attendee.userId} attendee={attendee} onClick={() => setSelectedAttendee(attendee)}/>
              ))}
            </div>
             {filteredAttendees.length === 0 && searchTerm && (
                <div className="text-center py-10 text-gray-500">
                    <p>No attendees match your search.</p>
                </div>
            )}
            {filteredAttendees.length === 0 && !searchTerm && (
                <div className="text-center py-10 text-gray-500">
                    <p>Welcome! Other attendees will appear here as they check-in.</p>
                </div>
            )}
          </div>
        )}

        {activeTab === 'my_profile' && (
          <MyProfileView userProfile={userProfile} />
        )}
      </div>
      
      {selectedAttendee && (
        <ProfileModal attendee={selectedAttendee} onClose={() => setSelectedAttendee(null)} />
      )}
    </div>
  );
}

function AttendeeCard({ attendee, onClick }) {
    const avatarUrl = `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${attendee.userId}`;
  return (
    <div onClick={onClick} className="bg-gray-800 rounded-xl p-4 cursor-pointer hover:bg-gray-700 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center gap-4">
        <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full bg-gray-700 border-2 border-cyan-500" />
        <div>
          <h3 className="font-bold text-lg text-white">{attendee.name}</h3>
          <p className="text-sm text-gray-400 flex items-center gap-1.5">
            <Briefcase size={14} /> {attendee.industry || 'Industry not specified'}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-gray-300 text-sm line-clamp-2">{attendee.bio}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {attendee.interests.slice(0, 3).map(interest => (
          <span key={interest} className="bg-gray-700 text-cyan-300 text-xs font-semibold px-2 py-1 rounded-full">{interest}</span>
        ))}
      </div>
    </div>
  );
}

function MyProfileView({ userProfile }) {
  const qrCodeData = `${window.location.origin}?user=${userProfile.userId}`;
  const qrCodeCanvasRef = useRef(null);
  
  // Basic QR Code generation logic
  useEffect(() => {
    // This is a simplified QR generator. A library would be more robust.
    const canvas = qrCodeCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "black";
      // This is a visual representation, not a real QR code.
      // A library like 'qrcode' would be needed for a functional one.
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Scan to connect!", size / 2, size / 2 - 10);
      ctx.font = "10px sans-serif";
      ctx.fillText(qrCodeData, size / 2, size / 2 + 10);
      
      // Pseudo-random dots to simulate a QR code
      for (let i = 0; i < 1500; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const s = Math.random() * 3 + 1;
        if (Math.random() > 0.3) {
             ctx.fillRect(x, y, s, s);
        }
      }
    }
  }, [qrCodeData]);

  return (
    <div className="bg-gray-800 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8">
      <div className="text-center md:text-left">
        <h2 className="text-3xl font-bold">{userProfile.name}</h2>
        <p className="text-cyan-400 mt-1 flex items-center gap-2 justify-center md:justify-start">
          <Briefcase size={16} /> {userProfile.industry}
        </p>
        <p className="text-gray-300 mt-4 max-w-lg">{userProfile.bio}</p>
        <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
          <span className="text-gray-400 font-semibold mr-2">Interests:</span>
          {userProfile.interests.map(interest => (
            <span key={interest} className="bg-gray-700 text-cyan-300 text-xs font-semibold px-2.5 py-1.5 rounded-full">{interest}</span>
          ))}
        </div>
      </div>
      <div className="flex-shrink-0 text-center">
        <p className="font-semibold mb-2">Your Connect QR Code</p>
         <div className="bg-white p-2 rounded-lg inline-block">
            <canvas ref={qrCodeCanvasRef}></canvas>
        </div>
        <p className="text-xs text-gray-500 mt-2">Have others scan this to see your profile.</p>
      </div>
    </div>
  );
}

function ProfileModal({ attendee, onClose }) {
  const avatarUrl = `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${attendee.userId}`;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 transition-opacity" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl shadow-2xl shadow-cyan-500/20 w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
          <X size={24} />
        </button>
        <div className="p-8">
          <div className="text-center mb-6">
            <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full mx-auto mb-4 bg-gray-700 border-4 border-cyan-500" />
            <h2 className="text-3xl font-bold">{attendee.name}</h2>
            <p className="text-cyan-400 mt-1 flex items-center justify-center gap-2">
              <Briefcase size={16} /> {attendee.industry}
            </p>
          </div>
          <div>
            <h4 className="font-bold text-gray-300 text-lg mb-2">Bio</h4>
            <p className="text-gray-400 bg-gray-900/50 p-3 rounded-lg">{attendee.bio || 'No bio provided.'}</p>
          </div>
          <div className="mt-6">
            <h4 className="font-bold text-gray-300 text-lg mb-2">Interests</h4>
            <div className="flex flex-wrap gap-2">
              {attendee.interests.map(interest => (
                <span key={interest} className="bg-gray-700 text-cyan-300 text-sm font-semibold px-3 py-1.5 rounded-full">{interest}</span>
              ))}
              {attendee.interests.length === 0 && <p className="text-gray-500 text-sm">No interests listed.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
