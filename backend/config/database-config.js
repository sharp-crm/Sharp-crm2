const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';
const isLocal = process.env.DYNAMODB_LOCAL === 'true';

/**
 * LOCAL DEVELOPMENT CONFIGURATION
 * Using Docker DynamoDB Local container
 */
const localConfig = {
  region: "us-east-1",  // Required by AWS SDK (any valid region works)
  endpoint: "http://localhost:8000",  // Points to Docker container
  credentials: {
    // These are FAKE credentials - Docker DynamoDB Local doesn't validate them
    accessKeyId: "fakeMyKeyId",
    secretAccessKey: "fakeSecretAccessKey"
  }
};

/**
 * PRODUCTION AWS CONFIGURATION
 * Using real AWS DynamoDB service
 */
const productionConfig = {
  region: process.env.AWS_REGION || "us-east-1",  // Real AWS region
  // No endpoint specified = uses real AWS DynamoDB
  // No credentials specified = uses AWS credential chain:
  // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  // 2. AWS credentials file (~/.aws/credentials)
  // 3. IAM roles (for EC2/Lambda)
  // 4. AWS CLI configured credentials
};

/**
 * DEVELOPMENT WITH REAL AWS (optional)
 * For testing against real AWS DynamoDB in development
 */
const awsDevConfig = {
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,      // Real AWS Access Key
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,  // Real AWS Secret Key
  }
};

// Choose configuration based on environment
function getDynamoConfig() {
  if (isLocal || (!isProduction && !process.env.AWS_ACCESS_KEY_ID)) {
    console.log("🐳 Using LOCAL DynamoDB (Docker container)");
    return localConfig;
  } else if (isProduction) {
    console.log("☁️  Using PRODUCTION AWS DynamoDB");
    return productionConfig;
  } else {
    console.log("🔧 Using DEVELOPMENT AWS DynamoDB");
    return awsDevConfig;
  }
}

// Create and export configured client
const config = getDynamoConfig();
const client = new DynamoDBClient(config);
const docClient = DynamoDBDocumentClient.from(client);

console.log("📊 DynamoDB Configuration:", {
  environment: process.env.NODE_ENV || 'development',
  isLocal: isLocal,
  region: config.region,
  endpoint: config.endpoint || 'AWS Default',
  hasCredentials: !!config.credentials
});

module.exports = {
  client,
  docClient,
  config,
  isLocal,
  isProduction
}; 