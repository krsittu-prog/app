import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Modal, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { apiCall, formatPrice, getCourseTypeBadge } from '../../src/api';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentHtml, setPaymentHtml] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => { fetchAll(); }, [id]);

  async function fetchAll() {
    try {
      const [courseRes, sectionsRes, enrollRes] = await Promise.all([
        apiCall(`/api/courses/${id}`),
        apiCall(`/api/courses/${id}/sections`),
        apiCall('/api/enrollments/my').catch(() => ({ enrollments: [] })),
      ]);
      setCourse(courseRes);
      setSections(sectionsRes.sections || []);
      const isEnrolled = (enrollRes.enrollments || []).some((e: any) => e.course_id === id);
      setEnrolled(isEnrolled);
    } catch (e) { /* */ }
    setLoading(false);
  }

  function toggleSection(sectionId: string) {
    setExpandedSections(prev => {
      const n = new Set(prev);
      if (n.has(sectionId)) n.delete(sectionId); else n.add(sectionId);
      return n;
    });
  }

  function canAccessSection(section: any): boolean {
    if (!course) return false;
    if (course.price === 0) return true;
    if (enrolled) return true;
    if (user?.role === 'admin' || user?.role === 'teacher') return true;
    return !section.is_locked;
  }

  function openVideo(video: any) {
    router.push({
      pathname: '/player',
      params: { courseId: course.id, videoId: video.id, videoUrl: video.url, videoTitle: video.title, courseName: course.title, chatEnabled: course.chat_enabled !== false ? 'true' : 'false' },
    });
  }

  function downloadMaterial(material: any) {
    const url = `${BACKEND_URL}/api/materials/${material.id}/download`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Cannot open file'));
  }

  async function handleEnroll() {
    if (!course) return;
    if (course.price === 0) {
      setEnrolling(true);
      try {
        await apiCall('/api/enrollments/my'); // just to have a token check
        setEnrolled(true);
        Alert.alert('Enrolled!', 'You have been enrolled in this free course.');
      } catch (e) { setEnrolled(true); }
      setEnrolling(false);
      return;
    }
    setEnrolling(true);
    try {
      const orderData = await apiCall('/api/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({ course_id: course.id, amount: course.price * 100 }),
      });
      const html = buildRazorpayHtml(orderData);
      setPaymentHtml(html);
      setShowPayment(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create order');
    }
    setEnrolling(false);
  }

  function buildRazorpayHtml(orderData: any) {
    return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}
