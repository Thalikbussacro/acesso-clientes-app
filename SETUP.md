# Client Access Management Application - Development Plan

## Project Overview
Web application for managing client access information for a software support company. Secure, multi-user system to organize access credentials and support documentation for ~300 clients, with future SaaS capabilities.

# CLAUDE CODE WORKFLOW - READ FIRST

## How to Use This Development Plan

### Step-by-Step Process
1. **Check Current Progress**: Look at git history to see last completed sub-stage
2. **Continue from Next Sub-stage**: Start with the next uncompleted checkpoint
3. **Implement**: Complete all tasks in the current sub-stage
4. **Test Functionality**: Run tests and verify everything works before committing
5. **Commit Changes**: Use the exact commit message provided
6. **Mark as Complete**: Check off the sub-stage checkbox
7. **Ask User**: "Sub-stage X.X completed and tested. Ready to continue to X.Y?"
8. **Wait for Confirmation**: Get user approval before proceeding to next sub-stage

### Mandatory Testing Before Each Commit
- **Compilation Test**: Ensure `npm run build` succeeds
- **Development Server**: Verify `npm run dev` starts without errors
- **Functional Test**: Test the specific feature implemented in current sub-stage
- **Integration Test**: Verify new feature doesn't break existing functionality
- **Only commit if ALL tests pass**

## Git Workflow & Commit Strategy

### Mandatory Commit Practice
- **ALWAYS commit after completing each sub-stage** (e.g., 1.1 → 1.2)
- **ALWAYS test functionality before committing**
- Use the exact commit message provided in each sub-stage
- Create commits even for configuration changes
- Never skip commits between numbered steps

### Commit Message Pattern
```
feat(1.1): initial Next.js 15 project setup with TypeScript
feat(1.2): configure database connection and Prisma setup  
feat(1.3): create complete database schema and run migrations
feat(2.1): add core shadcn/ui components for authentication
feat(2.3): implement login page with form validation
```

### Branch Strategy
- `main` branch for production-ready code
- Work directly on `main` for this MVP project
- Use feature branches only for experimental features

## Technology Stack

### Frontend
- **Next.js 15** with App Router
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** components
- **Quill.js** for rich text editing
- **React Hook Form + Zod** for form validation
- **TanStack Table** for data tables

### Backend
- **Next.js API Routes**
- **Prisma ORM**
- **PostgreSQL** (Neon - 3GB free tier)

### Deployment
- **Vercel** (free hobby plan)
- **GitHub** for version control

### Security Features
- **JWT** authentication
- **Multi-tier password system**
- **Session timeout with cleanup**
- **Base64 image storage in database**
- **Audit trail with versioning**

---

## Development Stages

## Stage 1: Project Foundation

### 1.1 Initial Project Setup
- [x] Create new Next.js 15 project with TypeScript using `npx create-next-app@latest`
- [x] Configure Tailwind CSS
- [x] Initialize shadcn/ui with `npx shadcn-ui@latest init`
- [x] Create basic folder structure (`/src/app`, `/src/components`, `/src/lib`)
- [x] Setup ESLint and Prettier configuration
- [x] Initialize Git repository
- [x] **COMMIT: `feat(1.1): initial Next.js 15 project setup with TypeScript and Tailwind`**

### 1.2 Database Setup
- [x] Create Neon PostgreSQL account and database
- [x] Install Prisma: `npm install prisma @prisma/client`
- [x] Initialize Prisma: `npx prisma init`
- [x] Configure DATABASE_URL in `.env.local`
- [x] Create initial Prisma schema file
- [x] **COMMIT: `feat(1.2): configure database connection and Prisma setup`**

### 1.3 Database Schema Design
- [x] Create `users` table schema (id, username, password_hash, created_at)
- [x] Create `client_databases` table schema (id, name, password_hash, timeout_minutes, custom_fields, user_id)
- [x] Create `clients` table schema (id, name, database_id, custom_data, last_access, created_at)
- [x] Create `access_points` table schema (id, client_id, name, created_at)
- [x] Create `access_details` table schema (id, access_point_id, content, last_edited_by, last_edited_at)
- [x] Create `access_images` table schema (id, access_point_id, filename, image_data, mime_type, created_at)
- [x] Create `access_details_history` table schema for audit trail
- [x] Run first migration: `npx prisma migrate dev`
- [x] **COMMIT: `feat(1.3): create complete database schema and run migrations`**

