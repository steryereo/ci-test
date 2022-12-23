const config = {
  preset: "angular",
  branches: "main",
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", { changelogFile: "CHANGELOG.md" }],
    "@semantic-release/npm",
    [
      "@semantic-release/git",
      {
        assets: ["CHANGELOG.md", "package.json"],
        message: "chore: Bump to version ${nextRelease.version} [skip ci]",
      },
    ],
    [
      "@semantic-release/github",
      {
        successComment: false,
        failComment: false,
        labels: false,
        releasedLabels: false,
      },
    ],
  ],
};
