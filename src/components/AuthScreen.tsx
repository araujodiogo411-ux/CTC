import React, { useState } from "react";
import { UserIcon, Lock, Phone, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";

interface AuthScreenProps {
  onRegister: (userData: any, stayConnected: boolean) => void;
  onLogin: (name: string, phone1: string, password?: string, stayConnected?: boolean) => Promise<boolean>;
  registeredUsers: any[];
}

export default function AuthScreen({ onLogin }: AuthScreenProps) {
  // Inputs fields
  const [name, setName] = useState("");
  const [phone1, setPhone1] = useState("");
  const [password, setPassword] = useState("");
  const [stayConnected, setStayConnected] = useState(true);
  
  // UI and feedback states
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanName = name.trim();
    const cleanPhone = phone1.replace(/\D/g, "");

    if (!cleanName) {
      setErrorMsg("Por favor, preencha o seu nome completo.");
      return;
    }

    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMsg("Por favor, insira um número de WhatsApp válido.");
      return;
    }

    if (!password) {
      setErrorMsg("Defina uma senha secreta para proteger seu acesso.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Direct call to async onLogin, which automatically handles lookup or profile registration
      const success = await onLogin(cleanName, phone1, password, stayConnected);
      if (success) {
        setSuccessMsg("Conexão estabelecida com sucesso! Redirecionando...");
      } else {
        setErrorMsg("Não foi possível acessar. Verifique as informações fornecidas.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Senha incorreta ou erro ao tentar acessar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
      
      {/* Background radial soft light blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-brand-green/10 rounded-full blur-3xl -translate-x-12 -translate-y-12 select-none pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl translate-x-12 translate-y-12 select-none pointer-events-none"></div>

      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-2xl relative z-10 overflow-hidden mt-6 mb-6">
        
        {/* Superior premium accent strip */}
        <div className="h-2 bg-gradient-to-r from-brand-green to-brand-blue"></div>

        {/* Brand Header */}
        <div className="pt-8 pb-4 text-center px-6 select-none">
          <div className="inline-flex items-center justify-center p-1 rounded-2xl bg-white shadow-md border border-slate-100 mb-4 transform hover:scale-105 transition-transform duration-300">
            <img 
              src="https://i.ibb.co/F4fT9dtd/Copilot-20260522-174622.png" 
              alt="Copilot Logo" 
              className="h-16 w-auto max-w-[220px] object-contain rounded-xl"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className = 'w-16 h-16 bg-brand-blue flex items-center justify-center text-white font-extrabold text-2xl rounded-xl';
                  fallback.innerText = 'CTC';
                  parent.appendChild(fallback);
                }
              }}
            />
          </div>
          <h1 className="text-xl font-bold font-sans text-brand-blue">Portal de Agendamentos CTC</h1>
          <p className="text-xs text-slate-500 mt-1">Insira seus dados para acessar instantaneamente</p>
        </div>

        {/* Central Explanatory Banner: Tells them first entry automatically registers them */}
        <div className="px-6 py-1 select-none">
          <div className="bg-emerald-50/50 border border-emerald-100/80 px-4 py-3 rounded-2xl">
            <h4 className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5 uppercase tracking-wide">
              ✨ Cadastro Unificado & Automático
            </h4>
            <p className="text-[10px] text-emerald-700/90 mt-1 leading-relaxed">
              Não precisa de cadastro prévio! Digite seu <strong>Nome Completo</strong>, <strong>WhatsApp</strong> e defina uma <strong>Senha Secreta</strong>. Se for sua primeira vez, criaremos seu perfil automaticamente na hora!
            </p>
          </div>
        </div>

        {/* Submit form */}
        <div className="p-6 pt-3">
          
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100 animate-in fade-in zoom-in-95">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-green-50 text-brand-blue rounded-xl text-xs font-medium border border-brand-green/30 animate-in fade-in zoom-in-95">
              ✅ {successMsg}
            </div>
          )}

          <form onSubmit={handleAccessSubmit} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label htmlFor="auth-name" className="block text-xs font-semibold text-slate-600 mb-1">
                Nome Completo *
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  id="auth-name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue focus:border-brand-blue outline-none transition"
                />
              </div>
            </div>

            {/* WhatsApp Contact */}
            <div>
              <label htmlFor="auth-phone" className="block text-xs font-semibold text-slate-600 mb-1">
                WhatsApp com DDD *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  id="auth-phone"
                  type="tel"
                  required
                  placeholder="Ex: (81) 99999-9999"
                  value={phone1}
                  onChange={(e) => setPhone1(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue focus:border-brand-blue outline-none transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-600 mb-1">
                Senha Secreta de Acesso *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="Senha para proteger seu painel"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-brand-blue focus:border-brand-blue outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Stay Connected Switch */}
            <div className="flex items-center gap-2 py-1 select-none">
              <input
                type="checkbox"
                id="stayConnectedLogin"
                checked={stayConnected}
                onChange={(e) => setStayConnected(e.target.checked)}
                className="rounded text-brand-blue focus:ring-brand-blue w-4.5 h-4.5 accent-brand-blue cursor-pointer"
              />
              <label htmlFor="stayConnectedLogin" className="text-[11px] text-slate-500 cursor-pointer">
                Me manter sempre conectado (Não pede senha no próximo login)
              </label>
            </div>

            {/* Access Buttons */}
            <button
              id="btn-entrar"
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-bold py-3 px-6 rounded-2xl shadow-md transition-all duration-300 flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed hover:shadow-lg hover:scale-[1.01]"
            >
              <span>{isSubmitting ? "Autenticando..." : "Entrar no Sistema"}</span>
              {!isSubmitting && <ArrowRight className="w-4 h-4 text-white" />}
            </button>

          </form>
        </div>

        {/* Security Banner Badge */}
        <div className="px-6 pb-4 select-none">
          <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-2xl text-left">
            <div className="flex gap-2 items-start">
              <ShieldCheck className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[11px] font-bold text-slate-700">Conexão Blindada Protegida</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Todos os dados médicos e de preenchimento são assegurados de ponta a ponta. Acesso restrito e confidencialidade total da clínica.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Organization copyright */}
        <div className="bg-slate-50 py-3.5 px-6 border-t border-slate-100 text-center text-[10px] text-slate-400 font-semibold select-none">
          Sistema de Consultas Privado CTC &copy; 2026
        </div>
      </div>
    </div>
  );
}
