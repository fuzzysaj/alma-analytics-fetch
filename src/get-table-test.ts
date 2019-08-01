import { getAlmaTable, AATable } from './';
import Debug from 'debug';
const debug = Debug('alma-analytics-fetch');

const testReportPath = process.env.AAF_TEST_REPORT_PATH;

(async function() {
  const table: AATable = await getAlmaTable(testReportPath, null, process.env.AA_API_KEY);
  console.log(`table:\n${JSON.stringify(table, null, 2)}`);

})();