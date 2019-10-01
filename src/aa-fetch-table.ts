import Debug from 'debug';
const debug = Debug('alma-analytics-fetch');
import * as querystring from 'querystring';
import axios, { AxiosResponse } from 'axios';
import {AAColumn, AARow, AATable} from './AATable';
import { AlmaApiError } from './AlmaApiError';
import * as xml2js from 'xml2js';
const xmlParser = new xml2js.Parser({ attrkey: '$', charkey: '_' });

/**
 * Call Alma Analytis API to get desired report.  This only works for
 * reports with a single, simple table output.  An exception is likely
 * to be thrown for anything else.  Returns a Promise that resolves
 * to an AlmaTable object.  When not successful, an error is thrown
 * 
 * @param {string} path - Non-urlencoded, Alma Analytics report path.
 * @param {string} filter - Non-urlencoded.  Optional filter parmeter.  Null if not needed. 
 * @param {string} apiKey - Alam Analytics API key.
 * @param {string} apiRootUrl - Root analytics URL.  E.g. https://api-na.hosted.exlibrisgroup.com/almaws/v1/analytics 
 * @param {number} [maxRows] - Optionally limit maximum number of rows to return.
 */
export async function getAlmaTable(path: string, filter: string, apiKey: string,
  apiRootUrl: string, maxRows?: number)
  : Promise<AATable> {
  debug('In AlmaAnalyticsUtils.getAlmaTable');
  const start = Date.now();
  if (!maxRows) maxRows = 500000;
  maxRows = roundLimit(maxRows);
  let totRows = 0;
  let chunkLimit = maxRows < 1000 ? maxRows : 1000;
  const t = await getInitTable(path, filter, apiKey, apiRootUrl, chunkLimit);
  const token = t.token;
  const cols = t.cols;
  const keys = t.keys;
  totRows += t.rows.length;
  let rows: Array<Array<string >> = [];
  rows = rows.concat(t.rows);
  let fin = t.isFinished;
  debug(`finished?: ${fin}`);

  while (!fin && totRows <= maxRows) {
    const t = await getRemainderTable(keys, token, apiKey, apiRootUrl, chunkLimit);
    totRows += t.rows.length;
    debug(`returned ${t.rows.length} rows with new total row count ${totRows}`);
    rows = rows.concat(t.rows);
    fin = t.isFinished;
    debug(`finished?: ${fin}`);
  }

  debug(`fetched ${rows.length} rows in ${Math.round((Date.now() - start) / 1000)} seconds.`);
  return ({ cols: cols, rows: rows });
}

/**
 * Return { isFinished: boolean, token: string, cols: Array<AlmaColumn>,
 *  keys: Array<string>, rows: Array<AlmaRow> }
 * @param {string} path - Non-urlencoded path to Analytics report
 * @param {string} filter - Non-urlencoded.  Optional filter parmeter.  Null if not needed.
 * @param {string} apiKey - Alma Analytics API key
 * @param {string} apiRootUrl - Root analytics URL.  E.g. https://api-na.hosted.exlibrisgroup.com/almaws/v1/analytics
 * @param {number} [maxRows] - Optional limit on number of rows to return
 */
async function getInitTable(path: string, filter: string, apiKey: string,
  apiRootUrl: string, maxRows?: number)
  : Promise<{isFinished: boolean, token: string, cols: Array<AAColumn>,
    keys: Array<string>, rows: Array<AARow>}> {

  debug('In AlmaAnalyticsUtils.getInitTable');
  if (!maxRows) maxRows = 1000;
  maxRows = roundLimit(maxRows);
  const { report } = await getRawTable(path, filter, null, apiKey, apiRootUrl, maxRows);
  let keys = getKeys(report);
  return ({
    isFinished: isFinished(report),
    token: getToken(report),
    cols: getCols(report),
    keys: keys,
    rows: rowsToArray(getRows(report), keys)
  });
}


/**
 * Return { isFinished: boolean, token: string, rows: Array<AlmaRow> }
 * @param {string[]} keys - column keys returned by getInitTable
 * @param {string} token - token returned by getInitTable
 * @param {string} apiKey - Alma Analytics API key
 * @param {string} apiRootUrl - Root analytics URL.  E.g. https://api-na.hosted.exlibrisgroup.com/almaws/v1/analytics
 * @param {number} [maxRows] - Optional limit on number of rows to return
 */
async function getRemainderTable(keys: Array<string>, token: string, apiKey: string,
  apiRootUrl: string, maxRows?: number)
  : Promise<{isFinished: boolean, token: string, rows: Array<AARow>}> {

  debug('In AlmaAnalyticsUtils.getRemainderTable');
  if (!maxRows) maxRows = 1000;
  maxRows = roundLimit(maxRows);
  const { report } = await getRawTable(null, null, token, apiKey, apiRootUrl, maxRows);
  return ({
    isFinished: isFinished(report),
    token: token,
    rows: rowsToArray(getRows(report), keys)
  });
}

