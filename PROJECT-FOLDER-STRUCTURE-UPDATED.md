# 📁 PROJECT FOLDER STRUCTURE & DEPLOYMENT GUIDE (UPDATED)
## spreadloveandacceptance.com — Complete File Organization

**Last Updated:** 2026-09-19 (WITH NEW DELIVERABLES)  
**Project Root:** spreadloveandacceptance.com/

---

## 🗂️ COMPLETE FOLDER STRUCTURE (UPDATED)

```
spreadloveandacceptance.com/
│
├── 📄 index.html                           [MAIN PAGE - UPDATED]
├── 📄 roadmap.html                         [CONTENT ROADMAP]
├── 📄 program-overview.html                [PROGRAM EXPLANATION]
├── 📄 podcast-index.html                   [PODCAST INDEX]
├── 📄 suite-index.html                     [INSTRUMENT SUITE INDEX]
├── 📄 telemetry.html                       [ROLLOUT STATUS]
├── 📄 echoes-of-gold.html                  [COMPANION ALBUM]
├── 📄 soundscapes.html                     [AUDIO CATALOG]
├── 📄 infographic.html                     [EXECUTIVE SUMMARY]
├── 📄 calc01-solvency.html                 [SOLVENCY CALCULATOR]
├── 📄 wp-01.html                           [WORKPAPER 1 - FIELD AUDIT]
├── 📄 wp-02-The-Battery-__Stress-Meter.html [WORKPAPER 2 - BATTERY METER]
├── 📄 prog-01.html                         [PROGRAM 1 - 6-WEEK CURRICULUM]
├── 📄 report-01.html                       [REPORT 1 - CROSS-INSTRUMENT FINDINGS]
│
├── 📁 snapshot/                            [NEW - DIAGNOSTIC ASSESSMENT]
│   ├── 📄 index.html                       [Snapshot Landing Page]
│   └── 📄 diagnostic-snapshot-interactive.html [Interactive Assessment Tool]
│
├── 📁 learn/                               [NEW - EDUCATIONAL CONTENT]
│   ├── 📄 index.html                       [Learning Hub Landing Page]
│   └── 📁 marco-yuki/
│       └── 📄 index.html                   [Case Study - Marco & Yuki Journey]
│
├── 📁 do/                                  [NEW - INTERACTIVE TOOLS]
│   ├── 📄 index.html                       [Try It Out Landing Page]
│   └── 📄 workpaper-playground.html        [Interactive Workpaper Sandbox]
│
├── 📁 architecture/                        [NEW - SYSTEM DESIGN]
│   ├── 📄 index.html                       [Architecture Hub Landing Page]
│   └── 📄 review.html                      [Interactive Architecture Review]
│
├── 📁 reference/                           [NEW - DOCUMENTATION & RESOURCES]
│   ├── 📄 index.html                       [Reference Materials Hub]
│   ├── 📄 diagnostic-framework.html        [Snapshot Logic & Templates (from MD)]
│   ├── 📄 carrier-wave-decoder.html        [Production Roadmap (from MD)]
│   └── 📄 tol-os-strategy.html             [Master Implementation Guide (from MD)]
│
├── 📁 legal/
│   ├── 📄 terms-of-service.html
│   ├── 📄 privacy-policy.html
│   └── 📄 refund-policy.html
│
└── 📁 assets/
    ├── 📁 css/
    │   └── 📄 book-layout.css
    ├── 📁 js/
    │   └── 📄 lemonade-calc.js
    └── 📁 audio/
        └── 📁 soundscapes/
            └── 🎵 the-breath-beneath.mp4
```

---

## 📊 FILE DEPLOYMENT MAP (UPDATED)

### **TIER 1: ROOT LEVEL** (Deploy These First)

