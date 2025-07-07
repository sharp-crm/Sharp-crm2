# Sharp CRM Backend

A comprehensive Node.js/TypeScript backend for the Sharp CRM application, built with Express.js and AWS DynamoDB.

## Features

### 🔐 Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (Admin, Sales Manager, Sales Rep)
- User profile management
- Password change functionality

### 📊 Core CRM Modules
- **Users Management**: User creation, updates, soft deletion, role-based permissions
- **Contacts**: Full CRUD operations for contact management
- **Leads**: Lead tracking with status progression
- **Deals**: Sales pipeline management with stages and probability tracking
- **Tasks**: Task management with priorities, types, and assignments
- **Accounts**: Company/account management separate from subsidiaries
- **Subsidiaries**: Corporate subsidiary tracking
- **Dealers**: Dealer/partner management

### 📈 Analytics & Reporting
- **Dashboard Analytics**: KPIs, revenue trends, conversion rates
- **Lead Analytics**: Source analysis, status distribution, conversion metrics
- **Deal Insights**: Pipeline analysis, win rates, sales cycle tracking
- **Activity Statistics**: Task completion rates, team performance
- **Custom Reports**: Configurable reports with filters and scheduling

### 🔔 Advanced Features
- **Notifications**: Real-time notification system with read/unread status
- **Meetings**: Calendar integration with meeting management
- **Reports**: Advanced reporting with sharing and favorites
- **Role-based Permissions**: Granular access control

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: AWS DynamoDB
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **AWS SDK**: @aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb
- **CORS**: cors middleware
- **Environment**: dotenv

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- AWS Account with DynamoDB access OR DynamoDB Local
- Git

### 1. Clone and Install
```bash
git clone <repository-url>
cd backend
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5173

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# AWS Configuration
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key

# For local development with DynamoDB Local
DYNAMODB_ENDPOINT=http://localhost:8000
```

### 3. Database Setup
```bash
# Initialize DynamoDB tables
npm run init-db

# Or run with development server
npm run dev:init
```

### 4. Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /refresh` - Refresh access token
- `GET /profile` - Get current user profile
- `PUT /profile` - Update user profile
- `PUT /change-password` - Change password

### Users (`/api/users`)
- `GET /` - Get all users (Admin only)
- `GET /tenant-users` - Get users from same domain
- `GET /:id` - Get user by ID
- `POST /` - Create new user (Admin only)
- `PUT /:id` - Update user
- `PUT /:id/soft-delete` - Soft delete user (Admin only)
- `GET /profile/me` - Get current user profile

### Contacts (`/api/contacts`)
- `GET /` - Get all contacts
- `GET /:id` - Get contact by ID
- `POST /` - Create new contact
- `PUT /:id` - Update contact
- `DELETE /:id` - Delete contact

### Leads (`/api/leads`)
- `GET /` - Get all leads
- `GET /:id` - Get lead by ID
- `POST /` - Create new lead
- `PUT /:id` - Update lead
- `DELETE /:id` - Delete lead

### Deals (`/api/deals`)
- `GET /` - Get all deals
- `GET /:id` - Get deal by ID
- `POST /` - Create new deal
- `PUT /:id` - Update deal
- `DELETE /:id` - Delete deal

### Tasks (`/api/tasks`)
- `GET /` - Get all tasks
- `GET /:id` - Get task by ID
- `POST /` - Create new task
- `PUT /:id` - Update task
- `DELETE /:id` - Delete task

### Analytics (`/api/analytics`)
- `GET /overview` - Dashboard overview metrics
- `GET /leads` - Lead analytics
- `GET /deals` - Deal insights
- `GET /activity` - Activity statistics
- `GET /team` - Team performance

### Notifications (`/api/notifications`)
- `GET /` - Get user notifications
- `GET /:id` - Get notification by ID
- `POST /` - Create notification
- `PATCH /:id/read` - Mark as read
- `PATCH /mark-all-read` - Mark all as read
- `DELETE /:id` - Delete notification
- `GET /counts/summary` - Get notification counts

### Meetings (`/api/meetings`)
- `GET /` - Get user meetings
- `GET /:id` - Get meeting by ID
- `POST /` - Create meeting
- `PUT /:id` - Update meeting
- `DELETE /:id` - Delete meeting
- `PATCH /:id/cancel` - Cancel meeting
- `GET /calendar/events` - Get calendar events
- `GET /upcoming` - Get upcoming meetings

### Reports (`/api/reports`)
- `GET /` - Get user reports
- `GET /:id` - Get report by ID
- `POST /` - Create report
- `PUT /:id` - Update report
- `DELETE /:id` - Delete report
- `POST /:id/run` - Run report
- `PATCH /:id/favorite` - Toggle favorite
- `GET /favorites/list` - Get favorite reports
- `GET /scheduled/list` - Get scheduled reports
- `POST /:id/share` - Share report

## Database Schema

### Tables
- **Users**: User accounts with authentication and profile data
- **Contacts**: Customer contact information
- **Leads**: Sales leads with tracking and conversion
- **Deals**: Sales opportunities with pipeline stages
- **Tasks**: Task management with assignments and priorities
- **Accounts**: Company/account master data
- **Subsidiaries**: Corporate subsidiaries
- **Dealers**: Partner/dealer information
- **Notifications**: User notification system
- **Meetings**: Calendar and meeting management
- **Reports**: Custom report configurations

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- CORS protection
- Error handling middleware
- Request logging

## Development Guidelines

### Code Structure
```
src/
├── routes/          # API route handlers
├── middlewares/     # Express middlewares
├── services/        # Business logic and external services
├── utils/           # Utility functions and helpers
├── app.ts           # Express app configuration
└── server.ts        # Server entry point
```

### Error Handling
- All routes use proper error handling middleware
- DynamoDB errors are properly caught and transformed
- Consistent error response format

### Authentication Flow
1. User registers/logs in with credentials
2. Server returns JWT access token + refresh token
3. Client includes access token in Authorization header
4. Server validates token on protected routes
5. Client can refresh tokens when they expire

## Deployment

### AWS Deployment
1. Set up DynamoDB tables in AWS
2. Configure IAM roles with DynamoDB permissions
3. Deploy to EC2, ECS, or Lambda
4. Set environment variables for production

### Environment Variables for Production
```env
NODE_ENV=production
JWT_SECRET=strong-production-secret
AWS_REGION=your-aws-region
# Remove DYNAMODB_ENDPOINT for production
```

## Contributing

1. Follow TypeScript best practices
2. Add proper error handling for new routes
3. Include input validation
4. Update this README for new features
5. Test all endpoints before submitting

## License

[Your License Here] 