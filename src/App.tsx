import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  RefreshCw, 
  Copy, 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Download, 
  Upload, 
  Search, 
  LogOut, 
  LogIn,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  Plus,
  Zap,
  Activity,
  Languages,
  Smartphone,
  Apple
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  OAuthProvider,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged, 
  signOut,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { PasswordEntry, GlobalMetrics } from './types';

// --- Constants ---
const AMBIGUOUS_CHARS = "O0lI1|`'\".,:;";
const CHAR_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?"
};

// --- Utils ---
const calculateEntropy = (password: string, poolSize: number) => {
  if (!password) return 0;
  return Math.round(password.length * Math.log2(poolSize) * 100) / 100;
};

const evaluateStrength = (password: string): { score: number; label: string; color: string } => {
  if (!password) return { score: 0, label: 'None', color: 'text-slate-500' };
  
  let score = 0;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 16) score++;

  // Normalize to 0-5
  const finalScore = Math.min(5, score);
  
  const levels = [
    { label: 'Muy débil', color: 'text-red-500' },
    { label: 'Débil', color: 'text-orange-500' },
    { label: 'Aceptable', color: 'text-yellow-500' },
    { label: 'Buena', color: 'text-green-500' },
    { label: 'Excelente', color: 'text-cyber-accent' },
    { label: 'Excelente', color: 'text-cyber-accent' }
  ];

  return { score: finalScore, ...levels[finalScore] };
};

// --- Components ---

