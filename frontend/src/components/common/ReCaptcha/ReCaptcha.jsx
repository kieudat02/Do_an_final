import React from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

const ReCaptchaComponent = ({ recaptchaRef, siteKey, onExecute }) => {
  // Sử dụng site key từ environment variables hoặc từ props
  const RECAPTCHA_SITE_KEY = siteKey || import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'; // Test key mặc định

  if (!RECAPTCHA_SITE_KEY) {
    console.warn('VITE_RECAPTCHA_SITE_KEY không được cấu hình');
    return null;
  }

  return (
    <ReCAPTCHA
      ref={recaptchaRef}
      sitekey={RECAPTCHA_SITE_KEY}
      size="invisible" // Invisible reCAPTCHA v2
      theme="light"
    />
  );
};

export default ReCaptchaComponent;
