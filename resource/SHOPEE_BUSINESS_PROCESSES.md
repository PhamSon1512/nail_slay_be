# Phân tích Nghiệp vụ Chi tiết - Sàn Thương mại Điện tử Shopee

## 1. Tổng quan Hệ thống Shopee

### 1.1 Định nghĩa
Shopee là sàn thương mại điện tử (marketplace) hàng đầu Đông Nam Á, kết nối người mua và người bán thông qua nền tảng trực tuyến. Shopee hoạt động theo mô hình C2C (Consumer-to-Consumer) và B2C (Business-to-Consumer), đóng vai trò trung gian trong quá trình mua bán.

### 1.2 Mô hình Kinh doanh
- **Marketplace Model**: Kết nối cung (sellers) với cầu (buyers)
- **Revenue Streams**: Commission, transaction fees, quảng cáo, dịch vụ logistics, payment fees
- **Value Proposition**: An toàn, tiện lợi, đa dạng sản phẩm, giá cả cạnh tranh

### 1.3 Sơ đồ Tổng quan Quy trình Nghiệp vụ

```mermaid
graph TB
    A[Đăng ký & Onboarding] --> B[Quản lý Sản phẩm]
    B --> C[Quản lý Đơn hàng]
    C --> D[Thanh toán & Bảo mật]
    D --> E[Logistics & Vận chuyển]
    E --> F[Đánh giá & Review]
    F --> G[Chăm sóc Khách hàng]
    G --> H[Marketing & Khuyến mãi]
    H --> I[Analytics & Báo cáo]
    I --> J[Quản lý Tài chính]
    
    style A fill:#e1f5fe
    style F fill:#f3e5f5
    style I fill:#e8f5e8
```

## 2. Các Nhóm Người dùng Chính

### 2.1 Người mua (Buyers)
- Cá nhân mua sắm trực tuyến
- Doanh nghiệp mua hàng B2B
- Khách hàng tiềm năng

### 2.2 Người bán (Sellers)
- **Individual Sellers**: Cá nhân bán hàng
- **SME Sellers**: Doanh nghiệp vừa và nhỏ
- **Brand Stores**: Thương hiệu chính thức
- **Mall Sellers**: Cửa hàng trong Shopee Mall

### 2.3 Shopee (Platform)
- **Operations Team**: Vận hành hàng ngày
- **Customer Service**: Chăm sóc khách hàng
- **Marketing Team**: Quảng cáo và khuyến mãi
- **Tech Team**: Phát triển và bảo trì hệ thống
- **Finance Team**: Quản lý tài chính và thanh toán

### 2.4 Đối tác Logistics
- SPX Express (Shopee Express)
- Giao Hàng Nhanh (GHN)
- Viettel Post
- J&T Express

## 3. Quy trình Nghiệp vụ Chi tiết

### 3.1 Quy trình Đăng ký & Onboarding

#### 3.1.1 Buyer Onboarding Flow

```mermaid
flowchart TD
    A[User truy cập Shopee] --> B[Chọn đăng ký]
    B --> C{Phương thức đăng ký}
    C -->|Phone| D[Nhập số điện thoại]
    C -->|Email| E[Nhập email]
    C -->|Social| F[Đăng ký qua Facebook/Google]
    
    D --> G[Nhận OTP]
    E --> H[Xác thực email]
    F --> I[Authorize social account]
    
    G --> J[Nhập OTP]
    H --> K[Click link xác thực]
    I --> L[Thiết lập thông tin cơ bản]
    
    J --> L
    K --> L
    L --> M[Hoàn thành đăng ký]
    M --> N[Welcome bonus/voucher]
    N --> O[Guided tour ứng dụng]
    O --> P[Account activated]
```

#### 3.1.2 Seller Onboarding Flow

