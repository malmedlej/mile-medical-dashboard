/**
 * Azure Function: SharePoint RFQ Storage
 * Handles CRUD operations for RFQ data in SharePoint List
 * 
 * Routes:
 * - GET    /api/rfq/list          - Get all RFQs
 * - GET    /api/rfq/get/{id}      - Get single RFQ by ID
 * - POST   /api/rfq/create        - Create new RFQ
 * - PUT    /api/rfq/update/{id}   - Update existing RFQ
 * - DELETE /api/rfq/delete/{id}   - Delete RFQ
 * - GET    /api/rfq/user          - Get current user's RFQs
 */

const { sp } = require("@pnp/sp");
require("@pnp/sp/webs");
require("@pnp/sp/lists");
require("@pnp/sp/items");
require("@pnp/sp/site-users/web");

// SharePoint configuration
const SHAREPOINT_CONFIG = {
    siteUrl: process.env.SHAREPOINT_SITE_URL || "https://milemedical365.sharepoint.com/sites/MileMedical2",
    listName: "TIE RFQ Archive"
};

module.exports = async function (context, req) {
    context.log('SharePoint RFQ Function triggered');

    // Enable CORS
    context.res = {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    };

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        context.res.status = 200;
        return;
    }

    try {
        const action = context.bindingData.action || 'list';
        const id = context.bindingData.id;

        // Initialize SharePoint connection
        await initializeSharePoint(context);

        // Route to appropriate handler
        switch (action.toLowerCase()) {
            case 'list':
                await handleList(context, req);
                break;
            case 'get':
                await handleGet(context, req, id);
                break;
            case 'create':
                await handleCreate(context, req);
                break;
            case 'update':
                await handleUpdate(context, req, id);
                break;
            case 'delete':
                await handleDelete(context, req, id);
                break;
            case 'user':
                await handleUserRFQs(context, req);
                break;
            default:
                context.res.status = 400;
                context.res.body = { error: 'Invalid action' };
        }

    } catch (error) {
        context.log.error('Error:', error);
        context.res.status = 500;
        context.res.body = {
            error: 'Internal server error',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        };
    }
};

/**
 * Initialize SharePoint connection
 */
async function initializeSharePoint(context) {
    // Configure PnPjs with Azure Function context
    sp.setup({
        sp: {
            baseUrl: SHAREPOINT_CONFIG.siteUrl,
            fetchClientFactory: () => {
                return {
                    fetch: async (url, options) => {
                        // Add authentication token from Azure AD
                        const token = await getAccessToken(context);
                        options.headers = {
                            ...options.headers,
                            'Authorization': `Bearer ${token}`
                        };
                        return fetch(url, options);
                    }
                };
            }
        }
    });
}

/**
 * Get Azure AD access token for SharePoint
 */
async function getAccessToken(context) {
    // In production, use Azure AD authentication
    // For now, we'll use the token from the request or environment
    const authHeader = context.req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }
    
    // Fallback: Use app-only token from environment
    return process.env.SHAREPOINT_ACCESS_TOKEN || '';
}

/**
 * GET /api/rfq/list - Get all RFQs
 */
