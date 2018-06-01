import * as d from '../declarations';
import { Compiler as CompilerType } from '../compiler';
import { getConfigFilePath } from './cli-utils';
import { helpTask } from './task-help';
import { parseFlags } from './parse-flags';
import { runTask } from './run-task';
import { startTask } from './task-start';


export async function run(process: NodeJS.Process, sys: d.StencilSystem, logger: d.Logger) {
  process.on(`unhandledRejection`, (r: any) => logger.error(`unhandledRejection`, r));

  process.title = `Stencil`;

  const flags = parseFlags(process);

  if (flags.help || flags.task === `help`) {
    helpTask(process, logger);
    process.exit(0);
  }

  if (flags.task === `start`) {
    await startTask(process, sys, logger);
    process.exit(0);
  }

  if (flags.version) {
    console.log(sys.compiler.version);
    process.exit(0);
  }

  // load the config file
  let config: d.Config;
  try {
    const configPath = getConfigFilePath(process, sys, flags.config);
    config = sys.loadConfigFile(configPath, process);

  } catch (e) {
    logger.error(e);
    process.exit(1);
  }

  try {
    if (!config.logger) {
      // if a logger was not provided then use the
      // default stencil command line logger
      config.logger = logger;
    }

    if (config.logLevel) {
      config.logger.level = config.logLevel;
    }

    if (!config.sys) {
      // if the config was not provided then use the default node sys
      config.sys = sys;
    }

    config.flags = flags;

    const { Compiler } = require('../compiler/index.js');

    const compiler: CompilerType = new Compiler(config);
    if (!compiler.isValid) {
      process.exit(1);
    }

    process.title = `Stencil: ${config.namespace}`;

    runTask(process, config, compiler, flags).catch(err => {
      config.logger.error(`uncaught cli task error`, err);
    });

  } catch (e) {
    config.logger.error(`uncaught cli error`, e);
    process.exit(1);
  }
}
