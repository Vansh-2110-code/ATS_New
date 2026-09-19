import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuth, ROLE_DASHBOARD } from '../../context/AuthContext';
import api from '../../services/api';
import logoImg from '../../../assets/Logo.png';
import { FaceVerificationModal } from '../../components/attendance/FaceVerificationModal';
import * as faceapi from '@vladmandic/face-api';

export function LoginPage() {
  const [loginMode, setLoginMode] = useState<'employee' | 'walkin'>('employee');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isWFH, setIsWFH] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [tempAuthData, setTempAuthData] = useState<{ token: string; user: any } | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Background pre-load of face api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        if (!faceapi.nets.tinyFaceDetector.isLoaded) {
          const modelUrl = '/models';
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
            faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
            faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
          ]);
          console.log('Face biometrics models pre-loaded in the background successfully.');
        }
      } catch (err) {
        console.error('Failed to pre-load face biometrics models:', err);
      }
    };
    loadModels();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (loginMode === 'employee' && !employeeId.trim()) { setError('Employee ID is required'); return; }
    if (loginMode === 'walkin' && !employeeId.trim()) { setError('Email is required'); return; }
    if (!password.trim()) { setError('Password is required'); return; }

    setLoading(true);
    try {
      if (loginMode === 'employee') {
        const data = await api.login(employeeId.trim(), password, isWFH);
        const isFaceExempt = ['admin', 'superadmin', 'walkin', 'demo_walkin'].includes(data.user.role) || Boolean(data.user.disableBiometric);
        const needsFaceCheck = !isFaceExempt && ['recruiter', 'tl', 'manager'].includes(data.user.role);
        if (needsFaceCheck) {
          setTempAuthData(data);
          setShowFaceModal(true);
          setLoading(false);
          return;
        }
        api.setToken(data.token);
        if (data.user.role === 'walkin' || data.user.role === 'demo_walkin') {
          localStorage.setItem('walkin_token', data.token);
        }
        login(data.user);
        navigate(ROLE_DASHBOARD[data.user.role as keyof typeof ROLE_DASHBOARD]);
      } else {
        const data = await api.walkInLogin(employeeId.trim(), password);
        api.setToken(data.token);
        localStorage.setItem('walkin_token', data.token);
        // Normalize walkin data to match AuthUser interface
        const walkinUser = {
          id: data.walkin.id || data.walkin._id,
          name: data.walkin.name,
          email: data.walkin.email,
          role: 'walkin' as const,
          isWFH: false,
          avatar: '',
        };
        login(walkinUser);
        navigate(ROLE_DASHBOARD['walkin']);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-700 to-green-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-64 h-64 bg-green-400 rounded-full filter blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-green-600 rounded-full filter blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-xl shadow-sm flex items-center justify-center">
              <img src={logoImg} alt="White Horse Manpower" className="h-10 w-auto object-contain" />
            </div>
            <span className="text-white" style={{ fontWeight: 700, fontSize: '1.1rem' }}>White Horse Manpower ATS</span>
          </div>
          <div>
            <h2 className="text-white mb-4" style={{ fontWeight: 700, fontSize: '2rem' }}>
              Your recruitment<br />command center.
            </h2>
            <p className="text-green-200 leading-relaxed">
              Track every candidate, every call, every hire — all in one place. Built for teams that move fast.
            </p>
            <div className="mt-8 space-y-3">
              {['Candidate pipeline management', 'Real-time performance tracking', 'Automated call logging', 'Role-based access control'].map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-green-100 text-sm">{f}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-green-300 text-sm">© 2026 White Horse Manpower ATS. All rights reserved.</p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <div className="bg-white p-1 rounded-lg shadow-sm border border-slate-100 flex items-center justify-center">
              <img src={logoImg} alt="White Horse Manpower" className="h-8 w-auto object-contain" />
            </div>
            <span className="text-slate-800" style={{ fontWeight: 700 }}>White Horse Manpower ATS</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <div className="mb-6">
              <h1 className="text-slate-800 mb-1" style={{ fontWeight: 700, fontSize: '1.5rem' }}>Sign in</h1>
              <p className="text-slate-500 text-sm">Access your White Horse Manpower dashboard</p>
            </div>

            {/* Login Mode Toggle */}
            <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
              <button
                onClick={() => { setLoginMode('employee'); setError(''); }}
                className={`flex-1 py-2 text-sm rounded-lg transition-all ${loginMode === 'employee' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                style={{ fontWeight: loginMode === 'employee' ? 600 : 500 }}
              >
                Employee
              </button>
              <button
                onClick={() => { setLoginMode('walkin'); setError(''); }}
                className={`flex-1 py-2 text-sm rounded-lg transition-all ${loginMode === 'walkin' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                style={{ fontWeight: loginMode === 'walkin' ? 600 : 500 }}
              >
                Walk-In
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>
                  {loginMode === 'employee' ? 'Employee ID / Email' : 'Email Address'}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={loginMode === 'employee' ? 'text' : 'email'}
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value)}
                    placeholder={loginMode === 'employee' ? "e.g. REC001" : "e.g. candidate@email.com"}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400 focus:bg-green-50/30 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-700 mb-1.5" style={{ fontWeight: 500 }}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-400 focus:bg-green-50/30 transition-colors"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* WFH Toggle - Only for Employee */}
              {loginMode === 'employee' && (
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors select-none">
                  <div
                    onClick={() => setIsWFH(v => !v)}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${isWFH ? 'bg-green-500' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isWFH ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                  <div onClick={() => setIsWFH(v => !v)}>
                    <p className="text-sm text-slate-700" style={{ fontWeight: 500 }}>Working from Home today</p>
                    <p className="text-xs text-slate-400">Attendance will be marked as WFH</p>
                  </div>
                </label>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-70"
                style={{ fontWeight: 600 }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Dev Mode Shortcuts (Only visible on localhost) */}
            {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-3 text-center font-semibold">
                  DEVELOPER SHORTCUTS (Localhost Only)
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    { label: 'Admin', id: 'WH000001', pw: 'Password2026!' },
                    { label: 'TL', id: 'WH000003', pw: 'Password2026!' },
                    { label: 'Recruiter', id: 'WH000002', pw: 'Password2026!' }
                  ].map((dev, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setLoginMode('employee');
                        setEmployeeId(dev.id);
                        setPassword(dev.pw);
                      }}
                      className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md font-medium"
                    >
                      {dev.label} ({dev.id})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="text-center mt-6 text-sm text-slate-500">
            Looking for jobs?{' '}
            <Link to="/apply" className="text-green-600 hover:text-green-700" style={{ fontWeight: 500 }}>
              Apply here
            </Link>
          </p>
        </div>
      </div>
      {showFaceModal && tempAuthData && (
        <FaceVerificationModal
          isOpen={showFaceModal}
          disableBiometric={tempAuthData.user.disableBiometric}
          onClose={() => {
            setShowFaceModal(false);
            setTempAuthData(null);
          }}
          onSuccess={async (descriptor, photo) => {
            setShowFaceModal(false);
            const { token, user } = tempAuthData;
            
            api.setToken(token);
            
            let updatedUser = { ...user };
            
            // Register face descriptor if not registered yet
            if (descriptor && descriptor.length > 0 && (!user.faceDescriptor || user.faceDescriptor.length === 0)) {
              try {
                await api.registerFace(descriptor);
                updatedUser.faceDescriptor = descriptor;
              } catch (err) {
                console.error('Failed to register face:', err);
              }
            }
            
            // Mark attendance
            try {
              await api.markAttendance(isWFH);
              const todayKey = (uid: string) => `attendance_marked_${uid}_${new Date().toISOString().split('T')[0]}`;
              const timeLabel = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
              localStorage.setItem(todayKey(user.id), timeLabel);
            } catch (err) {
              console.error('Failed to mark attendance:', err);
            }

            login(updatedUser);
            navigate(ROLE_DASHBOARD[user.role as keyof typeof ROLE_DASHBOARD]);
            setTempAuthData(null);
          }}
          actionType="checkin"
          preventCancel={false}
          registeredDescriptor={tempAuthData.user.faceDescriptor}
        />
      )}
    </div>
  );
}
