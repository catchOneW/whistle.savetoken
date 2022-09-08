const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');
const { check: checkFilter, update: updateFilter } = require('./filter');

const MAX_LENGTH = 10;
const noop = () => {};

module.exports = (server, { storage }) => {
  let sessions = [];
  let timer;
  const writeSessions = (dir,req) => {
    try {
      let requrl=url.parse(req.url)
      let obj=querystring.parse(requrl.query)
      const text = JSON.stringify({access_token:obj.access_token}, null, '  ');
      sessions = [];
      dir = path.resolve(dir, `token.json`);
      fs.writeFile(dir, text, (err) => {
        if (err) {
          fs.writeFile(dir, text, noop);
        }
      });
    } catch (e) {}
  };
  updateFilter(storage.getProperty('filterText'));
  server.on('request', (req) => {
    // filter
    const active = storage.getProperty('active');
    if (!active) {
      return;
    }
    const dir = storage.getProperty('sessionsDir');
    if (!dir || typeof dir !== 'string') {
      sessions = [];
      return;
    }
    if (!checkFilter(req.originalReq.url)) {
      return;
    }
    req.getSession((s) => {
      if (!s) {
        return;
      }
      clearTimeout(timer);
      sessions.push(s);
      if (sessions.length >= MAX_LENGTH) {
        writeSessions(dir,req);
      } else {
        // 10秒之内没满10条强制写入
        timer = setTimeout(() => writeSessions(dir,req), 10000);
      }
    });
  });
};
