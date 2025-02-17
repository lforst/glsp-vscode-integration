/** @type {import('eslint').Linter.Config} */
module.exports = {
    extends: [
        '../../configs/base.eslintrc.json',
        '../../configs/warnings.eslintrc.json',
        '../../configs/errors.eslintrc.json'
    ],
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: 'tsconfig.json'
    }
};
