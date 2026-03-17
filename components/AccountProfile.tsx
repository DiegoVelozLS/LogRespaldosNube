
import React from 'react';
import { User } from '../types';
import { UserCircleIcon } from './Icons';


interface AccountProfileProps {
  user: User;
}

const AccountProfile: React.FC<AccountProfileProps> = ({ user }) => {
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
                   user.role === 'TECH' ? 'Técnico' : 'Soporte'}
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
              
              {user.role === 'SOPORTE' && (
                <>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700">Acceso a Intranet</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700">Anuncios, documentos y directorio</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountProfile;
