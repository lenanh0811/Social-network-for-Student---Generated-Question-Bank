import { Platform, Share } from 'react-native';
import type { ExportFile } from '@/modules/exam-bank/api/types';

/** Web: tải file xuống. Native: mở bảng chia sẻ với nội dung file. */
export async function saveFile(f: ExportFile) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob(['﻿' + f.content], { type: f.mime + ';charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = f.filename; a.click();
    URL.revokeObjectURL(url);
  } else {
    await Share.share({ title: f.filename, message: f.content });
  }
}
