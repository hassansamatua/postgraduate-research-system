# Postgraduate Research Management System

A comprehensive web-based system for managing postgraduate research processes from title proposal to completion approval.

## Technology Stack

- **Frontend**: Next.js 16 with React 19
- **Backend**: Next.js API Routes
- **Database**: MySQL (with XAMPP)
- **Styling**: Tailwind CSS
- **Authentication**: JWT-based authentication
- **Icons**: Lucide React

## Features

### User Roles

The system supports six user roles:

1. **Student** - Submit research proposals, track progress, communicate with supervisors
2. **Admin/Postgraduate Coordinator** - Manage users, authorize topics, schedule defenses, make final decisions
3. **Faculty** - Review academic quality, approve proposals and reports
4. **Supervisor/Co-Supervisor** - Guide students, review documents, approve work
5. **Auditors (DVC Academic, Quality Assurance)** - Monitor compliance, add audit comments
6. **External Reviewer** - Review final research reports and provide recommendations

### Research Workflow Stages

1. **Title Proposal** - Student proposes research title and selects supervisor
2. **Faculty Review** - Faculty reviews and approves/rejects the topic
3. **Admin Authorization** - Admin authorizes approved topics
4. **Proposal Stage** - Student uploads proposal document for supervisor review
5. **Proposal Defense** - Admin schedules and conducts proposal defense
6. **Chapter 4 & Chapter 5** - Student works on research chapters
7. **Final Report** - Student submits complete research report
8. **Final Defense** - Admin schedules and conducts final defense
9. **External Review** - External reviewer evaluates the final report
10. **Completion** - Admin makes final completion decision

## Installation

### Prerequisites

- Node.js 18 or higher
- XAMPP (or any MySQL server)
- npm, yarn, pnpm, or bun

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Set Up Database

1. Start XAMPP and ensure MySQL is running
2. Open phpMyAdmin (http://localhost/phpmyadmin)
3. Create a new database named `postgraduate_research_system`
4. Import the schema file:
   ```bash
   mysql -u root -p postgraduate_research_system < database/schema.sql
   ```
5. Import the seed data:
   ```bash
   mysql -u root -p postgraduate_research_system < database/seed.sql
   ```

### Step 3: Configure Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Update the following variables in `.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=postgraduate_research_system
DB_PORT=3306

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Step 4: Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Login Credentials

The system comes with pre-configured test accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@research.test | password123 |
| Student | student@research.test | password123 |
| Faculty | faculty@research.test | password123 |
| Supervisor | supervisor@research.test | password123 |
| Auditor | auditor@research.test | password123 |
| External Reviewer | reviewer@research.test | password123 |

## Project Structure

```
/postgraduate-research-system
  /app
    /login
    /dashboard
      /student
      /admin
      /faculty
      /supervisor
      /auditor
      /external-reviewer
    /api
      /auth
      /students
      /supervisors
      /research-titles
      /documents
      /approvals
      /defenses
      /external-reviews
      /messages
      /notifications
      /reports
  /components
    /ui
    dashboard-layout.tsx
  /lib
    db.ts
    auth.ts
    utils.ts
  /middleware.ts
  /database
    schema.sql
    seed.sql
  .env.example
  README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Students
- `GET /api/students` - Get all students
- `POST /api/students` - Create new student
- `GET /api/students/[id]` - Get student by ID
- `PUT /api/students/[id]` - Update student

### Supervisors
- `GET /api/supervisors` - Get all supervisors
- `POST /api/supervisors` - Create new supervisor

### Research Titles
- `GET /api/research-titles` - Get research titles
- `POST /api/research-titles` - Submit research title
- `PUT /api/research-titles/[id]` - Update research title

### Documents
- `GET /api/documents` - Get documents
- `POST /api/documents` - Upload document
- `PUT /api/documents/[id]` - Update document status

### Approvals
- `GET /api/approvals` - Get approvals
- `POST /api/approvals` - Create approval

### Defenses
- `GET /api/defenses` - Get defenses
- `POST /api/defenses` - Schedule defense
- `PUT /api/defenses/[id]` - Update defense result

### External Reviews
- `GET /api/external-reviews` - Get external reviews
- `POST /api/external-reviews` - Assign external reviewer
- `PUT /api/external-reviews/[id]` - Submit external review

### Messages
- `GET /api/messages` - Get messages
- `POST /api/messages` - Send message

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications` - Mark notifications as read

### Audit Comments
- `GET /api/audit-comments` - Get audit comments
- `POST /api/audit-comments` - Add audit comment

### Reports
- `GET /api/reports?type=student_progress` - Student progress report
- `GET /api/reports?type=supervisor_workload` - Supervisor workload report
- `GET /api/reports?type=faculty_status` - Faculty status report
- `GET /api/reports?type=pending_approvals` - Pending approvals report
- `GET /api/reports?type=completed_research` - Completed research report
- `GET /api/reports?type=audit_compliance` - Audit compliance report

## System Workflow

### Stage 1: Title Proposal
- Student submits research title with supervisor selection
- Status: Pending Faculty Review

### Stage 2: Faculty Review
- Faculty reviews topic and supervisor
- Can approve, reject, or request correction
- If approved: Status becomes Pending Admin Authorization

### Stage 3: Admin Authorization
- Admin reviews faculty-approved topics
- Can authorize, reject, or return for correction
- If authorized: Student unlocks Proposal Stage

### Stage 4: Proposal Stage
- Student uploads proposal document
- Supervisor reviews and adds comments
- If supervisor approves: Goes to Faculty review
- If faculty approves: Ready for Proposal Defense

### Stage 5: Proposal Defense
- Admin schedules defense with date, time, venue, panel
- Student presents proposal
- Admin records result (passed, corrections, failed)
- If passed: Student unlocks Chapter 4 & 5

### Stage 6: Chapter 4 & Chapter 5
- Student uploads Chapter 4 and Chapter 5 documents
- Supervisor reviews and approves
- If approved: Student can proceed to Final Report

### Stage 7: Final Report
- Student submits complete research report
- Supervisor reviews and approves
- Faculty reviews and approves for final defense
- If approved: Ready for Final Defense

### Stage 8: Final Defense
- Admin schedules final defense
- Student presents final research
- Admin records result
- If passed: Report sent to External Reviewer

### Stage 9: External Review
- External reviewer evaluates final report
- Submits marks, comments, and recommendation
- Admin reviews external evaluation

### Stage 10: Completion
- Admin makes final completion decision
- Student status becomes Research Completed
- System generates completion report

## Security Features

- JWT-based authentication
- Role-based access control
- Protected API routes
- SQL injection prevention
- File upload validation (PDF, DOC, DOCX only)
- Password hashing with bcrypt
- Audit logging for all actions

## Development

### Build for Production

```bash
npm run build
npm start
```

### Lint Code

```bash
npm run lint
```

## Troubleshooting

### Database Connection Issues
- Ensure XAMPP MySQL is running
- Check database credentials in `.env`
- Verify database name matches

### Module Not Found Errors
- Run `npm install` to install all dependencies
- Clear Next.js cache: `rm -rf .next`

### Authentication Issues
- Check JWT_SECRET in `.env`
- Verify token is being set in cookies
- Check middleware configuration

## License

This project is for educational purposes.

## Support

For issues or questions, please contact the development team.
