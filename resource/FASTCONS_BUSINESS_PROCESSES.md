# Quy trình Nghiệp vụ Chi tiết - Hệ thống FastCons

## 1. Tổng quan Quy trình Nghiệp vụ

Hệ thống FastCons bao gồm 13 quy trình nghiệp vụ chính được tích hợp chặt chẽ với nhau để tạo thành một hệ sinh thái quản lý dự án xây dựng hoàn chỉnh.

### 1.1 Sơ đồ Tổng quan Quy trình

```mermaid
graph TB
    A[Khởi tạo Dự án] --> B[Quản lý Kế hoạch]
    B --> C[Quản lý Hợp đồng]
    C --> D[Quản lý Vật tư]
    D --> E[Triển khai Thi công]
    E --> F[Chấm công]
    E --> G[Nhật ký Thi công]
    E --> H[Quản lý Tiến độ]
    H --> I[Quản lý Khối lượng]
    I --> J[Quản lý Chi phí]
    J --> K[Nghiệm thu]
    K --> L[Báo cáo & Phân tích]
    L --> M[Quản lý Tài liệu]
    
    style A fill:#e1f5fe
    style L fill:#f3e5f5
    style M fill:#e8f5e8
```

## 2. Chi tiết Quy trình Nghiệp vụ

### 2.1 Quy trình Quản lý Kế hoạch (Plan Management)

#### 2.1.1 Use Case Diagram

```mermaid
graph LR
    PM[Project Manager] --> UC1[Tạo WBS]
    PM --> UC2[Thiết lập Gantt Chart]
    PM --> UC3[Phân bổ Nguồn lực]
    PM --> UC4[Import BoQ]
    PM --> UC5[Thiết lập Định mức]
    
    CE[Chief Engineer] --> UC6[Phê duyệt Kế hoạch]
    CE --> UC7[Điều chỉnh Kế hoạch]
    
    SC[Site Commander] --> UC8[Xem Kế hoạch]
    SC --> UC9[Báo cáo Tiến độ]
```

#### 2.1.2 Quy trình Chi tiết

```mermaid
flowchart TD
    A[Bắt đầu] --> B[Nhập thông tin dự án cơ bản]
    B --> C[Import BoQ từ Excel/Phần mềm dự toán]
    C --> D{BoQ hợp lệ?}
    D -->|Không| E[Sửa lỗi BoQ]
    E --> C
    D -->|Có| F[Phân rã công việc theo WBS]
    F --> G[Thiết lập mối quan hệ phụ thuộc]
    G --> H[Tạo sơ đồ Gantt]
    H --> I[Phân bổ nguồn lực]
    I --> J[Thiết lập định mức cho từng hạng mục]
    J --> K[Tính toán chi phí dự kiến]
    K --> L[Gửi phê duyệt]
    L --> M{Được phê duyệt?}
    M -->|Không| N[Điều chỉnh theo góp ý]
    N --> L
    M -->|Có| O[Kích hoạt kế hoạch]
    O --> P[Thông báo các bên liên quan]
    P --> Q[Kết thúc]
```

#### 2.1.3 Business Rules

1. **Phân rã WBS**: Tối đa 5 cấp độ, mỗi cấp có mã định danh duy nhất
2. **Gantt Chart**: Tự động tính toán critical path
3. **Nguồn lực**: Không được vượt quá 100% capacity của resource
4. **Định mức**: Phải có ít nhất 3 loại: nhân công, vật tư, máy móc
5. **Phê duyệt**: Cần ít nhất 2 cấp phê duyệt cho dự án > 10 tỷ

### 2.2 Quy trình Quản lý Tiến độ (Progress Management)

#### 2.2.1 Quy trình Real-time Tracking

```mermaid
flowchart TD
    A[Bắt đầu ngày làm việc] --> B[Cập nhật nhật ký thi công]
    B --> C[Nhập khối lượng hoàn thành]
    C --> D[Hệ thống tính % tiến độ]
    D --> E[Cập nhật Gantt Chart]
    E --> F[Kiểm tra cảnh báo]
    
    F --> G{Có cảnh báo?}
    G -->|Không| H[Tạo báo cáo tiến độ]
    G -->|Có| I[Phân loại cảnh báo]
    
    I --> J{Loại cảnh báo}
    J -->|Chậm tiến độ| K[Phân tích nguyên nhân chậm]
    J -->|Vượt định mức| L[Kiểm tra nguồn lực]
    J -->|Chất lượng| M[Yêu cầu QC kiểm tra]
    
    K --> N[Đề xuất giải pháp]
    L --> N
    M --> N
    N --> O[Gửi thông báo stakeholders]
    O --> H
    H --> P[Đồng bộ với mobile app]
    P --> Q[Kết thúc]
```

