const { Octokit } = require("@octokit/core");
const decompress = require("decompress");

const fs = require("fs");

// const { getAuthToken } = require("./getAuthToken");

const COVERAGE_REPORT_NAME = "coverage";
const PER_PAGE = 100;

function findArtifactId(list, sha) {
  for (let i = 0; i < list.length; i++) {
    const info = list[i];

    if (info.workflow_run.head_sha === sha) return info.id;
  }
}

async function fetchAllArtifacts(githubToken, page = 1) {
  const octokit = new Octokit({ auth: githubToken });

  const res = await octokit.request(
    `GET /repos/steryereo/ci-test/actions/artifacts?per_page=${PER_PAGE}&page=${page}&name=${COVERAGE_REPORT_NAME}`,
    {
      owner: "steryereo",
      repo: "ci-test",
    }
  );

  return res.data;
}

async function downloadArtifact(githubToken, id, filePath) {
  const octokit = new Octokit({ auth: githubToken });

  const res = await octokit.request(
    `GET /repos/steryereo/ci-test/actions/artifacts/${id}/zip`,
    {
      owner: "steryereo",
      repo: "ci-test",
      artifact_id: id,
      archive_format: "zip",
    }
  );

  return fs.writeFileSync(filePath, Buffer.from(res.data));
}

async function findReportUrls({
  githubToken,
  baseSha,
  headSha,
  foundBaseId,
  foundHeadId,
  page = 1,
}) {
  const allArtifacts = await fetchAllArtifacts(githubToken, page);

  const baseId = foundBaseId || findArtifactId(allArtifacts.artifacts, baseSha);
  const headId = foundHeadId || findArtifactId(allArtifacts.artifacts, headSha);

  if ((baseId && headId) || allArtifacts.total_count < page * PER_PAGE)
    return { baseId, headId };

  return findReportUrls({
    githubToken,
    baseSha,
    headSha,
    foundBaseId,
    foundHeadId,
    page: page + 1,
  });
}

async function getReports(githubToken, baseSha, headSha) {
  const { baseId, headId } = await findReportUrls({
    githubToken,
    baseSha,
    headSha,
  });

  console.log({ baseId, headId });

  const BASE_DEST_DIR = `${__dirname}/base-coverage`;
  const HEAD_DEST_DIR = `${__dirname}/base-coverage`;

  const BASE_FILE_PATH = `${BASE_DEST_DIR}.zip`;
  const HEAD_FILE_PATH = `${HEAD_DEST_DIR}.zip`;

  const baseZip = await downloadArtifact(githubToken, baseId, BASE_FILE_PATH);
  const headZip = await downloadArtifact(githubToken, headId, HEAD_FILE_PATH);

  console.log({ baseZip, headZip });

  // fs.mkdirSync(BASE_DEST_DIR);
  // fs.mkdirSync(HEAD_DEST_DIR);

  console.log({ __dirname: fs.readdirSync(__dirname) });

  decompress(BASE_FILE_PATH, BASE_DEST_DIR);
  decompress(HEAD_FILE_PATH, HEAD_DEST_DIR);
}

/* istanbul ignore next */
if (require.main === module) {
  getReports(...process.argv.slice(2));
}

module.exports = getReports;
