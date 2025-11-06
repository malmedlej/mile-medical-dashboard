module.exports = async function (context, req) {
  try {
    // ✅ Use dynamic imports to fix ES Module error
    const { sp } = await import("@pnp/sp");
    const { SPFetchClient } = await import("@pnp/nodejs");
    const fetch = (await import("node-fetch")).default;

    // ✅ Setup SharePoint connection using environment variables
    sp.setup({
      sp: {
        fetchClientFactory: () =>
          new SPFetchClient(
            process.env.SHAREPOINT_SITE_URL,
            process.env.AZURE_CLIENT_ID,
            process.env.AZURE_CLIENT_SECRET
          ),
      },
    });

    // ✅ Extract RFQ data from request body
    const body = req.body || {};
    const rfqId = body.rfqId || `RFQ-${Date.now()}`;
    const matchedCount = Number(body.matchedCount) || 0;
    const totalCount = Number(body.totalCount) || 0;
    const matchRate = totalCount ? ((matchedCount / totalCount) * 100).toFixed(2) : 0;

    context.log("📦 Incoming RFQ data:", {
      rfqId,
      matchedCount,
      totalCount,
      matchRate,
    });

    // ✅ Add new item to SharePoint list
    const item = await sp.web.lists.getByTitle("TIE RFQ Archive").items.add({
      Title: rfqId,
      RFQDate: new Date().toISOString(),
      Status: "New",
      MatchedCount: matchedCount,
      TotalCount: totalCount,
      MatchRate: matchRate,
      TotalValue: body.totalValue || null,
      Notes: body.notes || "",
      MatchedItemsJSON: JSON.stringify(body.matchedItems || []),
      NotFoundItemsJSON: JSON.stringify(body.notFoundItems || []),
    });

    // ✅ Success response
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        message: `✅ RFQ ${rfqId} saved successfully.`,
        itemId: item.data.Id,
      },
    };

    context.log(`✅ RFQ ${rfqId} saved successfully with ID: ${item.data.Id}`);
  } catch (err) {
    // ❌ Error handling
    context.log.error("❌ SharePoint integration error:", err);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        error: err.message || "SharePoint integration failed.",
      },
    };
  }
};

