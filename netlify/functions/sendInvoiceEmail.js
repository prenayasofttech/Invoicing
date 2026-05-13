exports.handler = async function (event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { toEmail, toName, invoiceNo, projectName, amount, pdfBase64, fromEmail, fromName } = JSON.parse(event.body);

    const API_KEY = "a370b789186216180d099fb5de124b17";
    const SECRET_KEY = "2e2e366aca728ec63db59951b9f4634c";

    // Use the verified Mailjet sender email, but keep the company name dynamic
    const senderEmail = "sanketg367@gmail.com";
    const senderName = fromName || "LeaseOS Invoicing";

    const auth = Buffer.from(`${API_KEY}:${SECRET_KEY}`).toString('base64');

    const response = await fetch("https://api.mailjet.com/v3.1/send", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        Messages: [
          {
            From: {
              Email: senderEmail,
              Name: senderName
            },
            To: [
              {
                Email: toEmail,
                Name: toName
              }
            ],
            Subject: `Invoice ${invoiceNo} from ${projectName}`,
            HTMLPart: `
              <h3>Hello ${toName},</h3>
              <p>Please find attached your invoice <strong>${invoiceNo}</strong> for ${projectName}.</p>
              <p>Total Amount: ₹${amount.toLocaleString('en-IN')}</p>
              <br/>
              <p>Regards,<br/>LeaseOS Team</p>
            `,
            // Mailjet allows attachments, but sending HTML is simpler for this prototype
            Attachments: pdfBase64 ? [
              {
                ContentType: "application/pdf",
                Filename: `Invoice_${invoiceNo}.pdf`,
                Base64Content: pdfBase64.split(',')[1] || pdfBase64 // strip data:application/pdf;base64, prefix if present
              }
            ] : []
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data }),
        headers: { 'Access-Control-Allow-Origin': '*' }
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data }),
      headers: { 'Access-Control-Allow-Origin': '*' }
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
      headers: { 'Access-Control-Allow-Origin': '*' }
    };
  }
};
