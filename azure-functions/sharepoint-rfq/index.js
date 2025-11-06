/**
 * Azure Function: SharePoint RFQ Integration
 * Real integration with SharePoint Online for Mile Medical TIE system
 * 
 * Site: https://milemedical365.sharepoint.com/sites/MileMedical2
 * List: TIE RFQ Archive
 * 
 * Version: 2.0 - Production Ready
 */

const { sp } = require("@pnp/sp");
const { SPFetchClient } = require("@pnp/nodejs");
require("@pnp/sp/webs");
require("@pnp/sp/lists");
require("@pnp/sp/items");
require("@pnp/sp/files");
require("@pnp/sp/folders");
require("@pnp/sp/attachments");

// SharePoint Configuration
const SHAREPOINT_CONFIG = {
    siteUrl: process.env.SHAREPOINT_SITE_URL || "https://milemedical365.sharepoint.com/sites/MileMedical2",
    listName: "TIE RFQ Archive",
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET
};

/**
 * Main Azure Function Entry Point
 */
module.exports = async function (context, req) {
    context.log('🚀 SharePoint RFQ Function - Start');
    context.log('📍 Site URL:', SHAREPOINT_CONFIG.siteUrl);
    context.log('📋 Target List:', SHAREPOINT_CONFIG.listName);

    // Enable CORS
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        context.res = { status: 200, headers };
        return;
    }

    try {
        // Validate configuration
        validateConfiguration(context);

        // Initialize SharePoint connection
        await initializeSharePoint(context);

        // Get action from route parameters
        const action = req.params.action || 'create';
        const id = req.params.id;

        context.log(`📌 Action: ${action}, ID: ${id || 'N/A'}`);

        // Route to appropriate handler
        let result;
        switch (action.toLowerCase()) {
            case 'create':
                result = await handleCreate(context, req);
                break;
            case 'list':
                result = await handleList(context, req);
                break;
            case 'get':
                result = await handleGet(context, req, id);
                break;
            case 'update':
                result = await handleUpdate(context, req, id);
                break;
            case 'delete':
                result = await handleDelete(context, req, id);
                break;
            default:
                throw new Error(`Invalid action: ${action}`);
        }

        // Success response
        context.res = {
            status: result.status || 200,
            headers,
            body: result.body
        };

    } catch (error) {
        context.log.error('❌ Function Error:', error.message);
        context.log.error('📚 Stack:', error.stack);

        // Error response
        context.res = {
            status: error.status || 500,
            headers,
            body: {
                error: error.message || 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                timestamp: new Date().toISOString()
            }
        };
    }

    context.log('🏁 SharePoint RFQ Function - End');
};

/**
 * Validate required configuration
 */
