#!/usr/bin/env node
/**
 * Synthetic end-to-end AI Notes generation test.
 * 
 * Scenarios:
 *  1. Pure text processing (processTextContent fallback path)
 *  2. Video processing fallback (no real file) for transcript + analysis
 *  3. (Optional) If you supply a real video path via CLI arg, it will test real path handling.
 * 
 * Usage:
 *  node backend/scripts/test-ai-notes.js
 *  node backend/scripts/test-ai-notes.js --video "D:/path/to/video.mp4"
 */

const path = require('path');
const fs = require('fs');
const axios = require('axios');

const BASE = process.env.API_BASE || 'http://localhost:5000';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i=0;i<args.length;i++) {
    if (args[i] === '--video' && args[i+1]) { opts.video = args[i+1]; i++; }
    if (args[i] === '--token' && args[i+1]) { opts.token = args[i+1]; i++; }
  }
  return opts;
}

async function authIfNeeded(opts) {
  if (opts.token) return opts.token;
  // Attempt demo login if a demo user exists; adjust credentials as needed.
  try {
    const login = await axios.post(`${BASE}/api/auth/login`, { email: 'demo@example.com', password: 'password123' });
    return login.data.token;
  } catch (e) {
    console.warn('⚠️  Could not auto-login; proceeding without auth (routes may reject).');
    return null;
  }
}

async function testText(token) {
  console.log('\n=== TEXT ANALYSIS TEST ===');
  try {
    const payload = {
      text: 'Quantum computing leverages principles of superposition and entanglement to solve certain classes of problems faster.',
      title: 'Intro to Quantum Computing',
      subject: 'Computer Science',
      features: {
        summarization: true,
        questions: true,
        concepts: true,
        timeline: true,
        flashcards: true
      }
    };
    const res = await axios.post(`${BASE}/api/ai-notes/process-text`, payload, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    const data = res.data;
    console.log('✅ Text processing success');
    console.log('Summary:', data.data?.summary?.slice(0,120) + '...');
    console.log('Key Points:', (data.data?.keyPoints || []).slice(0,3));
  } catch (e) {
    console.error('❌ Text processing failed:', e.response?.data || e.message);
  }
}

async function testVideo(token, videoPath) {
  console.log('\n=== VIDEO PROCESS TEST (Synthetic) ===');
  try {
    const payload = {
      video_path: videoPath || 'D:/nonexistent-demo-video.mp4',
      title: 'Graph Algorithms Basics',
      subject: 'Data Structures',
      features: {
        comprehensiveAnalysis: true,
        questionGeneration: true,
        conceptMapping: true,
        flashcardGeneration: true
      }
    };
    const res = await axios.post(`${BASE}/api/ai-notes/process-video`, payload, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    const d = res.data.data || {};
    console.log('✅ Video processing path success (may be fallback if file missing)');
    console.log('Processing Method:', d.metadata?.processingMethod);
    console.log('Transcript preview:', (d.transcript?.text || '').slice(0,80) + '...');
    console.log('Concepts:', (d.concepts || []).slice(0,2));
  } catch (e) {
    console.error('❌ Video processing failed:', e.response?.data || e.message);
  }
}

async function main() {
  const opts = parseArgs();
  console.log('🔍 Running Synthetic AI Notes Test Suite');
  console.log('Backend Base:', BASE);
  if (opts.video) console.log('Video Arg Provided:', opts.video);

  const token = await authIfNeeded(opts);

  await testText(token);
  await testVideo(token, opts.video);

  console.log('\n🎯 Test Run Complete');
}

main().catch(e => { console.error('Fatal test error:', e); process.exit(1); });
