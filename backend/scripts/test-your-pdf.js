const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testSpecificPDF() {
  try {
    const pdfPath = "D:\\RemoteClassRoom\\37743023032_Sudip Das__BCS2023025.pdf";
    
    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ PDF file not found:', pdfPath);
      return;
    }

    console.log('📄 Testing PDF processing with your document...');
    console.log('📂 File:', pdfPath);
    console.log('📊 File size:', fs.statSync(pdfPath).size, 'bytes');
    console.log('');

    const formData = new FormData();
    formData.append('pdf', fs.createReadStream(pdfPath));
    formData.append('title', 'Sudip Das BCS2023025 Document');
    formData.append('subject', 'Academic Document');

    console.log('🚀 Sending to AI notes endpoint...');
    
    const response = await axios.post('http://localhost:5000/api/ai-notes/process-pdf', formData, {
      headers: formData.getHeaders(),
      timeout: 60000 // 60 second timeout
    });

    console.log('✅ Success! Processing completed.');
    console.log('');

    const data = response.data.data;
    
    if (data) {
      console.log('📋 PROCESSING RESULTS');
      console.log('====================');
      console.log(`📝 Title: ${data.note.title}`);
      console.log(`📊 Text Length: ${data.text_length} characters`);
      console.log(`🔧 Processing Method: ${data.processing_method}`);
      console.log(`📄 PDF Info: ${data.pdf_info.filename} (${data.pdf_info.size_bytes} bytes)`);
      console.log('');

      console.log('📄 SUMMARY');
      console.log('----------');
      console.log(data.note.summary);
      console.log('');

      if (data.note.key_points && data.note.key_points.length > 0) {
        console.log('🔑 KEY POINTS');
        console.log('-------------');
        data.note.key_points.forEach((point, i) => {
          console.log(`${i + 1}. ${point}`);
        });
        console.log('');
      }

      if (data.important_questions && data.important_questions.length > 0) {
        console.log('❓ STUDY QUESTIONS');
        console.log('------------------');
        data.important_questions.forEach((question, i) => {
          console.log(`${i + 1}. ${question}`);
        });
        console.log('');
      }

      if (data.quiz && data.quiz.length > 0) {
        console.log('🎯 QUICK QUIZ');
        console.log('=============');
        data.quiz.forEach((q, i) => {
          console.log(`Question ${i + 1}: ${q.question}`);
          q.options.forEach((option, j) => {
            const marker = j === q.correct ? '✅' : '  ';
            console.log(`${marker} ${String.fromCharCode(65 + j)}. ${option}`);
          });
          console.log(`💡 Explanation: ${q.explanation}`);
          console.log('');
        });
      }

      console.log('📊 METADATA');
      console.log('-----------');
      console.log(`🏷️  Tags: ${data.note.tags.join(', ')}`);
      console.log(`📈 Difficulty: ${data.difficulty}`);
      console.log(`⏱️  Study Time: ${data.estimated_study_time}`);
      console.log(`🔍 Confidence: ${data.note.confidence_score}`);
      console.log(`📅 Generated: ${new Date(data.note.generated_at).toLocaleString()}`);
      console.log('');

      // Show a preview of the extracted content
      console.log('📝 CONTENT PREVIEW (first 500 chars)');
      console.log('====================================');
      console.log(data.note.content.substring(0, 500) + '...');
      console.log('');

      console.log('🎉 PDF analysis completed successfully!');
      console.log('');
      console.log('💾 Note saved to database with ID:', data.note.id);
    } else {
      console.log('⚠️  No data received in response');
    }

  } catch (error) {
    console.error('❌ Test failed:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.message || 'Unknown server error'}`);
      
      if (error.response.data) {
        console.error('   Response:', JSON.stringify(error.response.data, null, 2));
      }
    } else if (error.request) {
      console.error('   Network Error: Could not reach server');
      console.error('   Check if backend is running on http://localhost:5000');
    } else {
      console.error('   Error:', error.message);
    }
  }
}

testSpecificPDF();