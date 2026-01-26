/**
 * Debug endpoints for testing matching logic
 * Add these to routes to help troubleshoot matching issues
 */

import express from 'express';
import { FaceProfile, User, AttendanceLog } from "../models/pg/index.js";
import { matchDescriptor } from "../services/matchService.js";

const debugRouter = express.Router();

/**
 * GET /debug/profiles
 * Get all profiles with embeddings info
 */
debugRouter.get('/debug/profiles', async (req, res) => {
  try {
    const profiles = await FaceProfile.findAll({
      include: [{ model: User, attributes: ['id', 'name'] }]
    });

    const data = profiles.map(p => ({
      id: p.id,
      userId: p.userId,
      userName: p.User?.name || 'Unknown',
      embeddingsType: typeof p.embeddings,
      isArray: Array.isArray(p.embeddings),
      length: Array.isArray(p.embeddings) ? p.embeddings.length : 'N/A',
      hasValidData: Array.isArray(p.embeddings) && p.embeddings.length === 128
    }));

    return res.json({
      status: 'success',
      totalProfiles: profiles.length,
      validProfiles: data.filter(d => d.hasValidData).length,
      profiles: data
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * POST /debug/test-matching
 * Test matching with a specific threshold
 * Body: { descriptor: [...], threshold: 0.6 }
 */
debugRouter.post('/debug/test-matching', async (req, res) => {
  try {
    const { descriptor, threshold = 0.6 } = req.body;

    if (!descriptor || !Array.isArray(descriptor)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid descriptor. Must be array of 128 numbers'
      });
    }

    if (descriptor.length !== 128) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid descriptor length: ${descriptor.length}. Expected 128`
      });
    }

    console.log('\n🔍 DEBUG: Test matching endpoint called');
    console.log(`   Threshold: ${threshold}`);
    console.log(`   Descriptor: [${descriptor.slice(0, 5).map(v => v.toFixed(3)).join(', ')}...]`);

    const result = await matchDescriptor(descriptor, threshold);

    console.log(`\n✅ Matching result:`, result);

    return res.json({
      status: 'success',
      ...result
    });
  } catch (error) {
    console.error('❌ Error in test-matching:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * GET /debug/clear-all
 * ⚠️ DELETE ALL DATA FOR TESTING
 * Only enable in development!
 */
debugRouter.get('/debug/clear-all', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ status: 'error', message: 'Only available in development' });
  }

  try {
    console.log('\n🗑️  DEBUG: Clearing all data...');

    const logs = await AttendanceLog.count();
    await AttendanceLog.truncate({ cascade: true });

    const profiles = await FaceProfile.count();
    await FaceProfile.truncate({ cascade: true });

    const users = await User.count();
    await User.truncate({ cascade: true });

    console.log(`   ✓ Deleted ${logs} logs`);
    console.log(`   ✓ Deleted ${profiles} profiles`);
    console.log(`   ✓ Deleted ${users} users`);

    return res.json({
      status: 'success',
      deleted: { logs, profiles, users }
    });
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

export default debugRouter;
