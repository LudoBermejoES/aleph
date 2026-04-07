// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    // Prettier formats void HTML elements as self-closing (<img />, <input />).
    // Align ESLint to match rather than conflict.
    'vue/html-self-closing': [
      'warn',
      {
        html: { void: 'always', normal: 'never', component: 'always' },
        svg: 'always',
        math: 'always',
      },
    ],
  },
})
