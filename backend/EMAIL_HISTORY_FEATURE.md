# Email History Feature Implementation

## Overview
This feature extends the email functionality to store comprehensive email records in the DynamoDB `SharpCRM-EmailHistory-development` table, providing a complete audit trail of all emails sent through the system.

## Features Implemented

### 1. Email Storage
- **Automatic Storage**: Every email sent through the system is automatically stored in the email history table
- **Comprehensive Fields**: Stores from email, to email, subject, content, tenant ID, and additional metadata
- **Status Tracking**: Tracks email status (pending → sent/failed) with timestamps

### 2. Email Record Structure
```typescript
interface EmailRecord {
  id: string;                    // Unique identifier (UUID)
  senderEmail: string;           // From email address
  recipientEmail: string;        // To email address
  subject: string;               // Email subject
  message: string;               // Email content
  messageId?: string;            // AWS SES message ID (if sent successfully)
  status: 'sent' | 'failed' | 'pending';  // Current status
  errorMessage?: string;         // Error details (if failed)
  sentAt: string;                // ISO timestamp when email was sent
  updatedAt?: string;            // ISO timestamp of last update
  userId: string;                // User ID who sent the email
  tenantId?: string;             // Tenant ID for multi-tenancy
  metadata?: {                   // Additional context
    ipAddress?: string;          // IP address of sender
    userAgent?: string;          // User agent string
    campaignId?: string;         // Campaign identifier (future use)
    dealId?: string;             // Associated deal (future use)
    contactId?: string;          // Associated contact (future use)
  };
}
```

### 3. API Endpoints Enhanced

#### GET `/api/email/history`
- Returns paginated email history for the authenticated user
- Supports filtering by status, date range, and other criteria
- Includes pagination with nextToken support

#### GET `/api/email/history/:id`
- Returns specific email record by ID
- Includes access control (users can only view their own emails)
- Returns full email details including metadata

### 4. DynamoDB Table Structure
The `SharpCRM-EmailHistory-development` table includes:

- **Primary Key**: `id` (String)
- **Global Secondary Indexes**:
  - `UserIdIndex`: For querying emails by user (userId + sentAt)
  - `SenderEmailIndex`: For querying emails by sender (senderEmail + sentAt)
  - `RecipientEmailIndex`: For querying emails by recipient (recipientEmail + sentAt)

## Implementation Details

### Email Service Integration
- Modified `EmailService.sendEmail()` to automatically create email records
- Records are created with 'pending' status before sending
- Status is updated to 'sent' on success or 'failed' on error
- Includes comprehensive error handling and status updates

### Email History Model
- `EmailHistoryModel` class provides CRUD operations for email records
- Supports complex queries with filtering and pagination
- Handles DynamoDB operations efficiently with proper error handling

### Security & Access Control
- Email records are tied to specific users and tenants
- Users can only access their own email records
- Tenant isolation ensures multi-tenant security

## Usage Examples

### Sending an Email (Automatic Storage)
```typescript
// Email is automatically stored when sent
const result = await emailService.sendEmail(req, {
  to: 'recipient@example.com',
  subject: 'Test Subject',
  message: 'Test message content'
});
```

### Querying Email History
```typescript
// Get user's email history
const history = await emailHistoryModel.queryEmailHistory({
  userId: 'user-123',
  status: 'sent',
  limit: 50
});

// Get specific email record
const email = await emailHistoryModel.getEmailRecord('email-id-123');
```

## Benefits

1. **Audit Trail**: Complete record of all emails sent through the system
2. **Compliance**: Helps meet regulatory requirements for email communication
3. **Debugging**: Easy troubleshooting of email delivery issues
4. **Analytics**: Foundation for email analytics and reporting
5. **Multi-tenancy**: Proper isolation between different tenant organizations

## Future Enhancements

- Email templates and campaign management
- Advanced analytics and reporting
- Email scheduling and automation
- Integration with external email services
- Bulk email operations with progress tracking

## Testing

A test script `test-email-history.js` is provided to verify the functionality:
```bash
cd backend
npm run build
node test-email-history.js
```

## Configuration

The feature uses the following environment variables:
- `AWS_REGION`: AWS region for DynamoDB operations
- `EMAIL_HISTORY_TABLE`: DynamoDB table name (defaults to `SharpCRM-EmailHistory-development`)
- `NODE_ENV`: Environment for table naming (defaults to `development`)

## Dependencies

- `@aws-sdk/client-dynamodb`: AWS DynamoDB client
- `@aws-sdk/lib-dynamodb`: DynamoDB document client
- `uuid`: For generating unique email record IDs
