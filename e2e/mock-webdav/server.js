const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = 8080;

// Enable CORS for e2e testing
app.use(
  cors({
    origin: 'http://localhost:4200',
    credentials: true,
    methods: ['GET', 'PUT', 'DELETE', 'OPTIONS', 'PROPFIND', 'MKCOL'],
    allowedHeaders: ['*'],
    exposedHeaders: ['ETag', 'Last-Modified', 'Content-Type'],
  }),
);

// Store files in memory
const files = new Map();

// Middleware to parse body
app.use(express.raw({ type: '*/*', limit: '10mb' }));

// Generate ETag
function generateETag(content) {
  return `"${crypto
    .createHash('md5')
    .update(content || '')
    .digest('hex')}"`;
}

// Generate Last-Modified timestamp
function generateLastModified() {
  return new Date().toUTCString();
}

// Basic auth check
function checkAuth(req, res) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    res.status(401).send('Unauthorized');
    return false;
  }

  const credentials = Buffer.from(auth.slice(6), 'base64').toString();
  if (credentials !== 'test:testpass') {
    res.status(401).send('Unauthorized');
    return false;
  }

  return true;
}

// PROPFIND - List directory or get file metadata
app.propfind('*', (req, res) => {
  if (!checkAuth(req, res)) return;

  const path = req.path;
  console.log('PROPFIND:', path);

  const file = files.get(path);

  let response = '<?xml version="1.0" encoding="utf-8"?>';
  response += '<d:multistatus xmlns:d="DAV:">';

  if (file) {
    // File exists - return its metadata
    response += '<d:response>';
    response += `<d:href>${path}</d:href>`;
    response += '<d:propstat>';
    response += '<d:prop>';
    response += '<d:resourcetype/>';
    response += `<d:getcontentlength>${file.content.length}</d:getcontentlength>`;
    response += `<d:getetag>${file.etag}</d:getetag>`;
    response += `<d:getlastmodified>${file.lastModified}</d:getlastmodified>`;
    response += '</d:prop>';
    response += '<d:status>HTTP/1.1 200 OK</d:status>';
    response += '</d:propstat>';
    response += '</d:response>';
  } else {
    // Directory or non-existent file
    response += '<d:response>';
    response += `<d:href>${path}</d:href>`;
    response += '<d:propstat>';
    response += '<d:prop>';
    response += '<d:resourcetype><d:collection/></d:resourcetype>';
    response += '</d:prop>';
    response += '<d:status>HTTP/1.1 200 OK</d:status>';
    response += '</d:propstat>';
    response += '</d:response>';
  }

  response += '</d:multistatus>';

  res.status(207).set('Content-Type', 'application/xml').send(response);
});

// GET - Read file
app.get('*', (req, res) => {
  if (!checkAuth(req, res)) return;

  const path = req.path;
  const file = files.get(path);

  if (!file) {
    res.status(404).send('Not Found');
    return;
  }

  res.set({
    ETag: file.etag,
    'Last-Modified': file.lastModified,
  });
  res.send(file.content);
});

// PUT - Write file
app.put('*', (req, res) => {
  if (!checkAuth(req, res)) return;

  const path = req.path;
  const content = req.body;

  const etag = generateETag(content);
  const lastModified = generateLastModified();

  // Check conditional headers
  const ifMatch = req.headers['if-match'];
  const ifNoneMatch = req.headers['if-none-match'];

  if (ifMatch && files.has(path)) {
    const currentFile = files.get(path);
    if (ifMatch !== currentFile.etag) {
      res.status(412).send('Precondition Failed');
      return;
    }
  }

  if (ifNoneMatch === '*' && files.has(path)) {
    res.status(412).send('Precondition Failed');
    return;
  }

  files.set(path, { content, etag, lastModified });
  console.log('PUT:', path, `etag: ${etag}, lastModified: ${lastModified}`);

  res.set({
    ETag: etag,
    'Last-Modified': lastModified,
  });
  res.status(201).send();
});

// DELETE - Delete file
app.delete('*', (req, res) => {
  if (!checkAuth(req, res)) return;

  const path = req.path;

  if (!files.has(path)) {
    res.status(404).send('Not Found');
    return;
  }

  files.delete(path);
  console.log('DELETE:', path);
  res.status(204).send();
});

// MKCOL - Create directory
app.mkcol('*', (req, res) => {
  if (!checkAuth(req, res)) return;
  res.status(201).send();
});

// OPTIONS - Handle preflight
app.options('*', (req, res) => {
  res.status(200).send();
});

app.listen(PORT, () => {
  console.log(`Mock WebDAV server running on http://localhost:${PORT}`);
  console.log('User: test/testpass');
  console.log('Supports: ETag, Last-Modified, conditional headers');
});
