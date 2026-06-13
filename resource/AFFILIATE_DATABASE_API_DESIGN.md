# Database Schema & API Design - AffiliateMax Pro

## 1. Core Database Schema

### 1.1 User Management
```sql
-- Users & Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) CHECK (role IN ('admin', 'advertiser', 'affiliate', 'manager')),
    status VARCHAR(20) DEFAULT 'pending',
    email_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Advertisers
CREATE TABLE advertisers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    company_name VARCHAR(255) NOT NULL,
    website_url VARCHAR(255),
    industry VARCHAR(100),
    payment_terms INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Affiliate Tiers
CREATE TABLE affiliate_tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    min_performance_score DECIMAL(3,2),
    commission_bonus_percentage DECIMAL(5,2) DEFAULT 0.00,
    minimum_payout DECIMAL(10,2) DEFAULT 50.00
);

-- Affiliates
CREATE TABLE affiliates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    affiliate_code VARCHAR(20) UNIQUE NOT NULL,
    tier_id INTEGER REFERENCES affiliate_tiers(id),
    performance_score DECIMAL(3,2) DEFAULT 0.00,
    fraud_score DECIMAL(3,2) DEFAULT 0.00,
    total_clicks BIGINT DEFAULT 0,
    total_conversions BIGINT DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0.00,
    payment_method VARCHAR(50),
    payment_details JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 1.2 Campaign Management
```sql
-- Campaign Categories
CREATE TABLE campaign_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advertiser_id UUID REFERENCES advertisers(id),
    category_id INTEGER REFERENCES campaign_categories(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    landing_page_url VARCHAR(500),
    
    -- Commission structure
    commission_type VARCHAR(10) CHECK (commission_type IN ('CPA', 'CPL', 'CPS', 'CPM')),
    commission_value DECIMAL(10,2),
    commission_percentage DECIMAL(5,2),
    
    -- Caps and scheduling
    daily_cap INTEGER,
    total_cap INTEGER,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    
    -- Settings
    status VARCHAR(20) DEFAULT 'draft',
    approval_required BOOLEAN DEFAULT true,
    tracking_domain VARCHAR(255),
    conversion_pixel TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Campaign Targeting
CREATE TABLE campaign_targeting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    included_countries VARCHAR(2)[],
    excluded_countries VARCHAR(2)[],
    device_types VARCHAR(20)[],
    operating_systems VARCHAR(20)[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- Affiliate Campaign Assignments
CREATE TABLE affiliate_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES affiliates(id),
    campaign_id UUID REFERENCES campaigns(id),
    custom_commission_value DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pending',
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(affiliate_id, campaign_id)
);
```

### 1.3 Tracking & Analytics
```sql
-- Clicks Tracking (Partitioned by date for performance)
CREATE TABLE clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    click_id VARCHAR(50) UNIQUE NOT NULL,
    affiliate_id UUID REFERENCES affiliates(id),
    campaign_id UUID REFERENCES campaigns(id),
    
    -- Request data
    ip_address INET,
    user_agent TEXT,
    referer VARCHAR(1000),
    
    -- Geographic & device data
    country_code CHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    device_type VARCHAR(20),
    os_name VARCHAR(50),
    browser_name VARCHAR(50),
    is_mobile BOOLEAN DEFAULT false,
    is_bot BOOLEAN DEFAULT false,
    
    -- Sub IDs for tracking
    sub_id_1 VARCHAR(255),
    sub_id_2 VARCHAR(255),
    sub_id_3 VARCHAR(255),
    
    clicked_at TIMESTAMP DEFAULT NOW(),
    
    INDEX (affiliate_id, clicked_at),
    INDEX (campaign_id, clicked_at),
    INDEX (click_id)
) PARTITION BY RANGE (clicked_at);

-- Conversions Tracking
CREATE TABLE conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversion_id VARCHAR(50) UNIQUE,
    click_id UUID REFERENCES clicks(id),
    affiliate_id UUID REFERENCES affiliates(id),
    campaign_id UUID REFERENCES campaigns(id),
    
    -- Transaction data
    transaction_id VARCHAR(100),
    customer_id VARCHAR(100),
    conversion_value DECIMAL(15,2),
    commission_amount DECIMAL(10,2),
    currency_code CHAR(3) DEFAULT 'USD',
    
    -- Quality control
    status VARCHAR(20) DEFAULT 'pending',
    quality_score DECIMAL(3,2) DEFAULT 1.00,
    fraud_score DECIMAL(3,2) DEFAULT 0.00,
    
    -- Approval workflow
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    rejected_reason TEXT,
    
    converted_at TIMESTAMP DEFAULT NOW(),
    
    INDEX (affiliate_id, converted_at),
    INDEX (campaign_id, converted_at),
    INDEX (status)
) PARTITION BY RANGE (converted_at);
```

### 1.4 Financial Management
```sql
-- Commission Ledger
CREATE TABLE commission_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES affiliates(id),
    conversion_id UUID REFERENCES conversions(id),
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('credit', 'debit', 'adjustment', 'chargeback')),
    amount DECIMAL(15,2) NOT NULL,
    currency_code CHAR(3) DEFAULT 'USD',
    balance_before DECIMAL(15,2),
    balance_after DECIMAL(15,2),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX (affiliate_id, created_at)
);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES affiliates(id),
    gross_amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    net_amount DECIMAL(15,2) NOT NULL,
    currency_code CHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    period_from DATE,
    period_to DATE,
    scheduled_at TIMESTAMP,
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX (affiliate_id, created_at),
    INDEX (status, scheduled_at)
);

