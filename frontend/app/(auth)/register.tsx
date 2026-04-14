import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { apiCall } from '../../src/api';
import { COLORS, TARGET_COURSES } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState({ phone: false, email: false });

  function toggleCourse(course: string) {
    setSelectedCourses(prev => prev.includes(course) ? prev.filter(c => c !== course) : [...prev, course]);
  }

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (phone.length < 10) { setError('Enter valid 10-digit phone number'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError('');
    try {
      await register({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), password, target_courses: selectedCourses });
      setStep(4);
      sendPhoneOtp();
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function sendPhoneOtp() {
    try {
      await apiCall('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ type: 'phone', identifier: phone.trim() }) });
      setOtpSent(p => ({ ...p, phone: true }));
    } catch (e) { /* OTP may fail but user can still verify via logged OTP */ }
  }

  async function sendEmailOtp() {
    try {
      await apiCall('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ type: 'email', identifier: email.trim().toLowerCase() }) });
      setOtpSent(p => ({ ...p, email: true }));
    } catch (e) { /* */ }
  }

  async function verifyPhoneOtp() {
    setLoading(true);
    setError('');
    try {
      await apiCall('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ identifier: phone.trim(), otp: phoneOtp }) });
      setStep(5);
      sendEmailOtp();
    } catch (e: any) {
      setError(e.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  async function verifyEmailOtp() {
    setLoading(true);
    setError('');
    try {
      await apiCall('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ identifier: email.trim().toLowerCase(), otp: emailOtp }) });
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(e.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  function skipOtp() {
    router.replace('/(tabs)/home');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Progress Bar */}
          <View style={styles.progressRow}>
            {[1, 2, 3, 4, 5].map(s => (
              <View key={s} style={[styles.progressDot, s <= step && styles.progressActive]}>
                {s < step ? <Ionicons name="checkmark" size={12} color="#fff" /> : <Text style={[styles.progressNum, s <= step && { color: '#fff' }]}>{s}</Text>}
              </View>
            ))}
          </View>
          <Text style={styles.stepTitle}>
            {step === 1 ? 'Personal Details' : step === 2 ? 'Contact Information' : step === 3 ? 'Target Courses' : step === 4 ? 'Verify Phone' : 'Verify Email'}
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {step === 1 && (
            <View>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={18} color={COLORS.textMuted} />
                <TextInput testID="register-name-input" style={styles.input} placeholder="Enter your full name" placeholderTextColor={COLORS.textMuted} value={name} onChangeText={setName} />
              </View>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />
                <TextInput testID="register-password-input" style={styles.input} placeholder="Create password (min 6 chars)" placeholderTextColor={COLORS.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
              </View>
              <TouchableOpacity style={styles.btn} onPress={() => { if (name.trim() && password.length >= 6) { setError(''); setStep(2); } else { setError('Fill in name and password (min 6 chars)'); } }} testID="register-next-1">
                <Text style={styles.btnText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />
                <TextInput testID="register-email-input" style={styles.input} placeholder="Enter your email" placeholderTextColor={COLORS.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              </View>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputRow}>
                <Text style={styles.prefix}>+91</Text>
                <TextInput testID="register-phone-input" style={styles.input} placeholder="Enter 10-digit number" placeholderTextColor={COLORS.textMuted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} />
              </View>
              <View style={styles.row}>
                <TouchableOpacity style={styles.btnOutline} onPress={() => setStep(1)} testID="register-back-2">
                  <Text style={styles.btnOutlineText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={() => { if (email.trim() && phone.length === 10) { setError(''); setStep(3); } else { setError('Enter valid email and phone'); } }} testID="register-next-2">
                  <Text style={styles.btnText}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.label}>Select Your Target Exam(s)</Text>
              <View style={styles.chipGrid}>
                {TARGET_COURSES.map(course => (
                  <TouchableOpacity key={course} style={[styles.chip, selectedCourses.includes(course) && styles.chipActive]} onPress={() => toggleCourse(course)} testID={`course-chip-${course}`}>
                    <Text style={[styles.chipText, selectedCourses.includes(course) && styles.chipTextActive]}>{course}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.row}>
                <TouchableOpacity style={styles.btnOutline} onPress={() => setStep(2)} testID="register-back-3">
                  <Text style={styles.btnOutlineText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { flex: 1 }, loading && styles.btnDisabled]} onPress={handleRegister} disabled={loading} testID="register-submit-button">
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {step === 4 && (
            <View>
              <Text style={styles.otpDesc}>OTP sent to +91 {phone}</Text>
              <View style={styles.inputRow}>
                <Ionicons name="keypad-outline" size={18} color={COLORS.textMuted} />
                <TextInput testID="phone-otp-input" style={styles.input} placeholder="Enter 6-digit OTP" placeholderTextColor={COLORS.textMuted} value={phoneOtp} onChangeText={setPhoneOtp} keyboardType="number-pad" maxLength={6} />
              </View>
              <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={verifyPhoneOtp} disabled={loading} testID="verify-phone-otp-btn">
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify Phone</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={sendPhoneOtp} style={styles.resendBtn} testID="resend-phone-otp">
                <Text style={styles.resendText}>Resend OTP</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={skipOtp} style={styles.skipBtn} testID="skip-otp">
                <Text style={styles.skipText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 5 && (
            <View>
              <Text style={styles.otpDesc}>OTP sent to {email}</Text>
              <View style={styles.inputRow}>
                <Ionicons name="keypad-outline" size={18} color={COLORS.textMuted} />
                <TextInput testID="email-otp-input" style={styles.input} placeholder="Enter 6-digit OTP" placeholderTextColor={COLORS.textMuted} value={emailOtp} onChangeText={setEmailOtp} keyboardType="number-pad" maxLength={6} />
              </View>
              <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={verifyEmailOtp} disabled={loading} testID="verify-email-otp-btn">
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify Email</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={sendEmailOtp} style={styles.resendBtn} testID="resend-email-otp">
                <Text style={styles.resendText}>Resend OTP</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={skipOtp} style={styles.skipBtn} testID="skip-email-otp">
                <Text style={styles.skipText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          )}

          {step < 4 && (
            <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.linkRow} testID="goto-login">
              <Text style={styles.linkText}>Already have an account? </Text>
              <Text style={styles.linkBold}>Sign In</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 20 },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 20 },
  progressDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.bgMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  progressActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  progressNum: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  stepTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 20 },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.errorBg, padding: 12, borderRadius: 10, marginBottom: 16, gap: 8 },
  errorText: { color: COLORS.error, fontSize: 13, flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6, marginTop: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgSubtle, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, height: 50, gap: 10 },
  input: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  prefix: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  btn: { backgroundColor: COLORS.primary, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnOutline: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 20, marginTop: 20, marginRight: 10 },
  btnOutlineText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.bgSubtle, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  otpDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20, marginTop: 10 },
  resendBtn: { alignItems: 'center', marginTop: 16 },
  resendText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  skipBtn: { alignItems: 'center', marginTop: 12 },
  skipText: { color: COLORS.textMuted, fontSize: 13 },
  linkRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  linkText: { fontSize: 14, color: COLORS.textSecondary },
  linkBold: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
});
