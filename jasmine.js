const Jasmine = require('jasmine');
const JasmineConsoleReporter = require('jasmine-console-reporter');
const jasmine = new Jasmine();
var reporter = new JasmineConsoleReporter({
  colors: 1,
  cleanStack: 3,
  verbosity: 4,
  listStyle: 'indent',
  activity: false,
  DEFAULT_TIMEOUT_INTERVAL: 15000
});
jasmine.addReporter(reporter);
jasmine.showColors(true);
jasmine.loadConfigFile('jasmine.json');
jasmine.execute();