| File | Type | GA | Navigation | Dependencies |
|------|------|----|-----------|----|
| index.html | HTML | ✅ | Sidebar + Footer | UPDATED: new "Explore & Discover" section |
| roadmap.html | HTML | ✅ | Sidebar + Footer | book-layout.css |
| program-overview.html | HTML | ✅ | Sidebar + Footer | book-layout.css |
| podcast-index.html | HTML | ✅ | Sidebar + Footer | book-layout.css |
| suite-index.html | HTML | ✅ | Sidebar + Footer | book-layout.css |
| telemetry.html | HTML | ✅ | Sidebar + Footer | Inline CSS |
| echoes-of-gold.html | HTML | ✅ | Sidebar + Footer | book-layout.css |
| soundscapes.html | HTML | ✅ | Sidebar + Footer | book-layout.css |
| infographic.html | HTML | ✅ | Sidebar + Footer | book-layout.css |
| calc01-solvency.html | HTML | ✅ | Sidebar + Footer | book-layout.css |
| wp-01.html | HTML | ✅ | Sidebar + Footer | book-layout.css |
| wp-02-The-Battery-__Stress-Meter.html | HTML | ✅ | Sidebar + Footer | book-layout.css |
| prog-01.html | HTML | ✅ | Sidebar + Footer | book-layout.css |
| report-01.html | HTML | ✅ | Sidebar + Footer | book-layout.css |

**Deployment Path:** `/` (root)  
**Total Files:** 14 HTML

---

### **TIER 1B: NEW SECTIONS (Deploy After Root)**

#### **/snapshot/** — Diagnostic Assessment Tools

| File | Full Path | GA | Purpose |
|------|-----------|----|----|
| index.html | `/snapshot/index.html` | ✅ | Landing page for diagnostic snapshot |
| diagnostic-snapshot-interactive.html | `/snapshot/diagnostic-snapshot-interactive.html` | ✅ | Interactive 2-minute assessment tool |

**Deployment Path:** `/snapshot/`  
**Total Files:** 2 HTML

---

#### **/learn/** — Educational Content & Case Studies

| File | Full Path | GA | Purpose |
|------|-----------|----|----|
| index.html | `/learn/index.html` | ✅ | Learning hub landing page |
| marco-yuki/index.html | `/learn/marco-yuki/index.html` | ✅ | Marco & Yuki case study (published from MD) |

**Deployment Path:** `/learn/` (with subdirectory `/learn/marco-yuki/`)  
**Total Files:** 2 HTML

---

#### **/do/** — Interactive Playgrounds

| File | Full Path | GA | Purpose |
|------|-----------|----|----|
| index.html | `/do/index.html` | ✅ | Try It Out landing page |
| workpaper-playground.html | `/do/workpaper-playground.html` | ✅ | Interactive sandbox for testing workpapers |

**Deployment Path:** `/do/`  
**Total Files:** 2 HTML

---

#### **/architecture/** — System Design & Transparency

| File | Full Path | GA | Purpose |
|------|-----------|----|----|
| index.html | `/architecture/index.html` | ✅ | Architecture hub landing page |
| review.html | `/architecture/review.html` | ✅ | Interactive architectural review (7 collapsible sections) |

**Deployment Path:** `/architecture/`  
**Total Files:** 2 HTML

---

#### **/reference/** — Documentation & Resources

| File | Full Path | GA | Purpose |
|------|-----------|----|----|
| index.html | `/reference/index.html` | ✅ | Reference materials hub |
| diagnostic-framework.html | `/reference/diagnostic-framework.html` | ❌ | Snapshot logic & templates (published from MD) |
| carrier-wave-decoder.html | `/reference/carrier-wave-decoder.html` | ❌ | Production roadmap (published from MD) |
| tol-os-strategy.html | `/reference/tol-os-strategy.html` | ❌ | Master implementation guide (published from MD) |

**Deployment Path:** `/reference/`  
**Total Files:** 4 HTML (3 reference docs)

---

### **TIER 2: LEGAL SUBDIRECTORY**

