import { AlmaApiError } from './';
import axios, { AxiosResponse }  from 'axios';
import Debug from 'debug';
const debug = Debug('alma-analytics-fetch');

async function testApiKey(): Promise<AxiosResponse> {
  const testUrl = process.env.AAF_API_ROOT_URL + '/test';
  debug(`GET ${testUrl}`);
  const r = await axios({
    method: 'get',
    url: testUrl,
    responseType: 'text',
    headers: {
      Accept: 'application/xml',
      Authorization: `apikey ${process.env.AA_API_KEY}`,
    }
  });
  return r;
}

(async () => {
  try {
    const r = await testApiKey();
    console.log(`Response status: ${r.status}`);
    console.log(`Reponse data:\n${r.data}`);
  } catch (err) {
    console.log(`GET request failed with error`, {
      response: {
        status: err.response ? err.response.status : undefined,
        statusText: err.response ? err.response.statusText : undefined
      },
      data: err.response ? err.response.data : undefined
    });
    console.log(`GET request failed with error`, new AlmaApiError(err));
  } 
})();
