import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import {useMutation} from '@tanstack/react-query';
import {aiAPI} from '../services/api';
import {Alert} from 'react-native';

export function ReportsScreen() {
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summaryTitle, setSummaryTitle] = useState('');

  const dailyRiskMutation = useMutation({
    mutationFn: () => aiAPI.getDailyRiskSummary(),
    onSuccess: response => {
      setSummaryText(response.data.summary);
      setSummaryTitle('Bugünün Risk Özeti');
      setSummaryModalVisible(true);
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Özet oluşturulamadı.');
    },
  });

  const portfolioMutation = useMutation({
    mutationFn: () => aiAPI.getPortfolioSummary(),
    onSuccess: response => {
      setSummaryText(response.data.summary);
      setSummaryTitle('Portföy Özeti');
      setSummaryModalVisible(true);
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Özet oluşturulamadı.');
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>AI Özetleri</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => dailyRiskMutation.mutate()}
          disabled={dailyRiskMutation.isPending}>
          {dailyRiskMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Bugünün Risk Özetini Oluştur</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => portfolioMutation.mutate()}
          disabled={portfolioMutation.isPending}>
          {portfolioMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Bu Haftanın Portföy Özeti</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={summaryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSummaryModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{summaryTitle}</Text>
              <TouchableOpacity
                onPress={() => setSummaryModalVisible(false)}
                style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Kapat</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.summaryText}>{summaryText}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
    color: '#000',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  modalBody: {
    padding: 16,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#000',
  },
});


