import React from 'react';
import { View, ActivityIndicator, Text, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import './src/lib/webAlert';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './src/theme';
import { AuthProvider, useAuth } from './src/lib/auth';
import { DataProvider } from './src/lib/data';
import AuthScreen from './src/screens/AuthScreen';
import ClientsScreen from './src/screens/ClientsScreen';
import ClientDetail from './src/screens/ClientDetail';
import ReportScreen from './src/screens/ReportScreen';
import ClinicScreen from './src/screens/ClinicScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg } };

const icons: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Danışanlar: ['people-outline', 'people'],
  Klinik: ['business-outline', 'business'],
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarStyle: { borderTopColor: colors.line, borderTopWidth: 0.5, backgroundColor: '#fff' },
        tabBarIcon: ({ focused, color, size }) => <Ionicons name={icons[route.name][focused ? 1 : 0]} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Danışanlar" component={ClientsScreen} />
      <Tab.Screen name="Klinik" component={ClinicScreen} />
    </Tab.Navigator>
  );
}

// Dar ekranda danışan ayrıntısı ayrı sayfa
function ClientPage({ route, navigation }: any) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingTop: 8 }}>
        <Ionicons name="chevron-back" size={20} color={colors.navy} />
        <Text style={{ fontSize: 15, color: colors.navy, fontWeight: '600' }}>Danışanlar</Text>
      </Pressable>
      <ClientDetail linkId={route.params.linkId} onReport={() => navigation.navigate('Report', { linkId: route.params.linkId })} onClosed={() => navigation.goBack()} />
    </SafeAreaView>
  );
}

function Loading() {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}><ActivityIndicator color={colors.navy} /></View>;
}

function NotClinician() {
  const { signOut } = useAuth();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14, backgroundColor: colors.bg }}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.navy, textAlign: 'center' }}>Bu bir ebeveyn hesabı</Text>
      <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 }}>
        ClinicApp uzmanlar içindir. Ebeveyn hesabınla ParentApp'i kullan; uzman olarak yeni bir hesap açabilirsin.
      </Text>
      <Pressable onPress={signOut} style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, backgroundColor: colors.navy }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Çıkış yap</Text>
      </Pressable>
    </View>
  );
}

function Root() {
  const { session, me, loading, notClinician } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <AuthScreen />;
  if (notClinician) return <NotClinician />;
  if (!me) return <Loading />;
  return (
    <DataProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="dark" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs" component={Tabs} />
          <Stack.Screen name="Client" component={ClientPage} />
          <Stack.Screen name="Report" component={ReportScreen} options={{ presentation: 'modal' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </DataProvider>
  );
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
