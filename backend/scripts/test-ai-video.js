#!/usr/bin/env node
/**
 * Real video AI Notes test harness
 * Sends a local video file via multipart/form-data to /api/ai-notes/process-video
 * and validates key response fields. Intended for manual QA.
 *
 * Usage:
 *   node backend/scripts/test-ai-video.js --file "D:/path/to/video.mp4" --title "Sorting" --subject CS
 *   node backend/scripts/test-ai-video.js --file sample.mp4 --token <JWT>
 *
 * Exits with code 0 on success, non-zero on validation failure.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const API_BASE = process.env.API_BASE || 'http://localhost:5000';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { title: 'Video Test', subject: 'General', input_type: 'upload' };
  for (let i=0;i<args.length;i++) {
    const a = args[i];
    if (a === '--file' && args[i+1]) { opts.file = args[++i]; }
    else if (a === '--title' && args[i+1]) { opts.title = args[++i]; }
    else if (a === '--subject' && args[i+1]) { opts.subject = args[++i]; }
    else if (a === '--token' && args[i+1]) { opts.token = args[++i]; }
    else if (a === '--help' || a === '-h') { opts.help = true; }
  }
  return opts;
}

function printHelp() {
  console.log('Real Video AI Notes Test');
  console.log('Required: --file <path-to-video.mp4>');
  console.log('Optional: --title, --subject, --token <JWT>');
}

async function main() {
  const opts = parseArgs();
  if (opts.help) { printHelp(); return; }
  if (!opts.file) {
    console.error('❌ Missing --file path to video.');
    printHelp();
    process.exit(2);
  }
  const abs = path.isAbsolute(opts.file) ? opts.file : path.join(process.cwd(), opts.file);
  if (!fs.existsSync(abs)) {
    console.error('❌ File not found:', abs);
    process.exit(2);
  }

  console.log('🎬 Sending video to backend AI notes endpoint');
  console.log('Endpoint:', API_BASE + '/api/ai-notes/process-video');
  console.log('File:', abs);

  const form = new FormData();
  form.append('video', fs.createReadStream(abs));
  form.append('title', opts.title);
  form.append('subject', opts.subject);
  form.append('input_type', 'upload');
  form.append('features', JSON.stringify({
    comprehensiveAnalysis: true,
    questionGeneration: true,
    conceptMapping: true,
    flashcardGeneration: true
  }));

  const headers = { ...form.getHeaders() };
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;

  let response;
  try {
    response = await axios.post(API_BASE + '/api/ai-notes/process-video', form, {
      headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 600000
    });
  } catch (e) {
    console.error('❌ Request failed:', e.response?.data || e.message);
    process.exit(1);
  }

  const body = response.data || {};
  if (!body.success) {
    console.error('❌ Backend reported failure:', body);
    process.exit(1);
  }

  // Basic validation of structure
  const d = body.data || {};
  const transcriptOk = !!(d.segments || []).length || !!d.analysis?.summary;
  const conceptsOk = Array.isArray(d.concepts);
  const questionsOk = Array.isArray(d.questions);

  console.log('✅ Received success response');
  console.log('Summary (slice):', (d.analysis?.summary || '').slice(0,120) + '...');
  console.log('Segments:', (d.segments || []).length);
  console.log('Concepts:', (d.concepts || []).length);
  console.log('Questions:', (d.questions || []).length);

  if (!transcriptOk) {
    console.warn('⚠️ Transcript/summary missing. This may occur if fallback path triggered.');
  }
  if (!conceptsOk || !questionsOk) {
    console.error('❌ Invalid structure in response.');
    process.exit(1);
  }

  console.log('\n🎯 Real video AI notes test completed.');
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
