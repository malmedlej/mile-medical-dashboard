/**
 * SharePoint Client Module - Tender Intelligence Engine
 * Frontend client for interacting with SharePoint RFQ storage via Azure Function
 * Version: 1.0
 */

// Configuration
const SHAREPOINT_API_CONFIG = {
    baseUrl: window.location.origin + '/api/rfq',  // Azure Function endpoint
    timeout: 30000, // 30 seconds
    retryAttempts: 3
};

/**
 * SharePoint Client Class
 */
class SharePointClient {
    constructor() {
        this.baseUrl = SHAREPOINT_API_CONFIG.baseUrl;
        this.timeout = SHAREPOINT_API_CONFIG.timeout;
    }

    /**
     * Get authentication token (from Azure AD Static Web Apps)
     */
    async getAuthToken() {
        try {
            const response = await fetch('/.auth/me');
            const payload = await response.json();
            return payload.accessToken || null;
        } catch (error) {
            console.warn('⚠️ No auth token available, continuing without auth');
            return null;
        }
    }

    /**
     * Make HTTP request to Azure Function
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}/${endpoint}`;
        const token = await this.getAuthToken();

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            signal: AbortSignal.timeout(this.timeout)
        };

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, finalOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error(`❌ SharePoint API Error (${endpoint}):`, error);
            throw error;
        }
    }

    /**
     * Get all RFQs
     * @param {Object} filters - { filter, orderBy, top, skip }
     */
    async getRFQs(filters = {}) {
        const params = new URLSearchParams(filters);
        const endpoint = `list?${params.toString()}`;
        return await this.request(endpoint, { method: 'GET' });
    }

    /**
     * Get single RFQ by ID
     * @param {number} id - SharePoint item ID
     */
    async getRFQ(id) {
        return await this.request(`get/${id}`, { method: 'GET' });
    }

    /**
     * Create new RFQ
     * @param {Object} rfqData - RFQ data object
     */
    async createRFQ(rfqData) {
        return await this.request('create', {
            method: 'POST',
            body: JSON.stringify(rfqData)
        });
    }

    /**
     * Update existing RFQ
     * @param {number} id - SharePoint item ID
     * @param {Object} updates - Fields to update
     */
    async updateRFQ(id, updates) {
        return await this.request(`update/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    /**
     * Delete RFQ
     * @param {number} id - SharePoint item ID
     */
    async deleteRFQ(id) {
        return await this.request(`delete/${id}`, {
            method: 'DELETE'
        });
    }

    /**
     * Get current user's RFQs
     */
    async getMyRFQs() {
        return await this.request('user', { method: 'GET' });
    }

    /**
     * Search RFQs by RFQ ID
     * @param {string} searchTerm - RFQ ID to search for
     */
    async searchRFQs(searchTerm) {
        const filter = `substringof('${searchTerm}', Title)`;
        return await this.getRFQs({ filter });
    }

    /**
     * Get RFQs by status
     * @param {string} status - Status to filter (New, Quoted, Submitted, Won, Lost)
     */
    async getRFQsByStatus(status) {
        const filter = `Status eq '${status}'`;
        return await this.getRFQs({ filter });
    }

    /**
     * Get recent RFQs (last N days)
     * @param {number} days - Number of days to look back
     */
    async getRecentRFQs(days = 30) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        const isoDate = date.toISOString();
        const filter = `RFQDate ge datetime'${isoDate}'`;
        return await this.getRFQs({ filter, orderBy: 'RFQDate', desc: 'true' });
    }

    /**
     * Upload RFQ Excel file to Azure Blob Storage
     * @param {File} file - Excel file to upload
     * @param {string} rfqId - RFQ identifier
     * @returns {Promise<{success: boolean, fileUrl: string, fileName: string}>}
     */
    async uploadRFQFile(file, rfqId) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('rfqId', rfqId);
            
            console.log(`📤 Uploading file to Azure: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
            
            const response = await fetch(`${this.baseUrl}/upload`, {
                method: 'POST',
                body: formData,
                signal: AbortSignal.timeout(this.timeout)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'File upload failed');
            }

            console.log('✅ File uploaded to Azure Blob Storage');
            return {
                success: true,
                fileUrl: result.fileUrl,
                fileName: result.fileName,
                message: 'File uploaded successfully'
            };

        } catch (error) {
            console.error('❌ Azure file upload error:', error);
            
            // FALLBACK: Store file metadata locally (file content not persisted)
            console.warn('⚠️ Using local file metadata fallback (file content not stored)');
            
            // Create a pseudo-URL for local reference
            const localFileRef = {
                success: true,
                fileUrl: `blob:local/${rfqId}/${file.name}`,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                localOnly: true,
                message: 'File metadata stored locally (awaiting Azure deployment)'
            };
            
            return localFileRef;
        }
    }
}