#### 2.2.2 Burn-up Chart Logic

```mermaid
gantt
    title Burn-up Chart Example
    dateFormat  YYYY-MM-DD
    section Planned
    Planned Progress    :planned, 2024-01-01, 2024-06-30
    section Actual
    Actual Progress     :actual, 2024-01-01, 2024-04-15
    section Forecast
    Forecast            :forecast, 2024-04-15, 2024-07-15
```

### 2.3 Quy trình Quản lý Khối lượng (Quantity Management)

#### 2.3.1 Quy trình Nghiệm thu

```mermaid
flowchart TD
    A[Hoàn thành hạng mục] --> B[Tự kiểm tra chất lượng]
    B --> C{Đạt tiêu chuẩn?}
    C -->|Không| D[Sửa chữa, hoàn thiện]
    D --> B
    C -->|Có| E[Lập đề xuất nghiệm thu]
    E --> F[Gửi QC kiểm tra]
    F --> G[QC thực hiện kiểm tra]
    G --> H{QC chấp nhận?}
    H -->|Không| I[Ghi nhận lỗi]
    I --> J[Yêu cầu sửa chữa]
    J --> D
    H -->|Có| K[Đo đạc khối lượng thực tế]
    K --> L[So sánh với BoQ]
    L --> M{Khối lượng hợp lệ?}
    M -->|Không| N[Điều chỉnh khối lượng]
    N --> O[Ghi nhận lý do điều chỉnh]
    O --> P[Lập biên bản nghiệm thu]
    M -->|Có| P
    P --> Q[Cập nhật tiến độ dự án]
    Q --> R[Tạo hóa đơn thanh toán]
    R --> S[Kết thúc]
```

#### 2.3.2 Quy trình Quản lý Thầu phụ

```mermaid
flowchart TD
    A[Xác định công việc giao thầu] --> B[Lập bảng khối lượng giao thầu]
    B --> C[Đấu thầu/Chọn thầu phụ]
    C --> D[Ký hợp đồng thầu phụ]
    D --> E[Giao việc và bàn giao mặt bằng]
    E --> F[Thầu phụ triển khai]
    F --> G[Giám sát tiến độ hàng ngày]
    G --> H[Báo cáo tiến độ thầu phụ]
    H --> I{Đúng tiến độ?}
    I -->|Không| J[Cảnh báo và yêu cầu giải trình]
    J --> K[Đề xuất biện pháp khắc phục]
    K --> L[Theo dõi thực hiện]
    L --> G
    I -->|Có| M[Nghiệm thu từng đợt]
    M --> N[Thanh toán theo tiến độ]
    N --> O{Hoàn thành?}
    O -->|Không| G
    O -->|Có| P[Nghiệm thu tổng thể]
    P --> Q[Thanh toán cuối]
    Q --> R[Kết thúc hợp đồng]
```

### 2.4 Quy trình Quản lý Vật tư (Materials Management)

#### 2.4.1 Quy trình Cung ứng Vật tư

```mermaid
flowchart TD
    A[Lập kế hoạch vật tư tháng] --> B[Kiểm tra tồn kho hiện tại]
    B --> C[Tính toán nhu cầu]
    C --> D[Lập đề xuất cung ứng]
    D --> E[Phê duyệt đề xuất]
    E --> F{Được phê duyệt?}
    F -->|Không| G[Điều chỉnh đề xuất]
    G --> E
    F -->|Có| H[Chọn nhà cung cấp]
    H --> I[Đặt hàng]
    I --> J[Theo dõi giao hàng]
    J --> K[Nhận hàng tại kho]
    K --> L[Kiểm tra chất lượng]
    L --> M{Đạt chất lượng?}
    M -->|Không| N[Trả hàng/Đổi hàng]
    N --> J
    M -->|Có| O[Nhập kho]
    O --> P[Cập nhật tồn kho]
    P --> Q[Thông báo có hàng]
    Q --> R[Kết thúc]
```