| File | Full Path | GA | Status |
|------|-----------|----|----|
| terms-of-service.html | `/legal/terms-of-service.html` | ✅ | Live |
| privacy-policy.html | `/legal/privacy-policy.html` | ✅ | Live |
| refund-policy.html | `/legal/refund-policy.html` | ✅ | Live |

**Deployment Path:** `/legal/`  
**Total Files:** 3 HTML

---

### **TIER 3: ASSETS**

#### **CSS**
| File | Full Path | Purpose | Used By |
|------|-----------|---------|---------|
| book-layout.css | `/assets/css/book-layout.css` | Primary stylesheet | All pages except telemetry.html, inline reference docs |

**Deployment Path:** `/assets/css/`

---

#### **JavaScript**
| File | Full Path | Purpose | Used By |
|------|-----------|---------|---------|
| lemonade-calc.js | `/assets/js/lemonade-calc.js` | Calculator logic | index.html, workpaper-playground.html |

**Deployment Path:** `/assets/js/`

---

#### **Audio**
| File | Full Path | Purpose | Used By |
|------|-----------|---------|---------|
| the-breath-beneath.mp4 | `/assets/audio/soundscapes/the-breath-beneath.mp4` | Existing soundscape | soundscapes.html |

**Deployment Path:** `/assets/audio/soundscapes/`

---

## 📋 **NEW FOLDERS CREATED (5 Total)**

```
/snapshot/
  Purpose: Diagnostic assessment entry point
  Contents: Landing + interactive tool
  GA Tracking: YES (both files)

/learn/
  Purpose: Educational content & case studies
  Contents: Landing + case study subdirectory
  GA Tracking: YES (both files)
  Subdirectories: /marco-yuki/

/do/
  Purpose: Interactive sandboxes to try the system
  Contents: Landing + workpaper playground
  GA Tracking: YES (both files)

/architecture/
  Purpose: System design transparency & credibility
  Contents: Landing + interactive review
  GA Tracking: YES (both files)

/reference/
  Purpose: Documentation, guides, production briefs
  Contents: Landing + 3 reference documents
  GA Tracking: Landing page YES, reference docs NO
```

---

## 🔗 **CROSS-FILE LINK MAP (UPDATED)**

### **index.html LINKS TO:** (Updated with new sections)
- roadmap.html
- program-overview.html
- infographic.html
- soundscapes.html
- echoes-of-gold.html
- podcast-index.html
- suite-index.html
- telemetry.html
- **/snapshot/index.html** ✨ NEW
- **/snapshot/diagnostic-snapshot-interactive.html** ✨ NEW
- **/learn/index.html** ✨ NEW
- **/do/index.html** ✨ NEW
- **/architecture/index.html** ✨ NEW
- **/reference/index.html** ✨ NEW
- legal/terms-of-service.html
- legal/privacy-policy.html
- legal/refund-policy.html

### **snapshot/index.html LINKS TO:**
- index.html (back link)
- /snapshot/diagnostic-snapshot-interactive.html
- /learn/marco-yuki/index.html (next step)
- /do/workpaper-playground.html (next step)

### **snapshot/diagnostic-snapshot-interactive.html LINKS TO:**
- index.html (back/home)
- /learn/marco-yuki/index.html (CTA: Case Study)
- /do/workpaper-playground.html (CTA: Try It)
- /architecture/index.html (CTA: Learn How)

### **/learn/index.html LINKS TO:**
- index.html (back)
- /learn/marco-yuki/index.html
- /snapshot/index.html

### **/learn/marco-yuki/index.html LINKS TO:**
- index.html (back)
- /learn/index.html (back)
- /snapshot/diagnostic-snapshot-interactive.html
- /do/workpaper-playground.html

### **/do/index.html LINKS TO:**
- index.html (back)
- /do/workpaper-playground.html
- /snapshot/diagnostic-snapshot-interactive.html (back/previous)

