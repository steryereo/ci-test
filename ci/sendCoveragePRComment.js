const { Octokit } = require("@octokit/core");

const fs = require("fs");

const TEST_COVERAGE_THRESHOLD = process.env.TEST_COVERAGE_THRESHOLD;

const KEYS = ["statements", "branches", "functions", "lines"];

function getPercentCell(baseEntry, headEntry) {
  return `~~${baseEntry.pct}%~~ ${headEntry.pct}% ${
    headEntry.pct >= baseEntry.pct ? "✅" : "❌"
  }`;
}

function getRow(cells) {
  return `| ${cells.join(" | ")} |`;
}

function getReportData(fileName) {
  const path = `${__dirname}/${baseReportFile}`;

  if (!fs.existsSync(path))
    throw new Error(`file not found: ${baseReportPath}`);

  return JSON.parse(fs.readFileSync(baseReportPath));
}

function generateCoverageCommentData(baseReportFile, headReportFile) {
  const baseData = getReportData(baseReportFile);
  const headData = getReportData(headReportFile);

  const rows = [
    "### Test coverage",
    getRow(KEYS),
    getRow(KEYS.map(() => "---")),
    getRow(
      KEYS.map((key) =>
        getPercentCell(baseData.total[key], headData.total[key])
      )
    ),
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
  // return fetch(
  //   `https://api.github.com/repos/steryereo/ci-test/issues/${prNumber}/comments`,
  //   {
  //     method: "POST",
  //     headers: {
  //       Accept: "application/vnd.github+json",
  //       Authorization: `token ${githubToken}`,
  //       "Content-Type": "application/x-www-form-urlencoded",
  //     },
  //     body: JSON.stringify({ body }),
  //   }
  // );
}

async function sendCoveragePRComment(
  baseReportFile,
  headReportFile,
  prNumber,
  githubToken
) {
  try {
    const body = generateCoverageCommentData(baseReportFile, headReportFile);

    const response = await makeRequest(body, prNumber, githubToken);

    console.log(
      JSON.stringify({ baseReportFile, headReportFile, prNumber, githubToken })
    );

    const data = response.data;

    console.log(data);
    if (response.status !== 201) throw new Error(response.statusText);

    console.log(`Sent comment to PR ${data.html_url}`);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
}

/* istanbul ignore next */
if (require.main === module) {
  sendCoveragePRComment(...process.argv.slice(2));
}

module.exports = sendCoveragePRComment;
