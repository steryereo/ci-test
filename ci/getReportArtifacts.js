const { Octokit } = require("@octokit/core");
const decompress = require("decompress");

const fs = require("fs");

const { OWNER, REPO } = require("./constants");

// const { getAuthToken } = require("./getAuthToken");

const COVERAGE_REPORT_NAME = "coverage";
const PER_PAGE = 100;

function findArtifactId(list, sha) {
  for (let i = 0; i < list.length; i++) {
    const info = list[i];

    if (info.workflow_run.head_sha === sha) return info;
  }
}

async function fetchAllArtifacts(githubToken, page = 1) {
  const octokit = new Octokit({ auth: githubToken });

  const res = await octokit.request(
    `GET /repos/${OWNER}/${REPO}/actions/artifacts?per_page=${PER_PAGE}&page=${page}&name=${COVERAGE_REPORT_NAME}`,
    {
      owner: OWNER,
      repo: REPO,
    }
  );

  return res.data;
}

async function downloadArtifact(githubToken, id, filePath) {
  const octokit = new Octokit({ auth: githubToken });

  const res = await octokit.request(
    `GET /repos/${OWNER}/${REPO}/actions/artifacts/${id}/zip`,
    {
      owner: OWNER,
      repo: REPO,
      artifact_id: id,
      archive_format: "zip",
    }
  );

  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, Buffer.from(res.data), (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function findReportData({
  githubToken,
  baseSha,
  headSha,
  foundBaseInfo,
  foundHeadInfo,
  page = 1,
}) {
  const allArtifacts = await fetchAllArtifacts(githubToken, page);

  const baseInfo =
    foundBaseInfo || findArtifactId(allArtifacts.artifacts, baseSha);
  const headInfo =
    foundHeadInfo || findArtifactId(allArtifacts.artifacts, headSha);

  if ((baseInfo && headInfo) || allArtifacts.total_count < page * PER_PAGE)
    return { baseInfo, headInfo };

  return findReportData({
    githubToken,
    baseSha,
    headSha,
    foundBaseInfo,
    foundHeadInfo,
    page: page + 1,
  });
}

async function downloadAndUnzip({ branch, githubToken, id, type }) {
  const destDir = `${__dirname}/${branch}-${type}`;
  const zipFilePath = `${destDir}.zip`;
  const tarFilePath = `${destDir}/${type}.tgz`;

  await downloadArtifact(githubToken, id, zipFilePath);

  await decompress(zipFilePath, destDir);
  await decompress(tarFilePath, destDir);

  return destDir;
}

async function getReportArtifacts(githubToken, baseSha, headSha) {
  const { baseInfo, headInfo } = await findReportData({
    githubToken,
    baseSha,
    headSha,
  });

  const [baseCoverageDir, headCoverageDir] = await Promise.all([
    downloadAndUnzip({
      branch: "base",
      githubToken,
      id: baseInfo.id,
      type: COVERAGE_REPORT_NAME,
    }),
    downloadAndUnzip({
      branch: "head",
      githubToken,
      id: headInfo.id,
      type: COVERAGE_REPORT_NAME,
    }),
  ]);

  return {
    base: {
      coverage: {
        apiInfo: baseInfo,
        reportDir: baseCoverageDir,
      },
      bundleSize: {
        /* TODO */
      },
    },
    head: {
      coverage: {
        apiInfo: headInfo,
        reportDir: headCoverageDir,
      },
      bundleSize: {
        /* TODO */
      },
    },
  };
}

module.exports = getReportArtifacts;
