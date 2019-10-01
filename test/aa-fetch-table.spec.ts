import { AATable, getAlmaTable  } from '../src';
import { roundLimit } from '../src/aa-fetch-table';
import 'mocha';
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
const expect = chai.expect;

describe('aa-fetch-table', function() {
  describe('roundLimit correctness', function() {
    it('When <= 25, returns 25', function() {
      expect(roundLimit(-10)).to.equal(25);
      expect(roundLimit(0)).to.equal(25);
      expect(roundLimit(24)).to.equal(25);
      expect(roundLimit(25)).to.equal(25);
    });
    it('When > 25, returns number rounded to next highest multiple of 25', function() {
      expect(roundLimit(25)).to.equal(25);
      expect(roundLimit(26)).to.equal(50);
      expect(roundLimit(1000001)).to.equal(1000025);
    });
  });

  describe('chai-as-promised test', function() {
    it('should work well with async/await', async () => {
      expect(await Promise.resolve(42)).to.equal(42);
      await expect(Promise.reject(new Error())).to.be.rejectedWith(Error);
    });
  });

  describe('getAlmaTable', function() {
    this.timeout(10000);
    it('When invalid API key given, a 4xx error results', async function() {
      await expect(getAlmaTable('/invalid path', null, 'invalid api key',
        'https://api-na.hosted.exlibrisgroup.com/almaws/v1/analytics')).to.be.rejectedWith(Error);
    });
  });
});