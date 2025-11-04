/**
 * Azure Function: SharePoint to Blob Storage Sync
 * Syncs vendor_items.xlsx from SharePoint to Azure Blob Storage
 * Runs every 5 minutes
 */

const { BlobServiceClient } = require('@azure/storage-blob');
const https = require('https');
const http = require('http');

module.exports = async function (context, myTimer) {
    const timestamp = new Date().toISOString();
    
    context.log('🚀 SharePoint Sync Function triggered at:', timestamp);

    try {
        // Configuration from environment variables
        const config = {
            // SharePoint Configuration
            sharePointFileUrl: process.env.SHAREPOINT_VENDOR_FILE_URL,
            sharePointClientId: process.env.SHAREPOINT_CLIENT_ID,
            sharePointClientSecret: process.env.SHAREPOINT_CLIENT_SECRET,
            sharePointTenantId: process.env.SHAREPOINT_TENANT_ID || 'edd2363d-c022-49f2-b7f7-a8f08b72af06',
            sharePointSiteId: process.env.SHAREPOINT_SITE_ID,
            sharePointDriveId: process.env.SHAREPOINT_DRIVE_ID,
            sharePointFileId: process.env.SHAREPOINT_FILE_ID || '155bdd1b-a840-4a8a-88a4-44a441cb0301',
            
            // Azure Blob Storage Configuration
            blobConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
            blobContainerName: process.env.BLOB_CONTAINER_NAME || 'tie-vendor-catalog',
            blobFileName: 'vendor_items.xlsx'
        };

        // Validate configuration
        if (!config.blobConnectionString) {
            throw new Error('AZURE_STORAGE_CONNECTION_STRING not configured');
        }

        context.log('📋 Configuration loaded');

        // Step 1: Get Access Token for SharePoint
        const accessToken = await getSharePointAccessToken(config, context);
        
        // Step 2: Download file from SharePoint
        const fileBuffer = await downloadFromSharePoint(config, accessToken, context);
        
        // Step 3: Upload to Azure Blob Storage
        await uploadToBlobStorage(config, fileBuffer, context);
        
        context.log('✅ Sync completed successfully');
        
        return {
            status: 'success',
            timestamp: timestamp,
            fileSize: fileBuffer.length
        };

    } catch (error) {
        context.log.error('❌ Sync failed:', error.message);
        context.log.error('Stack:', error.stack);
        throw error;
    }
};

/**
 * Get Access Token for SharePoint using Client Credentials flow
 */
async function getSharePointAccessToken(config, context) {
    context.log('🔑 Getting SharePoint access token...');
    
    const tokenUrl = `https://login.microsoftonline.com/${config.sharePointTenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
        client_id: config.sharePointClientId,
        client_secret: config.sharePointClientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
    });

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get access token: ${error}`);
    }

    const data = await response.json();
    context.log('✅ Access token obtained');
    return data.access_token;
}

/**
 * Download file from SharePoint using Microsoft Graph API
 */
async function downloadFromSharePoint(config, accessToken, context) {
    context.log('📥 Downloading file from SharePoint...');
    
    // Use Microsoft Graph API to download the file
    // Format: /sites/{site-id}/drives/{drive-id}/items/{item-id}/content
    const downloadUrl = `https://graph.microsoft.com/v1.0/sites/${config.sharePointSiteId}/drives/${config.sharePointDriveId}/items/${config.sharePointFileId}/content`;
    
    context.log(`📍 Download URL: ${downloadUrl}`);

    const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to download from SharePoint: ${response.status} - ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    context.log(`✅ Downloaded ${buffer.length} bytes from SharePoint`);
    return buffer;
}

/**
 * Upload file to Azure Blob Storage
 */
async function uploadToBlobStorage(config, fileBuffer, context) {
    context.log('📤 Uploading to Azure Blob Storage...');
    
    // Create BlobServiceClient
    const blobServiceClient = BlobServiceClient.fromConnectionString(config.blobConnectionString);
    
    // Get container client (create if doesn't exist)
    const containerClient = blobServiceClient.getContainerClient(config.blobContainerName);
    await containerClient.createIfNotExists({
        access: 'blob' // Public read access
    });
    
    // Get blob client
    const blobClient = containerClient.getBlockBlobClient(config.blobFileName);
    
    // Upload with overwrite
    await blobClient.upload(fileBuffer, fileBuffer.length, {
        blobHTTPHeaders: {
            blobContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
    });
    
    const blobUrl = blobClient.url;
    context.log(`✅ Uploaded to: ${blobUrl}`);
    
    // Set metadata with last sync time
    await blobClient.setMetadata({
        lastSyncTime: new Date().toISOString(),
        sourceType: 'sharepoint',
        autoSync: 'true'
    });
    
    context.log('✅ Upload completed with metadata');
}
