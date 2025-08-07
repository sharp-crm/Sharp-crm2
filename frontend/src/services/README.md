# Enhanced Authentication System

This document describes the enhanced authentication and session handling system implemented in SharpCRM.

## 🎯 Features

### 1. Automatic Token Refresh
- **Frequency**: Every 60 minutes (configurable)
- **Check Interval**: Every 5 minutes to check if token needs refresh
- **Endpoint**: Uses existing `/refresh` backend endpoint
- **Storage**: Access token in memory/storage, refresh token in httpOnly cookies
- **Failure Handling**: Automatic logout and redirect to login on refresh failure

### 2. Inactivity Logout
- **Timeout**: 2 hours of inactivity (configurable)
- **Activity Tracking**: Mouse movement, clicks, key presses, scroll, touch events
- **Tab Focus**: Resets timer when tab becomes active
- **Warning**: Shows warning 5 minutes before logout
- **User Control**: Users can extend session by clicking "Stay Logged In"

### 3. Security Features
- **Token Validation**: Automatic validation of token expiration
- **Secure Storage**: Access tokens in memory/storage, refresh tokens in cookies
- **Request Interception**: Automatic token attachment to API requests
- **Parallel Request Handling**: Prevents multiple simultaneous refresh attempts

## 🏗️ Architecture

### Core Components

1. **AuthService** (`services/authService.ts`)
   - Singleton service managing token refresh and inactivity tracking
   - Handles event listeners for user activity
   - Manages timers for automatic refresh and inactivity

2. **useAuthService Hook** (`hooks/useAuthService.ts`)
   - React hook for accessing auth service functionality
   - Provides inactivity status and manual refresh methods
   - Updates UI with real-time inactivity information

3. **InactivityWarning Component** (`components/Common/InactivityWarning.tsx`)
   - Displays warning when user is about to be logged out
   - Allows users to extend their session
   - Positioned in top-right corner of the screen

4. **Enhanced AuthWrapper** (`components/AuthWrapper.tsx`)
   - Integrates with auth service for automatic initialization
   - Handles authentication state management
   - Manages cleanup on logout/unmount

### Integration Points

1. **API Client** (`api/client.ts`)
   - Automatic token refresh on 401 errors
   - Request queuing during refresh
   - Seamless token updates

2. **Auth Store** (`store/useAuthStore.ts`)
   - Enhanced with auth service integration
   - Automatic cleanup on logout
   - Token management

3. **Layout Component** (`components/Layout/Layout.tsx`)
   - Includes inactivity warning component
   - Provides user feedback for session status

## 🔧 Configuration

### Token Refresh Settings
```typescript
const tokenRefreshConfig = {
  interval: 60 * 60 * 1000, // 60 minutes
  checkInterval: 5 * 60 * 1000 // Check every 5 minutes
};
```

### Inactivity Settings
```typescript
const inactivityConfig = {
  timeout: 2 * 60 * 60 * 1000, // 2 hours
  events: ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
};
```

### Warning Settings
```typescript
const warningThreshold = 5 * 60 * 1000; // Show warning 5 minutes before logout
```

## 🚀 Usage

### Basic Integration

The system is automatically integrated into the application. No additional setup is required.

### Manual Token Refresh

```typescript
import { useAuthService } from '../hooks/useAuthService';

const MyComponent = () => {
  const { manualRefreshToken } = useAuthService();
  
  const handleRefresh = async () => {
    const success = await manualRefreshToken();
    if (success) {
      console.log('Token refreshed successfully');
    }
  };
  
  return <button onClick={handleRefresh}>Refresh Token</button>;
};
```

### Inactivity Status

```typescript
import { useAuthService } from '../hooks/useAuthService';

const MyComponent = () => {
  const { inactivityStatus, resetInactivity } = useAuthService();
  
  return (
    <div>
      <p>Time until logout: {Math.round(inactivityStatus.timeUntilLogout / 1000 / 60)} minutes</p>
      <button onClick={resetInactivity}>Reset Timer</button>
    </div>
  );
};
```

## 🔍 Debugging

### Console Commands

The system provides debugging commands accessible from the browser console:

```javascript
// Test authentication status
window.testAuth();

// Access auth service directly
window.authService = authService;
```

### Debug Information

The system logs detailed information to the console:

- `🔐 Auth service initialized` - Service started
- `🔄 Starting automatic token refresh` - Token refresh in progress
- `✅ Token refreshed successfully` - Refresh completed
- `🕐 Inactivity timeout reached` - User logged out due to inactivity
- `🔐 Auth service cleaned up` - Service stopped

## 🛡️ Security Considerations

1. **Token Storage**: Access tokens stored in memory/storage, refresh tokens in httpOnly cookies
2. **Automatic Cleanup**: All timers and event listeners cleaned up on logout
3. **Request Security**: Automatic token attachment to all API requests
4. **Failure Handling**: Automatic logout on token refresh failure
5. **User Control**: Users can extend sessions and see inactivity warnings

## 🔄 Migration Notes

### From Previous System

1. **Backward Compatible**: Existing authentication flow remains unchanged
2. **Automatic Enhancement**: New features work automatically with existing code
3. **No Breaking Changes**: All existing functionality preserved
4. **Gradual Rollout**: Features can be enabled/disabled via configuration

### Testing

1. **Token Refresh**: Test automatic refresh by waiting for token expiration
2. **Inactivity**: Test inactivity logout by leaving the application idle
3. **User Interaction**: Test that user activity resets the inactivity timer
4. **Warning System**: Test inactivity warning by approaching the timeout

## 📝 Future Enhancements

1. **Configurable Timeouts**: User-configurable session timeouts
2. **Activity Analytics**: Track user activity patterns
3. **Session Recovery**: Recover sessions after browser crash
4. **Multi-tab Sync**: Synchronize session state across tabs
5. **Advanced Notifications**: More sophisticated warning system 