#### 2.4.2 Quy trình Xuất kho và Sử dụng

```mermaid
flowchart TD
    A[Nhận yêu cầu vật tư] --> B[Kiểm tra định mức]
    B --> C{Trong định mức?}
    C -->|Không| D[Yêu cầu giải trình]
    D --> E[Phê duyệt vượt định mức]
    E --> F{Được phê duyệt?}
    F -->|Không| G[Từ chối cấp phát]
    F -->|Có| H[Ghi nhận vượt định mức]
    C -->|Có| H
    H --> I[Kiểm tra tồn kho]
    I --> J{Đủ hàng?}
    J -->|Không| K[Thông báo thiếu hàng]
    K --> L[Đề xuất cung ứng khẩn cấp]
    J -->|Có| M[Lập phiếu xuất kho]
    M --> N[Xuất hàng]
    N --> O[Vận chuyển đến công trường]
    O --> P[Bàn giao cho tổ thi công]
    P --> Q[Ghi nhận sử dụng trong nhật ký]
    Q --> R[Cập nhật tồn kho]
    R --> S[Đối soát định mức]
    S --> T[Cảnh báo nếu gần vượt]
    T --> U[Kết thúc]
```

### 2.5 Quy trình Quản lý Chi phí (Cost Management)

#### 2.5.1 Quy trình Kiểm soát Ngân sách

```mermaid
flowchart TD
    A[Thiết lập ngân sách dự án] --> B[Phân bổ theo hạng mục]
    B --> C[Thiết lập mức cảnh báo]
    C --> D[Theo dõi chi tiêu hàng ngày]
    D --> E[Tính toán chi phí tích lũy]
    E --> F[So sánh với ngân sách]
    F --> G{Vượt mức cảnh báo?}
    G -->|Không| H[Cập nhật báo cáo tài chính]
    G -->|Có| I[Gửi cảnh báo tự động]
    I --> J[Phân tích nguyên nhân]
    J --> K[Đề xuất biện pháp]
    K --> L[Phê duyệt điều chỉnh]
    L --> M{Được phê duyệt?}
    M -->|Không| N[Tạm dừng chi tiêu]
    M -->|Có| O[Điều chỉnh ngân sách]
    O --> H
    N --> P[Tìm giải pháp tiết kiệm]
    P --> H
    H --> Q[Dự báo chi phí còn lại]
    Q --> R[Báo cáo lãi/lỗ dự kiến]
    R --> S[Kết thúc]
```

#### 2.5.2 Quy trình Thanh toán

```mermaid
flowchart TD
    A[Nhận hóa đơn/Chứng từ] --> B[Kiểm tra tính hợp lệ]
    B --> C{Hợp lệ?}
    C -->|Không| D[Trả lại để sửa]
    C -->|Có| E[Kiểm tra ngân sách]
    E --> F{Đủ ngân sách?}
    F -->|Không| G[Đề xuất bổ sung ngân sách]
    G --> H[Chờ phê duyệt]
    H --> I{Được phê duyệt?}
    I -->|Không| J[Hoãn thanh toán]
    I -->|Có| K[Cập nhật ngân sách]
    F -->|Có| K
    K --> L[Lập phiếu đề nghị thanh toán]
    L --> M[Gửi phê duyệt]
    M --> N{Được phê duyệt?}
    N -->|Không| O[Điều chỉnh theo góp ý]
    O --> M
    N -->|Có| P[Thực hiện thanh toán]
    P --> Q[Ghi nhận vào sổ sách]
    Q --> R[Cập nhật công nợ]
    R --> S[Thông báo cho các bên]
    S --> T[Kết thúc]
```

### 2.6 Quy trình Quản lý Hợp đồng (Contract Management)

#### 2.6.1 Quy trình Quản lý Hợp đồng Chính

