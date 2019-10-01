import { getAlmaTable, AATable } from './';
import { tableToConsole, getRawTable } from './aa-fetch-table';
import Debug from 'debug';
const debug = Debug('alma-analytics-fetch');

const testReportPath = process.env.AAF_TEST_REPORT_PATH;

(async function() {
  const start = Date.now();
  try {
    const table: AATable = await getAlmaTable(testReportPath, null, process.env.AA_API_KEY, process.env.AAF_API_ROOT_URL);
    // console.log(`table:\n${JSON.stringify(table, null, 2)}`);
    tableToConsole(table);
    console.log(`fetched ${table.rows.length} rows in ${Math.round((Date.now() - start) / 1000)} seconds.`);
  } catch (err) {
    console.error('Failed with Error:', err);
  }
})();

// (async function() {
//   try {
//     const { report } = await getRawTable(testReportPath, null, null, process.env.AA_API_KEY, process.env.AAF_API_ROOT_URL, 2);
//     console.log(JSON.stringify(report, null, 2));
//   } catch (err) {
//     console.error('Failed with Error:', err);
//   }
// })();