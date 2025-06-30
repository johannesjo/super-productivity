// Test to verify the fix for the sync service test
console.log('Testing sync status with fixed Lamport values...\n');

// Simulate the test scenario with zero Lamport values
const testCase = {
  local: {
    lastUpdate: 1000,
    lastSyncedUpdate: 1000,
    localLamport: 0, // Changed from 5 to 0
    lastSyncedLamport: 0, // Changed from 5 to 0
    vectorClock: undefined,
    lastSyncedVectorClock: undefined,
  },
  remote: {
    lastUpdate: 2000,
    localLamport: 0, // Consistent with local
    lastSyncedLamport: null,
    vectorClock: { CLIENT_456: 10 },
  },
};

console.log('Test data:');
console.log('Local:', JSON.stringify(testCase.local, null, 2));
console.log('Remote:', JSON.stringify(testCase.remote, null, 2));

// Check if we have valid non-zero change counters
const hasValidChangeCounters =
  testCase.local.localLamport > 0 ||
  testCase.remote.localLamport > 0 ||
  testCase.local.lastSyncedLamport > 0;

console.log('\nAnalysis:');
console.log('Has valid (non-zero) change counters:', hasValidChangeCounters);
console.log('Will use timestamp comparison:', !hasValidChangeCounters);

// Timestamp comparison
const hasLocalChanges = testCase.local.lastUpdate > testCase.local.lastSyncedUpdate;
const hasRemoteChanges = testCase.remote.lastUpdate > testCase.local.lastSyncedUpdate;

console.log('\nTimestamp comparison:');
console.log(
  'hasLocalChanges:',
  hasLocalChanges,
  `(${testCase.local.lastUpdate} > ${testCase.local.lastSyncedUpdate})`,
);
console.log(
  'hasRemoteChanges:',
  hasRemoteChanges,
  `(${testCase.remote.lastUpdate} > ${testCase.local.lastSyncedUpdate})`,
);

console.log('\nExpected result: UpdateLocal (because remote is newer and has changes)');
console.log('This should now work correctly with zero Lamport values.');
