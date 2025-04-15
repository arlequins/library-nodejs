module.exports = {
    '*.{js,ts}': ['prettier --write'],
    '*.ts': [
        'eslint --fix',
        'jest --passWithNoTests --silent=true TZ=Asia/Tokyo',
    ],
};
