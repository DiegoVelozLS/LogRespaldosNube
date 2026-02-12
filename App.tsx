
import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { supabaseDataService } from './services/supabaseDataService';
import { DashboardIcon, CalendarIcon, CheckIcon, AdminIcon, AlertIcon, ClockIcon, UserCircleIcon } from './components/Icons';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import BackupRegistration from './components/BackupRegistration';
import AdminPanel from './components/AdminPanel';
import AccountProfile from './components/AccountProfile';
import MonthlyReport from './components/MonthlyReport';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'register' | 'admin' | 'stats' | 'profile' | 'reports'>('dashboard');
  const [pendingAlerts, setPendingAlerts] = useState<number>(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const savedUser = await supabaseDataService.getCurrentUser();
      if (savedUser) {
        setUser(savedUser);
        // Ajustar tab inicial según rol
        if (savedUser.role === UserRole.SUPERVISOR) setActiveTab('stats');
        
        // Cargar alertas pendientes
        const tasksToday = await supabaseDataService.getTasksForDate(new Date());
        setPendingAlerts(tasksToday.filter(t => !t.log).length);
      }
      setLoading(false);
    };
    
    loadUser();
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
      if (loggedUser.role === UserRole.SUPERVISOR) setActiveTab('stats');
    } else {
      alert('Credenciales incorrectas.');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabaseDataService.logout();
    setUser(null);
    setActiveTab('dashboard');
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
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Log de Respaldos</h1>
          <p className="text-gray-500 text-center mb-8">Sistema de Control de Respaldos</p>
          
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
          <div className="mt-6 text-[10px] text-gray-400 text-center">
            Demo Admin: admin@listosoft.com (12345) <br/>
            Demo Supervisor: supervisor@company.com (super)
          </div>
        </div>
      </div>
    );
  }

  const isSupervisor = user.role === UserRole.SUPERVISOR;
  const isAdmin = user.role === UserRole.ADMIN;
  const isTech = user.role === UserRole.TECH;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50">
      <nav className="w-full md:w-64 bg-slate-900 text-white flex flex-col sticky top-0 md:h-screen z-10">
        <div className="p-6 border-b border-slate-800 flex items-center justify-center">
          <img src="/assets/Logo-Listosoft.png" alt="Listosoft" className="h-16 w-auto object-contain" />
        </div>

        <div className="flex-1 py-6 px-4 space-y-2">
          {!isSupervisor && (
            <>
              <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <DashboardIcon />
                <span className="font-medium">Panel Principal</span>
                {pendingAlerts > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{pendingAlerts}</span>}
              </button>
              
              <button onClick={() => setActiveTab('calendar')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'calendar' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <CalendarIcon />
                <span className="font-medium">Calendario</span>
              </button>

              <button onClick={() => setActiveTab('register')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'register' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                <ClockIcon />
                <span className="font-medium">Registrar Respaldo</span>
              </button>
            </>
          )}

          {isSupervisor && (
             <button onClick={() => setActiveTab('stats')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'stats' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              <AdminIcon />
              <span className="font-medium">Estadísticas</span>
            </button>
          )}

          {/* Reportes para todos los roles */}
          <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium">Reportes</span>
          </button>

          {isAdmin && (
            <button onClick={() => setActiveTab('admin')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === 'admin' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              <AdminIcon />
              <span className="font-medium">Administración</span>
            </button>
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

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard user={user} onRefresh={() => {}} onNavigateToRegister={(scheduleId) => {
            setSelectedTaskId(scheduleId);
            setActiveTab('register');
          }} />}
          {activeTab === 'calendar' && <CalendarView user={user} />}
          {activeTab === 'register' && <BackupRegistration user={user} preSelectedTaskId={selectedTaskId} onComplete={() => {
            setSelectedTaskId(undefined);
            setActiveTab('dashboard');
          }} />}
          {activeTab === 'admin' && <AdminPanel role={user.role} />}
          {activeTab === 'stats' && <AdminPanel role={user.role} initialTab="stats" />}
          {activeTab === 'profile' && <AccountProfile user={user} />}
          {activeTab === 'reports' && <MonthlyReport user={user} />}
        </div>
      </main>
    </div>
  );
};

export default App;
