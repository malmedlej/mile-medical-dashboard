/**
 * Azure Function for RFQ → SharePoint Integration
 * ✅ Works with ESM-based @pnp/sp using dynamic import
 * ✅ Compatible with CommonJS runtime (Node 18 / Azure Functions v4)
 */

let sp, SPFetchClient;

(async () => {
  const spModule = await import('@pnp/sp');
  const nodeModule = await import('@pnp/nodejs');
  sp = spModule.sp;
  SPFetchClient = nodeModule.SPFetchClient;
})();

module.exports = async function (context, req) {
  // wait a bit for dynamic import
  await new Promise((r) => setTimeout(r, 500));

  try {
    const body = req.body || {};
    const rfqId = body.rfqId || "N/A";

    context.log(`🚀 Starting SharePoint sync for RFQ: ${rfqId}`);

    // ✅ Setup SharePoint connection
    sp.setup({
      sp: {
        fetchClientFactory: () =>
          new SPFetchClient(
            process.env.SHAREPOINT_SITE_URL,
            process.env.AZURE_CLIENT_ID,
            process.env.AZURE_CLIENT_SECRET,
            process.env.AZURE_TENANT_ID
          ),
      },
    });

    // ✅ Create RFQ record
    const listName = process.env.SHAREPOINT_LIST_NAME || "TIE RFQ Archive";
    const item = await sp.web.lists.getByTitle(listName).items.add({
      Title: rfqId,
      RFQDate: new Date().toISOString(),
      Status: "New",
      MatchedCount: body.matchedCount || 0,
      TotalCount: body.totalCount || 0,
      NotFound: body.notFound || 0,
      MatchRate: body.matchRate || 0,
      Notes: body.notes || "",
      TotalValue: body.totalValue || 0,
      MatchedItemsJSON: JSON.stringify(body.matchedItems || []),
      NotFoundItemsJSON: JSON.stringify(body.notFoundItems || []),
    });

    // ✅ Respond success
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        success: true,
        message: `✅ RFQ ${rfqId} saved successfully to SharePoint.`,
        itemId: item.data.Id,
      },
    };

    context.log(`✅ RFQ ${rfqId} saved successfully with ID ${item.data.Id}`);
  } catch (err) {
    context.log.error("❌ SharePoint integration error:", err);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        success: false,
        message: "❌ SharePoint integration failed.",
        error: err.message,
      },
    };
  }
};
