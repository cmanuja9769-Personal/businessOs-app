# E-Way Bill API - Quick Reference

## 🚀 Quick Start (5 Minutes)

### 1. Add to .env
```env
EWAYBILL_API_URL=https://api.ewaybillgst.gov.in
EWAYBILL_USERNAME=your-username
EWAYBILL_PASSWORD=your-password
EWAYBILL_GSTIN=your-gstin
```

### 2. Update Database
```sql
ALTER TABLE invoices
ADD COLUMN ewaybill_no BIGINT,
ADD COLUMN ewaybill_date VARCHAR(50),
ADD COLUMN ewaybill_valid_upto VARCHAR(50),
ADD COLUMN ewaybill_status VARCHAR(20),
ADD COLUMN vehicle_number VARCHAR(20),
ADD COLUMN transport_mode VARCHAR(1),
ADD COLUMN distance INTEGER;
```

### 3. Test API
```bash
curl -X POST http://localhost:3001/api/v1/e-waybill/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invoiceId": "invoice-id-here"}'
```

---

## 📡 API Endpoints Cheat Sheet

```
POST   /api/v1/e-waybill/generate              → Generate E-Way Bill
GET    /api/v1/e-waybill/:ewbNo                → Get details
POST   /api/v1/e-waybill/update-vehicle        → Update vehicle
POST   /api/v1/e-waybill/cancel                → Cancel (within 24h)
POST   /api/v1/e-waybill/extend-validity       → Extend validity
POST   /api/v1/e-waybill/consolidated          → Consolidated bill
POST   /api/v1/e-waybill/reject                → Reject (recipient)
GET    /api/v1/e-waybill/generated-by-others   → Query others' bills
```

---

## 🔑 Common Codes

### Cancel Reason Codes
| Code | Reason |
|------|--------|
| 1 | Duplicate |
| 2 | Order Cancelled |
| 3 | Data Entry Mistake |
| 4 | Others |

### Vehicle Update Reason Codes
| Code | Reason |
|------|--------|
| 1 | Breakdown |
| 2 | Transhipment |
| 3 | Others |
| 4 | First Time |

### Transport Modes
| Code | Mode |
|------|------|
| 1 | Road |
| 2 | Rail |
| 3 | Air |
| 4 | Ship |

### Extension Reason Codes
| Code | Reason |
|------|--------|
| 1 | Natural Calamity |
| 2 | Law & Order |
| 3 | Transhipment |
| 4 | Accident |
| 5 | Others |

---

## 🏛️ Major State Codes

| State | Code | State | Code |
|-------|------|-------|------|
| Delhi | 7 | Maharashtra | 27 |
| Haryana | 6 | Karnataka | 29 |
| Punjab | 3 | Tamil Nadu | 33 |
| Rajasthan | 8 | Kerala | 32 |
| UP | 9 | Gujarat | 24 |
| Bihar | 10 | Telangana | 36 |
| West Bengal | 19 | Andhra Pradesh | 37 |

---

## ⚠️ Common Error Codes

| Code | Issue | Fix |
|------|-------|-----|
| 2002 | Already exists | Check if already generated |
| 2003 | Below threshold | Not required <₹50k |
| 2008 | Cannot cancel | >24 hours passed |
| 2010 | Invalid GSTIN | Verify format |
| 2020 | Expired | Generate new |
| 2025 | Invalid vehicle | Check format |
| 4001 | Auth failed | Check credentials |

---

## 💻 Frontend Quick Integration

```typescript
// API Setup
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api/v1',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Generate E-Way Bill
const generateEWB = async (invoiceId: string) => {
  const { data } = await api.post('/e-waybill/generate', { invoiceId });
  return data.data.ewbNo;
};

// Get Details
const getDetails = async (ewbNo: number) => {
  const { data } = await api.get(`/e-waybill/${ewbNo}`);
  return data.data;
};

// Update Vehicle
const updateVehicle = async (ewbNo: number, vehicleNo: string) => {
  await api.post('/e-waybill/update-vehicle', {
    ewbNo,
    vehicleNo,
    fromPlace: 'Mumbai',
    fromState: 27,
    reasonCode: '4', // First Time
    transMode: '1'   // Road
  });
};

// Cancel
const cancel = async (ewbNo: number, reason: string) => {
  await api.post('/e-waybill/cancel', {
    ewbNo,
    cancelRsnCode: '3', // Data Entry Mistake
    cancelRmrk: reason
  });
};
```

