module.exports = {
  apps: [{
    name: 'ccb-wanding-serve',
    script: '/root/.bun/bin/bun',
    args: 'run /opt/ccb-wanding/dist/cli.js web --port=3000 --host=127.0.0.1',
    cwd: '/opt/ccb-wanding',

    env: {
      NODE_ENV: 'production',
      ANTHROPIC_BASE_URL:         'https://api.minimaxi.com/anthropic',
      ANTHROPIC_AUTH_TOKEN:       process.env.ANTHROPIC_AUTH_TOKEN,
      ANTHROPIC_DEFAULT_OPUS_MODEL:   'minimax-m3',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'minimax-m3',
      ANTHROPIC_DEFAULT_HAIKU_MODEL:  'minimax-m3',
      CLAUDE_CONFIG_DIR: '/opt/ccb-wanding/.claude',
      ENABLE_SEARCH_EXTRA_TOOLS:  'auto:100',
      CCB_NO_PAUSE:     '1',
      CCB_WT_RELAUNCHED:'1',
      FORCE_COLOR:      '0',
      NO_COLOR:         '1',
    },

    // 自动重启
    autorestart: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 3000,

    // 日志
    log_file:    '/var/log/ccb-wanding/combined.log',
    out_file:    '/var/log/ccb-wanding/out.log',
    error_file:  '/var/log/ccb-wanding/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
}
