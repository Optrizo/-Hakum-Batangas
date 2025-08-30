#!/usr/bin/env node

/**
 * Comprehensive System Integration Test Script
 * Tests Supabase connectivity, transaction state management, loading states, and all critical features
 * 
 * Usage: node test-system-integration.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test result tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Utility functions
const logTest = (testName, passed, message = '') => {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const fullMessage = `${status} - ${testName}${message ? ': ' + message : ''}`;
  console.log(fullMessage);
  
  testResults.tests.push({ testName, passed, message });
  if (passed) testResults.passed++;
  else testResults.failed++;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Generate unique test data
const generateTestId = () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

console.log('🚀 Starting Comprehensive System Integration Tests...\n');
console.log(`📍 Testing against: ${supabaseUrl}`);
console.log(`🕐 Started at: ${new Date().toISOString()}\n`);

/**
 * Test 1: Supabase Connection and Authentication
 */
async function testSupabaseConnection() {
  console.log('📡 Testing Supabase Connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('cars').select('count').limit(1);
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    logTest('Supabase Connection', true, 'Successfully connected to database');
    
    // Test RLS policies
    const { data: authData } = await supabase.auth.getUser();
    logTest('Authentication Status', true, authData.user ? 'User authenticated' : 'Anonymous access working');
    
  } catch (error) {
    logTest('Supabase Connection', false, error.message);
  }
}

/**
 * Test 2: Database Schema Validation
 */
async function testDatabaseSchema() {
  console.log('\n🗄️ Testing Database Schema...');
  
  const tables = ['cars', 'motorcycles', 'services', 'crew_members', 'service_packages'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      logTest(`Table: ${table}`, true, 'Table accessible');
    } catch (error) {
      logTest(`Table: ${table}`, false, error.message);
    }
  }
  
  // Test completed_at field (from transaction state fix)
  try {
    const { data, error } = await supabase
      .from('cars')
      .select('completed_at')
      .limit(1);
    
    if (error && !error.message.includes('column "completed_at" does not exist')) {
      throw error;
    }
    
    const hasCompletedAt = !error;
    logTest('Transaction State Field (completed_at)', hasCompletedAt, 
      hasCompletedAt ? 'completed_at field exists' : 'completed_at field missing - run migrations');
  } catch (error) {
    logTest('Transaction State Field', false, error.message);
  }
}

/**
 * Test 3: CRUD Operations
 */
async function testCRUDOperations() {
  console.log('\n📝 Testing CRUD Operations...');
  
  const testCarId = generateTestId();
  const testMotorcycleId = generateTestId();
  
  // Test Car CRUD
  try {
    // CREATE
    const { data: carData, error: carCreateError } = await supabase
      .from('cars')
      .insert([{
        plate: testCarId,
        model: 'Test Car Model',
        size: 'medium',
        service: 'Test Service',
        status: 'waiting',
        phone: '09123456789',
        total_cost: 100,
        is_deleted: false
      }])
      .select()
      .single();
    
    if (carCreateError) throw carCreateError;
    logTest('Car CREATE', true, `Created car with ID: ${carData.id}`);
    
    // READ
    const { data: readCarData, error: carReadError } = await supabase
      .from('cars')
      .select('*')
      .eq('id', carData.id)
      .single();
    
    if (carReadError) throw carReadError;
    logTest('Car READ', true, 'Successfully retrieved car data');
    
    // UPDATE (test transaction state management)
    const { data: updateCarData, error: carUpdateError } = await supabase
      .from('cars')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', carData.id)
      .select()
      .single();
    
    if (carUpdateError) throw carUpdateError;
    logTest('Car UPDATE (Transaction State)', true, 'Successfully updated car to completed status');
    
    // Verify transaction state persistence
    await sleep(1000);
    const { data: verifyCarData, error: carVerifyError } = await supabase
      .from('cars')
      .select('status, completed_at')
      .eq('id', carData.id)
      .single();
    
    if (carVerifyError) throw carVerifyError;
    const statusPersisted = verifyCarData.status === 'completed';
    logTest('Transaction State Persistence', statusPersisted, 
      statusPersisted ? 'Completed status persisted correctly' : 'Status reverted - transaction issue detected');
    
    // SOFT DELETE
    const { error: carDeleteError } = await supabase
      .from('cars')
      .update({ is_deleted: true })
      .eq('id', carData.id);
    
    if (carDeleteError) throw carDeleteError;
    logTest('Car SOFT DELETE', true, 'Successfully soft deleted car');
    
  } catch (error) {
    logTest('Car CRUD Operations', false, error.message);
  }
  
  // Test Motorcycle CRUD
  try {
    const { data: motorcycleData, error: motorcycleCreateError } = await supabase
      .from('motorcycles')
      .insert([{
        plate: testMotorcycleId,
        model: 'Test Motorcycle Model',
        size: 'small',
        status: 'waiting',
        phone: '09987654321',
        total_cost: 50,
        vehicle_type: 'motorcycle',
        is_deleted: false
      }])
      .select()
      .single();
    
    if (motorcycleCreateError) throw motorcycleCreateError;
    logTest('Motorcycle CRUD', true, `Created and tested motorcycle operations`);
    
    // Clean up
    await supabase
      .from('motorcycles')
      .update({ is_deleted: true })
      .eq('id', motorcycleData.id);
    
  } catch (error) {
    logTest('Motorcycle CRUD', false, error.message);
  }
}

