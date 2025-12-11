import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {riskAPI} from '../services/api';
import {useNavigation} from '@react-navigation/native';

const getSeverityLabel = (severity: string) => {
  const labels: Record<string, string> = {
    low: 'Düşük',
    medium: 'Orta',
    high: 'Yüksek',
    critical: 'Kritik',
  };
  return labels[severity] || severity;
};

const getSeverityColor = (severity: string) => {
  const colors: Record<string, string> = {
    low: '#34C759',
    medium: '#FF9500',
    high: '#FF3B30',
    critical: '#8E0000',
  };
  return colors[severity] || '#8E8E93';
};

export function RiskAlertsScreen() {
  const navigation = useNavigation();
  const {data, isLoading, refetch, isRefetching} = useQuery({
    queryKey: ['risk-alerts'],
    queryFn: () => riskAPI.listAlerts({page: 1, pageSize: 20}),
  });

  const alerts = data?.data.data || [];

  const renderItem = ({item}: {item: any}) => (
    <TouchableOpacity
      style={styles.alertItem}
      onPress={() => {
        // navigation.navigate('RiskAlertDetail', {alertId: item.id});
      }}>
      <View style={styles.alertHeader}>
        <Text style={styles.alertTitle}>{item.title}</Text>
        <View
          style={[
            styles.severityBadge,
            {backgroundColor: getSeverityColor(item.severity)},
          ]}>
          <Text style={styles.severityText}>
            {getSeverityLabel(item.severity)}
          </Text>
        </View>
      </View>
      <Text style={styles.alertCompany}>
        {item.clientCompany?.name || 'Bilinmeyen Şirket'}
      </Text>
      <Text style={styles.alertType}>
        Tür: {item.type === 'RISK_THRESHOLD_EXCEEDED' ? 'Belge' : 'Şirket'}
      </Text>
      <Text style={styles.alertDate}>
        {new Date(item.createdAt).toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={alerts}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isLoading ? 'Yükleniyor...' : 'Risk uyarısı bulunamadı'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  alertItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    color: '#000',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  alertCompany: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  alertType: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  alertDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
  },
});