/**
 * Return XML from Alma Anayatics API parsed into JSON
 * @param {string} path - Can be null if token is not null
 * @param {string} filter - Can be null if no filter parameter
 * @param {string} token - Can be null if path is not null
 * @param {string} apiKey - Alma Analytics API key
 * @param {string} apiRootUrl - Root analytics URL.  E.g. https://api-na.hosted.exlibrisgroup.com/almaws/v1/analytics
 * @param {string} [maxRows] - Optional limit on number of rows to return
 */
export async function getRawTable(path: string, filter: string,
  token: string, apiKey: string, apiRootUrl: string, maxRows?: number): Promise<any> {

  debug('In AlmaAnalyticsUtils.getRawTable');
  if (!maxRows) maxRows = 1000;
  maxRows = roundLimit(maxRows);
  let params = { limit: maxRows };
  if (token) {
    params['token'] = token;
  } else {
    params['path'] = path;
    if (filter) params['filter'] = filter;
  }
  const qs = querystring.stringify(params);
  const url = `${apiRootUrl}/reports?${qs}`;
  debug(`url: ${url}`);

  try {
    const r = await axios({
      method: 'get',
      url: url,
      responseType: 'text',
      headers: {
        Accept: 'application/xml',
        Authorization: `apikey ${apiKey}`
      }
    });
    const parsed = await parseXml(r.data);
    return parsed;
  } catch (err) {
    const apiError = new AlmaApiError(err);
    debug(`GET rejected with Error`, apiError);
    throw new AlmaApiError(apiError);
  }
}

function parseXml(xmlStr: string): Promise<any> {
  debug('In AlmaAnalyticsUtils.parseXml');
  return new Promise((resolve, reject) => {
    xmlParser.parseString(xmlStr, (err, result) => {
      if (err) return reject(err);
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
  return cols.map(x => ({ name: x.$["saw-sql:columnHeading"].trim(), type: x.$["saw-sql:type"] }))
    .filter(x => (x.name !== 0 && x.name !== "0"));
}

/**
 * Convert something like [ { $: {name: 'Column0' } }, { $: {name: 'Column1' } } ]
 * to ['Column0', 'Column1']
 * @param cols - Analytics columns section
 */
function parseKeys(cols: Array<{ $: any }>): Array<string> {
  return cols.map(x => x.$.name.trim()).filter(x => x !== 'Column0');
}

function getQueryResult(report: any): any {
  if (!report || !report.QueryResult || !report.QueryResult[0]) {
    debug(`getQueryResult detected undefined report.QueryResult[0]!`);
    return undefined;
  }
  const qr = report.QueryResult[0];
  return qr;
}

export function isFinished(report: any): boolean {
  const qr = getQueryResult(report);
  const isFin = qr.IsFinished[0];
  if (isFin === undefined) return true;
  if (typeof isFin === 'boolean') return isFin;
  if (typeof isFin !== 'string') {
    debug(`IsFinished[0] is of type ${typeof isFin}, returning false`);
    return false;
  }
  return (isFin as string).localeCompare('false') !== 0;
}

export function getToken(report: any): string {
  return getQueryResult(report).ResumptionToken[0];
}

export function getRows(report: any): string {
  return getQueryResult(report).ResultXml[0].rowset[0].Row;
}

export function getCols(report: any): Array<AAColumn> {
  const c = getQueryResult(report).ResultXml[0]
    .rowset[0]['xsd:schema'][0]["xsd:complexType"][0]["xsd:sequence"][0]["xsd:element"];
  return parseCols(c);
}

export function getKeys(report: any): Array<string> {
  const c = getQueryResult(report).ResultXml[0]
    .rowset[0]['xsd:schema'][0]["xsd:complexType"][0]["xsd:sequence"][0]["xsd:element"];
  return parseKeys(c);
}

/**
 * This is meant for debugging purposes only.  Will print output of
 * AATable or the temporary object that looks like AATable but with
 * additional bookeeping attributes.
 * @param t - AlmaTable like object
 */
export function tableToConsole(t: any, maxRows: number = 10): void {  
  if (t.hasOwnProperty('cols')) {
    console.log('cols:');
    for (let c of t.cols) console.log(JSON.stringify(c));
  }
  console.log(`rows (at most first ${maxRows}) of ${t.rows.length} rows total:`);
  for (let i = 0; i < Math.min(maxRows, t.rows.length); ++i) console.log(JSON.stringify(t.rows[i]));
  if (t.hasOwnProperty('isFinished')) console.log(`isFinished? ${t.isFinished.toString()}`);
  if (t.hasOwnProperty('token')) console.log(`token ${t.token}`);
}

/**
 * Analytics API requires rows limit in multiples of 25. This function
 * rounds numbers up to nearest whole number multiple of 25.
 */
export function roundLimit(limit: number): number {
  limit = Math.trunc(limit);
  if (limit <= 25) return 25;
  let r = limit % 25;
  let q = Math.floor(limit / 25);
  if (r === 0) return limit;
  return (q + 1) * 25;
}

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