```mermaid
flowchart TD
    A[Seller truy cập Seller Center] --> B[Chọn loại tài khoản]
    B --> C{Loại seller}
    C -->|Individual| D[Đăng ký cá nhân]
    C -->|Business| E[Đăng ký doanh nghiệp]
    
    D --> F[Upload CMND/CCCD]
    E --> G[Upload giấy phép kinh doanh]
    
    F --> H[Điền thông tin cá nhân]
    G --> I[Điền thông tin doanh nghiệp]
    
    H --> J[Thiết lập thông tin shop]
    I --> J
    J --> K[Upload ảnh đại diện shop]
    K --> L[Thiết lập phương thức thanh toán]
    L --> M[Verify tài khoản ngân hàng]
    M --> N[Đọc và đồng ý terms & conditions]
    N --> O[Submit application]
    
    O --> P[Auto screening]
    P --> Q{Pass auto check?}
    Q -->|Không| R[Auto reject]
    R --> S[Email thông báo lý do]
    S --> T[7-day reapply cooldown]
    
    Q -->|Có| U[Manual review]
    U --> V[Shopee team verify]
    V --> W{Approve?}
    W -->|Không| X[Manual reject with feedback]
    X --> Y[14-day reapply period]
    
    W -->|Có| Z[Account approved]
    Z --> AA[Send seller handbook]
    AA --> BB[Free listing credits]
    BB --> CC[Seller training program]
    CC --> DD[Shop activated]
```

#### 3.1.3 Business Rules cho Onboarding

**Buyer Registration:**
1. Một số điện thoại chỉ đăng ký được 1 tài khoản
2. Email phải unique trong hệ thống
3. Social login tự động verify account
4. Welcome bonus: 15k voucher cho user mới

**Seller Registration:**
1. **Auto Screening Criteria**:
   - CMND/CCCD phải rõ nét, không bị che
   - Business license phải còn hiệu lực
   - Bank account phải match với tên đăng ký
   - Số điện thoại chưa được đăng ký

2. **Manual Review Process**:
   - Review time: 1-3 business days
   - Kiểm tra background của seller
   - Verify authenticity của documents
   - Assessment risk level

3. **Seller Tiers**:
   - **New Seller**: 0-3 tháng, limited features
   - **Regular Seller**: 3+ tháng, full features
   - **Preferred Seller**: High rating + volume
   - **Mall Seller**: Brand verification required

### 3.2 Quy trình Quản lý Sản phẩm

#### 3.2.1 Product Listing Flow

```mermaid
flowchart TD
    A[Seller vào Seller Center] --> B[Chọn "Thêm sản phẩm mới"]
    B --> C[Chọn danh mục sản phẩm]
    C --> D[Điền thông tin cơ bản]
    D --> E[Upload hình ảnh sản phẩm]
    E --> F[Thiết lập variations]
    F --> G[Cài đặt giá và inventory]
    G --> H[Thiết lập shipping]
    H --> I[SEO optimization]
    I --> J[Preview listing]
    
    J --> K{Kiểm tra thông tin}
    K -->|Sai| L[Chỉnh sửa thông tin]
    L --> J
    K -->|Đúng| M[Submit for review]
    
    M --> N[Auto content screening]
    N --> O{Pass auto check?}
    O -->|Không| P[Auto reject]
    P --> Q[Thông báo lỗi cụ thể]
    Q --> R[Seller fix issues]
    R --> M
    
    O -->|Có| S[Manual review (if needed)]
    S --> T{Manual approve?}
    T -->|Không| U[Manual reject]
    U --> V[Detailed feedback]
    V --> R
    
    T -->|Có| W[Product published]
    W --> X[Index to search engine]
    X --> Y[Notify seller]
    Y --> Z[Product live on platform]
```

#### 3.2.2 Inventory Management

```mermaid
flowchart TD
    A[Monitor stock levels] --> B{Stock threshold reached?}
    B -->|Không| C[Continue monitoring]
    C --> A
    B -->|Có| D[Send low stock alert]
    D --> E[Seller receives notification]
    E --> F{Seller action}
    F -->|Restock| G[Update inventory]
    F -->|Ignore| H[Continue selling until 0]
    
    G --> I[Stock replenished]
    I --> A
    H --> J{Stock = 0?}
    J -->|Không| H
    J -->|Có| K[Auto hide product]
    K --> L[Out of stock status]
    L --> M[Notify potential buyers]
    M --> N[Remove from search results]
    
    N --> O[Wait for restock]
    O --> P{Seller restocks?}
    P -->|Có| Q[Product reactivated]
    Q --> R[Back to search results]
    P -->|Không| S[Extended OOS handling]
    S --> T[30-day deactivation]
```

