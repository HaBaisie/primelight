exports.handler = async (event, context) => {
  const { action, siteId, apiToken, content, file } = JSON.parse(event.body);

  const headers = {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json'
  };

  try {
    if (action === 'getForms') {
      const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/forms`, { headers });
      const data = await res.json();
      return { statusCode: res.status, body: JSON.stringify(data) };
    }

    if (action === 'getSubmissions') {
      const { formId } = JSON.parse(event.body);
      const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/forms/${formId}/submissions`, { headers });
      const data = await res.json();
      return { statusCode: res.status, body: JSON.stringify(data) };
    }

    if (action === 'updateContent') {
      // Try direct file update
      const putRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/files/site-content.json`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(content)
      });
      if (putRes.ok) {
        return { statusCode: 200, body: JSON.stringify({ success: true, method: 'direct' }) };
      }

      // Fallback to deploy
      const hash = require('crypto').createHash('sha1').update(JSON.stringify(content)).digest('hex');
      const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ files: { 'site-content.json': hash } })
      });
      const deployData = await deployRes.json();
      if (deployData.files && deployData.files['site-content.json']) {
        const uploadRes = await fetch(deployData.files['site-content.json'], {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(content)
        });
        return { statusCode: uploadRes.status, body: JSON.stringify({ success: uploadRes.ok, method: 'deploy' }) };
      }
      return { statusCode: 400, body: JSON.stringify({ error: 'No upload URL provided' }) };
    }

    if (action === 'uploadImage') {
      const { file, type } = JSON.parse(event.body);
      const buffer = Buffer.from(file, 'base64');
      const blobRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/blobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': type
        },
        body: buffer
      });
      const blobData = await blobRes.json();
      return { statusCode: blobRes.status, body: JSON.stringify(blobData) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};