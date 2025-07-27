# nuReader - AI-Powered EPUB Reader

## Vision
Transform reading into an intelligent, beautiful, and immersive experience. nuReader aims to be the most aesthetically pleasing and AI-enhanced EPUB reader, combining Apple's design principles with cutting-edge artificial intelligence.

## Project Overview
nuReader is a Next.js-based EPUB reader that leverages AI to provide intelligent reading insights, beautiful typography, and an exceptional user experience. Built with TypeScript, Tailwind CSS, and powered by Claude AI.

## Current Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **EPUB Processing**: JSZip for manual parsing (epubjs removed)
- **AI Integration**: Claude API (planned)
- **Icons**: react-icons
- **State Management**: React hooks + localStorage

### Core Components
- `EPUBReader.tsx` - Main reader component (1760 lines, extensive features)
- `page.tsx` - Landing page with file upload and AI insights sidebar
- Custom modals for TOC, bookmarks, and search
- Responsive pagination system with glassmorphism design

### 🚨 **CRITICAL ISSUES IDENTIFIED**

#### **Immediate Problems**
1. **Missing CSS Classes**: `control-button` and other classes referenced but not defined
2. **Design System Gaps**: Custom classes mixed with Tailwind causing styling inconsistencies
3. **Untested Functionality**: Complex state management in EPUBReader needs validation
4. **Performance Concerns**: 1760-line component with potential optimization issues

#### **Functional Status**
- ✅ **Builds successfully** - No TypeScript errors
- ✅ **Development server runs** - Basic startup works
- ❓ **EPUB loading** - Needs testing with real files
- ❓ **UI interactions** - Buttons may not work due to missing styles
- ❓ **Reading experience** - Core functionality unverified

## Development Priorities - FOCUSED ON FUNCTIONALITY

### 🚨 **IMMEDIATE FIXES (Week 1)**
- [ ] **Fix missing CSS classes** - Add `control-button` and other missing styles
- [ ] **Test EPUB file loading** - Verify JSZip parsing works with real files
- [ ] **Fix broken UI components** - Ensure all buttons and modals function
- [ ] **Verify navigation works** - Test chapter switching and page turning
- [ ] **Fix responsive layout issues** - Ensure mobile/desktop compatibility

### 🔧 **CORE FUNCTIONALITY (Week 2-3)**
- [ ] **Complete reading interface** - Pagination, scrolling, and chapter navigation
- [ ] **Working bookmark system** - Save/load bookmarks with localStorage
- [ ] **Functional search** - Search across chapters with proper highlighting
- [ ] **Theme switching** - Light/dark/sepia themes working correctly
- [ ] **Settings persistence** - Font size, theme, and preferences saved

### 🎨 **POLISH & STABILITY (Week 4)**
- [ ] **Design system consistency** - Align all components with design tokens
- [ ] **Performance optimization** - Smooth animations and fast loading
- [ ] **Error handling** - Graceful failures and user feedback
- [ ] **Accessibility compliance** - Keyboard navigation and screen readers
- [ ] **Cross-browser testing** - Ensure compatibility

### 🚀 **FUTURE ENHANCEMENTS (Later)**
- [ ] AI Integration with Claude API
- [ ] Text-to-speech capabilities
- [ ] Advanced annotation system
- [ ] Reading analytics and progress tracking
- [ ] Multi-book library management

## Design Philosophy

### Aesthetic Principles
1. **Clarity**: Every element serves the reading experience
2. **Deference**: Content takes center stage, UI fades away
3. **Depth**: Subtle layering creates visual hierarchy
4. **Fluidity**: Smooth transitions and micro-interactions
5. **Intelligence**: AI enhances without overwhelming

### Typography Standards
- Primary: SF Pro / Inter for UI elements
- Reading: Charter / Iowan Old Style for body text
- Monospace: SF Mono / JetBrains Mono for code
- Line height: 1.6-1.8 for optimal readability
- Responsive font scaling based on viewport

### Color System
- Light theme: Warm whites, soft grays, subtle blues
- Dark theme: True blacks, muted grays, accent colors
- Reading themes: Sepia, high contrast, custom options
- Semantic colors for states (error, success, warning)

## Technical Implementation

### EPUB Processing
```typescript
// Current approach: Manual parsing with JSZip
// - Parse container.xml and OPF manifest
// - Extract chapters from spine order
// - Process XHTML content with DOM parsing
// - Handle embedded resources (images, fonts, CSS)
// - Sanitize content with DOMPurify
```

### AI Features Architecture
```typescript
// Planned Claude API integration
interface AIInsight {
  type: 'summary' | 'analysis' | 'explanation' | 'question';
  content: string;
  context: ChapterContext;
  confidence: number;
}

interface ReadingAnalytics {
  readingSpeed: number;
  comprehensionScore: number;
  focusPatterns: TimeSlot[];
  bookmarkRelevance: number[];
}
```

### Performance Considerations
- Lazy loading for chapter content
- Virtual scrolling for large books
- Debounced search and AI requests
- Optimized image handling with base64 caching
- Progressive enhancement for offline reading

## Development Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # ESLint checks
npm run type-check   # TypeScript validation

# Testing (to be added)
npm run test         # Run unit tests
npm run test:e2e     # End-to-end tests
npm run test:visual  # Visual regression tests
```

## API Integration

### Claude AI Endpoints (Planned)
- `/api/ai/summary` - Generate chapter/book summaries
- `/api/ai/insights` - Extract themes and analysis
- `/api/ai/explain` - Explain complex passages
- `/api/ai/questions` - Generate discussion questions

### Data Storage
- Reading progress: localStorage + cloud sync (planned)
- User preferences: localStorage
- AI insights cache: IndexedDB
- Book library: Cloud storage (planned)

## Accessibility Standards
- WCAG 2.1 AA compliance
- Screen reader optimization
- Keyboard navigation support
- High contrast mode
- Font size and spacing controls
- Focus management for modals

## Contributing Guidelines
1. Follow TypeScript strict mode
2. Use Tailwind for all styling
3. Implement proper error boundaries
4. Add comprehensive TypeScript types
5. Test on multiple screen sizes
6. Maintain 90%+ lighthouse scores

## Roadmap Timeline - REALISTIC APPROACH
- **Week 1**: Critical fixes and basic functionality
- **Week 2-3**: Core reading features working properly  
- **Week 4**: Polish and stability improvements
- **Month 2+**: AI integration and advanced features

## Multi-Agent Implementation Strategy

### **Bug Fix Agent**
**Purpose**: Address immediate styling and functionality issues
**Tasks**: 
- Fix missing CSS classes (`control-button`, etc.)
- Resolve design system inconsistencies
- Test and fix broken UI interactions
- Validate EPUB loading functionality

### **Component Testing Agent**  
**Purpose**: Verify all existing features work correctly
**Tasks**:
- Test EPUBReader with real EPUB files
- Validate navigation and pagination
- Verify bookmark and search functionality
- Test responsive design across devices

### **Performance Optimization Agent**
**Purpose**: Improve stability and user experience
**Tasks**:
- Optimize 1760-line EPUBReader component
- Implement proper error boundaries
- Add loading states and user feedback
- Ensure smooth animations and transitions

## Success Metrics
- Reading speed improvement: 15%+
- User engagement time: 40%+ increase
- Comprehension retention: 25%+ improvement
- UI satisfaction score: 9.0/10
- Performance: Core Web Vitals green scores

---

*Built with ❤️ for readers who appreciate beautiful, intelligent software*