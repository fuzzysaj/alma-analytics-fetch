import { getAlmaTable } from './';
import axios from 'axios';
import Debug from 'debug';
const debug = Debug('alma-analytics-fetch');

(async () => {
  debug(`GET ${process.env.AAF_API_TEST_URL}`);
  const r = await axios({
    method: 'get',
    url: process.env.AAF_API_TEST_URL,
    responseType: 'text',
    headers: {
      Accept: 'application/xml',
      Authorization: `apikey ${process.env.AA_API_KEY}`,
    }
  });

  console.log(`Response status: ${r.status}`);
  console.log(`Reponse data:\n${r.data}`);
})();