```mermaid
flowchart TD
    A[Nhận hồ sơ mời thầu] --> B[Phân tích yêu cầu]
    B --> C[Lập dự toán chi tiết]
    C --> D[Chuẩn bị hồ sơ dự thầu]
    D --> E[Nộp hồ sơ dự thầu]
    E --> F[Chờ kết quả]
    F --> G{Trúng thầu?}
    G -->|Không| H[Phân tích nguyên nhân]
    H --> I[Cải thiện cho lần sau]
    G -->|Có| J[Đàm phán hợp đồng]
    J --> K[Ký kết hợp đồng]
    K --> L[Nhập thông tin vào hệ thống]
    L --> M[Phân tích BoQ hợp đồng]
    M --> N[Thiết lập kế hoạch thực hiện]
    N --> O[Theo dõi thực hiện hợp đồng]
    O --> P[Báo cáo tiến độ định kỳ]
    P --> Q{Hoàn thành?}
    Q -->|Không| R[Kiểm tra milestone]
    R --> S[Nghiệm thu từng đợt]
    S --> T[Thanh toán theo tiến độ]
    T --> O
    Q -->|Có| U[Nghiệm thu tổng thể]
    U --> V[Thanh toán cuối]
    V --> W[Bảo hành]
    W --> X[Kết thúc hợp đồng]
```

### 2.7 Quy trình Nhật ký Thi công (Construction Log)

#### 2.7.1 Quy trình Báo cáo Hàng ngày

```mermaid
flowchart TD
    A[Bắt đầu ca làm việc] --> B[Kiểm tra điều kiện thời tiết]
    B --> C[Ghi nhận nhân lực có mặt]
    C --> D[Cập nhật tiến độ các hạng mục]
    D --> E[Ghi nhận vật tư sử dụng]
    E --> F[Chụp ảnh hiện trường]
    F --> G[Ghi nhận sự cố/vấn đề]
    G --> H[Đánh giá an toàn lao động]
    H --> I[Tổng hợp nhật ký ngày]
    I --> J[Gửi phê duyệt]
    J --> K{Được phê duyệt?}
    K -->|Không| L[Bổ sung thông tin]
    L --> J
    K -->|Có| M[Đồng bộ với các module khác]
    M --> N[Cập nhật tiến độ dự án]
    N --> O[Gửi báo cáo tự động]
    O --> P[Lưu trữ nhật ký]
    P --> Q[Kết thúc]
```

### 2.8 Quy trình Chấm công (Timesheet Management)

#### 2.8.1 Quy trình Chấm công với FaceID

```mermaid
flowchart TD
    A[Nhân viên mở app] --> B[Chọn chức năng chấm công]
    B --> C[Kiểm tra GPS location]
    C --> D{Trong phạm vi công trường?}
    D -->|Không| E[Thông báo lỗi vị trí]
    E --> F[Yêu cầu di chuyển đến đúng vị trí]
    D -->|Có| G[Kích hoạt camera]
    G --> H[Chụp ảnh khuôn mặt]
    H --> I[So sánh với FaceID đã lưu]
    I --> J{Khớp khuôn mặt?}
    J -->|Không| K[Thông báo lỗi nhận dạng]
    K --> L[Cho phép thử lại 2 lần]
    L --> M{Hết lượt thử?}
    M -->|Có| N[Chuyển sang chế độ thủ công]
    M -->|Không| H
    J -->|Có| O[Ghi nhận thời gian chấm công]
    O --> P[Kiểm tra ca làm việc]
    P --> Q[Cập nhật bảng công]
    Q --> R[Gửi thông báo xác nhận]
    R --> S[Đồng bộ với server]
    S --> T[Kết thúc]
    N --> U[Quản lý xác nhận thủ công]
    U --> Q
```

### 2.9 Quy trình Quản lý Tài liệu (Document Management)

#### 2.9.1 Quy trình Quản lý Hồ sơ Dự án

```mermaid
flowchart TD
    A[Upload tài liệu] --> B[Kiểm tra định dạng file]
    B --> C{Định dạng hợp lệ?}
    C -->|Không| D[Thông báo lỗi định dạng]
    C -->|Có| E[Quét virus]
    E --> F{An toàn?}
    F -->|Không| G[Cảnh báo và từ chối]
    F -->|Có| H[Phân loại tài liệu]
    H --> I[Gán metadata]
    I --> J[Thiết lập phân quyền]
    J --> K[Lưu trữ vào thư mục dự án]
    K --> L[Tạo preview nếu có thể]
    L --> M[Gửi thông báo cho team]
    M --> N[Ghi log hoạt động]
    N --> O[Kết thúc]
```

#### 2.9.2 Quy trình Ký số Tài liệu

