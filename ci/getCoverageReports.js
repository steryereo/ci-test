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

async function downloadAndUnzip({ branch, githubToken, id, type }) {
  const destDir = `${__dirname}/${branch}-${type}`;
  const zipFilePath = `${destDir}.zip`;
  const tarFilePath = `${destDir}/${type}.tgz`;

  await downloadArtifact(githubToken, id, zipFilePath);

  await decompress(zipFilePath, destDir);

  const untarred = await decompress(tarFilePath);

  console.log({ untarred });
}

async function getReports(githubToken, baseSha, headSha) {
  const { baseId, headId } = await findReportUrls({
    githubToken,
    baseSha,
    headSha,
  });

  await downloadAndUnzip({
    branch: "base",
    githubToken,
    id: baseId,
    type: COVERAGE_REPORT_NAME,
  });

  await downloadAndUnzip({
    branch: "head",
    githubToken,
    id: headId,
    type: COVERAGE_REPORT_NAME,
  });

  console.log({ __dirname: fs.readdirSync(__dirname) });
}

/* istanbul ignore next */
if (require.main === module) {
  getReports(...process.argv.slice(2));
}

module.exports = getReports;
