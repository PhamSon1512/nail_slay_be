# FLOW DIAGRAMS - HỆ THỐNG LMS

## 1. SYSTEM ARCHITECTURE OVERVIEW

```mermaid
graph TB
    subgraph "Frontend Layer"
        WEB[Web Application]
        MOBILE[Mobile App]
        API_GATEWAY[API Gateway]
    end
    
    subgraph "Backend Services"
        AUTH[Authentication Service]
        USER[User Management]
        COURSE[Course Management]
        CONTENT[Content Management]
        ASSESSMENT[Assessment Service]
        COMMUNICATION[Communication Service]
        ANALYTICS[Analytics Service]
    end
    
    subgraph "Data Layer"
        DB[(Database)]
        STORAGE[File Storage]
        CACHE[Redis Cache]
    end
    
    WEB --> API_GATEWAY
    MOBILE --> API_GATEWAY
    API_GATEWAY --> AUTH
    API_GATEWAY --> USER
    API_GATEWAY --> COURSE
    API_GATEWAY --> CONTENT
    API_GATEWAY --> ASSESSMENT
    API_GATEWAY --> COMMUNICATION
    API_GATEWAY --> ANALYTICS
    
    AUTH --> DB
    USER --> DB
    COURSE --> DB
    CONTENT --> DB
    CONTENT --> STORAGE
    ASSESSMENT --> DB
    COMMUNICATION --> DB
    ANALYTICS --> DB
    
    AUTH --> CACHE
    USER --> CACHE
    COURSE --> CACHE
```

## 2. USER REGISTRATION & AUTHENTICATION FLOW

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as Auth Service
    participant D as Database
    participant E as Email Service
    
    U->>F: Điền form đăng ký
    F->>A: POST /api/auth/register
    A->>A: Validate dữ liệu
    A->>D: Kiểm tra email tồn tại
    D-->>A: Email chưa tồn tại
    A->>D: Tạo user mới (status: pending)
    A->>E: Gửi email xác thực
    A-->>F: Đăng ký thành công
    F-->>U: Thông báo kiểm tra email
    
    U->>E: Click link xác thực
    E->>A: GET /api/auth/verify/{token}
    A->>D: Cập nhật status: active
    A-->>F: Redirect đến trang đăng nhập
    
    U->>F: Đăng nhập
    F->>A: POST /api/auth/login
    A->>D: Xác thực thông tin
    A->>A: Tạo JWT token
    A-->>F: Trả về token + user info
    F-->>U: Chuyển đến dashboard
```

## 3. COURSE CREATION FLOW (INSTRUCTOR)

```mermaid
flowchart TD
    START([Giảng viên đăng nhập]) --> CHECK_PERM{Kiểm tra quyền tạo khóa học}
    CHECK_PERM -->|Có quyền| CREATE_FORM[Điền form tạo khóa học]
    CHECK_PERM -->|Không có quyền| ERROR_PERM[Thông báo lỗi quyền]
    
    CREATE_FORM --> VALIDATE{Validate thông tin}
    VALIDATE -->|Lỗi| CREATE_FORM
    VALIDATE -->|OK| SAVE_COURSE[Lưu thông tin khóa học]
    
    SAVE_COURSE --> CREATE_CURRICULUM[Tạo curriculum]
    CREATE_CURRICULUM --> ADD_LESSON[Thêm bài giảng]
    
    ADD_LESSON --> LESSON_TYPE{Loại nội dung}
    LESSON_TYPE -->|Video| UPLOAD_VIDEO[Upload video]
    LESSON_TYPE -->|Document| UPLOAD_DOC[Upload tài liệu]
    LESSON_TYPE -->|Quiz| CREATE_QUIZ[Tạo quiz]
    
    UPLOAD_VIDEO --> PROCESS_VIDEO[Xử lý video]
    UPLOAD_DOC --> PROCESS_DOC[Xử lý tài liệu]
    CREATE_QUIZ --> QUIZ_QUESTIONS[Tạo câu hỏi]
    
    PROCESS_VIDEO --> ADD_MORE{Thêm nội dung khác?}
    PROCESS_DOC --> ADD_MORE
    QUIZ_QUESTIONS --> ADD_MORE
    
    ADD_MORE -->|Có| ADD_LESSON
    ADD_MORE -->|Không| PREVIEW[Preview khóa học]
    
    PREVIEW --> PUBLISH_DECISION{Xuất bản?}
    PUBLISH_DECISION -->|Lưu nháp| SAVE_DRAFT[Lưu nháp]
    PUBLISH_DECISION -->|Xuất bản| PUBLISH[Xuất bản khóa học]
    
    SAVE_DRAFT --> END([Kết thúc])
    PUBLISH --> NOTIFY_STUDENTS[Thông báo cho học viên]
    NOTIFY_STUDENTS --> END
