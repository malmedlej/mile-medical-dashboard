# Mile Medical Dashboard System

A professional, responsive, multi-page analytics dashboard for Mile Medical Company.

## 📋 What's Included

### ✓ Complete Files
- `index.html` - Executive Dashboard
- `operations.html` - Operations Dashboard  
- `commercial.html` - Commercial Dashboard
- `marketing.html` - Marketing Dashboard
- `css/style.css` - Complete unified stylesheet (15KB)
- `js/main.js` - JavaScript with Chart.js integration (7KB)
- `partials/header.html` - Shared header component
- `partials/sidebar.html` - Shared sidebar navigation
- `assets/logo.png` - Mile Medical logo (placeholder)

### 🎨 Features
- ✅ Fully responsive (desktop, tablet, mobile)
- ✅ Modern gradient design with Mile Medical branding
- ✅ Interactive Chart.js visualizations
- ✅ Auto-refresh every 5 minutes
- ✅ SharePoint integration ready
- ✅ CSV export functionality
- ✅ Mobile menu with hamburger icon
- ✅ Smooth animations and transitions

## 🚀 Quick Start

### Option 1: Open Directly
1. Extract all files
2. Replace `assets/logo.png` with your actual Mile Medical logo
3. Open `index.html` in a web browser

### Option 2: Use Local Server (Recommended)
```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve

# PHP
php -S localhost:8000
```

Then visit: `http://localhost:8000`

## 🌐 SharePoint Integration

The dashboard is configured to connect to your SharePoint Excel sheets:

- **Operations**: [Operations Sheet](https://milemedical.sharepoint.com/:x:/s/MileMedical/EVq4q-YnW0JKjK-eikbGR5kBnAF0I3X4BcxqYcO0_4CdJQ)
- **Commercial**: [Commercial Sheet](https://milemedical.sharepoint.com/:x:/s/MileMedical/EcnuIdF1jllMgZ7Fw2dQmYABfvRRMQkLJ36kXqeU0Oq6bg)  
- **Marketing**: [Marketing Sheet](https://milemedical.sharepoint.com/:x:/s/MileMedical/EYN5ITx2xHxEjx_6-CXUfYIB2OMO2jG-l_xE2K0cJrPB-g)

Currently using demo data. For live SharePoint integration, see deployment guide.

## 📦 Deployment

### To Web Hosting
1. Upload all files via FTP/cPanel
2. Maintain folder structure
3. Set permissions: files 644, folders 755
4. Point domain to `index.html`

### To GitHub Pages
```bash
git init
git add .
git commit -m "Mile Medical Dashboard"
git push origin main
```
Enable GitHub Pages in repository settings.

### To Netlify
Drag and drop the entire folder to Netlify.

## 🎨 Customization

### Colors
Edit `css/style.css` - CSS variables at the top:
```css
:root {
  --primary-color: #1B1464;  /* Deep Blue */
  --accent-color: #3FABE6;   /* Sky Blue */
  --success-color: #48BB78;  /* Green */
}
```

### Auto-Refresh Interval
Edit `js/main.js`:
```javascript
const CONFIG = {
  refreshInterval: 300000  // 5 minutes in milliseconds
};
```

### Logo
Replace `assets/logo.png` with your logo (recommended: 300x300px PNG with transparency)

## 📱 Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📄 License
© 2025 Mile Medical Company

---

**Need Help?**  
Contact: info@milemedical.com  
Website: https://www.milemedical.com
