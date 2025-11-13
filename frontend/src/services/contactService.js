import axios from 'axios';

const contactService = {
  // Gửi contact form
  submitContactForm: async (formData) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/contact/submit`, formData, {
        headers: {
          'Content-Type': 'application/json'
        }
        // Không sử dụng withCredentials để tránh session issues
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting contact form:', error);
      throw error;
    }
  }
};

export default contactService;