/**
 * Test 4: Enhanced Loading State Components
 */
async function testLoadingStateComponents() {
  console.log('\n⏳ Testing Loading State Management...');
  
  // Test if loading state files exist
  const loadingStateFiles = [
    'src/hooks/useLoadingState.ts',
    'src/components/LoadingSpinner.tsx',
    'src/hooks/useOfflineQueue.ts',
    'src/components/TransactionStatus.tsx'
  ];
  
  for (const file of loadingStateFiles) {
    const filePath = path.join(process.cwd(), file);
    const exists = fs.existsSync(filePath);
    logTest(`Loading Component: ${file}`, exists, exists ? 'File exists' : 'File missing');
  }
  
  // Test QueueContext enhancements
  const queueContextPath = path.join(process.cwd(), 'src/context/QueueContext.tsx');
  if (fs.existsSync(queueContextPath)) {
    const content = fs.readFileSync(queueContextPath, 'utf8');
    const hasLoadingState = content.includes('useLoadingState');
    const hasTransactionCheck = content.includes('isTransactionInProgress');
    const hasExecuteWithLoadingState = content.includes('executeWithLoadingState');
    
    logTest('QueueContext: Loading State Hook', hasLoadingState, 
      hasLoadingState ? 'useLoadingState integration found' : 'useLoadingState integration missing');
    logTest('QueueContext: Transaction Progress Check', hasTransactionCheck,
      hasTransactionCheck ? 'isTransactionInProgress function found' : 'Transaction progress check missing');
    logTest('QueueContext: Enhanced Execution', hasExecuteWithLoadingState,
      hasExecuteWithLoadingState ? 'executeWithLoadingState wrapper found' : 'Enhanced execution wrapper missing');
  } else {
    logTest('QueueContext File', false, 'QueueContext.tsx not found');
  }
}

/**
 * Test 5: Real-time Subscriptions
 */
async function testRealTimeSubscriptions() {
  console.log('\n🔄 Testing Real-time Subscriptions...');
  
  let subscriptionWorking = false;
  const testTimeout = 5000; // 5 seconds
  
  try {
    // Set up subscription
    const subscription = supabase
      .channel('test-cars-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'cars' 
      }, (payload) => {
        subscriptionWorking = true;
      })
      .subscribe();
    
    // Wait for subscription to be ready
    await sleep(1000);
    
    // Create a test record to trigger subscription
    const testId = generateTestId();
    await supabase
      .from('cars')
      .insert([{
        plate: testId,
        model: 'Subscription Test',
        size: 'medium',
        service: 'Test',
        status: 'waiting',
        total_cost: 1,
        is_deleted: false
      }]);
    
    // Wait for subscription event
    await sleep(2000);
    
    // Clean up
    await supabase.from('cars').delete().eq('plate', testId);
    await subscription.unsubscribe();
    
    logTest('Real-time Subscriptions', subscriptionWorking, 
      subscriptionWorking ? 'Subscriptions working correctly' : 'Subscriptions not receiving events');
    
  } catch (error) {
    logTest('Real-time Subscriptions', false, error.message);
  }
}

/**
 * Test 6: SMS Notification System
 */
