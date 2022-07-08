const fs = require('fs');
const path = require('path');

const { parse } = require('csv-parse');

const parser = parse({ delimiter: ';', columns: true }, (_, data) => {
  console.log(data);
});

fs.createReadStream(path.resolve(__dirname, 'data', 'turmas-2022.1.csv')).pipe(
  parser
);
