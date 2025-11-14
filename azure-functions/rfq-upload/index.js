/**
 * Azure Function: RFQ File Upload
 * 
 * HTTP Trigger endpoint for uploading RFQ Excel files to Azure Blob Storage
 * 
 * Route: POST /api/rfq/upload
 * Content-Type: multipart/form-data
 * 
 * Request Body:
 *   - file: File (Excel file)
 *   - rfqId: string (RFQ identifier)
 * 
 * Response:
 *   {
 *     success: true,
 *     fileUrl: "https://stmilemedicaltic.blob.core.windows.net/rfq-uploads/...",
 *     fileName: "RFQ_2024_001_1699876543210.xlsx",
 *     fileSize: 145678,
 *     uploadedAt: "2024-11-14T20:30:00.000Z"
 *   }
 */

const { BlobServiceClient } = require("@azure/storage-blob");
const multipart = require("parse-multipart-data");

module.exports = async function (context, req) {
    context.log('📤 RFQ File Upload Request Received');
    
    try {
        // Validate request
        if (!req.body || req.body.length === 0) {
            context.log.error('❌ No request body');
            return createErrorResponse(context, 400, 'No file provided');
        }

        // Parse multipart form data
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes('multipart/form-data')) {
            context.log.error('❌ Invalid content type:', contentType);
            return createErrorResponse(context, 400, 'Content-Type must be multipart/form-data');
        }

        const boundary = multipart.getBoundary(contentType);
        const parts = multipart.Parse(Buffer.from(req.body), boundary);
        
        context.log(`📦 Parsed ${parts.length} form parts`);

        // Extract file and rfqId
        const filePart = parts.find(part => part.name === 'file');
        const rfqIdPart = parts.find(part => part.name === 'rfqId');

        if (!filePart) {
            context.log.error('❌ No file part found');
            return createErrorResponse(context, 400, 'File not found in request');
        }

        if (!rfqIdPart) {
            context.log.error('❌ No rfqId part found');
            return createErrorResponse(context, 400, 'rfqId not found in request');
        }

        const fileData = filePart.data;
        const originalFileName = filePart.filename || 'unknown.xlsx';
        const rfqId = rfqIdPart.data.toString('utf8');

        context.log(`📁 File: ${originalFileName} (${fileData.length} bytes)`);
        context.log(`🔖 RFQ ID: ${rfqId}`);

        // Validate file type
        const validExtensions = ['.xlsx', '.xls'];
        const fileExtension = originalFileName.substring(originalFileName.lastIndexOf('.')).toLowerCase();
        
        if (!validExtensions.includes(fileExtension)) {
            context.log.error('❌ Invalid file type:', fileExtension);
            return createErrorResponse(context, 400, 'File must be Excel format (.xlsx or .xls)');
        }

        // Validate file size (max 50MB)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (fileData.length > maxSize) {
            context.log.error('❌ File too large:', fileData.length);
            return createErrorResponse(context, 400, 'File size exceeds 50MB limit');
        }

        // Get Azure Storage connection string
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || process.env.AzureWebJobsStorage;
        
        if (!connectionString) {
            context.log.error('❌ No storage connection string configured');
            return createErrorResponse(context, 500, 'Storage not configured');
        }

        // Create blob service client
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerName = 'rfq-uploads';
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Ensure container exists
        await containerClient.createIfNotExists({
            access: 'blob' // Public read access for blobs
        });
        context.log(`✅ Container ready: ${containerName}`);

        // Generate unique blob name
        const timestamp = Date.now();
        const sanitizedRfqId = rfqId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const sanitizedFileName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const blobName = `${sanitizedRfqId}_${timestamp}_${sanitizedFileName}`;

        // Get blob client
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        // Upload file
        context.log(`📤 Uploading to blob: ${blobName}`);
        
        const uploadOptions = {
            blobHTTPHeaders: {
                blobContentType: filePart.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            },
            metadata: {
                rfqId: rfqId,
                originalFileName: originalFileName,
                uploadedAt: new Date().toISOString()
            }
        };

        await blockBlobClient.uploadData(fileData, uploadOptions);

        const fileUrl = blockBlobClient.url;
        context.log(`✅ Upload successful: ${fileUrl}`);

        // Return success response
        const response = {
            success: true,
            fileUrl: fileUrl,
            fileName: blobName,
            originalFileName: originalFileName,
            fileSize: fileData.length,
            uploadedAt: new Date().toISOString(),
            rfqId: rfqId,
            message: 'File uploaded successfully'
        };

        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: response
        };

        context.log('✅ Response sent successfully');

    } catch (error) {
        context.log.error('❌ Upload error:', error);
        
        return createErrorResponse(
            context, 
            500, 
            'File upload failed: ' + error.message,
            error.stack
        );
    }
};

/**
 * Create error response
 */
function createErrorResponse(context, statusCode, message, details = null) {
    const response = {
        success: false,
        error: message,
        statusCode: statusCode
    };

    if (details) {
        response.details = details;
    }

    context.res = {
        status: statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: response
    };

    return context.res;
}