#### 3.2.3 Product Content Guidelines

**Image Requirements:**
1. Minimum 800x800 pixels
2. Maximum 2MB per image
3. Không watermark không được phép
4. Tối đa 9 ảnh per product
5. Ảnh đầu phải là ảnh chính của sản phẩm

**Content Rules:**
1. Tiêu đề: 3-120 ký tự
2. Mô tả: Tối thiểu 25 ký tự
3. Không được spam keywords
4. Cấm hàng fake, hàng nhái
5. Phải tuân thủ quy định pháp luật Việt Nam

### 3.3 Quy trình Quản lý Đơn hàng

#### 3.3.1 Order Processing Flow

```mermaid
flowchart TD
    A[Buyer places order] --> B[Payment processing]
    B --> C{Payment successful?}
    C -->|Không| D[Payment failed]
    D --> E[Order cancelled]
    E --> F[Notify buyer]
    F --> G[Return to cart]
    
    C -->|Có| H[Order confirmed]
    H --> I[Shopee Guarantee activated]
    I --> J[Notify seller]
    J --> K[Seller receives order]
    
    K --> L[Seller processing]
    L --> M{Seller confirms?}
    M -->|Không| N[Seller cancellation]
    N --> O[Refund processing]
    O --> P[Notify buyer]
    
    M -->|Có| Q[Prepare shipment]
    Q --> R[Generate shipping label]
    R --> S[Package handover]
    S --> T[In transit tracking]
    T --> U[Delivery attempt]
    
    U --> V{Delivery successful?}
    V -->|Không| W[Failed delivery]
    W --> X[Retry delivery]
    X --> Y{Max retries reached?}
    Y -->|Không| U
    Y -->|Có| Z[Return to sender]
    Z --> AA[Refund process]
    
    V -->|Có| BB[Package delivered]
    BB --> CC[Auto-confirm timer]
    CC --> DD{Buyer confirms receipt?}
    DD -->|Có| EE[Order completed]
    DD -->|7 days no action| EE
    EE --> FF[Release payment to seller]
    FF --> GG[Request review]
    
    BB --> HH{Buyer reports issue?}
    HH -->|Có| II[Dispute process]
    HH -->|Không| CC
```

#### 3.3.2 Order States Management

```mermaid
stateDiagram-v2
    [*] --> Pending: Order placed
    Pending --> Confirmed: Payment success
    Pending --> Cancelled: Payment failed
    Confirmed --> Processing: Seller accepts
    Confirmed --> Cancelled: Seller rejects
    Processing --> Shipped: Package sent
    Shipped --> InTransit: Pickup confirmed
    InTransit --> Delivered: Delivery success
    InTransit --> Failed: Delivery failed
    Failed --> InTransit: Retry delivery
    Failed --> Cancelled: Max retries
    Delivered --> Completed: Auto/Manual confirm
    Delivered --> Dispute: Buyer complaint
    Dispute --> Completed: Resolved
    Dispute --> Refunded: Buyer wins
    Completed --> [*]
    Cancelled --> [*]
    Refunded --> [*]
```

### 3.4 Quy trình Thanh toán & Bảo mật

#### 3.4.1 Payment Processing Flow

