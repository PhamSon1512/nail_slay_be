# DATABASE SCHEMA - HỆ THỐNG LMS

## 1. TỔNG QUAN KIẾN TRÚC DATABASE

### 1.1 Nguyên tắc thiết kế
- Chuẩn hóa dữ liệu (3NF)
- Tối ưu hóa performance với indexing
- Hỗ trợ horizontal scaling
- Audit trail cho tất cả thay đổi quan trọng
- Soft delete cho dữ liệu quan trọng

### 1.2 Công nghệ sử dụng
- **Primary Database**: PostgreSQL/MySQL
- **Cache**: Redis
- **File Storage**: AWS S3/CloudFlare R2
- **Search Engine**: Elasticsearch (optional)
- **Analytics**: ClickHouse (optional)

## 2. CORE TABLES

### 2.1 Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    status ENUM('pending', 'active', 'suspended', 'deleted') DEFAULT 'pending',
    email_verified_at TIMESTAMP,
    last_login_at TIMESTAMP,
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);
```

### 2.2 Roles & Permissions
```sql
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
    role_id INT,
    permission_id INT,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE user_roles (
    user_id UUID,
    role_id INT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID,
    expires_at TIMESTAMP NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id)
);
```

### 2.3 Organizations & Groups
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    website VARCHAR(255),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    settings JSON,
    status ENUM('active', 'suspended', 'deleted') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_slug (slug),
    INDEX idx_status (status)
);

CREATE TABLE user_organizations (
    user_id UUID,
    organization_id UUID,
    role ENUM('owner', 'admin', 'member') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, organization_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);
```

## 3. COURSE MANAGEMENT TABLES

### 3.1 Categories & Tags
```sql
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id INT NULL,
    sort_order INT DEFAULT 0,
    icon VARCHAR(100),
    color VARCHAR(7),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_parent_id (parent_id),
    INDEX idx_slug (slug),
    INDEX idx_active (is_active)
);

CREATE TABLE tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    color VARCHAR(7),
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 Courses
```sql
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description TEXT,
    thumbnail_url TEXT,
    trailer_video_url TEXT,
    category_id INT,
    instructor_id UUID NOT NULL,
    organization_id UUID,
    
    -- Course settings
    level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    language VARCHAR(10) DEFAULT 'en',
    duration_hours DECIMAL(5,2),
    max_students INT,
    
    -- Pricing
    price DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    discount_price DECIMAL(10,2),
    discount_expires_at TIMESTAMP,
    
    -- Status and visibility
    status ENUM('draft', 'review', 'published', 'archived') DEFAULT 'draft',
    visibility ENUM('public', 'private', 'organization') DEFAULT 'public',
    
    -- Requirements and outcomes
    requirements JSON,
    learning_outcomes JSON,
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords TEXT,
    
    -- Statistics
    enrolled_count INT DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0.00,
    rating_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    
    -- Timestamps
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    
    INDEX idx_slug (slug),
    INDEX idx_instructor (instructor_id),
    INDEX idx_category (category_id),
    INDEX idx_status (status),
    INDEX idx_published_at (published_at),
    INDEX idx_rating (rating_average),
    FULLTEXT idx_search (title, description, short_description)
);

