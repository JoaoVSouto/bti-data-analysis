require('dotenv').config();

const fs = require('fs');
const path = require('path');

const axios = require('axios');

const LOCKED_SITUATION_ID = 5;
const CANCELED_SITUATION_ID = 6;
const LOCKED_STUDENTS_AMOUNT_BY_SEMESTER_PATH = path.join(
  __dirname,
  'data',
  'canceled-students-amount-by-semester.json'
);

const ufrnClient = axios.create({
  baseURL: 'https://api.ufrn.br/discente/v1/discentes',
  headers: {
    'x-api-key': process.env.UFRN_API_KEY,
    Authorization: `Bearer ${process.env.UFRN_API_TOKEN}`,
  },
});

const delay = (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchBtiStudents(page = 1) {
  console.info(`requesting page ${page} of bti students...`);

  try {
    const REQUEST_CONFIG = {
      STUDENTS_PER_PAGE: 100,
      BTI_ID: 92127264,
    };

    const offset = (page - 1) * REQUEST_CONFIG.STUDENTS_PER_PAGE;

    const response = await ufrnClient.get('/', {
      params: {
        'order-desc': 'ano-ingresso',
        'id-curso': REQUEST_CONFIG.BTI_ID,
        limit: REQUEST_CONFIG.STUDENTS_PER_PAGE,
        offset,
      },
    });

    console.info(
      `x-ratelimit-remaining: ${response.headers['x-ratelimit-remaining']}`
    );

    return response.data;
  } catch (err) {
    console.error('fetchBtiStudents error');
    console.error(err);
  }
}

async function fetchStudentSituationChanges(studentId) {
  try {
    const response = await ufrnClient.get(`/${studentId}/alteracoes-situacao`);

    console.info(
      `x-ratelimit-remaining: ${response.headers['x-ratelimit-remaining']}`
    );

    const situationChanges = response.data.map(situationChange => ({
      studentId,
      situationId: situationChange['id-situacao-discente'],
      date: situationChange.data,
      year: situationChange.ano,
      period: situationChange.periodo,
    }));

    return situationChanges;
  } catch (err) {
    console.error('fetchStudentSituationChanges error');
    console.error(err);
  }
}

function getLockedStudentsAmountByYearAndPeriod(
  studentsWithLockedSituation,
  savedLockedStudentsAmountByYearAndPeriod
) {
  const lockedStudentsAmountByYearAndPeriod = {
    ...savedLockedStudentsAmountByYearAndPeriod,
  };

  studentsWithLockedSituation.forEach(student => {
    const lockedSituations = student.filter(
      situationChange => situationChange.situationId === CANCELED_SITUATION_ID
    );

    lockedSituations.forEach(lockedSituation => {
      const semester = `${lockedSituation.year}.${lockedSituation.period}`;

      if (lockedStudentsAmountByYearAndPeriod[semester]) {
        lockedStudentsAmountByYearAndPeriod[semester] += 1;
      } else {
        lockedStudentsAmountByYearAndPeriod[semester] = 1;
      }
    });
  });

  return lockedStudentsAmountByYearAndPeriod;
}

(async () => {
  const savedLockedStudentsAmountByYearAndPeriod = fs.existsSync(
    LOCKED_STUDENTS_AMOUNT_BY_SEMESTER_PATH
  )
    ? JSON.parse(
        fs.readFileSync(LOCKED_STUDENTS_AMOUNT_BY_SEMESTER_PATH, 'utf8')
      )
    : {};

  const students = await fetchBtiStudents(42);

  const studentsSituationChanges = [];

  for (const student of students) {
    const studentSituationChanges = await fetchStudentSituationChanges(
      student['id-discente']
    );
    studentsSituationChanges.push(studentSituationChanges);

    await delay();
  }

  const studentsWithLockedSituation = studentsSituationChanges
    .filter(Boolean)
    .filter(studentSituationChanges =>
      studentSituationChanges.some(
        situationChange => situationChange.situationId === CANCELED_SITUATION_ID
      )
    );

  const lockedStudentsAmountByYearAndPeriod =
    getLockedStudentsAmountByYearAndPeriod(
      studentsWithLockedSituation,
      savedLockedStudentsAmountByYearAndPeriod
    );

  console.log(
    'lockedStudentsAmountByYearAndPeriod:',
    lockedStudentsAmountByYearAndPeriod
  );

  fs.writeFileSync(
    LOCKED_STUDENTS_AMOUNT_BY_SEMESTER_PATH,
    JSON.stringify(lockedStudentsAmountByYearAndPeriod, null, 2)
  );
})();
