const fetch = require("node-fetch");

const fs = require("fs");
const decompress = require("decompress");

const { getAuthToken } = require("./getAuthToken");

const COVERAGE_REPORT_NAME = "coverage";

function findArtifactInfo(list, name, sha) {
  for (let i = 0; i < list.length; i++) {
    const info = list[i];

    if (info.name === name && info.workflow_run.head_sha === sha) return info;
  }
}

async function getArtifactsList(githubToken, page = 1) {
  const res = await fetch(
    `https://api.github.com/repos/scribd/pages-deploy-test/actions/artifacts?page=${page}`,

    // `https://api.github.com/repos/scribd/node-chassis/actions/artifacts?per_page=100&page=${page}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Basic ${getAuthToken(githubToken)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  console.log({ page, res });
  return res.json();
}

async function downloadArtifact(githubToken, url, title) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${getAuthToken(githubToken)}`,
    },
  });

  return new Promise((resolve, reject) => {
    const dest = fs.createWriteStream(title);
    res.body.pipe(dest);
    dest.on("close", resolve);
    dest.on("error", reject);
  });
}

async function findReportUrls({
  githubToken,
  baseSha,
  headSha,
  foundBaseUrl,
  foundHeadUrl,
  page = 1,
}) {
  const allArtifacts = await getArtifactsList(githubToken, page);

  const baseArtifactInfo = findArtifactInfo(
    allArtifacts.artifacts,
    COVERAGE_REPORT_NAME,
    baseSha
  );
  const headArtifactInfo = findArtifactInfo(
    allArtifacts.artifacts,
    COVERAGE_REPORT_NAME,
    headSha
  );

  const baseUrl = foundBaseUrl || (baseArtifactInfo && baseArtifactInfo.url);
  const headUrl = foundHeadUrl || (headArtifactInfo && headArtifactInfo.url);

  if ((baseUrl && headUrl) || allArtifacts.total_count === 0)
    return { baseUrl, headUrl };

  return findReportUrls({
    githubToken,
    baseSha,
    headSha,
    foundBaseUrl,
    foundHeadUrl,
    page: page + 1,
  });
}

async function getReports(githubToken, baseSha, headSha) {
  console.log({ githubToken, baseSha, headSha });
  const allArtifacts = await getArtifactsList();

  console.log(JSON.stringify(allArtifacts));

  const { baseUrl, headUrl } = await findReportUrls(
    githubToken,
    baseSha,
    headSha
  );

  downloadArtifact(githubToken, baseUrl, "base-coverage.zip");
  downloadArtifact(githubToken, headUrl, "head-coverage.zip");

  await decompress("base-coverage.zip");
  await decompress("head-coverage.zip");

  const baseReport = JSON.parse(
    fs.readFileSync("base-coverage/coverage-summary.json")
  );
  const headReport = JSON.parse(
    fs.readFileSync("head-coverage/coverage-summary.json")
  );

  console.log(baseReport);
  console.log(headReport);
}

/* istanbul ignore next */
if (require.main === module) {
  getReports(...process.argv.slice(2));
}

module.exports = getReports;
