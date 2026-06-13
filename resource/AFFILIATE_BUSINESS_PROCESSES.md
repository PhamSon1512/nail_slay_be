# Quy trình Nghiệp vụ Chi tiết - Hệ thống Quản trị Affiliate Marketing

## 1. Tổng quan Quy trình Nghiệp vụ

Hệ thống AffiliateMax Pro bao gồm 8 quy trình nghiệp vụ chính được tích hợp để tạo thành hệ sinh thái quản lý Affiliate Marketing hoàn chỉnh, tương tự như mô hình Growstack.

### 1.1 Sơ đồ Tổng quan Quy trình

```mermaid
graph TB
    A[Đăng ký & Onboarding] --> B[Quản lý Chiến dịch]
    B --> C[Tracking & Attribution]
    C --> D[Fraud Detection]
    D --> E[Commission Calculation]
    E --> F[Báo cáo & Analytics]
    F --> G[Payment Processing]
    G --> H[Relationship Management]
    
    style A fill:#e1f5fe
    style F fill:#f3e5f5
    style G fill:#e8f5e8
```

## 2. Chi tiết Quy trình Nghiệp vụ

### 2.1 Quy trình Đăng ký & Onboarding

#### 2.1.1 Use Case Diagram

```mermaid
graph LR
    ADV[Advertiser] --> UC1[Đăng ký Merchant]
    ADV --> UC2[Tạo Campaign]
    ADV --> UC3[Thiết lập Commission]
    
    AFF[Affiliate] --> UC4[Đăng ký Publisher]
    AFF --> UC5[KYC Verification]
    AFF --> UC6[Apply cho Campaign]
    
    AM[Account Manager] --> UC7[Review Application]
    AM --> UC8[Approve/Reject]
    AM --> UC9[Tier Assignment]
```

#### 2.1.2 Quy trình Affiliate Onboarding Chi tiết

```mermaid
flowchart TD
    A[Affiliate truy cập website] --> B[Điền form đăng ký]
    B --> C[Xác thực email]
    C --> D[Upload tài liệu KYC]
    D --> E[Hệ thống auto-screening]
    
    E --> F{Pass screening?}
    F -->|Không| G[Auto reject]
    G --> H[Email thông báo + lý do]
    H --> I[End - có thể apply lại sau 30 ngày]
    
    F -->|Có| J[Chuyển manual review]
    J --> K[Account Manager đánh giá]
    K --> L[Kiểm tra website & traffic quality]
    L --> M[Verify payment information]
    
    M --> N{Approve?}
    N -->|Không| O[Manual reject với feedback]
    O --> P[Email chi tiết + cải thiện]
    P --> Q[30-day cooldown period]
    
    N -->|Có| R[Assign affiliate tier]
    R --> S[Generate affiliate code]
    S --> T[Thiết lập tracking system]
    T --> U[Send welcome package]
    U --> V[Onboarding training]
    V --> W[Account activated]
```

#### 2.1.3 Business Rules cho Onboarding

1. **Auto-screening criteria**:
   - Email domain không được trong blacklist
   - IP không từ high-risk countries
   - Website phải có traffic > 1000/month
   - Không duplicate information với existing affiliates

2. **KYC Requirements**:
   - Government issued ID
   - Business registration (nếu có)
   - Bank account verification
   - Tax ID number

3. **Tier Assignment Logic**:
   - Tier Bronze: Mới bắt đầu, không có history
   - Tier Silver: 6 tháng kinh nghiệm + 10k clicks/month
   - Tier Gold: 1 năm kinh nghiệm + 50k clicks/month
   - Tier Platinum: 2+ năm + 100k clicks/month + high quality traffic

### 2.2 Quy trình Quản lý Chiến dịch

#### 2.2.1 Campaign Lifecycle Management

```mermaid
flowchart TD
    A[Advertiser tạo campaign] --> B[Thiết lập basic info]
    B --> C[Định nghĩa commission structure]
    C --> D[Upload creative assets]
    D --> E[Thiết lập targeting rules]
    E --> F[Configure tracking parameters]
    F --> G[Set caps và limits]
    G --> H[Define terms & conditions]
    
    H --> I[Internal compliance review]
    I --> J{Compliance pass?}
    J -->|Không| K[Request modifications]
    K --> L[Advertiser fixes issues]
    L --> I
    
    J -->|Có| M[Campaign submitted for approval]
    M --> N[Account Manager review]
    N --> O{Approve campaign?}
    
    O -->|Không| P[Feedback with reasons]
    P --> Q[Advertiser revisions]
    Q --> M
    
    O -->|Có| R[Campaign approved]
    R --> S[Generate tracking URLs]
    S --> T[Assign to affiliate tiers]
    T --> U[Notify eligible affiliates]
    U --> V[Campaign goes live]
    
    V --> W[Real-time monitoring]
    W --> X{Performance issues?}
    X -->|Có| Y[Auto-optimization]
    Y --> Z[Alert managers]
    Z --> AA[Manual intervention]
    AA --> W
    
    X -->|Không| BB[Continue normal operation]
    BB --> CC{Reach caps?}
    CC -->|Có| DD[Auto-pause campaign]
    CC -->|Không| W
```

