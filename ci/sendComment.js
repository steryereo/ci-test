const { Octokit } = require("@octokit/core");

const fs = require("fs");

const { GITHUB_ACTIONS_APP_ID, OWNER, REPO } = require("./constants");

const COVERAGE_KEYS = ["statements", "branches", "functions", "lines"];

function getReportDownloadLink({ suiteId, artifactId }) {
  return `[Download here](https://github.com/${OWNER}/${REPO}/suites/${suiteId}/artifacts/${artifactId})`;
}

function getBranchRow(apiInfo, jsonData, suiteId) {
  return getRow([
    `\`${apiInfo.workflow_run.head_branch}\``,
    ...COVERAGE_KEYS.map((key) => `${jsonData.total[key].pct}%`),
    getReportDownloadLink({ artifactId: apiInfo.id, suiteId }),
  ]);
}

function getDiffCell(diff) {
  return `${diff}% ${diff >= 0 ? ":white_check_mark:" : ":warning:"}`;
}

function getDiffRow(baseJsonData, headJsonData) {
  return getRow([
    "Diff",
    ...COVERAGE_KEYS.map((key) =>
      getDiffCell(headJsonData.total[key].pct - baseJsonData.total[key].pct)
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

function generateCoverageCommentData({
  baseCoverage,
  headCoverage,
  baseSuiteId,
  headSuiteId,
}) {
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
    getBranchRow(baseCoverage.apiInfo, baseJsonData, baseSuiteId),
    getBranchRow(headCoverage.apiInfo, headJsonData, headSuiteId),
    getDiffRow(baseJsonData, headJsonData),
  ];

  return rows.join("\n");
}

async function fetchCheckSuiteId(githubToken, ref) {
  const octokit = new Octokit({
    auth: githubToken,
  });

  const res = await octokit.request(
    `GET /repos/${OWNER}/${REPO}/commits/${ref}/check-suites?app_id=${GITHUB_ACTIONS_APP_ID}`,
    {
      app_id: GITHUB_ACTIONS_APP_ID,
      owner: OWNER,
      repo: REPO,
      ref,
    }
  );

  return res.data.check_suites[0].id;
}

async function makeRequest(body, prNumber, githubToken) {
  const octokit = new Octokit({ auth: githubToken });

  return octokit.request(
    `POST /repos/${OWNER}/${REPO}/issues/${prNumber}/comments`,
    {
      owner: OWNER,
      repo: REPO,
      issue_number: prNumber,
      body,
    }
  );
}

async function sendComment({ base, head, prNumber, githubToken }) {
  const baseSuiteId = await fetchCheckSuiteId(
    githubToken,
    base.coverage.apiInfo.workflow_run.head_sha
  );
  const headSuiteId = await fetchCheckSuiteId(
    githubToken,
    head.coverage.apiInfo.workflow_run.head_sha
  );

  const body = generateCoverageCommentData({
    baseCoverage: base.coverage,
    headCoverage: head.coverage,
    baseSuiteId,
    headSuiteId,
  });

  const response = await makeRequest(body, prNumber, githubToken);

  if (response.status !== 201) throw new Error(JSON.stringify(response.data));

  console.log(`Sent comment to PR ${response.data.html_url}`);
}

module.exports = sendComment;
