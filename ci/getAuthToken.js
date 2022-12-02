function getAuthToken(githubToken) {
  return Buffer.from(`scribdbot:${githubToken}`).toString("base64")
}

module.exports = { getAuthToken }