async function handleList(context, req) {
    const { filter, orderBy, top, skip } = req.query;

    let query = sp.web.lists.getByTitle(SHAREPOINT_CONFIG.listName).items
        .select('Id', 'Title', 'RFQDate', 'UploadedBy/Title', 'Status', 'MatchedCount', 'TotalCount', 'MatchRate', 'TotalValue', 'Modified')
        .expand('UploadedBy');

    // Apply filters
    if (filter) {
        query = query.filter(filter);
    }

    // Apply sorting
    if (orderBy) {
        query = query.orderBy(orderBy, req.query.desc === 'true');
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

    context.res.status = 200;
    context.res.body = {
        success: true,
        count: items.length,
        data: items.map(transformItem)
    };
}

/**
 * GET /api/rfq/get/{id} - Get single RFQ
 */
async function handleGet(context, req, id) {
    if (!id) {
        context.res.status = 400;
        context.res.body = { error: 'RFQ ID is required' };
        return;
    }

    const item = await sp.web.lists.getByTitle(SHAREPOINT_CONFIG.listName).items
        .getById(parseInt(id))
        .select('*', 'UploadedBy/Title', 'UploadedBy/Email')
        .expand('UploadedBy')
        .get();

    context.res.status = 200;
    context.res.body = {
        success: true,
        data: transformItemDetailed(item)
    };
}

/**
 * POST /api/rfq/create - Create new RFQ
 */
async function handleCreate(context, req) {
    const rfqData = req.body;

    // Validate required fields
    if (!rfqData.rfqId || !rfqData.matchedItems) {
        context.res.status = 400;
        context.res.body = { error: 'Missing required fields: rfqId, matchedItems' };
        return;
    }

    // Calculate match rate
    const matchRate = rfqData.totalCount > 0 
        ? (rfqData.matchedCount / rfqData.totalCount * 100).toFixed(2)
        : 0;

    // Calculate total value
    const totalValue = calculateTotalValue(rfqData.matchedItems);

    // Prepare item data
    const itemData = {
        Title: rfqData.rfqId,
        RFQDate: rfqData.date || new Date().toISOString(),
        Status: rfqData.status || 'New',
        MatchedCount: rfqData.matchedCount || 0,
        TotalCount: rfqData.totalCount || 0,
        MatchRate: parseFloat(matchRate),
        MatchedItemsJSON: JSON.stringify(rfqData.matchedItems),
        NotFoundItemsJSON: rfqData.notFoundItems ? JSON.stringify(rfqData.notFoundItems) : null,
        TotalValue: totalValue,
        Notes: rfqData.notes || ''
    };

    // Create item in SharePoint
    const result = await sp.web.lists.getByTitle(SHAREPOINT_CONFIG.listName).items.add(itemData);

    context.res.status = 201;
    context.res.body = {
        success: true,
        message: 'RFQ created successfully',
        data: {
            id: result.data.Id,
            rfqId: rfqData.rfqId
        }
    };

    context.log(`✅ Created RFQ: ${rfqData.rfqId} (ID: ${result.data.Id})`);
}

/**
 * PUT /api/rfq/update/{id} - Update existing RFQ
 */
async function handleUpdate(context, req, id) {
    if (!id) {
        context.res.status = 400;
        context.res.body = { error: 'RFQ ID is required' };
        return;
    }

    const updates = req.body;
    const itemData = {};

    // Map allowed update fields
    const allowedFields = {
        status: 'Status',
        matchedItems: 'MatchedItemsJSON',
        notFoundItems: 'NotFoundItemsJSON',
        notes: 'Notes',
        totalValue: 'TotalValue'
    };

    Object.keys(updates).forEach(key => {
        if (allowedFields[key]) {
            const spField = allowedFields[key];
            if (key === 'matchedItems' || key === 'notFoundItems') {
                itemData[spField] = JSON.stringify(updates[key]);
            } else {
                itemData[spField] = updates[key];
            }
        }
    });

    // Recalculate total value if matchedItems updated
    if (updates.matchedItems) {
        itemData.TotalValue = calculateTotalValue(updates.matchedItems);
    }

    // Update item
    await sp.web.lists.getByTitle(SHAREPOINT_CONFIG.listName).items
        .getById(parseInt(id))
        .update(itemData);

    context.res.status = 200;
    context.res.body = {
        success: true,
        message: 'RFQ updated successfully',
        data: { id: parseInt(id) }
    };

    context.log(`✅ Updated RFQ ID: ${id}`);
}

/**
 * DELETE /api/rfq/delete/{id} - Delete RFQ
 */
async function handleDelete(context, req, id) {
    if (!id) {
        context.res.status = 400;
        context.res.body = { error: 'RFQ ID is required' };
        return;
    }

    await sp.web.lists.getByTitle(SHAREPOINT_CONFIG.listName).items
        .getById(parseInt(id))
        .delete();

    context.res.status = 200;
    context.res.body = {
        success: true,
        message: 'RFQ deleted successfully',
        data: { id: parseInt(id) }
    };

    context.log(`✅ Deleted RFQ ID: ${id}`);
}

/**
 * GET /api/rfq/user - Get current user's RFQs
 */
async function handleUserRFQs(context, req) {
    // Get current user from Azure AD token
    const currentUser = await sp.web.currentUser.get();

    const items = await sp.web.lists.getByTitle(SHAREPOINT_CONFIG.listName).items
        .select('Id', 'Title', 'RFQDate', 'Status', 'MatchedCount', 'TotalCount', 'MatchRate', 'TotalValue', 'Modified')
        .filter(`UploadedBy/Id eq ${currentUser.Id}`)
        .orderBy('RFQDate', true)
        .get();

    context.res.status = 200;
    context.res.body = {
        success: true,
        count: items.length,
        user: currentUser.Title,
        data: items.map(transformItem)
    };
}

/**
 * Helper: Transform SharePoint item to frontend format
 */
function transformItem(item) {
    return {
        id: item.Id,
        rfqId: item.Title,
        date: item.RFQDate,
        uploadedBy: item.UploadedBy?.Title || 'Unknown',
        status: item.Status,
        matchedCount: item.MatchedCount,
        totalCount: item.TotalCount,
        matchRate: item.MatchRate,
        totalValue: item.TotalValue,
        modified: item.Modified
    };
}

/**
 * Helper: Transform SharePoint item with full details
 */
function transformItemDetailed(item) {
    return {
        id: item.Id,
        rfqId: item.Title,
        date: item.RFQDate,
        uploadedBy: {
            name: item.UploadedBy?.Title || 'Unknown',
            email: item.UploadedBy?.Email || ''
        },
        status: item.Status,
        matchedCount: item.MatchedCount,
        totalCount: item.TotalCount,
        matchRate: item.MatchRate,
        matchedItems: item.MatchedItemsJSON ? JSON.parse(item.MatchedItemsJSON) : [],
        notFoundItems: item.NotFoundItemsJSON ? JSON.parse(item.NotFoundItemsJSON) : [],
        totalValue: item.TotalValue,
        notes: item.Notes || '',
        created: item.Created,
        modified: item.Modified
    };
}

/**
 * Helper: Calculate total value from matched items
 */
function calculateTotalValue(matchedItems) {
    if (!Array.isArray(matchedItems)) return 0;
    
    return matchedItems.reduce((sum, item) => {
        const price = parseFloat(item.total_price || item.unit_price || 0);
        return sum + price;
    }, 0);
}
