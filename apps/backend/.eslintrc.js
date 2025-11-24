module.exports = {
  extends: ['@omni/config/eslint'],
  parserOptions: {
    project: './tsconfig.json'
  },
  env: {
    node: true
  }
};
