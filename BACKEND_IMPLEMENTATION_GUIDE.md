# Complete Backend Implementation Guide - E2E

## 📋 OVERVIEW

This guide provides complete, step-by-step instructions for implementing the Node.js backend for your inventory-billing application, specifically for E-Invoice IRP integration and GST Portal connectivity.

**Why Backend is Needed:**
- ✅ Government APIs require secure credential management
- ✅ Complex authentication flows (OAuth, Session management)
- ✅ Webhook handling for async responses
- ✅ Retry logic and job queues
- ✅ Rate limiting and throttling
- ✅ Compliance and audit logging

**What Backend Does:**
1. E-Invoice IRN generation via IRP
2. IRN cancellation
3. GST return JSON generation
4. GST portal auto-filing (optional)
5. Webhook handling from IRP
6. Job queue for retry logic

**Technology Stack:**
- Runtime: Node.js 20 LTS
- Framework: Express.js
- Language: TypeScript
- Queue: BullMQ + Redis
- Database: Supabase PostgreSQL (existing)
- Deployment: Render.com or Railway.app
- Monitoring: Sentry

---

## 🚀 PHASE 1: PROJECT SETUP

### Step 1: Initialize Node.js Project

\`\`\`bash
# Create backend directory
cd c:\Users\cmanu\Downloads\inventory-billing-app
mkdir backend
cd backend

# Initialize npm project
npm init -y

# Install production dependencies
npm install express cors helmet morgan dotenv
npm install @supabase/supabase-js
npm install axios
npm install bullmq ioredis
npm install winston
npm install zod
npm install jsonwebtoken
npm install qrcode

# Install dev dependencies
npm install --save-dev typescript @types/node @types/express @types/cors
npm install --save-dev ts-node nodemon
npm install --save-dev @types/jsonwebtoken
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
\`\`\`

### Step 2: TypeScript Configuration

Create `tsconfig.json`:

\`\`\`json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts"]
}
\`\`\`

### Step 3: Project Structure

Create the following directory structure:

\`\`\`
backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # Supabase client config
│   │   ├── redis.ts             # Redis/Queue config
│   │   ├── providers.ts         # IRP provider configs
│   │   └── logger.ts            # Winston logger config
│   ├── types/
│   │   ├── invoice.types.ts     # Invoice interfaces
│   │   ├── einvoice.types.ts    # E-Invoice interfaces
│   │   ├── gst.types.ts         # GST return interfaces
│   │   └── api.types.ts         # API request/response types
│   ├── services/
│   │   ├── irp.service.ts       # IRP API integration
│   │   ├── gst.service.ts       # GST portal integration
│   │   ├── qrcode.service.ts    # QR code generation
│   │   └── validation.service.ts # GSTIN validation
│   ├── controllers/
│   │   ├── einvoice.controller.ts
│   │   ├── gst.controller.ts
│   │   └── webhook.controller.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts   # JWT verification
│   │   ├── error.middleware.ts  # Error handling
│   │   ├── validate.middleware.ts # Request validation
│   │   └── ratelimit.middleware.ts # Rate limiting
│   ├── queues/
│   │   ├── irn-generation.queue.ts
│   │   ├── irn-cancellation.queue.ts
│   │   └── gst-filing.queue.ts
│   ├── utils/
│   │   ├── errors.ts            # Custom error classes
│   │   ├── response.ts          # API response formatter
│   │   └── crypto.ts            # Encryption utilities
│   ├── routes/
│   │   ├── einvoice.routes.ts
│   │   ├── gst.routes.ts
│   │   ├── webhook.routes.ts
│   │   └── health.routes.ts
│   ├── jobs/
│   │   ├── retry-failed-irn.job.ts
│   │   └── cleanup.job.ts
│   ├── app.ts                   # Express app setup
│   └── server.ts                # Server entry point
├── .env.example
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
\`\`\`

Create the structure:

\`\`\`bash
# Create directories
mkdir -p src/{config,types,services,controllers,middlewares,queues,utils,routes,jobs}

# Create empty files
touch src/config/{database,redis,providers,logger}.ts
touch src/types/{invoice.types,einvoice.types,gst.types,api.types}.ts
touch src/services/{irp.service,gst.service,qrcode.service,validation.service}.ts
touch src/controllers/{einvoice.controller,gst.controller,webhook.controller}.ts
touch src/middlewares/{auth.middleware,error.middleware,validate.middleware,ratelimit.middleware}.ts
touch src/queues/{irn-generation.queue,irn-cancellation.queue,gst-filing.queue}.ts
touch src/utils/{errors,response,crypto}.ts
touch src/routes/{einvoice.routes,gst.routes,webhook.routes,health.routes}.ts
touch src/jobs/{retry-failed-irn.job,cleanup.job}.ts
touch src/{app,server}.ts
\`\`\`

### Step 4: Environment Configuration

Create `.env.example`:

\`\`\`env
# Server Configuration
NODE_ENV=development
PORT=3001
API_VERSION=v1

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here

# Redis/Queue Configuration (Upstash)
REDIS_URL=redis://default:password@host:port
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# IRP Provider Configuration
IRP_PROVIDER=cleartax
# Options: cleartax, masters_india, nic, iris

# ClearTax Configuration
CLEARTAX_API_URL=https://einvoicing.internal.cleartax.co
CLEARTAX_USERNAME=your-username
CLEARTAX_PASSWORD=your-password
CLEARTAX_GSTIN=your-gstin
CLEARTAX_AUTH_TOKEN=your-auth-token

# Masters India Configuration
MASTERS_API_URL=https://api.mastergst.com
MASTERS_CLIENT_ID=your-client-id
MASTERS_CLIENT_SECRET=your-client-secret
MASTERS_GSTIN=your-gstin
MASTERS_USERNAME=your-username
MASTERS_PASSWORD=your-password

# NIC Configuration (Government Portal)
NIC_API_URL=https://gsp.adaequare.com
NIC_CLIENT_ID=your-client-id
NIC_CLIENT_SECRET=your-client-secret
NIC_GSTIN=your-gstin
NIC_USERNAME=your-username
NIC_PASSWORD=your-password

# GST Portal Configuration
GST_PORTAL_URL=https://return.gst.gov.in
GST_USERNAME=your-gst-username
GST_PASSWORD=your-gst-password

# Application Settings
JWT_SECRET=your-jwt-secret-for-verification
WEBHOOK_SECRET=your-webhook-secret
ENABLE_RATE_LIMIT=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs

# Monitoring (Optional)
SENTRY_DSN=your-sentry-dsn

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
\`\`\`

Copy to `.env`:

\`\`\`bash
cp .env.example .env
# Edit .env with your actual credentials
\`\`\`

### Step 5: Package.json Scripts

Update `package.json`:

\`\`\`json
{
  "name": "inventory-billing-backend",
  "version": "1.0.0",
  "description": "Backend API for E-Invoice and GST integration",
  "main": "dist/server.js",
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "start:prod": "NODE_ENV=production node dist/server.js",
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix",
    "test": "echo \"Tests not implemented yet\""
  },
  "keywords": ["einvoice", "gst", "invoice", "billing"],
  "author": "Your Name",
  "license": "MIT",
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
\`\`\`

---

## 🛠️ PHASE 2: CORE CONFIGURATION

### Step 6: Logger Configuration

Create `src/config/logger.ts`:

\`\`\`typescript
import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const logFilePath = process.env.LOG_FILE_PATH || './logs';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    }`;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'einvoice-backend' },
  transports: [
    // Write to file
    new winston.transports.File({ 
      filename: `${logFilePath}/error.log`, 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({ 
      filename: `${logFilePath}/combined.log`,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If not production, log to console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

export default logger;
\`\`\`

### Step 7: Database Configuration

Create `src/config/database.ts`:

\`\`\`typescript
import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with service key (backend only)
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('invoices').select('count').limit(1);
    
    if (error) {
      logger.error('Database connection failed:', error);
      return false;
    }
    
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection error:', error);
    return false;
  }
}
\`\`\`

### Step 8: Redis Configuration

Create `src/config/redis.ts`:

\`\`\`typescript
import { Redis } from 'ioredis';
import { logger } from './logger';

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;
const redisPort = parseInt(process.env.REDIS_PORT || '6379');
const redisPassword = process.env.REDIS_PASSWORD;

// Create Redis client
export const redis = redisUrl
  ? new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    })
  : new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });

// Redis event handlers
redis.on('connect', () => {
  logger.info('Redis client connected');
});

redis.on('ready', () => {
  logger.info('Redis client ready');
});

redis.on('error', (err) => {
  logger.error('Redis client error:', err);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

redis.on('reconnecting', () => {
  logger.info('Redis client reconnecting');
});

// Test Redis connection
export async function testRedisConnection(): Promise<boolean> {
  try {
    await redis.connect();
    await redis.ping();
    logger.info('Redis connection successful');
    return true;
  } catch (error) {
    logger.error('Redis connection failed:', error);
    return false;
  }
}

export default redis;
\`\`\`

### Step 9: IRP Provider Configuration

Create `src/config/providers.ts`:

\`\`\`typescript
import { logger } from './logger';

export interface IRPProviderConfig {
  name: string;
  apiUrl: string;
  credentials: {
    username?: string;
    password?: string;
    gstin?: string;
    authToken?: string;
    clientId?: string;
    clientSecret?: string;
  };
}

export const IRP_PROVIDERS = {
  cleartax: {
    name: 'ClearTax',
    apiUrl: process.env.CLEARTAX_API_URL || 'https://einvoicing.internal.cleartax.co',
    credentials: {
      username: process.env.CLEARTAX_USERNAME,
      password: process.env.CLEARTAX_PASSWORD,
      gstin: process.env.CLEARTAX_GSTIN,
      authToken: process.env.CLEARTAX_AUTH_TOKEN,
    },
  },
  masters_india: {
    name: 'Masters India',
    apiUrl: process.env.MASTERS_API_URL || 'https://api.mastergst.com',
    credentials: {
      clientId: process.env.MASTERS_CLIENT_ID,
      clientSecret: process.env.MASTERS_CLIENT_SECRET,
      gstin: process.env.MASTERS_GSTIN,
      username: process.env.MASTERS_USERNAME,
      password: process.env.MASTERS_PASSWORD,
    },
  },
  nic: {
    name: 'NIC (Government)',
    apiUrl: process.env.NIC_API_URL || 'https://gsp.adaequare.com',
    credentials: {
      clientId: process.env.NIC_CLIENT_ID,
      clientSecret: process.env.NIC_CLIENT_SECRET,
      gstin: process.env.NIC_GSTIN,
      username: process.env.NIC_USERNAME,
      password: process.env.NIC_PASSWORD,
    },
  },
};

export function getIRPProvider(): IRPProviderConfig {
  const providerName = process.env.IRP_PROVIDER || 'cleartax';
  
  const provider = IRP_PROVIDERS[providerName as keyof typeof IRP_PROVIDERS];
  
  if (!provider) {
    logger.error(`Invalid IRP provider: ${providerName}`);
    throw new Error(`Invalid IRP provider: ${providerName}`);
  }
  
  logger.info(`Using IRP provider: ${provider.name}`);
  return provider;
}

export default { IRP_PROVIDERS, getIRPProvider };
\`\`\`

---

## 📝 PHASE 3: TYPE DEFINITIONS

### Step 10: Define Types

Create `src/types/einvoice.types.ts`:

\`\`\`typescript
export interface EInvoiceItem {
  itemName: string;
  hsn: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess?: number;
  discount?: number;
}

export interface EInvoiceData {
  invoiceNo: string;
  invoiceDate: string; // YYYY-MM-DD format
  invoiceType: 'INV' | 'CRN' | 'DBN';
  supplyType: 'B2B' | 'B2C' | 'SEZWP' | 'SEZWOP' | 'EXPWP' | 'EXPWOP' | 'DEXP';
  
  // Seller details
  sellerGstin: string;
  sellerLegalName: string;
  sellerTradeName?: string;
  sellerAddress: string;
  sellerCity: string;
  sellerState: string;
  sellerPincode: string;
  
  // Buyer details
  buyerGstin: string;
  buyerLegalName: string;
  buyerTradeName?: string;
  buyerAddress: string;
  buyerCity: string;
  buyerState: string;
  buyerPincode: string;
  buyerPhone?: string;
  buyerEmail?: string;
  
  // Items
  items: EInvoiceItem[];
  
  // Totals
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess?: number;
  total: number;
  
  // Additional fields
  transportMode?: string;
  vehicleNumber?: string;
  transporterName?: string;
  transporterId?: string;
  distance?: number;
  
  // E-Way Bill
  ewayBillNo?: string;
  ewayBillDate?: string;
  
  // Payment details
  paymentMode?: 'Cash' | 'Credit' | 'Debit Card' | 'UPI' | 'Net Banking';
  paymentDueDate?: string;
  
  // Additional reference
  poNumber?: string;
  poDate?: string;
  dispatchFromName?: string;
  dispatchFromAddress?: string;
  shipToName?: string;
  shipToAddress?: string;
}

export interface IRNResponse {
  success: boolean;
  irn?: string;
  ackNo?: string;
  ackDate?: string;
  signedInvoice?: string;
  signedQRCode?: string;
  qrCodeImage?: string;
  ewayBillNo?: string;
  ewayBillDate?: string;
  ewayBillValidUpto?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface IRNCancellationRequest {
  irn: string;
  cancelReason: 
    | '1' // Duplicate
    | '2' // Data Entry Mistake
    | '3' // Order Cancelled
    | '4'; // Others
  cancelRemarks: string;
}

export interface IRNCancellationResponse {
  success: boolean;
  irn?: string;
  cancelDate?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface GSTINValidationResponse {
  valid: boolean;
  gstin?: string;
  legalName?: string;
  tradeName?: string;
  address?: string;
  state?: string;
  status?: 'Active' | 'Cancelled' | 'Suspended';
  registrationDate?: string;
  lastUpdated?: string;
  error?: {
    code: string;
    message: string;
  };
}
\`\`\`

Create `src/types/gst.types.ts`:

\`\`\`typescript
export interface GSTR1B2BInvoice {
  inum: string; // Invoice number
  idt: string; // Invoice date (DD/MM/YYYY)
  val: number; // Invoice value
  pos: string; // Place of supply (state code)
  rchrg: 'Y' | 'N'; // Reverse charge
  inv_typ: 'R' | 'SEWP' | 'SEWOP' | 'DE'; // Invoice type
  itms: Array<{
    num: number; // Item serial number
    itm_det: {
      txval: number; // Taxable value
      rt: number; // Tax rate
      iamt: number; // IGST amount
      camt: number; // CGST amount
      samt: number; // SGST amount
      csamt: number; // Cess amount
    };
  }>;
}

export interface GSTR1B2CInvoice {
  sply_ty: 'INTRA' | 'INTER'; // Supply type
  pos: string; // Place of supply
  typ: 'E' | 'OE'; // E-commerce or Other
  txval: number; // Taxable value
  rt: number; // Tax rate
  iamt: number; // IGST
  camt: number; // CGST
  samt: number; // SGST
  csamt: number; // Cess
}

export interface GSTR1Data {
  gstin: string;
  fp: string; // Financial period (MMYYYY)
  b2b: Array<{
    ctin: string; // Customer GSTIN
    inv: GSTR1B2BInvoice[];
  }>;
  b2cl: Array<GSTR1B2BInvoice>; // B2C Large (>2.5L)
  b2cs: Array<GSTR1B2CInvoice>; // B2C Small
  cdnr: Array<any>; // Credit/Debit notes (Registered)
  cdnur: Array<any>; // Credit/Debit notes (Unregistered)
  exp: Array<any>; // Exports
  at: Array<any>; // Tax liability (Advances)
  atadj: Array<any>; // Advance adjustments
  exemp: Array<any>; // Nil rated, exempted, non-GST supplies
  hsn: Array<{
    hsn_sc: string;
    qty: number;
    txval: number;
    iamt: number;
    camt: number;
    samt: number;
    csamt: number;
  }>;
}

export interface GSTR3BData {
  gstin: string;
  ret_period: string; // MMYYYY
  
  // Table 3.1 - Outward taxable supplies
  sup_details: {
    osup_det: {
      txval: number;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    };
    osup_zero: {
      txval: number;
      iamt: number;
    };
    osup_nil_exmp: {
      txval: number;
    };
    isup_rev: {
      txval: number;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    };
    osup_nongst: {
      txval: number;
    };
  };
  
  // Table 3.2 - ITC (Input Tax Credit)
  itc_elg: {
    itc_avl: Array<{
      ty: string; // Type
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    }>;
    itc_rev: Array<{
      ty: string;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    }>;
    itc_net: {
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    };
    itc_inelg: Array<{
      ty: string;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    }>;
  };
  
  // Table 5 - Tax paid
  intr_details: {
    intr_det: {
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    };
  };
}
\`\`\`

*(Due to length constraints, I'll provide the remaining implementation in the next message. This includes Services, Controllers, Routes, Queue system, and deployment instructions.)*

**Would you like me to continue with:**
1. ✅ Services Implementation (IRP, GST, QR Code)
2. ✅ Controllers & Routes
3. ✅ Queue System (BullMQ)
4. ✅ Middleware (Auth, Error Handling)
5. ✅ Deployment to Render.com
6. ✅ Frontend Integration
7. ✅ Testing & Monitoring