```

## 4. STUDENT LEARNING FLOW

```mermaid
stateDiagram-v2
    [*] --> BrowseCourses: Tìm kiếm khóa học
    
    BrowseCourses --> CourseDetail: Xem chi tiết
    CourseDetail --> CheckPrerequisites: Kiểm tra điều kiện
    
    CheckPrerequisites --> EnrollCourse: Đủ điều kiện
    CheckPrerequisites --> BrowseCourses: Không đủ điều kiện
    
    EnrollCourse --> PaymentRequired: Khóa học có phí
    EnrollCourse --> AccessCourse: Khóa học miễn phí
    
    PaymentRequired --> ProcessPayment: Thanh toán
    ProcessPayment --> AccessCourse: Thanh toán thành công
    ProcessPayment --> BrowseCourses: Thanh toán thất bại
    
    AccessCourse --> ViewLesson: Xem bài giảng
    ViewLesson --> TakeNotes: Ghi chú
    ViewLesson --> DoAssignment: Làm bài tập
    ViewLesson --> TakeQuiz: Làm quiz
    ViewLesson --> JoinDiscussion: Tham gia thảo luận
    
    TakeNotes --> ViewLesson
    DoAssignment --> SubmitAssignment
    TakeQuiz --> SubmitQuiz
    JoinDiscussion --> ViewLesson
    
    SubmitAssignment --> WaitGrading: Chờ chấm điểm
    SubmitQuiz --> AutoGrading: Chấm tự động
    
    WaitGrading --> ViewFeedback: Nhận phản hồi
    AutoGrading --> ViewResults: Xem kết quả
    
    ViewFeedback --> NextLesson: Bài tiếp theo
    ViewResults --> NextLesson
    
    NextLesson --> ViewLesson: Còn bài
    NextLesson --> CompleteCourse: Hết bài
    
    CompleteCourse --> GetCertificate: Đạt yêu cầu
    CompleteCourse --> [*]: Không đạt yêu cầu
    
    GetCertificate --> [*]
```

## 5. ASSESSMENT & GRADING FLOW

```mermaid
sequenceDiagram
    participant I as Instructor
    participant S as System
    participant ST as Student
    participant G as Grading Engine
    participant N as Notification
    
    I->>S: Tạo bài kiểm tra
    S->>S: Lưu cấu hình bài thi
    I->>S: Thiết lập câu hỏi
    S->>S: Lưu ngân hàng câu hỏi
    I->>S: Xuất bản bài thi
    S->>N: Thông báo cho học viên
    N->>ST: Gửi thông báo bài thi mới
    
    ST->>S: Truy cập bài thi
    S->>S: Kiểm tra điều kiện (thời gian, lượt thi)
    S->>ST: Hiển thị câu hỏi
    ST->>S: Trả lời câu hỏi
    S->>S: Lưu câu trả lời tạm thời
    ST->>S: Nộp bài
    
    S->>G: Gửi bài thi để chấm
    
    alt Câu hỏi trắc nghiệm
        G->>G: Chấm tự động
        G->>S: Trả về điểm số
    else Câu hỏi tự luận
        G->>I: Gửi cho giảng viên chấm
        I->>G: Chấm điểm và nhận xét
        G->>S: Cập nhật điểm số
    end
    
    S->>N: Thông báo kết quả
    N->>ST: Gửi thông báo có điểm
    N->>I: Thông báo hoàn thành chấm
    
    ST->>S: Xem kết quả chi tiết
    S->>ST: Hiển thị điểm và phản hồi
```

## 6. COMMUNICATION & DISCUSSION FLOW

```mermaid
graph TD
    subgraph "Discussion Forum"
        A[Tạo topic thảo luận] --> B[Đăng bài viết]
        B --> C[Thành viên khác xem]
        C --> D{Phản hồi?}
        D -->|Có| E[Viết comment]
        D -->|Không| F[Đọc và like]
        E --> G[Thông báo cho tác giả]
        F --> H[Cập nhật thống kê]
        G --> I[Tác giả phản hồi lại]
        I --> C
    end
    
    subgraph "Direct Messaging"
        J[Gửi tin nhắn riêng] --> K[Kiểm tra quyền chat]
        K --> L{Có quyền?}
        L -->|Có| M[Gửi tin nhắn]
        L -->|Không| N[Thông báo lỗi]
        M --> O[Thông báo realtime]
        O --> P[Người nhận xem tin nhắn]
        P --> Q[Phản hồi]
        Q --> M
    end
    
    subgraph "Video Conference"
        R[Tạo lịch họp] --> S[Gửi lời mời]
        S --> T[Thành viên nhận lời mời]
        T --> U{Tham gia?}
        U -->|Có| V[Join meeting room]
        U -->|Không| W[Ghi nhận vắng mặt]
        V --> X[Video call]
        X --> Y[Ghi chú meeting]
        Y --> Z[Lưu recording]
    end