function validateConfiguration(context) {
    const required = ['siteUrl', 'clientId', 'clientSecret', 'tenantId'];
    const missing = required.filter(key => !SHAREPOINT_CONFIG[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }

    context.log('✅ Configuration validated');
}

/**
 * Initialize SharePoint connection with authentication
 */
async function initializeSharePoint(context) {
    try {
        context.log('🔐 Initializing SharePoint authentication...');

        // Configure PnPjs with SPFetchClient for Node.js
        sp.setup({
            sp: {
                fetchClientFactory: () => {
                    return new SPFetchClient(
                        SHAREPOINT_CONFIG.siteUrl,
                        SHAREPOINT_CONFIG.clientId,
                        SHAREPOINT_CONFIG.clientSecret,
                        SHAREPOINT_CONFIG.tenantId
                    );
                }
            }
        });

        context.log('✅ SharePoint connection initialized');
    } catch (error) {
        context.log.error('❌ SharePoint initialization failed:', error.message);
        throw new Error(`SharePoint authentication failed: ${error.message}`);
    }
}

/**
 * Handle CREATE - Add new RFQ to SharePoint
 */
async function handleCreate(context, req) {
    context.log('📝 Creating new RFQ item...');

    // Extract and validate RFQ data
    const body = req.body || {};
    
    if (!body.rfqId) {
        throw new Error('rfqId is required');
    }

    const rfqData = {
        rfqId: body.rfqId,
        totalCount: Number(body.totalCount) || 0,
        matchedCount: Number(body.matchedCount) || 0,
        notFound: Number(body.notFound) || Number(body.notFoundCount) || 0,
        matchRate: Number(body.matchRate) || 0,
        notes: body.notes || '',
        matchedItems: body.matchedItems || [],
        notFoundItems: body.notFoundItems || []
    };

    // Calculate match rate if not provided
    if (rfqData.totalCount > 0 && !rfqData.matchRate) {
        rfqData.matchRate = parseFloat(
            ((rfqData.matchedCount / rfqData.totalCount) * 100).toFixed(2)
        );
    }

    context.log('📊 RFQ Data:', {
        rfqId: rfqData.rfqId,
        totalCount: rfqData.totalCount,
        matchedCount: rfqData.matchedCount,
        notFound: rfqData.notFound,
        matchRate: rfqData.matchRate
    });

    try {
        // Prepare SharePoint list item data
        const listItemData = {
            Title: rfqData.rfqId,
            RFQDate: new Date().toISOString(),
            Status: body.status || 'New',
            MatchedCount: rfqData.matchedCount,
            TotalCount: rfqData.totalCount,
            NotFound: rfqData.notFound,
            MatchRate: rfqData.matchRate,
            Notes: rfqData.notes,
            MatchedItemsJSON: JSON.stringify(rfqData.matchedItems),
            NotFoundItemsJSON: JSON.stringify(rfqData.notFoundItems),
            TotalValue: body.totalValue || null
        };

        context.log('💾 Saving to SharePoint List:', SHAREPOINT_CONFIG.listName);

        // Add item to SharePoint list
        const result = await sp.web.lists
            .getByTitle(SHAREPOINT_CONFIG.listName)
            .items
            .add(listItemData);

        const itemId = result.data.Id;

        context.log(`✅ RFQ saved successfully with ID: ${itemId}`);

        // Handle file attachment if provided
        if (req.body.file || req.body.fileData) {
            context.log('📎 Processing file attachment...');
            try {
                await attachFileToItem(context, itemId, req.body);
            } catch (fileError) {
                context.log.warn('⚠️ File attachment failed:', fileError.message);
                // Don't fail the entire operation if file upload fails
            }
        }

        return {
            status: 201,
            body: {
                success: true,
                message: `✅ RFQ ${rfqData.rfqId} saved successfully.`,
                itemId: itemId,
                rfqId: rfqData.rfqId,
                matchRate: rfqData.matchRate,
                timestamp: new Date().toISOString()
            }
        };

    } catch (error) {
        context.log.error('❌ Failed to create SharePoint item:', error.message);
        throw new Error(`Failed to save RFQ to SharePoint: ${error.message}`);
    }
}

/**
 * Handle LIST - Get all RFQs from SharePoint
 */
async function handleList(context, req) {
    context.log('📋 Fetching RFQ list...');

    try {
        const { filter, orderBy, top, skip } = req.query;

        let query = sp.web.lists
            .getByTitle(SHAREPOINT_CONFIG.listName)
            .items
            .select(
                'Id', 'Title', 'RFQDate', 'Status', 
                'MatchedCount', 'TotalCount', 'NotFound', 
                'MatchRate', 'TotalValue', 'Notes', 'Created', 'Modified'
            );

        // Apply filter
        if (filter) {
            query = query.filter(filter);
        }

        // Apply sorting
        if (orderBy) {
            const desc = req.query.desc === 'true';
            query = query.orderBy(orderBy, desc);
        } else {
            query = query.orderBy('RFQDate', true); // Default: newest first
        }

        // Apply pagination
        if (top) {
            query = query.top(parseInt(top));
        }
        if (skip) {
            query = query.skip(parseInt(skip));
        }

        const items = await query.get();

        context.log(`✅ Retrieved ${items.length} RFQ items`);

        return {
            status: 200,
            body: {
                success: true,
                count: items.length,
                data: items.map(transformItem)
            }
        };

    } catch (error) {
        context.log.error('❌ Failed to fetch RFQ list:', error.message);
        throw new Error(`Failed to retrieve RFQs: ${error.message}`);
    }
}

/**
 * Handle GET - Get single RFQ by ID
 */
async function handleGet(context, req, id) {
    if (!id) {
        throw new Error('RFQ ID is required');
    }

    context.log(`🔍 Fetching RFQ with ID: ${id}`);

    try {
        const item = await sp.web.lists
            .getByTitle(SHAREPOINT_CONFIG.listName)
            .items
            .getById(parseInt(id))
            .select('*')
            .get();

        // Parse JSON fields
        if (item.MatchedItemsJSON) {
            item.matchedItems = JSON.parse(item.MatchedItemsJSON);
        }
        if (item.NotFoundItemsJSON) {
            item.notFoundItems = JSON.parse(item.NotFoundItemsJSON);
        }

        context.log(`✅ Retrieved RFQ: ${item.Title}`);

        return {
            status: 200,
            body: {
                success: true,
                data: transformItemDetailed(item)
            }
        };

    } catch (error) {
        context.log.error(`❌ Failed to fetch RFQ ID ${id}:`, error.message);
        throw new Error(`RFQ not found: ${error.message}`);
    }
}

/**
 * Handle UPDATE - Update existing RFQ
 */
async function handleUpdate(context, req, id) {
    if (!id) {
        throw new Error('RFQ ID is required');
    }

    context.log(`📝 Updating RFQ with ID: ${id}`);

    try {
        const updates = req.body || {};
        const updateData = {};

        // Map allowed fields
        const fieldMap = {
            status: 'Status',
            notes: 'Notes',
            matchedCount: 'MatchedCount',
            totalCount: 'TotalCount',
            notFound: 'NotFound',
            matchRate: 'MatchRate',
            totalValue: 'TotalValue'
        };

        Object.keys(updates).forEach(key => {
            if (fieldMap[key]) {
                updateData[fieldMap[key]] = updates[key];
            }
        });

        // Handle JSON fields
        if (updates.matchedItems) {
            updateData.MatchedItemsJSON = JSON.stringify(updates.matchedItems);
        }
        if (updates.notFoundItems) {
            updateData.NotFoundItemsJSON = JSON.stringify(updates.notFoundItems);
        }

        await sp.web.lists
            .getByTitle(SHAREPOINT_CONFIG.listName)
            .items
            .getById(parseInt(id))
            .update(updateData);

        context.log(`✅ RFQ ID ${id} updated successfully`);

        return {
            status: 200,
            body: {
                success: true,
                message: `RFQ updated successfully`,
                itemId: parseInt(id)
            }
        };

    } catch (error) {
        context.log.error(`❌ Failed to update RFQ ID ${id}:`, error.message);
        throw new Error(`Failed to update RFQ: ${error.message}`);
    }
}

/**
 * Handle DELETE - Delete RFQ
 */
async function handleDelete(context, req, id) {
    if (!id) {
        throw new Error('RFQ ID is required');
    }

    context.log(`🗑️ Deleting RFQ with ID: ${id}`);

    try {
        await sp.web.lists
            .getByTitle(SHAREPOINT_CONFIG.listName)
            .items
            .getById(parseInt(id))
            .delete();

        context.log(`✅ RFQ ID ${id} deleted successfully`);

        return {
            status: 200,
            body: {
                success: true,
                message: `RFQ deleted successfully`,
                itemId: parseInt(id)
            }
        };

    } catch (error) {
        context.log.error(`❌ Failed to delete RFQ ID ${id}:`, error.message);
        throw new Error(`Failed to delete RFQ: ${error.message}`);
    }
}

/**
 * Attach file to SharePoint list item
 */
async function attachFileToItem(context, itemId, body) {
    try {
        const fileName = body.fileName || `RFQ-${Date.now()}.xlsx`;
        const fileData = body.fileData || body.file;

        if (!fileData) {
            throw new Error('No file data provided');
        }

        // Convert base64 to buffer if needed
        let fileBuffer;
        if (typeof fileData === 'string') {
            // Remove data URL prefix if present
            const base64Data = fileData.replace(/^data:.*?;base64,/, '');
            fileBuffer = Buffer.from(base64Data, 'base64');
        } else {
            fileBuffer = fileData;
        }

        context.log(`📎 Attaching file: ${fileName} (${fileBuffer.length} bytes)`);

        await sp.web.lists
            .getByTitle(SHAREPOINT_CONFIG.listName)
            .items
            .getById(itemId)
            .attachmentFiles
            .add(fileName, fileBuffer);

        context.log(`✅ File attached successfully: ${fileName}`);

    } catch (error) {
        context.log.error('❌ File attachment failed:', error.message);
        throw error;
    }
}

/**
 * Transform SharePoint item to API format (summary)
 */
function transformItem(item) {
    return {
        id: item.Id,
        rfqId: item.Title,
        date: item.RFQDate,
        status: item.Status,
        matchedCount: item.MatchedCount || 0,
        totalCount: item.TotalCount || 0,
        notFound: item.NotFound || 0,
        matchRate: item.MatchRate || 0,
        totalValue: item.TotalValue,
        notes: item.Notes,
        created: item.Created,
        modified: item.Modified
    };
}

/**
 * Transform SharePoint item to API format (detailed)
 */
function transformItemDetailed(item) {
    return {
        id: item.Id,
        rfqId: item.Title,
        date: item.RFQDate,
        status: item.Status,
        matchedCount: item.MatchedCount || 0,
        totalCount: item.TotalCount || 0,
        notFound: item.NotFound || 0,
        matchRate: item.MatchRate || 0,
        totalValue: item.TotalValue,
        notes: item.Notes || '',
        matchedItems: item.matchedItems || [],
        notFoundItems: item.notFoundItems || [],
        created: item.Created,
        modified: item.Modified,
        author: item.Author,
        editor: item.Editor
    };
}