```mermaid
flowchart TD
    A[Buyer checkout] --> B[Select payment method]
    B --> C{Payment type}
    C -->|COD| D[Cash on Delivery]
    C -->|Bank Transfer| E[Internet Banking]
    C -->|E-wallet| F[Momo/ZaloPay/ShopeePay]
    C -->|Credit Card| G[Card processing]
    
    D --> H[COD order confirmed]
    H --> I[Shipping with payment collection]
    
    E --> J[Redirect to bank]
    F --> K[E-wallet authentication]
    G --> L[Card validation]
    
    J --> M[Bank authentication]
    K --> N[E-wallet processing]
    L --> O[3D Secure verification]
    
    M --> P{Bank payment success?}
    N --> Q{E-wallet payment success?}
    O --> R{Card payment success?}
    
    P -->|Có| S[Payment confirmed]
    Q -->|Có| S
    R -->|Có| S
    
    P -->|Không| T[Payment failed]
    Q -->|Không| T
    R -->|Không| T
    
    S --> U[Shopee Guarantee hold]
    U --> V[Notify seller]
    T --> W[Order cancelled]
    
    I --> X[COD collection on delivery]
    X --> Y{COD successful?}
    Y -->|Có| U
    Y -->|Không| Z[Return package]
```

#### 3.4.2 Shopee Guarantee System

```mermaid
flowchart TD
    A[Payment received] --> B[Hold in escrow account]
    B --> C[Order processing begins]
    C --> D[Package shipped]
    D --> E[Package delivered]
    E --> F[7-day confirmation period]
    
    F --> G{Buyer action}
    G -->|Confirms receipt| H[Release payment]
    G -->|Reports issue| I[Dispute investigation]
    G -->|No action| J[Auto-confirm after 7 days]
    
    J --> H
    H --> K[Transfer to seller account]
    K --> L[Deduct platform fees]
    L --> M[Final payment to seller]
    
    I --> N{Investigation result}
    N -->|Buyer right| O[Full refund to buyer]
    N -->|Seller right| P[Payment to seller]
    N -->|Partial fault| Q[Split resolution]
    
    O --> R[Return shipping cost handling]
    P --> K
    Q --> S[Partial refund/payment]
```

### 3.5 Quy trình Logistics & Vận chuyển

#### 3.5.1 Shipping Management Flow

```mermaid
flowchart TD
    A[Order confirmed] --> B[Seller chooses shipping option]
    B --> C{Shipping method}
    C -->|Self-managed| D[Seller handles shipping]
    C -->|Shopee Logistics| E[SPX Express]
    C -->|3rd Party| F[GHN/J&T/Viettel]
    
    D --> G[Seller ships directly]
    G --> H[Manual tracking updates]
    
    E --> I[SPX pickup scheduled]
    F --> J[3rd party pickup]
    
    I --> K[SPX pickup]
    J --> L[Partner pickup]
    
    K --> M[SPX sorting center]
    L --> N[Partner sorting center]
    
    M --> O[SPX delivery network]
    N --> P[Partner delivery network]
    
    O --> Q[SPX last mile delivery]
    P --> R[Partner last mile delivery]
    
    H --> S[Delivery to customer]
    Q --> S
    R --> S
    
    S --> T{Delivery successful?}
    T -->|Có| U[Delivery confirmed]
    T -->|Không| V[Failed delivery handling]
    
    U --> W[Update order status]
    V --> X[Retry delivery process]
    X --> Y{Max retries reached?}
    Y -->|Không| S
    Y -->|Có| Z[Return to sender]
```

#### 3.5.2 Shipping Rate Calculation

```mermaid
flowchart TD
    A[Calculate shipping cost] --> B[Get package dimensions]
    B --> C[Get package weight]
    C --> D[Determine origin & destination]
    D --> E[Calculate distance zones]
    E --> F{Shipping method}
    F -->|Standard| G[Standard rate table]
    F -->|Express| H[Express rate table]
    F -->|Same-day| I[Same-day rate table]
    
    G --> J[Base rate + weight surcharge]
    H --> K[Express base + weight surcharge]
    I --> L[Same-day base + distance surcharge]
    
    J --> M[Apply volume discount]
    K --> M
    L --> M
    
    M --> N[Check for free shipping eligibility]
    N --> O{Qualified for free shipping?}
    O -->|Có| P[Free shipping applied]
    O -->|Không| Q[Final shipping cost]
    
    P --> R[Shopee/Seller absorbs cost]
    Q --> S[Buyer pays shipping fee]
```

### 3.6 Quy trình Marketing & Khuyến mãi

#### 3.6.1 Campaign Management Flow