#### 2.2.2 Campaign Approval Workflow

```mermaid
flowchart TD
    A[Campaign submitted] --> B[Automated compliance check]
    
    B --> C{Auto-compliance pass?}
    C -->|Không| D[Flag compliance issues]
    D --> E[Return to advertiser]
    
    C -->|Có| F[Queue for manual review]
    F --> G[Account Manager assignment]
    G --> H[Review campaign details]
    
    H --> I[Check creative compliance]
    I --> J[Verify landing page]
    J --> K[Review terms & conditions]
    K --> L[Assess fraud risk]
    
    L --> M{All checks pass?}
    M -->|Không| N[Document issues]
    N --> O[Request changes]
    O --> P[Notify advertiser]
    P --> Q[Wait for resubmission]
    
    M -->|Có| R[Campaign approved]
    R --> S[Set live date]
    S --> T[Generate tracking links]
    T --> U[Notify affiliate network]
    U --> V[Campaign active]
```

### 2.3 Quy trình Tracking & Attribution

#### 2.3.1 Click Tracking Flow

```mermaid
flowchart TD
    A[User clicks affiliate link] --> B[Hit tracking server]
    B --> C[Log click data]
    C --> D[Extract tracking parameters]
    D --> E[Validate affiliate & campaign]
    
    E --> F{Valid tracking?}
    F -->|Không| G[Log invalid click]
    G --> H[Return error page]
    
    F -->|Có| I[Check fraud filters]
    I --> J{Pass fraud check?}
    J -->|Không| K[Block & log fraud]
    K --> L[Update fraud scores]
    
    J -->|Có| M[Set tracking cookies]
    M --> N[Generate session ID]
    N --> O[Store attribution data]
    O --> P[Update real-time stats]
    P --> Q[Redirect to landing page]
    
    Q --> R[User browses website]
    R --> S{User converts?}
    S -->|Không| T[Session timeout]
    T --> U[Update click-only metrics]
    
    S -->|Có| V[Conversion tracking starts]
```

#### 2.3.2 Conversion Attribution Logic

```mermaid
flowchart TD
    A[Conversion event detected] --> B[Identify attribution model]
    B --> C{Attribution model}
    
    C -->|Last Click| D[Credit last affiliate click]
    C -->|First Click| E[Credit first affiliate click]
    C -->|Linear| F[Distribute credit equally]
    C -->|Time Decay| G[More credit to recent clicks]
    C -->|Position Based| H[40% first, 40% last, 20% middle]
    
    D --> I[Calculate commission]
    E --> I
    F --> I
    G --> I
    H --> I
    
    I --> J[Apply commission rules]
    J --> K[Check performance bonuses]
    K --> L[Validate conversion quality]
    L --> M{Quality check pass?}
    
    M -->|Không| N[Mark as low quality]
    N --> O[Apply quality penalty]
    
    M -->|Có| P[Apply full commission]
    O --> Q[Update affiliate balance]
    P --> Q
    
    Q --> R[Trigger notifications]
    R --> S[Update reporting data]
    S --> T[Schedule payment processing]
```

### 2.4 Quy trình Fraud Detection

#### 2.4.1 Real-time Fraud Analysis

```mermaid
flowchart TD
    A[Traffic/Conversion received] --> B[Extract signal features]
    B --> C[IP reputation check]
    C --> D[Device fingerprinting]
    D --> E[Behavioral analysis]
    E --> F[Velocity checking]
    F --> G[ML fraud scoring]
    
    G --> H{Fraud score calculation}
    H --> I[Score: 0.0-0.3 Clean]
    H --> J[Score: 0.3-0.7 Suspicious]
    H --> K[Score: 0.7-1.0 Fraudulent]
    
    I --> L[Allow traffic]
    L --> M[Update clean stats]
    
    J --> N[Flag for review]
    N --> O[Additional verification]
    O --> P{Manual review}
    P -->|Clean| Q[Allow with note]
    P -->|Fraud| R[Block traffic]
    
    K --> S[Auto-block]
    S --> T[Notify affiliate]
    T --> U[Update fraud scores]
    U --> V[Consider account action]
    
    V --> W{Fraud pattern?}
    W -->|Isolated| X[Warning notification]
    W -->|Pattern| Y[Account suspension review]
    W -->|Severe| Z[Immediate termination]
```