```mermaid
flowchart TD
    A[Tạo tài liệu cần ký] --> B[Thiết lập luồng ký]
    B --> C[Gửi cho người ký đầu tiên]
    C --> D[Người ký nhận thông báo]
    D --> E[Xem xét tài liệu]
    E --> F{Đồng ý ký?}
    F -->|Không| G[Từ chối và ghi lý do]
    G --> H[Thông báo người tạo]
    H --> I[Điều chỉnh tài liệu]
    I --> C
    F -->|Có| J[Thực hiện ký số]
    J --> K[Ghi nhận thời gian ký]
    K --> L{Còn người ký tiếp theo?}
    L -->|Có| M[Chuyển cho người tiếp theo]
    M --> D
    L -->|Không| N[Hoàn tất quy trình ký]
    N --> O[Lưu trữ bản ký cuối cùng]
    O --> P[Thông báo hoàn tất]
    P --> Q[Kết thúc]
```

## 3. Tích hợp Quy trình

### 3.1 Ma trận Tích hợp Quy trình

| Module | Kế hoạch | Tiến độ | Khối lượng | Vật tư | Chi phí | Hợp đồng | Nhật ký | Chấm công | Tài liệu |
|--------|----------|---------|------------|--------|---------|----------|---------|-----------|----------|
| Kế hoạch | ● | ● | ● | ● | ● | ● | ○ | ○ | ● |
| Tiến độ | ● | ● | ● | ● | ● | ○ | ● | ● | ○ |
| Khối lượng | ● | ● | ● | ● | ● | ● | ● | ○ | ● |
| Vật tư | ● | ● | ● | ● | ● | ● | ● | ○ | ○ |
| Chi phí | ● | ● | ● | ● | ● | ● | ● | ● | ○ |
| Hợp đồng | ● | ○ | ● | ● | ● | ● | ○ | ○ | ● |
| Nhật ký | ○ | ● | ● | ● | ● | ○ | ● | ● | ● |
| Chấm công | ○ | ● | ○ | ○ | ● | ○ | ● | ● | ○ |
| Tài liệu | ● | ○ | ● | ○ | ○ | ● | ● | ○ | ● |

**Chú thích**: ● = Tích hợp chặt chẽ, ○ = Tích hợp lỏng lẻo

### 3.2 Luồng Dữ liệu Chính

```mermaid
flowchart LR
    A[Kế hoạch] --> B[Tiến độ]
    B --> C[Khối lượng]
    C --> D[Chi phí]
    
    E[Vật tư] --> B
    E --> D
    
    F[Nhật ký] --> B
    F --> C
    F --> E
    
    G[Chấm công] --> D
    G --> F
    
    H[Hợp đồng] --> A
    H --> C
    H --> D
    
    I[Tài liệu] --> A
    I --> C
    I --> H
```

## 4. Quy tắc Nghiệp vụ (Business Rules)

### 4.1 Quy tắc Chung

1. **Phân quyền**: Mọi thao tác đều phải có phân quyền rõ ràng
2. **Audit Trail**: Ghi log tất cả các thay đổi quan trọng
3. **Validation**: Kiểm tra dữ liệu đầu vào ở mọi cấp độ
4. **Notification**: Thông báo tự động cho các bên liên quan
5. **Backup**: Sao lưu dữ liệu định kỳ và trước mọi thay đổi lớn

### 4.2 Quy tắc Cụ thể theo Module

#### 4.2.1 Quản lý Kế hoạch
- WBS không được quá 5 cấp độ
- Mỗi work package phải có ít nhất 1 resource được gán
- Thời gian dự án không được vượt quá 5 năm
- Critical path phải được tính toán tự động

#### 4.2.2 Quản lý Tiến độ
- Cập nhật tiến độ ít nhất 1 lần/ngày
- Cảnh báo khi tiến độ chậm > 5% so với kế hoạch
- Burn-up chart được cập nhật real-time
- KPI hoàn thành được tính theo công thức chuẩn

#### 4.2.3 Quản lý Vật tư
- Không được xuất kho khi không đủ tồn kho
- Cảnh báo khi sử dụng > 90% định mức
- Phải có ít nhất 2 cấp phê duyệt cho đề xuất > 100 triệu
- Kiểm tra chất lượng bắt buộc với vật tư quan trọng