```mermaid
flowchart TD
    A[Marketing team plans campaign] --> B[Define campaign objectives]
    B --> C[Set budget and timeline]
    C --> D[Choose campaign type]
    D --> E{Campaign type}
    
    E -->|Flash Sale| F[Flash Sale setup]
    E -->|Voucher| G[Voucher creation]
    E -->|Free Shipping| H[Free shipping campaign]
    E -->|Brand Day| I[Brand-specific promotion]
    
    F --> J[Select products for flash sale]
    G --> K[Define voucher terms]
    H --> L[Set free shipping criteria]
    I --> M[Coordinate with brands]
    
    J --> N[Set discount percentages]
    K --> O[Set usage limitations]
    L --> P[Define minimum order value]
    M --> Q[Brand approval process]
    
    N --> R[Schedule flash sale timing]
    O --> S[Generate voucher codes]
    P --> T[Configure shipping rules]
    Q --> U[Brand campaign setup]
    
    R --> V[Pre-campaign promotion]
    S --> W[Distribute vouchers]
    T --> X[Update shipping calculator]
    U --> Y[Brand page customization]
    
    V --> Z[Campaign goes live]
    W --> Z
    X --> Z
    Y --> Z
    
    Z --> AA[Real-time monitoring]
    AA --> BB[Track campaign metrics]
    BB --> CC{Performance issues?}
    CC -->|Có| DD[Adjust campaign parameters]
    CC -->|Không| EE[Continue monitoring]
    DD --> AA
    EE --> FF[Campaign ends]
    FF --> GG[Post-campaign analysis]
```

#### 3.6.2 Dynamic Pricing System

```mermaid
flowchart TD
    A[Monitor market conditions] --> B[Analyze competitor prices]
    B --> C[Check inventory levels]
    C --> D[Review demand patterns]
    D --> E[Calculate optimal price]
    E --> F{Price change needed?}
    F -->|Không| G[Maintain current price]
    F -->|Có| H[Calculate new price]
    
    G --> A
    H --> I[Check business rules]
    I --> J{Within acceptable range?}
    J -->|Không| K[Apply constraints]
    J -->|Có| L[Update product price]
    
    K --> M[Set minimum viable price]
    L --> N[Notify seller (if applicable)]
    M --> L
    N --> O[Update search rankings]
    O --> P[Monitor price impact]
    P --> Q[Collect performance data]
    Q --> A
```

### 3.7 Quy trình Chăm sóc Khách hàng

#### 3.7.1 Customer Support Flow

```mermaid
flowchart TD
    A[Customer contacts support] --> B{Contact channel}
    B -->|In-app chat| C[Live chat system]
    B -->|Phone| D[Call center]
    B -->|Email| E[Email support]
    B -->|Social media| F[Social media team]
    
    C --> G[Auto-routing by issue type]
    D --> H[IVR system routing]
    E --> I[Email categorization]
    F --> J[Social media escalation]
    
    G --> K{Issue complexity}
    H --> K
    I --> K
    J --> K
    
    K -->|Level 1| L[General support agent]
    K -->|Level 2| M[Specialist agent]
    K -->|Level 3| N[Senior specialist/Manager]
    
    L --> O[Handle basic inquiries]
    M --> P[Handle complex issues]
    N --> Q[Handle escalations]
    
    O --> R{Issue resolved?}
    P --> R
    Q --> R
    
    R -->|Có| S[Close ticket]
    R -->|Không| T[Escalate to next level]
    
    T --> U{Can escalate further?}
    U -->|Có| V[Transfer to higher level]
    U -->|Không| W[Coordinate with other departments]
    
    V --> M
    W --> X[Cross-departmental resolution]
    X --> S
    
    S --> Y[Customer satisfaction survey]
    Y --> Z[Update knowledge base]
```

#### 3.7.2 Dispute Resolution Process