-- Payment Items
CREATE TABLE payment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id),
    conversion_id UUID REFERENCES conversions(id),
    amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 2. RESTful API Design

### 2.1 Authentication APIs
```typescript
// Auth endpoints
POST   /api/v1/auth/register     // User registration
POST   /api/v1/auth/login        // User login
POST   /api/v1/auth/logout       // User logout
POST   /api/v1/auth/refresh      // Refresh token
GET    /api/v1/auth/me           // Get current user
PUT    /api/v1/auth/profile      // Update profile

// Types
interface AuthRequest {
  email: string;
  password: string;
  role?: 'advertiser' | 'affiliate';
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfile;
}
```

### 2.2 Campaign Management APIs
```typescript
// Campaign CRUD
GET    /api/v1/campaigns         // List campaigns
POST   /api/v1/campaigns         // Create campaign
GET    /api/v1/campaigns/:id     // Get campaign details
PUT    /api/v1/campaigns/:id     // Update campaign
DELETE /api/v1/campaigns/:id     // Delete campaign

// Campaign operations
POST   /api/v1/campaigns/:id/approve    // Approve campaign
POST   /api/v1/campaigns/:id/pause      // Pause campaign
GET    /api/v1/campaigns/:id/stats      // Campaign statistics

// Campaign affiliates
GET    /api/v1/campaigns/:id/affiliates          // List campaign affiliates
POST   /api/v1/campaigns/:id/affiliates/:aid     // Approve affiliate for campaign

// Types
interface Campaign {
  id: string;
  name: string;
  description: string;
  commissionType: 'CPA' | 'CPL' | 'CPS' | 'CPM';
  commissionValue: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: string;
  endDate?: string;
  landingPageUrl: string;
}

interface CampaignStats {
  clicks: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  epc: number;
  period: { from: string; to: string };
}
```

### 2.3 Affiliate Management APIs
```typescript
// Affiliate CRUD
GET    /api/v1/affiliates        // List affiliates
POST   /api/v1/affiliates        // Create affiliate
GET    /api/v1/affiliates/:id    // Get affiliate details
PUT    /api/v1/affiliates/:id    // Update affiliate

// Affiliate operations
GET    /api/v1/affiliates/:id/campaigns     // Available campaigns
GET    /api/v1/affiliates/:id/stats         // Affiliate performance
GET    /api/v1/affiliates/:id/payments      // Payment history
POST   /api/v1/affiliates/:id/payments      // Create payment
GET    /api/v1/affiliates/:id/links         // Tracking links

// Types
interface Affiliate {
  id: string;
  affiliateCode: string;
  tier: string;
  performanceScore: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  status: 'pending' | 'active' | 'suspended';
}
```

### 2.4 Tracking APIs
```typescript
// Tracking endpoints
GET    /api/v1/track/click/:campaignId/:affiliateId   // Click tracking
POST   /api/v1/track/conversion                       // Conversion tracking
GET    /api/v1/track/pixel.gif                        // Pixel tracking

// Analytics
GET    /api/v1/analytics/dashboard                    // Dashboard data
GET    /api/v1/analytics/reports                      // Generate reports
POST   /api/v1/analytics/reports/custom               // Custom reports

// Types
interface TrackingResponse {
  clickId: string;
  redirectUrl: string;
  timestamp: string;
}

interface ConversionRequest {
  clickId?: string;
  affiliateId: string;
  campaignId: string;
  value: number;
  transactionId: string;
}

interface DashboardData {
  summary: {
    totalClicks: number;
    totalConversions: number;
    totalRevenue: number;
    conversionRate: number;
  };
  charts: {
    clicksOverTime: TimeSeriesData[];
    revenueOverTime: TimeSeriesData[];
    topCampaigns: CampaignPerformance[];
  };
}
```

### 2.5 Payment & Financial APIs
```typescript
// Payment management
GET    /api/v1/payments          // List payments
POST   /api/v1/payments          // Create payment
GET    /api/v1/payments/:id      // Payment details
PUT    /api/v1/payments/:id      // Update payment status

// Commission management
GET    /api/v1/commissions       // Commission history
GET    /api/v1/commissions/balance    // Current balance
POST   /api/v1/commissions/withdrawal // Request withdrawal

// Invoice management
GET    /api/v1/invoices          // List invoices
POST   /api/v1/invoices          // Create invoice
GET    /api/v1/invoices/:id/pdf  // Download PDF

// Types
interface Payment {
  id: string;
  affiliateId: string;
  grossAmount: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentMethod: string;
  scheduledAt: string;
  completedAt?: string;
}

interface CommissionBalance {
  pendingBalance: number;
  availableBalance: number;
  paidToDate: number;
  nextPaymentDate: string;
}
```

