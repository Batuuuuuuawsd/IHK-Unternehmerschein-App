import React, { useState } from 'react';
import { UserIcon, EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';

const LoginScreen = ({ onContinue }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: ''
  });

  const { signIn, signUp, signInWithGoogle, continueAsGuest } = useAuth();
  const { t, language, changeLanguage } = useLanguage();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error(t('auth.fillAllFields') || 'Bitte alle Felder ausfüllen');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signIn(formData.email, formData.password);
      } else {
        if (!formData.displayName) {
          toast.error(t('auth.nameRequired') || 'Name ist erforderlich');
          setLoading(false);
          return;
        }
        await signUp(formData.email, formData.password, formData.displayName);
      }
      onContinue();
    } catch (error) {
      console.error('Authentication error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      onContinue();
    } catch (error) {
      console.error('Google sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = () => {
    continueAsGuest();
    onContinue();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Language Selector */}
      <div className="absolute top-4 right-4">
        <select
          value={language}
          onChange={(e) => changeLanguage(e.target.value)}
          className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-2 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          <option value="de" className="bg-gray-800 text-white">🇩🇪 Deutsch</option>
          <option value="en" className="bg-gray-800 text-white">🇬🇧 English</option>
          <option value="tr" className="bg-gray-800 text-white">🇹🇷 Türkçe</option>
        </select>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
            <span className="text-2xl">🚕</span>
          </div>
          <h1 className="mt-6 text-3xl font-bold text-white">
            IHK Taxi Prüfung
          </h1>
          <p className="mt-2 text-blue-100">
            {t('auth.subtitle') || 'Bereite dich optimal auf die Fachkundeprüfung vor'}
          </p>
        </div>

        {/* Auth Form */}
        <div className="mt-8">
          <div className="bg-white/10 backdrop-blur-md py-8 px-6 shadow-xl rounded-2xl border border-white/20">
            
            {/* Toggle Login/Register */}
            <div className="flex bg-white/10 rounded-xl p-1 mb-6">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  isLogin
                    ? 'bg-white text-blue-600 shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                {t('auth.login')}
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  !isLogin
                    ? 'bg-white text-blue-600 shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                {t('auth.signup')}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name Field (Only for signup) */}
              {!isLogin && (
                <div>
                  <label htmlFor="displayName" className="sr-only">
                    {t('auth.displayName')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-white/60" />
                    </div>
                    <input
                      id="displayName"
                      name="displayName"
                      type="text"
                      value={formData.displayName}
                      onChange={handleInputChange}
                      className="bg-white/10 border border-white/20 text-white placeholder-white/60 rounded-lg block w-full pl-10 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent backdrop-blur-sm"
                      placeholder={t('auth.displayName')}
                    />
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="sr-only">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-white/60" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="bg-white/10 border border-white/20 text-white placeholder-white/60 rounded-lg block w-full pl-10 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent backdrop-blur-sm"
                    placeholder={t('auth.email')}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="sr-only">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-white/60" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="bg-white/10 border border-white/20 text-white placeholder-white/60 rounded-lg block w-full pl-10 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent backdrop-blur-sm"
                    placeholder={t('auth.password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-white/60 hover:text-white transition-colors" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-white/60 hover:text-white transition-colors" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-blue-600 font-semibold py-3 px-4 rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                ) : (
                  isLogin ? t('auth.login') : t('auth.signup')
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-transparent text-white/80">oder</span>
                </div>
              </div>
            </div>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="mt-4 w-full bg-white/10 border border-white/20 text-white font-medium py-3 px-4 rounded-lg hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all backdrop-blur-sm flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{t('auth.signInWithGoogle')}</span>
            </button>

            {/* Guest Continue */}
            <button
              onClick={handleGuestContinue}
              className="mt-4 w-full text-white/80 text-sm hover:text-white transition-colors py-2"
            >
              {t('auth.guest')} →
            </button>

            {/* Features Preview */}
            <div className="mt-8 space-y-2">
              <p className="text-white/60 text-xs text-center mb-3">
                {t('auth.features') || 'Funktionen:'}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center space-x-2 text-white/80">
                  <span className="text-green-400">✓</span>
                  <span>560+ Fragen</span>
                </div>
                <div className="flex items-center space-x-2 text-white/80">
                  <span className="text-green-400">✓</span>
                  <span>5 Themenbereiche</span>
                </div>
                <div className="flex items-center space-x-2 text-white/80">
                  <span className="text-green-400">✓</span>
                  <span>Spaced Repetition</span>
                </div>
                <div className="flex items-center space-x-2 text-white/80">
                  <span className="text-green-400">✓</span>
                  <span>Offline-Modus</span>
                </div>
                <div className="flex items-center space-x-2 text-white/80">
                  <span className="text-green-400">✓</span>
                  <span>Gamification</span>
                </div>
                <div className="flex items-center space-x-2 text-white/80">
                  <span className="text-green-400">✓</span>
                  <span>3 Sprachen</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;