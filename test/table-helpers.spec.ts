import { getColPositions, convertStr, rawJsonToClean, ColMap } from '../src/table-helpers';
import { AAColumn, AARow, AATable } from '../src/AATable';
import 'mocha';
import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
const expect = chai.expect;

describe('table-helpers', function() {
  const cols: AAColumn[] = [
    {name: 'Library Code', type: 'varchar'},
    {name: 'Returns', type: 'int'},
    {name: 'Loans', type: 'int'}
  ];
  const colMaps: ColMap[] = [
    {colName: 'location', pattern: 'Library'},
    {colName: 'count', pattern: 'Loans', convertTo: 'int' }
  ];
  const rows: AARow[] = [
    ['DESIGN', '12', '1045'],
    ['DOWNTOWN', '8', '232'],
    ['HAYDEN', '17', '14576']
  ];
  const table: AATable = { cols: cols, rows: rows };
  
  describe('convertStr', function() {
    it('should convert data types correctly', function() {
      expect(convertStr('A B C D')).equals('A B C D');
      expect(convertStr('No', 'boolean')).equals(false);
      expect(convertStr('yah', 'boolean')).equals(true);
      expect(convertStr('', 'boolean')).equals(false);
      expect(convertStr('0', 'boolean')).equals(false);
      expect(convertStr('10.0', 'int')).equals(10);
      expect(convertStr('0.5', 'float')).equals(0.5);
    });
  });

  describe('getColPositions', function() {
    it('should find column positions from raw table data', function() {  
      const pos = getColPositions(cols, colMaps);
      expect(pos.length).to.equal(2);
      expect(pos[0].colPos).to.equal(0);
      expect(pos[0].colMap.colName).to.equal('location');
      expect(pos[1].colPos).to.equal(2);
      expect(pos[1].colMap.colName).to.equal('count');
    });
  });

  describe('rawJsonToClean', function() {
    it('should convert raw table data into cleaned output table', function() {
      const c = rawJsonToClean(table, colMaps);
      expect(c.length).to.equal(3);
      expect(Object.keys(c[0]).length).to.equal(2);
      expect(c[1]['location']).to.equal('DOWNTOWN');
      expect(c[2]['count']).to.equal(14576);
    });
  });

});