/**
 * Interview Flow Algorithm Tests
 *
 * Run with: npx tsx lib/algorithms/__tests__/interview-flow.test.ts
 */

import {
  getInterviewConfig,
  isInterviewRequired,
  isVoiceCallRequired,
  isVoiceCallOptional,
  canInstantDispatch,
  createInterviewSession,
  isInterviewComplete,
  getInterviewProgress,
  getChatDurationMinutes,
  getVoiceDurationMinutes,
  formatDuration,
  calculateTimeToHire,
  getInterviewStatusLabel,
  getInterviewTypeLabel,
} from '../interview-flow';
import type { WorkerTier } from '@/lib/supabase/types';

function testSuite() {
  console.log('🧪 Interview Flow Algorithm Tests\n');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  function test(description: string, fn: () => boolean) {
    try {
      const result = fn();
      if (result) {
        console.log(`✅ ${description}`);
        passed++;
      } else {
        console.log(`❌ ${description}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${description} - Error: ${error}`);
      failed++;
    }
  }

  // Test 1: Champion tier config
  test('Champion tier requires no interview', () => {
    const config = getInterviewConfig('champion');
    return config.type === 'none' && !config.required && !config.chatRequired && !config.voiceRequired;
  });

  // Test 2: Elite tier config
  test('Elite tier requires no interview', () => {
    const config = getInterviewConfig('elite');
    return config.type === 'none' && !config.required && !config.chatRequired && !config.voiceRequired;
  });

  // Test 3: Pro tier config
  test('Pro tier requires chat only', () => {
    const config = getInterviewConfig('pro');
    return config.type === 'chat' && config.required && config.chatRequired && !config.voiceRequired;
  });

  // Test 4: Classic tier config
  test('Classic tier requires chat and voice', () => {
    const config = getInterviewConfig('classic');
    return config.type === 'chat_and_voice' && config.required && config.chatRequired && config.voiceRequired;
  });

  // Test 5: Interview required check
  test('isInterviewRequired returns correct for each tier', () => {
    return !isInterviewRequired('champion') &&
           !isInterviewRequired('elite') &&
           isInterviewRequired('pro') &&
           isInterviewRequired('classic');
  });

  // Test 6: Voice call required check
  test('isVoiceCallRequired returns correct for each tier', () => {
    return !isVoiceCallRequired('champion') &&
           !isVoiceCallRequired('elite') &&
           !isVoiceCallRequired('pro') &&
           isVoiceCallRequired('classic');
  });

  // Test 7: Voice call optional check
  test('isVoiceCallOptional returns correct for each tier', () => {
    return !isVoiceCallOptional('champion') &&
           !isVoiceCallOptional('elite') &&
           isVoiceCallOptional('pro') &&
           !isVoiceCallOptional('classic');
  });

  // Test 8: Instant dispatch check
  test('canInstantDispatch returns correct for each tier', () => {
    return canInstantDispatch('champion') &&
           canInstantDispatch('elite') &&
           !canInstantDispatch('pro') &&
           !canInstantDispatch('classic');
  });

  // Test 9: Create interview session for Champion
  test('Create interview session for Champion (skipped)', () => {
    const session = createInterviewSession('booking-1', 'business-1', 'worker-1', 'champion');
    return session.status === 'skipped' && session.type === 'none' && session.startedAt !== null;
  });

  // Test 10: Create interview session for Pro
  test('Create interview session for Pro (pending)', () => {
    const session = createInterviewSession('booking-2', 'business-2', 'worker-2', 'pro');
    return session.status === 'pending' && session.type === 'chat' && session.startedAt === null;
  });

  // Test 11: Create interview session for Classic
  test('Create interview session for Classic (pending)', () => {
    const session = createInterviewSession('booking-3', 'business-3', 'worker-3', 'classic');
    return session.status === 'pending' && session.type === 'chat_and_voice' && session.startedAt === null;
  });

  // Test 12: Interview completion - skipped
  test('Interview is complete when skipped', () => {
    const session = {
      id: '1',
      bookingId: 'b1',
      businessId: 'bus1',
      workerId: 'w1',
      workerTier: 'champion' as WorkerTier,
      status: 'skipped' as const,
      type: 'none' as const,
      startedAt: '2026-02-27T12:00:00Z',
      completedAt: '2026-02-27T12:00:30Z',
      chatStartedAt: null,
      chatCompletedAt: null,
      voiceStartedAt: null,
      voiceCompletedAt: null,
      chatDuration: null,
      voiceDuration: null,
      totalDuration: 30,
      messagesSent: 0,
      voiceCallInitiated: false,
      timeToHire: 0.5,
      createdAt: '2026-02-27T12:00:00Z',
    };
    return isInterviewComplete(session);
  });

  // Test 13: Interview completion - completed with chat
  test('Interview is complete when chat phase done (Pro)', () => {
    const session = {
      id: '2',
      bookingId: 'b2',
      businessId: 'bus2',
      workerId: 'w2',
      workerTier: 'pro' as WorkerTier,
      status: 'in_progress' as const,
      type: 'chat' as const,
      startedAt: '2026-02-27T12:00:00Z',
      completedAt: null,
      chatStartedAt: '2026-02-27T12:00:05Z',
      chatCompletedAt: '2026-02-27T12:05:00Z', // 5 minutes
      voiceStartedAt: null,
      voiceCompletedAt: null,
      chatDuration: 300,
      voiceDuration: null,
      totalDuration: null,
      messagesSent: 10,
      voiceCallInitiated: false,
      timeToHire: null,
      createdAt: '2026-02-27T12:00:00Z',
    };
    return !isInterviewComplete(session); // Not marked as completed yet
  });

  // Test 14: Interview progress calculation
  test('Interview progress calculated correctly', () => {
    const session = {
      id: '3',
      bookingId: 'b3',
      businessId: 'bus3',
      workerId: 'w3',
      workerTier: 'classic' as WorkerTier,
      status: 'in_progress' as const,
      type: 'chat_and_voice' as const,
      startedAt: '2026-02-27T12:00:00Z',
      completedAt: null,
      chatStartedAt: '2026-02-27T12:00:05Z',
      chatCompletedAt: '2026-02-27T12:05:00Z',
      voiceStartedAt: null,
      voiceCompletedAt: null,
      chatDuration: 300,
      voiceDuration: null,
      totalDuration: null,
      messagesSent: 10,
      voiceCallInitiated: false,
      timeToHire: null,
      createdAt: '2026-02-27T12:00:00Z',
    };
    const progress = getInterviewProgress(session);
    return progress === 50; // Chat done (50%), voice not done
  });

  // Test 15: Chat duration calculation
  test('Chat duration calculated correctly in minutes', () => {
    const session = {
      id: '4',
      bookingId: 'b4',
      businessId: 'bus4',
      workerId: 'w4',
      workerTier: 'pro' as WorkerTier,
      status: 'in_progress' as const,
      type: 'chat' as const,
      startedAt: null,
      completedAt: null,
      chatStartedAt: '2026-02-27T12:00:00Z',
      chatCompletedAt: '2026-02-27T12:05:30Z',
      voiceStartedAt: null,
      voiceCompletedAt: null,
      chatDuration: 330,
      voiceDuration: null,
      totalDuration: null,
      messagesSent: 5,
      voiceCallInitiated: false,
      timeToHire: null,
      createdAt: '2026-02-27T12:00:00Z',
    };
    return getChatDurationMinutes(session) === 5.5;
  });

  // Test 16: Voice duration calculation
  test('Voice duration calculated correctly in minutes', () => {
    const session = {
      id: '5',
      bookingId: 'b5',
      businessId: 'bus5',
      workerId: 'w5',
      workerTier: 'classic' as WorkerTier,
      status: 'in_progress' as const,
      type: 'chat_and_voice' as const,
      startedAt: null,
      completedAt: null,
      chatStartedAt: null,
      chatCompletedAt: null,
      voiceStartedAt: '2026-02-27T12:00:00Z',
      voiceCompletedAt: '2026-02-27T12:04:15Z',
      chatDuration: null,
      voiceDuration: 255,
      totalDuration: null,
      messagesSent: 0,
      voiceCallInitiated: true,
      timeToHire: null,
      createdAt: '2026-02-27T12:00:00Z',
    };
    return getVoiceDurationMinutes(session) === 4.3; // Rounded
  });

  // Test 17: Format duration
  test('Format duration correctly', () => {
    return formatDuration(0) === '0 detik' &&
           formatDuration(30) === '30 detik' &&
           formatDuration(60) === '1 menit' &&
           formatDuration(90) === '1 menit 30 detik' &&
           formatDuration(150) === '2 menit 30 detik';
  });

  // Test 18: Calculate time-to-hire
  test('Calculate time-to-hire correctly', () => {
    const jobPostedAt = '2026-02-27T10:00:00Z';
    const bookingAcceptedAt = '2026-02-27T10:15:30Z';
    const timeToHire = calculateTimeToHire(jobPostedAt, bookingAcceptedAt);
    return timeToHire === 15.5;
  });

  // Test 19: Status labels
  test('Get correct status labels', () => {
    return getInterviewStatusLabel('pending') === 'Menunggu' &&
           getInterviewStatusLabel('in_progress') === 'Sedang Berlangsung' &&
           getInterviewStatusLabel('completed') === 'Selesai' &&
           getInterviewStatusLabel('skipped') === 'Dilewati' &&
           getInterviewStatusLabel('failed') === 'Gagal';
  });

  // Test 20: Type labels
  test('Get correct type labels', () => {
    return getInterviewTypeLabel('none') === 'Tidak Perlu' &&
           getInterviewTypeLabel('chat') === 'Chat' &&
           getInterviewTypeLabel('chat_and_voice') === 'Chat & Panggilan';
  });

  console.log('='.repeat(60));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log(`✨ Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review.');
  }

  return { passed, failed };
}

// Run tests if executed directly
if (require.main === module) {
  testSuite();
}

export { testSuite };
