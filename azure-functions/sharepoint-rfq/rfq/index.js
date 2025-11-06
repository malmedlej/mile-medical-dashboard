const { BlobServiceClient } = require('@azure/storage-blob');
const fetch = require('node-fetch');
const { DefaultAzureCredential } = require('@azure/identity');

module.exports = async function (context, myBlob) {
  try {
    const blobName = context.bindingData.name;
    const blobUrl = `https://stmilemedicaltic.blob.core.windows.net/rfq-uploads/${blobName}`;

    context.log(`📦 New RFQ detected: ${blobName}`);
    context.log(`➡️  Blob URL: ${blobUrl}`);

    // ==========================================================
    // 1️⃣  Authenticate using Managed Identity (secure, no secrets)
    // ==========================================================
    const credential = new DefaultAzureCredential();
    const tokenResponse = await credential.getToken('https://graph.microsoft.com/.default');
    const accessToken = tokenResponse.token;

    // ==========================================================
    // 2️⃣  Prepare SharePoint List Item payload
    // ==========================================================
    const itemPayload = {
      fields: {
        Title: blobName,
        Status: 'Uploaded',
        'Uploaded By': 'Azure Function',
        'RFQ Date': new Date().toISOString(),
        Notes: blobUrl
      }
    };

    // ==========================================================
    // 3️⃣  POST to Microsoft Graph SharePoint List endpoint
    // ==========================================================
    const siteId = 'milemedical365.sharepoint.com,6c7cfb5f-xxxx-xxxx-xxxx-xxxxxxxxxxxx,8d7c3c6a-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; // ⚠️ Replace with your Site ID
    const listId = 'TIE RFQ Archive'; // You can also use the list GUID if preferred

    const endpoint = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(itemPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Graph API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    context.log(`✅ SharePoint item created: ${result.id}`);

  } catch (error) {
    context.log.error(`❌ Error processing blob: ${error.message}`);
  }
};
