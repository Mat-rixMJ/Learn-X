const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');
const path = require('path');

async function testPDFGeneration() {
  console.log('📄 Testing PDF processing with study guide generation...');
  
  const pdfPath = 'D:\\RemoteClassRoom\\37743023032_Sudip Das__BCS2023025.pdf';
  const apiUrl = 'http://localhost:5000/api/ai-notes/process-pdf';
  
  // Check if file exists
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ PDF file not found:', pdfPath);
    return;
  }
  
  console.log('📂 File:', pdfPath);
  console.log('📊 File size:', fs.statSync(pdfPath).size, 'bytes');
  
  try {
    // Create form data
    const form = new FormData();
    form.append('pdf', fs.createReadStream(pdfPath));
    form.append('title', 'Net Present Value Study Guide');
    form.append('subject', 'Finance');
    form.append('generate_study_guide', 'true'); // Enable study guide generation
    
    console.log('🚀 Sending to AI notes endpoint with study guide generation...');
    
    const response = await axios.post(apiUrl, form, {
      headers: {
        ...form.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    if (response.data.success) {
      console.log('✅ Success! Processing completed.');
      console.log('\n📋 PROCESSING RESULTS');
      console.log('====================');
      
      const data = response.data.data;
      
      console.log('📝 Title:', data.note.title);
      console.log('📊 Text Length:', data.text_length, 'characters');
      console.log('🔧 Processing Method:', data.processing_method);
      console.log('📄 PDF Info:', `${data.pdf_info.filename} (${data.pdf_info.size_bytes} bytes)`);
      
      // Check if study guide was generated
      if (data.study_guide) {
        console.log('\n📚 STUDY GUIDE GENERATED');
        console.log('========================');
        console.log('📁 Filename:', data.study_guide.filename);
        console.log('🔗 Download URL:', `http://localhost:5000${data.study_guide.download_url}`);
        console.log('💾 Local Path:', data.study_guide.filepath);
        
        // Check if the generated file exists
        const studyGuidePath = data.study_guide.filepath;
        if (fs.existsSync(studyGuidePath)) {
          const studyGuideSize = fs.statSync(studyGuidePath).size;
          console.log('✅ Study guide file created successfully');
          console.log('📊 Study guide size:', Math.round(studyGuideSize / 1024), 'KB');
        } else {
          console.log('❌ Study guide file not found on disk');
        }
      } else {
        console.log('\n❌ Study guide was not generated');
      }
      
      console.log('\n📄 SUMMARY');
      console.log('----------');
      console.log(data.note.summary);
      
      console.log('\n🔑 KEY POINTS');
      console.log('-------------');
      data.note.key_points.forEach((point, index) => {
        console.log(`${index + 1}. ${point.substring(0, 100)}${point.length > 100 ? '...' : ''}`);
      });
      
      console.log('\n❓ STUDY QUESTIONS');
      console.log('------------------');
      data.important_questions.forEach((question, index) => {
        console.log(`${index + 1}. ${question}`);
      });
      
      console.log('\n🎯 QUICK QUIZ');
      console.log('=============');
      data.quiz.forEach((q, index) => {
        console.log(`Question ${index + 1}: ${q.question}`);
        console.log(`✅ Answer: ${q.options[q.correct]}`);
        console.log(`💡 ${q.explanation}`);
        console.log('');
      });
      
      console.log('📊 METADATA');
      console.log('-----------');
      console.log('🏷️  Tags:', data.note.tags.join(', '));
      console.log('📈 Difficulty:', data.difficulty);
      console.log('⏱️  Study Time:', data.estimated_study_time);
      console.log('🔍 Confidence:', data.note.confidence_score);
      console.log('📅 Generated:', new Date(data.note.generated_at).toLocaleString());
      console.log('💾 Note saved to database with ID:', data.note.id);
      
      console.log('\n🎉 PDF analysis and study guide generation completed successfully!');
      
      if (data.study_guide) {
        console.log(`\n📥 To download the study guide, visit:`);
        console.log(`   http://localhost:5000${data.study_guide.download_url}`);
      }
      
    } else {
      console.error('❌ Processing failed:', response.data.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

// Run the test
testPDFGeneration().catch(console.error);