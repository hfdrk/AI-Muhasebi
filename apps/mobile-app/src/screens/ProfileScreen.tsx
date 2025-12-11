import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '../hooks/useAuth';
import {userAPI} from '../services/api';

export function ProfileScreen() {
  const {authData, logout} = useAuth();

  const {data: userData, isLoading} = useQuery({
    queryKey: ['user-me'],
    queryFn: () => userAPI.getMe(),
    enabled: !!authData,
  });

  const user = userData?.data;
  const tenant = user?.tenants?.[0];

  const handleLogout = () => {
    Alert.alert('Çıkış Yap', 'Çıkış yapmak istediğinize emin misiniz?', [
      {text: 'İptal', style: 'cancel'},
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Ad Soyad</Text>
          <Text style={styles.value}>{user?.fullName || '-'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>E-posta</Text>
          <Text style={styles.value}>{user?.email || '-'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Ofis Adı</Text>
          <Text style={styles.value}>{tenant?.name || '-'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Rol</Text>
          <Text style={styles.value}>{tenant?.role || '-'}</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});



