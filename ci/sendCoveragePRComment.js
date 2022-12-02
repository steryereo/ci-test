const fetch = require("node-fetch")

const fs = require("fs")
require("dotenv").config()

const TEST_COVERAGE_THRESHOLD = process.env.TEST_COVERAGE_THRESHOLD

const KEYS = ["statements", "branches", "functions", "lines"]

function getPercentCell(entry) {
  return `${entry.pct}% ${entry.pct >= TEST_COVERAGE_THRESHOLD ? "✅" : "❌"}`
}

function getRow(cells) {
  return `| ${cells.join(" | ")} |`
}

function generateCoverageCommentData(file) {
  if (!fs.existsSync(file)) throw new Error(`file not found: ${file}`)

  const data = JSON.parse(fs.readFileSync(file))

  const rows = [
    "### Test coverage",
    getRow(KEYS),
    getRow(KEYS.map(() => "---")),
    getRow(KEYS.map((key) => getPercentCell(data.total[key]))),
  ]

  const body = rows.join("\n")

  return JSON.stringify({ body })
}

function makeRequest(body, prNumber, githubToken) {
  const authToken = Buffer.from(`scribdbot:${githubToken}`).toString("base64")

  return fetch(`https://api.github.com/repos/scribd/node-chassis/issues/${prNumber}/comments`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Basic ${authToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })
}

async function sendCoveragePRComment(file, prNumber, githubToken) {
  try {
    const body = generateCoverageCommentData(file)

    const response = await makeRequest(body, prNumber, githubToken)

    console.log(JSON.stringify({ file, prNumber, githubToken }))

    const data = await response.json()

    console.log(data)
    if (response.status !== 201) throw new Error(response.statusText)

    console.log(`Sent comment to PR ${data.html_url}`)
  } catch (e) {
    console.error(e)
    process.exitCode = 1
  }
}

/* istanbul ignore next */
if (require.main === module) {
  sendCoveragePRComment(...process.argv.slice(2))
}

module.exports = sendCoveragePRComment