#### 4.2.4 Quản lý Chi phí
- Không được chi vượt ngân sách đã phê duyệt
- Cảnh báo khi chi phí đạt 80% ngân sách
- Phải có chứng từ hợp lệ cho mọi khoản chi
- Báo cáo tài chính phải được tạo hàng ngày

## 5. Exception Handling

### 5.1 Xử lý Ngoại lệ Thường gặp

```mermaid
flowchart TD
    A[Phát hiện ngoại lệ] --> B{Loại ngoại lệ}
    B -->|Lỗi hệ thống| C[Ghi log lỗi]
    B -->|Lỗi nghiệp vụ| D[Thông báo người dùng]
    B -->|Lỗi dữ liệu| E[Rollback transaction]
    
    C --> F[Thông báo admin]
    D --> G[Hướng dẫn khắc phục]
    E --> H[Khôi phục dữ liệu]
    
    F --> I[Khắc phục lỗi]
    G --> J[Người dùng thử lại]
    H --> K[Kiểm tra tính toàn vẹn]
    
    I --> L[Kiểm tra hệ thống]
    J --> M{Thành công?}
    K --> N[Tiếp tục xử lý]
    
    M -->|Không| A
    M -->|Có| N
    L --> N
    N --> O[Kết thúc]
```

### 5.2 Disaster Recovery

1. **Backup Strategy**: 
   - Full backup hàng ngày
   - Incremental backup mỗi 4 giờ
   - Transaction log backup mỗi 15 phút

2. **Recovery Procedures**:
   - RTO (Recovery Time Objective): < 4 giờ
   - RPO (Recovery Point Objective): < 15 phút
   - Automatic failover cho critical services

3. **Business Continuity**:
   - Offline mode cho mobile app
   - Manual processes cho critical operations
   - Communication plan cho stakeholders

## 6. Performance Requirements

### 6.1 Response Time Requirements

| Chức năng | Response Time | Throughput |
|-----------|---------------|------------|
| Đăng nhập | < 2s | 1000 concurrent users |
| Xem dashboard | < 3s | 500 concurrent users |
| Cập nhật tiến độ | < 1s | 200 TPS |
| Upload tài liệu | < 10s | 50 concurrent uploads |
| Tạo báo cáo | < 30s | 10 concurrent reports |
| Sync mobile | < 5s | 100 concurrent syncs |

### 6.2 Scalability Requirements

- **Horizontal Scaling**: Hỗ trợ scale out cho tất cả services
- **Database Sharding**: Theo project_id
- **Caching Strategy**: Multi-level caching
- **CDN**: Cho static assets và documents

## 7. Monitoring và Alerting

### 7.1 Business Metrics

```mermaid
graph TD
    A[Business Metrics] --> B[Project Health]
    A --> C[Financial Performance]
    A --> D[Resource Utilization]
    A --> E[Quality Metrics]
    
    B --> B1[Schedule Performance Index]
    B --> B2[Cost Performance Index]
    B --> B3[Quality Index]
    
    C --> C1[Budget Variance]
    C --> C2[Cash Flow]
    C --> C3[Profit Margin]
    
    D --> D1[Labor Productivity]
    D --> D2[Equipment Utilization]
    D --> D3[Material Efficiency]
    
    E --> E1[Defect Rate]
    E --> E2[Rework Percentage]
    E --> E3[Customer Satisfaction]
```

### 7.2 Alert Rules

1. **Critical Alerts** (Immediate notification):
   - System down
   - Data corruption
   - Security breach
   - Budget exceeded by >10%

2. **Warning Alerts** (Within 1 hour):
   - Schedule delay >5%
   - Resource utilization >90%
   - Quality issues
   - Performance degradation

3. **Info Alerts** (Daily digest):
   - Progress updates
   - Milestone achievements
   - Regular reports

## 8. Kết luận

Hệ thống quy trình nghiệp vụ FastCons được thiết kế để:

1. **Tự động hóa** các quy trình thủ công
2. **Tích hợp chặt chẽ** giữa các module
3. **Đảm bảo tính nhất quán** của dữ liệu
4. **Cung cấp visibility** cho tất cả stakeholders
5. **Hỗ trợ ra quyết định** dựa trên dữ liệu real-time

Việc triển khai thành công các quy trình này sẽ giúp các doanh nghiệp xây dựng nâng cao hiệu quả quản lý dự án, giảm thiểu rủi ro và tối ưu hóa chi phí.