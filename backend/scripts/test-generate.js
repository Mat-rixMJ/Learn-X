const axios = require('axios');
const FormData = require('form-data');

async function testGenerate() {
  try {
    const formData = new FormData();
    formData.append('title', 'Test Document');
    formData.append('subject', 'General');
    formData.append('generate_sample', 'true');

    const response = await axios.post('http://localhost:5000/api/ai-notes/process-pdf', formData, {
      headers: formData.getHeaders()
    });

    console.log('✅ Success:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testGenerate();