import { useRef, useCallback } from 'react';

export const useRecaptcha = () => {
  const recaptchaRef = useRef(null);

  const executeRecaptcha = useCallback(async () => {
    if (!recaptchaRef.current) {
      throw new Error('reCAPTCHA chưa được khởi tạo');
    }

    try {
      const token = await recaptchaRef.current.executeAsync();
      if (!token) {
        throw new Error('Không thể lấy token reCAPTCHA');
      }
      return token;
    } catch (error) {
      console.error('Lỗi khi thực thi reCAPTCHA:', error);
      throw new Error('Xác minh reCAPTCHA thất bại. Vui lòng thử lại.');
    }
  }, []);

  const resetRecaptcha = useCallback(() => {
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
    }
  }, []);

  return {
    recaptchaRef,
    executeRecaptcha,
    resetRecaptcha
  };
};
