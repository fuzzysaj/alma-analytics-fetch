import Debug from 'debug';
const debug = Debug('alma-analytics-fetch');
import * as querystring from 'querystring';
import axios from 'axios';
import {AAColumn, AARow, AATable} from './AATable';
import * as xml2js from 'xml2js';
const xmlParser = new xml2js.Parser({ attrkey: '$', charkey: '_' });

/**
 * Call Alma Analytis API to get desired report.  This only works for
 * reports with a single, simple table output.  An exception is likely
 * to be thrown for anything else.  Returns a Promise that resolves
 * to an AlmaTable object.
 * 
 * @param {string} path - Non-urlencoded, Alma Analytics report path.
 * @param {string} filter - Non-urlencoded.  Optional filter parmeter.  Null if not needed. 
 * @param {string} apikey - Alam Analytics API key.
 * @param {number} [maxRows] - Optionally limit maximum number of rows to return.
 */
export function getAlmaTable(path: string, filter: string, apikey: string, maxRows?: number)
  : Promise<AATable> {
  debug('In AlmaAnalyticsUtils.getAlmaTable');
  let token = null;
  let cols = null;
  let keys = null;
  let rows: Array<Array<string >> = [];
  if (maxRows == null) maxRows = 1e15;
  maxRows = roundLimit(maxRows);
  let chunkLimit = maxRows < 1000 ? maxRows : 1000;
  function handyHelper(totRows: number, cb) {
    debug(`rows so far: ${totRows}`);
    if (keys == null) {
      getInitTable(path, filter, apikey, chunkLimit).then(t => {
        token = t.token;
        cols = t.cols;
        keys = t.keys;
        totRows += t.rows.length;
        rows = rows.concat(t.rows);
        if (t.isFinished || (maxRows && totRows >= maxRows)) {
          return cb({ cols: cols, rows: rows });
        }
        return handyHelper(totRows, cb);
      });
    } else {
      getRemainderTable(keys, token, apikey, chunkLimit).then(t => {
        totRows += t.rows.length;
        rows = rows.concat(t.rows);
        if (t.isFinished || (maxRows && totRows >= maxRows)) {
          return cb({ cols: cols, rows: rows });
        }
        return handyHelper(totRows, cb);
      });  
    }
  }
  return new Promise((resolve, reject) => handyHelper(0, resolve));
}

/**
 * Return { isFinished: boolean, token: string, cols: Array<AlmaColumn>,
 *  keys: Array<string>, rows: Array<AlmaRow> }
 * @param {string} path - Non-urlencoded path to Analytics report
 * @param {string} filter - Non-urlencoded.  Optional filter parmeter.  Null if not needed.
 * @param {string} apikey - Alma Analytics API key
 * @param {number} [maxRows] - Optional limit on number of rows to return
 */
function getInitTable(path: string, filter: string, apikey: string, maxRows?: number)
  : Promise<{isFinished: boolean, token: string, cols: Array<AAColumn>,
    keys: Array<string>, rows: Array<AARow>}> {
  debug('In AlmaAnalyticsUtils.getInitTable');
  if (maxRows == null) maxRows = 1000;
  maxRows = roundLimit(maxRows);
  return getRawTable(path, filter, null, apikey, maxRows)
    .then(obj => {
      let report = obj.report;
      // debugsilly(JSON.stringify(report, null, 2));
      let keys = getKeys(report);
      return {
        isFinished: isFinished(report),
        token: getToken(report),
        cols: getCols(report),
        keys: keys,
        rows: rowsToArray(getRows(report), keys)
      };
    });
}


/**
 * Return { isFinished: boolean, token: string, rows: Array<AlmaRow> }
 * @param {string[]} keys - column keys returned by getInitTable
 * @param {string} token - token returned by getInitTable
 * @param {string} apikey - Alma Analytics API key
 * @param {number} [maxRows] - Optional limit on number of rows to return
 */
