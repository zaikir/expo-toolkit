import Chalk from 'chalk';

import { appEnvStore } from '../app-env';
import { ToolkitModule } from '../types';

export const chalk = new Chalk.Instance({ level: 1 });

export const writeLog = {
  'module-initialized': (
    item: ToolkitModule,
    async: boolean,
    duration: number,
  ) => {
    if (appEnvStore.env['NODE_ENV'] === 'production') {
      return;
    }

    const color = 'yellow' as const;

    console.info(
      [
        chalk.green('✔'),
        `Module`,
        chalk[color](item.name),
        'initialized',
        chalk.gray(`${duration}ms ${async ? 'async' : 'sync'}`),
      ].join(' '),
    );
  },
  'module-initialized-failed': (
    item: ToolkitModule,
    async: boolean,
    duration: number,
    error: Error,
  ) => {
    if (appEnvStore.env['NODE_ENV'] === 'production') {
      return;
    }

    console.error(
      [
        chalk.red('x Module'),
        chalk.yellow(item.name),
        chalk.red('error:'),
        chalk.red(error instanceof Error ? error.message : 'unknown error'),
        chalk.gray(
          `${duration}ms ${async ? 'async' : 'sync'}${
            item.optional ? ' optional' : ''
          }`,
        ),
      ].join(' '),
    );
  },
  'module-connected': (name: string, connectedTo: string) => {
    if (appEnvStore.env['NODE_ENV'] === 'production') {
      return;
    }

    console.info(
      [
        chalk.blue('ℹ'),
        'Module',
        chalk.yellow(name),
        'connected to',
        chalk.yellow(connectedTo),
      ].join(' '),
    );
  },
  'module-log': (name: string, text: string, extra?: string) => {
    if (appEnvStore.env['NODE_ENV'] === 'production') {
      return;
    }

    console.info(
      [
        chalk.blue('ℹ'),
        ' ',
        chalk.yellow(name),
        `: ${text}`,
        extra ? chalk.gray(extra) : '',
      ].join(''),
    );
  },
};