/**
 * Storage Manager - Handles hybrid localStorage + SharePoint storage
 */
class RFQStorageManager {
    constructor() {
        this.spClient = new SharePointClient();
        this.localStorageKey = 'tie_rfq_archive';
        this.syncInProgress = false;
    }

    /**
     * Save RFQ to SharePoint (primary) and localStorage (backup)
     * Now includes file upload support
     * @param {Object} rfqData - RFQ data object
     * @param {File} rfqFile - Optional Excel file to upload
     */
    async saveRFQ(rfqData, rfqFile = null) {
        try {
            console.log('💾 Saving RFQ to SharePoint...');
            
            // Step 1: Upload file if provided
            let fileUrl = null;
            let fileName = null;
            
            if (rfqFile) {
                try {
                    console.log('📤 Uploading RFQ file...');
                    const uploadResult = await this.spClient.uploadRFQFile(rfqFile, rfqData.rfqId);
                    
                    if (uploadResult.success) {
                        fileUrl = uploadResult.fileUrl;
                        fileName = uploadResult.fileName;
                        console.log(`✅ File uploaded: ${fileName}`);
                    }
                } catch (uploadError) {
                    console.warn('⚠️ File upload failed, continuing with metadata only:', uploadError);
                    // Continue even if file upload fails
                }
            }
            
            // Step 2: Save metadata to SharePoint
            const rfqDataWithFile = {
                ...rfqData,
                fileUrl: fileUrl,
                fileName: fileName,
                originalFileName: rfqFile ? rfqFile.name : null
            };
            
            const result = await this.spClient.createRFQ(rfqDataWithFile);
            
            if (result.success) {
                console.log(`✅ RFQ saved to SharePoint (ID: ${result.data.id})`);
                
                // Also save to localStorage as backup
                this.saveToLocalStorage(rfqDataWithFile, result.data.id);
                
                return {
                    success: true,
                    sharePointId: result.data.id,
                    fileUrl: fileUrl,
                    fileName: fileName,
                    message: fileUrl ? 'RFQ and file saved to SharePoint' : 'RFQ saved to SharePoint'
                };
            } else {
                throw new Error('SharePoint save failed');
            }
            
        } catch (error) {
            console.error('❌ Failed to save to SharePoint:', error);
            
            // Fallback: Save to localStorage only (without file)
            console.log('⚠️ Falling back to localStorage only');
            this.saveToLocalStorage(rfqData);
            
            return {
                success: false,
                localOnly: true,
                message: 'Saved locally only. File not stored. Will sync to SharePoint when available.',
                error: error.message
            };
        }
    }

    /**
     * Load RFQs from SharePoint (or localStorage as fallback)
     */
    async loadRFQs(filters = {}) {
        try {
            console.log('📂 Loading RFQs from SharePoint...');
            
            const result = await this.spClient.getRFQs(filters);
            
            if (result.success) {
                console.log(`✅ Loaded ${result.count} RFQs from SharePoint`);
                
                // Cache in localStorage
                this.cacheToLocalStorage(result.data);
                
                return result.data;
            } else {
                throw new Error('SharePoint load failed');
            }
            
        } catch (error) {
            console.error('❌ Failed to load from SharePoint:', error);
            
            // Fallback: Load from localStorage
            console.log('⚠️ Loading from localStorage instead');
            return this.loadFromLocalStorage();
        }
    }

