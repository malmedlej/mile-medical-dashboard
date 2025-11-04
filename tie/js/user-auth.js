/**
 * User Authentication Module
 * Fetches and displays authenticated user info from Azure Static Web Apps
 */

// Fetch user information
async function loadUserInfo() {
    try {
        // Azure Static Web Apps provides user info at /.auth/me
        const response = await fetch('/.auth/me');
        const payload = await response.json();
        
        if (payload && payload.clientPrincipal) {
            const user = payload.clientPrincipal;
            updateUserDisplay(user);
        } else {
            // Fallback if not authenticated
            console.log('No authenticated user found');
            useDefaultUserDisplay();
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
        useDefaultUserDisplay();
    }
}

// Update user display in sidebar
function updateUserDisplay(user) {
    const userName = user.userDetails || user.userId || 'User';
    const userEmail = user.userId || '';
    
    // Extract name from email if needed
    let displayName = userName;
    let initials = 'MM';
    
    if (userEmail.includes('@')) {
        // Extract name from email (e.g., m.wael@milemedical.com -> M. Wael)
        const emailName = userEmail.split('@')[0];
        const nameParts = emailName.split('.');
        
        if (nameParts.length >= 2) {
            // Format: m.wael -> M. Wael
            displayName = nameParts.map((part, index) => {
                if (index === 0 && part.length === 1) {
                    // First part is initial: keep as "M."
                    return part.toUpperCase() + '.';
                }
                // Capitalize first letter of each part
                return part.charAt(0).toUpperCase() + part.slice(1);
            }).join(' ');
            initials = nameParts.map(part => part.charAt(0).toUpperCase()).join('');
        } else {
            displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
            initials = emailName.substring(0, 2).toUpperCase();
        }
    }
    
    // Update sidebar footer
    const avatarEl = document.querySelector('.sidebar-footer .w-10');
    const nameEl = document.querySelector('.sidebar-footer p.text-sm');
    const roleEl = document.querySelector('.sidebar-footer p.text-xs');
    
    if (avatarEl) {
        avatarEl.textContent = initials;
    }
    
    if (nameEl) {
        nameEl.textContent = displayName;
    }
    
    if (roleEl) {
        // Try to extract role from user claims
        let role = 'User';
        
        if (user.userRoles && user.userRoles.length > 0) {
            role = user.userRoles[0];
            // Map technical roles to friendly names
            if (role === 'authenticated' || role === 'anonymous') {
                role = 'Team Member';
            }
        } else {
            role = 'Team Member';
        }
        
        roleEl.textContent = role;
    }
    
    console.log(`✅ User loaded: ${displayName} (${userEmail})`);
}

// Use default display if auth fails
function useDefaultUserDisplay() {
    // Keep the existing Mile Medical Admin as fallback
    console.log('Using default user display');
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadUserInfo);
} else {
    loadUserInfo();
}
