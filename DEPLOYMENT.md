# 🚀 Mile Medical Dashboard - Deployment Guide

## Production Deployment Options

This guide covers multiple deployment strategies for your Mile Medical Dashboard.

---

## Option 1: Netlify (Recommended - Easiest)

### Steps:

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Deploy**
   ```bash
   netlify deploy --prod
   ```

4. **Configure Custom Domain**
   - Go to Netlify dashboard
   - Settings → Domain Management
   - Add custom domain: `dashboard.milemedical.com`

### Netlify Configuration (netlify.toml)
```toml
[build]
  publish = "."

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Pros:**
- ✅ Free tier available
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Easy rollbacks

---

## Option 2: Vercel

### Steps:

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Configure Domain**
   - Go to Vercel dashboard
   - Project Settings → Domains
   - Add: `dashboard.milemedical.com`

### Vercel Configuration (vercel.json)
```json
{
  "version": 2,
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

**Pros:**
- ✅ Free for static sites
- ✅ Excellent performance
- ✅ Auto-preview deployments
- ✅ Built-in analytics

---

## Option 3: Azure Static Web Apps

### Steps:

1. **Create Static Web App**
   ```bash
   # Using Azure CLI
   az staticwebapp create \
     --name mile-medical-dashboard \
     --resource-group mile-medical-rg \
     --location eastus2
   ```

2. **Deploy**
   ```bash
   # Push to GitHub, enable Azure Static Web Apps GitHub Action
   # Or use Azure CLI
   az staticwebapp deploy \
     --name mile-medical-dashboard \
     --source .
   ```

3. **Configure Custom Domain**
   - Azure Portal → Static Web Apps → Custom domains
   - Add: `dashboard.milemedical.com`
   - Update DNS with provided CNAME

### Azure Configuration (staticwebapp.config.json)
```json
{
  "navigationFallback": {
    "rewrite": "/index.html"
  },
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    }
  ]
}
```

**Pros:**
- ✅ Integrates with Azure AD
- ✅ Built-in API support
- ✅ Enterprise security
- ✅ Azure ecosystem integration

---

## Option 4: AWS S3 + CloudFront

### Steps:

1. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://mile-medical-dashboard
   ```

2. **Upload Files**
   ```bash
   aws s3 sync . s3://mile-medical-dashboard \
     --exclude ".git/*" \
     --exclude "node_modules/*"
   ```

3. **Enable Static Website Hosting**
   ```bash
   aws s3 website s3://mile-medical-dashboard \
     --index-document index.html \
     --error-document index.html
   ```

4. **Create CloudFront Distribution**
   - AWS Console → CloudFront → Create Distribution
   - Origin: Your S3 bucket
   - Enable HTTPS
   - Add custom domain

5. **Configure Route 53**
   - Create A record for `dashboard.milemedical.com`
   - Alias to CloudFront distribution

**Pros:**
- ✅ Highly scalable
- ✅ Very low cost
- ✅ AWS ecosystem
- ✅ Global CDN

---

## Option 5: GitHub Pages

### Steps:

1. **Create GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/milemedical/dashboard.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**
   - Repository Settings → Pages
   - Source: main branch
   - Folder: / (root)
   - Save

3. **Configure Custom Domain**
   - Add CNAME file with: `dashboard.milemedical.com`
   - Update DNS with GitHub IP addresses

**Pros:**
- ✅ Free hosting
- ✅ Easy setup
- ✅ Version control built-in
- ✅ Auto-deploy on push

---

## Option 6: Traditional Web Server (Apache/Nginx)

### Apache Configuration:

```apache
<VirtualHost *:80>
    ServerName dashboard.milemedical.com
    DocumentRoot /var/www/mile-medical-dashboard
    
    <Directory /var/www/mile-medical-dashboard>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</VirtualHost>
```

### Nginx Configuration:

```nginx
server {
    listen 80;
    server_name dashboard.milemedical.com;
    root /var/www/mile-medical-dashboard;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Gzip compression
    gzip on;
    gzip_types text/css application/javascript application/json;
}
```

**Pros:**
- ✅ Full control
- ✅ Custom configurations
- ✅ Private hosting
- ✅ Existing infrastructure

---

## SSL/HTTPS Configuration

### Using Let's Encrypt (Free):

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d dashboard.milemedical.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## Environment-Specific Configuration

### Production Settings:

1. **Minify Assets**
   ```bash
   # CSS minification
   npx clean-css-cli -o css/style.min.css css/style.css
   
   # JS minification
   npx terser js/main.js -o js/main.min.js
   ```

2. **Update References**
   Replace in HTML files:
   - `css/style.css` → `css/style.min.css`
   - `js/main.js` → `js/main.min.js`

3. **Enable Caching**
   Add to server config:
   ```nginx
   location ~* \.(css|js|jpg|png|svg)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

---

## SharePoint API Integration

### Production Setup:

1. **Azure AD App Registration**
   - Azure Portal → App Registrations
   - New Registration
   - Name: "Mile Medical Dashboard"
   - Redirect URI: https://dashboard.milemedical.com

2. **API Permissions**
   - Microsoft Graph API
   - Permissions: `Sites.Read.All`, `Files.Read.All`
   - Grant admin consent

3. **Update JavaScript**
   ```javascript
   // js/main.js
   const CONFIG = {
       clientId: 'YOUR_CLIENT_ID',
       tenantId: 'YOUR_TENANT_ID',
       apiScopes: ['https://graph.microsoft.com/Sites.Read.All']
   };
   ```

4. **Implement Authentication**
   ```javascript
   async function getAccessToken() {
       // Using MSAL.js
       const msalConfig = {
           auth: {
               clientId: CONFIG.clientId,
               authority: `https://login.microsoftonline.com/${CONFIG.tenantId}`
           }
       };
       
       const msalInstance = new msal.PublicClientApplication(msalConfig);
       const tokenResponse = await msalInstance.acquireTokenSilent({
           scopes: CONFIG.apiScopes
       });
       
       return tokenResponse.accessToken;
   }
   ```

---

## Performance Optimization

### Before Deployment:

1. **Optimize Images**
   ```bash
   # Install imagemin
   npm install -g imagemin-cli imagemin-webp
   
   # Convert to WebP
   imagemin assets/*.png --plugin=webp > assets/optimized/
   ```

2. **Enable Compression**
   - Gzip or Brotli compression on server
   - Target: CSS, JS, HTML files

3. **CDN Configuration**
   - Use CDN for Chart.js
   - Consider CDN for custom assets

4. **Implement Service Worker**
   Create `sw.js`:
   ```javascript
   const CACHE_NAME = 'mile-medical-v1';
   const urlsToCache = [
       '/',
       '/css/style.css',
       '/js/main.js',
       '/index.html'
   ];
   
   self.addEventListener('install', event => {
       event.waitUntil(
           caches.open(CACHE_NAME)
               .then(cache => cache.addAll(urlsToCache))
       );
   });
   ```

---

## Monitoring & Analytics

### Google Analytics:

Add to all HTML pages before `</head>`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Error Tracking (Sentry):

```html
<script src="https://browser.sentry-cdn.com/7.x.x/bundle.min.js"></script>
<script>
    Sentry.init({
        dsn: 'YOUR_SENTRY_DSN',
        environment: 'production'
    });
</script>
```

---

## Pre-Deployment Checklist

- [ ] Replace logo placeholder with actual logo
- [ ] Update SharePoint URLs to production
- [ ] Test all KPI click navigation
- [ ] Verify breadcrumb links work
- [ ] Test mobile responsive design
- [ ] Validate SharePoint button links
- [ ] Test search functionality on all tables
- [ ] Verify CSV export works
- [ ] Check auto-refresh (5 min interval)
- [ ] Test on all target browsers
- [ ] Enable HTTPS/SSL
- [ ] Configure custom domain
- [ ] Set up monitoring/analytics
- [ ] Implement authentication (if required)
- [ ] Test SharePoint API connection
- [ ] Run performance audit
- [ ] Backup deployment files

---

## Post-Deployment

### 1. DNS Configuration:

```
Type    Name        Value                           TTL
A       @           YOUR_SERVER_IP                  3600
CNAME   dashboard   your-host.netlify.app           3600
```

### 2. Verify Deployment:

```bash
# Check HTTPS
curl -I https://dashboard.milemedical.com

# Test performance
lighthouse https://dashboard.milemedical.com --view

# Check mobile responsiveness
curl -A "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)" \
     https://dashboard.milemedical.com
```

### 3. Monitor:

- Set up uptime monitoring (UptimeRobot, Pingdom)
- Configure error alerts
- Monitor page load times
- Track user analytics

---

## Rollback Procedure

If deployment fails:

1. **Netlify/Vercel:**
   - Dashboard → Deployments → Previous deployment → Publish

2. **AWS/Azure:**
   - Restore previous S3 version
   - Or redeploy previous CloudFront distribution

3. **Traditional Server:**
   ```bash
   # Restore from backup
   cp -r /backup/mile-medical-dashboard/* /var/www/mile-medical-dashboard/
   sudo systemctl reload nginx
   ```

---

## Support

**Deployment Issues:**
- Email: devops@milemedical.com
- Docs: See README.md
- Emergency: Contact IT department

**Best Practice:** Always test deployment on staging environment first!

---

**Ready to deploy? Choose the option that best fits your infrastructure! 🚀**