CREATE TABLE course_tags (
    course_id UUID,
    tag_id INT,
    PRIMARY KEY (course_id, tag_id),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

### 3.3 Course Structure
```sql
CREATE TABLE course_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_course_id (course_id),
    INDEX idx_sort_order (sort_order)
);

CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type ENUM('video', 'text', 'quiz', 'assignment', 'file', 'live_session') NOT NULL,
    content_data JSON, -- Flexible content storage
    duration_minutes INT,
    sort_order INT DEFAULT 0,
    is_preview BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    
    -- Video specific
    video_url TEXT,
    video_duration INT, -- seconds
    video_size BIGINT, -- bytes
    
    -- File specific
    file_url TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    file_type VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (section_id) REFERENCES course_sections(id) ON DELETE CASCADE,
    INDEX idx_section_id (section_id),
    INDEX idx_content_type (content_type),
    INDEX idx_sort_order (sort_order)
);
```

## 4. ENROLLMENT & PROGRESS TRACKING

### 4.1 Enrollments
```sql
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    
    -- Enrollment details
    enrollment_type ENUM('free', 'paid', 'gifted', 'bulk') DEFAULT 'free',
    price_paid DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_id UUID, -- Reference to payment record
    
    -- Status and progress
    status ENUM('active', 'completed', 'dropped', 'suspended') DEFAULT 'active',
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Timestamps
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP,
    last_accessed_at TIMESTAMP,
    
    UNIQUE KEY unique_enrollment (user_id, course_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    
    INDEX idx_user_id (user_id),
    INDEX idx_course_id (course_id),
    INDEX idx_status (status),
    INDEX idx_enrolled_at (enrolled_at)
);
```

### 4.2 Progress Tracking
```sql
CREATE TABLE lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    lesson_id UUID NOT NULL,
    
    -- Progress details
    status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    time_spent_seconds INT DEFAULT 0,
    
    -- Video specific tracking
    video_position_seconds INT DEFAULT 0,
    watch_time_seconds INT DEFAULT 0,
    
    -- Completion tracking
    first_accessed_at TIMESTAMP,
    last_accessed_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    UNIQUE KEY unique_progress (user_id, lesson_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    
    INDEX idx_user_lesson (user_id, lesson_id),
    INDEX idx_status (status)
);

CREATE TABLE user_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    lesson_id UUID NOT NULL,
    content TEXT NOT NULL,
    timestamp_seconds INT, -- For video notes
    is_private BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    
    INDEX idx_user_lesson (user_id, lesson_id)
);
```

## 5. ASSESSMENT SYSTEM

### 5.1 Quizzes & Questions
```sql
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID,
    course_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    
    -- Quiz settings
    quiz_type ENUM('practice', 'graded', 'final_exam') DEFAULT 'practice',
    time_limit_minutes INT,
    max_attempts INT DEFAULT 1,
    passing_score DECIMAL(5,2) DEFAULT 70.00,
    randomize_questions BOOLEAN DEFAULT FALSE,
    show_correct_answers BOOLEAN DEFAULT TRUE,
    show_results_immediately BOOLEAN DEFAULT TRUE,
    
    -- Availability
    available_from TIMESTAMP,
    available_until TIMESTAMP,
    
    -- Status
    is_published BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    
    INDEX idx_lesson_id (lesson_id),
    INDEX idx_course_id (course_id),
    INDEX idx_quiz_type (quiz_type)
);

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('multiple_choice', 'true_false', 'short_answer', 'essay', 'matching', 'fill_blank') NOT NULL,
    points DECIMAL(5,2) DEFAULT 1.00,
    sort_order INT DEFAULT 0,
    
    -- Question data (JSON for flexibility)
    options JSON, -- For multiple choice, matching, etc.
    correct_answers JSON, -- Correct answer(s)
    explanation TEXT,
    
    -- Media
    image_url TEXT,
    video_url TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    
    INDEX idx_quiz_id (quiz_id),
    INDEX idx_question_type (question_type),
    INDEX idx_sort_order (sort_order)
);
```

### 5.2 Quiz Attempts & Results
```sql
CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    quiz_id UUID NOT NULL,
    attempt_number INT NOT NULL,
    
    -- Attempt details
    status ENUM('in_progress', 'completed', 'abandoned', 'timed_out') DEFAULT 'in_progress',
    score DECIMAL(5,2),
    max_score DECIMAL(5,2),
    percentage DECIMAL(5,2),
    passed BOOLEAN,
    
    -- Timing
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    time_spent_seconds INT,
    
    -- Additional data
    answers JSON, -- User's answers
    feedback TEXT,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_attempt (user_id, quiz_id, attempt_number),
    INDEX idx_user_quiz (user_id, quiz_id),
    INDEX idx_status (status),
    INDEX idx_started_at (started_at)
);

CREATE TABLE question_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL,
    question_id UUID NOT NULL,
    user_answer JSON, -- User's answer(s)
    is_correct BOOLEAN,
    points_earned DECIMAL(5,2) DEFAULT 0.00,
    feedback TEXT,
    time_spent_seconds INT,
    
    FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_response (attempt_id, question_id),
    INDEX idx_attempt_id (attempt_id),
    INDEX idx_question_id (question_id)
);
```

## 6. ASSIGNMENTS & SUBMISSIONS

```sql
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID,
    course_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    
    -- Assignment settings
    assignment_type ENUM('text', 'file_upload', 'url_submission', 'peer_review') DEFAULT 'text',
    max_points DECIMAL(5,2) DEFAULT 100.00,
    max_file_size BIGINT, -- bytes
    allowed_file_types JSON, -- ['pdf', 'doc', 'docx']
    
    -- Deadlines
    due_date TIMESTAMP,
    late_submission_allowed BOOLEAN DEFAULT TRUE,
    late_penalty_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Peer review settings
    peer_review_required BOOLEAN DEFAULT FALSE,
    peer_reviews_required INT DEFAULT 3,
    
    -- Status
    is_published BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    
    INDEX idx_lesson_id (lesson_id),
    INDEX idx_course_id (course_id),
    INDEX idx_due_date (due_date)
);

CREATE TABLE assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Submission content
    submission_type ENUM('text', 'file', 'url') NOT NULL,
    content TEXT,
    file_url TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    url TEXT,
    
    -- Status and grading
    status ENUM('draft', 'submitted', 'graded', 'returned') DEFAULT 'draft',
    score DECIMAL(5,2),
    feedback TEXT,
    graded_by UUID,
    graded_at TIMESTAMP,
    
    -- Timing
    submitted_at TIMESTAMP,
    is_late BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_submission (assignment_id, user_id),
    INDEX idx_assignment_user (assignment_id, user_id),
    INDEX idx_status (status),
    INDEX idx_submitted_at (submitted_at)
);
```

## 7. COMMUNICATION SYSTEM

### 7.1 Discussions & Forums
```sql
CREATE TABLE discussion_forums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_course_id (course_id)
);

CREATE TABLE discussion_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forum_id UUID NOT NULL,
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    
    -- Topic settings
    is_pinned BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    is_announcement BOOLEAN DEFAULT FALSE,
    
    -- Statistics
    view_count INT DEFAULT 0,
    reply_count INT DEFAULT 0,
    last_reply_at TIMESTAMP,
    last_reply_by UUID,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (forum_id) REFERENCES discussion_forums(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (last_reply_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_forum_id (forum_id),
    INDEX idx_user_id (user_id),
    INDEX idx_last_reply_at (last_reply_at),
    FULLTEXT idx_search (title, content)
);

CREATE TABLE discussion_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL,
    user_id UUID NOT NULL,
    parent_id UUID, -- For nested replies
    content TEXT NOT NULL,
    
    -- Moderation
    is_approved BOOLEAN DEFAULT TRUE,
    is_flagged BOOLEAN DEFAULT FALSE,
    
    -- Statistics
    like_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (topic_id) REFERENCES discussion_topics(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES discussion_replies(id) ON DELETE CASCADE,
    
    INDEX idx_topic_id (topic_id),
    INDEX idx_user_id (user_id),
    INDEX idx_parent_id (parent_id),
    INDEX idx_created_at (created_at)
);
```

### 7.2 Direct Messages
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type ENUM('direct', 'group') DEFAULT 'direct',
    title VARCHAR(255),
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_last_message_at (last_message_at)
);

