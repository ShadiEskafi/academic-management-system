// src/main.js
import './style.css';
import { renderAuthPage } from './pages/AuthPage.js';
import { renderSemestersPage } from './pages/SemestersPage.js';
import { renderCoursesPage } from './pages/CoursesPage.js';

const app = document.querySelector('#app');
app.innerHTML = '<h1>Academic Management System</h1><div id="page-container"></div>';

const pageContainer = document.querySelector('#page-container');

function showSemesters() {
  renderSemestersPage(pageContainer, {
    onSelectSemester: (semester) => showCourses(semester),
  });
}

function showCourses(semester) {
  renderCoursesPage(pageContainer, {
    semester,
    onBack: () => showSemesters(),
  });
}

renderAuthPage(pageContainer, {
  onAuthSuccess: () => showSemesters(),
});