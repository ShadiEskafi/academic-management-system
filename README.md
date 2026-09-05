![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla%20ES6-F7DF1E?logo=javascript&logoColor=black)
![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

# Academic Management System 🎓

A modular, production-ready Single Page Application (SPA) designed to manage university semesters, courses, and topic hierarchies with database-enforced integrity. Built with vanilla JavaScript, modern architectural patterns, and Supabase.

---

## 🚀 Key Features & Architectural Highlights

- **Clean Architecture & Separation of Concerns:** Strict isolation between API calls, state management, pure presentation components, and page controllers.
- **Hierarchical Topic Tree (Recursive CTE):** Topic trees fetched in a single roundtrip via a custom PostgreSQL RPC (`get_course_topic_tree`), preventing $N+1$ query issues.
- **Database-Driven Integrity & Triggers:** Automated leaf-to-parent status propagation and course progress calculations handled entirely within Postgres.
- **Custom Hash Router:** Zero-dependency SPA client routing supporting dynamic route parameters (`#/courses/:id/topics`), navigation teardown/cleanup, and route guards.
- **Concurrency & Memory Safeguards:** Token-based invalidation to discard stale async requests (Race Conditions) and strict subscription cleanup to eliminate memory leaks.
- **Row-Level Security (RLS):** Fully scoped database authorization policies ensuring users can only interact with their own academic records.

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla JavaScript (ES Modules), Vite, CSS3
- **Backend & Database:** Supabase, PostgreSQL (Triggers, Recursive CTEs, Custom RPCs, RLS)
- **Tooling & Workflow:** Git & GitHub Flow, Conventional Commits

---

## 📂 Project Architecture

\`\`\`text
academic-management-system/
├── src/
│   ├── api/          # Supabase client queries & RPC endpoints (topics, courses, semesters, auth)
│   ├── components/   # Pure presentation components (AppShell, TopicNode, TopicForm, CourseForm)
│   ├── pages/        # Page orchestrators managing layout and event subscriptions
│   ├── state/        # Pub/Sub store and hash-based router
│   ├── style.css     # Global layout and design tokens
│   └── main.js       # App entry point, session listener, cleanup, and route guards
├── public/           # Static assets
└── index.html
\`\`\`

---

## ⚡ Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- A Supabase project with applied SQL schemas and RPC migrations

### Installation

1. **Clone the repository:**
   \`\`\`bash
   git clone https://github.com/ShadiEskafi/academic-management-system.git
   cd academic-management-system
   \`\`\`

2. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Configure environment variables:**
   Create a \`.env\` file in the root directory:
   \`\`\`env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   \`\`\`

4. **Run the local development server:**
   \`\`\`bash
   npm run dev
   \`\`\`

---

## 🛡️ License

This project is licensed under the **Business Source License 1.1 (BSL 1.1)**. 
- **Free for:** Non-commercial, educational, local development, and evaluation use.
- **Restricted:** You may **not** offer this software as a hosted service (SaaS) or commercial offering without prior written authorization.
- See the full [LICENSE](LICENSE) file for exact terms.