## 3. Real-time Features

### 3.1 WebSocket Events
```typescript
// Real-time event system
interface WebSocketEvents {
  'conversion:new': ConversionEvent;
  'conversion:approved': ConversionEvent;
  'payment:processed': PaymentEvent;
  'campaign:stats:updated': StatsEvent;
  'fraud:detected': FraudEvent;
}

interface ConversionEvent {
  conversionId: string;
  affiliateId: string;
  campaignId: string;
  amount: number;
  timestamp: Date;
}

interface FraudEvent {
  type: 'click_fraud' | 'conversion_fraud';
  severity: 'low' | 'medium' | 'high';
  entityId: string;
  details: Record<string, any>;
}
```

### 3.2 Event-Driven Architecture
```typescript
// Event publishers and subscribers
interface EventBus {
  publish(event: string, data: any): Promise<void>;
  subscribe(event: string, handler: Function): void;
}

// Example usage
eventBus.publish('conversion.recorded', {
  conversionId: 'conv_123',
  affiliateId: 'aff_456',
  amount: 50.00
});

// Fraud detection listener
eventBus.subscribe('click.recorded', async (clickData) => {
  const fraudScore = await fraudDetection.analyze(clickData);
  if (fraudScore > 0.8) {
    eventBus.publish('fraud.detected', {
      type: 'click_fraud',
      severity: 'high',
      clickId: clickData.clickId
    });
  }
});
```

## 4. Performance Optimization

### 4.1 Database Indexes
```sql
-- High-performance indexes for tracking tables
CREATE INDEX CONCURRENTLY idx_clicks_affiliate_date 
ON clicks (affiliate_id, clicked_at) 
WHERE is_bot = false;

CREATE INDEX CONCURRENTLY idx_conversions_status_date 
ON conversions (status, converted_at) 
WHERE status IN ('pending', 'approved');

-- Composite indexes for analytics
CREATE INDEX CONCURRENTLY idx_conversions_analytics 
ON conversions (campaign_id, affiliate_id, converted_at, status)
INCLUDE (commission_amount, conversion_value);
```

### 4.2 Caching Strategy
```typescript
// Redis caching patterns
interface CacheService {
  // Campaign stats caching (5 minutes)
  getCampaignStats(campaignId: string): Promise<CampaignStats>;
  
  // Affiliate balance caching (1 minute)
  getAffiliateBalance(affiliateId: string): Promise<number>;
  
  // Real-time counters
  incrementClickCount(affiliateId: string): Promise<number>;
  incrementConversionCount(affiliateId: string): Promise<number>;
}

// Example implementation
const getCampaignStats = async (campaignId: string): Promise<CampaignStats> => {
  const cacheKey = `campaign:stats:${campaignId}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from database
  const stats = await database.getCampaignStats(campaignId);
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(stats));
  
  return stats;
};
```

### 4.3 Analytics Aggregation
```sql
-- Pre-aggregated daily stats table
CREATE TABLE daily_stats (
    date DATE NOT NULL,
    affiliate_id UUID,
    campaign_id UUID,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    revenue DECIMAL(15,2) DEFAULT 0.00,
    commission DECIMAL(10,2) DEFAULT 0.00,
    
    PRIMARY KEY (date, affiliate_id, campaign_id),
    INDEX (affiliate_id, date),
    INDEX (campaign_id, date)
);

-- Materialized view for real-time dashboard
CREATE MATERIALIZED VIEW campaign_performance AS
SELECT 
    c.id,
    c.name,
    COUNT(cl.id) as total_clicks,
    COUNT(conv.id) as total_conversions,
    COALESCE(AVG(conv.conversion_value), 0) as avg_order_value,
    COALESCE(SUM(conv.commission_amount), 0) as total_commission
FROM campaigns c
LEFT JOIN clicks cl ON c.id = cl.campaign_id AND cl.clicked_at >= NOW() - INTERVAL '30 days'
LEFT JOIN conversions conv ON c.id = conv.campaign_id AND conv.converted_at >= NOW() - INTERVAL '30 days'
WHERE c.status = 'active'
GROUP BY c.id, c.name;

-- Refresh materialized view every 5 minutes
CREATE OR REPLACE FUNCTION refresh_campaign_performance()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY campaign_performance;
END;
$$ LANGUAGE plpgsql;
```

## 5. Security & Compliance

### 5.1 API Security
```typescript
// JWT token validation middleware
const validateToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Rate limiting
const rateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later'
});
```

### 5.2 Data Privacy
```sql
-- GDPR compliance - data retention policies
CREATE TABLE data_retention_policies (
    table_name VARCHAR(100),
    retention_days INTEGER,
    anonymization_fields TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- Automated data cleanup job
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
DECLARE
    policy RECORD;
BEGIN
    FOR policy IN SELECT * FROM data_retention_policies LOOP
        EXECUTE format('DELETE FROM %I WHERE created_at < NOW() - INTERVAL ''%s days''', 
                      policy.table_name, policy.retention_days);
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

This comprehensive database and API design provides the foundation for a scalable, secure, and high-performance affiliate marketing platform that can compete with industry leaders like Growstack.