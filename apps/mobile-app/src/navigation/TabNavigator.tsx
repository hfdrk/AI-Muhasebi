import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {DashboardScreen} from '../screens/DashboardScreen';
import {RiskAlertsScreen} from '../screens/RiskAlertsScreen';
import {NotificationsScreen} from '../screens/NotificationsScreen';
import {ReportsScreen} from '../screens/ReportsScreen';
import {ProfileScreen} from '../screens/ProfileScreen';
import {AIAssistantScreen} from '../screens/AIAssistantScreen';

const Tab = createBottomTabNavigator();

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Gösterge Paneli',
          tabBarLabel: 'Gösterge Paneli',
        }}
      />
      <Tab.Screen
        name="RiskAlerts"
        component={RiskAlertsScreen}
        options={{
          title: 'Risk Uyarıları',
          tabBarLabel: 'Risk Uyarıları',
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Bildirimler',
          tabBarLabel: 'Bildirimler',
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          title: 'Raporlar',
          tabBarLabel: 'Raporlar',
        }}
      />
      <Tab.Screen
        name="AIAssistant"
        component={AIAssistantScreen}
        options={{
          title: 'AI Asistan',
          tabBarLabel: 'AI Asistan',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
          tabBarLabel: 'Profil',
        }}
      />
    </Tab.Navigator>
  );
}





