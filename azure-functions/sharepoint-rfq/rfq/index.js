module.exports = async function (context, req) {
  try {
    const body = req.body || {};
    const rfqId = body.rfqId || "N/A";

    // simulate saving
    const item = { data: { Id: Math.floor(Math.random() * 1000) } };

    // ✅ success response
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        message: `✅ RFQ ${rfqId} saved successfully.`,
        itemId: item.data.Id
      }
    };

    context.log(`✅ RFQ ${rfqId} saved successfully with ID: ${item.data.Id}`);
  } catch (err) {
    context.log.error("❌ SharePoint integration error:", err);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        error: err.message || "SharePoint integration failed."
      }
    };
  }
};
