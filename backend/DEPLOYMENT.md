# SharpCRM Backend Deployment Guide

## TypeScript Build Fixes

### Issues Fixed

#### 1. TS2554: Expected 3 arguments, but got 2 (Line 46)
**Problem**: The `serverlessExpressInstance` function from `@vendia/serverless-express` expects a callback function as the third argument.

**Solution**: Wrapped the serverless-express call in a Promise:
```typescript
return new Promise((resolve, reject) => {
  serverlessExpressInstance(event, context, (err: any, result: APIGatewayProxyResult) => {
    if (err) {
      reject(err);
    } else {
      resolve(result);
    }
  });
});
```

#### 2. TS18046: 'error' is of type 'unknown' (Line 60)
**Problem**: TypeScript 4.4+ made catch clause variables have type `unknown` instead of `any` by default.

**Solution**: Added proper error type checking:
```typescript
const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
```

### Enhanced TypeScript Configuration

Updated `tsconfig.json` with additional checks to prevent future issues:
- `noImplicitAny`: Prevents implicit any types
- `noFallthroughCasesInSwitch`: Catches switch statement fallthrough bugs  
- `useUnknownInCatchVariables`: Forces proper error handling

## Deployment Configuration

### Render.com Setup

1. **Build Command**: `npm install && npm run build`
2. **Start Command**: `npm start`
3. **Health Check**: `/health` endpoint
4. **Environment Variables**:
   - `NODE_ENV=production`
   - `JWT_SECRET` (auto-generated)
   - `JWT_REFRESH_SECRET` (auto-generated)
   - `AWS_REGION=us-east-1`

### Environment Variables Required

```bash
# Production Environment
NODE_ENV=production
PORT=3000
JWT_SECRET=your-production-jwt-secret
JWT_REFRESH_SECRET=your-production-refresh-secret
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
FRONTEND_URL=https://your-frontend-domain.com
```

### Build Process

1. **Install Dependencies**: `npm install`
2. **TypeScript Compilation**: `npm run build`
3. **Start Application**: `npm start`

### Best Practices for Future Development

#### 1. Pre-commit Hooks
Add to `package.json`:
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts",
    "pre-commit": "npm run type-check && npm run lint"
  }
}
```

#### 2. Strict Error Handling
Always use proper error typing in catch blocks:
```typescript
try {
  // risky operation
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error('Operation failed:', errorMessage);
}
```

#### 3. Function Signatures
Always check function signatures when using third-party libraries:
```typescript
// Check if function expects callback
someLibraryFunction(arg1, arg2, (error, result) => {
  // handle callback
});
```

#### 4. CI/CD Integration
Add TypeScript checking to your CI pipeline:
```yaml
# .github/workflows/deploy.yml
- name: Type Check
  run: npm run type-check
- name: Build
  run: npm run build
```

## Troubleshooting Common Issues

### Build Fails with "Cannot find module"
- Ensure all dependencies are listed in `package.json`
- Run `npm install` to install missing dependencies

### Runtime Errors in Lambda
- Check that all imports use proper paths
- Ensure environment variables are set correctly
- Verify AWS credentials and permissions

### Type Errors During Build
- Enable strict TypeScript checking gradually
- Use proper type annotations for function parameters
- Handle `unknown` types in catch blocks properly

## Performance Optimization

### Cold Start Optimization
- Implement proper initialization caching
- Use connection pooling for database connections
- Minimize bundle size with tree-shaking

### Memory Management
- Set appropriate Lambda memory limits
- Monitor memory usage in production
- Clean up resources properly

## Monitoring and Debugging

### Health Checks
The application includes a comprehensive health check endpoint at `/health` that verifies:
- Database connectivity
- DynamoDB table existence and status
- Application initialization status

### Logging
- All errors are logged with proper context
- Health check failures include detailed error information
- Request/response logging is available for debugging

### Error Tracking
Consider integrating with error tracking services:
- Sentry for error monitoring
- CloudWatch for AWS-native logging
- DataDog for comprehensive monitoring
