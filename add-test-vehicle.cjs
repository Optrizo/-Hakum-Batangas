// Test script to add a vehicle for today to verify filtering works
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://exeaatzqvvqupgsjvxml.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4ZWFhdHpxdnZxdXBnc2p2eG1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTcxOTIsImV4cCI6MjA2ODY5MzE5Mn0.42kiPvrEyiVzA0SQKQJQH3HQ21qbVYfLJ3HUaZtGQlg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function addTestVehicle() {
  try {
    console.log('🚗 Adding test vehicle for today...');
    
    const testCar = {
      plate: `TEST-${Math.floor(Math.random() * 1000)}`,
      model: 'Test Vehicle',
      size: 'medium',
      service: 'Basic Wash',
      services: [],
      status: 'waiting',
      phone: '09165223152',
      crew: [],
      total_cost: 200,
      is_deleted: false
    };

    const { data, error } = await supabase
      .from('cars')
      .insert([testCar])
      .select()
      .single();

    if (error) {
      console.error('❌ Error adding test vehicle:', error.message);
      return;
    }

    console.log('✅ Test vehicle added successfully:', {
      id: data.id,
      plate: data.plate,
      status: data.status,
      created_at: data.created_at
    });

    // Check if it's created today
    const isToday = (dateString) => {
      const date = new Date(dateString);
      const today = new Date();
      return date.getDate() === today.getDate() &&
             date.getMonth() === today.getMonth() &&
             date.getFullYear() === today.getFullYear();
    };

    console.log('📅 Is today\'s vehicle:', isToday(data.created_at));
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

addTestVehicle();