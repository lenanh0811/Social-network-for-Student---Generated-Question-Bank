import * as SecureStore from 'expo-secure-store';

/** iOS/Android: lưu token trong Keychain/Keystore. Bản web nằm ở storage.web.ts. */
export const storage = {
  get: (key: string) => SecureStore.getItemAsync(key),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
};
