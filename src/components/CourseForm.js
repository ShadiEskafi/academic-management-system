// src/components/CourseForm.js
// Component "غبي": فورم إنشاء + قائمة عرض.
// Credit Hours وDifficulty إجباريين
// (Phase 06: مُدخلات مباشرة لخوارزمية Priority Score — Phase 06.5, BR-3).

export function renderCourseForm(
  container,
  {
    semesterTitle,
    courses,
    onCreate,
    onBack,
    onSelectCourse,
  }
) {
  container.innerHTML = `
    <div style="max-width:420px;margin:2rem auto;">

      <button
        id="back-btn"
        style="background:none;border:none;text-decoration:underline;cursor:pointer;margin-bottom:1rem;"
      >
        ← Back to Semesters
      </button>

      <h2>Courses — ${semesterTitle}</h2>

      <form
        id="course-form"
        style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:1rem;"
      >
        <input
          type="text"
          name="title"
          placeholder="Course title"
          required
        />

        <div style="display:flex;gap:0.5rem;">
          <input
            type="number"
            name="creditHours"
            placeholder="Credit Hours *"
            min="1"
            required
            style="flex:1;"
          />

          <select
            name="difficulty"
            required
            style="flex:1;"
          >
            <option value="" disabled selected>
              Difficulty *
            </option>

            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <select name="priority">
          <option value="low">
            Priority: Low
          </option>

          <option value="medium" selected>
            Priority: Medium
          </option>

          <option value="high">
            Priority: High
          </option>
        </select>

        <p style="font-size:12px;opacity:0.7;">
          * Credit Hours وDifficulty إجباريين —
          بيُستخدموا لحساب أولوية الجدولة تلقائيًا.
        </p>

        <button type="submit">
          Add Course
        </button>
      </form>

      <p
        id="course-error"
        style="color:#e05252;font-size:14px;"
      ></p>

      <ul
        id="course-list"
        style="list-style:none;padding:0;"
      >
        ${
          courses.map((course) => `
            <li
              style="padding:0.5rem;border-bottom:1px solid #333;"
            >
              <button
                type="button"
                class="course-link"
                data-course-id="${course.id}"
                style="
                  background:none;
                  border:none;
                  padding:0;
                  cursor:pointer;
                  font:inherit;
                  text-align:left;
                "
              >
                <strong>${course.title}</strong>
              </button>

              <span style="opacity:0.7;font-size:13px;">
                — ${course.credit_hours} CH,
                ${course.difficulty},
                priority: ${course.priority}
              </span>
            </li>
          `).join('') ||
          '<li style="opacity:0.6;">No courses yet.</li>'
        }
      </ul>
    </div>
  `;

  container
    .querySelector('#back-btn')
    .addEventListener('click', () => onBack());

  // الضغط على اسم المساق يفتح Course Detail
  container.querySelectorAll('.course-link').forEach((button) => {
    button.addEventListener('click', () => {
      const courseId = button.dataset.courseId;

      const course = courses.find((item) => item.id === courseId);

      if (course && onSelectCourse) {
        onSelectCourse(course);
      }
    });
  });

  container
    .querySelector('#course-form')
    .addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(event.target);

      const errorEl = container.querySelector('#course-error');

      errorEl.textContent = '';

      const submitBtn = event.target.querySelector(
        'button[type="submit"]'
      );

      submitBtn.disabled = true;

      const result = await onCreate({
        title: formData.get('title'),
        creditHours: Number(formData.get('creditHours')),
        difficulty: formData.get('difficulty'),
        priority: formData.get('priority'),
      });

      submitBtn.disabled = false;

      if (result?.error) {
        errorEl.textContent =
          result.error.message ??
          'حدث خطأ، حاول مرة ثانية';

        return;
      }

      event.target.reset();
    });
}