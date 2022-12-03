const { Octokit } = require("@octokit/core");

const fs = require("fs");

const COVERAGE_KEYS = ["statements", "branches", "functions", "lines"];

function getPercentCell(baseEntry, headEntry) {
  return `~~${baseEntry.pct}%~~ ${headEntry.pct}% ${
    headEntry.pct >= baseEntry.pct ? "✅" : "❌"
  }`;
}

// function getPercentRow(data) {
//   const branchLabel = data.
// }

function getRow(cells) {
  return `| ${cells.join(" | ")} |`;
}

function getReportData(path) {
  if (!fs.existsSync(path)) throw new Error(`file not found: ${path}`);

  return JSON.parse(fs.readFileSync(path));
}

function generateCoverageCommentData(baseCoverage, headCoverage) {
  const baseData = getReportData(
    `${baseCoverage.reportDir}/coverage-summary.json`
  );
  const headData = getReportData(
    `${headCoverage.reportDir}/coverage-summary.json`
  );

  const tableHeader = ["", ...KEYS, "Full report"];

  const rows = [
    "### Test coverage",
    getRow(tableHeader),
    getRow(tableHeader.map(() => "---")),
    getRow([
      "test",
      ...KEYS.map((key) =>
        getPercentCell(baseData.total[key], headData.total[key])
      ),
      "",
    ]),
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

  const data = response.data;

  console.log(data);
  if (response.status !== 201) throw new Error(response.statusText);

  console.log(`Sent comment to PR ${data.html_url}`);
}

module.exports = sendComment;