---

## 🎯 Business Rules

### When is E-Way Bill Required?
- ✅ Goods value > ₹50,000
- ✅ Inter-state movement of goods
- ✅ Intra-state movement (if state mandates)

### When to Generate?
- Before goods dispatch
- At least 4 hours before movement starts

### Validity Period
- **Road**: 1 day per 100 KM
- **Rail/Air/Ship**: As per transport time

### Extension Rules
- Can extend only during movement
- Must extend before expiry
- Valid reason required

### Cancellation Rules
- Within 24 hours of generation
- Only if goods not moved
- Valid reason required

---

## 📁 File Structure

```
backend/src/
├── types/ewaybill.types.ts          ← Type definitions
├── services/ewaybill.service.ts     ← Core logic
├── controllers/ewaybill.controller.ts ← Request handlers
├── routes/ewaybill.routes.ts        ← API routes
└── queues/ewaybill-generation.queue.ts ← Async jobs
```

---

## 🔍 Debugging

### Check Logs
```bash
tail -f backend/logs/combined.log | grep "E-Way Bill"
```

### Common Issues

**"Authentication failed"**
```bash
# Check credentials
echo $EWAYBILL_USERNAME
echo $EWAYBILL_GSTIN
```

**"Invoice not found"**
```bash
# Verify invoice exists and belongs to org
```

**"GSTIN invalid"**
```bash
# Format: 27AABCU9603R1ZM (15 chars)
```

**"Vehicle number invalid"**
```bash
# Format: MH12AB1234 (no spaces)
```

---

## 🧪 Test Scenarios

### 1. Basic Generation
```json
POST /e-waybill/generate
{
  "invoiceId": "valid-invoice-id"
}
```

### 2. Update Vehicle
```json
POST /e-waybill/update-vehicle
{
  "ewbNo": 123456789012,
  "vehicleNo": "MH12CD5678",
  "fromPlace": "Mumbai",
  "fromState": 27,
  "reasonCode": "2",
  "transMode": "1"
}
```

### 3. Cancel
```json
POST /e-waybill/cancel
{
  "ewbNo": 123456789012,
  "cancelRsnCode": "3",
  "cancelRmrk": "Wrong invoice number"
}
```

---

## 📞 Support

**Government E-Way Bill:**
- Portal: https://ewaybillgst.gov.in
- Phone: 1800-103-4824
- Email: helpdesk@ewaybillgst.gov.in

**Implementation:**
- Backend Docs: `EWAYBILL_BACKEND_DOCUMENTATION.md`
- Frontend Guide: `EWAYBILL_FRONTEND_IMPLEMENTATION_GUIDE.md`
- Summary: `EWAYBILL_IMPLEMENTATION_SUMMARY.md`

---

## ✅ Pre-Production Checklist

- [ ] E-Way Bill credentials configured in .env
- [ ] Database columns added to invoices table
- [ ] Redis running for queue
- [ ] API tested with sandbox environment
- [ ] Frontend integrated and tested
- [ ] Error handling tested
- [ ] Logs monitoring set up
- [ ] Rate limits understood
- [ ] Team trained on E-Way Bill rules
- [ ] Backup procedures in place

---

## 🎓 Learning Resources

1. **Official Manual**: https://ewaybillgst.gov.in/user-manual
2. **API Docs**: https://ewaybillgst.gov.in/api-docs
3. **Video Tutorials**: https://ewaybillgst.gov.in/tutorials
4. **FAQs**: https://ewaybillgst.gov.in/faqs

---

**Quick Tip:** Start with sandbox environment (`preprod-api.ewaybillgst.gov.in`) for testing!

**Last Updated:** December 29, 2024
