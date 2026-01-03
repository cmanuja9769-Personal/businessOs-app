import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { MainTabParamList } from './types';
import { useTheme } from '@contexts/ThemeContext';

// Import stack navigators
import DashboardStack from './DashboardStack';
import InvoiceStack from './InvoiceStack';
import InventoryStack from './InventoryStack';
import CustomersStack from './CustomersStack';
import MoreStack from './MoreStack';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Main Bottom Tab Navigator
 * 
 * Navigation Design Principles:
 * 1. Simple destination-based navigation
 * 2. Tabs switch instantly - previous tab's stack is reset
 * 3. Each tab starts fresh when switching to it
 * 4. Only edit screens handle unsaved changes (via useUnsavedChanges hook)
 */
export default function MainNavigator() {
  const { colors, shadows } = useTheme();

  // Reset stack to initial screen when switching tabs
  const resetStackOnTabPress = (tabName: string, initialScreen: string) => ({
    tabPress: (e: any) => {
      const { navigation } = e.target ? { navigation: e.target } : e;
      // Navigate to the tab and reset its stack to the initial screen
      e.preventDefault();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: tabName,
              state: {
                routes: [{ name: initialScreen }],
              },
            },
          ],
        })
      );
    },
  });

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 8,
          paddingHorizontal: 8,
          ...shadows.sm,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('DashboardTab', { screen: 'Dashboard' });
          },
        })}
      />
      <Tab.Screen
        name="InvoicesTab"
        component={InvoiceStack}
        options={{
          tabBarLabel: 'Invoices',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('InvoicesTab', { screen: 'InvoiceList' });
          },
        })}
      />
      <Tab.Screen
        name="CustomersTab"
        component={CustomersStack}
        options={{
          tabBarLabel: 'Parties',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('CustomersTab', { screen: 'Customers' });
          },
        })}
      />
      <Tab.Screen
        name="InventoryTab"
        component={InventoryStack}
        options={{
          tabBarLabel: 'Items',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('InventoryTab', { screen: 'ItemList' });
          },
        })}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreStack}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('MoreTab', { screen: 'More' });
          },
        })}
      />
    </Tab.Navigator>
  );
}
