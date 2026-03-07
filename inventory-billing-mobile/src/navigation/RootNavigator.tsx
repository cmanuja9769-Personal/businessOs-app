import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '@contexts/AuthContext';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { RootStackParamList } from './types';

const Stack = createStackNavigator<RootStackParamList>();

function OnboardingRequired() {
  const { signOut } = useAuth();

  return (
    <View style={styles.onboardingContainer}>
      <Text style={styles.onboardingTitle}>Welcome to BusinessOS</Text>
      <Text style={styles.onboardingText}>
        Please complete your organization setup on the web application at app.businessos.com, then sign back in here.
      </Text>
      <View style={styles.signOutButton}>
        <Text onPress={signOut} style={styles.signOutText}>Sign Out</Text>
      </View>
    </View>
  );
}

function PendingInvitations() {
  const { pendingInvitations, signOut } = useAuth();

  return (
    <View style={styles.onboardingContainer}>
      <Text style={styles.onboardingTitle}>Pending Invitations</Text>
      <Text style={styles.onboardingText}>
        You have {pendingInvitations.length} pending organization invitation(s). Please accept invitations on the web application to continue.
      </Text>
      {pendingInvitations.map((inv) => (
        <View key={inv.id} style={styles.invitationCard}>
          <Text style={styles.invitationOrg}>{inv.org_name || 'Unknown Organization'}</Text>
          <Text style={styles.invitationRole}>Role: {inv.role}</Text>
        </View>
      ))}
      <View style={styles.signOutButton}>
        <Text onPress={signOut} style={styles.signOutText}>Sign Out</Text>
      </View>
    </View>
  );
}

export default function RootNavigator() {
  const { session, loading, organizationId, needsOnboarding, pendingInvitations } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (session && !organizationId) {
    if (pendingInvitations.length > 0) {
      return (
        <NavigationContainer>
          <PendingInvitations />
        </NavigationContainer>
      );
    }
    if (needsOnboarding) {
      return (
        <NavigationContainer>
          <OnboardingRequired />
        </NavigationContainer>
      );
    }
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session && organizationId ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  onboardingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
  },
  onboardingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  onboardingText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  invitationCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 12,
  },
  invitationOrg: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  invitationRole: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  signOutButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#ef4444',
    borderRadius: 8,
  },
  signOutText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