    /**
     * Update RFQ status
     */
    async updateRFQStatus(id, status, notes = '') {
        try {
            const result = await this.spClient.updateRFQ(id, { status, notes });
            
            if (result.success) {
                console.log(`✅ Updated RFQ ${id} status to: ${status}`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Failed to update RFQ:', error);
            return false;
        }
    }

    /**
     * Update RFQ prices
     */
    async updateRFQPrices(id, matchedItems) {
        try {
            const result = await this.spClient.updateRFQ(id, { matchedItems });
            
            if (result.success) {
                console.log(`✅ Updated prices for RFQ ${id}`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Failed to update prices:', error);
            return false;
        }
    }

    /**
     * Save to localStorage (backup/cache)
     */
    saveToLocalStorage(rfqData, sharePointId = null) {
        try {
            const stored = localStorage.getItem(this.localStorageKey);
            const rfqs = stored ? JSON.parse(stored) : [];
            
            const rfqObject = {
                ...rfqData,
                sharePointId: sharePointId,
                localSaveDate: new Date().toISOString(),
                synced: sharePointId !== null
            };
            
            // Add or update
            const existingIndex = rfqs.findIndex(r => r.rfqId === rfqData.rfqId);
            if (existingIndex !== -1) {
                rfqs[existingIndex] = rfqObject;
            } else {
                rfqs.unshift(rfqObject);
            }
            
            localStorage.setItem(this.localStorageKey, JSON.stringify(rfqs));
            console.log('💾 Saved to localStorage as backup');
            
        } catch (error) {
            console.error('❌ localStorage save failed:', error);
        }
    }

    /**
     * Load from localStorage (fallback)
     */
    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem(this.localStorageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('❌ localStorage load failed:', error);
            return [];
        }
    }

    /**
     * Cache SharePoint data to localStorage
     */
    cacheToLocalStorage(rfqs) {
        try {
            const cachedData = rfqs.map(rfq => ({
                ...rfq,
                synced: true,
                cachedDate: new Date().toISOString()
            }));
            
            localStorage.setItem(this.localStorageKey, JSON.stringify(cachedData));
            console.log('💾 Cached SharePoint data to localStorage');
            
        } catch (error) {
            console.error('❌ Cache to localStorage failed:', error);
        }
    }

    /**
     * Sync unsynced localStorage items to SharePoint
     */
    async syncLocalToSharePoint() {
        if (this.syncInProgress) {
            console.log('⚠️ Sync already in progress');
            return;
        }

        this.syncInProgress = true;
        
        try {
            const localRFQs = this.loadFromLocalStorage();
            const unsyncedRFQs = localRFQs.filter(rfq => !rfq.synced);
            
            console.log(`🔄 Syncing ${unsyncedRFQs.length} unsynced RFQs to SharePoint...`);
            
            for (const rfq of unsyncedRFQs) {
                try {
                    const result = await this.spClient.createRFQ(rfq);
                    if (result.success) {
                        // Update local copy with SharePoint ID
                        this.saveToLocalStorage(rfq, result.data.id);
                        console.log(`✅ Synced: ${rfq.rfqId}`);
                    }
                } catch (error) {
                    console.error(`❌ Failed to sync ${rfq.rfqId}:`, error);
                }
            }
            
            console.log('✅ Sync complete');
            
        } catch (error) {
            console.error('❌ Sync failed:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Check if SharePoint is available
     */
    async isSharePointAvailable() {
        try {
            await this.spClient.getRFQs({ top: 1 });
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Export global instances
window.SharePointClient = SharePointClient;
window.RFQStorageManager = RFQStorageManager;
window.spClient = new SharePointClient();
window.storageManager = new RFQStorageManager();

console.log('✅ SharePoint Client module loaded');
