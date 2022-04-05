# @fuzzysaj/alma-analytics-fetch

[![npm (scoped)](https://img.shields.io/npm/v/@fuzzysaj/alma-analytics-fetch.svg)](https://www.npmjs.com/package/@fuzzysaj/alma-analytics-fetch) [![Build Status](https://travis-ci.org/fuzzysaj/alma-analytics-fetch.svg?branch=master)](https://travis-ci.org/fuzzysaj/alma-analytics-fetch) [![code coverage]( https://img.shields.io/codecov/c/github/fuzzysaj/alma-analytics-fetch.svg)](https://codecov.io/gh/fuzzysaj/alma-analytics-fetch)

Easily fetch reports from Alma Analytics API (Oracle Business Intelligence Server).  XML output is converted to JSON.  Features include:
* Automatically fetch multi-part reports.  Alma will return up to 500000 results maximum in 1000 results per page.
* Functions to identify and clean fields
* Support for filter parameter

## Install

$ npm install @fuzzysaj/alma-analytics-fetch

## Usage

With JavaScript:

```js
const getAlmaTable = require('@fuzzysaj/alma-analytics-fetch').getAlmaTable;
const rawJsonToClean = require('@fuzzysaj/alma-analytics-fetch').rawJsonToClean;
const urlPath = '/shared/My University/Reports/My Custom Report'; // full path in unencoded form (program automatically does URL encoding).
const apiKey = 'epc39ao4909b8402abieoanb04adflhhswas'; // Your Alma Analytics api keyj
const apiRootUrl = 'https://api-na.hosted.exlibrisgroup.com/almaws/v1/analytics'; // API URL. Change na to eu for Europe
// Optional Analytics report filter.  Pass in null ignore.  This is an example for passing an a loan id.
// See https://developers.exlibrisgroup.com/blog/Working-with-Analytics-REST-APIs/ for details on filter syntax
const filter = (loan_id) => { return `<sawx:expr xsi:type="sawx:comparison" op="greater" ` +
   `xmlns:saw="com.siebel.analytics.web/report/v1.1" ` +
   `xmlns:sawx="com.siebel.analytics.web/expression/v1.1" ` +
   `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
   `xmlns:xsd="http://www.w3.org/2001/XMLSchema">` +
   `<sawx:expr xsi:type="sawx:sqlExpression">EVALUATE('LPAD(%1,20,%2)', "Loan Details"."Item Loan Id", '0')</sawx:expr>` +
   `<sawx:expr xsi:type="xsd:string">${loan_id}</sawx:expr>` +
   `</sawx:expr>` };

export const loansColMap = [
  {colName: 'loan_id', pattern: /.*ATE$/ }, // pattern can be either a RegEx or a string
  {colName: 'fruit', pattern: new RegEx("Fru") }, // string patterns will be matched with String.prototype.startsWith()
  {colName: 'cost', pattern: 'Cos', 'float' } // leave undefined to leave as string, else 'int', 'float', or 'boolean'
];

(async ()=> {
  const raw = await getAlmaTable(urlPath, filter('00098765432101234565'), apiKey, apiRootUrl);
  // -> JSON table of results
  // { "cols": [ { "name": "EVALUATE('LPAD(%1,20,%2)', "Loan Details"."Item Loan Id", "type": "varchar"" }, { "name": "Fruit", "type": "varchar" }, { "name": "Cost", "type": "double" } ]
  //   "rows": [ [ "00098765432101234566", "apple", "1.99" ], [ "00098765432101234567", "orange", "2.49" ], [ "banana", "0.59" ] ] }
  const clean = rawJsonToClean(raw, loansColMap);
  // -> cleans up results
  // [
  //  { loan_id: '00098765432101234566', fruit: 'apple', cost: 1.99 },
  //  { loan_id: '00098765432101234567', fruit: 'orange', cost: 2.49 }
  // ]

})();
```

With TypeScript:

```ts
import { getAlmaTable, AATable, ColMap, rawJsonToClean } from '@fuzzysaj/alma-analytics-fetch'
// everything else the same as JavaScript example
```

Several helpful raw table data processing functions are included such as 'convertStr', 'getColPositions',
and 'rawJsonToClean'

## Limitations

Unfortunately, custom field calculations in Oracle BI are dumped out with the actual SQL definition
as the column name rather than the friendly name you might have given it in Oracle BI.  For
example, if you created `Total Count` as `COUNT(*)`, the column name will be returned as `COUNT(*)`.

## Developers of this module

To run integration tests and test scripts, the following environment variables
need to be set either in your environment, or in the not-checked-in `.env` file
in the root directory:

```
AA_API_KEY=123456789abcdefghijklmnopqrstuvwxyz
AAF_TEST_REPORT_PATH='/shared/Your Institution/Reports/My Test Report'
AAF_API_TEST_URL='https://api-na.hosted.exlibrisgroup.com/almaws/v1/analytics/test'
```

A simple of test of the API key:
```bash
npm run api-key-test
```

Fetching a test report:
```bash
npm run get-test-table
```