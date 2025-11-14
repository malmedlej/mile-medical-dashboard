const { DefaultAzureCredential } = require("@azure/identity");
const fetch = require("node-fetch");

module.exports = async function (context, myBlob) {
  try {
    const blobName = context.bindingData.name;
    const blobUrl = `https://stmilemedicaltic.blob.core.windows.net/rfq-uploads/${blobName}`;
    const uploadedAt = new Date().toISOString();

    context.log(`📦 Detected new RFQ upload: ${blobName}`);
    context.log(`🔗 Blob URL: ${blobUrl}`);

    // ==========================================================
    // 1️⃣ Authenticate with Microsoft Graph via Managed Identity
    // ==========================================================
    const credential = new DefaultAzureCredential();
    const tokenResponse = await credential.getToken("https://graph.microsoft.com/.default");
    const accessToken = tokenResponse.token;

    // ==========================================================
    // 2️⃣ Prepare the new SharePoint list item
    // ==========================================================
    const itemPayload = {
      fields: {
        Title: blobName,
        Status: "Uploaded",
        "RFQ Date": uploadedAt,
        "Uploaded By": "Azure Function",
        Notes: blobUrl
      }
    };

    // ==========================================================
    // 3️⃣ Replace the following with your exact Site & List IDs
    // ==========================================================
    const siteId = "milemedical365.sharepoint.com,xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx,xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
    const listId = "TIE RFQ Archive"; // Or use list GUID if available

    const endpoint = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${encodeURIComponent(listId)}/items`;

    // ==========================================================
    // 4️⃣ Send request to Microsoft Graph
    // ==========================================================
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(itemPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Graph API error: ${response.status} - ${errText}`);
    }

    const result = await response.json();
    context.log(`✅ SharePoint item created: ID ${result.id}`);

  } catch (error) {
    context.log.error(`❌ Function failed: ${error.message}`);
  }
};
