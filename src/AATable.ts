export interface AAColumn {
  name: string;
  type: string; // SQL data types such as varchar, integer, date, etc
}

export type AARow = Array<string>;

export interface AATable {
  cols: Array<AAColumn>;
  rows: Array<AARow>;
}