CREATE TABLE conversation_participants (
    conversation_id UUID,
    user_id UUID,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    last_read_at TIMESTAMP,
    
    PRIMARY KEY (conversation_id, user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    message_type ENUM('text', 'file', 'image', 'video') DEFAULT 'text',
    file_url TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    
    -- Status
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_sender_id (sender_id),
    INDEX idx_created_at (created_at)
);
```

## 8. NOTIFICATIONS SYSTEM

```sql
CREATE TABLE notification_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type ENUM('email', 'push', 'sms', 'in_app') NOT NULL,
    variables JSON, -- Available template variables
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    data JSON, -- Additional notification data
    
    -- Channels
    channels JSON, -- ['email', 'push', 'in_app']
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    -- Delivery status
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    push_sent BOOLEAN DEFAULT FALSE,
    push_sent_at TIMESTAMP,
    sms_sent BOOLEAN DEFAULT FALSE,
    sms_sent_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
);

CREATE TABLE user_notification_preferences (
    user_id UUID PRIMARY KEY,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    
    -- Specific notification types
    course_updates BOOLEAN DEFAULT TRUE,
    assignment_reminders BOOLEAN DEFAULT TRUE,
    grade_notifications BOOLEAN DEFAULT TRUE,
    discussion_replies BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 9. ANALYTICS & REPORTING

```sql
CREATE TABLE user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    session_id VARCHAR(255),
    activity_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50), -- course, lesson, quiz, etc.
    entity_id UUID,
    details JSON,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created_at (created_at)
);

CREATE TABLE learning_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    date DATE NOT NULL,
    
    -- Daily metrics
    time_spent_minutes INT DEFAULT 0,
    lessons_completed INT DEFAULT 0,
    quizzes_taken INT DEFAULT 0,
    assignments_submitted INT DEFAULT 0,
    forum_posts INT DEFAULT 0,
    
    -- Engagement metrics
    login_count INT DEFAULT 0,
    page_views INT DEFAULT 0,
    video_watch_time_minutes INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_daily_analytics (user_id, course_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    
    INDEX idx_user_course_date (user_id, course_id, date),
    INDEX idx_date (date)
);
```

## 10. CERTIFICATES & ACHIEVEMENTS

```sql
CREATE TABLE certificate_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_data JSON, -- Template design and layout
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    course_id UUID NOT NULL,
    template_id UUID NOT NULL,
    certificate_number VARCHAR(100) UNIQUE NOT NULL,
    
    -- Certificate details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completion_date DATE NOT NULL,
    expiry_date DATE,
    
    -- File storage
    pdf_url TEXT,
    image_url TEXT,
    
    -- Verification
    verification_code VARCHAR(100) UNIQUE NOT NULL,
    is_verified BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES certificate_templates(id) ON DELETE RESTRICT,
    
    UNIQUE KEY unique_user_course_certificate (user_id, course_id),
    INDEX idx_certificate_number (certificate_number),
    INDEX idx_verification_code (verification_code),
    INDEX idx_completion_date (completion_date)
);

CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url TEXT,
    badge_color VARCHAR(7),
    
    -- Achievement criteria
    criteria_type ENUM('course_completion', 'quiz_score', 'streak', 'participation', 'custom') NOT NULL,
    criteria_data JSON, -- Flexible criteria storage
    
    -- Points and rewards
    points_awarded INT DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_criteria_type (criteria_type)
);

CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    achievement_id UUID NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Context
    course_id UUID,
    quiz_id UUID,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_user_achievement (user_id, achievement_id),
    INDEX idx_user_id (user_id),
    INDEX idx_earned_at (earned_at)
);
```

## 11. PAYMENT & BILLING (Optional)

```sql
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type ENUM('credit_card', 'paypal', 'bank_transfer', 'wallet') NOT NULL,
    provider VARCHAR(50), -- stripe, paypal, etc.
    provider_id VARCHAR(255), -- External payment method ID
    
    -- Card details (encrypted)
    last_four VARCHAR(4),
    brand VARCHAR(20),
    exp_month INT,
    exp_year INT,
    
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    course_id UUID,
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    payment_method_id UUID,
    
    -- External payment info
    provider VARCHAR(50) NOT NULL,
    provider_transaction_id VARCHAR(255),
    
    -- Status
    status ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled') DEFAULT 'pending',
    
    -- Timestamps
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_course_id (course_id),
    INDEX idx_status (status),
    INDEX idx_provider_transaction_id (provider_transaction_id)
);
```

## 12. SYSTEM CONFIGURATION

```sql
CREATE TABLE system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category VARCHAR(50) NOT NULL,
    key_name VARCHAR(100) NOT NULL,
    value TEXT,
    data_type ENUM('string', 'integer', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE, -- Can be accessed by frontend
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_setting (category, key_name),
    INDEX idx_category (category),
    INDEX idx_public (is_public)
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSON,
    new_values JSON,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created_at (created_at)
);
```

## 13. INDEXES & PERFORMANCE OPTIMIZATION

### 13.1 Additional Composite Indexes
```sql
-- Course search optimization
CREATE INDEX idx_courses_search ON courses (status, visibility, published_at, rating_average);

-- Enrollment analytics
CREATE INDEX idx_enrollments_analytics ON enrollments (course_id, status, enrolled_at);

-- Progress tracking optimization
CREATE INDEX idx_lesson_progress_tracking ON lesson_progress (user_id, status, completed_at);

-- Quiz performance
CREATE INDEX idx_quiz_attempts_performance ON quiz_attempts (user_id, quiz_id, status, started_at);

-- Discussion activity
CREATE INDEX idx_discussion_activity ON discussion_replies (topic_id, created_at, is_approved);

-- Analytics queries
CREATE INDEX idx_analytics_reporting ON learning_analytics (course_id, date, user_id);
```

### 13.2 Partitioning Strategy (for large datasets)
```sql
-- Partition user_activity_logs by month
ALTER TABLE user_activity_logs 
PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at)) (
    PARTITION p202401 VALUES LESS THAN (202402),
    PARTITION p202402 VALUES LESS THAN (202403),
    -- Add more partitions as needed
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- Partition learning_analytics by date
ALTER TABLE learning_analytics 
PARTITION BY RANGE (YEAR(date) * 100 + MONTH(date)) (
    PARTITION p202401 VALUES LESS THAN (202402),
    PARTITION p202402 VALUES LESS THAN (202403),
    -- Add more partitions as needed
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

## 14. DATA RELATIONSHIPS SUMMARY

### 14.1 Core Relationships
- **Users** → **Enrollments** → **Courses** (Many-to-Many through Enrollments)
- **Courses** → **Sections** → **Lessons** (One-to-Many hierarchical)
- **Users** → **Progress** → **Lessons** (Many-to-Many through Progress)
- **Quizzes** → **Questions** → **Responses** (One-to-Many chains)
- **Users** → **Submissions** → **Assignments** (Many-to-Many through Submissions)

### 14.2 Communication Relationships
- **Courses** → **Forums** → **Topics** → **Replies** (Hierarchical discussion)
- **Users** → **Conversations** → **Messages** (Direct messaging)
- **Users** → **Notifications** (One-to-Many)

### 14.3 Analytics Relationships
- **Users** → **Activity Logs** (One-to-Many)
- **Users** + **Courses** → **Learning Analytics** (Daily aggregations)
- **Users** → **Achievements** → **Certificates** (Progress tracking)

Schema này được thiết kế để hỗ trợ một hệ thống LMS đầy đủ tính năng, có khả năng mở rộng và hiệu suất cao, phù hợp cho việc phục vụ hàng nghìn đến hàng triệu người dùng.