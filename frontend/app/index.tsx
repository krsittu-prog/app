import { useEffect, useState, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/theme';

const SHLOKAS = [
  { sanskrit: 'उत्तिष्ठत जाग्रत\nप्राप्य वरान्निबोधत', english: 'Arise, Awake, and Stop Not\nTill the Goal is Reached' },
  { sanskrit: 'विद्या ददाति विनयम्', english: 'Knowledge Gives Humility' },
  { sanskrit: 'सा विद्या या विमुक्तये', english: 'That is Knowledge Which Liberates' },
  { sanskrit: 'तमसो मा ज्योतिर्गमय', english: 'Lead Me from Darkness to Light' },
  { sanskrit: 'योगः कर्मसु कौशलम्', english: 'Yoga is Excellence in Action' },
];

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [currentShloka, setCurrentShloka] = useState(0);
  const [showShlokas, setShowShlokas] = useState(false);
  const logoFade = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const shlokaFade = useRef(new Animated.Value(0)).current;
  const navigated = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoFade, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        setShowShlokas(true);
        animateShlokas();
      }, 800);
    });
  }, []);

  function animateShlokas() {
    const picked = pickRandom(SHLOKAS, 3);
    let index = 0;
    function showNext() {
      if (index >= picked.length) {
        doNavigate();
        return;
      }
      setCurrentShloka(SHLOKAS.indexOf(picked[index]));
      Animated.sequence([
        Animated.timing(shlokaFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(shlokaFade, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => {
        index++;
        showNext();
      });
    }
    showNext();
  }

  function pickRandom(arr: typeof SHLOKAS, n: number) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
  }

  function doNavigate() {
    if (navigated.current) return;
    if (loading) {
      const interval = setInterval(() => {
        if (!loading) {
          clearInterval(interval);
          performNav();
        }
      }, 100);
      setTimeout(() => { clearInterval(interval); performNav(); }, 3000);
    } else {
      performNav();
    }
  }

  function performNav() {
    if (navigated.current) return;
    navigated.current = true;
    if (user) {
      if (user.role === 'admin' || user.role === 'teacher') {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(tabs)/home');
      }
    } else {
      router.replace('/(auth)/login');
    }
  }

  return (
    <View style={styles.container} testID="splash-screen">
      <View style={styles.overlay} />
      <View style={styles.contentWrapper}>
        <Animated.Image
          source={require('../assets/images/logo.png')}
          style={[styles.logo, { opacity: logoFade, transform: [{ scale: logoScale }] }]}
          resizeMode="contain"
          testID="splash-logo"
        />
        <Animated.View style={[styles.titleRow, { opacity: logoFade }]}>
          <Text style={styles.brandName}>GS PINNACLE IAS</Text>
          <Text style={styles.tagline}>Excellence in Civil Services Preparation</Text>
        </Animated.View>
      </View>
      {showShlokas && (
        <Animated.View style={[styles.shlokaBox, { opacity: shlokaFade }]}>
          <Text style={styles.sanskrit}>{SHLOKAS[currentShloka].sanskrit}</Text>
          <View style={styles.shlokaLine} />
          <Text style={styles.english}>{SHLOKAS[currentShloka].english}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1628', alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,22,40,0.85)', pointerEvents: 'none' },
  contentWrapper: { zIndex: 2, alignItems: 'center', justifyContent: 'center', flex: 1 },
  logo: { width: width * 0.4, height: width * 0.4 },
  titleRow: { alignItems: 'center', marginTop: 20 },
  brandName: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: 3 },
  tagline: { fontSize: 13, color: '#94A3B8', marginTop: 6, letterSpacing: 1 },
  shlokaBox: { position: 'absolute', bottom: 80, alignItems: 'center', paddingHorizontal: 30, zIndex: 2 },
  sanskrit: { fontSize: 20, color: '#F59E0B', fontWeight: '600', textAlign: 'center', lineHeight: 30 },
  shlokaLine: { width: 40, height: 1, backgroundColor: '#F59E0B', marginVertical: 10 },
  english: { fontSize: 13, color: '#CBD5E1', textAlign: 'center', fontStyle: 'italic', lineHeight: 20 },
});