function getRemainderTable(keys: Array<string>, token: string, apikey: string, maxRows?: number)
  : Promise<{isFinished: boolean, token: string, rows: Array<AARow>}> {
  debug('In AlmaAnalyticsUtils.getRemainderTable');
  if (maxRows == null) maxRows = 1000;
  maxRows = roundLimit(maxRows);
  return getRawTable(null, null, token, apikey, maxRows)
    .then(obj => {
      let report = obj.report;
      // debugsilly(JSON.stringify(report, null, 2));
      return {
        isFinished: isFinished(report),
        token: token,
        rows: rowsToArray(getRows(report), keys)
      };
    });
}



/**
 * Return XML from Alma Anayatics API parsed into JSON
 * @param {string} path - Can be null if token is not null
 * @param {string} filter - Can be null if no filter parameter
 * @param {string} token - Can be null if path is not null
 * @param {string} apikey - Alma Analytics API key
 * @param {string} [maxRows] - Optional limit on number of rows to return
 */
export async function getRawTable(path: string, filter: string,
  token: string, apikey: string, maxRows?: number): Promise<any> {
  debug('In AlmaAnalyticsUtils.getRawTable');
  if (maxRows == null) maxRows = 1000;
  maxRows = roundLimit(maxRows);
  let params = { limit: maxRows };
  if (token) {
    params['token'] = token;
  } else {
    params['path'] = path;
    if (filter) params['filter'] = filter;
  }
  params['apikey'] = apikey;
  const qs = querystring.stringify(params);
  const url = `https://api-na.hosted.exlibrisgroup.com/almaws/v1/analytics/reports?${qs}`;
  debug(`url: ${url}`);
  let r = await axios({
    method: 'get',
    url: url,
    responseType: 'text',
    headers: { Accept: 'application/xml' } 
  });
  // let r = await axios.get(url, { responseType: 'text', headers: { Accept: 'application/xml' } });
  // debugsilly(`getRawTable, xml:\n${r.data}`);
  let parsed = await parseXml(r.data);
  return parsed;
}


function parseXml(xmlStr: string): Promise<any> {
  debug('In AlmaAnalyticsUtils.parseXml');
  return new Promise((resolve, reject) => {
    xmlParser.parseString(xmlStr, (err, result) => {
      if (err) return reject(err);
      // debugsilly(`parseXml: json: ${JSON.stringify(result,null,2)}`);
      return resolve(result);
    });
  });
}

/**
 * Analytics encodes null field values by not including the ColumnX lable at all
 * as shown in this example.  Therefore, we need to pass in a column map as well.
 * Convert something like { Column0: [ 'foo' ], Column2: [ 'baz' ]} to ['foo', null, 'baz'].
 * 
 * @param row - Row object.  Eg. { Column0: [ 'foo' ], Column2: [ 'baz' ]}
 * @param keys - keys that should be in the row.  Eg. [ 'Column0', 'Column1', 'Column2' ]
 */
function parseRow(row: any, keys: Array<string>): AARow {
  return keys.map(k => (row[k] == null) ? null : row[k][0]);
}

function rowsToArray(rows: any, keys: Array<string>): Array<AARow> {
  let a: Array<AARow> = [];
  if (rows == null) return a;
  for (let row of rows) {
    a.push(parseRow(row, keys));
  }
  return a;
}

/**
 * Convert something like [ { $: {"saw-sql:columnHeading": 'foo', "saw-sql:type": 'varchar'} } ]
 * to [{name: 'foo', type: 'varchar'}]
 * @param cols - Analytics columns section
 */
function parseCols(cols: Array<{ $: any }>): Array<AAColumn> {
  return cols.map(x => ({ name: x.$["saw-sql:columnHeading"], type: x.$["saw-sql:type"] }));
}

/**
 * Convert something like [ { $: {name: 'Column0' } }, { $: {name: 'Column1' } } ]
 * to ['Column0', 'Column1']
 * @param cols - Analytics columns section
 */
function parseKeys(cols: Array<{ $: any }>): Array<string> {
  return cols.map(x => x.$.name);
}

