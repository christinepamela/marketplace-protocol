# Logistics Pool - Complete Specifications

**Version:** 1.0  
**Date:** December 11, 2025  
**Status:** Ready for Implementation

---

## 📚 Documentation Structure

This specification is split into three comprehensive parts:

### [Part 1: Overview & Architecture](logistics-pool-part1.md)
**What you'll find:**
- Executive summary and vision
- System architecture diagrams
- User roles and personas (Provider, Vendor, Buyer)
- Core concepts (Logistics Pool, Quote System, Provider Discovery)
- Integration model with marketplaces

**Read this first** to understand the big picture and why we're building this.

### [Part 2: Features & Workflows](logistics-pool-part2.md)
**What you'll find:**
- Detailed feature specifications
- Complete user workflows for all three roles
- Quote system mechanics (Product-level vs Order-level)
- Shipment tracking process
- Rating and review system

**Read this second** to understand how users interact with the system.

### [Part 3: Technical Implementation](logistics-pool-part3.md)
**What you'll find:**
- Technical stack and dependencies
- SDK integration guide
- Database schema and new tables needed
- API endpoints (existing + new ones needed)
- UI component library structure
- State management patterns
- Testing and deployment strategies

**Read this third** when you're ready to start building.

---

## 🎯 Quick Start

### For Product Owners
1. Read Part 1 (30 mins) - Understand the vision
2. Skim Part 2 (20 mins) - See user workflows
3. Review key decisions in Part 1

### For Developers
1. Skim Part 1 (15 mins) - Get context
2. Read Part 3 thoroughly (45 mins) - Technical details
3. Reference Part 2 as needed during implementation

### For Session 14 Assistant
**Priority reading order:**
1. Part 3 - Technical Implementation (SDK methods, API routes)
2. Part 1 - Integration Model section
3. Master Handover Document (Session 13 summary)

**Then start with:**
- Fixing Issue #13 (payment flow)
- Adding SDK methods (Issue #16)
- Adding protocol routes (Issue #17)

---

## 🏗️ Implementation Roadmap

### Session 14: Foundation (5-6 hours)
- [ ] Fix payment flow (Issue #13)
- [ ] Add 5 SDK methods (Issue #16)
- [ ] Add 5 protocol routes (Issue #17)
- [ ] Initialize logistics-marketplace app
- [ ] Build provider registration

### Session 15: Provider Dashboard (4-5 hours)
- [ ] Dashboard with stats
- [ ] Opportunities browser
- [ ] Quote submission UI
- [ ] My quotes page

### Session 16: Shipment Operations (4-5 hours)
- [ ] Active shipments page
- [ ] Tracking update form
- [ ] Delivery proof upload
- [ ] Provider profile settings

### Session 17: Integration (4-5 hours)
- [ ] Vendor provider selection
- [ ] Buyer override at checkout
- [ ] Cross-app testing
- [ ] Bug fixes and polish

**Total Estimated:** 17-21 hours across 4 sessions

---

## 🔑 Key Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Separate application | Enable multiple marketplaces to share pool | High - Requires new app |
| KYC-only providers | Shipping requires accountability | Medium - Clear requirement |
| Two-quote system | Balance pre-planning with real-time pricing | Medium - Complex workflow |
| Quote expiry | Prevent stale pricing | Low - Automated system |
| Buyer override | Maximize choice and flexibility | Medium - Additional UI |

---

## 📋 Prerequisites Before Building

**Backend Requirements:**
- ✅ Protocol Layer 3 exists and works
- ✅ Database tables created
- ❌ SDK methods missing (5 new methods needed)
- ❌ Protocol routes missing (5 new endpoints needed)

**Frontend Requirements:**
- ❌ Logistics app not created yet
- ✅ Tailwind theme ready (Studio McGee)
- ✅ Component patterns established
- ✅ SDK integration pattern known

**Testing Requirements:**
- ❌ Payment flow broken (blocking)
- ✅ Manual testing strategy defined
- ✅ Test data structure ready

**Status:** 60% ready - Backend needs completion first

---

## 🚨 Known Blockers

### Issue #13: Missing Payment Action (HIGH)
**Problem:** Orders stuck at `payment_pending`  
**Impact:** Cannot test order lifecycle or logistics  
**Fix:** Add `canPay` action to `lib/api/orders.ts`  
**Estimated Time:** 30 minutes

### Issue #16: SDK Missing Methods (HIGH)
**Problem:** No provider-specific SDK methods  
**Impact:** Cannot build provider dashboard  
**Needed Methods:**
- `getProviderQuotes(providerId, status?)`
- `getOpportunities(filters?)`
- `getProviderShipments(providerId, status?)`
- `favoriteProvider(providerId)`
- `getFavoriteProviders()`

**Estimated Time:** 60 minutes

### Issue #17: Protocol Missing Routes (HIGH)
**Problem:** No backend endpoints for provider features  
**Impact:** Frontend will have no API to call  
**Needed Routes:**
- `GET /logistics/providers/:id/quotes`
- `GET /logistics/opportunities`
- `GET /logistics/providers/:id/shipments`
- `POST /logistics/providers/:id/favorite`
- `GET /logistics/favorites`

**Estimated Time:** 90 minutes

**ALL THREE MUST BE FIXED BEFORE UI WORK BEGINS**

---

## 📊 Project Metrics

### Specifications
- **Total Pages:** ~50 pages (all 3 parts)
- **Components Planned:** 25+ components
- **API Endpoints:** 15 existing + 5 new
- **Database Tables:** 4 existing + 2 new

### Estimated Scope
- **Lines of Code:** ~8,000-10,000 lines
- **Development Time:** 17-21 hours (4 sessions)
- **Testing Time:** 4-6 hours
- **Total:** ~25 hours

---

## 🎓 Learning Resources

### Understanding the System
- **Logistics Pool concept:** Part 1, Section "Vision & Purpose"
- **User workflows:** Part 2, "Provider Workflows"
- **Quote system:** Part 2, "Quote System Details"

### Building the System
- **Component structure:** Part 3, "UI Components"
- **State management:** Part 3, "State Management"
- **API integration:** Part 3, "SDK Integration"

### Testing the System
- **Manual testing:** Part 3, "Testing Strategy"
- **Test scenarios:** Part 2, workflow sections

---

## 📞 Support

**Questions during implementation?**
- Reference the specific part and section
- Check Master Handover Document for context
- Review Protocol Layer 3 documentation
- Ask Chris for business logic clarification

**Stuck on technical issues?**
- Request missing files (zero assumptions)
- Check SDK method signatures in Part 3
- Verify API endpoint format in Part 3
- Test incrementally (one feature at a time)

---

## ✅ Pre-Flight Checklist

Before starting Session 14, ensure:

**Documentation:**
- [ ] All 3 parts saved to `docs/specs/`
- [ ] Master Handover updated
- [ ] README committed to GitHub

**Understanding:**
- [ ] Vision and architecture clear
- [ ] User roles understood
- [ ] Technical requirements known

**Environment:**
- [ ] Protocol running (port 3000)
- [ ] Marketplace running (port 3001)
- [ ] Ready to create logistics app (port 3002)

**Priorities:**
- [ ] Issue #13 fix planned
- [ ] Issue #16 SDK methods listed
- [ ] Issue #17 routes documented

**Ready to build!** 🚀

---

**Last Updated:** December 11, 2025  
**Created By:** AI Assistant (Session 13)  
**For:** Rangkai Protocol Team  
**Status:** Specifications Complete ✅