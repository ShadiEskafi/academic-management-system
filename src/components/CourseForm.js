// src/components/CourseForm.js
// Component "غبي": فورم إنشاء + قائمة عرض ودعم عمليات التعديل والحذف.

export function renderCourseForm(
  container,
  {
    semesterTitle,
    courses,
    onCreate,
    onBack,
    onSelectCourse,
    onContinueCourse,
    onLogAchievement,
    onEditCourse,
    onDeleteCourse,
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
          <option value="low">Priority: Low</option>
          <option value="medium" selected>Priority: Medium</option>
          <option value="high">Priority: High</option>
        </select>

        <p style="font-size:12px;opacity:0.7;">
          * Credit Hours وDifficulty إجباريين —
          بيُستخدموا لحساب أولوية الجدولة تلقائيًا.
        </p>

        <button type="submit">Add Course</button>
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
          courses.map((c) => `
            <li
              style="padding:0.6rem 0.5rem;border-bottom:1px solid #333;"
            >
              <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;">
                <button
                  type="button"
                  class="course-title-btn"
                  data-course-id="${c.id}"
                  style="
                    background:none;
                    border:none;
                    padding:0;
                    cursor:pointer;
                    font:inherit;
                    text-align:left;
                    flex:1;
                    min-width:0;
                    overflow:hidden;
                    text-overflow:ellipsis;
                    white-space:nowrap;
                  "
                >
                  <strong>${c.title}</strong>
                </button>

                <div style="display:flex;gap:5px;align-items:center;flex-shrink:0;">
                  <button
                    type="button"
                    class="edit-course-btn"
                    data-course-id="${c.id}"
                    title="تعديل المساق"
                    style="background:none;border:1px solid #444;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:12px;"
                  >
                    ✏️
                  </button>

                  <button
                    type="button"
                    class="delete-course-btn"
                    data-course-id="${c.id}"
                    title="حذف المساق"
                    style="background:none;border:1px solid #444;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:12px;color:#ef4444;"
                  >
                    🗑️
                  </button>

                  <button
                    type="button"
                    class="log-achievement-btn"
                    data-course-id="${c.id}"
                    style="font-size:12px;padding:3px 8px;cursor:pointer;"
                  >
                    سجّل إنجاز جديد
                  </button>
                </div>
              </div>

              <span style="opacity:0.7;font-size:13px;">
                — ${c.credit_hours} CH,
                ${c.difficulty},
                priority: ${c.priority}
              </span>
              <br/>
              <span style="opacity:0.9;font-size:13px;">
                ${c.current_position_topic_title
                  ? `آخر موضع: <span style="font-weight:600; color:#3b82f6;">${c.current_position_topic_title}</span>`
                  : '<span style="opacity:0.6;">لسا ما في موضع مسجّل</span>'}
              </span>

              ${
                c.current_position_topic_id
                  ? `
                    <br/>
                    <button
                      type="button"
                      class="continue-course-btn"
                      data-course-id="${c.id}"
                      data-topic-id="${c.current_position_topic_id}"
                      style="margin-top: 6px; font-size: 13px; padding: 4px 10px;"
                    >
                      أكمل من هون
                    </button>
                  `
                  : ''
              }
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

  // الانتقال إلى Course Detail عند الضغط على اسم المساق
  container.querySelectorAll('.course-title-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const courseId = button.dataset.courseId;
      if (onSelectCourse) {
        onSelectCourse(courseId);
      }
    });
  });

  // فتح Modal تعديل المساق
  container.querySelectorAll('.edit-course-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const courseId = button.dataset.courseId;
      const course = courses.find((c) => c.id === courseId);
      if (course && onEditCourse) {
        onEditCourse(course);
      }
    });
  });

  // فتح Modal حذف المساق
  container.querySelectorAll('.delete-course-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const courseId = button.dataset.courseId;
      const course = courses.find((c) => c.id === courseId);
      if (course && onDeleteCourse) {
        onDeleteCourse(course);
      }
    });
  });

  // الانتقال مباشرة إلى Current Position عند الضغط على "أكمل من هون"
  container.querySelectorAll('.continue-course-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const courseId = button.dataset.courseId;
      const topicId = button.dataset.topicId;

      if (onContinueCourse) {
        onContinueCourse(courseId, topicId);
      }
    });
  });

  // فتح Modal تسجيل الإنجاز عند الضغط على "سجّل إنجاز جديد"
  container.querySelectorAll('.log-achievement-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const courseId = button.dataset.courseId;

      if (onLogAchievement) {
        onLogAchievement(courseId);
      }
    });
  });

  container
    .querySelector('#course-form')
    .addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(e.target);
      const errorEl = container.querySelector('#course-error');

      errorEl.textContent = '';

      const submitBtn = e.target.querySelector('button[type="submit"]');
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
          result.error.message ?? 'حدث خطأ، حاول مرة ثانية';
      } else {
        e.target.reset();
      }
    });
}