function isFinished(report: any): boolean {
  return !!report.QueryResult[0].IsFinished[0];
}

function getToken(report: any): string {
  return report.QueryResult[0].ResumptionToken[0];
}

function getRows(report: any): string {
  return report.QueryResult[0].ResultXml[0].rowset[0].Row;
}

function getCols(report: any): Array<AAColumn> {
  const c = report.QueryResult[0].ResultXml[0]
    .rowset[0]['xsd:schema'][0]["xsd:complexType"][0]["xsd:sequence"][0]["xsd:element"];
  return parseCols(c);
}

function getKeys(report: any): Array<string> {
  const c = report.QueryResult[0].ResultXml[0]
    .rowset[0]['xsd:schema'][0]["xsd:complexType"][0]["xsd:sequence"][0]["xsd:element"];
  return parseKeys(c);
}
/**
 * This is meant for debugging purposes only.  Will print output of
 * Alma Table 
 * @param t - AlmaTable like object
 */
export function printTable(t: any) {
  debug('rows:');
  // for (let r of t.rows) debugdebug(JSON.stringify(r));
  if (t.hasOwnProperty('cols')) {
    debug('cols:');
    for (let c of t.cols) debug(JSON.stringify(c));
  }
  if (t.hasOwnProperty('isFinished')) debug(`isFinished? ${t.isFinished.toString()}`);
  if (t.hasOwnProperty('token')) debug(`token ${t.token}`);
}

/**
 * Analytics Api requires rows limit in multiples of 25.  So, round up to
 * nearest multiple of 25.
 */
function roundLimit(limit: number): number {
  limit = Math.trunc(limit);
  if (limit <= 25) return 25;
  let r = limit % 25;
  let q = Math.floor(limit / 25);
  if (r === 0) return limit;
  return (q + 1) * 25;
}

export const fineFieldMapping = [
  { name: 'Fine Fee Id', sqlType: 'varchar', prop: 'fine_id', propType: 'string' },
  { name: 'Fine Fee Type', sqlType: 'varchar', prop: 'fine_type', propType: 'string' },
  { name: 'Original Amount', sqlType: 'double', prop: 'original_amount', propType: 'numeric' },
  { name: 'Remaining Amount', sqlType: 'double', prop: 'remaining_amount', propType: 'numeric' },
  { name: 'Fine Fee Creation Date', sqlType: 'timestamp', prop: 'fine_creation_date', propType: 'Date' },

  { name: 'Primary Identifier', sqlType: 'varchar', prop: 'user_id', propType: 'string' },

  { name: 'Status Date', sqlType: 'timestamp', prop: 'status_date', propType: 'Date' },
  { name: 'Fine Fee Status', sqlType: 'varchar', prop: 'fine_status', propType: 'string' },
  { name: 'Fine Fee Modification Date', sqlType: 'timestamp', prop: 'fine_modify_date', propType: 'Date' },
  { name: 'Fine Comment', sqlType: 'varchar', prop: 'fine_note', propType: 'string' },

  { name: 'Fine Fee Transaction Id', sqlType: 'varchar', prop: 'trans_id', propType: 'string' },
  { name: 'Fine FeeTransaction Type', sqlType: 'varchar', prop: 'trans_type', propType: 'string' },
  { name: 'Transaction Amount', sqlType: 'double', prop: 'trans_amount', propType: 'numeric' },
  { name: 'Fine Fee Transaction Creation Date', sqlType: 'timestamp', prop: 'trans_creation_date', propType: 'Date' },
  { name: 'Transaction Note', sqlType: 'varchar', prop: 'trans_note', propType: 'string' },

  { name: 'Barcode', sqlType: 'varchar', prop: 'item_barcode', propType: 'string' }
];

export const analyticsTypeToJsonMap = {
  'varchar': 'string',
  'char': 'string',
  'double': 'numeric',
  'integer': 'numeric',
  'float': 'numeric',
  'int': 'numeric',
  'timestamp': 'date',
  'date': 'date'
};