### 1.4 Essential Dependencies
- [x] Install authentication: `npm install jsonwebtoken bcryptjs @types/jsonwebtoken @types/bcryptjs`
- [x] Install form handling: `npm install react-hook-form zod @hookform/resolvers`
- [x] Install table: `npm install @tanstack/react-table`
- [x] Install Quill.js: `npm install quill @types/quill`
- [x] Install date handling: `npm install date-fns`
- [x] Install UUID: `npm install uuid @types/uuid`
- [x] **COMMIT: `feat(1.4): install all essential dependencies`**

## Stage 2: Authentication System

### 2.1 Core shadcn/ui Components
- [x] Add button component: `npx shadcn-ui@latest add button`
- [x] Add input component: `npx shadcn-ui@latest add input`
- [x] Add card component: `npx shadcn-ui@latest add card`
- [x] Add form component: `npx shadcn-ui@latest add form`
- [x] Add alert component: `npx shadcn-ui@latest add alert`
- [x] Add toast component: `npx shadcn-ui@latest add toast`
- [x] **COMMIT: `feat(2.1): add core shadcn/ui components for authentication`**

### 2.2 Authentication Utilities
- [x] Create `/src/lib/auth.ts` with JWT token generation functions
- [x] Create `/src/lib/password.ts` with bcrypt hash/compare functions
- [x] Create `/src/lib/db.ts` with Prisma client instance
- [x] Create `/src/lib/utils.ts` for common utilities
- [x] **COMMIT: `feat(2.2): create authentication and database utility functions`**

### 2.3 Login Page
- [x] Create `/src/app/login/page.tsx` with login form
- [x] Implement login form validation with Zod schema
- [x] Style login form with shadcn/ui Card and Input components
- [x] Add form error handling and display
- [x] Create responsive layout for login page
- [x] **COMMIT: `feat(2.3): implement login page with form validation`**

### 2.4 Authentication API
- [x] Create `/src/app/api/auth/login/route.ts` for login endpoint
- [x] Implement user authentication logic
- [x] Return JWT token on successful login
- [x] Handle authentication errors
- [x] Create `/src/app/api/auth/logout/route.ts` for logout endpoint
- [x] **COMMIT: `feat(2.4): create authentication API endpoints`**

### 2.5 Middleware Setup
- [x] Create `/src/middleware.ts` for route protection
- [x] Implement JWT token validation
- [x] Redirect unauthenticated users to login
- [x] Allow public access to login page only
- [x] Test middleware with protected routes
- [x] **COMMIT: `feat(2.5): implement authentication middleware and route protection`**

## Stage 3: Client Database Management

### 3.1 Additional shadcn/ui Components ✅
- [x] Add dialog component: `npx shadcn@latest add dialog`
- [x] Add separator component: `npx shadcn@latest add separator`
- [x] Add badge component: `npx shadcn@latest add badge`
- [x] Add progress component: `npx shadcn@latest add progress`
- [x] **COMMIT: `feat(3.1): add additional shadcn/ui components for database management`**

### 3.2 Client Databases Page ✅
- [x] Create `/src/app/databases/page.tsx` layout
- [x] Implement grid layout for database cards
- [x] Create "Add New Database" button with dialog
- [x] Display existing databases with names and metadata
- [x] Add click handlers for database selection
- [x] **COMMIT: `feat(3.2): create client databases page with grid layout`**

### 3.3 Database Creation Dialog ✅
- [x] Create database creation form with React Hook Form
- [x] Add form fields: name, password, timeout_minutes
- [x] Implement dynamic custom fields addition/removal
- [x] Add form validation with Zod schema
- [x] Style form with shadcn/ui components
- [x] **COMMIT: `feat(3.3): implement database creation dialog with custom fields`**

