
import React, { useState } from 'react';
import { User } from '../types';
import { UserCircleIcon } from './Icons';
import { dataService } from '../services/dataService';

interface AccountProfileProps {
  user: User;
}

const AccountProfile: React.FC<AccountProfileProps> = ({ user }) => {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 4) {
      setPasswordError('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    const success = dataService.changePassword(user.id, currentPassword, newPassword);
    
    if (success) {
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordSuccess(false);
      }, 2000);
    } else {
      setPasswordError('La contraseña actual es incorrecta');
    }
  };
  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Mi Cuenta</h2>
        <p className="text-slate-500">Información de tu perfil de usuario</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Avatar y Resumen */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-5xl font-bold">
              {user.name[0]}{user.lastName[0]}
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{user.name} {user.lastName}</h3>
            <div className="mt-3">
              <span className="inline-block px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-bold uppercase tracking-wider">
                {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Información Detallada */}
        <div className="lg:col-span-2">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Información Personal</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nombre</label>
                <p className="text-lg font-semibold text-slate-800">{user.name}</p>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Apellido</label>
                <p className="text-lg font-semibold text-slate-800">{user.lastName}</p>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Correo Electrónico</label>
                <p className="text-lg font-semibold text-slate-800">{user.email}</p>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Rol del Sistema</label>
                <p className="text-lg font-semibold text-slate-800">
                  {user.role === 'ADMIN' ? 'Administrador' : 
                   user.role === 'TECH' ? 'Técnico' : 'Supervisor'}
                </p>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">ID de Usuario</label>
                <p className="text-lg font-mono text-slate-600">#{user.id}</p>
              </div>
            </div>
          </div>

          {/* Permisos según el rol */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mt-6">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Permisos y Accesos</h3>
            
            <div className="space-y-3">
              {user.role === 'ADMIN' && (
                <>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700">Gestión completa de usuarios</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700">Programación y edición de respaldos</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700">Acceso a todas las estadísticas</span>
                  </div>
                </>
              )}
              
              {user.role === 'TECH' && (
                <>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700">Registro de respaldos</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700">Vista de calendario y tareas</span>
                  </div>
                </>
              )}
              
              {user.role === 'SUPERVISOR' && (
                <>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700">Acceso a estadísticas y reportes</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700">Monitoreo del sistema</span>
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Cambio de Contraseña */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mt-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">Seguridad</h3>
              {!showPasswordForm && (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition"
                >
                  Cambiar Contraseña
                </button>
              )}
            </div>

            {showPasswordForm ? (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Contraseña Actual</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ingresa tu contraseña actual"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Nueva Contraseña</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Mínimo 4 caracteres"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Confirmar Nueva Contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Repite la nueva contraseña"
                  />
                </div>

                {passwordError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-red-700">{passwordError}</span>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-green-700">¡Contraseña actualizada exitosamente!</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
                  >
                    Actualizar Contraseña
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordError('');
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Contraseña protegida</p>
                  <p className="text-xs text-slate-500">Haz clic en "Cambiar Contraseña" para actualizarla</p>
                </div>
              </div>
            )}
          </div>        </div>
      </div>
    </div>
  );
};

export default AccountProfile;