```

## 7. ANALYTICS & REPORTING FLOW

```mermaid
flowchart LR
    subgraph "Data Collection"
        A[User Actions] --> D[Data Warehouse]
        B[Course Progress] --> D
        C[Assessment Results] --> D
        E[Time Tracking] --> D
    end
    
    subgraph "Data Processing"
        D --> F[ETL Process]
        F --> G[Data Aggregation]
        G --> H[Statistical Analysis]
    end
    
    subgraph "Reporting"
        H --> I[Student Progress Report]
        H --> J[Course Performance Report]
        H --> K[Instructor Analytics]
        H --> L[System Usage Report]
    end
    
    subgraph "Visualization"
        I --> M[Student Dashboard]
        J --> N[Admin Dashboard]
        K --> O[Instructor Dashboard]
        L --> P[System Dashboard]
    end
    
    subgraph "Alerts & Notifications"
        H --> Q{Threshold Check}
        Q -->|Alert Triggered| R[Send Notification]
        Q -->|Normal| S[Continue Monitoring]
        R --> T[Email/SMS/Push]
    end
```

## 8. MOBILE APP SYNC FLOW

```mermaid
sequenceDiagram
    participant M as Mobile App
    participant A as API Gateway
    participant S as Sync Service
    participant D as Database
    participant F as File Storage
    
    M->>A: Đăng nhập
    A->>M: Trả về token
    
    M->>A: Yêu cầu sync dữ liệu
    A->>S: Kiểm tra last sync time
    S->>D: Query dữ liệu thay đổi
    D->>S: Trả về delta data
    
    alt Có nội dung media mới
        S->>F: Lấy URL download
        F->>S: Trả về signed URLs
        S->>M: Gửi metadata + URLs
        M->>F: Download files
        F->>M: Trả về file content
    else Chỉ có dữ liệu text
        S->>M: Gửi dữ liệu JSON
    end
    
    M->>M: Lưu vào local storage
    M->>A: Xác nhận sync thành công
    A->>S: Cập nhật last sync time
    
    Note over M: Offline mode
    M->>M: Sử dụng dữ liệu local
    M->>M: Lưu thay đổi vào queue
    
    Note over M: Online trở lại
    M->>A: Upload pending changes
    A->>S: Xử lý conflict resolution
    S->>D: Cập nhật dữ liệu
    S->>M: Xác nhận sync
```

## 9. NOTIFICATION SYSTEM FLOW

```mermaid
graph TB
    subgraph "Event Triggers"
        E1[New Assignment] --> NS[Notification Service]
        E2[Grade Posted] --> NS
        E3[Course Update] --> NS
        E4[Discussion Reply] --> NS
        E5[Deadline Reminder] --> NS
    end
    
    NS --> NP[Notification Processor]
    NP --> UP[User Preferences]
    
    UP --> D1{Email Enabled?}
    UP --> D2{Push Enabled?}
    UP --> D3{SMS Enabled?}
    UP --> D4{In-App Enabled?}
    
    D1 -->|Yes| EMAIL[Email Service]
    D2 -->|Yes| PUSH[Push Service]
    D3 -->|Yes| SMS[SMS Service]
    D4 -->|Yes| INAPP[In-App Notification]
    
    EMAIL --> QUEUE1[Email Queue]
    PUSH --> QUEUE2[Push Queue]
    SMS --> QUEUE3[SMS Queue]
    INAPP --> DB[(Database)]
    
    QUEUE1 --> SEND1[Send Email]
    QUEUE2 --> SEND2[Send Push]
    QUEUE3 --> SEND3[Send SMS]
    
    SEND1 --> LOG[Delivery Log]
    SEND2 --> LOG
    SEND3 --> LOG
    DB --> LOG
```

## 10. SECURITY & AUTHENTICATION FLOW

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant G as API Gateway
    participant A as Auth Service
    participant R as Resource Service
    participant D as Database
    
    U->>F: Đăng nhập
    F->>G: POST /auth/login
    G->>A: Xác thực credentials
    A->>D: Kiểm tra user
    D->>A: User info + permissions
    A->>A: Tạo JWT token
    A->>G: Trả về token
    G->>F: Token + user info
    
    U->>F: Truy cập resource
    F->>G: GET /api/courses (với token)
    G->>G: Validate JWT token
    
    alt Token hợp lệ
        G->>A: Kiểm tra permissions
        A->>A: Decode token claims
        A->>G: Permission granted
        G->>R: Forward request
        R->>D: Query data
        D->>R: Return data
        R->>G: Response
        G->>F: Filtered response
    else Token không hợp lệ
        G->>F: 401 Unauthorized
        F->>U: Redirect to login
    end
    
    Note over A: Token refresh
    A->>A: Check token expiry
    A->>F: Send refresh token
    F->>G: POST /auth/refresh
    G->>A: Validate refresh token
    A->>A: Generate new access token
    A->>G: New token
    G->>F: Updated token
```

Các flow diagram này mô tả chi tiết các quy trình nghiệp vụ chính của hệ thống LMS, giúp developers hiểu rõ luồng xử lý và có thể implement một cách chính xác và hiệu quả.