### 3.4 Database Management API ✅
- [x] Create `/src/app/api/databases/route.ts` for CRUD operations
- [x] Implement POST endpoint for database creation
- [x] Implement GET endpoint for listing user's databases
- [x] Implement PUT endpoint for database updates
- [x] Implement DELETE endpoint for database removal
- [x] Add password hashing for database passwords
- [x] **COMMIT: `feat(3.4): create database management API endpoints`**

### 3.5 Custom Fields System ✅
- [x] Create `/src/components/custom-fields-editor.tsx`
- [x] Implement add/remove custom field functionality
- [x] Add field type selection (text, number, date, etc.)
- [x] Store custom fields as JSON in database
- [x] Create validation for custom field names
- [x] **COMMIT: `feat(3.5): implement custom fields system for client databases`**

## Stage 4: Database Access & Session Management

### 4.1 Session Management Components ✅
- [x] Add sheet component: `npx shadcn-ui@latest add sheet`
- [x] Add tabs component: `npx shadcn-ui@latest add tabs`
- [x] Add avatar component: `npx shadcn-ui@latest add avatar`
- [x] **COMMIT: `feat(4.1): add session management shadcn/ui components`**

### 4.2 Database Password Validation ✅
- [x] Create `/src/app/databases/[id]/page.tsx` for database access
- [x] Implement password prompt dialog
- [x] Create database password validation API endpoint
- [x] Handle correct password → redirect to client list
- [x] Handle incorrect password → show error message
- [x] **COMMIT: `feat(4.2): implement database password validation system`**

### 4.3 Session Timer System ✅
- [x] Create `/src/components/session-timer.tsx` component
- [x] Implement countdown timer with configurable timeout
- [x] Create BroadcastChannel for cross-tab synchronization
- [x] Store session start time and timeout duration
- [x] Update timer display in real-time
- [x] **COMMIT: `feat(4.3): create session timer with cross-tab synchronization`**

### 4.4 Session Revalidation Modal ✅
- [x] Create revalidation modal component
- [x] Trigger modal when 1 minute remaining
- [x] Implement password re-entry form
- [x] Add 60-second countdown in modal
- [x] Handle successful revalidation → restart timer
- [x] Handle timeout → force logout
- [x] **COMMIT: `feat(4.4): implement session revalidation modal`**

### 4.5 Session Cleanup System ✅
- [x] Create `/src/lib/session-cleanup.ts` utility
- [x] Implement DOM cleanup (clear all Quill editors)
- [x] Clear React Query cache
- [x] Clear localStorage and sessionStorage
- [x] Clear Service Worker caches
- [x] Force garbage collection if available
- [x] Redirect to login page after cleanup
- [x] **COMMIT: `feat(4.5): create comprehensive session cleanup system`**

## Stage 5: Client Management

### 5.1 Data Table Setup
- [x] Add data-table component: `npx shadcn-ui@latest add data-table`
- [x] Create `/src/components/clients-table.tsx`
- [x] Configure TanStack Table with basic columns
- [x] Implement sorting functionality
- [x] Add search/filter input field
- [x] **COMMIT: `feat(5.1): setup data table component with TanStack Table`**

### 5.2 Client List Page
- [x] Create `/src/app/clients/[databaseId]/page.tsx`
- [x] Display database name and metadata in header
- [x] Render clients table with static columns
- [x] Add dynamic columns based on custom fields
- [x] Implement client selection → navigate to details
- [x] **COMMIT: `feat(5.2): create client list page with dynamic columns`**

### 5.3 Client Management API
- [x] Create `/src/app/api/clients/route.ts`
- [x] Implement GET endpoint for listing clients
- [x] Implement POST endpoint for creating clients
- [x] Implement PUT endpoint for updating clients
- [x] Handle custom field data storage as JSON
- [x] Update last_access timestamp on client view
- [x] **COMMIT: `feat(5.3): create client management API endpoints`**