#### 2.4.2 Fraud Investigation Process

```mermaid
flowchart TD
    A[Fraud alert triggered] --> B[Auto-collect evidence]
    B --> C[Create investigation case]
    C --> D[Assign to fraud analyst]
    
    D --> E[Analyze traffic patterns]
    E --> F[Review conversion quality]
    F --> G[Check affiliate history]
    G --> H[Examine technical indicators]
    
    H --> I[Cross-reference with known fraud]
    I --> J[Calculate fraud probability]
    J --> K{Investigation result}
    
    K -->|False Positive| L[Clear affiliate]
    L --> M[Adjust fraud models]
    M --> N[Compensate if needed]
    
    K -->|Confirmed Fraud| O[Document violations]
    O --> P[Calculate damages]
    P --> Q[Determine penalties]
    Q --> R[Affiliate sanctions]
    
    R --> S{Sanction level}
    S -->|Warning| T[Official warning]
    S -->|Suspension| U[Temporary suspension]
    S -->|Termination| V[Permanent ban]
    
    T --> W[Enhanced monitoring]
    U --> X[Rehabilitation process]
    V --> Y[Blacklist addition]
```

### 2.5 Quy trình Commission Calculation & Payment

#### 2.5.1 Commission Calculation Engine

```mermaid
flowchart TD
    A[Conversion approved] --> B[Lookup commission structure]
    B --> C[Get base commission rate]
    C --> D[Check affiliate tier bonus]
    D --> E[Apply performance multipliers]
    E --> F[Calculate volume bonuses]
    
    F --> G[Apply special promotions]
    G --> H[Check campaign-specific rates]
    H --> I[Calculate gross commission]
    
    I --> J[Apply deductions]
    J --> K[Platform fees]
    K --> L[Tax withholdings]
    L --> M[Chargeback reserves]
    M --> N[Calculate net commission]
    
    N --> O[Update affiliate balance]
    O --> P[Log transaction]
    P --> Q[Trigger payment scheduling]
    Q --> R[Update real-time dashboards]
    R --> S[Send notifications]
```

#### 2.5.2 Payment Processing Workflow

```mermaid
flowchart TD
    A[Payment cycle start] --> B[Identify eligible affiliates]
    B --> C[Check minimum thresholds]
    C --> D[Validate payment methods]
    D --> E[Calculate withholdings]
    
    E --> F[Generate payment batch]
    F --> G[Create invoices]
    G --> H[Compliance review]
    H --> I{Compliance approved?}
    
    I -->|Không| J[Request corrections]
    J --> K[Fix issues]
    K --> H
    
    I -->|Có| L[Submit to payment processor]
    L --> M[Process payments]
    M --> N{Payment successful?}
    
    N -->|Không| O[Handle failures]
    O --> P[Retry logic]
    P --> Q[Alternative methods]
    Q --> R[Manual intervention]
    
    N -->|Có| S[Update payment status]
    S --> T[Send confirmations]
    T --> U[Update financial records]
    U --> V[Archive transaction data]
    V --> W[Generate reports]
```

### 2.6 Quy trình Báo cáo & Analytics

#### 2.6.1 Real-time Dashboard Updates

```mermaid
flowchart TD
    A[User action/event] --> B[Event captured]
    B --> C[Data validation]
    C --> D[Store in primary DB]
    D --> E[Update cache layers]
    E --> F[Stream to analytics engine]
    
    F --> G[Real-time aggregation]
    G --> H[Update dashboard metrics]
    H --> I[Check alert thresholds]
    I --> J{Alert triggered?}
    
    J -->|Có| K[Send notifications]
    K --> L[Update alert status]
    
    J -->|Không| M[Continue monitoring]
    
    L --> N[WebSocket broadcast]
    M --> N
    N --> O[Update client dashboards]
    O --> P[Refresh visualizations]
```

#### 2.6.2 Custom Report Generation

