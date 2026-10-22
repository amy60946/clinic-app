import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './src/lib/webAlert';
import { AuthProvider, useAuth } from './src/lib/auth';
import { colors } from './src/theme';
import {
  LoginScreen, SignUpScreen, ForgotPasswordScreen, NewPasswordScreen, AuthRoute,
} from './src/screens/AuthScreens';
import HomeScreen from './src/screens/HomeScreen';
import { NotificationsProvider } from './src/lib/notificationsContext';
import { startTracking } from './src/lib/track';

function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.navy} />
    </View>
  );
}

function AuthFlow() {
  const { noAccount, clearNoAccount } = useAuth();
  const [route, setRoute] = useState<{ name: AuthRoute; email?: string }>({ name: noAccount ? 'noaccount' : 'login' });
  useEffect(() => clearNoAccount(), [clearNoAccount]);
  const go = (name: AuthRoute, email?: string) => setRoute({ name, email });
  if (route.name === 'signup' || route.name === 'join' || route.name === 'noaccount') {
    return <SignUpScreen key={route.name} go={go} initialJoin={route.name === 'join'} noAccount={route.name === 'noaccount'} />;
  }
  if (route.name === 'forgot') return <ForgotPasswordScreen go={go} initialEmail={route.email} />;
  return <LoginScreen key={route.email ?? ''} go={go} initialEmail={route.email} />;
}

function Root() {
  const { session, loading, recovery } = useAuth();
  if (loading) return <Loading />;
  if (recovery && session) return <NewPasswordScreen />;
  if (!session) return <AuthFlow />;
  return (
    <NotificationsProvider key={session.user.id} userId={session.user.id}>
      <Tracking />
      <HomeScreen />
    </NotificationsProvider>
  );
}

// Giriş yapılınca birinci taraf kullanım kaydı (oturum + olaylar; ortak/sozlesme/akislar.md 9)
function Tracking() {
  useEffect(() => startTracking(), []);
  return null;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
