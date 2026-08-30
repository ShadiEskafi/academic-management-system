// src/main.js
import './style.css';
import { renderAuthPage } from './pages/AuthPage.js';
import { renderSemestersPage } from './pages/SemestersPage.js';

const app = document.querySelector('#app');
app.innerHTML = '<h1>Academic Management System</h1><div id="page-container"></div>';

const pageContainer = document.querySelector('#page-container');

renderAuthPage(pageContainer, {
  onAuthSuccess: () => {
    renderSemestersPage(pageContainer);
  },
});