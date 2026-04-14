import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { apiCall } from '../../src/api';
import { COLORS } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Forgot password state
  const [forgotMode, setForgotMode] = useState<'none' | 'email' | 'otp' | 'done'>('none');
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpMessage, setFpMessage] = useState('');

  async function handleLogin() {
    if (!email.trim() || !password.trim()) { setError('Please enter email and password'); return; }
    setLoading(true); setError('');
    try {
      const data = await login(email.trim(), password);
      if (data.user.role === 'admin' || data.user.role === 'teacher') {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (e: any) { setError(e.message || 'Login failed'); }
    finally { setLoading(false); }
  }

  async function handleForgotSendOtp() {
    if (!fpEmail.trim()) { setFpMessage('Enter your email'); return; }
    setFpLoading(true); setFpMessage('');
    try {
      await apiCall('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: fpEmail.trim() }) });
      setForgotMode('otp');
      setFpMessage('OTP sent to your email');
    } catch (e: any) { setFpMessage(e.message || 'Failed to send OTP'); }
    finally { setFpLoading(false); }
  }

  async function handleResetPassword() {
    if (!fpOtp.trim() || !fpNewPassword.trim()) { setFpMessage('Enter OTP and new password'); return; }
    if (fpNewPassword.length < 6) { setFpMessage('Password must be at least 6 characters'); return; }
    setFpLoading(true); setFpMessage('');
    try {
      await apiCall('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ email: fpEmail.trim(), otp: fpOtp.trim(), new_password: fpNewPassword }) });
      setForgotMode('done');
      setFpMessage('Password reset successfully! You can now login.');
    } catch (e: any) { setFpMessage(e.message || 'Reset failed'); }
    finally { setFpLoading(false); }
  }

  function resetForgotMode() {
    setForgotMode('none'); setFpEmail(''); setFpOtp(''); setFpNewPassword(''); setFpMessage('');
  }

  // Forgot password UI
  if (forgotMode !== 'none') {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.logoBox}>
              <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
              <Text style={styles.brand}>GS PINNACLE IAS</Text>
              <Text style={styles.subtitle}>Reset Password</Text>
            </View>

            {fpMessage ? (
              <View style={[styles.msgBox, forgotMode === 'done' ? styles.successBg : styles.infoBg]}>
                <Ionicons name={forgotMode === 'done' ? 'checkmark-circle' : 'information-circle'} size={16} color={forgotMode === 'done' ? COLORS.success : COLORS.primary} />
                <Text style={[styles.msgText, { color: forgotMode === 'done' ? COLORS.success : COLORS.primary }]}>{fpMessage}</Text>
              </View>
            ) : null}

            {forgotMode === 'email' && (
              <View>
                <Text style={styles.fpDesc}>Enter your registered email address. We'll send you an OTP to reset your password.</Text>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />
                  <TextInput testID="fp-email-input" style={styles.input} placeholder="Enter your email" placeholderTextColor={COLORS.textMuted} value={fpEmail} onChangeText={setFpEmail} keyboardType="email-address" autoCapitalize="none" />
                </View>
                <TouchableOpacity style={[styles.btn, fpLoading && styles.btnDisabled]} onPress={handleForgotSendOtp} disabled={fpLoading} testID="fp-send-otp-btn">
                  {fpLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send OTP</Text>}
                </TouchableOpacity>
              </View>
            )}

            {forgotMode === 'otp' && (
              <View>
                <Text style={styles.fpDesc}>Enter the OTP sent to {fpEmail} and set your new password.</Text>
                <Text style={styles.label}>OTP</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="keypad-outline" size={18} color={COLORS.textMuted} />
                  <TextInput testID="fp-otp-input" style={styles.input} placeholder="Enter 6-digit OTP" placeholderTextColor={COLORS.textMuted} value={fpOtp} onChangeText={setFpOtp} keyboardType="number-pad" maxLength={6} />
                </View>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />
                  <TextInput testID="fp-new-password-input" style={styles.input} placeholder="Enter new password (min 6 chars)" placeholderTextColor={COLORS.textMuted} value={fpNewPassword} onChangeText={setFpNewPassword} secureTextEntry />
                </View>
                <TouchableOpacity style={[styles.btn, fpLoading && styles.btnDisabled]} onPress={handleResetPassword} disabled={fpLoading} testID="fp-reset-btn">
                  {fpLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Reset Password</Text>}
                </TouchableOpacity>
              </View>
            )}

            {forgotMode === 'done' && (
              <TouchableOpacity style={styles.btn} onPress={resetForgotMode} testID="fp-back-to-login-btn">
                <Text style={styles.btnText}>Back to Login</Text>
              </TouchableOpacity>
            )}

            {forgotMode !== 'done' && (
              <TouchableOpacity onPress={resetForgotMode} style={styles.linkRow} testID="fp-cancel-btn">
                <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
                <Text style={styles.linkBold}> Back to Login</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Login UI
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoBox}>
            <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.brand}>GS PINNACLE IAS</Text>
            <Text style={styles.subtitle}>Welcome Back</Text>
          </View>

          {error ? (
            <View style={styles.errorBox} testID="login-error">
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />
              <TextInput testID="login-email-input" style={styles.input} placeholder="Enter your email" placeholderTextColor={COLORS.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />
              <TextInput testID="login-password-input" style={styles.input} placeholder="Enter your password" placeholderTextColor={COLORS.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} testID="toggle-password">
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity onPress={() => setForgotMode('email')} style={styles.forgotRow} testID="forgot-password-link">
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity testID="login-submit-button" style={[styles.btn, loading && styles.btnDisabled]} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.linkRow} testID="goto-register">
            <Text style={styles.linkText}>Don't have an account? </Text>
            <Text style={styles.linkBold}>Register Now</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  logoBox: { alignItems: 'center', marginTop: 40, marginBottom: 32 },
  logo: { width: width * 0.25, height: width * 0.25 },
  brand: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 2, marginTop: 12 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4 },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.errorBg, padding: 12, borderRadius: 10, marginBottom: 16, gap: 8 },
  errorText: { color: COLORS.error, fontSize: 13, flex: 1 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgSubtle, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, height: 50, gap: 10 },
  input: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  forgotRow: { alignSelf: 'flex-end', marginBottom: 12, marginTop: -8 },
  forgotText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  btn: { backgroundColor: COLORS.primary, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  linkText: { fontSize: 14, color: COLORS.textSecondary },
  linkBold: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
  fpDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16, lineHeight: 20 },
  msgBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 16, gap: 8 },
  infoBg: { backgroundColor: '#EFF6FF' },
  successBg: { backgroundColor: COLORS.successBg },
  msgText: { fontSize: 13, flex: 1 },
});
