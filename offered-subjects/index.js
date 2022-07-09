const fs = require('fs');
const path = require('path');

const { parse } = require('csv-parse');

const {
  BTI_ALL_EMPHASIS_SUBJECTS_IDS,
  BTI_SPECIFIC_EMPHASIS_SUBJECTS_IDS,
} = require('./constants/btiSubjectsIds');

const SUBJECTS_AMOUNT_PATH = path.join(
  __dirname,
  'data',
  'subjects-amount.json'
);

const currentSemester = process.argv[2];

const parser = parse({ delimiter: ';', columns: true }, (_, data) => {
  const validSubjects = data.filter(
    subject =>
      subject.situacao_turma === 'CONSOLIDADA' ||
      subject.situacao_turma === 'ABERTA'
  );

  const btiAllEmphasisSubjects = validSubjects.filter(subject =>
    BTI_ALL_EMPHASIS_SUBJECTS_IDS.includes(subject.id_componente_curricular)
  );
  const btiSpecificEmphasisSubjects = validSubjects.filter(subject =>
    BTI_SPECIFIC_EMPHASIS_SUBJECTS_IDS.includes(
      subject.id_componente_curricular
    )
  );

  const subjectsAmount = {
    allEmphasis: btiAllEmphasisSubjects.length,
    specificEmphasis: btiSpecificEmphasisSubjects.length,
  };

  const subjectsAmountBySemester = fs.existsSync(SUBJECTS_AMOUNT_PATH)
    ? JSON.parse(fs.readFileSync(SUBJECTS_AMOUNT_PATH, 'utf8'))
    : {};

  subjectsAmountBySemester[currentSemester] = subjectsAmount;

  console.log(subjectsAmountBySemester);

  fs.writeFileSync(
    SUBJECTS_AMOUNT_PATH,
    JSON.stringify(subjectsAmountBySemester, null, 2)
  );
});

fs.createReadStream(
  path.resolve(__dirname, 'data', 'turmas', `turmas-${currentSemester}.csv`)
).pipe(parser);
