const getReportArtifacts = require("./getReportArtifacts");
const sendComment = require("./sendComment");

async function sendPRStatsComment(githubToken, prNumber, baseSha, headSha) {
  try {
    const { base, head } = await getReportArtifacts(
      githubToken,
      baseSha,
      headSha
    );

    await sendComment({ base, head, githubToken, prNumber });
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
