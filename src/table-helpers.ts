import Debug from 'debug';
const debug = Debug('alma-analytics-fetch');
import {AAColumn, AATable} from './AATable';

export type ConvertType = 'int' | 'float' | 'boolean';
export type DataType = string | number | boolean;
export type ColMap = {colName: string, pattern: string | RegExp, convertTo?: ConvertType };
type ColPosToMap = { colPos: number, colMap: ColMap };

/**
 * Example for colMaps: [ {colName: 'location', pattern: 'Library'},
 *                        {colName: 'count', pattern: 'Loans', convertTo: 'int' } ]
 * where 'pattern' is a string that the raw data column name starts with
 * and where 'colName' is the new name to map that to in the cleaned up table
 * and where the optional attribute 'convertTo' specifies if a string should be converted to int or float.
 * Note: convertTo is not used by this function.
 * Example of return: [ colPos: 1, colMap: {colName: 'location', pattern: 'Library'},
 *                      colPos: 0, colMap: {colName: 'count', pattern: 'Loans', convertTo: 'int' } ]
 @param cols - raw column data to match on
 @param colMaps - mapping for column field names
 @returns map of column positions.  -1 will be returned for columns with no match
 */
export function getColPositions(cols: AAColumn[], colMaps: ColMap[]): ColPosToMap[] {
  const p2ms = new Array<ColPosToMap>();
  for (const cm of colMaps) {
    let pos = -1;
    if (cm.pattern instanceof RegExp) {
      const re: RegExp = cm.pattern;
      pos = cols.findIndex(c => c.name.match(re));
    } else {
      const str: string = cm.pattern;
      pos = cols.findIndex(c => c.name.startsWith(str));
    }
    p2ms.push({
      colPos: pos,
      colMap: cm
    });
  }
  return p2ms;
}

/**
 * 
 * @param s - Input string to be converted
 * @param cType - If null, then original string returned, otheriwse
 *   convert to type specified.  In the case of target 'boolean',
 *   case-insensitive values of '', 'false', 'no', 'null', 'none' or '0'
 *   all result in false.  Otherwise true.
 */
export function convertStr(s: string, cType?: ConvertType): DataType {
  if (s === null || s === undefined) return s;
  if (!cType) return s;
  if (cType === 'int') return parseInt(s);
  if (cType === 'float') return parseFloat(s);
  if (cType === 'boolean') {
    if ( !s || s === '' ||
      s.localeCompare('false', 'en', {sensitivity: 'base'}) === 0 ||
      s.localeCompare('no', 'en', {sensitivity: 'base'}) === 0 ||
      s.localeCompare('null', 'en', {sensitivity: 'base'}) === 0 ||
      s.localeCompare('none', 'en', {sensitivity: 'base'}) === 0 ||
      s === '0'
    ) {
      return false;
    }
    return true;
  }
  return s;
}


/**
 * Convert result of getJsonReport to desired output schema:
 * [ { location: 'DESIGN', count 1045 },
 *   { location: 'DOWNTOWN', count 232 },
 *   { locaiton: 'HAYDEN', count 14576 } ]
 * @param rawReport - Data as recieved from getAlmaTable
 * @param colMaps - Array of column names (staring sequence of characters to match on) to data type.  E.g.
 * [ {colName: 'affil', pattern: 'CASE '},
 *   {colName: 'date', pattern: 'DESCRIPTOR_IDOF(Loan Date)'},
 *   {colName: 'count', pattern: 'Loans', convertTo: 'int'} ]
 *   Note that convertTo parameter is not needed for string data types.
 */
 export function rawJsonToClean(rawReport: AATable, colMaps: ColMap[]): Array<any> {
  const c2pms = getColPositions(rawReport.cols, colMaps);
  debug(`columns to position mapping: ${JSON.stringify(c2pms)}`);
  function rawRowToClean(row: string[]): {[key: string]: DataType} {
    let obj = {};
    for (const c2pm of c2pms) {
      const i = c2pm.colPos;
      const c2m = c2pm.colMap;
      obj = {...obj, ...{[c2m.colName]: convertStr(row[i]?.trim(), c2m.convertTo)}};
    }
    return obj;
  }
  return rawReport.rows.map(rawRowToClean);
}
