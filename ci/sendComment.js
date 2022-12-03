const { Octokit } = require("@octokit/core");

const fs = require("fs");

const COVERAGE_KEYS = ["statements", "branches", "functions", "lines"];

function getPercentCell(baseEntry, headEntry) {
  return `~~${baseEntry.pct}%~~ ${headEntry.pct}% ${
    headEntry.pct >= baseEntry.pct ? "✅" : "❌"
  }`;
}

function getBranchRow(apiInfo, jsonData) {
  return getRow([
    apiInfo.workflow_run.head_branch,
    ...COVERAGE_KEYS.map((key) => jsonData.total[key]),
    apiInfo.archive_download_url,
  ]);
}

function getDiffRow(baseJsonData, headJsonData) {
  return getRow([
    "Diff",
    ...COVERAGE_KEYS.map(
      (key) => headJsonData.total[key] - baseJsonData.total.key
    ),
  ]);
}

function getRow(cells) {
  return `| ${cells.join(" | ")} |`;
}

function getReportData(path) {
  if (!fs.existsSync(path)) throw new Error(`file not found: ${path}`);

  return JSON.parse(fs.readFileSync(path));
}

function generateCoverageCommentData(baseCoverage, headCoverage) {
  console.log(JSON.stringify(baseCoverage));

  const baseJsonData = getReportData(
    `${baseCoverage.reportDir}/coverage-summary.json`
  );
  const headJsonData = getReportData(
    `${headCoverage.reportDir}/coverage-summary.json`
  );

  const tableHeader = ["Branch", ...COVERAGE_KEYS, "Full report"];

  const rows = [
    "### Test coverage",
    getRow(tableHeader),
    getRow(tableHeader.map(() => "---")),
    getBranchRow(baseCoverage.apiInfo, baseJsonData),
    getBranchRow(headCoverage.apiInfo, headJsonData),
    getDiffRow(baseJsonData, headJsonData),
  ];

  return rows.join("\n");
}

async function makeRequest(body, prNumber, githubToken) {
  const octokit = new Octokit({ auth: githubToken });

  await octokit.request(
    `POST /repos/steryereo/ci-test/issues/${prNumber}/comments`,
    {
      owner: "steryereo",
      repo: "ci-test",
      issue_number: prNumber,
      body,
    }
  );
}

async function sendComment({ base, head, prNumber, githubToken }) {
  console.log(JSON.stringify({ base, head, prNumber, githubToken }));

  const body = generateCoverageCommentData(base.coverage, head.coverage);

  const response = await makeRequest(body, prNumber, githubToken);

  console.log(JSON.stringify(response));
  if (response.status !== 201) throw new Error(response.statusText);

  // console.log(`Sent comment to PR ${data.html_url}`);
}

module.exports = sendComment;