```mermaid
flowchart TD
    A[Buyer raises dispute] --> B[Categorize dispute type]
    B --> C{Dispute category}
    C -->|Product quality| D[Quality dispute]
    C -->|Wrong item| E[Wrong item dispute]
    C -->|Damage| F[Damage dispute]
    C -->|Non-delivery| G[Non-delivery dispute]
    
    D --> H[Request evidence from buyer]
    E --> I[Request evidence from buyer]
    F --> J[Request evidence from buyer]
    G --> K[Check delivery status]
    
    H --> L[Request seller response]
    I --> L
    J --> L
    K --> M{Delivered according to system?}
    
    M -->|Có| L
    M -->|Không| N[Auto-resolve in buyer favor]
    
    L --> O[Seller provides response]
    O --> P[Support team review]
    P --> Q[Evidence analysis]
    Q --> R{Decision}
    
    R -->|Buyer favor| S[Full refund + return process]
    R -->|Seller favor| T[No refund + close case]
    R -->|Partial fault| U[Partial refund negotiation]
    
    S --> V[Arrange return pickup]
    T --> W[Update dispute status]
    U --> X[Facilitate agreement]
    
    V --> Y[Process refund]
    X --> Z[Implement agreed solution]
    
    Y --> AA[Case closed]
    W --> AA
    Z --> AA
    
    N --> BB[Immediate refund]
    BB --> AA
```

## 4. Tích hợp Hệ thống và API

### 4.1 Core System Architecture

```mermaid
graph TB
    A[Web/Mobile Frontend] --> B[API Gateway]
    B --> C[User Service]
    B --> D[Product Service]
    B --> E[Order Service]
    B --> F[Payment Service]
    B --> G[Logistics Service]
    B --> H[Notification Service]
    
    C --> I[User Database]
    D --> J[Product Database]
    E --> K[Order Database]
    F --> L[Payment Database]
    G --> M[Logistics Database]
    H --> N[Message Queue]
    
    O[Analytics Service] --> P[Data Warehouse]
    Q[Search Service] --> R[Elasticsearch]
    S[Recommendation Service] --> T[ML Pipeline]
```

### 4.2 Key Performance Metrics

1. **Conversion Metrics**:
   - Conversion rate: 3-5%
   - Cart abandonment rate: <70%
   - Order completion rate: >95%

2. **Performance Metrics**:
   - Page load time: <3 seconds
   - API response time: <500ms
   - System uptime: 99.9%

3. **Business Metrics**:
   - GMV (Gross Merchandise Value)
   - Take rate: 5-8%
   - Customer acquisition cost
   - Customer lifetime value
   - Order frequency

## 5. Compliance và Security

### 5.1 Data Protection
- GDPR compliance cho EU users
- Vietnam Personal Data Protection Law
- PCI DSS cho card payments
- ISO 27001 security standards

### 5.2 Financial Compliance
- Vietnam State Bank regulations
- Anti-money laundering (AML)
- Know Your Customer (KYC)
- Tax compliance và reporting

### 5.3 Platform Governance
- Seller verification và monitoring
- Product compliance checks
- Intellectual property protection
- Consumer protection laws

## 6. Technology Stack

### 6.1 Frontend
- React Native (Mobile apps)
- React.js (Web frontend)
- Redux (State management)
- WebRTC (Live streaming)

### 6.2 Backend
- Node.js/Java (Microservices)
- Apache Kafka (Message streaming)
- Redis (Caching)
- PostgreSQL/MongoDB (Databases)

### 6.3 Infrastructure
- AWS/Google Cloud (Cloud platform)
- Kubernetes (Container orchestration)
- CDN (Content delivery)
- Load balancers

### 6.4 Analytics & ML
- Apache Spark (Big data processing)
- TensorFlow (Machine learning)
- Elasticsearch (Search & analytics)
- Real-time recommendation engine

## 7. Future Roadmap

### 7.1 Technology Enhancements
- AI-powered customer service
- Blockchain cho supply chain
- IoT integration cho smart logistics
- AR/VR shopping experiences

### 7.2 Business Expansion
- Cross-border e-commerce
- B2B marketplace
- Financial services (ShopeePay expansion)
- Digital content marketplace

### 7.3 Sustainability Initiatives
- Green logistics solutions
- Carbon footprint tracking
- Sustainable packaging programs
- Circular economy marketplace