### **/do/workpaper-playground.html LINKS TO:**
- index.html (back/home)
- /snapshot/diagnostic-snapshot-interactive.html
- /architecture/index.html (next step)

### **/architecture/index.html LINKS TO:**
- index.html (back)
- /architecture/review.html
- /reference/index.html

### **/architecture/review.html LINKS TO:**
- index.html (back/home)
- /do/workpaper-playground.html (previous)
- /reference/index.html

### **/reference/index.html LINKS TO:**
- index.html (back)
- /reference/diagnostic-framework.html
- /reference/carrier-wave-decoder.html
- /reference/tol-os-strategy.html
- /architecture/index.html

---

## 📊 **FILE SUMMARY**

**Total Files in Project:** 40+

Breakdown:
- **Original Root HTML:** 14
- **Original Legal Subdirectory:** 3
- **New Section Pages:** 11 (5 sections × 2-3 files each)
- **Assets:** 3 (CSS, JS, Audio)
- **Documentation Files:** 7

**GA Tracked Files:** 24 HTML files  
**Non-GA Files:** 7 reference/documentation files

---

## 🎯 **DEPLOYMENT SEQUENCE**

### **STEP 1: Update Core Pages (ROOT LEVEL)**
Deploy in this order:
1. index.html ← CRITICAL (contains nav to all new sections)
2. roadmap.html (optional update - add architecture link)
3. All other original root pages (no changes, but verify GA)

### **STEP 2: Create New Section Folders & Files**
Deploy in this order:
1. `/snapshot/` folder + 2 files
2. `/learn/` folder + 2 files (create `/learn/marco-yuki/` subfolder)
3. `/do/` folder + 2 files
4. `/architecture/` folder + 2 files
5. `/reference/` folder + 4 files

### **STEP 3: Verify All Cross-Links**
1. Test every link in new pages
2. Verify back-to-home links work
3. Test mobile navigation
4. Check GA tracking fires

### **STEP 4: Assets (No Changes)**
- `/assets/css/book-layout.css` (no update needed)
- `/assets/js/lemonade-calc.js` (no update needed)
- `/assets/audio/soundscapes/` (no update needed)

---

## ✅ **DEPLOYMENT CHECKLIST**

**Pre-Deployment:**
- [ ] All GA tracking verified (G-NKC6CQ9S66)
- [ ] All cross-links tested
- [ ] CSS variables consistent
- [ ] Responsive design checked (mobile, tablet, desktop)
- [ ] No broken relative paths

**Deployment:**
- [ ] Upload index.html to `/`
- [ ] Create `/snapshot/` folder and upload 2 files
- [ ] Create `/learn/` and `/learn/marco-yuki/` folders, upload files
- [ ] Create `/do/` folder and upload 2 files
- [ ] Create `/architecture/` folder and upload 2 files
- [ ] Create `/reference/` folder and upload 4 files
- [ ] Verify all folders exist on server

**Post-Deployment Testing:**
- [ ] Navigate to index.html — loads completely
- [ ] Click each new section link → loads correctly
- [ ] Check browser console — GA tracking fires
- [ ] Test on mobile (375px+) — responsive layout works
- [ ] Verify all footer links work
- [ ] Test interactive elements (snapshot, playground, architecture)
- [ ] Verify all cross-links between sections
- [ ] Check relative paths (images, CSS loading)

---

## 📝 **FUTURE ENHANCEMENT REFERENCE**

**When making future updates, remember the 5 new sections:**

1. **/snapshot/** — Diagnostic entry point (2 files)
2. **/learn/** — Case studies & educational content (2-3 files)
3. **/do/** — Interactive tools & sandboxes (2+ files)
4. **/architecture/** — System design & transparency (2 files)
5. **/reference/** — Documentation & production briefs (3-4 files)

**Any enhancement that affects these sections requires updating all related cross-links.**

---

**This document is your deployment reference guide — UPDATED with 5 new sections.**  
**All future enhancements will build on this structure.**