const Toast = ({ message, type = 'success', onClose }: { message: string; type?: 'success' | 'error'; onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    className={`fixed bottom-8 right-8 px-6 py-3 rounded-xl glass-card flex items-center gap-3 z-50 ${type === 'error' ? 'border-cyber-danger/50' : 'border-cyber-accent/50'}`}
  >
    {type === 'success' ? <CheckCircle2 className="text-cyber-success w-5 h-5" /> : <AlertTriangle className="text-cyber-danger w-5 h-5" />}
    <span className="text-sm font-medium">{message}</span>
  </motion.div>
);// --- Translations ---
const translations = {
  es: {
    appName: "GenPass",
    appStudio: "Studio",
    tagline: "Suite de Gestión de Contraseñas de Ciberseguridad",
    welcomeBack: "Bienvenido de nuevo",
    createAccount: "Crea tu cuenta de seguridad",
    firstName: "Nombre",
    lastName: "Apellidos",
    email: "Email",
    password: "Contraseña",
    confirmPassword: "Verificar Contraseña",
    login: "Iniciar Sesión",
    signup: "Crear Cuenta",
    orContinueWith: "O continúa con",
    noAccount: "¿No tienes cuenta?",
    hasAccount: "¿Ya tienes cuenta?",
    register: "Regístrate",
    total: "Total",
    avgEntropy: "Entropía Media",
    strong: "Fuertes",
    connect: "Conectar",
    generator: "Generador",
    length: "Longitud",
    uppercase: "Mayúsculas",
    lowercase: "Minúsculas",
    numbers: "Números",
    symbols: "Símbolos",
    excludeAmbiguous: "Excluir Ambiguos",
    generatedPassword: "Contraseña generada",
    strength: "Fortaleza",
    entropy: "Entropía",
    label: "Etiqueta",
    labelPlaceholder: "Ej. Gmail, Banco...",
    generate: "Generar",
    save: "Guardar",
    verifier: "Verificador",
    verifierPlaceholder: "Introduce contraseña para analizar",
    analysis: "Análisis",
    lengthRec: "Longitud recomendada (12+)",
    suggestImprovement: "Sugerir Mejora",
    verifierEmpty: "Introduce una contraseña para ver el análisis de seguridad en tiempo real.",
    history: "Historial",
    searchPlaceholder: "Buscar por etiqueta o contraseña...",
    noHistory: "No hay registros guardados.",
    clientSide: "Lógica 100% en el Cliente",
    cloudSync: "Sincronización en la Nube Activada",
    veryWeak: "Muy débil",
    weak: "Débil",
    acceptable: "Aceptable",
    good: "Buena",
    excellent: "Excelente",
    copied: "Copiado al portapapeles",
    saved: "Contraseña guardada",
    deleted: "Entrada eliminada",
    imported: "Historial importado",
    importError: "Error al importar archivo",
    loginSuccess: "Sesión iniciada correctamente",
    logoutSuccess: "Sesión cerrada",
    passwordsMismatch: "Las contraseñas no coinciden",
    phoneLogin: "Teléfono",
    appleLogin: "Apple",
    enterPhone: "Introduce tu teléfono",
    sendCode: "Enviar Código",
    enterCode: "Introduce el código",
    verifyCode: "Verificar Código",
    invalidPhone: "Número de teléfono inválido",
    invalidCode: "Código inválido"
  },
  en: {
    appName: "GenPass",
    appStudio: "Studio",
    tagline: "Cybersecurity Password Management Suite",
    welcomeBack: "Welcome back",
    createAccount: "Create your security account",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    password: "Password",
    confirmPassword: "Verify Password",
    login: "Login",
    signup: "Sign Up",
    orContinueWith: "Or continue with",
    noAccount: "Don't have an account?",
    hasAccount: "Already have an account?",
    register: "Register",
    total: "Total",
    avgEntropy: "Avg Entropy",
    strong: "Strong",
    connect: "Connect",
    generator: "Generator",
    length: "Length",
    uppercase: "Uppercase",
    lowercase: "Lowercase",
    numbers: "Numbers",
    symbols: "Symbols",
    excludeAmbiguous: "Exclude Ambiguous",
    generatedPassword: "Generated password",
    strength: "Strength",
    entropy: "Entropy",
    label: "Label",
    labelPlaceholder: "e.g. Gmail, Bank...",
    generate: "Generate",
    save: "Save",
    verifier: "Verifier",
    verifierPlaceholder: "Enter password to analyze",
    analysis: "Analysis",
    lengthRec: "Recommended length (12+)",
    suggestImprovement: "Suggest Improvement",
    verifierEmpty: "Enter a password to see real-time security analysis.",
    history: "History",
    searchPlaceholder: "Search by label or password...",
    noHistory: "No saved records.",
    clientSide: "100% Client-Side Logic",
    cloudSync: "Cloud Sync Enabled",
    veryWeak: "Very weak",
    weak: "Weak",
    acceptable: "Acceptable",
    good: "Good",
    excellent: "Excellent",
    copied: "Copied to clipboard",
    saved: "Password saved",
    deleted: "Entry deleted",
    imported: "History imported",
    importError: "Error importing file",
    loginSuccess: "Login successful",
    logoutSuccess: "Logged out",
    passwordsMismatch: "Passwords do not match",
    phoneLogin: "Phone",
    appleLogin: "Apple",
    enterPhone: "Enter your phone",
    sendCode: "Send Code",
    enterCode: "Enter the code",
    verifyCode: "Verify Code",
    invalidPhone: "Invalid phone number",
    invalidCode: "Invalid code"
  }
};

const Rotating3DObject = ({ onClick, children, title }: { onClick: () => void; children: React.ReactNode; title: string }) => {
  return (
    <motion.button
      onClick={onClick}
      title={title}
      className="relative w-48 h-48 flex items-center justify-center group"
      style={{ perspective: '1200px' }}
      whileHover={{ scale: 1.15, z: 100 }}
      whileTap={{ scale: 0.9 }}
    >
      <motion.div
        className="relative w-full h-full flex items-center justify-center"
        animate={{
          rotateY: [0, 360],
          y: [0, -10, 0]
        }}
        transition={{
          rotateY: { duration: 15, repeat: Infinity, ease: "linear" },
          y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front side */}
        <div className="absolute inset-0 flex items-center justify-center [backface-visibility:hidden]">
          {children}
        </div>
        
        {/* Back side */}
        <div 
          className="absolute inset-0 flex items-center justify-center [backface-visibility:hidden]"
          style={{ transform: 'rotateY(180deg)' }}
        >
          {children}
        </div>

        {/* Dynamic glow behind the object */}
        <div className="absolute inset-12 bg-white/10 blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity rounded-full" />
      </motion.div>
      
      {/* Floor reflection shadow */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/40 blur-xl rounded-full scale-x-150 opacity-50 group-hover:opacity-80 transition-opacity" />
    </motion.button>
  );
};

const AuthScreen = ({ onLogin, onGoogleLogin, onShowSplash, lang, t }: { onLogin: () => void, onGoogleLogin: () => void, onShowSplash: () => void, lang: string, t: any }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [authMode, setAuthMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setupRecaptcha = () => {
    try {
      const container = document.getElementById('recaptcha-container');
      if (!container) return;
      
      if (!(window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved
          },
          'expired-callback': () => {
            if ((window as any).recaptchaVerifier) {
              (window as any).recaptchaVerifier.clear();
              (window as any).recaptchaVerifier = null;
            }
          }
        });
      }
    } catch (err) {
      console.error('Recaptcha setup error:', err);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Basic phone validation
    if (!phoneNumber.startsWith('+')) {
      setError('El número debe incluir el prefijo (ej: +34)');
      return;
    }

    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      if (!appVerifier) throw new Error('Error al inicializar reCAPTCHA');
      
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setVerificationId(confirmationResult);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('El inicio con teléfono no está activado en la consola de Firebase.');
      } else if (err.code === 'auth/invalid-phone-number') {
        setError('Formato de teléfono inválido. Usa: +34600000000');
      } else {
        setError(err.message || t.invalidPhone);
      }
      
      // Reset recaptcha on error
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!verificationId) throw new Error('No hay sesión de verificación activa');
      await verificationId.confirm(verificationCode);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-verification-code') {
        setError('Código incorrecto. Inténtalo de nuevo.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Credencial inválida o código expirado.');
      } else {
        setError(err.message || t.invalidCode);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (password !== confirmPassword) {
          throw new Error(t.passwordsMismatch);
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: `${firstName} ${lastName}`.trim()
        });
      }
      onShowSplash();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#050505] relative overflow-hidden">
      <div id="recaptcha-container"></div>
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-accent/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-accent/5 blur-[120px] rounded-full" />

      <div className="flex flex-col lg:flex-row items-center gap-12 relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md glass-card p-8"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 bg-cyber-accent/10 rounded-2xl mb-4">
              <Shield className="text-cyber-accent w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-white">{t.appName} <span className="text-cyber-accent">{t.appStudio}</span></h1>
            <p className="text-slate-400 text-sm mt-2">{isLogin ? t.welcomeBack : t.createAccount}</p>
          </div>

          {authMode === 'email' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold ml-1">{t.firstName}</label>
                    <input 
                      type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                      className="w-full cyber-input text-sm" placeholder="Juan"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold ml-1">{t.lastName}</label>
                    <input 
                      type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)}
                      className="w-full cyber-input text-sm" placeholder="Pérez"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold ml-1">{t.email}</label>
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full cyber-input text-sm" placeholder="tu@email.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold ml-1">{t.password}</label>
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full cyber-input text-sm" placeholder="••••••••"
                />
              </div>

              {!isLogin && (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold ml-1">{t.confirmPassword}</label>
                  <input 
                    type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full cyber-input text-sm" placeholder="••••••••"
                  />
                </div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="p-3 rounded-lg bg-cyber-danger/10 border border-cyber-danger/20 flex items-center gap-2 text-cyber-danger text-xs"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </motion.div>
              )}

              <button 
                type="submit" disabled={loading}
                className="w-full cyber-button cyber-button-primary mt-4 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (isLogin ? t.login : t.signup)}
              </button>
            </form>
          ) : (
            <form onSubmit={verificationId ? handleVerifyCode : handleSendCode} className="space-y-4">
              {!verificationId ? (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold ml-1">{t.enterPhone}</label>
                  <input 
                    type="tel" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full cyber-input text-sm" placeholder="+34600000000"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold ml-1">{t.enterCode}</label>
                  <input 
                    type="text" required value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full cyber-input text-sm" placeholder="123456"
                  />
                </div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="p-3 rounded-lg bg-cyber-danger/10 border border-cyber-danger/20 flex items-center gap-2 text-cyber-danger text-xs"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </motion.div>
              )}

              <button 
                type="submit" disabled={loading}
                className="w-full cyber-button cyber-button-primary mt-4 flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (verificationId ? t.verifyCode : t.sendCode)}
              </button>
              
              <button 
                type="button" onClick={() => { setAuthMode('email'); setVerificationId(null); }}
                className="w-full text-xs text-slate-500 hover:text-cyber-accent transition-colors"
              >
                {t.login} / {t.signup}
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-xs text-slate-500">
            {isLogin ? t.noAccount : t.hasAccount} {' '}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-cyber-accent hover:underline font-bold"
            >
              {isLogin ? t.register : t.login}
            </button>
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col gap-8"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{t.orContinueWith}</span>
            <div className="h-px w-12 bg-white/10" />
          </div>

          <div className="grid grid-cols-1 gap-12">
            <Rotating3DObject 
              onClick={onGoogleLogin}
              title="Google"
            >
              <div className="relative w-32 h-32 flex items-center justify-center">
                <img 
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                  className="w-24 h-24 object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.8)] brightness-110 contrast-125" 
                  alt="Google" 
                  referrerPolicy="no-referrer"
                />
                {/* Crystal/Glass overlay for Google logo */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-white/10 rounded-full backdrop-blur-[2px] border border-white/20 shadow-inner" />
                <div className="absolute top-2 left-4 w-8 h-4 bg-white/20 rounded-full blur-sm rotate-[-45deg]" />
              </div>
            </Rotating3DObject>


          </div>
        </motion.div>
      </div>
    </div>
  );
};


