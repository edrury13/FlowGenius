import React, { useState } from 'react';
import { authService } from '../../services/supabase';

interface AuthModalProps {
  isVisible: boolean;
  onSuccess: (user: any) => void;
  onError: (message: string) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot-password';

const AuthModal: React.FC<AuthModalProps> = ({ isVisible, onSuccess, onError }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      switch (mode) {
        case 'login':
          const { user: loginUser } = await authService.signIn(email, password);
          if (loginUser) {
            onSuccess(loginUser);
          }
          break;

        case 'signup':
          await authService.signUp(email, password, fullName);
          setMessage('Registration successful! Please check your email to verify your account.');
          setMode('login');
          break;

        case 'forgot-password':
          await authService.resetPassword(email);
          setMessage('Password reset email sent! Check your inbox.');
          setMode('login');
          break;
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      onError(error.message || 'An error occurred');
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await authService.signInWithProvider('google');
      // The auth state change will be handled by the parent component
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      onError(error.message || 'Google sign-in failed');
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setMessage('');
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  if (!isVisible) return null;

  const styles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '0',
      width: '100%',
      maxWidth: '400px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
      overflow: 'hidden',
    },
    header: {
      padding: '24px 24px 16px',
      textAlign: 'center' as const,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      margin: '0 0 8px 0',
    },
    subtitle: {
      fontSize: '16px',
      opacity: 0.9,
      margin: 0,
    },
    content: {
      padding: '24px',
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '16px',
      fontFamily: 'inherit',
      transition: 'border-color 0.3s ease',
      boxSizing: 'border-box' as const,
    },
    inputFocused: {
      borderColor: '#667eea',
      outline: 'none',
    },
    button: {
      width: '100%',
      padding: '12px 16px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      fontFamily: 'inherit',
    },
    primaryButton: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
    },
    googleButton: {
      backgroundColor: '#4285f4',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      color: '#667eea',
      border: '2px solid #667eea',
    },
    linkButton: {
      background: 'none',
      border: 'none',
      color: '#667eea',
      textDecoration: 'underline',
      cursor: 'pointer',
      fontSize: '14px',
    },
    message: {
      padding: '12px',
      borderRadius: '6px',
      textAlign: 'center' as const,
      fontSize: '14px',
      marginBottom: '16px',
    },
    successMessage: {
      backgroundColor: '#e8f5e8',
      color: '#2d5016',
      border: '1px solid #4caf50',
    },
    errorMessage: {
      backgroundColor: '#ffeaea',
      color: '#721c24',
      border: '1px solid #f44336',
    },
    divider: {
      display: 'flex',
      alignItems: 'center',
      margin: '20px 0',
      color: '#666',
      fontSize: '14px',
    },
    dividerLine: {
      flex: 1,
      height: '1px',
      backgroundColor: '#e0e0e0',
    },
    dividerText: {
      padding: '0 16px',
    },
    footer: {
      textAlign: 'center' as const,
      marginTop: '20px',
      fontSize: '14px',
      color: '#666',
    },
    loadingSpinner: {
      display: 'inline-block',
      width: '16px',
      height: '16px',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      borderTopColor: 'white',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Welcome Back';
      case 'signup': return 'Create Account';
      case 'forgot-password': return 'Reset Password';
      default: return 'Authentication';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'login': return 'Sign in to your FlowGenius account';
      case 'signup': return 'Join FlowGenius today';
      case 'forgot-password': return 'Enter your email to reset password';
      default: return '';
    }
  };

  const getButtonText = () => {
    if (loading) return 'Please wait...';
    switch (mode) {
      case 'login': return 'Sign In';
      case 'signup': return 'Create Account';
      case 'forgot-password': return 'Send Reset Email';
      default: return 'Submit';
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>{getTitle()}</h2>
          <p style={styles.subtitle}>{getSubtitle()}</p>
        </div>

        <div style={styles.content}>
          {message && (
            <div style={{
              ...styles.message,
              ...(message.includes('successful') || message.includes('sent') 
                ? styles.successMessage 
                : styles.errorMessage)
            }}>
              {message}
            </div>
          )}

          <form style={styles.form} onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <input
                style={styles.input}
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            )}

            <input
              style={styles.input}
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />

            {mode !== 'forgot-password' && (
              <input
                style={styles.input}
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={mode === 'signup' ? 6 : undefined}
              />
            )}

            <button
              style={{...styles.button, ...styles.primaryButton}}
              type="submit"
              disabled={loading}
            >
              {loading && <span style={styles.loadingSpinner}></span>}
              {getButtonText()}
            </button>
          </form>

          {mode === 'login' && (
            <>
              <div style={styles.divider}>
                <div style={styles.dividerLine}></div>
                <span style={styles.dividerText}>or continue with</span>
                <div style={styles.dividerLine}></div>
              </div>

              <button
                style={{...styles.button, ...styles.googleButton}}
                onClick={handleGoogleSignIn}
                disabled={loading}
                type="button"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
            </>
          )}

          <div style={styles.footer}>
            {mode === 'login' && (
              <>
                <p>
                  Don't have an account?{' '}
                  <button
                    style={styles.linkButton}
                    onClick={() => switchMode('signup')}
                    type="button"
                  >
                    Sign up
                  </button>
                </p>
                <p>
                  <button
                    style={styles.linkButton}
                    onClick={() => switchMode('forgot-password')}
                    type="button"
                  >
                    Forgot password?
                  </button>
                </p>
              </>
            )}

            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button
                  style={styles.linkButton}
                  onClick={() => switchMode('login')}
                  type="button"
                >
                  Sign in
                </button>
              </p>
            )}

            {mode === 'forgot-password' && (
              <p>
                Remember your password?{' '}
                <button
                  style={styles.linkButton}
                  onClick={() => switchMode('login')}
                  type="button"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default AuthModal; 