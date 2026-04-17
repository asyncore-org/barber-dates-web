export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'auth',
        'calendar',
        'appointments',
        'loyalty',
        'admin',
        'layout',
        'domain',
        'infrastructure',
        'hooks',
        'deps',
        'ci',
        'seo',
      ],
    ],
    'subject-max-length': [2, 'always', 72],
  },
}
