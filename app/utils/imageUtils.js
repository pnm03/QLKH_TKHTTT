/**
 * Chuyển đổi file ảnh thành chuỗi base64
 * @param {File} file - File ảnh cần chuyển đổi
 * @returns {Promise<string>} - Chuỗi base64 của ảnh
 */
export const convertImageToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Kiểm tra kích thước và định dạng file ảnh
 * @param {File} file - File ảnh cần kiểm tra
 * @param {number} maxSize - Kích thước tối đa (tính bằng byte)
 * @returns {Object} - Kết quả kiểm tra {valid: boolean, error: string}
 */
export const validateImage = (file, maxSize = 10 * 1024 * 1024) => {
  if (!file) {
    return { valid: false, error: 'Không có file ảnh' };
  }

  // Kiểm tra kích thước file
  if (file.size > maxSize) {
    return { valid: false, error: `Kích thước ảnh không được vượt quá ${maxSize / (1024 * 1024)}MB` };
  }

  // Kiểm tra định dạng file
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File phải là định dạng ảnh' };
  }

  return { valid: true, error: null };
};
