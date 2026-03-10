
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { APP_VERSION } from './constants';
import { supabaseDataService } from './services/supabaseDataService';
import { supabase } from './services/supabaseClient';
import { DashboardIcon, CheckIcon, AdminIcon, AlertIcon, ClockIcon, UserCircleIcon } from './components/Icons';
import Home from './components/Home';
import Announcements from './components/Announcements';
import DocumentRepository from './components/DocumentRepository';
import EmployeeDirectory from './components/EmployeeDirectory';
import Dashboard from './components/Dashboard';
import BackupRegistration from './components/BackupRegistration';
import AdminPanel from './components/AdminPanel';
import AccountProfile from './components/AccountProfile';
import MonthlyReport from './components/MonthlyReport';
import ClientDirectory from './components/ClientDirectory';

type TabType = 'home' | 'announcements' | 'documents' | 'employees' | 'backups' | 'register' | 'admin' | 'stats' | 'profile' | 'reports' | 'clients';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [pendingAlerts, setPendingAlerts] = useState<number>(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const savedUser = await supabaseDataService.getCurrentUser();
      if (savedUser) {
        setUser(savedUser);
        // Siempre empezar en home
        setActiveTab('home');

        // Cargar alertas pendientes
        const tasksToday = await supabaseDataService.getTasksForDate(new Date());
        setPendingAlerts(tasksToday.filter(t => !t.log).length);
      }
      setLoading(false);
    };

    // Listener para cambios de autenticación (OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Usuario acaba de iniciar sesión (posiblemente con Google)
        const userProfile = await supabaseDataService.getOrCreateUserProfile(session.user);
        if (userProfile) {
          setUser(userProfile);
          setActiveTab('home');
          // Cargar alertas pendientes
          const tasksToday = await supabaseDataService.getTasksForDate(new Date());
          setPendingAlerts(tasksToday.filter(t => !t.log).length);
        }
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setActiveTab('home');
      }
    });

    loadUser();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const loggedUser = await supabaseDataService.login(email, password);

    if (loggedUser) {
      setUser(loggedUser);
      setActiveTab('home');
    } else {
      alert('Credenciales incorrectas.');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await supabaseDataService.loginWithGoogle();
      // El callback de onAuthStateChange manejará el resto
    } catch (error) {
      console.error('Error al iniciar con Google:', error);
      alert('Error al iniciar sesión con Google');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabaseDataService.logout();
    setUser(null);
    setActiveTab('home');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex justify-center mb-6">
            <img src="/assets/Logo-Listosoft.png" alt="Listosoft" className="h-16 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Intranet Listosoft</h1>
          <p className="text-gray-500 text-center mb-8">Portal Corporativo</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Corporativo</label>
              <input name="email" type="email" required className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="admin@listosoft.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input name="password" type="password" required className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="••••••••" />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg shadow-lg transition" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">O continuar con</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="font-medium text-gray-700">Iniciar con Google</span>
          </button>

          <div className="mt-6 text-xs text-slate-400 text-center">v{APP_VERSION}</div>

        </div>
      </div>
    );
  }

  const hasPermission = (key: string) => user.permissions?.includes(key) || user.role === 'ADMIN';

  const handleNavigate = (tab: string) => {
    setActiveTab(tab as TabType);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      <nav className="w-full md:w-64 bg-slate-900 text-white flex flex-col sticky top-0 md:h-screen z-10">
        <div className="p-6 border-b border-slate-800 flex items-center justify-center">
          <img src="/assets/Logo-Listosoft.png" alt="Listosoft" className="h-16 w-auto object-contain" />
        </div>

        <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent hover:scrollbar-thumb-slate-600" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
          {/* Sección Intranet */}
          <p className="text-xs text-slate-500 uppercase tracking-wider px-4 mb-2">Intranet</p>
          
          <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'home' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="font-medium">Inicio</span>
          </button>

          <button onClick={() => setActiveTab('announcements')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'announcements' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <span className="font-medium">Anuncios</span>
          </button>

          <button onClick={() => setActiveTab('documents')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'documents' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="font-medium">Documentos</span>
          </button>

          <button onClick={() => setActiveTab('employees')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'employees' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="font-medium">Directorio</span>
          </button>

          {hasPermission('clients') && (
            <button onClick={() => setActiveTab('clients')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'clients' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="font-medium">Clientes</span>
            </button>
          )}

          {/* Sección Sistema de Respaldos */}
          {hasPermission('dashboard') && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider px-4">Respaldos</p>
              </div>

              <button onClick={() => setActiveTab('backups')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'backups' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <DashboardIcon />
                <span className="font-medium">Panel Respaldos</span>
                {pendingAlerts > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{pendingAlerts}</span>}
              </button>

              {hasPermission('register') && (
                <button onClick={() => setActiveTab('register')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'register' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                  <ClockIcon />
                  <span className="font-medium">Registrar</span>
                </button>
              )}

              {hasPermission('reports') && (
                <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium">Reportes</span>
                </button>
              )}
            </>
          )}

          {/* Sección Admin */}
          {hasPermission('admin') && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider px-4">Admin</p>
              </div>
              <button onClick={() => setActiveTab('admin')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'admin' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <AdminIcon />
                <span className="font-medium">Administración</span>
              </button>
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 mt-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className="w-full flex items-center gap-3 mb-4 px-2 hover:bg-slate-800 rounded-lg transition p-2"
          >
            <div className="text-blue-400"><UserCircleIcon /></div>
            <div className="overflow-hidden text-left">
              <p className="text-sm font-semibold truncate">{user.name} {user.lastName}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">{user.role}</p>
            </div>
          </button>
          <button onClick={handleLogout} className="w-full py-2 px-4 rounded-lg bg-slate-800 hover:text-red-400 text-slate-400 text-sm font-medium transition">
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          {activeTab === 'home' && <Home user={user} onNavigate={handleNavigate} />}
          {activeTab === 'announcements' && <Announcements user={user} />}
          {activeTab === 'documents' && <DocumentRepository user={user} />}
          {activeTab === 'employees' && <EmployeeDirectory user={user} />}
          {activeTab === 'backups' && <Dashboard user={user} onRefresh={() => { }} onNavigateToRegister={(scheduleId) => {
            setSelectedTaskId(scheduleId);
            setActiveTab('register');
          }} />}
          {activeTab === 'register' && <BackupRegistration user={user} preSelectedTaskId={selectedTaskId} onComplete={() => {
            setSelectedTaskId(undefined);
            setActiveTab('backups');
          }} />}
          {activeTab === 'admin' && <AdminPanel role={user.role} />}
          {activeTab === 'stats' && <AdminPanel role={user.role} initialTab="stats" />}
          {activeTab === 'profile' && <AccountProfile user={user} />}
          {activeTab === 'clients' && <ClientDirectory role={user.role} />}
          {activeTab === 'reports' && <MonthlyReport user={user} />}
        </div>
      </main>
    </div>
  );
};

export default App;