### 5.4 Client CRUD Operations
- [x] Create "Add Client" dialog
- [x] Generate form fields based on custom fields
- [x] Implement client creation with validation
- [x] Add client deletion functionality
- [x] Add client editing capabilities
- [x] **COMMIT: `feat(5.4): implement client CRUD operations with custom fields`**

### 5.5 Search and Filtering ✅
- [x] Implement client name search functionality
- [x] Add filtering by custom field values
- [x] Create filter dropdown for each custom field
- [x] Add clear all filters button
- [x] Persist filter state in URL parameters
- [x] **COMMIT: `feat(5.5): implement client search and filtering system`**

## Stage 6: Access Points Management

### 6.1 Client Details Layout ✅
- [x] Create `/src/app/clients/[databaseId]/[clientId]/page.tsx`
- [x] Design two-column layout (access points left, details right)
- [x] Create client header with key information
- [x] Style layout with shadcn/ui components
- [x] Add responsive design for mobile
- [x] **COMMIT: `feat(6.1): create client details layout with two-column design`**

### 6.2 Access Points Sidebar ✅
- [x] Create `/src/components/access-points-list.tsx`
- [x] Display list of access points for current client
- [x] Add "New Access Point" button
- [x] Implement access point selection state
- [x] Style selected state with different background
- [x] **COMMIT: `feat(6.2): implement access points sidebar with selection`**

### 6.3 Access Point CRUD ✅
- [x] Create access point creation dialog
- [x] Implement access point naming functionality
- [x] Add access point deletion with confirmation
- [x] Add access point renaming capability
- [x] Create API endpoints for access point operations
- [x] **COMMIT: `feat(6.3): implement access point CRUD operations`**

### 6.4 Access Point API ✅
- [x] Create `/src/app/api/access-points/route.ts`
- [x] Implement CRUD endpoints for access points
- [x] Add validation for access point names
- [x] Handle client_id association
- [x] Return access points ordered by creation date
- [x] **COMMIT: `feat(6.4): create access point management API`**

## Stage 7: Rich Text Editor Integration

### 7.1 Quill.js Setup ✅
- [x] Create `/src/components/rich-editor.tsx`
- [x] Configure Quill with custom toolbar
- [x] Setup toolbar options: bold, italic, underline, colors, fonts, lists
- [x] Implement read-only and edit modes
- [x] Style Quill editor to match shadcn/ui theme
- [x] **COMMIT: `feat(7.1): setup Quill.js rich text editor with custom toolbar`**

### 7.2 Editor State Management
- [ ] Implement Edit/Save/Cancel button states
- [ ] Store original content for cancel functionality
- [ ] Add dirty state detection for unsaved changes
- [ ] Implement auto-save prevention (manual save only)
- [ ] Add confirmation dialog for unsaved changes
- [ ] **COMMIT: `feat(7.2): implement editor state management with manual save`**

### 7.3 Access Details API
- [ ] Create `/src/app/api/access-details/route.ts`
- [ ] Implement GET endpoint for fetching details
- [ ] Implement PUT endpoint for saving content
- [ ] Add user_id tracking for last_edited_by
- [ ] Update last_edited_at timestamp on save
- [ ] **COMMIT: `feat(7.3): create access details API with user tracking`**

### 7.4 Security Implementation
- [ ] Implement content sanitization for XSS prevention
- [ ] Add content length limits
- [ ] Validate HTML content on server side
- [ ] Implement content cleanup on session timeout
- [ ] Add editor cleanup in session cleanup function
- [ ] **COMMIT: `feat(7.4): implement security measures for rich text editor`**

## Stage 8: Image Management System

### 8.1 Image Upload Components
- [ ] Create `/src/components/image-uploader.tsx`
- [ ] Implement drag-and-drop file upload
- [ ] Add file type validation (jpg, png, gif)
- [ ] Implement file size limits (2MB max)
- [ ] Convert uploaded images to base64
- [ ] **COMMIT: `feat(8.1): create image upload component with validation`**

