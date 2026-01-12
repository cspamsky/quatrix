import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const serverEnvPath = path.join(__dirname, 'server', '.env');
const serverEnvExamplePath = path.join(__dirname, 'server', '.env.example');

console.log('🚀 Starting Quatrix Setup...');

// Check if server/.env exists
if (!fs.existsSync(serverEnvPath)) {
    console.log('📝 Creating server/.env from .env.example...');
    if (fs.existsSync(serverEnvExamplePath)) {
        let envContent = fs.readFileSync(serverEnvExamplePath, 'utf8');
        
        // Generate a random JWT_SECRET if it's the default placeholder
        const randomSecret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        envContent = envContent.replace('your_super_secret_jwt_key_here', randomSecret);
        
        fs.writeFileSync(serverEnvPath, envContent);
        console.log('✅ server/.env created with a generated JWT_SECRET.');
    } else {
        console.error('❌ Error: server/.env.example not found!');
        process.exit(1);
    }
} else {
    console.log('ℹ️  server/.env already exists, skipping creation.');
}

console.log('📦 Setup complete. You can now run "npm run install-all" and then "npm run dev".');