```mermaid
flowchart TD
    A[User requests report] --> B[Parse report parameters]
    B --> C[Validate permissions]
    C --> D[Check cache for existing report]
    
    D --> E{Cache hit?}
    E -->|Có| F[Return cached result]
    
    E -->|Không| G[Query optimization]
    G --> H[Data extraction]
    H --> I[Apply filters & grouping]
    I --> J[Calculate metrics]
    J --> K[Format output]
    K --> L[Cache result]
    L --> M[Return to user]
    
    M --> N{Schedule recurring?}
    N -->|Có| O[Add to scheduler]
    N -->|Không| P[One-time delivery]
    
    O --> Q[Automated generation]
    Q --> R[Email/API delivery]
```

### 2.7 Quy trình Relationship Management

#### 2.7.1 Account Management Workflow

```mermaid
flowchart TD
    A[New account assigned] --> B[Initial assessment]
    B --> C[Set performance goals]
    C --> D[Create communication plan]
    D --> E[Regular check-ins]
    
    E --> F[Performance monitoring]
    F --> G{Performance issues?}
    G -->|Có| H[Identify problems]
    H --> I[Develop action plan]
    I --> J[Implement solutions]
    J --> K[Monitor improvements]
    K --> F
    
    G -->|Không| L[Optimization opportunities]
    L --> M[Growth strategies]
    M --> N[Advanced features]
    N --> O[Tier upgrades]
    O --> P[Success celebration]
```

#### 2.7.2 Affiliate Support Process

```mermaid
flowchart TD
    A[Support request received] --> B[Ticket categorization]
    B --> C{Request type}
    
    C -->|Technical| D[Technical support team]
    C -->|Payment| E[Finance team]
    C -->|Campaign| F[Account manager]
    C -->|General| G[Customer support]
    
    D --> H[Technical resolution]
    E --> I[Payment investigation]
    F --> J[Campaign optimization]
    G --> K[General assistance]
    
    H --> L[Solution provided]
    I --> L
    J --> L
    K --> L
    
    L --> M[User satisfaction survey]
    M --> N[Ticket closure]
    N --> O[Knowledge base update]
```

## 3. Business Rules & Policies

### 3.1 Commission Structure Rules

1. **Base Commission Rates**:
   - CPA: Fixed amount per action
   - CPL: Fixed amount per lead
   - CPS: Percentage of sale value
   - CPM: Amount per 1000 impressions

2. **Tier Bonuses**:
   - Bronze: 0% bonus
   - Silver: 5% bonus
   - Gold: 10% bonus
   - Platinum: 15% bonus

3. **Performance Multipliers**:
   - Quality Score > 95%: +5%
   - Conversion Rate > industry average: +3%
   - Volume bonuses at 1k, 5k, 10k conversions

### 3.2 Fraud Prevention Policies

1. **Auto-block Criteria**:
   - Fraud score > 0.85
   - Impossible conversion velocity
   - Known fraudulent IP ranges
   - Invalid traffic patterns

2. **Investigation Triggers**:
   - Sudden traffic spikes (>300% normal)
   - Conversion rate anomalies
   - Geographic inconsistencies
   - Device fingerprint duplicates

3. **Account Actions**:
   - First offense: Warning + monitoring
   - Second offense: 30-day suspension
   - Third offense: Permanent termination

### 3.3 Payment Policies

1. **Payment Schedule**:
   - Net-15: Platinum tier
   - Net-30: Gold tier
   - Net-45: Silver/Bronze tier

2. **Minimum Thresholds**:
   - PayPal: $50
   - Bank Transfer: $100
   - Wire Transfer: $500
   - Cryptocurrency: $25

3. **Hold Periods**:
   - New affiliates: 60 days
   - Established affiliates: 30 days
   - High-risk categories: 90 days

## 4. KPI & Success Metrics

### 4.1 Platform KPIs

- **Growth Metrics**:
  - New affiliate registrations/month
  - Active affiliate retention rate
  - Campaign approval rate
  - Revenue growth month-over-month

- **Quality Metrics**:
  - Average fraud score
  - Conversion quality rating
  - Customer satisfaction score
  - Support ticket resolution time

- **Financial Metrics**:
  - Total GMV (Gross Merchandise Value)
  - Commission payout accuracy
  - Payment processing success rate
  - Revenue per affiliate

### 4.2 Operational Excellence

- **System Performance**:
  - Click processing latency < 50ms
  - Dashboard load time < 2 seconds
  - 99.9% uptime SLA
  - Zero data loss guarantee

- **Process Efficiency**:
  - Application approval time < 24 hours
  - Payment processing time < 3 days
  - Support response time < 2 hours
  - Report generation time < 30 seconds

Quy trình nghiệp vụ này đảm bảo hệ thống AffiliateMax Pro hoạt động hiệu quả, minh bạch và có thể cạnh tranh với các nền tảng hàng đầu như Growstack.