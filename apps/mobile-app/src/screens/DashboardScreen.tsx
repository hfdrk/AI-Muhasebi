import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {mobileAPI} from '../services/api';
import {useNavigation} from '@react-navigation/native';

export function DashboardScreen() {
  const navigation = useNavigation();
  const {data, isLoading, refetch, isRefetching} = useQuery({
    queryKey: ['mobile-dashboard'],
    queryFn: () => mobileAPI.getDashboard(),
  });

  const dashboard = data?.data;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }>
      <View style={styles.content}>
        <View style={styles.cardRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Toplam Müşteri</Text>
            <Text style={styles.cardValue}>
              {isLoading ? '...' : dashboard?.totalClientCompanies || 0}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Açık Risk Uyarısı</Text>
            <Text style={styles.cardValue}>
              {isLoading ? '...' : dashboard?.openRiskAlerts || 0}
            </Text>
          </View>
        </View>

        <View style={styles.cardRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Bekleyen Belge</Text>
            <Text style={styles.cardValue}>
              {isLoading ? '...' : dashboard?.pendingDocuments || 0}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Bugünkü Faturalar</Text>
            <Text style={styles.cardValue}>
              {isLoading ? '...' : dashboard?.todayInvoices || 0}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Son Bildirimler</Text>
          {isLoading ? (
            <Text style={styles.emptyText}>Yükleniyor...</Text>
          ) : dashboard?.recentNotifications && dashboard.recentNotifications.length > 0 ? (
            dashboard.recentNotifications.map((notification: any) => (
              <View key={notification.id} style={styles.notificationItem}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationDate}>
                  {new Date(notification.createdAt).toLocaleDateString('tr-TR')}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Bildirim yok</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => {
            // Navigate to document upload
            // navigation.navigate('DocumentUpload');
          }}>
          <Text style={styles.uploadButtonText}>Belge Yükle</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  notificationItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  notificationTitle: {
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
  },
  notificationDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 20,
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});





