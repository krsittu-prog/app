import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiCall, formatPrice, getCourseTypeBadge } from '../../src/api';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

function openVideo(router: any, course: any, video: any) {
  router.push({
    pathname: '/player',
    params: {
      courseId: course.id,
      videoId: video.id,
      videoUrl: video.url,
      videoTitle: video.title,
      courseName: course.title,
      chatEnabled: course.chat_enabled !== false ? 'true' : 'false',
    },
  });
}

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);

  useEffect(() => { fetchCourse(); checkEnrollment(); }, [id]);

  async function fetchCourse() {
    try {
      const data = await apiCall(`/api/courses/${id}`);
      setCourse(data);
    } catch (e) { /* */ }
    setLoading(false);
  }

  async function checkEnrollment() {
    try {
      const data = await apiCall('/api/enrollments/my');
      const isEnrolled = (data.enrollments || []).some((e: any) => e.course_id === id);
      setEnrolled(isEnrolled);
    } catch (e) { /* */ }
  }

  async function handleEnroll() {
    if (!course) return;
    if (course.price === 0) {
      setEnrolling(true);
      try {
        // Free course - direct enroll via backend
        await apiCall('/api/payments/verify', {
          method: 'POST',
          body: JSON.stringify({ order_id: 'free', payment_id: 'free', signature: 'free', course_id: course.id }),
        });
        setEnrolled(true);
      } catch (e) {
        setEnrolled(true);
      }
      setEnrolling(false);
      return;
    }
    // Paid course - create Razorpay order then open checkout
    setEnrolling(true);
    try {
      const orderData = await apiCall('/api/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({ course_id: course.id, amount: course.price * 100 }),
      });
      setPaymentData(orderData);
      setShowPayment(true);
    } catch (e: any) {
      alert(e.message || 'Failed to create order');
    }
    setEnrolling(false);
  }

  async function handlePaymentSuccess(paymentId: string, signature: string) {
    setShowPayment(false);
    setEnrolling(true);
    try {
      await apiCall('/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify({
          order_id: paymentData.order_id,
          payment_id: paymentId,
          signature: signature,
          course_id: course.id,
        }),
      });
      setEnrolled(true);
      alert('Payment successful! You are now enrolled.');
    } catch (e: any) {
      alert(e.message || 'Payment verification failed');
    }
    setEnrolling(false);
  }

  function handlePaymentDismiss() {
    setShowPayment(false);
  }

  function getRazorpayHtml() {
    if (!paymentData || !course) return '';
    return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;font-family:-apple-system,sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#fff;border-radius:16px;padding:32px;max-width:400px;width:90%;box-shadow:0 4px 20px rgba(0,0,0,.1);text-align:center}
h2{color:#0f172a;font-size:20px;margin:0 0 4px}
.price{font-size:32px;font-weight:800;color:#2563eb;margin:16px 0}
.sub{color:#64748b;font-size:14px;margin-bottom:24px}
.btn{background:#2563eb;color:#fff;border:none;padding:14px 32px;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;width:100%}
.btn:hover{background:#1d4ed8}
.secure{color:#64748b;font-size:11px;margin-top:16px}
.cancel{color:#64748b;font-size:13px;margin-top:12px;cursor:pointer;text-decoration:underline;border:none;background:none}
</style>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head><body>
<div class="card">
<h2>${course.title}</h2>
<div class="price">₹${course.price.toLocaleString('en-IN')}</div>
<div class="sub">Secure payment via Razorpay</div>
<button class="btn" id="payBtn" onclick="openRazorpay()">Pay Now</button>
<div class="secure">🔒 100% Secure Payment</div>
<button class="cancel" onclick="cancelPayment()">Cancel</button>
</div>
<script>
function openRazorpay(){
  var options={
    key:'${paymentData.key_id}',
    amount:${paymentData.amount},
    currency:'INR',
    name:'GS Pinnacle IAS',
    description:'${course.title}',
    order_id:'${paymentData.order_id}',
    prefill:{name:'${user?.name||""}',email:'${user?.email||""}',contact:'${user?.phone||""}'},
    theme:{color:'#2563EB'},
    handler:function(response){
      window.ReactNativeWebView?window.ReactNativeWebView.postMessage(JSON.stringify({type:'success',payment_id:response.razorpay_payment_id,signature:response.razorpay_signature})):window.parent.postMessage(JSON.stringify({type:'success',payment_id:response.razorpay_payment_id,signature:response.razorpay_signature}),'*');
    },
    modal:{ondismiss:function(){
      window.ReactNativeWebView?window.ReactNativeWebView.postMessage(JSON.stringify({type:'dismissed'})):window.parent.postMessage(JSON.stringify({type:'dismissed'}),'*');
    }}
  };
  var rzp=new Razorpay(options);
  rzp.on('payment.failed',function(r){
    window.ReactNativeWebView?window.ReactNativeWebView.postMessage(JSON.stringify({type:'failed',error:r.error.description})):window.parent.postMessage(JSON.stringify({type:'failed',error:r.error.description}),'*');
  });
  rzp.open();
}
function cancelPayment(){
  window.ReactNativeWebView?window.ReactNativeWebView.postMessage(JSON.stringify({type:'dismissed'})):window.parent.postMessage(JSON.stringify({type:'dismissed'}),'*');
}
</script></body></html>`;
  }

  if (loading) return <SafeAreaView style={styles.safe}><ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} /></SafeAreaView>;
  if (!course) return <SafeAreaView style={styles.safe}><Text style={styles.errorText}>Course not found</Text></SafeAreaView>;

  const badge = getCourseTypeBadge(course.type);

  return (
    <SafeAreaView style={styles.safe} testID="course-detail-screen">
      <ScrollView>
        {/* Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} testID="back-button">
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Course Details</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: badge.bg }]}>
          <View style={[styles.heroBadge, { backgroundColor: badge.color }]}>
            <Text style={styles.heroBadgeText}>{badge.label}</Text>
          </View>
          <Ionicons name={course.type === 'live' ? 'videocam' : course.type === 'free' ? 'gift' : 'play-circle'} size={64} color={badge.color} />
        </View>

        <View style={styles.body}>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="person" size={14} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{course.instructor}</Text>
            <Ionicons name="folder" size={14} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{course.category}</Text>
            <Ionicons name="people" size={14} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{course.students_enrolled || 0}</Text>
          </View>

          <Text style={styles.description}>{course.description}</Text>

          {/* Features */}
          {course.features?.length > 0 && (
            <View style={styles.featuresBox}>
              <Text style={styles.featuresTitle}>What's Included</Text>
              {course.features.map((f: string, i: number) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Videos */}
          {course.videos?.length > 0 && (
            <View style={styles.videosBox}>
              <Text style={styles.videosTitle}>Course Content ({course.videos.length} videos)</Text>
              {course.videos.map((v: any, i: number) => (
                <TouchableOpacity key={v.id} style={styles.videoRow} onPress={() => openVideo(router, course, v)} testID={`play-video-${v.id}`}>
                  <View style={styles.videoNum}><Ionicons name="play" size={12} color="#fff" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.videoTitle}>{v.title}</Text>
                    {v.duration > 0 && <Text style={styles.videoDuration}>{Math.floor(v.duration / 60)}:{String(v.duration % 60).padStart(2, '0')} min</Text>}
                  </View>
                  <View style={styles.videoStats}>
                    <Ionicons name="play-circle" size={20} color={COLORS.primary} />
                    <Text style={styles.viewCount}>{v.total_views || 0} views</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.priceValue}>{formatPrice(course.price)}</Text>
        </View>
        {enrolled ? (
          <View style={styles.enrolledBadge}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            <Text style={styles.enrolledText}>Enrolled</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.enrollBtn, enrolling && { opacity: 0.7 }]}
            onPress={handleEnroll}
            disabled={enrolling}
            testID="enroll-button"
          >
            {enrolling ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.enrollBtnText}>{course.price === 0 ? 'Enroll Free' : 'Buy Now'}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Razorpay Payment Modal */}
      {showPayment && paymentData && (
        <Modal visible={showPayment} animationType="slide" transparent testID="payment-modal">
          <View style={styles.paymentOverlay}>
            <View style={styles.paymentContainer}>
              <View style={styles.paymentHeader}>
                <Text style={styles.paymentTitle}>Complete Payment</Text>
                <TouchableOpacity onPress={handlePaymentDismiss} testID="close-payment-modal">
                  <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>
              {Platform.OS === 'web' ? (
                <iframe
                  srcDoc={getRazorpayHtml()}
                  style={{ width: '100%', height: 500, border: 'none', borderRadius: 12 } as any}
                  ref={(ref: any) => {
                    if (ref) {
                      const handler = (event: MessageEvent) => {
                        try {
                          const data = JSON.parse(event.data);
                          if (data.type === 'success') handlePaymentSuccess(data.payment_id, data.signature);
                          else if (data.type === 'dismissed' || data.type === 'failed') handlePaymentDismiss();
                        } catch (e) { /* */ }
                      };
                      window.addEventListener('message', handler);
                    }
                  }}
                />
              ) : (
                (() => { const { WebView } = require('react-native-webview'); return (
                  <WebView
                    source={{ html: getRazorpayHtml() }}
                    style={{ flex: 1, minHeight: 500 }}
                    javaScriptEnabled
                    onMessage={(event: any) => {
                      try {
                        const data = JSON.parse(event.nativeEvent.data);
                        if (data.type === 'success') handlePaymentSuccess(data.payment_id, data.signature);
                        else if (data.type === 'dismissed' || data.type === 'failed') handlePaymentDismiss();
                      } catch (e) { /* */ }
                    }}
                    testID="razorpay-webview"
                  />
                ); })()
              )}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  topBarTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  hero: { height: 160, alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, borderRadius: 16, marginBottom: 16 },
  heroBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  heroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  body: { paddingHorizontal: 20, paddingBottom: 100 },
  courseTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, lineHeight: 30 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  metaText: { fontSize: 13, color: COLORS.textMuted, marginRight: 8 },
  description: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, marginTop: 16 },
  featuresBox: { marginTop: 20, backgroundColor: COLORS.bgSubtle, borderRadius: 12, padding: 16 },
  featuresTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  featureText: { fontSize: 14, color: COLORS.textSecondary },
  videosBox: { marginTop: 20 },
  videosTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  videoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgSubtle, padding: 12, borderRadius: 10, marginBottom: 6, gap: 10 },
  videoNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  videoNumText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  videoTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  videoDuration: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  videoStats: { alignItems: 'flex-end' },
  viewCount: { fontSize: 10, color: COLORS.textMuted },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  priceLabel: { fontSize: 11, color: COLORS.textMuted },
  priceValue: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  enrollBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  enrollBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  enrolledBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.successBg, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  enrolledText: { color: COLORS.success, fontSize: 15, fontWeight: '700' },
  errorText: { fontSize: 16, color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },
});
