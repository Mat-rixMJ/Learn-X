#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const PDFDocument = require('pdfkit');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const ENDPOINT = `${BACKEND_URL}/api/ai-notes/process-pdf`;

// Helper function to generate a test PDF
const generateTestPDF = (title, subject, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);
      
      doc.fontSize(18).text(title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(`Subject: ${subject}`);
      doc.moveDown();
      
      doc.fontSize(12).text(`This is a comprehensive study document about ${subject}. `, { continued: true });
      doc.text(`The content focuses on ${title} and provides detailed explanations of key concepts.`);
      doc.moveDown();
      
      doc.text('Introduction:', { underline: true });
      doc.text(`${title} is a fundamental topic in ${subject} that encompasses various important concepts. `);
      doc.text('Understanding these principles is crucial for academic and practical applications. ');
      doc.text('This document will explore the theoretical foundations and real-world implementations.');
      doc.moveDown();
      
      doc.text('Key Concepts:', { underline: true });
      doc.text(`• Fundamental principles of ${subject}`);
      doc.text(`• Core methodologies used in ${title}`);
      doc.text('• Theoretical frameworks and models');
      doc.text('• Practical applications and case studies');
      doc.text('• Industry best practices and standards');
      doc.text('• Current trends and future developments');
      doc.moveDown();
      
      doc.text('Detailed Analysis:', { underline: true });
      doc.text(`The study of ${title} requires a systematic approach that combines theoretical knowledge `);
      doc.text(`with practical experience. In the field of ${subject}, researchers have identified `);
      doc.text('several critical factors that influence success. These include proper methodology, ');
      doc.text('careful data analysis, and thorough understanding of underlying principles.');
      doc.moveDown();
      
      doc.text('Learning Objectives:', { underline: true });
      doc.text('Upon completion of this study material, students will be able to:');
      doc.text(`• Demonstrate comprehensive understanding of ${subject} concepts`);
      doc.text(`• Apply ${title} principles in practical scenarios`);
      doc.text('• Analyze complex problems using appropriate methodologies');
      doc.text('• Evaluate different approaches and recommend solutions');
      doc.text('• Synthesize information from multiple sources effectively');
      doc.moveDown();
      
      doc.text('Conclusion:', { underline: true });
      doc.text(`This document has provided a thorough overview of ${title} within the ${subject} domain. `);
      doc.text('The concepts presented here form the foundation for advanced study and professional practice. ');
      doc.text('Students are encouraged to continue exploring these topics through additional research ');
      doc.text('and practical application in real-world contexts.');
      
      doc.end();
      
      stream.on('finish', () => {
        console.log(`✅ Generated test PDF: ${outputPath}`);
        resolve(outputPath);
      });
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

// Test function
const testPDFProcessing = async (pdfFilePath, title, subject) => {
  try {
    console.log('🔄 Testing PDF processing...');
    console.log(`📄 File: ${pdfFilePath}`);
    console.log(`📚 Title: ${title}`);
    console.log(`🎯 Subject: ${subject}`);
    console.log('');

    // Check if file exists
    if (!fs.existsSync(pdfFilePath)) {
      throw new Error(`PDF file not found: ${pdfFilePath}`);
    }

    // Create form data
    const formData = new FormData();
    formData.append('pdf', fs.createReadStream(pdfFilePath));
    formData.append('title', title);
    formData.append('subject', subject);

    console.log('🚀 Sending PDF to backend AI notes endpoint');
    console.log(`Endpoint: ${ENDPOINT}`);
    console.log('');

    // Send request
    const response = await axios.post(ENDPOINT, formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000 // 60 second timeout
    });

    if (response.data.success) {
      console.log('✅ PDF processed successfully!');
      console.log('');
      console.log('📊 Analysis Results:');
      console.log('==================');
      
      const note = response.data.note;
      console.log(`📝 Title: ${note.title}`);
      console.log(`📋 Summary: ${note.summary}`);
      console.log('');
      
      console.log('🔑 Key Points:');
      note.key_points.forEach((point, index) => {
        console.log(`  ${index + 1}. ${point}`);
      });
      console.log('');
      
      console.log('❓ Study Questions:');
      note.study_questions.forEach((question, index) => {
        console.log(`  ${index + 1}. ${question}`);
      });
      console.log('');
      
      console.log('🧠 Quick Quiz:');
      note.quick_quiz.forEach((quiz, index) => {
        console.log(`  ${index + 1}. ${quiz.question}`);
        quiz.options.forEach((option, optIndex) => {
          const marker = optIndex === quiz.correct ? '✓' : ' ';
          console.log(`     ${String.fromCharCode(65 + optIndex)}. [${marker}] ${option}`);
        });
        console.log(`     Explanation: ${quiz.explanation}`);
        console.log('');
      });
      
      console.log('📈 Metadata:');
      console.log(`  Difficulty: ${note.difficulty}`);
      console.log(`  Study Time: ${note.estimated_study_time}`);
      console.log(`  Tags: ${note.tags.join(', ')}`);
      console.log(`  Created: ${new Date(note.created_at).toLocaleString()}`);
      console.log('');
      
      console.log('📄 Text Preview:');
      console.log(note.extracted_text);
      
    } else {
      console.log('❌ Request failed:', response.data);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error during PDF test:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
};

// Main execution
const main = async () => {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let pdfFile = null;
    let title = 'Sample Study Document';
    let subject = 'Computer Science';

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--file' && args[i + 1]) {
        pdfFile = args[i + 1];
        i++;
      } else if (args[i] === '--title' && args[i + 1]) {
        title = args[i + 1];
        i++;
      } else if (args[i] === '--subject' && args[i + 1]) {
        subject = args[i + 1];
        i++;
      } else if (args[i] === '--help') {
        console.log('Usage: node test-ai-pdf.js [options]');
        console.log('');
        console.log('Options:');
        console.log('  --file <path>      Path to existing PDF file (optional)');
        console.log('  --title <title>    Document title (default: "Sample Study Document")');
        console.log('  --subject <subject> Subject area (default: "Computer Science")');
        console.log('  --help             Show this help message');
        console.log('');
        console.log('Examples:');
        console.log('  node test-ai-pdf.js --title "Data Structures" --subject "Computer Science"');
        console.log('  node test-ai-pdf.js --file "./my-document.pdf" --title "Algorithm Analysis"');
        process.exit(0);
      }
    }

    // Generate or use provided PDF
    if (!pdfFile) {
      console.log('📄 No PDF file specified, generating test PDF...');
      const tempDir = path.join(__dirname, '../uploads/temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      pdfFile = path.join(tempDir, `test-${Date.now()}.pdf`);
      await generateTestPDF(title, subject, pdfFile);
    }

    // Test PDF processing
    await testPDFProcessing(pdfFile, title, subject);

    // Clean up generated file if we created it
    if (pdfFile.includes('test-') && fs.existsSync(pdfFile)) {
      fs.unlinkSync(pdfFile);
      console.log('🧹 Cleaned up generated test PDF');
    }

    console.log('');
    console.log('🎉 PDF processing test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
};

// Add FormData to dependencies check - but it's already included via axios, so skip this check
// if (!fs.existsSync(path.join(__dirname, '../node_modules/form-data'))) {
//   console.error('❌ Missing dependency: form-data');
//   console.log('Please run: cd backend && npm install form-data');
//   console.log('Current directory check:', path.join(__dirname, '../node_modules/form-data'));
//   console.log('Directory exists:', fs.existsSync(path.join(__dirname, '../node_modules')));
//   process.exit(1);
// }

main();