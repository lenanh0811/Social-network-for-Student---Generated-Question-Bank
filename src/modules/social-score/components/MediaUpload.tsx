import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { socialApi } from '../api/client';
import type { MediaAsset } from '../api/types';

export function MediaUpload({
  value,
  onChange,
}: {
  value: MediaAsset[];
  onChange: (assets: MediaAsset[]) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const chooseMedia = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cần quyền truy cập', 'Cho phép truy cập thư viện ảnh/video để đính kèm media.');
        return;
      }

      const selection = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 0.85,
      });
      if (selection.canceled) return;

      const selectedAssets = selection.assets;
      if (selectedAssets.length === 0) return;
      const containsVideo = selectedAssets.some((asset) => asset.type === 'video');
      const alreadyHasVideo = value.some((asset) => asset.mediaType === 'video');
      if ((containsVideo || alreadyHasVideo) && (selectedAssets.length > 1 || value.length > 0)) {
        Alert.alert('Tệp không hợp lệ', 'Một bài viết có thể đính kèm tối đa 4 ảnh hoặc 1 video.');
        return;
      }
      const existingImages = value.filter((asset) => asset.mediaType === 'image').length;
      if (!containsVideo && existingImages + selectedAssets.length > 4) {
        Alert.alert('Vượt giới hạn media', 'Một bài viết có thể đính kèm tối đa 4 ảnh.');
        return;
      }

      setUploading(true);
      let completed = [...value];
      for (const selected of selectedAssets) {
        const mimeType = selected.mimeType ?? (selected.type === 'video' ? 'video/mp4' : 'image/jpeg');
        const asset: MediaAsset = {
          uri: selected.uri,
          name: selected.fileName ?? `upload.${mimeType.split('/')[1] ?? 'bin'}`,
          mimeType,
          mediaType: selected.type === 'video' ? 'video' : 'image',
          size: selected.fileSize,
        };
        const uploaded = await socialApi.uploadMedia(asset);
        completed = [...completed, uploaded];
        onChange(completed);
      }
    } catch (error) {
      Alert.alert('Tải media thất bại', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" disabled={uploading} onPress={chooseMedia} style={styles.chooseButton}>
        <Text style={styles.chooseIcon}>▧</Text>
        <Text style={styles.chooseLabel}>{uploading ? 'Đang tải lên…' : 'Ảnh / video'}</Text>
      </Pressable>
      <View style={styles.previews}>
        {value.map((asset, index) => (
          <View key={asset.url ?? asset.uri} style={styles.preview}>
            {asset.mediaType === 'image' ? (
              <Image source={{ uri: asset.url ?? asset.uri }} style={styles.previewImage} />
            ) : (
              <View style={[styles.previewImage, styles.videoPreview]}>
                <Text style={styles.videoText}>▶  Video</Text>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Gỡ media"
              onPress={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
              style={styles.remove}
            >
              <Text style={styles.removeText}>×</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 10 },
  chooseButton: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#d8dce2',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chooseIcon: { color: '#45bd62', fontSize: 22, marginRight: 10 },
  chooseLabel: { color: '#4b4f56', fontSize: 14, fontWeight: '600' },
  previews: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  preview: { width: '48%', position: 'relative' },
  previewImage: { width: '100%', height: 145, borderRadius: 10, backgroundColor: '#f0f2f5' },
  videoPreview: { alignItems: 'center', justifyContent: 'center' },
  videoText: { color: '#4b4f56', fontWeight: '600' },
  remove: { position: 'absolute', top: 8, right: 8, height: 30, width: 30, borderRadius: 15, backgroundColor: '#1c1e21', alignItems: 'center', justifyContent: 'center' },
  removeText: { color: '#fff', fontSize: 23, lineHeight: 26 },
});
