import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {launchImageLibrary, launchCamera, ImagePickerResponse} from 'react-native-image-picker';
import {useQuery, useMutation} from '@tanstack/react-query';
import {documentAPI, clientCompanyAPI} from '../services/api';

export function DocumentUploadScreen() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<ImagePickerResponse | null>(null);

  const {data: companiesData, isLoading: companiesLoading} = useQuery({
    queryKey: ['client-companies'],
    queryFn: () => clientCompanyAPI.list({isActive: true, pageSize: 100}),
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!selectedImage?.assets?.[0] || !selectedCompanyId) {
        throw new Error('Lütfen bir dosya ve şirket seçin.');
      }

      const asset = selectedImage.assets[0];
      return documentAPI.upload(
        {
          uri: asset.uri || '',
          type: asset.type || 'image/jpeg',
          name: asset.fileName || 'image.jpg',
        },
        selectedCompanyId,
        'OTHER'
      );
    },
    onSuccess: () => {
      Alert.alert('Başarılı', 'Belge başarıyla yüklendi.');
      setSelectedImage(null);
      setSelectedCompanyId('');
    },
    onError: (error: any) => {
      Alert.alert('Hata', error.message || 'Belge yüklenirken bir hata oluştu.');
    },
  });

  const handleSelectImage = () => {
    Alert.alert('Resim Seç', 'Kamera veya galeriden seçin', [
      {text: 'İptal', style: 'cancel'},
      {
        text: 'Kamera',
        onPress: () => {
          launchCamera({mediaType: 'photo', quality: 0.8}, response => {
            if (!response.didCancel && !response.errorMessage) {
              setSelectedImage(response);
            }
          });
        },
      },
      {
        text: 'Galeri',
        onPress: () => {
          launchImageLibrary({mediaType: 'photo', quality: 0.8}, response => {
            if (!response.didCancel && !response.errorMessage) {
              setSelectedImage(response);
            }
          });
        },
      },
    ]);
  };

  const companies = companiesData?.data.data || [];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Belge Yükle</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Müşteri Şirketi</Text>
          {companiesLoading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <ScrollView style={styles.companyList}>
              {companies.map(company => (
                <TouchableOpacity
                  key={company.id}
                  style={[
                    styles.companyItem,
                    selectedCompanyId === company.id && styles.companyItemSelected,
                  ]}
                  onPress={() => setSelectedCompanyId(company.id)}>
                  <Text
                    style={[
                      styles.companyText,
                      selectedCompanyId === company.id && styles.companyTextSelected,
                    ]}>
                    {company.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Dosya</Text>
          <TouchableOpacity style={styles.imageButton} onPress={handleSelectImage}>
            <Text style={styles.imageButtonText}>
              {selectedImage?.assets?.[0]?.fileName || 'Resim Seç'}
            </Text>
          </TouchableOpacity>
          {selectedImage?.assets?.[0] && (
            <Text style={styles.imageInfo}>
              Seçilen: {selectedImage.assets[0].fileName || 'Resim'}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.uploadButton,
            (!selectedCompanyId || !selectedImage || uploadMutation.isPending) &&
              styles.uploadButtonDisabled,
          ]}
          onPress={() => uploadMutation.mutate()}
          disabled={!selectedCompanyId || !selectedImage || uploadMutation.isPending}>
          {uploadMutation.isPending ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.uploadButtonText}>Yükleniyor...</Text>
            </>
          ) : (
            <Text style={styles.uploadButtonText}>Yükle</Text>
          )}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#000',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  companyList: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  companyItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  companyItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  companyText: {
    fontSize: 14,
    color: '#000',
  },
  companyTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  imageButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  imageButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  imageInfo: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});





