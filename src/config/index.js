require('dotenv').config();
const argv = require('minimist')(process.argv.slice(2));

module.exports = {
  // Url of the site.
  siteUrl: 'https://covid19.newtondreams.com',

  // Defines the args.
  args: {
    // -d work on a specific date.
    date: argv.d,
    // -l use a different address for screenshots.
    localhost: argv.l,
    // --dry-run do not write anything.
    dryRun: argv['dry-run'] || false
  },

  // Properties for making the screenshot.
  screenshot: {
    width: 1280,
    height: 739,
    scroll: 235,
    scale: 2,
    waitFor: '#map',
    timeout: 5000
  },

  // Discord.
  discord: {
    token: process.env.DISCORD_TOKEN,
    channel: process.env.DISCORD_CHANNEL
  },

  // Retry timeout in seconds.
  retryTimeout: 150,

  // Directory where all files all files are stored.
  outputDir: './data',

  // Date used for output folders.
  outputDatePattern: 'YYYY-MM-DD',

  // Names of files used.
  files: {
    stats: 'Stats.json',
    latest: 'latest.json',
    screenshot: 'Screenshot.png',
    latestScreenshot: 'latest.png'
  },

  // Pattern used in the report's names.
  reportDatePattern: 'YYYY.MM.DD',

  // Names and search patterns for pdf reports.
  reports: [
    {
      name: 'Positive-Cases.pdf',
      pattern: /positivos/g
    },
    {
      name: 'Suspected-Cases.pdf',
      pattern: /sospechosos/g
    },
    {
      name: 'Daily-Report.pdf',
      pattern: /comunicado/g
    }
  ],

  // Time in ms between downloads
  downloadWaitTime: 1000,

  // Ftp deployment config.
  ftp: {
    host: 'ftp.newtondreams.com',
    user: process.env.FTP_USERNAME,
    password: process.env.FTP_PASSWORD
  },

  // list of files to deploy.
  ftpFiles: [
    {
      local: './data/latest.json',
      remote: './covid19/api/stats.json'
    }
  ],

  // Page where the pdf reports are found.
  reportsUrl:
    'https://www.gob.mx/salud/documentos/coronavirus-covid-19-comunicado-tecnico-diario-238449',

  // Page loaded where data is intercepted.
  proxyUrl: 'https://covid19.sinave.gob.mx/',

  // Regex pattern of the resource to intercept.
  proxyInterceptResource: /Grafica22/g,

  // In this time the element defined above must be rendered.
  proxyTimeout: 10000,

  // Local port used for the proxy.
  proxyPort: 5050,

  // Arguments used to execute chromium.
  proxyDriverArgs: [
    'disable-gpu',
    'hide-scrollbars',
    'ignore-certificate-errors'
  ],

  // States in Mexico sorted by length.
  // [state key, name with special characters, filtered name, regex search pattern]
  states: [
    [
      'BS',
      'Baja California Sur',
      'baja california sur',
      /baja california sur/g
    ],
    ['CDMX', 'Ciudad de México', 'ciudad de mexico', /ciudad de mexico/g],
    ['BC', 'Baja California', 'baja california', /baja california/g],
    ['SL', 'San Luis Potosí', 'san luis potosi', /san luis potosi/g],
    ['AG', 'Aguascalientes', 'aguascalientes', /aguascalientes/g],
    ['QR', 'Quintana Roo', 'quintana roo', /quintana roo/g],
    ['GJ', 'Guanajuato', 'guanajuato', /guanajuato/g],
    ['NL', 'Nuevo León', 'nuevo leon', /nuevo leon/g],
    ['TM', 'Tamaulipas', 'tamaulipas', /tamaulipas/g],
    ['CH', 'Chihuahua', 'chihuahua', /chihuahua/g],
    ['MI', 'Michoacán', 'michoacan', /michoacan/g],
    ['QT', 'Querétaro', 'queretaro', /queretaro/g],
    ['ZA', 'Zacatecas', 'zacatecas', /zacatecas/g],
    ['CM', 'Campeche', 'campeche', /campeche/g],
    ['CO', 'Coahuila', 'coahuila', /coahuila/g],
    ['GR', 'Guerrero', 'guerrero', /guerrero/g],
    ['TL', 'Tlaxcala', 'tlaxcala', /tlaxcala/g],
    ['VE', 'Veracruz', 'veracruz', /veracruz/g],
    ['CS', 'Chiapas', 'chiapas', /chiapas/g],
    ['DG', 'Durango', 'durango', /durango/g],
    ['HG', 'Hidalgo', 'hidalgo', /hidalgo/g],
    ['JA', 'Jalisco', 'jalisco', /jalisco/g],
    ['MO', 'Morelos', 'morelos', /morelos/g],
    ['NA', 'Nayarit', 'nayarit', /nayarit/g],
    ['SI', 'Sinaloa', 'sinaloa', /sinaloa/g],
    ['TB', 'Tabasco', 'tabasco', /tabasco/g],
    ['YU', 'Yucatán', 'yucatan', /yucatan/g],
    ['CL', 'Colima', 'colima', /colima/g],
    ['MX', 'México', 'mexico', /mexico/g],
    ['OA', 'Oaxaca', 'oaxaca', /oaxaca/g],
    ['PU', 'Puebla', 'puebla', /puebla/g],
    ['SO', 'Sonora', 'sonora', /sonora/g]
  ]
};