### 8.2 Image Carousel
- [ ] Create `/src/components/image-carousel.tsx`
- [ ] Display images in horizontal scrollable layout
- [ ] Implement image navigation (prev/next buttons)
- [ ] Add image zoom/preview modal
- [ ] Include image deletion functionality
- [ ] **COMMIT: `feat(8.2): implement image carousel with navigation and preview`**

### 8.3 Image Storage System
- [ ] Implement base64 image storage in database
- [ ] Create image compression before storage
- [ ] Add image metadata storage (filename, mime_type, file_size)
- [ ] Implement image retrieval with proper MIME headers
- [ ] Add image cleanup for deleted access points
- [ ] **COMMIT: `feat(8.3): implement secure base64 image storage system`**

### 8.4 Image API Endpoints
- [ ] Create `/src/app/api/images/route.ts`
- [ ] Implement POST endpoint for image upload
- [ ] Implement GET endpoint for image retrieval
- [ ] Implement DELETE endpoint for image removal
- [ ] Add access control for image viewing
- [ ] Optimize image serving with proper caching headers
- [ ] **COMMIT: `feat(8.4): create image management API with access control`**

## Stage 9: Audit Trail & Versioning

### 9.1 History Tracking
- [ ] Create database trigger for access_details_history
- [ ] Implement automatic version incrementing
- [ ] Store complete content snapshots on each edit
- [ ] Track user_id and timestamp for each version
- [ ] Implement history cleanup for old versions (optional)
- [ ] **COMMIT: `feat(9.1): implement audit trail with automatic version tracking`**

### 9.2 Version History UI
- [ ] Create `/src/components/version-history.tsx` placeholder
- [ ] Add "View History" button in access details
- [ ] Display version list with dates and users
- [ ] Implement basic version comparison (placeholder)
- [ ] Style version history with shadcn/ui
- [ ] **COMMIT: `feat(9.2): create version history UI placeholder`**

### 9.3 History API
- [ ] Create `/src/app/api/history/route.ts`
- [ ] Implement GET endpoint for version history
- [ ] Add pagination for large history lists
- [ ] Filter history by date range
- [ ] Include user information in history records
- [ ] **COMMIT: `feat(9.3): create version history API endpoints`**

## Stage 10: User Management

### 10.1 User Registration (Admin Only)
- [ ] Create admin-only user creation functionality
- [ ] Implement user registration form
- [ ] Add user role management (basic/admin)
- [ ] Create user listing page for admins
- [ ] Implement user activation/deactivation
- [ ] **COMMIT: `feat(10.1): implement admin user management system`**

### 10.2 User Profile Management
- [ ] Create user profile page
- [ ] Implement password change functionality
- [ ] Add user activity logging
- [ ] Display user's last login time
- [ ] Create user settings page
- [ ] **COMMIT: `feat(10.2): create user profile and settings management`**

### 10.3 Multi-User Access Control
- [ ] Implement database-level permissions
- [ ] Add user access control to client databases
- [ ] Create sharing permissions between users
- [ ] Implement database owner/collaborator roles
- [ ] Add access logging for audit purposes
- [ ] **COMMIT: `feat(10.3): implement multi-user access control system`**

## Stage 11: Advanced Features

### 11.1 Search System
- [ ] Implement global search across all clients
- [ ] Add search in access details content
- [ ] Create advanced search filters
- [ ] Implement search result highlighting
- [ ] Add search history and suggestions
- [ ] **COMMIT: `feat(11.1): implement global search system`**

### 11.2 Export/Import Functionality
- [ ] Create data export to JSON/CSV
- [ ] Implement selective data export
- [ ] Add data import validation
- [ ] Create backup/restore functionality
- [ ] Implement data migration tools
- [ ] **COMMIT: `feat(11.2): add data export/import functionality`**

### 11.3 Performance Optimizations
- [ ] Implement lazy loading for large client lists
- [ ] Add image loading optimization
- [ ] Optimize database queries with indexing
- [ ] Implement caching for frequently accessed data
- [ ] Add pagination for large datasets
- [ ] **COMMIT: `feat(11.3): implement performance optimizations`**

## Stage 12: Testing & Quality Assurance

