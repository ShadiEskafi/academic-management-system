// src/main.js
import './style.css';
import { supabase } from './api/supabaseClient.js';

document.querySelector('#app').innerHTML = `
  <h1>Academic Management System</h1>
  <p id="status">Checking Supabase connection...</p>
`;

async function checkConnection() {
  const { data, error } = await supabase.auth.getSession();
  const statusEl = document.querySelector('#status');

  if (error) {
    statusEl.textContent = `❌ Connection error: ${error.message}`;
  } else {
    statusEl.textContent = '✅ Supabase client connected successfully (no session yet)';
  }
}

checkConnection();