import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView, Modal, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { TermsOfService } from './TermsOfService';
import { ProfilePictureGuidelines } from './ProfilePictureGuidelines';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ color: '#FFFFFF', marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <>{children}</>;
}

function AuthScreen() {
  const { signIn, signUp, signInAnonymously } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPhotoGuidelines, setShowPhotoGuidelines] = useState(false);
  const [acknowledgedGuidelines, setAcknowledgedGuidelines] = useState(false);

  const handleAuth = async () => {
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (isSignUp && !age) {
      setError('Please fill in all fields');
      return;
    }

    if (isSignUp && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (isSignUp && !acceptedTerms) {
      setError('You must accept the Terms of Service to create an account');
      return;
    }

    if (isSignUp && !acknowledgedGuidelines) {
      setShowPhotoGuidelines(true);
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const ageNum = parseInt(age);
        if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
          setError('Age must be between 18 and 99');
          setLoading(false);
          return;
        }

        const { error: authError } = await signUp(email, password, '', ageNum);
        if (authError) {
          setError(authError.message || 'Sign up failed');
        }
      } else {
        const { error: authError } = await signIn(email, password);
        if (authError) {
          setError(authError.message || 'Invalid email or password');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const sanitizeAuthError = (message: string): string => {
    const lower = message.toLowerCase();
    if (lower.includes('invalid login') || lower.includes('invalid credentials') || lower.includes('email not confirmed')) {
      return 'Invalid email or password.';
    }
    if (lower.includes('already registered') || lower.includes('already exists')) {
      return 'An account with this email already exists.';
    }
    if (lower.includes('password')) {
      return 'Password does not meet requirements. Use at least 8 characters.';
    }
    if (lower.includes('email')) {
      return 'Please enter a valid email address.';
    }
    return 'Something went wrong. Please try again.';
  };

  const handleAcceptGuidelines = async () => {
    setAcknowledgedGuidelines(true);
    setShowPhotoGuidelines(false);
    setLoading(true);
    const ageNum = parseInt(age);
    const { error: authError } = await signUp(email, password, '', ageNum);
    if (authError) {
      setError(sanitizeAuthError(authError.message));
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>verse</Text>
          <Text style={styles.logoDot}>*</Text>
        </View>
        <Text style={styles.subtitle}>Connect with your community</Text>

        <View style={styles.form}>
          {isSignUp && (
            <TextInput
              style={styles.input}
              placeholder="Age"
              placeholderTextColor="#6B7280"
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
              maxLength={2}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#6B7280"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#6B7280"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          {isSignUp && (
            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
              >
                <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                  {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.termsText}>
                  I am at least 18 years old and accept the{' '}
                  <Text
                    style={styles.termsLink}
                    onPress={() => setShowTerms(true)}
                  >
                    Terms of Service
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.guestButton, loading && styles.buttonDisabled]}
            onPress={async () => {
              setError(null);
              setLoading(true);
              const { error: authError } = await signInAnonymously();
              if (authError) {
                setError(authError.message || 'Anonymous sign in failed. Please try again.');
              }
              setLoading(false);
            }}
            disabled={loading}
          >
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              setIsSignUp(!isSignUp);
              setAcceptedTerms(false);
              setError(null);
            }}
          >
            <Text style={styles.switchButtonText}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.viewTermsButton}
          onPress={() => setShowTerms(true)}
        >
          <Text style={styles.viewTermsText}>View Terms of Service</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showTerms}
        animationType="slide"
        onRequestClose={() => setShowTerms(false)}
      >
        <TermsOfService
          onClose={() => setShowTerms(false)}
          showCloseButton={true}
        />
      </Modal>

      <ProfilePictureGuidelines
        visible={showPhotoGuidelines}
        onAccept={handleAcceptGuidelines}
        onClose={() => setShowPhotoGuidelines(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#6366F1',
    textAlign: 'center',
  },
  logoDot: {
    fontSize: 28,
    color: '#EF4444',
    fontWeight: 'bold',
    marginLeft: 2,
    marginTop: -4,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 48,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  button: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  guestButton: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  guestButtonText: {
    color: '#D1D5DB',
    fontSize: 15,
    fontWeight: '600',
  },
  switchButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '500',
  },
  termsContainer: {
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#374151',
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  termsText: {
    flex: 1,
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
  },
  termsLink: {
    color: '#6366F1',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  viewTermsButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  viewTermsText: {
    color: '#6B7280',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  errorBox: {
    backgroundColor: '#7F1D1D',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '500',
  },
});