// --- Splash Screen ---
const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="w-96 h-96 rounded-full bg-cyber-accent/10 blur-[120px]"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
      <motion.div
        className="relative flex flex-col items-center gap-6"
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: [0.3, 1.15, 1], opacity: 1 }}
        transition={{ duration: 0.8, times: [0, 0.7, 1], ease: 'easeOut' }}
      >
        <motion.div
          animate={{ filter: ['drop-shadow(0 0 0px #00ffff)', 'drop-shadow(0 0 40px #00ffff)', 'drop-shadow(0 0 20px #00ffff)'] }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        >
          <motion.img
            src="/MurcielagoEscudo.png"
            alt="GenPass Studio"
            className="w-48 h-48 object-contain"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 0.8, delay: 0.5, ease: 'easeInOut' }}
          />
        </motion.div>
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-white tracking-tight">
            GenPass <span className="text-cyber-accent">Studio</span>
          </h1>
          <motion.div
            className="h-px bg-cyber-accent/50 mt-2"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ delay: 0.8, duration: 0.5 }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default function App() {
  const [lang, setLang] = useState('es');
  const t = translations[lang as keyof typeof translations];

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(false);
  const prevUserRef = React.useRef<User | null>(null);
  const [history, setHistory] = useState<PasswordEntry[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const evaluateStrength = (password: string): { score: number; label: string; color: string } => {
    if (!password) return { score: 0, label: 'None', color: 'text-slate-500' };
    
    let score = 0;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (password.length >= 16) score++;

    const finalScore = Math.min(5, score);
    
    const levels = [
      { label: t.veryWeak, color: 'text-red-500' },
      { label: t.weak, color: 'text-orange-500' },
      { label: t.acceptable, color: 'text-yellow-500' },
      { label: t.good, color: 'text-green-500' },
      { label: t.excellent, color: 'text-cyber-accent' },
      { label: t.excellent, color: 'text-cyber-accent' }
    ];

    return { score: finalScore, ...levels[finalScore] };
  };

  // Generator State
  const [genLength, setGenLength] = useState(16);
  const [genOptions, setGenOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: false
  });
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [genLabel, setGenLabel] = useState('');

  // Verifier State
  const [verifyInput, setVerifyInput] = useState('');
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);

  // History State
  const [searchTerm, setSearchTerm] = useState('');

  // --- Auth ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowSplash(true);
    } catch (error) {
      console.error(error);
      showToast('Error', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast(t.logoutSuccess);
    } catch (error) {
      console.error(error);
    }
  };

  // --- Firestore Sync ---
  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const q = query(
      collection(db, `users/${user.uid}/passwords`),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PasswordEntry[];
      setHistory(entries);
    });

    return unsubscribe;
  }, [user]);

  // --- Logic ---
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const generatePassword = () => {
    let pool = "";
    const selectedSets = Object.entries(genOptions)
      .filter(([key, val]) => val && key !== 'excludeAmbiguous')
      .map(([key]) => CHAR_SETS[key as keyof typeof CHAR_SETS]);

    if (selectedSets.length === 0) {
      showToast('Error', 'error');
      return;
    }

    selectedSets.forEach(set => {
      let filteredSet = set;
      if (genOptions.excludeAmbiguous) {
        filteredSet = set.split('').filter(c => !AMBIGUOUS_CHARS.includes(c)).join('');
      }
      pool += filteredSet;
    });

    let password = "";
    // Ensure at least one of each selected type
    selectedSets.forEach(set => {
      let filteredSet = set;
      if (genOptions.excludeAmbiguous) {
        filteredSet = set.split('').filter(c => !AMBIGUOUS_CHARS.includes(c)).join('');
      }
      password += filteredSet[Math.floor(Math.random() * filteredSet.length)];
    });

    // Fill the rest
    for (let i = password.length; i < genLength; i++) {
      password += pool[Math.floor(Math.random() * pool.length)];
    }

    // Shuffle
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    setGeneratedPassword(password);
  };

  const savePassword = async (pwd: string, label: string) => {
    if (!user) {
      showToast('Inicia sesión para guardar en la nube', 'error');
      return;
    }

    const { score } = evaluateStrength(pwd);
    // Rough pool size estimate for entropy
    let poolSize = 0;
    if (/[A-Z]/.test(pwd)) poolSize += 26;
    if (/[a-z]/.test(pwd)) poolSize += 26;
    if (/[0-9]/.test(pwd)) poolSize += 10;
    if (/[^A-Za-z0-9]/.test(pwd)) poolSize += 32;

    try {
      await addDoc(collection(db, `users/${user.uid}/passwords`), {
        uid: user.uid,
        password: pwd,
        label: label || t.labelPlaceholder,
        entropy: calculateEntropy(pwd, poolSize),
        score,
        timestamp: serverTimestamp()
      });
      showToast(t.saved);
      setGenLabel('');
    } catch (error) {
      console.error(error);
      showToast('Error', 'error');
    }
  };

  const deleteEntry = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/passwords`, id));
      showToast(t.deleted);
    } catch (error) {
      console.error(error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(t.copied);
  };

  const exportHistory = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GenPass-history-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importHistory = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (!Array.isArray(imported)) throw new Error('Formato inválido');
        
        const batch = writeBatch(db);
        imported.forEach(entry => {
          const newDocRef = doc(collection(db, `users/${user.uid}/passwords`));
          batch.set(newDocRef, {
            ...entry,
            uid: user.uid,
            timestamp: serverTimestamp()
          });
        });
        await batch.commit();
        showToast(t.imported);
      } catch (err) {
        showToast(t.importError, 'error');
      }
    };
    reader.readAsText(file);
  };

  const metrics = useMemo<GlobalMetrics>(() => {
    if (history.length === 0) return { totalGenerated: 0, avgEntropy: 0, strongPercentage: 0 };
    const total = history.length;
    const avgEntropy = history.reduce((acc, curr) => acc + curr.entropy, 0) / total;
    const strongCount = history.filter(h => h.score >= 4).length;
    return {
      totalGenerated: total,
      avgEntropy: Math.round(avgEntropy * 100) / 100,
      strongPercentage: Math.round((strongCount / total) * 100)
    };
  }, [history]);

  const filteredHistory = history.filter(h => 
    h.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    h.password.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="text-cyber-accent w-12 h-12" />
        </motion.div>
      </div>
    );
  }

  if (showSplash) {
    return (
      <AnimatePresence onExitComplete={() => setShowSplash(false)}>
        <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />
      </AnimatePresence>
    );
  }

  if (!user) {
    return (
      <>
        <div className="fixed top-4 right-4 z-50">
          <button 
            onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
            className="p-2 glass-card flex items-center gap-2 text-xs font-bold text-cyber-accent hover:bg-white/10"
          >
            <Languages className="w-4 h-4" />
            {lang === 'es' ? 'English' : 'Español'}
          </button>
        </div>
        <AuthScreen onLogin={() => {}} onGoogleLogin={handleLogin} onShowSplash={() => setShowSplash(true)} lang={lang} t={t} />
        <AnimatePresence>
          {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyber-accent/10 rounded-lg">
              <Shield className="text-cyber-accent w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {t.appName} <span className="text-cyber-accent">{t.appStudio}</span>
            </h1>
          </div>
          <p className="text-slate-400">{t.tagline}</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
            className="glass-card px-4 py-2 flex items-center gap-2 text-xs font-bold text-cyber-accent hover:bg-white/5"
          >
            <Languages className="w-4 h-4" />
            {lang === 'es' ? 'EN' : 'ES'}
          </button>

          <div className="glass-card px-4 py-2 flex items-center gap-3">
            <Activity className="text-cyber-accent w-4 h-4" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{t.total}</p>
              <p className="text-lg font-mono leading-none">{metrics.totalGenerated}</p>
            </div>
          </div>
          <div className="glass-card px-4 py-2 flex items-center gap-3">
            <Zap className="text-cyber-accent w-4 h-4" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{t.avgEntropy}</p>
              <p className="text-lg font-mono leading-none">{metrics.avgEntropy}</p>
            </div>
          </div>
          <div className="glass-card px-4 py-2 flex items-center gap-3">
            <Shield className="text-cyber-accent w-4 h-4" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{t.strong}</p>
              <p className="text-lg font-mono leading-none">{metrics.strongPercentage}%</p>
            </div>
          </div>
          
          {user ? (
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-white">{user.displayName}</p>
                <p className="text-[10px] text-slate-500">{user.email}</p>
              </div>
              <button onClick={handleLogout} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-cyber-danger">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="cyber-button cyber-button-primary flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {t.connect}
            </button>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 1. Generator */}
        <section className="glass-card p-6 flex flex-col gap-6">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="text-cyber-accent w-5 h-5" />
            <h2 className="text-xl font-bold">{t.generator}</h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{t.length}: {genLength}</label>
              </div>
              <input 
                type="range" min="6" max="64" value={genLength} 
                onChange={(e) => setGenLength(parseInt(e.target.value))}
                className="w-full accent-cyber-accent h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {Object.entries(genOptions).map(([key, value]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${value ? 'bg-cyber-accent border-cyber-accent' : 'border-white/20 group-hover:border-white/40'}`}>
                    {value && <CheckCircle2 className="w-3 h-3 text-black" />}
                  </div>
                  <input 
                    type="checkbox" className="hidden" 
                    checked={value} 
                    onChange={() => setGenOptions(prev => ({ ...prev, [key]: !value }))} 
                  />
                  <span className="text-xs text-slate-400 group-hover:text-slate-200 capitalize">
                    {key === 'excludeAmbiguous' ? t.excludeAmbiguous : t[key as keyof typeof t]}
                  </span>
                </label>
              ))}
            </div>

            <div className="pt-4 border-t border-white/5">
              <div className="relative group">
                <input 
                  type="text" 
                  readOnly 
                  value={generatedPassword} 
                  placeholder={t.generatedPassword}
                  className="w-full cyber-input pr-12 font-mono text-lg tracking-wider"
                />
                <button 
                  onClick={() => copyToClipboard(generatedPassword)}
                  disabled={!generatedPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-cyber-accent disabled:opacity-0 transition-all"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              
              {generatedPassword && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full bg-current ${evaluateStrength(generatedPassword).color}`} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${evaluateStrength(generatedPassword).color}`}>
                      {evaluateStrength(generatedPassword).label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {t.entropy}: {calculateEntropy(generatedPassword, 64)} bits
                  </span>
                </motion.div>
              )}
            </div>

            <div className="space-y-3">
              <input 
                type="text" 
                placeholder={t.labelPlaceholder}
                value={genLabel}
                onChange={(e) => setGenLabel(e.target.value)}
                className="w-full cyber-input text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={generatePassword} className="cyber-button cyber-button-secondary flex items-center justify-center gap-2 text-sm">
                  <RefreshCw className="w-4 h-4" /> {t.generate}
                </button>
                <button 
                  onClick={() => savePassword(generatedPassword, genLabel)}
                  disabled={!generatedPassword}
                  className="cyber-button cyber-button-primary flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" /> {t.save}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Verifier */}
        <section className="glass-card p-6 flex flex-col gap-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="text-cyber-accent w-5 h-5" />
            <h2 className="text-xl font-bold">{t.verifier}</h2>
          </div>

          <div className="space-y-6">
            <div className="relative">
              <input 
                type={showVerifyPassword ? "text" : "password"}
                placeholder={t.verifierPlaceholder}
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                className="w-full cyber-input pr-12 font-mono"
              />
              <button 
                onClick={() => setShowVerifyPassword(!showVerifyPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-cyber-accent"
              >
                {showVerifyPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {verifyInput ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{t.strength}</p>
                      <p className={`text-xl font-bold ${evaluateStrength(verifyInput).color}`}>
                        {evaluateStrength(verifyInput).label}
                      </p>
                    </div>
                    <p className="text-xs font-mono text-slate-400">
                      {calculateEntropy(verifyInput, 94)} bits
                    </p>
                  </div>
                  
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(evaluateStrength(verifyInput).score / 5) * 100}%` }}
                      className={`h-full transition-all duration-500 ${
                        evaluateStrength(verifyInput).score <= 1 ? 'bg-red-500' :
                        evaluateStrength(verifyInput).score <= 2 ? 'bg-orange-500' :
                        evaluateStrength(verifyInput).score <= 3 ? 'bg-yellow-500' :
                        'bg-cyber-accent'
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{t.analysis}</p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-xs">
                      {verifyInput.length >= 12 ? <CheckCircle2 className="w-3 h-3 text-cyber-success" /> : <AlertTriangle className="w-3 h-3 text-cyber-danger" />}
                      <span className={verifyInput.length >= 12 ? 'text-slate-300' : 'text-slate-500'}>{t.lengthRec}</span>
                    </li>
                    <li className="flex items-center gap-2 text-xs">
                      {/[A-Z]/.test(verifyInput) ? <CheckCircle2 className="w-3 h-3 text-cyber-success" /> : <AlertTriangle className="w-3 h-3 text-cyber-danger" />}
                      <span className={/[A-Z]/.test(verifyInput) ? 'text-slate-300' : 'text-slate-500'}>{t.uppercase}</span>
                    </li>
                    <li className="flex items-center gap-2 text-xs">
                      {/[0-9]/.test(verifyInput) ? <CheckCircle2 className="w-3 h-3 text-cyber-success" /> : <AlertTriangle className="w-3 h-3 text-cyber-danger" />}
                      <span className={/[0-9]/.test(verifyInput) ? 'text-slate-300' : 'text-slate-500'}>{t.numbers}</span>
                    </li>
                    <li className="flex items-center gap-2 text-xs">
                      {/[^A-Za-z0-9]/.test(verifyInput) ? <CheckCircle2 className="w-3 h-3 text-cyber-success" /> : <AlertTriangle className="w-3 h-3 text-cyber-danger" />}
                      <span className={/[^A-Za-z0-9]/.test(verifyInput) ? 'text-slate-300' : 'text-slate-500'}>{t.symbols}</span>
                    </li>
                  </ul>
                </div>

                <button 
                  onClick={() => {
                    setGenLength(Math.max(16, verifyInput.length + 4));
                    generatePassword();
                    showToast(lang === 'es' ? 'Mejora generada' : 'Improvement generated');
                  }}
                  className="w-full cyber-button cyber-button-secondary flex items-center justify-center gap-2 text-sm"
                >
                  <Zap className="w-4 h-4 text-cyber-accent" /> {t.suggestImprovement}
                </button>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Shield className="w-12 h-12 text-white/5 mb-4" />
                <p className="text-sm text-slate-500">{t.verifierEmpty}</p>
              </div>
            )}
          </div>
        </section>

        {/* 3. History */}
        <section className="glass-card p-6 flex flex-col gap-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <History className="text-cyber-accent w-5 h-5" />
              <h2 className="text-xl font-bold">{t.history}</h2>
            </div>
            <div className="flex gap-2">
              <label className="p-2 hover:bg-white/5 rounded-lg cursor-pointer text-slate-400 hover:text-cyber-accent transition-colors">
                <Upload className="w-4 h-4" />
                <input type="file" className="hidden" accept=".json" onChange={importHistory} />
              </label>
              <button onClick={exportHistory} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-cyber-accent transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full cyber-input pl-10 text-sm"
            />
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((entry) => (
                  <motion.div 
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 bg-white/5 rounded-xl border border-white/5 group hover:border-white/20 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-sm font-bold text-white truncate max-w-[150px]">{entry.label}</h3>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {entry.timestamp?.toDate ? entry.timestamp.toDate().toLocaleString() : 'Reciente'}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => copyToClipboard(entry.password)}
                          className="p-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-cyber-accent"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => deleteEntry(entry.id!)}
                          className="p-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-cyber-danger"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <code className="text-xs text-cyber-accent font-mono tracking-wider truncate max-w-[180px]">
                        {entry.password}
                      </code>
                      <div className={`w-1.5 h-1.5 rounded-full ${evaluateStrength(entry.password).color}`} />
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History className="w-12 h-12 text-white/5 mb-4" />
                  <p className="text-sm text-slate-500">{t.noHistory}</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 pt-8 border-t border-white/5 text-center">
        <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
          <Lock className="w-3 h-3" /> 
          {t.appName} {t.appStudio} • {t.clientSide} • {t.cloudSync}
        </p>
      </footer>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}
