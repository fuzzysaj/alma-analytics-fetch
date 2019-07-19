# @fuzzysaj/alma-analytics-fetch

[![npm (scoped)](https://img.shields.io/npm/v/@fuzzysaj/alma-analytics-fetch.svg)](https://www.npmjs.com/package/@fuzzysaj/alma-analytics-fetch) [![Build Status](https://travis-ci.org/fuzzysaj/alma-analytics-fetch.svg?branch=master)](https://travis-ci.org/fuzzysaj/alma-analytics-fetch) [![dependencies Status](https://david-dm.org/fuzzysaj/alma-analytics-fetch/status.svg)](https://david-dm.org/fuzzysaj/alma-analytics-fetch) [![code coverage]( https://img.shields.io/codecov/c/github/fuzzysaj/alma-analytics-fetch.svg)](https://codecov.io/gh/fuzzysaj/alma-analytics-fetch)

Easily fetch reports from Alma Analytics API (Oracle Business Intelligence Server).  XML output is converted to JSON.  Features include:
* Automatically fetch multi-part reports.  Alma will return up to 500000 results maximum in 1000 results per page.
* Query parameters.
* Automatic conversion of boolean, numeric and date types when possible.

## Install

$ npm install @fuzzysaj/alma-analytics-fetch

## Usage

With JavaScript:

```js
const aaFetch = require('@fuzzysaj/alma-analytics-fetch').locToCounty;
const urlPath = null; // full path in unencoded form (program automatically does URL encoding).
const apiKey = null; // Alma Analytics api key
const param1 = null; // optional query parameter 1
const param2 = null; // optional query parameter 2
// and as many query parameters as needed

(async ()=> {
  const table = await aaFetch(urlPath, apiKey, param1, param2);
  // -> JSON table of results
})();
```

With TypeScript:

```ts
import { aaFetch, AATable } from '@fuzzysaj/alma-analytics-fetch'
const urlPath = null; // full path in unencoded form (program automatically does URL encoding).
const apiKey = null; // Alma Analytics api key
const param1 = null; // optional query parameter 1
const param2 = null; // optional query parameter 2
// and as many query parameters as needed

(async ()=> {
  const table: AATable = await aaFetch(urlPath, apiKey, param1, param2);
  // -> JSON table of results
})();
```
