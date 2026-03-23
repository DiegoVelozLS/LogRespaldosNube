import React, { useState, useEffect, useCallback } from 'react';
import { supabaseDataService } from '../services/supabaseDataService';
import { User } from '../types';

interface VaultPinModalProps {
  user: User;
  onUnlock: () => void;
}

const VaultPinModal: React.FC<VaultPinModalProps> = ({ user, onUnlock }) => {
  const [mode, setMode] = useState<'verify' | 'setup' | 'loading'>('loading');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checkPinStatus = useCallback(async () => {
    setMode('loading');
    try {
      const hasPin = await supabaseDataService.checkHasPin();
      setMode(hasPin ? 'verify' : 'setup');
    } catch (err) {
      console.error(err);
      setMode('verify'); // Fallback
    }
  }, []);

  useEffect(() => {
    checkPinStatus();
  }, [checkPinStatus]);

  const handleBackspace = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
  }, []);

  const handleNumberClick = useCallback((num: string) => {
    setError(null);
    setPin(prev => {
      if (prev.length < 6) return prev + num;
      return prev;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (pin.length < 4) {
      setError('El PIN debe tener al menos 4 dígitos.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'setup') {
        if (confirmPin === '') {
          setConfirmPin(pin);
          setPin('');
          setIsSubmitting(false);
          return;
        }

        if (pin !== confirmPin) {
          setError('Los PINs no coinciden. Reintenta.');
          setPin('');
          setConfirmPin('');
          setIsSubmitting(false);
          return;
        }

        const success = await supabaseDataService.setupPin(pin);
        if (success) {
          // Guardar desbloqueo diario en localStorage
          const today = new Date().toISOString().split('T')[0];
          localStorage.setItem(`vault_unlocked_${user.id}`, today);
          onUnlock();
        } else {
          setError('Error al guardar el PIN.');
        }
      } else {
        const isValid = await supabaseDataService.validatePin(pin);
        if (isValid) {
          const today = new Date().toISOString().split('T')[0];
          localStorage.setItem(`vault_unlocked_${user.id}`, today);
          onUnlock();
        } else {
          setError('PIN incorrecto.');
          setPin('');
        }
      }
    } catch (err) {
      setError('Error de conexión.');
    } finally {
      setIsSubmitting(false);
    }
  }, [pin, confirmPin, mode, user.id, onUnlock]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitting) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleNumberClick(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pin.length >= 4) {
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNumberClick, handleBackspace, handleSubmit, isSubmitting, pin.length]);
  if (mode === 'loading') {
    return (
      <div className="absolute inset-0 bg-white/60 backdrop-blur-md flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Verificando</p>
        </div>
      </div>
    );
  }

  const isConfirming = mode === 'setup' && confirmPin !== '';

  return (
    <div className="absolute inset-0 bg-slate-100/40 backdrop-blur-[1px] flex items-center justify-center z-40 p-6 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.05)] w-full max-w-[350px] flex flex-col border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Section */}
        <div className="p-10 pb-4 text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-6">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            {mode === 'setup' ? (isConfirming ? 'Confirmar PIN' : 'Configurar acceso') : 'Bóveda de accesos'}
          </h2>
          <p className="text-slate-400 text-xs font-medium">
            {mode === 'setup' 
              ? (isConfirming ? 'Introduce el código nuevamente.' : 'Define un código para proteger la información.') 
              : 'Introduce tu código de seguridad personal.'}
          </p>
        </div>

        {/* PIN Indicators Area */}
        <div className="px-10 pb-10 flex flex-col items-center space-y-6">
          <div className="flex gap-4">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i < pin.length 
                    ? 'bg-slate-800 scale-110' 
                    : 'bg-slate-100 border border-slate-200'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="text-red-600 text-[11px] font-bold text-center px-4">
              {error}
            </div>
          )}

          {/* Keypad - Professional Layout */}
          <div className="grid grid-cols-3 gap-2 w-full">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'].map((key, i) => {
              if (key === 'del') {
                return (
                  <button 
                    key={i} 
                    onClick={handleBackspace}
                    className="h-14 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-all active:bg-slate-100 text-slate-400"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                    </svg>
                  </button>
                );
              }
              if (key === 'ok') {
                return (
                  <button 
                    key={i} 
                    onClick={handleSubmit}
                    disabled={pin.length < 4 || isSubmitting}
                    className={`h-14 flex items-center justify-center rounded-xl transition-all active:scale-95 ${
                      pin.length < 4 || isSubmitting
                        ? 'bg-slate-50 text-slate-200'
                        : 'bg-slate-900 text-white hover:bg-black font-bold text-sm'
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    ) : 'LISTO'}
                  </button>
                );
              }
              return (
                <button 
                  key={i} 
                  onClick={() => handleNumberClick(key)}
                  className="h-14 text-lg font-semibold text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition-all active:bg-slate-100"
                >
                  {key}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VaultPinModal;