.c{background:#fff;border-radius:16px;padding:28px;max-width:380px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}
h2{font-size:18px;color:#0f172a;margin-bottom:4px}
.p{font-size:32px;font-weight:800;color:#2563eb;margin:16px 0}
.s{color:#64748b;font-size:13px;margin-bottom:20px}
.b{background:#2563eb;color:#fff;border:none;padding:14px;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;width:100%;margin-bottom:8px}
.b:active{background:#1d4ed8}
.x{color:#64748b;font-size:13px;cursor:pointer;border:none;background:none;padding:8px;text-decoration:underline}
.lock{font-size:11px;color:#64748b;margin-top:12px}</style>
<script src="https://checkout.razorpay.com/v1/checkout.js"><\/script>
</head><body><div class="c">
<h2>${course?.title || 'Course'}</h2>
<div class="p">\u20B9${course?.price?.toLocaleString('en-IN') || '0'}</div>
<div class="s">Secure payment via Razorpay</div>
<button class="b" onclick="pay()">Pay Now</button>
<button class="x" onclick="cancel()">Cancel</button>
<div class="lock">\uD83D\uDD12 100% Secure Payment</div>
</div><script>
function msg(d){window.ReactNativeWebView?window.ReactNativeWebView.postMessage(JSON.stringify(d)):window.parent.postMessage(JSON.stringify(d),'*')}
function pay(){var o={key:'${orderData.key_id}',amount:${orderData.amount},currency:'INR',name:'GS Pinnacle IAS',description:'${course?.title?.replace(/'/g, "\\'")}',order_id:'${orderData.order_id}',prefill:{name:'${user?.name||""}',email:'${user?.email||""}',contact:'${user?.phone||""}'},theme:{color:'#2563EB'},handler:function(r){msg({type:'success',payment_id:r.razorpay_payment_id,signature:r.razorpay_signature})},modal:{ondismiss:function(){msg({type:'dismissed'})}}};var rzp=new Razorpay(o);rzp.on('payment.failed',function(r){msg({type:'failed',error:r.error.description})});rzp.open()}
function cancel(){msg({type:'dismissed'})}
<\/script></body></html>`;
  }

  function handlePaymentMessage(event: any) {
    try {
      const data = JSON.parse(event.nativeEvent?.data || event.data || '{}');
      if (data.type === 'success') {
        setShowPayment(false);
        verifyPayment(data.payment_id, data.signature);
      } else if (data.type === 'dismissed' || data.type === 'failed') {
        setShowPayment(false);
        if (data.type === 'failed') Alert.alert('Payment Failed', data.error || 'Please try again');
      }
    } catch (e) { /* */ }
  }

  async function verifyPayment(paymentId: string, signature: string) {
    try {
      await apiCall('/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify({ order_id: paymentHtml.match(/order_id:'([^']+)'/)?.[1] || '', payment_id: paymentId, signature, course_id: course.id }),
      });
      setEnrolled(true);
      Alert.alert('Payment Successful!', 'You are now enrolled. A receipt has been sent to your email.');
      fetchAll();
    } catch (e: any) {
      Alert.alert('Verification Failed', e.message || 'Please contact support.');
    }
  }

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /></SafeAreaView>;
  if (!course) return <SafeAreaView style={s.safe}><Text style={s.errorText}>Course not found</Text></SafeAreaView>;
  const badge = getCourseTypeBadge(course.type);

  return (
    <SafeAreaView style={s.safe} testID="course-detail-screen">
      <ScrollView>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} testID="back-button"><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
          <Text style={s.topBarTitle}>Course Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={[s.hero, { backgroundColor: badge.bg }]}>
          <View style={[s.heroBadge, { backgroundColor: badge.color }]}><Text style={s.heroBadgeText}>{badge.label}</Text></View>
          <Ionicons name={course.type === 'live' ? 'videocam' : course.type === 'free' ? 'gift' : 'play-circle'} size={64} color={badge.color} />
        </View>
        <View style={s.body}>
          <Text style={s.courseTitle}>{course.title}</Text>
          <View style={s.metaRow}>
            <Ionicons name="person" size={14} color={COLORS.textMuted} /><Text style={s.metaText}>{course.instructor}</Text>
            <Ionicons name="folder" size={14} color={COLORS.textMuted} /><Text style={s.metaText}>{course.category}</Text>
            <Ionicons name="people" size={14} color={COLORS.textMuted} /><Text style={s.metaText}>{course.students_enrolled || 0}</Text>
          </View>
          <Text style={s.desc}>{course.description}</Text>
          {course.features?.length > 0 && (
            <View style={s.featBox}>
              <Text style={s.featTitle}>What's Included</Text>
              {course.features.map((f: string, i: number) => (
                <View key={i} style={s.featRow}><Ionicons name="checkmark-circle" size={16} color={COLORS.success} /><Text style={s.featText}>{f}</Text></View>
              ))}
            </View>
          )}

          {/* Course Content - Sections/Folders */}
          <Text style={s.contentTitle}>Course Content</Text>
          {sections.length > 0 ? sections.map((section, idx) => {
            const isOpen = expandedSections.has(section.id);
            const canAccess = canAccessSection(section);
            const vCount = section.videos?.length || 0;
            const mCount = section.materials?.length || 0;
            return (
              <View key={section.id} style={s.sectionCard} testID={`section-${section.id}`}>
                <TouchableOpacity style={s.sectionHeader} onPress={() => canAccess ? toggleSection(section.id) : Alert.alert('Locked', 'Enroll in this course to access this section')} testID={`toggle-section-${section.id}`}>
                  <View style={[s.sectionIcon, canAccess ? s.unlockedIcon : s.lockedIcon]}>
                    <Ionicons name={canAccess ? (isOpen ? 'folder-open' : 'folder') : 'lock-closed'} size={18} color={canAccess ? COLORS.primary : COLORS.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.sectionTitle}>{section.title}</Text>
                    <Text style={s.sectionMeta}>{vCount} lecture{vCount !== 1 ? 's' : ''} • {mCount} file{mCount !== 1 ? 's' : ''}</Text>
                  </View>
                  {canAccess ? (
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textMuted} />
                  ) : (
                    <View style={s.lockBadge}><Ionicons name="lock-closed" size={10} color={COLORS.error} /><Text style={s.lockText}>Locked</Text></View>
                  )}
                </TouchableOpacity>
                {isOpen && canAccess && (
                  <View style={s.sectionContent}>
                    {section.videos?.map((v: any) => (
                      <TouchableOpacity key={v.id} style={s.contentRow} onPress={() => openVideo(v)} testID={`play-video-${v.id}`}>
                        <View style={s.playIcon}><Ionicons name="play" size={12} color="#fff" /></View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.contentItemTitle}>{v.title}</Text>
                          {v.duration > 0 && <Text style={s.contentItemSub}>{Math.floor(v.duration / 60)}:{String(v.duration % 60).padStart(2, '0')} min</Text>}
                        </View>
                        <Ionicons name="play-circle" size={22} color={COLORS.primary} />
                      </TouchableOpacity>
                    ))}
                    {section.materials?.map((m: any) => (
                      <TouchableOpacity key={m.id} style={s.contentRow} onPress={() => downloadMaterial(m)} testID={`download-material-${m.id}`}>
                        <View style={s.pdfIcon}><Ionicons name="document-text" size={14} color={COLORS.accent} /></View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.contentItemTitle}>{m.title}</Text>
                          <Text style={s.contentItemSub}>{m.filename}</Text>
                        </View>
                        <Ionicons name="download" size={20} color={COLORS.accent} />
                      </TouchableOpacity>
                    ))}
                    {vCount === 0 && mCount === 0 && <Text style={s.emptySection}>No content in this section yet</Text>}
                  </View>
                )}
              </View>
            );
          }) : (
            <View style={s.noSections}><Ionicons name="folder-open-outline" size={40} color={COLORS.textMuted} /><Text style={s.noSectionsText}>Content coming soon</Text></View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={s.bottomBar}>
        <View><Text style={s.priceLabel}>Price</Text><Text style={s.priceValue}>{formatPrice(course.price)}</Text></View>
        {enrolled ? (
          <View style={s.enrolledBadge}><Ionicons name="checkmark-circle" size={18} color={COLORS.success} /><Text style={s.enrolledText}>Enrolled</Text></View>
        ) : (
          <TouchableOpacity style={[s.enrollBtn, enrolling && { opacity: 0.7 }]} onPress={handleEnroll} disabled={enrolling} testID="enroll-button">
            {enrolling ? <ActivityIndicator color="#fff" /> : <Text style={s.enrollBtnText}>{course.price === 0 ? 'Enroll Free' : 'Buy Now'}</Text>}
          </TouchableOpacity>
        )}
      </View>

      {/* Razorpay Payment Modal */}
      <Modal visible={showPayment} animationType="slide" transparent testID="payment-modal">
        <View style={s.payOverlay}>
          <View style={s.payCont}>
            <View style={s.payHead}>
              <Text style={s.payTitle}>Complete Payment</Text>
              <TouchableOpacity onPress={() => setShowPayment(false)} testID="close-payment"><Ionicons name="close" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
            </View>
            <WebView
              source={{ html: paymentHtml }}
              style={{ flex: 1, minHeight: 400 }}
              javaScriptEnabled
              domStorageEnabled
              onMessage={handlePaymentMessage}
              testID="razorpay-webview"
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  topBarTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  hero: { height: 140, alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, borderRadius: 16, marginBottom: 16 },
  heroBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  heroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  body: { paddingHorizontal: 20, paddingBottom: 100 },
  courseTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, lineHeight: 28 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: COLORS.textMuted, marginRight: 8 },
  desc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, marginTop: 12 },
  featBox: { marginTop: 16, backgroundColor: COLORS.bgSubtle, borderRadius: 12, padding: 14 },
  featTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  featText: { fontSize: 13, color: COLORS.textSecondary },
  contentTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginTop: 20, marginBottom: 12 },
  sectionCard: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  sectionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  unlockedIcon: { backgroundColor: '#EFF6FF' },
  lockedIcon: { backgroundColor: COLORS.bgMuted },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  sectionMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.errorBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  lockText: { fontSize: 10, fontWeight: '700', color: COLORS.error },
  sectionContent: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 6 },
  contentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.bgSubtle },
  playIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  pdfIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.warningBg, alignItems: 'center', justifyContent: 'center' },
  contentItemTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  contentItemSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  emptySection: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 12 },
  noSections: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  noSectionsText: { fontSize: 14, color: COLORS.textMuted },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  priceLabel: { fontSize: 11, color: COLORS.textMuted },
  priceValue: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  enrollBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  enrollBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  enrolledBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.successBg, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  enrolledText: { color: COLORS.success, fontSize: 14, fontWeight: '700' },
  errorText: { fontSize: 16, color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },
  payOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  payCont: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', minHeight: 480 },
  payHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  payTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
});
