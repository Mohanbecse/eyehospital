# Runtime Configuration Guide

This setup allows you to change the API URL **WITHOUT REBUILDING** your Angular application in production.

## Files Created:
1. `/src/assets/config.json` - Runtime editable configuration file
2. `/src/app/services/app-config.service.ts` - Configuration loader service
3. Updated `/src/main.ts` - Application initializer that loads config before app starts

## Usage Instructions:

### ✅ For Production Deployment:
After building your application (`ng build`), you will find `config.json` in the output directory:
```
dist/eyehospital/assets/config.json
```

Simply edit this file on your server to change the API URL at any time. No rebuild required!

```json
{
  "apiUrl": "https://your-production-server.com/api"
}
```

Restarting the browser tab will pick up the new configuration automatically.

### ✅ In Your Code:
Inject `AppConfigService` anywhere you need the API URL:

```typescript
import { AppConfigService } from './services/app-config.service';

constructor(private config: AppConfigService) {
  const apiBaseUrl = this.config.apiUrl;
}
```

### ✅ Features:
- ✓ Loads configuration BEFORE application initialization
- ✓ Fallback values if config file is missing
- ✓ Works exactly same in development and production
- ✓ No rebuild required after config changes
- ✓ Type safe access to configuration values

### ✅ Migration from environment files:
You can keep existing environment.ts files but replace usages of `environment.apiUrl` with `appConfigService.apiUrl` throughout your application.

### ✅ Important:
This config.json file is publicly accessible - **DO NOT STORE SECRETS HERE**. This is intended only for public runtime configuration values.