// generate-secrets.js
import crypto from 'crypto';


// Generate two different 64-byte random strings
const jwtSecret = crypto.randomBytes(64).toString('hex');
const jwtRefreshSecret = crypto.randomBytes(64).toString('hex');

console.log('JWT_SECRET=', jwtSecret);
console.log('JWT_REFRESH_SECRET=', jwtRefreshSecret);