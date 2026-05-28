-- Postgraduate Research Management System Seed Data
USE postgraduate_research_system;

-- Insert Faculties
INSERT INTO faculties (name, abbreviation) VALUES
('Faculty of Science', 'FST'),
('Faculty of Engineering', 'FET'),
('Faculty of Business', 'FBM'),
('Faculty of Arts', 'FAH');

-- Insert Departments
INSERT INTO departments (faculty_id, name) VALUES
(1, 'Computer Science'),
(1, 'Mathematics'),
(1, 'Physics'),
(2, 'Civil Engineering'),
(2, 'Electrical Engineering'),
(2, 'Mechanical Engineering'),
(3, 'Management'),
(3, 'Finance'),
(3, 'Marketing'),
(4, 'English'),
(4, 'History'),
(4, 'Philosophy');

-- Insert Users with hashed passwords (password123 for all)
-- Note: In production, use proper password hashing
INSERT INTO users (name, email, password, role, faculty_id, department_id, status) VALUES
-- Super Admin
('Super Admin', 'superadmin@research.test', '$2a$10$.apeKpjkzGpP2LoVFNXUNOeZSG8M9CIX4FpyC3RlyfTBYIzAqLI0m', 'super_admin', NULL, NULL, 'active'),
-- Admin
('Admin User', 'admin@research.test', '$2a$10$.apeKpjkzGpP2LoVFNXUNOeZSG8M9CIX4FpyC3RlyfTBYIzAqLI0m', 'admin', NULL, NULL, 'active'),
-- Faculty
('Faculty User 1', 'faculty@research.test', '$2a$10$.apeKpjkzGpP2LoVFNXUNOeZSG8M9CIX4FpyC3RlyfTBYIzAqLI0m', 'faculty', 1, 1, 'active'),
('Faculty User 2', 'faculty2@research.test', '$2a$10$.apeKpjkzGpP2LoVFNXUNOeZSG8M9CIX4FpyC3RlyfTBYIzAqLI0m', 'faculty', 2, 4, 'active'),
-- Students
('Student User 1', 'student@research.test', '$2a$10$.apeKpjkzGpP2LoVFNXUNOeZSG8M9CIX4FpyC3RlyfTBYIzAqLI0m', 'student', 1, 1, 'active'),
('Student User 2', 'student2@research.test', '$2a$10$.apeKpjkzGpP2LoVFNXUNOeZSG8M9CIX4FpyC3RlyfTBYIzAqLI0m', 'student', 2, 4, 'active'),
('Student User 3', 'student3@research.test', '$2a$10$.apeKpjkzGpP2LoVFNXUNOeZSG8M9CIX4FpyC3RlyfTBYIzAqLI0m', 'student', 1, 1, 'active'),
-- Supervisors
('Supervisor User 1', 'supervisor@research.test', '$2a$10$.apeKpjkzGpP2LoVFNXUNOeZSG8M9CIX4FpyC3RlyfTBYIzAqLI0m', 'supervisor', 1, 1, 'active'),
('Supervisor User 2', 'supervisor2@research.test', '$2a$10$.apeKpjkzGpP2LoVFNXUNOeZSG8M9CIX4FpyC3RlyfTBYIzAqLI0m', 'supervisor', 2, 4, 'active'),
('Co-Supervisor User 1', 'cosupervisor@research.test', '$2a$10$.apeKpjkzGpP2LoVFNXUNOeZSG8M9CIX4FpyC3RlyfTBYIzAqLI0m', 'co_supervisor', 1, 1, 'active'),
-- Auditors
('Auditor User 1', 'auditor@research.test', '$2a$10$.apeKpjkzGpP2LoVFNXUNOeZSG8M9CIX4FpyC3RlyfTBYIzAqLI0m', 'auditor', NULL, NULL, 'active'),
('Auditor User 2', 'auditor2@research.test', '$2a$10$.apeKpjkzGpP2LoVFNXUNOeZSG8M9CIX4FpyC3RlyfTBYIzAqLI0m', 'auditor', NULL, NULL, 'active'),
-- External Reviewers
('External Reviewer 1', 'reviewer@research.test', '$2a$10$.apeKpjkzGpP2LoVFNXUNOeZSG8M9CIX4FpyC3RlyfTBYIzAqLI0m', 'external_reviewer', NULL, NULL, 'active'),
('External Reviewer 2', 'reviewer2@research.test', '$2a$10$.apeKpjkzGpP2LoVFNXUNOeZSG8M9CIX4FpyC3RlyfTBYIzAqLI0m', 'external_reviewer', NULL, NULL, 'active');

-- Insert Students
-- user_id 5 = Student User 1, 6 = Student User 2, 7 = Student User 3
INSERT INTO students (user_id, registration_number, program, faculty_id, department_id, research_status, current_stage) VALUES
(5, 'REG2024001', 'MSc Computer Science', 1, 1, 'in_progress', 'title_proposal'),
(6, 'REG2024002', 'MSc Civil Engineering', 2, 4, 'in_progress', 'title_proposal'),
(7, 'REG2024003', 'PhD Computer Science', 1, 1, 'not_started', 'title_proposal');

-- Insert Supervisors
-- user_id 8 = Supervisor User 1, 9 = Supervisor User 2, 10 = Co-Supervisor User 1
INSERT INTO supervisors (user_id, faculty_id, department_id, specialization, max_students, current_students, supervisor_type, status) VALUES
(8, 1, 1, 'Artificial Intelligence', 5, 2, 'main', 'active'),
(9, 2, 4, 'Structural Engineering', 5, 1, 'main', 'active'),
(10, 1, 1, 'Machine Learning', 5, 1, 'co', 'active');

-- Insert Sample Research Titles
INSERT INTO research_titles (student_id, title, description, research_area, supervisor_id, co_supervisor_id, faculty_status, admin_status, final_status, submitted_at) VALUES
(1, 'Machine Learning Approaches for Climate Change Prediction', 'This research aims to develop machine learning models to predict climate change patterns using historical data.', 'Artificial Intelligence', 1, 3, 'pending', 'pending', 'pending', NOW()),
(2, 'Sustainable Building Materials for Green Construction', 'Investigating eco-friendly building materials for sustainable construction practices.', 'Civil Engineering', 2, NULL, 'pending', 'pending', 'pending', NOW());

-- Insert Sample Notifications
-- user_id 5,6,7 = Student User 1,2,3
INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
(5, 'Welcome to Research System', 'Welcome to the Postgraduate Research Management System. Please submit your research title proposal.', 'info', FALSE),
(6, 'Welcome to Research System', 'Welcome to the Postgraduate Research Management System. Please submit your research title proposal.', 'info', FALSE),
(7, 'Welcome to Research System', 'Welcome to the Postgraduate Research Management System. Please submit your research title proposal.', 'info', FALSE);

-- Insert Sample Audit Logs
INSERT INTO audit_logs (user_id, action, module, description, ip_address) VALUES
(1, 'System Initialization', 'System', 'Database initialized with seed data', '127.0.0.1');