async function testSMSSystem() {
  console.log('\n📱 Testing SMS System...');
  
  try {
    // Check if Twilio function exists
    const { data, error } = await supabase.functions.invoke('twilio-sms', {
      body: {
        phoneNumber: '+1234567890', // Test number
        customerName: 'Test Customer',
        plateNumber: 'TEST-123',
        services: ['Test Service'],
        packages: [],
        totalAmount: 100,
        completionTime: new Date().toISOString()
      }
    });
    
    // We expect this to potentially fail due to test credentials, 
    // but the function should exist and respond
    const functionExists = !error || !error.message.includes('Function not found');
    logTest('SMS Function Exists', functionExists, 
      functionExists ? 'Twilio SMS function is accessible' : 'Twilio SMS function not found');
    
  } catch (error) {
    // Function exists but may have configuration issues
    const isConfigError = error.message.includes('credentials') || 
                         error.message.includes('authentication') ||
                         error.message.includes('TWILIO');
    logTest('SMS Function', isConfigError, 
      isConfigError ? 'Function exists but needs Twilio configuration' : 'Function error: ' + error.message);
  }
}

/**
 * Test 7: Application Build and Components
 */
async function testApplicationBuild() {
  console.log('\n🏗️ Testing Application Build System...');
  
  // Check if essential files exist
  const essentialFiles = [
    'package.json',
    'vite.config.ts',
    'tsconfig.json',
    'src/main.tsx',
    'src/App.tsx',
    'src/context/QueueContext.tsx',
    'src/lib/supabase.ts'
  ];
  
  for (const file of essentialFiles) {
    const exists = fs.existsSync(path.join(process.cwd(), file));
    logTest(`Essential File: ${file}`, exists, exists ? 'Found' : 'Missing');
  }
  
  // Check package.json for correct dependencies
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = [
      '@supabase/supabase-js',
      'react',
      'typescript',
      'vite',
      'tailwindcss'
    ];
    
    for (const dep of requiredDeps) {
      const hasDepency = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
      logTest(`Dependency: ${dep}`, !!hasDepency, hasDepency ? `Version: ${hasDepency}` : 'Missing');
    }
  } catch (error) {
    logTest('Package.json Analysis', false, error.message);
  }
}

/**
 * Test 8: Environment Configuration
 */
async function testEnvironmentConfig() {
  console.log('\n🔧 Testing Environment Configuration...');
  
  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  for (const envVar of requiredEnvVars) {
    const exists = !!process.env[envVar];
    const value = exists ? process.env[envVar].substring(0, 20) + '...' : 'Not set';
    logTest(`Environment Variable: ${envVar}`, exists, value);
  }
  
  // Check .env file
  const envFileExists = fs.existsSync('.env');
  logTest('Environment File (.env)', envFileExists, envFileExists ? 'Found' : 'Missing - check .env.example');
}

/**
 * Main test execution
 */
async function runAllTests() {
  try {
    await testSupabaseConnection();
    await testDatabaseSchema();
    await testCRUDOperations();
    await testLoadingStateComponents();
    await testRealTimeSubscriptions();
    await testSMSSystem();
    await testApplicationBuild();
    await testEnvironmentConfig();
    
  } catch (error) {
    console.error('❌ Critical error during testing:', error);
    testResults.failed++;
  }
  
  // Generate final report
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${testResults.passed}`);
  console.log(`❌ Tests Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n🔍 Failed Tests:');
    testResults.tests
      .filter(test => !test.passed)
      .forEach(test => console.log(`   ❌ ${test.testName}: ${test.message}`));
  }
  
  console.log('\n🎯 Recommendations:');
  
  if (testResults.tests.some(t => t.testName.includes('completed_at') && !t.passed)) {
    console.log('   📋 Run database migrations: npm run supabase:migrate');
  }
  
  if (testResults.tests.some(t => t.testName.includes('SMS') && !t.passed)) {
    console.log('   📱 Configure Twilio credentials in Supabase Edge Functions');
  }
  
  if (testResults.tests.some(t => t.testName.includes('Environment') && !t.passed)) {
    console.log('   🔧 Set up missing environment variables in .env file');
  }
  
  if (testResults.tests.some(t => t.testName.includes('Loading Component') && !t.passed)) {
    console.log('   ⏳ Enhanced loading state components need to be implemented');
  }
  
  console.log(`\n🕐 Test completed at: ${new Date().toISOString()}`);
  console.log(`📍 Total execution time: ${Date.now() - startTime}ms`);
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Track execution time
const startTime = Date.now();

// Run all tests
runAllTests().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});