### 12.1 Unit Testing Setup
- [ ] Install testing framework (Jest + React Testing Library)
- [ ] Create test utilities and setup files
- [ ] Write tests for authentication functions
- [ ] Test form validation schemas
- [ ] Create database mocking utilities
- [ ] **COMMIT: `feat(12.1): setup unit testing framework and initial tests`**

### 12.2 Integration Testing
- [ ] Test complete user authentication flow
- [ ] Test database creation and access workflow
- [ ] Test client management operations
- [ ] Test access details editing and saving
- [ ] Test image upload and management
- [ ] **COMMIT: `feat(12.2): implement integration tests for core workflows`**

### 12.3 Security Testing
- [ ] Test session timeout functionality
- [ ] Verify data cleanup on logout
- [ ] Test password validation systems
- [ ] Verify access control restrictions
- [ ] Test XSS prevention measures
- [ ] **COMMIT: `feat(12.3): implement security testing suite`**

### 12.4 Performance Testing
- [ ] Test with 300+ client records
- [ ] Load test with 15 simultaneous users
- [ ] Test image loading performance
- [ ] Verify database query performance
- [ ] Test session management under load
- [ ] **COMMIT: `feat(12.4): implement performance testing and benchmarks`**

## Stage 13: Documentation & Deployment

### 13.1 Documentation
- [ ] Create user manual with screenshots
- [ ] Document API endpoints
- [ ] Create installation/setup guide
- [ ] Document security best practices
- [ ] Create troubleshooting guide
- [ ] **COMMIT: `feat(13.1): create comprehensive project documentation`**

### 13.2 Production Deployment
- [ ] Configure production environment variables
- [ ] Setup Vercel deployment from GitHub
- [ ] Configure custom domain (if needed)
- [ ] Setup production database on Neon
- [ ] Implement proper error logging
- [ ] **COMMIT: `feat(13.2): setup production deployment on Vercel`**

### 13.3 Monitoring & Maintenance
- [ ] Setup error tracking (Vercel Analytics)
- [ ] Implement usage analytics
- [ ] Create backup scheduling
- [ ] Setup automated security updates
- [ ] Create maintenance procedures
- [ ] **COMMIT: `feat(13.3): implement monitoring and maintenance systems`**

## Stage 14: SaaS Preparation (Future)

### 14.1 Multi-Tenancy Architecture
- [ ] Design tenant isolation strategy
- [ ] Implement organization/workspace concept
- [ ] Add tenant-specific database schemas
- [ ] Create tenant administration tools
- [ ] Implement usage tracking per tenant
- [ ] **COMMIT: `feat(14.1): implement multi-tenancy architecture for SaaS`**

### 14.2 Subscription Management
- [ ] Research payment processing options
- [ ] Design subscription tiers and limits
- [ ] Implement usage quotas
- [ ] Create billing management interface
- [ ] Add subscription upgrade/downgrade flows
- [ ] **COMMIT: `feat(14.2): create subscription management system`**

### 14.3 API Development
- [ ] Create public API endpoints
- [ ] Implement API authentication (API keys)
- [ ] Add rate limiting
- [ ] Create API documentation
- [ ] Implement webhooks for integrations
- [ ] **COMMIT: `feat(14.3): develop public API with authentication and documentation`**

---

## Development Notes

### Code Organization
- Follow Next.js App Router conventions
- Use TypeScript strictly (no `any` types)
- Implement proper error boundaries
- Use shadcn/ui components consistently
- Follow Prisma naming conventions

### Security Requirements
- Hash all passwords with bcrypt
- Validate all inputs server-side
- Implement CSRF protection
- Use parameterized queries only
- Sanitize all HTML content

### Performance Guidelines
- Implement proper loading states
- Use React.memo for expensive components
- Optimize database queries
- Implement proper caching strategies
- Minimize bundle size

### Testing Strategy
- Write tests for all critical paths
- Mock external dependencies
- Test error scenarios
- Validate security measures
- Performance test with realistic data

This plan provides a comprehensive roadmap for developing the Client Access Management application with clear, actionable steps for each stage of development.