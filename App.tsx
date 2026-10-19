import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './src/lib/webAlert';
import { AuthProvider, useAuth } from './src/lib/auth';
import { colors } from './src/theme';
import {
  LoginScreen, SignUpScreen, ForgotPasswordScreen, NewPasswordScreen, AuthRoute,
} from './src/screens/AuthScreens';
import HomeScreen from './src/screens/HomeScreen';

function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.navy} />
    </View>
  );
}

function AuthFlow() {
  const [route, setRoute] = useState<{ name: AuthRoute; email?: string }>({ name: 'login' });
  const go = (name: AuthRoute, email?: string) => setRoute({ name, email });
  if (route.name === 'signup') return <SignUpScreen go={go} />;
  if (route.name === 'forgot') return <ForgotPasswordScreen go={go} initialEmail={route.email} />;
  return <LoginScreen key={route.email ?? ''} go={go} initialEmail={route.email} />;
}

function Root() {
  const { session, loading, recovery } = useAuth();
  if (loading) return <Loading />;
  if (recovery && session) return <NewPasswordScreen />;
  if (!session) return <AuthFlow />;
  return <HomeScreen key={session.user.id} />;
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
