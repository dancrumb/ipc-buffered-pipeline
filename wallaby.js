module.exports = function (wallaby) {
  return {
    "files": [
      'package.json',
      { pattern: "src/**/*.js", load: false }
    ],
    "tests": [
      "test/*.js"
    ],
    "compilers": {
      "**/*.js": wallaby.compilers.babel()
    },
    "testFramework": "mocha",
    "env": {
      "type": "node",
      "runner": "node"
    }
  }
};
